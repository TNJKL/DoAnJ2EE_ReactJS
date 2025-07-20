import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Paper, Typography } from "@mui/material";
import GenreNavbar from "../components/GenreNavbar";
import GameGrid from "../components/GameGrid";
import Leaderboard from "../components/Leaderboard";

const MainLayout = () => {
  const [games, setGames] = useState([]);
  const [genres, setGenres] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(null);

  // Lấy genres và leaderboard khi load trang
  useEffect(() => {
    fetch("/api/user/game-genres")
      .then(res => res.json())
      .then(setGenres);

    fetch("/api/user/leaderboard?limit=10")
      .then(res => res.json())
      .then(setLeaderboard);
  }, []);

  // Lấy games khi search hoặc chọn thể loại
  useEffect(() => {
    let url = `/api/user/games?visible=true`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedGenre) url += `&genreId=${selectedGenre}`;
    fetch(url)
      .then(res => res.json())
      .then(setGames);
  }, [search, selectedGenre]);

  // Xử lý khi tìm kiếm
  const handleSearch = (value) => setSearch(value);

  // Xử lý khi chọn thể loại
  const handleSelectGenre = (genreId) => setSelectedGenre(genreId);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100vw", background: "#f5f5f5" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", zIndex: 1200 }}>
        <Header onSearch={handleSearch} />
      </div>
      <div style={{ flex: 1, marginTop: 150, width: "100vw", minHeight: "calc(100vh - 64px)", display: "flex", gap: 24, alignItems: "flex-start", padding: 24, boxSizing: "border-box", paddingTop: 40 }}>
        <GenreNavbar genres={genres} onSelectGenre={handleSelectGenre} selectedGenre={selectedGenre} />
        <div style={{ flex: 1 }}>
          <GameGrid games={games} />
        </div>
        <Paper sx={{ p: 3, width: 300, flexShrink: 0 }}>
          <Typography variant="h6" gutterBottom>Bảng xếp hạng</Typography>
          <Leaderboard leaderboard={leaderboard} />
        </Paper>
      </div>
    </div>
  );
};

export default MainLayout;