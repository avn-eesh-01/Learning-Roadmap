import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---- Gemini client ----
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not set in .env");
}
const genAI = new GoogleGenerativeAI(apiKey);
const MODEL_NAME = "gemini-2.5-flash-lite";

// ---- Resource validation rules ----
const BLOCKED_DOMAINS = [
  "udemy.com",
  "coursera.org",
  "pluralsight.com",
  "skillshare.com",
  "udacity.com",
  "lynda.com",
  "codecademy.com",
];

const FALLBACK_RESOURCE_BANK = {
  tech: [
    {
      type: "article",
      title: "MDN Web Docs - Learn Web Development",
      url: "https://developer.mozilla.org/en-US/docs/Learn",
    },
    {
      type: "article",
      title: "JavaScript.info - The Modern JavaScript Tutorial",
      url: "https://javascript.info/",
    },
    {
      type: "article",
      title: "React.dev - Quick Start",
      url: "https://react.dev/learn",
    },
    {
      type: "article",
      title: "Node.js - Getting Started",
      url: "https://nodejs.org/en/learn",
    },
    {
      type: "article",
      title: "Express - Official Guide",
      url: "https://expressjs.com/en/guide/routing.html",
    },
    {
      type: "course",
      title: "freeCodeCamp - Responsive Web Design",
      url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    },
  ],
  gardening: [
    {
      type: "article",
      title: "RHS - Beginner's Guide to Gardening",
      url: "https://www.rhs.org.uk/advice/beginners-guide/gardening",
    },
    {
      type: "article",
      title: "University of Minnesota Extension - Gardening Basics",
      url: "https://extension.umn.edu/yard-and-garden/gardening-basics",
    },
    {
      type: "article",
      title: "Old Farmer's Almanac - Vegetable Gardening for Beginners",
      url: "https://www.almanac.com/vegetable-gardening-for-beginners",
    },
    {
      type: "article",
      title: "Gardeners' World - How to Start Gardening",
      url: "https://www.gardenersworld.com/how-to/grow-plants/how-to-start-gardening/",
    },
  ],
};

// ---- System instructions ----
const SYSTEM_PROMPT = `
You are an expert learning designer and curriculum strategist.
You design structured learning maps for any topic, for a given difficulty level.

You MUST return ONLY valid JSON that matches this TypeScript type:

type LearningResource = {
  type: "article" | "video" | "book" | "course" | "other";
  title: string;
  url: string;
};

type LearningNode = {
  id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced" | "mixed";
  summary: string;
  resources: LearningResource[];
  children?: LearningNode[];
};

type LearningMap = {
  topic: string;
  targetLevel: "beginner" | "intermediate" | "advanced";
  overview: string;
  nodes: LearningNode[];
};

Guidelines:
- Create 3-7 top-level nodes for most topics.
- Each node should be concrete and actionable (e.g., "HTML & CSS Basics", not "Do front-end").
- Include short, practical summaries for each node.
- For each node, include 1-3 high-quality resources (articles, videos, or books).
- Only include free, openly accessible resources (no paywalls, no login walls, no trials). Prefer official docs, MDN, freeCodeCamp, open textbooks, reputable blogs, and YouTube.
- Avoid paid marketplaces such as Udemy, Coursera, Pluralsight, and Skillshare.
- Prefer stable URLs that are unlikely to break.
- All resources must be about the requested topic. If the topic is non-technical (e.g., gardening), DO NOT suggest programming or web development links.
- For subtopics, nest them in children[] with clear relationships.
- Do NOT include any explanation outside the JSON.
`;

// ---- Helpers ----
const ALLOWED_TYPES = new Set(["article", "video", "book", "course", "other"]);

const normalizeType = (type) => (ALLOWED_TYPES.has(type) ? type : "article");

const includesKeyword = (text, keywords) =>
  keywords.some((word) => text.includes(word));

const TECH_KEYWORDS = [
  "javascript",
  "js",
  "typescript",
  "react",
  "angular",
  "vue",
  "svelte",
  "web",
  "frontend",
  "backend",
  "css",
  "html",
  "node",
  "express",
  "python",
  "java",
  "c#",
  "c++",
  "dotnet",
  "docker",
  "kubernetes",
  "sql",
  "database",
  "api",
  "programming",
  "software",
  "developer",
  "mozilla",
  "mdn",
  "freecodecamp",
  "cloud",
  "aws",
  "azure",
  "gcp",
  "ml",
  "ai",
  "data",
  "pandas",
  "numpy",
];

const GARDENING_KEYWORDS = [
  "garden",
  "gardening",
  "horticulture",
  "botany",
  "soil",
  "plant",
  "plants",
  "flowers",
  "vegetable",
  "vegetables",
  "herb",
  "herbs",
  "compost",
  "landscape",
  "yard",
  "lawn",
];

const isTechTopic = (text) => includesKeyword(text, TECH_KEYWORDS);
const isGardeningTopic = (text) => includesKeyword(text, GARDENING_KEYWORDS);

const isBlockedDomain = (hostname) => {
  const clean = hostname.toLowerCase().replace(/^www\./, "");
  return BLOCKED_DOMAINS.some(
    (domain) => clean === domain || clean.endsWith(`.${domain}`)
  );
};

const dedupeResources = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    if (!item?.url) return false;
    const key = item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildWikiResource = (topicText) => {
  const safeTopic = (topicText || "Topic").trim() || "Topic";
  const slug = encodeURIComponent(safeTopic.replace(/\s+/g, "_"));
  return {
    type: "article",
    title: `Wikipedia - ${safeTopic}`,
    url: `https://en.wikipedia.org/wiki/${slug}`,
  };
};

const getFallbackResources = (topicText) => {
  const text = (topicText || "").toLowerCase();
  const picks = [];
  const add = (item) => {
    if (item && !picks.some((p) => p.url === item.url)) {
      picks.push(item);
    }
  };

  if (isGardeningTopic(text)) {
    FALLBACK_RESOURCE_BANK.gardening.forEach(add);
  } else if (isTechTopic(text)) {
    FALLBACK_RESOURCE_BANK.tech.forEach(add);
  } else {
    add(buildWikiResource(topicText));
  }

  // Always provide at least one neutral fallback
  if (!picks.length) {
    add(buildWikiResource(topicText));
  }

  return dedupeResources(picks).slice(0, 3);
};

const withAbortTimeout = (ms) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timeout) };
};

const isReachable = async (url) => {
  const { controller, clear } = withAbortTimeout(5000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.ok) {
      clear();
      return true;
    }
    if (res.status === 405) {
      const retry = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      clear();
      return retry.ok;
    }
    clear();
    return false;
  } catch {
    clear();
    return false;
  }
};

const isOffTopicResource = (resource, topicText) => {
  const topic = (topicText || "").toLowerCase();
  const resourceText = `${resource?.title || ""} ${resource?.url || ""}`.toLowerCase();

  const topicLooksTech = isTechTopic(topic);
  const resourceLooksTech = includesKeyword(resourceText, TECH_KEYWORDS);

  if (!topicLooksTech && resourceLooksTech) return true;
  if (isGardeningTopic(topic) && resourceLooksTech) return true;
  return false;
};

const normalizeResource = async (resource, topicText) => {
  if (!resource?.url || !resource?.title) return null;

  if (isOffTopicResource(resource, topicText)) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(resource.url);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
  if (isBlockedDomain(parsedUrl.hostname)) return null;

  const reachable = await isReachable(parsedUrl.toString());
  if (!reachable) return null;

  const title = resource.title.toString().trim();
  if (!title) return null;

  return {
    type: normalizeType(resource.type),
    title,
    url: parsedUrl.toString(),
  };
};

const validateResources = async (resources, topicText) => {
  const cleaned = [];
  for (const res of resources || []) {
    if (cleaned.length >= 3) break;
    const safe = await normalizeResource(res, topicText);
    if (safe) cleaned.push(safe);
  }

  if (!cleaned.length) {
    cleaned.push(...getFallbackResources(topicText));
  }

  return dedupeResources(cleaned).slice(0, 3);
};

const sanitizeNodes = async (nodes, topicText) => {
  const safeNodes = [];
  for (const node of nodes || []) {
    const resources = await validateResources(
      node?.resources || [],
      `${topicText} ${node?.title || ""}`
    );
    const children = node?.children
      ? await sanitizeNodes(node.children, topicText)
      : [];

    safeNodes.push({
      ...node,
      resources,
      children,
    });
  }
  return safeNodes;
};

// ---- Routes ----

app.get("/", (_req, res) => {
  res.send({ status: "ok", message: "Learning Map API (Gemini)" });
});

app.post("/api/generate-map", async (req, res) => {
  try {
    const { topic, level } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Missing 'topic' in request body." });
    }

    const targetLevel =
      level && ["beginner", "intermediate", "advanced"].includes(level)
        ? level
        : "beginner";

    const userPrompt = `
Generate a LearningMap JSON for topic: "${topic}".
Target learner level: "${targetLevel}".

The topic could be technical (e.g., "web development") or non-technical (e.g., "gardening").
All resources and summaries must be directly relevant to the topic (no unrelated programming links for non-technical topics).
Focus on clarity and a smooth progression of concepts.
Return ONLY JSON as specified.
`;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text() || "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON from Gemini:", err, text);
      return res.status(500).json({
        error: "Gemini returned invalid JSON. Please try again.",
      });
    }

    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      return res
        .status(500)
        .json({ error: "Invalid structure: missing nodes[] in response." });
    }

    const safeNodes = await sanitizeNodes(parsed.nodes, topic);

    const responsePayload = {
      topic: parsed.topic || topic,
      targetLevel: parsed.targetLevel || targetLevel,
      overview:
        parsed.overview ||
        `A curated learning path to master ${topic} at a ${targetLevel} level.`,
      nodes: safeNodes,
    };

    res.json(responsePayload);
  } catch (err) {
    console.error("Error in /api/generate-map:", err);
    res.status(500).json({
      error: "Failed to generate learning map with Gemini.",
      details: err?.message,
    });
  }
});

app.listen(port, () => {
  console.log(
    `Learning Map API (Gemini) listening on http://localhost:${port}`
  );
});
