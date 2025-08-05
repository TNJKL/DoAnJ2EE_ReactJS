import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./pages/MainLayout";
import DevSubmissionPage from "./pages/DevSubmissionPage";
import ForumPage from "./pages/ForumPage";
import ForumPostDetailDialog from "./pages/ForumPostDetailDialog";
import GamePage from "./pages/GamePage";
import AdminCoinManagement from "./pages/admin/AdminCoinManagement";

const GOOGLE_CLIENT_ID = "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        {/* <Header /> */}
        <Routes>
          <Route path="/" element={<MainLayout />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/*" element={<AdminLayout />} />
          <Route path="/dev-submission" element={<DevSubmissionPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/:postId" element={<ForumPostDetailDialog />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/login" />} />
          <Route path="/coin-management" element={<AdminCoinManagement />} />
        </Routes>
        {/* <Footer /> */}
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;