import React, { useState } from "react";
import TopicForm from "./components/TopicForm.jsx";
import LearningMap from "./components/LearningMap.jsx";

function App() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async ({ topic, level }) => {
    setError("");
    setLoading(true);
    setMapData(null);

    try {
      const res = await fetch("/api/generate-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      setMapData(data);
    } catch (err) {
      setError(err.message || "Failed to generate learning map.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!mapData) return;
    const blob = new Blob([JSON.stringify(mapData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTopic = mapData.topic
      ? mapData.topic.toLowerCase().replace(/\s+/g, "-")
      : "learning-map";
    a.download = `${safeTopic}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">Free, verified resources only</p>
        <h1>AI Learning Map</h1>
        <p className="subtitle">
          Turn any topic into an interactive tree of concepts and links.
        </p>
      </header>

      <main className="app-main">
        <TopicForm onGenerate={handleGenerate} loading={loading} />

        {error && <div className="error-banner">Error: {error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <span>Generating your map...</span>
          </div>
        )}

        {mapData && !loading && (
          <>
            <section className="map-meta">
              <div>
                <h2>{mapData.topic}</h2>
                <p className="overview">{mapData.overview}</p>
              </div>
              <div className="meta-actions">
                <span className="level-pill">
                  Level: {mapData.targetLevel ?? "beginner"}
                </span>
                <button className="btn-secondary" onClick={handleExport}>
                  Export JSON
                </button>
              </div>
            </section>

            <LearningMap map={mapData} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <small>Built with React + Gemini AI</small>
      </footer>
    </div>
  );
}

export default App;
