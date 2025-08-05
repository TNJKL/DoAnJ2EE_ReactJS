import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Avatar, Chip, MenuItem, Select, InputLabel, FormControl
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

function GameManagementPage() {
  const [games, setGames] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showHidden, setShowHidden] = useState(false);

  // Thể loại và user dev
  const [genres, setGenres] = useState([]);
  const [devUsers, setDevUsers] = useState([]);

  useEffect(() => {
    fetchGames();
  }, [showHidden]);

  useEffect(() => {
    fetchGenres();
    fetchDevUsers();
  }, []);

  const fetchGames = async () => {
    try {
      const url = showHidden
        ? "http://localhost:8080/api/admin/games/management?visible=false"
        : "http://localhost:8080/api/admin/games/management?visible=true";
      const res = await axios.get(url);
      console.log("Games data:", res.data);
      setGames(res.data);
    } catch (err) {
      console.error("Error fetching games:", err);
      setSnackbar({ open: true, message: "Lỗi tải danh sách game!", severity: "error" });
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/admin/game-genres");
      setGenres(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi tải thể loại!", severity: "error" });
    }
  };

  const fetchDevUsers = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/admin/dev-users");
      setDevUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi tải user DEV!", severity: "error" });
    }
  };

  const handleEdit = (game) => {
    setEditGame({
      ...game,
      genreID: game.genreID || "",
      createdByID: game.createdByID || ""
    });
    setOpenDialog(true);
  };

  const handleAdd = () => {
    setEditGame({
      title: "",
      description: "",
      thumbnailUrl: "",
      genreID: "",
      createdByID: ""
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      // Chuẩn bị dữ liệu gửi lên
      const data = {
        ...editGame,
        genre: genres.find(g => g.genreID === editGame.genreID) || null,
        createdBy: devUsers.find(u => u.userID === editGame.createdByID) || null
      };
      if (editGame?.gameID) {
        await axios.put(`http://localhost:8080/api/admin/games/${editGame.gameID}`, data);
        setSnackbar({ open: true, message: "Cập nhật game thành công!", severity: "success" });
      } else {
        await axios.post("http://localhost:8080/api/admin/games", data);
        setSnackbar({ open: true, message: "Thêm game thành công!", severity: "success" });
      }
      setOpenDialog(false);
      fetchGames();
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi lưu game!", severity: "error" });
    }
  };

  const handleHide = async (game) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/games/${game.gameID}/hide`);
      setSnackbar({ open: true, message: "Đã ẩn game!", severity: "success" });
      fetchGames();
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi ẩn game!", severity: "error" });
    }
  };

  const handleShow = async (game) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/games/${game.gameID}/show`);
      setSnackbar({ open: true, message: "Đã hiện game!", severity: "success" });
      fetchGames();
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi hiện game!", severity: "error" });
    }
  };

  // Xử lý upload file ảnh
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://localhost:8080/api/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditGame({ ...editGame, thumbnailUrl: res.data.url });
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi upload ảnh!", severity: "error" });
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>Quản lý game</Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mb: 2 }}>Thêm game</Button>
      <Button variant="outlined" onClick={() => setShowHidden(!showHidden)} sx={{ mb: 2, ml: 2 }}>
        {showHidden ? "Xem game đang hiển thị" : "Xem game đã ẩn"}
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tên game</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>Ảnh</TableCell>
              <TableCell>Thể loại</TableCell>
              <TableCell>Người tạo</TableCell>
              <TableCell>Trạng thái duyệt</TableCell>
              <TableCell>Trạng thái hiển thị</TableCell>
              <TableCell>Ngày tạo</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.map((game) => (
              <TableRow key={game.gameID}>
                <TableCell>{game.gameID}</TableCell>
                <TableCell>{game.title}</TableCell>
                <TableCell>{game.description}</TableCell>
                <TableCell>
                  {game.thumbnailUrl && (
                    <Avatar src={`http://localhost:8080${game.thumbnailUrl}`} variant="rounded" />
                  )}
                </TableCell>
                <TableCell>{game.genreName}</TableCell>
                <TableCell>{game.createdByUsername}</TableCell>
                <TableCell>
                  {game.isApproved === null ? <Chip label="Chờ duyệt" color="warning" /> :
                    game.isApproved ? <Chip label="Đã duyệt" color="success" /> :
                      <Chip label="Từ chối" color="error" />}
                </TableCell>
                <TableCell>
                  {game.isVisible ? <Chip label="Hiển thị" color="success" /> : <Chip label="Đã ẩn" color="default" />}
                </TableCell>
                <TableCell>{game.createdAt?.replace("T", " ").slice(0, 19)}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEdit(game)}><EditIcon /></IconButton>
                  {game.isVisible
                    ? <IconButton color="error" onClick={() => handleHide(game)}><DeleteIcon /></IconButton>
                    : <IconButton color="success" onClick={() => handleShow(game)}><RestoreIcon /></IconButton>
                  }
                </TableCell>
              </TableRow>
            ))}
            {games.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">Không có game nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm/sửa game */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editGame?.gameID ? "Sửa game" : "Thêm game"}</DialogTitle>
        <DialogContent>
          <TextField label="Tên game" value={editGame?.title || ""} onChange={e => setEditGame({ ...editGame, title: e.target.value })} fullWidth margin="normal" />
          <TextField label="Mô tả" value={editGame?.description || ""} onChange={e => setEditGame({ ...editGame, description: e.target.value })} fullWidth margin="normal" multiline minRows={2} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Thể loại</InputLabel>
            <Select
              value={editGame?.genreID || ""}
              label="Thể loại"
              onChange={e => setEditGame({ ...editGame, genreID: e.target.value })}
            >
              {Array.isArray(genres) && genres.map(genre => (
                <MenuItem key={genre.genreID} value={genre.genreID}>{genre.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Người tạo</InputLabel>
            <Select
              value={editGame?.createdByID || ""}
              label="Người tạo"
              onChange={e => setEditGame({ ...editGame, createdByID: e.target.value })}
            >
              {Array.isArray(devUsers) && devUsers.map(user => (
                <MenuItem key={user.userID} value={user.userID}>{user.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ my: 2 }}
          >
            Chọn ảnh
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {editGame?.thumbnailUrl && (
            <Avatar
              src={editGame.thumbnailUrl}
              variant="rounded"
              sx={{ width: 120, height: 120, my: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button onClick={handleSave} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default GameManagementPage; 