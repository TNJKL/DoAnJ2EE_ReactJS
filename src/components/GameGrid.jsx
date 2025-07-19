import React from "react";

const GameGrid = ({ games }) => {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 24
    }}>
      {games.length === 0 && <div>Không có game nào phù hợp.</div>}
      {games.map(game => (
        <div key={game.gameID} style={{
          background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #0001", padding: 16
        }}>
          <img
            src={game.thumbnailUrl?.startsWith("http") ? game.thumbnailUrl : `http://localhost:8080${game.thumbnailUrl}`}
            alt={game.title}
            style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: 12 }}
          />
          <div style={{ fontWeight: "bold", fontSize: 18 }}>{game.title}</div>
          <div style={{ color: "#888", fontSize: 14, margin: "8px 0" }}>
            {game.genre?.name}
          </div>
          <div style={{ fontSize: 14 }}>{game.description}</div>
        </div>
      ))}
    </div>
  );
};

export default GameGrid;