import React from "react";
import { useNavigate } from "react-router-dom";

const GameGrid = ({ games }) => {
  const navigate = useNavigate();

  const handleGameClick = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 24
    }}>
      {games.length === 0 && (
        <div style={{ 
          gridColumn: "1 / -1", 
          textAlign: "center", 
          padding: "40px",
          color: "#666"
        }}>
          Không có game nào phù hợp.
        </div>
      )}
      {games.map(game => (
        <div 
          key={game.gameID} 
          onClick={() => handleGameClick(game.gameID)}
          style={{
            background: "#fff", 
            borderRadius: 8, 
            boxShadow: "0 2px 8px #0001", 
            padding: 16,
            cursor: "pointer",
            transition: "all 0.3s ease",
            border: "1px solid transparent",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            e.currentTarget.style.borderColor = "#1976d2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px #0001";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={game.thumbnailUrl?.startsWith("http") ? game.thumbnailUrl : `http://localhost:8080${game.thumbnailUrl}`}
              alt={game.title}
              style={{ 
                width: "100%", 
                height: 120, 
                objectFit: "cover", 
                borderRadius: 6, 
                marginBottom: 12 
              }}
            />
            {/* Play button overlay */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(25, 118, 210, 0.9)",
              color: "white",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.3s ease",
              fontSize: "20px"
            }}>
              ▶
            </div>
          </div>
          
          <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>
            {game.title}
          </div>
          
          <div style={{ 
            color: "#888", 
            fontSize: 14, 
            margin: "8px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{
              background: "#1976d2",
              color: "white",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px"
            }}>
              {game.genre?.name}
            </span>
          </div>
          
          <div style={{ 
            fontSize: 14, 
            color: "#666",
            lineHeight: "1.4",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}>
            {game.description || "Chưa có mô tả"}
          </div>
          
          {/* Hover effect for play button */}
          <style>{`
            div[onclick]:hover div[style*="opacity: 0"] {
              opacity: 1 !important;
            }
          `}</style>
        </div>
      ))}
    </div>
  );
};

export default GameGrid;