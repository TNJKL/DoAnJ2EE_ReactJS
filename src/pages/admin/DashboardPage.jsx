import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import axios from "axios";

function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8080/api/admin/summary")
      .then(res => {
        setData([
          { name: "User", value: res.data.totalUsers },
          { name: "Game", value: res.data.totalGames },
          { name: "Bài viết", value: res.data.totalForumPosts },
        ]);
      });
  }, []);

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Thống kê hệ thống
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        {!data ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
}

export default DashboardPage;