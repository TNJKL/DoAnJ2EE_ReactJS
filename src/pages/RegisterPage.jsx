import React, { useState } from "react";
import {
  Container, Box, Typography, TextField, Button, Link, Alert
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  try {
    await axios.post("http://localhost:8080/api/auth/register", form);
    setSuccess("Đăng ký thành công! Đang chuyển hướng...");
    setTimeout(() => navigate("/login"), 1500);
  } catch (err) {
    let msg = "Đăng ký thất bại!";
    if (err.response?.data) {
      if (typeof err.response.data === "string") {
        msg = err.response.data;
      } else if (typeof err.response.data === "object") {
        msg = err.response.data.message || JSON.stringify(err.response.data);
      }
    }
    setError(msg);
    console.error("Lỗi đăng ký:", err);
  }
};

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2, bgcolor: "#fff" }}>
        <Typography variant="h5" align="center" gutterBottom>
          Đăng ký tài khoản
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Tên đăng nhập"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
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
            Đăng ký
          </Button>
        </form>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link href="/login" underline="hover">
            Đã có tài khoản? Đăng nhập
          </Link>
        </Box>
      </Box>
    </Container>
  );
}

export default RegisterPage;
