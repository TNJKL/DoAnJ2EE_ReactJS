import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Header = ({
  mode = "user",
  onSearch,
  title,
}) => {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Lắng nghe thay đổi localStorage (nếu có nhiều tab)
    const syncUser = () => {
      const u = localStorage.getItem("user");
      setUser(u ? JSON.parse(u) : null);
    };
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const handleInput = (e) => {
    setValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const handleForum = () => {
    navigate("/forum");
  };

  const isAdmin = mode === "admin";

  return (
    <header
      style={{
        background: isAdmin ? "#222" : "#1976d2",
        color: "#fff",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: isAdmin ? "4px solid #1976d2" : "none",
        minHeight: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ fontWeight: "bold", fontSize: 24, marginRight: 32 }}>
          {title || (isAdmin ? "Admin Dashboard" : "Game Portal")}
        </div>
        {/* Nút diễn đàn */}
        {!isAdmin && (
          <button
            onClick={handleForum}
            style={{
              marginLeft: 8,
              padding: "6px 16px",
              borderRadius: 4,
              border: "none",
              background: "#fff",
              color: "#1976d2",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Diễn đàn
          </button>
        )}
      </div>

      {!isAdmin && onSearch && (
        <input
          type="text"
          placeholder="Tìm kiếm game..."
          value={value}
          onChange={handleInput}
          style={{
            padding: 8,
            borderRadius: 4,
            border: "none",
            width: 300,
            marginRight: 24,
            background: "#fff",
            color: "#222",
          }}
        />
      )}

      <div>
        {user ? (
          <>
            Xin chào, <b>{user.username}</b>
            {isAdmin && <span style={{ marginLeft: 12, fontStyle: "italic" }}>(Admin)</span>}
            <button
              onClick={handleLogout}
              style={{
                marginLeft: 16,
                padding: "6px 16px",
                borderRadius: 4,
                border: "none",
                background: "#fff",
                color: "#1976d2",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            style={{
              padding: "6px 16px",
              borderRadius: 4,
              border: "none",
              background: "#fff",
              color: "#1976d2",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;