import React, { useState } from "react";

const levels = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function TopicForm({ onGenerate, loading }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("beginner");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    onGenerate({ topic: topic.trim(), level });
  };

  return (
    <section className="panel">
      <form className="topic-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label>What do you want to learn?</label>
          <input
            type="text"
            placeholder='e.g. "Web Development", "Gardening"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="field-group inline">
          <div>
            <label>Learning Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Generate Learning Map"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default TopicForm;
