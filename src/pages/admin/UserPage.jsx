import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl,
  Snackbar, Alert, TablePagination
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

function UserPage() {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roles, setRoles] = useState(["user", "dev", "admin"]);
  const [form, setForm] = useState({ username: "", email: "", role: "user", password: "" });
  const [formError, setFormError] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    axios.get("http://localhost:8080/api/admin/users")
      .then(res => {
        console.log("Users data:", res.data);
        setUsers(res.data);
      })
      .catch(err => {
        console.error("Error fetching users:", err);
        setSnackbar({ open: true, message: "Lỗi tải danh sách user!", severity: "error" });
      });
  };

  const handleOpenDialog = (user = null) => {
    setEditUser(user);
    setFormError({});
    if (user) {
      setForm({
        username: user.username,
        email: user.email,
                 role: user.roleName || "user",
        password: ""
      });
    } else {
      setForm({ username: "", email: "", role: "user", password: "" });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditUser(null);
    setFormError({});
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Validate form
  const validateForm = () => {
    let err = {};
    if (!form.username.trim()) err.username = "Tên đăng nhập không được để trống";
    if (!form.email.trim()) err.email = "Email không được để trống";
    else if (!/\S+@\S+\.\S+/.test(form.email)) err.email = "Email không hợp lệ";
    if (!form.role) err.role = "Role không được để trống";
    if (!editUser && !form.password) err.password = "Mật khẩu không được để trống";
    return err;
  };

  const handleSave = async () => {
    const err = validateForm();
    setFormError(err);
    if (Object.keys(err).length > 0) return;

    try {
      if (editUser) {
        // Sửa user
        await axios.put(`http://localhost:8080/api/admin/users/${editUser.userID}`, form);
        setSnackbar({ open: true, message: "Cập nhật user thành công!", severity: "success" });
      } else {
        // Thêm user
        await axios.post("http://localhost:8080/api/admin/users", form);
        setSnackbar({ open: true, message: "Thêm user thành công!", severity: "success" });
      }
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data || "Lỗi thao tác!", severity: "error" });
    }
  };

  const handleDelete = async (userID) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa user này?")) {
      try {
        await axios.delete(`http://localhost:8080/api/admin/users/${userID}`);
        setSnackbar({ open: true, message: "Xóa user thành công!", severity: "success" });
        fetchUsers();
      } catch (err) {
        setSnackbar({ open: true, message: err.response?.data || "Lỗi thao tác!", severity: "error" });
      }
    }
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom>
        Quản lý người dùng
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        sx={{ mb: 2 }}
        onClick={() => handleOpenDialog()}
      >
        Thêm user
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Coin</TableCell>
              <TableCell>Ngày tạo</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
              <TableRow key={user.userID}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                                 <TableCell>{user.roleName}</TableCell>
                 <TableCell>{user.coinAmount || 0}</TableCell>
                <TableCell>{user.createdAt ? user.createdAt.replace("T", " ").slice(0, 19) : ""}</TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpenDialog(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(user.userID)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Không có user nào</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={users.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20]}
        />
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editUser ? "Sửa user" : "Thêm user"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên đăng nhập"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
            margin="normal"
            error={!!formError.username}
            helperText={formError.username}
          />
          <TextField
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            error={!!formError.email}
            helperText={formError.email}
          />
          <FormControl fullWidth margin="normal" error={!!formError.role}>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={form.role}
              label="Role"
              onChange={handleChange}
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
            {formError.role && <Typography color="error" variant="caption">{formError.role}</Typography>}
          </FormControl>
          <TextField
            label="Mật khẩu"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            fullWidth
            margin="normal"
            error={!!formError.password}
            helperText={formError.password || (editUser ? "Để trống nếu không đổi" : "")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
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

export default UserPage; 