import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Tabs, Tab
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

function PostApprovalPage() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [openContentDialog, setOpenContentDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: "", post: null });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, [tab]);

  const fetchPosts = () => {
    let url = "";
    if (tab === 0) url = "http://localhost:8080/api/admin/forum-posts/pending";
    else if (tab === 1) url = "http://localhost:8080/api/admin/forum-posts/approved";
    else if (tab === 2) url = "http://localhost:8080/api/admin/forum-posts/rejected";
    
    axios.get(url)
      .then(res => {
        console.log("Posts data:", res.data);
        console.log("URL:", url);
        console.log("Tab:", tab);
        // Đảm bảo luôn là mảng
        if (Array.isArray(res.data)) {
          setPosts(res.data);
          console.log("Posts count:", res.data.length);
        } else {
          console.log("Response is not array:", typeof res.data);
          setPosts([]);
        }
      })
      .catch(err => {
        console.error("Error fetching posts:", err);
        setPosts([]);
        setSnackbar({ open: true, message: "Lỗi tải danh sách bài viết!", severity: "error" });
      });
  };

  const handleApproveClick = (post) => {
    setConfirmDialog({ open: true, type: "approve", post });
  };

  const handleRejectClick = (post) => {
    setConfirmDialog({ open: true, type: "reject", post });
  };

  const handleConfirm = async () => {
    if (confirmDialog.type === "approve") {
      await handleApprove(confirmDialog.post.postID);
      setConfirmDialog({ open: false, type: "", post: null });
    } else if (confirmDialog.type === "reject") {
      await handleReject(confirmDialog.post.postID);
      setConfirmDialog({ open: false, type: "", post: null });
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDialog({ open: false, type: "", post: null });
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/forum-posts/${id}/approve`);
      setSnackbar({ open: true, message: "Duyệt bài viết thành công!", severity: "success" });
      fetchPosts(); // Refresh lại danh sách thay vì chuyển tab
    } catch (err) {
      let errorMsg = "Lỗi duyệt bài viết!";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === "object" && err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }
      setSnackbar({ open: true, message: errorMsg, severity: "error" });
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/forum-posts/${id}/reject`);
      setSnackbar({ open: true, message: "Từ chối bài viết thành công!", severity: "success" });
      fetchPosts(); // Refresh lại danh sách thay vì chuyển tab
    } catch (err) {
      let errorMsg = "Lỗi từ chối bài viết!";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMsg = err.response.data;
        } else if (typeof err.response.data === "object" && err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }
      setSnackbar({ open: true, message: errorMsg, severity: "error" });
    }
  };

  const handleOpenContentDialog = (post) => {
    setSelectedPost(post);
    setOpenContentDialog(true);
  };

  const handleCloseContentDialog = () => {
    setOpenContentDialog(false);
    setSelectedPost(null);
  };

  const getStatusText = (isApproved) => {
    if (isApproved === null || isApproved === undefined) return "Chờ duyệt";
    if (isApproved === true) return "Đã duyệt";
    if (isApproved === false) return "Từ chối";
    return "Chờ duyệt";
  };

  const canShowActions = (post) => {
    if (tab === 0) {
      return post.isApproved === null || post.isApproved === undefined;
    }
    return false;
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Duyệt bài viết diễn đàn
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Chờ duyệt" />
        <Tab label="Đã duyệt" />
        <Tab label="Từ chối" />
      </Tabs>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Người đăng</TableCell>
              <TableCell>Tiêu đề</TableCell>
              <TableCell>Nội dung</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày đăng</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.postID}>
                <TableCell>{post.username || post.user?.username || post.author?.username || "Unknown"}</TableCell>
                <TableCell>{post.title}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenContentDialog(post)}>
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
                <TableCell>
                  {getStatusText(post.isApproved)}
                </TableCell>
                <TableCell>{post.createdAt ? post.createdAt.replace("T", " ").slice(0, 19) : ""}</TableCell>
                <TableCell align="right">
                  {canShowActions(post) ? (
                    <>
                      <IconButton color="success" onClick={() => handleApproveClick(post)}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleRejectClick(post)}>
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : post.isApproved === true ? (
                    <Box sx={{ color: "green", display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckIcon fontSize="small" /> Đã duyệt
                    </Box>
                  ) : post.isApproved === false ? (
                    <Box sx={{ color: "red", display: "flex", alignItems: "center", gap: 1 }}>
                      <CloseIcon fontSize="small" /> Đã từ chối
                    </Box>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Không có bài viết nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog xác nhận duyệt/từ chối */}
      <Dialog open={confirmDialog.open} onClose={handleCancelConfirm}>
        <DialogTitle>
          {confirmDialog.type === "approve" ? "Xác nhận duyệt bài viết" : "Xác nhận từ chối bài viết"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.type === "approve"
              ? "Bạn có chắc chắn muốn DUYỆT bài viết này không?"
              : "Bạn có chắc chắn muốn TỪ CHỐI bài viết này không?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm}>Hủy</Button>
          <Button onClick={handleConfirm} variant="contained" color={confirmDialog.type === "approve" ? "success" : "error"}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xem nội dung bài viết */}
      <Dialog open={openContentDialog} onClose={handleCloseContentDialog} maxWidth="md" fullWidth>
        <DialogTitle>Nội dung bài viết</DialogTitle>
        <DialogContent>
          <Typography variant="h6">{selectedPost?.title}</Typography>
          <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{selectedPost?.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContentDialog}>Đóng</Button>
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

export default PostApprovalPage; 