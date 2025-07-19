import React from "react";
import { Box, List, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArticleIcon from "@mui/icons-material/Article";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

const menu = [
  { text: "Dashboard", icon: <DashboardIcon />, key: "dashboard" },
  { text: "User", icon: <PeopleIcon />, key: "user" },
  { text: "Duyệt game", icon: <AssignmentIcon />, key: "game-approval" },
  { text: "Duyệt bài viết", icon: <ArticleIcon />, key: "post-approval" },
  { text: "Game", icon: <SportsEsportsIcon />, key: "game-management" },
];

function AdminSidebar({ selected, onSelect }) {
  return (
    <Box
      sx={{
        width: 220,
        bgcolor: "#f5c16c",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        pt: "64px", // nếu header cao 64px
        boxShadow: 2,
        zIndex: 1100,
      }}
    >
      <List>
        {menu.map((item) => (
          <ListItem
            button
            key={item.key}
            selected={selected === item.key}
            onClick={() => onSelect(item.key)}
            sx={{
              bgcolor: selected === item.key ? "#fff3e0" : "inherit",
              "&:hover": { bgcolor: "#ffe0b2" },
            }}
          >
            <ListItemIcon sx={{ color: "#b47b00" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
    </Box>
  );
}

export default AdminSidebar;