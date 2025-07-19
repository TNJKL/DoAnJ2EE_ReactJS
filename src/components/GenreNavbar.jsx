import React from "react";

const GenreNavbar = ({ genres, onSelectGenre, selectedGenre }) => {
  return (
    <nav style={{
      minWidth: 180, background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #0001"
    }}>
      <div style={{ fontWeight: "bold", marginBottom: 12 }}>Thể loại</div>
      <div
        style={{
          padding: "8px 0",
          cursor: "pointer",
          color: !selectedGenre ? "#1976d2" : "#333",
          fontWeight: !selectedGenre ? "bold" : "normal"
        }}
        onClick={() => onSelectGenre(null)}
      >
        Tất cả
      </div>
      {genres.map(genre => (
        <div
          key={genre.genreID || genre.id}
          style={{
            padding: "8px 0",
            cursor: "pointer",
            color: selectedGenre === (genre.genreID || genre.id) ? "#1976d2" : "#333",
            fontWeight: selectedGenre === (genre.genreID || genre.id) ? "bold" : "normal"
          }}
          onClick={() => onSelectGenre(genre.genreID || genre.id)}
        >
          {genre.name}
        </div>
      ))}
    </nav>
  );
};

export default GenreNavbar;