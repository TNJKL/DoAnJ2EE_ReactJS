import React, { useState } from "react";
import {
  Container, Box, Typography, TextField, Button, Link, Alert
} from "@mui/material";
import GoogleLoginButton from "../components/GoogleLoginButton";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("http://localhost:8080/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("email", res.data.email);
      // Lưu thêm user object cho Header
      localStorage.setItem("user", JSON.stringify({
        username: res.data.username,
        email: res.data.email,
        role: res.data.role
      }));
      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "dev") {
        navigate("/dev-submission");
      } else {
        navigate("/");
      }
    } catch (err) {
      let msg = "Đăng nhập thất bại!";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          msg = err.response.data;
        } else if (typeof err.response.data === "object") {
          msg = err.response.data.message || JSON.stringify(err.response.data);
        }
      }
      setError(msg);
    }
  };

  const handleGoogleLoginSuccess = () => {
    navigate("/dashboard");
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        pt: "64px",
        pb: "48px",
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ width: "100%", p: 4, boxShadow: 3, borderRadius: 2, bgcolor: "#fff" }}>
          <Typography variant="h5" align="center" gutterBottom>
            Đăng nhập
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Tên đăng nhập hoặc Email"
              name="usernameOrEmail"
              value={form.usernameOrEmail}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Mật khẩu"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Đăng nhập
            </Button>
          </form>
          <GoogleLoginButton onLoginSuccess={handleGoogleLoginSuccess} />
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link href="/register" underline="hover">
              Chưa có tài khoản? Đăng ký
            </Link>
            <br />
            <Link href="/forgot-password" underline="hover">
              Quên mật khẩu?
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;