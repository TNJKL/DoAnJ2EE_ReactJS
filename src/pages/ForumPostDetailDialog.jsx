import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, CardContent, CardMedia, Avatar, TextField, Button, IconButton
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const BACKEND_URL = "http://localhost:8080";

function ForumPostDetailDialog({ open, postId, onClose }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentForm, setCommentForm] = useState({ content: "" });
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (open && postId) {
      fetchPost();
      fetchComments();
    }
    // eslint-disable-next-line
  }, [open, postId]);

  const fetchPost = async () => {
    const res = await axios.get(`${BACKEND_URL}/api/forum/posts/${postId}`);
    setPost(res.data);
  };

  const fetchComments = async () => {
    const res = await axios.get(`${BACKEND_URL}/api/forum/posts/${postId}/comments`);
    setComments(res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
  };

  // Thêm bình luận
  const handleAddComment = async () => {
    if (!commentForm.content.trim()) return;
    await axios.post(`${BACKEND_URL}/api/forum/posts/${postId}/comments`, commentForm, {
      headers: { username: user.username }
    });
    setCommentForm({ content: "" });
    fetchComments();
  };

  // Mở dialog sửa bình luận
  const handleOpenEdit = (comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
    setOpenEditDialog(true);
  };

  // Lưu sửa bình luận
  const handleSaveEdit = async () => {
    await axios.put(`${BACKEND_URL}/api/forum/comments/${editingComment.commentID}`, { content: editContent }, {
      headers: { username: user.username }
    });
    setOpenEditDialog(false);
    setEditingComment(null);
    setEditContent("");
    fetchComments();
  };

  // Xóa bình luận
  const handleDeleteComment = async (comment) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bình luận này?")) return;
    await axios.delete(`${BACKEND_URL}/api/forum/comments/${comment.commentID}`, {
      headers: { username: user.username }
    });
    fetchComments();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chi tiết bài viết</DialogTitle>
      <DialogContent>
        {!post ? (
          <Typography>Đang tải...</Typography>
        ) : (
          <Box>
            <CardContent sx={{ display: "flex", alignItems: "center" }}>
              <Avatar sx={{ mr: 2 }}>{post.username[0]?.toUpperCase()}</Avatar>
              <Box>
                <Typography variant="h6">{post.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {post.username} • {post.createdAt?.replace("T", " ").slice(0, 16)}
                </Typography>
              </Box>
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

            {/* Danh sách bình luận */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Bình luận</Typography>
              {comments.map(comment => (
                <Box key={comment.commentID} sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>{comment.username[0]?.toUpperCase()}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{comment.username}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {comment.createdAt?.replace("T", " ").slice(0, 16)}
                    </Typography>
                    <Typography>{comment.content}</Typography>
                  </Box>
                  {user.username === comment.username && (
                    <Box>
                      <IconButton onClick={() => handleOpenEdit(comment)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton onClick={() => handleDeleteComment(comment)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                </Box>
              ))}
              {/* Thêm bình luận */}
              <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                <Avatar sx={{ mr: 2, width: 32, height: 32 }}>{user.username?.[0]?.toUpperCase()}</Avatar>
                <TextField
                  label="Viết bình luận..."
                  value={commentForm.content}
                  onChange={e => setCommentForm({ content: e.target.value })}
                  fullWidth
                  size="small"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                />
                <Button onClick={handleAddComment} variant="contained" sx={{ ml: 2 }}>Gửi</Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>

      {/* Dialog sửa bình luận */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sửa bình luận</DialogTitle>
        <DialogContent>
          <TextField
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveEdit} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default ForumPostDetailDialog;