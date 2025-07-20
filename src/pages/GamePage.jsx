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
  Alert
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StarIcon from "@mui/icons-material/Star";
import axios from "axios";
import SnakeGame from "../games/SnakeGame";
import PlaceholderGame from "../games/PlaceholderGame";
import Leaderboard from "../components/Leaderboard";
import FlappyBirdGame from "../games/FlappyBirdGame";
import TetrisGame from "../games/TetrisGame";

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
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetchGameDetails();
    fetchLeaderboard();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching game with ID:', gameId);
      const response = await axios.get(`http://localhost:8080/api/user/games/${gameId}`);
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

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/user/games/${gameId}/leaderboard?limit=10`);
      setLeaderboard(response.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setLeaderboard([]);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handlePlayGame = () => {
    // Scroll to game area
    document.getElementById("game-area")?.scrollIntoView({ behavior: "smooth" });
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

  // Render game component based on game type
  const renderGame = () => {
    if (!game) return null;

    // Check gameType first, then fallback to title check
    if (game.gameType === 'snake' || 
        (game.title && game.title.toLowerCase().includes('rắn')) ||
        (game.gameUrl && game.gameUrl.includes('snake'))) {
      return <SnakeGame onGameEnd={fetchLeaderboard} />;
    }

    if (game.gameType === 'flappy' || 
        (game.title && game.title.toLowerCase().includes('flappy'))) {
      return <FlappyBirdGame onGameEnd={fetchLeaderboard} />;
    }

    if (game.gameType === 'tetris' || 
        (game.title && game.title.toLowerCase().includes('tetris'))) {
      return <TetrisGame onGameEnd={fetchLeaderboard} />;
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
          <Typography variant="body2">Tạo bởi: {game.createdBy?.username}</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto", p: 3, width: "100%" }}>
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
                <Typography variant="body1">{game.genre?.name}</Typography>
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
              <Leaderboard leaderboard={leaderboard} />
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