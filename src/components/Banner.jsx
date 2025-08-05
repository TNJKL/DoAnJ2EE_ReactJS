import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Videocam as StreamIcon,
  Games as GamesIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';

const Banner = () => {
  return (
    <Paper 
      sx={{ 
        mb: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
      
      <Container maxWidth="lg">
        <Box 
          sx={{ 
            py: 3, // Giảm từ py: 4 xuống py: 3
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Left content */}
          <Box sx={{ flex: 1, mr: 4 }}>
            <Typography 
              variant="h4" // Giảm từ h3 xuống h4
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Chơi Game & Stream Live
            </Typography>
            
            <Typography 
              variant="body1" // Giảm từ h6 xuống body1
              sx={{ 
                mb: 2, // Giảm từ mb: 3 xuống mb: 2
                opacity: 0.9,
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              Khám phá hàng trăm game thú vị và xem stream live từ các game thủ chuyên nghiệp
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                size="medium" // Giảm từ large xuống medium
                startIcon={<PlayIcon />}
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                Chơi Game Ngay
              </Button>
              
              <Button 
                variant="outlined" 
                size="medium" // Giảm từ large xuống medium
                startIcon={<StreamIcon />}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Xem Stream Live
              </Button>
            </Box>
          </Box>
          
          {/* Right content - Stats */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            flexDirection: 'column', 
            gap: 1.5, // Giảm từ gap: 2 xuống gap: 1.5
            minWidth: 180 // Giảm từ 200 xuống 180
          }}>
            <Box sx={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              p: 1.5, // Giảm từ p: 2 xuống p: 1.5
              borderRadius: 2,
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <GamesIcon sx={{ fontSize: 32, mb: 0.5 }} /> {/* Giảm từ 40 xuống 32 */}
              <Typography variant="h5" fontWeight="bold"> {/* Giảm từ h4 xuống h5 */}
                50+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Game Đa Dạng
              </Typography>
            </Box>
            
            <Box sx={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              p: 1.5, // Giảm từ p: 2 xuống p: 1.5
              borderRadius: 2,
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <StreamIcon sx={{ fontSize: 32, mb: 0.5 }} /> {/* Giảm từ 40 xuống 32 */}
              <Typography variant="h5" fontWeight="bold"> {/* Giảm từ h4 xuống h5 */}
                24/7
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Stream Live
              </Typography>
            </Box>
            
            <Box sx={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              p: 1.5, // Giảm từ p: 2 xuống p: 1.5
              borderRadius: 2,
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <TrendingIcon sx={{ fontSize: 32, mb: 0.5 }} /> {/* Giảm từ 40 xuống 32 */}
              <Typography variant="h5" fontWeight="bold"> {/* Giảm từ h4 xuống h5 */}
                1000+
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Người Chơi
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Paper>
  );
};

export default Banner;