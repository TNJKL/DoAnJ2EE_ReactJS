import React from "react";
import { Container, Box, Typography, Button } from "@mui/material";

function Dashboard() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, p: 4, boxShadow: 3, borderRadius: 2, bgcolor: "#fff", textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Xin chào, {username}!
        </Typography>
        <Typography variant="h6" gutterBottom>
          Vai trò: {role}
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Đây là dashboard. Giao diện sẽ thay đổi tùy theo vai trò (user, dev, admin).
        </Typography>
        <Button variant="contained" color="secondary" sx={{ mt: 4 }} onClick={handleLogout}>
          Đăng xuất
        </Button>
      </Box>
    </Container>
  );
}

export default Dashboard;