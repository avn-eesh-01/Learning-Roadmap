import React, { useState } from "react";

function NodeCard({ node, depth, path }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  const toggle = (e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <div className="node-wrapper" style={{ "--depth": depth }}>
      <div className="branch-visual" aria-hidden="true" />
      <div className={`node-card ${hasChildren ? "has-children" : ""}`}>
        <div className="node-head">
          <div className="node-title-row">
            <span className="branch-dot" aria-hidden="true" />
            <div>
              <p className="level-hint">Branch {path}</p>
              <h4>{node.title}</h4>
            </div>
          </div>
          {hasChildren && (
            <button
              type="button"
              className="node-toggle"
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse children" : "Expand children"}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>

        <p className="node-summary">{node.summary}</p>

        <div className="node-meta">
          <span className="level-chip">{node.level || "mixed"}</span>
          <span className="resource-count">
            {(node.resources || []).length} resources
          </span>
        </div>

        <div className="resource-grid">
          {(node.resources || []).map((r, i) => (
            <a
              key={`${r.url}-${i}`}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="resource-chip"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="chip-type">{r.type || "link"}</span>
              <span className="chip-title">{r.title}</span>
            </a>
          ))}
        </div>
      </div>

      {expanded && hasChildren && (
        <ul className="tree-level branch-level" data-level-label={path}>
          {node.children.map((child, idx) => (
            <li key={child.id} className="tree-item">
              <NodeCard node={child} depth={depth + 1} path={`${path}.${idx + 1}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NodeCard;
