import React, { useState } from "react";
import {
  Container, Box, Typography, TextField, Button, Link, Alert
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await axios.post("http://localhost:8080/api/auth/forgot-password", { email });
      setSuccess("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data || "Có lỗi xảy ra!");
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2, bgcolor: "#fff" }}>
        <Typography variant="h5" align="center" gutterBottom>
          Quên mật khẩu
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
            Gửi yêu cầu
          </Button>
        </form>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link href="/login" underline="hover">
            Quay lại đăng nhập
          </Link>
        </Box>
      </Box>
    </Container>
  );
}

export default ForgotPasswordPage;