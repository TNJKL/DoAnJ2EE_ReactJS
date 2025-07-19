import React, { useEffect, useState, useRef } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip
} from "@mui/material";
import { Add, Edit, Delete, CloudUpload, Visibility, Download } from "@mui/icons-material";
import axios from "axios";
import Header from "../components/Header";

const API_URL = "http://localhost:8080/api/dev/submissions";
const UPLOAD_URL = "http://localhost:8080/api/dev/upload";
const BACKEND_URL = "http://localhost:8080"; // Thêm dòng này

function DevSubmissionPage() {
  const [submissions, setSubmissions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    file: null,
    fileUrl: "",
    description: "",
    adminNote: "",
  });
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef();

  // Lấy user từ localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Hàm headers chung cho mọi request dev
  const getDevHeaders = () => ({
    username: user.username || "",
  });

  // Lấy danh sách submission của dev hiện tại
  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: getDevHeaders()
      });
      setSubmissions(res.data);
    } catch (e) {
      alert("Không lấy được danh sách submission!");
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line
  }, []);

  // Xử lý mở dialog thêm/sửa
  const handleOpenDialog = (row = null) => {
    setEditing(row);
    if (row) {
      setForm({
        file: null,
        fileUrl: row.fileUrl,
        description: row.description,
        adminNote: row.adminNote || "",
      });
    } else {
      setForm({
        file: null,
        fileUrl: "",
        description: "",
        adminNote: "",
      });
    }
    setOpenDialog(true);
  };

  // Xử lý upload file
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setForm((f) => ({ ...f, file }));
    if (file) {
      // Upload file lên server
      const data = new FormData();
      data.append("file", file);
      try {
        const res = await axios.post(UPLOAD_URL, data, {
          headers: { ...getDevHeaders(), "Content-Type": "multipart/form-data" }
        });
        setForm((f) => ({ ...f, fileUrl: res.data.url }));
      } catch (e) {
        alert("Upload file thất bại!");
      }
    }
  };

  // Xử lý lưu (thêm/sửa)
  const handleSave = async () => {
    // Khi thêm/sửa chỉ gửi fileUrl, description
    const payload = {
      fileUrl: form.fileUrl,
      description: form.description,
    };
    try {
      if (editing) {
        await axios.put(`${API_URL}/${editing.submissionID}`, payload, {
          headers: getDevHeaders()
        });
      } else {
        await axios.post(API_URL, payload, {
          headers: getDevHeaders()
        });
      }
      setOpenDialog(false);
      fetchSubmissions();
    } catch (e) {
      alert("Lưu thất bại!");
    }
  };

  // Xử lý xóa
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: getDevHeaders()
      });
      fetchSubmissions();
    } catch (e) {
      alert("Xóa thất bại!");
    }
  };

  // Xem trước file (đã sửa: luôn nối domain backend nếu thiếu)
  const handlePreview = (url) => {
    const fullUrl = url.startsWith("http") ? url : BACKEND_URL + url;
    setFilePreview(fullUrl);
  };

  // Tải file (đã sửa: luôn nối domain backend nếu thiếu)
  const handleDownload = (url) => {
    const fullUrl = url.startsWith("http") ? url : BACKEND_URL + url;
    window.open(fullUrl, "_blank");
  };

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", zIndex: 1200 }}>
        <Header />
      </div>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)', marginTop: '200px', justifyContent: 'flex-start', width: '100vw' }}>
        <Box sx={{ maxWidth: 900, minWidth: 320, width: '100%', boxShadow: 3, borderRadius: 2, bgcolor: '#fff', p: 3 }}>
          <Typography variant="h5" gutterBottom>Quản lý file gửi lên (Developer)</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ mb: 2 }}
            onClick={() => handleOpenDialog()}
          >
            Thêm submission
          </Button>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Người gửi</TableCell>
                  <TableCell>File gửi</TableCell>
                  <TableCell>Mô tả</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ghi chú Admin</TableCell>
                  <TableCell>Ngày đăng</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((row) => (
                  <TableRow key={row.submissionID}>
                    <TableCell>{row.developerUsername}</TableCell>
                    <TableCell>
                      <Tooltip title="Xem trước">
                        <IconButton onClick={() => handlePreview(row.fileUrl)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Tải về">
                        <IconButton onClick={() => handleDownload(row.fileUrl)}>
                          <Download />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.adminNote}</TableCell>
                    <TableCell>{row.submittedAt?.replace('T', ' ').slice(0, 19)}</TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => handleOpenDialog(row)}>
                        <Edit />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(row.submissionID)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {submissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Chưa có submission nào</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Dialog thêm/sửa */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editing ? "Sửa submission" : "Thêm submission"}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                >
                  {form.fileUrl ? "Đổi file" : "Chọn file"}
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    hidden
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </Button>
                {form.fileUrl && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>File đã chọn: <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">{form.fileUrl.split('/').pop()}</a></Typography>
                    <Button size="small" onClick={() => handlePreview(form.fileUrl)}>Xem trước</Button>
                    <Button size="small" onClick={() => handleDownload(form.fileUrl)}>Tải về</Button>
                  </Box>
                )}
                <TextField
                  label="Mô tả"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Ghi chú Admin"
                  value={form.adminNote}
                  onChange={e => setForm(f => ({ ...f, adminNote: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={1}
                  disabled
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
              <Button onClick={handleSave} variant="contained">Lưu</Button>
            </DialogActions>
          </Dialog>

          {/* Xem trước file */}
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
        </Box>
      </Box>
    </>
  );
}

export default DevSubmissionPage;