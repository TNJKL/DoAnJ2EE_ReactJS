import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Box } from "@mui/material";
import axios from "axios";

function GoogleLoginButton({ onLoginSuccess }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      const res = await axios.post(
        "http://localhost:8080/api/auth/google-login",
        token,
        { headers: { "Content-Type": "text/plain" } }
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);
      if (onLoginSuccess) onLoginSuccess(res.data);
    } catch (err) {
      alert("Đăng nhập Google thất bại!");
    }
  };

  return (
    <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => alert("Đăng nhập Google thất bại!")}
        useOneTap
      />
    </Box>
  );
}

export default GoogleLoginButton;