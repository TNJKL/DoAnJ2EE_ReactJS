import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

const BACKEND_URL = "http://localhost:8080";

function GameApprovalPage() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [reasonDialog, setReasonDialog] = useState({ open: false, reason: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: "", submission: null });
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = () => {
    axios.get("http://localhost:8080/api/admin/game-submissions")
      .then(res => setSubmissions(res.data));
  };

  const handleApproveClick = (submission) => {
    setConfirmDialog({ open: true, type: "approve", submission });
  };

  const handleRejectClick = (submission) => {
    setConfirmDialog({ open: true, type: "reject", submission });
  };

  const handleConfirm = async () => {
    if (confirmDialog.type === "approve") {
      await handleApprove(confirmDialog.submission.submissionID);
      setConfirmDialog({ open: false, type: "", submission: null });
    } else if (confirmDialog.type === "reject") {
      setSelectedSubmission(confirmDialog.submission);
      setOpenRejectDialog(true);
      setConfirmDialog({ open: false, type: "", submission: null });
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDialog({ open: false, type: "", submission: null });
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/game-submissions/${id}/approve`);
      setSnackbar({ open: true, message: "Duyệt game thành công!", severity: "success" });
      fetchSubmissions();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data || "Lỗi duyệt game!", severity: "error" });
    }
  };

  const handleReject = async () => {
    try {
      await axios.put(`http://localhost:8080/api/admin/game-submissions/${selectedSubmission.submissionID}/reject`, { adminNote: rejectReason });
      setSnackbar({ open: true, message: "Từ chối game thành công!", severity: "success" });
      setOpenRejectDialog(false);
      setRejectReason("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data || "Lỗi từ chối game!", severity: "error" });
    }
  };

  const handleCloseRejectDialog = () => {
    setOpenRejectDialog(false);
    setSelectedSubmission(null);
    setRejectReason("");
  };

  const handleOpenReasonDialog = (reason) => {
    setReasonDialog({ open: true, reason });
  };

  const handleCloseReasonDialog = () => {
    setReasonDialog({ open: false, reason: "" });
  };

  // Xem trước file (luôn nối domain backend nếu thiếu)
  const handlePreview = (url) => {
    const fullUrl = url.startsWith("http") ? url : BACKEND_URL + url;
    setFilePreview(fullUrl);
  };

  // Tải file (luôn nối domain backend nếu thiếu)
  const handleDownload = (url) => {
    const fullUrl = url.startsWith("http") ? url : BACKEND_URL + url;
    window.open(fullUrl, "_blank");
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Duyệt game (file dev gửi lên)
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Dev</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày gửi</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((sub) => (
              <TableRow key={sub.submissionID}>
                <TableCell>{sub.developer?.username}</TableCell>
                <TableCell>{sub.description}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<VisibilityIcon />}
                    onClick={() => handlePreview(sub.fileUrl)}
                    size="small"
                  >
                    Xem trước
                  </Button>
                  <Button
                    onClick={() => handleDownload(sub.fileUrl)}
                    size="small"
                  >
                    Tải về
                  </Button>
                </TableCell>
                <TableCell>
                  {sub.status === "Approved" ? "Đã duyệt" : sub.status === "Rejected" ? "Từ chối" : "Chờ duyệt"}
                </TableCell>
                <TableCell>{sub.submittedAt ? sub.submittedAt.replace("T", " ").slice(0, 19) : ""}</TableCell>
                <TableCell align="right">
                  {sub.status && sub.status.toLowerCase() === "pending" ? (
                    <>
                      <IconButton color="success" onClick={() => handleApproveClick(sub)}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleRejectClick(sub)}>
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : sub.status && sub.status.toLowerCase() === "approved" ? (
                    <Box sx={{ color: "green", display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckIcon fontSize="small" /> Đã duyệt
                    </Box>
                  ) : sub.status && sub.status.toLowerCase() === "rejected" ? (
                    <Box sx={{ color: "red", display: "flex", alignItems: "center", gap: 1 }}>
                      <CloseIcon fontSize="small" /> Đã từ chối
                      {sub.adminNote && (
                        <span
                          style={{ marginLeft: 8, cursor: "pointer", color: "#888", textDecoration: "underline" }}
                          onClick={() => handleOpenReasonDialog(sub.adminNote)}
                        >
                          (Lý do)
                        </span>
                      )}
                    </Box>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Không có submission nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog xác nhận duyệt/từ chối */}
      <Dialog open={confirmDialog.open} onClose={handleCancelConfirm}>
        <DialogTitle>
          {confirmDialog.type === "approve" ? "Xác nhận duyệt game" : "Xác nhận từ chối game"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.type === "approve"
              ? "Bạn có chắc chắn muốn DUYỆT game này không?"
              : "Bạn có chắc chắn muốn TỪ CHỐI game này không?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm}>Hủy</Button>
          <Button onClick={handleConfirm} variant="contained" color={confirmDialog.type === "approve" ? "success" : "error"}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog nhập lý do từ chối */}
      <Dialog open={openRejectDialog} onClose={handleCloseRejectDialog}>
        <DialogTitle>Lý do từ chối game</DialogTitle>
        <DialogContent>
          <TextField
            label="Lý do"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>Hủy</Button>
          <Button onClick={handleReject} variant="contained" color="error">Từ chối</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xem lý do từ chối */}
      <Dialog open={reasonDialog.open} onClose={handleCloseReasonDialog}>
        <DialogTitle>Lý do từ chối</DialogTitle>
        <DialogContent>
          <Typography>{reasonDialog.reason}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReasonDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xem trước file */}
      <Dialog open={!!filePreview} onClose={() => setFilePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>Xem trước file</DialogTitle>
        <DialogContent>
          {filePreview && (
            <>
              {filePreview.endsWith(".pdf") ? (
                <iframe src={filePreview} title="PDF Preview" width="100%" height="500px" />
              ) : filePreview.endsWith(".txt") ? (
                <iframe src={filePreview} title="Text Preview" width="100%" height="500px" />
              ) : (
                <Typography>Không hỗ trợ xem trước định dạng này. <a href={filePreview} target="_blank" rel="noopener noreferrer">Tải về</a></Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilePreview(null)}>Đóng</Button>
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

export default GameApprovalPage;