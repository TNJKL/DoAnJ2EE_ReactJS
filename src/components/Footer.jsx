import React from "react";
import { Box, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
    component="footer"
    sx={{
      width: "100%",
      position: "fixed",
      left: 0,
      bottom: 0,
      bgcolor: "primary.main",
      color: "#fff",
      textAlign: "center",
      py: 2,
      zIndex: 1201,
      height: "48px", // Thêm dòng này
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
      }}
    >
      <Typography variant="body2">
        © {new Date().getFullYear()} WebSite Chơi Game Trực Tuyến. All rights reserved.
      </Typography>
    </Box>
  );
}

export default Footer;