import React from "react";

const Leaderboard = ({ leaderboard }) => {
  return (
    <aside style={{
      minWidth: 240, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001"
    }}>
      <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 18 }}>Bảng xếp hạng</div>
      <ol style={{ paddingLeft: 20 }}>
        {leaderboard.map((user, idx) => (
          <li key={user.userID} style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: "bold" }}>{user.username}</span>
            <span style={{ float: "right", color: "#1976d2" }}>{user.highScore}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
};

export default Leaderboard;