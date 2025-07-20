import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

const PlaceholderGame = () => {
  return (
    <Box sx={{ 
      textAlign: 'center', 
      p: 4,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 3,
      color: 'white',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Typography variant="h1" sx={{ mb: 3, fontSize: '4rem' }}>
        🎮
      </Typography>
      
      <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
        Game Đang Phát Triển
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, maxWidth: 500 }}>
        Game này đang được các developer tài năng của chúng tôi phát triển. 
        Hãy quay lại sau để trải nghiệm game tuyệt vời này!
      </Typography>
      
      <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Tiến độ phát triển: 75%
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={75} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            backgroundColor: 'rgba(255,255,255,0.2)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #4CAF50, #45a049)'
            }
          }} 
        />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Box sx={{ 
          background: 'rgba(255,255,255,0.1)', 
          p: 2, 
          borderRadius: 2,
          minWidth: 120
        }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>🎨 Đồ họa</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Hoàn thành</Typography>
        </Box>
        
        <Box sx={{ 
          background: 'rgba(255,255,255,0.1)', 
          p: 2, 
          borderRadius: 2,
          minWidth: 120
        }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>🎵 Âm thanh</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Đang làm</Typography>
        </Box>
        
        <Box sx={{ 
          background: 'rgba(255,255,255,0.1)', 
          p: 2, 
          borderRadius: 2,
          minWidth: 120
        }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>⚡ Tối ưu</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>Chưa bắt đầu</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PlaceholderGame; 