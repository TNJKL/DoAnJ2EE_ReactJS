import React, { useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import DashboardPage from "../pages/admin/DashboardPage";
import UserPage from "../pages/admin/UserPage";
import GameApprovalPage from "../pages/admin/GameApprovalPage";
import PostApprovalPage from "../pages/admin/PostApprovalPage";
import GameManagementPage from "../pages/admin/GameManagementPage";
import Header from "../components/Header"; // Thêm dòng này
// import các page khác khi làm tiếp

function AdminLayout() {
  const [selected, setSelected] = useState("dashboard");

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Sidebar cố định */}
      <div style={{ position: "fixed", left: 0, top: 0, width: 220, height: "100vh", zIndex: 1100 }}>
        <AdminSidebar selected={selected} onSelect={setSelected} />
      </div>
      {/* Header cố định */}
      <div style={{ position: "fixed", left: 220, top: 0, height: 64, width: "calc(100vw - 220px)", zIndex: 1200 }}>
        <Header mode="admin" title="Quản trị hệ thống" />
      </div>
      {/* Content */}
      <div style={{ marginLeft: 220, marginTop: 90, width: "calc(100vw - 220px)", minHeight: "calc(100vh - 64px)", padding: 32, boxSizing: "border-box", paddingTop: 40 }}>
        {selected === "dashboard" && <DashboardPage />}
        {selected === "user" && <UserPage />}
        {selected === "game-approval" && <GameApprovalPage />}
        {selected === "post-approval" && <PostApprovalPage />}
        {selected === "game-management" && <GameManagementPage />}
      </div>
    </div>
  );
}

export default AdminLayout;