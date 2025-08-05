import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Rating,
  TextField,
  Divider,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StarIcon from "@mui/icons-material/Star";
import VideocamIcon from "@mui/icons-material/Videocam";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import SnakeGame from "../games/SnakeGame";
import PlaceholderGame from "../games/PlaceholderGame";
import GameLeaderboard from "../components/GameLeaderboard";
import StreamPlayer from "../components/StreamPlayer";
import LiveStreams from "../components/LiveStreams";
import StreamViewer from "../components/StreamViewer";
import FlappyBirdGame from "../games/FlappyBirdGame";
import PongGame from "../games/PongGame";
import BallCatcherGame from "../games/BallCatcherGame";
import CaroGame from "../games/CaroGame";
import ChickenInvadersGame from "../games/ChickenInvadersGame";
import DinoEggShooterGame from "../games/DinoEggShooterGame";
import DinosaurGame from "../games/DinosaurGame";
import DuckHuntGame from "../games/DuckHuntGame";
import Game2048 from "../games/Game2048";
import GemJewelGame from "../games/GemJewelGame";
import GoldMinerGame from "../games/GoldMinerGame";
import MyTalkingTomGame from "../games/MyTalkingTomGame";
import PikachuGame from "../games/PikachuGame";
import StreetFighterGame from "../games/StreetFighterGame";
const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStream, setSelectedStream] = useState(null);
  const [refreshLeaderboard, setRefreshLeaderboard] = useState(0);

  useEffect(() => {
    fetchGameDetails();
    getCurrentUser();
  }, [gameId]);

  const getCurrentUser = () => {
    // Lấy thông tin user từ localStorage hoặc context
    const userStr = localStorage.getItem('user');
    console.log('User string from localStorage:', userStr);
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Parsed user:', user);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      console.log('No user found in localStorage');
    }
  };

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching game with ID:', gameId);
      const response = await axios.get(`http://localhost:8080/api/user/games/${gameId}/optimized`);
      console.log('Game data:', response.data);
      setGame(response.data);
      // TODO: Fetch reviews from backend
      setReviews([
        { id: 1, user: "User1", rating: 5, comment: "Game rất hay!", date: "2024-01-15" },
        { id: 2, user: "User2", rating: 4, comment: "Đồ họa đẹp", date: "2024-01-14" }
      ]);
    } catch (err) {
      console.error('Error fetching game:', err);
      console.error('Error response:', err.response?.data);
      setError("Không thể tải thông tin game");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handlePlayGame = () => {
    // Scroll to game area
    document.getElementById("game-area")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStreamSelect = (stream) => {
    console.log('GamePage: handleStreamSelect called with stream:', stream);
    setSelectedStream(stream);
    setActiveTab(2); // Chuyển sang tab stream
    console.log('GamePage: Active tab set to 2, selectedStream set to:', stream);
  };

  const handleStreamEnd = () => {
    setSelectedStream(null);
    setActiveTab(0); // Quay về tab game
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setSnackbar({ open: true, message: "Vui lòng chọn đánh giá", severity: "warning" });
      return;
    }

    try {
      // TODO: Submit review to backend
      const newReview = {
        id: Date.now(),
        user: "CurrentUser",
        rating,
        comment,
        date: new Date().toISOString().split('T')[0]
      };
      setReviews([newReview, ...reviews]);
      setRating(0);
      setComment("");
      setSnackbar({ open: true, message: "Đánh giá đã được gửi!", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi khi gửi đánh giá", severity: "error" });
    }
  };

  // Function để trigger refresh leaderboard
  const handleGameEnd = () => {
    console.log('GamePage: handleGameEnd called, triggering leaderboard refresh');
    setRefreshLeaderboard(prev => prev + 1);
  };

  // Render game component based on game type
  const renderGame = () => {
    if (!game) return null;

    // Check gameType first, then fallback to title check
    if (game.gameType === 'snake' || 
        (game.title && game.title.toLowerCase().includes('rắn')) ||
        (game.gameUrl && game.gameUrl.includes('snake'))) {
      return <SnakeGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'flappybird' || 
        (game.title && game.title.toLowerCase().includes('flappy bird')) ||
        (game.gameUrl && game.gameUrl.includes('flappybird'))) {
      return <FlappyBirdGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'pong' || 
        (game.title && game.title.toLowerCase().includes('pong')) ||
        (game.gameUrl && game.gameUrl.includes('pong'))) {
      return <PongGame onGameEnd={handleGameEnd} />;
    }
     
    if (game.gameType === 'ballcatcher' || 
        (game.title && game.title.toLowerCase().includes('ball catcher')) ||
        (game.gameUrl && game.gameUrl.includes('ballcatcher'))) {
      return <BallCatcherGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'caro' || 
        (game.title && game.title.toLowerCase().includes('caro')) ||
        (game.gameUrl && game.gameUrl.includes('caro'))) {
      return <CaroGame onGameEnd={handleGameEnd} />;
    }
    
    if (game.gameType === 'chickeninvaders' || 
        (game.title && game.title.toLowerCase().includes('chicken invaders')) ||
        (game.gameUrl && game.gameUrl.includes('chickeninvaders'))) {
      return <ChickenInvadersGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'dinoeggs' || 
        (game.title && game.title.toLowerCase().includes('dino eggs')) ||
        (game.gameUrl && game.gameUrl.includes('dinoeggs'))) {
      return <DinoEggShooterGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'dinosaur' || 
        (game.title && game.title.toLowerCase().includes('dinosaur')) ||
        (game.gameUrl && game.gameUrl.includes('dinosaur'))) {
      return <DinosaurGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'duckhunt' || 
        (game.title && game.title.toLowerCase().includes('duck hunt')) ||
        (game.gameUrl && game.gameUrl.includes('duckhunt'))) {
      return <DuckHuntGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'game2048' || 
        (game.title && game.title.toLowerCase().includes('2048')) ||
        (game.gameUrl && game.gameUrl.includes('game2048'))) {
      return <Game2048 onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'gemjewel' || 
        (game.title && game.title.toLowerCase().includes('gem jewel')) ||
        (game.gameUrl && game.gameUrl.includes('gemjewel'))) {
      return <GemJewelGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'goldminer' || 
        (game.title && game.title.toLowerCase().includes('gold miner')) ||
        (game.gameUrl && game.gameUrl.includes('goldminer'))) {
      return <GoldMinerGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'mytalkingtom' || 
        (game.title && game.title.toLowerCase().includes('my talking tom')) ||
        (game.gameUrl && game.gameUrl.includes('mytalkingtom'))) {
      return <MyTalkingTomGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'pikachu' || 
        (game.title && game.title.toLowerCase().includes('pikachu')) ||
        (game.gameUrl && game.gameUrl.includes('pikachu'))) {
      return <PikachuGame onGameEnd={handleGameEnd} />;
    }

    if (game.gameType === 'streetfighter' || 
        (game.title && game.title.toLowerCase().includes('street fighter')) ||
        (game.gameUrl && game.gameUrl.includes('streetfighter'))) {
      return <StreetFighterGame onGameEnd={handleGameEnd} />;
    }

    // Default to placeholder
    return <PlaceholderGame />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (error || !game) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography variant="h5" color="error" gutterBottom>{error || "Game không tồn tại"}</Typography>
        <Button variant="contained" onClick={handleBack}>Quay lại</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: "#f5f5f5", pb: 4, width: "100vw", maxWidth: "100%" }}>
      {/* Header */}
      <Box sx={{ background: "#1976d2", color: "white", p: 2, width: "100%" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ color: "white", mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography variant="h4" gutterBottom>{game.title}</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip label={game.genre?.name} color="primary" variant="outlined" />
          <Typography variant="body2">Tạo bởi: {game.createdByUsername}</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto", p: 3, width: "100%" }}>
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Chơi Game" icon={<PlayArrowIcon />} />
            <Tab label="Stream Live" icon={<VideocamIcon />} />
            <Tab label="Xem Stream" icon={<VisibilityIcon />} />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* Main Content */}
            <div style={{ flex: 1 }}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Chơi Game</Typography>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={handlePlayGame}
                  >
                    Chơi ngay
                  </Button>
                </Box>
                
                {/* Game Component */}
                <Box
                  id="game-area"
                  sx={{
                    width: "100%",
                    minHeight: 500,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  {renderGame()}
                </Box>
              </Paper>

              {/* Description */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Mô tả</Typography>
                <Typography variant="body1" color="text.secondary">
                  {game.description || "Chưa có mô tả cho game này."}
                </Typography>
              </Paper>

              {/* Reviews */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Đánh giá & Bình luận</Typography>
                
                {/* Add Review */}
                <Box sx={{ mb: 3, p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>Thêm đánh giá</Typography>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography component="span" mr={1}>Đánh giá:</Typography>
                    <Rating
                      value={rating}
                      onChange={(event, newValue) => setRating(newValue)}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Viết bình luận của bạn..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button variant="contained" onClick={handleSubmitReview}>
                    Gửi đánh giá
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Reviews List */}
                {reviews.map((review, index) => (
                  <Card key={review.id || index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar sx={{ mr: 2 }}>{review.user[0]}</Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1">{review.user}</Typography>
                          <Box display="flex" alignItems="center">
                            <Rating value={review.rating} readOnly size="small" />
                            <Typography variant="body2" color="text.secondary" ml={1}>
                              {review.date}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body2">{review.comment}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            </div>

            {/* Right Sidebar */}
            <div style={{ width: 300, flexShrink: 0 }}>
              {/* Game Info */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Thông tin Game</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Thể loại</Typography>
                  <Typography variant="body1">{game.genreName}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Ngày tạo</Typography>
                  <Typography variant="body1">
                    {new Date(game.createdAt).toLocaleDateString('vi-VN')}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Đánh giá trung bình</Typography>
                  <Box display="flex" alignItems="center">
                    <Rating value={4.5} readOnly />
                    <Typography variant="body1" ml={1}>4.5/5</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Leaderboard */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Bảng xếp hạng</Typography>
                <GameLeaderboard gameId={gameId} refresh={refreshLeaderboard} />
              </Paper>

              {/* Similar Games */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Game tương tự</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tính năng này sẽ được phát triển sau...
                </Typography>
              </Paper>
            </div>
          </div>
        )}

        {/* Stream Tab */}
        {activeTab === 1 && currentUser && (
          <StreamPlayer 
            gameId={gameId} 
            currentUser={currentUser}
            onStreamEnd={handleStreamEnd}
          />
        )}

        {/* Watch Streams Tab */}
        {activeTab === 2 && !selectedStream && (
          <LiveStreams 
            onStreamSelect={handleStreamSelect}
            currentUser={currentUser}
          />
        )}
        
        {/* Stream Viewer */}
        {activeTab === 2 && selectedStream && (
          <StreamViewer 
            stream={selectedStream}
            currentUser={currentUser}
            onBack={() => {
              setSelectedStream(null);
              console.log('Back to stream list');
            }}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GamePage; 