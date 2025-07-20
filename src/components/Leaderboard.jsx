import React from "react";
import { Box, Typography, List, ListItem, ListItemText, Avatar, Chip } from "@mui/material";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const Leaderboard = ({ leaderboard }) => {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Chưa có dữ liệu xếp hạng
        </Typography>
      </Box>
    );
  }

  const getRankColor = (index) => {
    switch (index) {
      case 0: return '#FFD700'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return '#1976d2'; // Blue
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  return (
    <Box>
      <List sx={{ p: 0 }}>
        {leaderboard.map((user, index) => (
          <ListItem
            key={`${user.userID}-${index}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 0,
              borderBottom: index < leaderboard.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: getRankColor(index),
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mr: 2
                }}
              >
                {getRankIcon(index)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={user.highScore}
              color="primary"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Leaderboard;