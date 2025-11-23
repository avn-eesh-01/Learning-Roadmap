import React from "react";
import NodeCard from "./NodeCard.jsx";

function LearningMap({ map }) {
  const { nodes } = map;

  if (!nodes || nodes.length === 0) {
    return <p>No nodes found.</p>;
  }

  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <h3 className="panel-title">Interactive Learning Map</h3>
          <p className="panel-subtitle">
            Follow the branches. Each indentation is a deeper level in the tree.
          </p>
        </div>
      </div>
      <div className="map-scroll">
        <ul className="tree-level root-level">
          {nodes.map((node, idx) => (
            <li key={node.id} className="tree-item">
              <NodeCard node={node} depth={0} path={`${idx + 1}`} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default LearningMap;
