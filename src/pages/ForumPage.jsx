import React, { useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, CardMedia, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Avatar, IconButton, Alert, Snackbar
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import ForumPostDetailDialog from "./ForumPostDetailDialog"; // Import file Dialog riêng
import Header from "../components/Header";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "http://localhost:8080";

function ForumPage() {
  const [posts, setPosts] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", imageUrl: "" });
  const [imageFile, setImageFile] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showPendingAlert, setShowPendingAlert] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await axios.get(`${BACKEND_URL}/api/forum/posts`);
    // Lọc chỉ lấy bài đã duyệt (isApproved === true)
    const approvedPosts = res.data.filter(post => post.isApproved === true);
    setPosts(approvedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  // Mở form tạo/sửa
  const handleOpenForm = (post = null) => {
    setEditing(post);
    if (post) {
      setForm({ title: post.title, content: post.content, imageUrl: post.imageUrl });
    } else {
      setForm({ title: "", content: "", imageUrl: "" });
    }
    setImageFile(null);
    setOpenForm(true);
  };

  // Upload ảnh
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const data = new FormData();
      data.append("file", file);
      const res = await axios.post(`${BACKEND_URL}/api/forum/upload`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(f => ({ ...f, imageUrl: res.data.url }));
    }
  };

  // Lưu bài viết
  const handleSave = async () => {
    const headers = { username: user.username };
    if (editing) {
      await axios.put(`${BACKEND_URL}/api/forum/posts/${editing.postID}`, form, { headers });
    } else {
      await axios.post(`${BACKEND_URL}/api/forum/posts`, form, { headers });
      setShowPendingAlert(true);
    }
    setOpenForm(false);
    fetchPosts();
  };

  // Xóa bài viết
  const handleDelete = async (post) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    await axios.delete(`${BACKEND_URL}/api/forum/posts/${post.postID}`, { headers: { username: user.username } });
    fetchPosts();
  };

  // Xem chi tiết bài viết (mở dialog)
  const handleViewDetail = (post) => {
    setSelectedPostId(post.postID);
  };

  // Đóng dialog chi tiết
  const handleCloseDetail = () => {
    setSelectedPostId(null);
  };

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", zIndex: 1200 }}>
        <Header
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold', fontSize: 24 }}>
              <HomeIcon style={{ cursor: 'pointer' }} onClick={() => navigate('/')} />
              Trang chủ
            </span>
          }
        />
      </div>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100vw', mt: 14 }}>
        <Box sx={{ maxWidth: 700, width: '100%', minWidth: 320, mx: 0, px: 2 }}>
          <Typography variant="h4" gutterBottom></Typography>
          <Button variant="contained" onClick={() => handleOpenForm()} sx={{ mb: 2 }}>
            Đăng bài mới
          </Button>
          {posts.map(post => (
            <Card key={post.postID} sx={{ mb: 2, cursor: "pointer" }} onClick={() => handleViewDetail(post)}>
              <CardContent sx={{ display: "flex", alignItems: "center" }}>
                <Avatar sx={{ mr: 2 }}>{post.username[0]?.toUpperCase()}</Avatar>
                <Box>
                  <Typography variant="h6">{post.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {post.username} • {post.createdAt?.replace("T", " ").slice(0, 16)}
                  </Typography>
                </Box>
                {/* Chỉ hiện nút sửa/xóa nếu là chủ bài viết */}
                {user.username === post.username && (
                  <Box sx={{ ml: "auto" }}>
                    <IconButton onClick={e => { e.stopPropagation(); handleOpenForm(post); }}><EditIcon /></IconButton>
                    <IconButton onClick={e => { e.stopPropagation(); handleDelete(post); }}><DeleteIcon /></IconButton>
                  </Box>
                )}
              </CardContent>
              {post.imageUrl && (
                <CardMedia
                  component="img"
                  height="250"
                  image={post.imageUrl.startsWith("http") ? post.imageUrl : BACKEND_URL + post.imageUrl}
                  alt="Ảnh bài viết"
                  sx={{ objectFit: "cover" }}
                />
              )}
              <CardContent>
                <Typography>{post.content}</Typography>
              </CardContent>
            </Card>
          ))}

          {/* Form tạo/sửa bài viết */}
          <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editing ? "Sửa bài viết" : "Đăng bài mới"}</DialogTitle>
            <DialogContent>
              <TextField
                label="Tiêu đề"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                fullWidth
                sx={{ mb: 2, mt: 1 }}
              />
              <TextField
                label="Nội dung"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
                sx={{ mb: 2 }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<AddPhotoAlternateIcon />}
                sx={{ mb: 2 }}
              >
                {form.imageUrl ? "Đổi ảnh" : "Thêm ảnh"}
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </Button>
              {form.imageUrl && (
                <Box sx={{ mb: 2 }}>
                  <img src={form.imageUrl.startsWith("http") ? form.imageUrl : BACKEND_URL + form.imageUrl} alt="Ảnh bài viết" style={{ maxWidth: "100%", maxHeight: 250 }} />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenForm(false)}>Hủy</Button>
              <Button onClick={handleSave} variant="contained">Lưu</Button>
            </DialogActions>
          </Dialog>

          {/* Dialog chi tiết bài viết + bình luận */}
          <ForumPostDetailDialog
            open={!!selectedPostId}
            postId={selectedPostId}
            onClose={handleCloseDetail}
          />
          <Snackbar open={showPendingAlert} autoHideDuration={4000} onClose={() => setShowPendingAlert(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert severity="info" sx={{ width: '100%' }} onClose={() => setShowPendingAlert(false)}>
              Vui lòng chờ Admin duyệt bài !
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </>
  );
}

export default ForumPage;