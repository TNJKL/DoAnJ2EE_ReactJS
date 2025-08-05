import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Paper, Typography, Pagination, Box, Button } from "@mui/material";
import GenreNavbar from "../components/GenreNavbar";
import GameGrid from "../components/GameGrid";
import Leaderboard from "../components/Leaderboard";
import LiveStreamsSection from "../components/LiveStreamsSection";
import StreamViewerModal from "../components/StreamViewerModal";
import Banner from "../components/Banner";
import ChallengeManagement from "../components/ChallengeManagement";

const GAMES_PER_PAGE = 9;

const MainLayout = () => {
  const [games, setGames] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChallenges, setShowChallenges] = useState(false);

  // Lấy thông tin user từ localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Lấy genres và leaderboard khi load trang
  useEffect(() => {
    fetch("/api/user/game-genres")
      .then(res => res.json())
      .then(setGenres);
  }, []);

  // Lấy games khi search hoặc chọn thể loại
  useEffect(() => {
    let url = `/api/user/games/optimized?visible=true`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedGenre) url += `&genreId=${selectedGenre}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setCurrentPage(1); // Reset về trang đầu khi thay đổi danh sách
      });
  }, [search, selectedGenre]);

  // Xử lý khi tìm kiếm
  const handleSearch = (value) => setSearch(value);

  // Xử lý khi chọn thể loại
  const handleSelectGenre = (genreId) => setSelectedGenre(genreId);

  // Xử lý khi click vào stream
  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
    setStreamModalOpen(true);
  };

  // Xử lý khi đóng modal
  const handleCloseStreamModal = () => {
    setStreamModalOpen(false);
    setSelectedStream(null);
  };

  // Phân trang games
  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  const pagedGames = games.slice((currentPage - 1) * GAMES_PER_PAGE, currentPage * GAMES_PER_PAGE);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100vw", background: "#f5f5f5" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", zIndex: 1200 }}>
        <Header onSearch={handleSearch} />
      </div>
      {/* Banner - Thu nhỏ lại */}
      <div style={{ marginTop: 150, width: "100vw", padding: "0 24px", boxSizing: "border-box" }}>
        <Banner />
      </div>
      {/* Live Streams Section */}
      <div style={{ width: "100vw", padding: "0 24px", boxSizing: "border-box" }}>
        <LiveStreamsSection onStreamSelect={handleStreamSelect} />
      </div>

      {/* Challenge Button */}
      {currentUser && (
        <div style={{ width: "100vw", padding: "0 24px", boxSizing: "border-box", marginBottom: 16 }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setShowChallenges(!showChallenges)}
            sx={{ mb: 2 }}
          >
            {showChallenges ? "Ẩn Thách đấu" : "Xem Thách đấu"}
          </Button>
        </div>
      )}

      {/* Challenge Section */}
      {showChallenges && currentUser && (
        <div style={{ width: "100vw", padding: "0 24px", boxSizing: "border-box", marginBottom: 24 }}>
          <ChallengeManagement />
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        width: "100vw", 
        minHeight: "calc(100vh - 64px)", 
        display: "flex", 
        gap: 24, 
        alignItems: "flex-start", 
        padding: "0 24px 24px 24px", 
        boxSizing: "border-box" 
      }}>
        <GenreNavbar genres={genres} onSelectGenre={handleSelectGenre} selectedGenre={selectedGenre} />
        <div style={{ flex: 1 }}>
          <GameGrid games={pagedGames} columns={3} />
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                size="large"
              />
            </Box>
          )}
        </div>
        <Paper sx={{ p: 3, width: 300, flexShrink: 0 }}>
          <Leaderboard />
        </Paper>
      </div>
      {/* Stream Viewer Modal */}
      <StreamViewerModal
        open={streamModalOpen}
        stream={selectedStream}
        currentUser={currentUser}
        onClose={handleCloseStreamModal}
      />
    </div>
  );
};

export default MainLayout; 