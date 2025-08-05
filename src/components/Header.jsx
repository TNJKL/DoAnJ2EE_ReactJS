// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// const Header = ({
//   mode = "user",
//   onSearch,
//   title,
// }) => {
//   const [value, setValue] = useState("");
//   const [user, setUser] = useState(() => {
//     const u = localStorage.getItem("user");
//     return u ? JSON.parse(u) : null;
//   });
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Lắng nghe thay đổi localStorage (nếu có nhiều tab)
//     const syncUser = () => {
//       const u = localStorage.getItem("user");
//       setUser(u ? JSON.parse(u) : null);
//     };
//     window.addEventListener("storage", syncUser);
//     return () => window.removeEventListener("storage", syncUser);
//   }, []);

//   const handleInput = (e) => {
//     setValue(e.target.value);
//     if (onSearch) onSearch(e.target.value);
//   };

//   const handleLogin = () => {
//     navigate("/login");
//   };

//   const handleLogout = async () => {
//     try {
//       await fetch("http://localhost:8080/api/auth/logout", {
//         method: "POST",
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
//       });
//     } catch (e) {}
//     localStorage.removeItem("token");
//     localStorage.removeItem("role");
//     localStorage.removeItem("username");
//     localStorage.removeItem("email");
//     localStorage.removeItem("user");
//     setUser(null);
//     navigate("/login");
//   };

//   const handleForum = () => {
//     navigate("/forum");
//   };

//   const isAdmin = mode === "admin";

//   return (
//     <header
//       style={{
//         background: isAdmin ? "#222" : "#1976d2",
//         color: "#fff",
//         padding: "16px 32px",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         borderBottom: isAdmin ? "4px solid #1976d2" : "none",
//         minHeight: 64,
//       }}
//     >
//       <div style={{ display: "flex", alignItems: "center" }}>
//         <div style={{ fontWeight: "bold", fontSize: 24, marginRight: 32 }}>
//           {title || (isAdmin ? "Admin Dashboard" : "Game Portal")}
//         </div>
//         {/* Nút diễn đàn */}
//         {!isAdmin && (
//           <button
//             onClick={handleForum}
//             style={{
//               marginLeft: 8,
//               padding: "6px 16px",
//               borderRadius: 4,
//               border: "none",
//               background: "#fff",
//               color: "#1976d2",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//           >
//             Diễn đàn
//           </button>
//         )}
//       </div>

//       {!isAdmin && onSearch && (
//         <input
//           type="text"
//           placeholder="Tìm kiếm game..."
//           value={value}
//           onChange={handleInput}
//           style={{
//             padding: 8,
//             borderRadius: 4,
//             border: "none",
//             width: 300,
//             marginRight: 24,
//             background: "#fff",
//             color: "#222",
//           }}
//         />
//       )}

//       <div>
//         {user ? (
//           <>
//             Xin chào, <b>{user.username}</b>
//             {isAdmin && <span style={{ marginLeft: 12, fontStyle: "italic" }}>(Admin)</span>}
//             <button
//               onClick={handleLogout}
//               style={{
//                 marginLeft: 16,
//                 padding: "6px 16px",
//                 borderRadius: 4,
//                 border: "none",
//                 background: "#fff",
//                 color: "#1976d2",
//                 cursor: "pointer",
//                 fontWeight: "bold"
//               }}
//             >
//               Đăng xuất
//             </button>
//           </>
//         ) : (
//           <button
//             onClick={handleLogin}
//             style={{
//               padding: "6px 16px",
//               borderRadius: 4,
//               border: "none",
//               background: "#fff",
//               color: "#1976d2",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//           >
//             Đăng nhập
//           </button>
//         )}
//       </div>
//     </header>
//   );
// };

// export default Header;




import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { AccountBalanceWallet, History } from '@mui/icons-material';
import axios from 'axios';

// Component UserCoinDisplay được tích hợp trực tiếp
const UserCoinDisplay = ({ username }) => {
  const [userCoins, setUserCoins] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);

  useEffect(() => {
    if (username) {
      fetchUserCoins();
    }
  }, [username]);

  const fetchUserCoins = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/user/coins/my-coins?username=${username}`);
      setUserCoins(response.data);
    } catch (error) {
      console.error('Error fetching user coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransactions = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/user/coins/my-transactions?username=${username}`);
      setTransactions(response.data);
      setTransactionDialogOpen(true);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case 'admin_add': return 'Admin thêm';
      case 'admin_subtract': return 'Admin trừ';
      case 'bet': return 'Đặt cược';
      case 'win': return 'Thắng cược';
      case 'lose': return 'Thua cược';
      default: return type;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'admin_add':
      case 'win':
        return 'success';
      case 'admin_subtract':
      case 'bet':
      case 'lose':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading || !userCoins) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        background: 'rgba(255,255,255,0.1)',
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <AccountBalanceWallet sx={{ color: '#fff', fontSize: 20 }} />
        <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
          {userCoins.coinAmount.toLocaleString()} coin
        </Typography>
        <IconButton
          size="small"
          onClick={handleViewTransactions}
          sx={{ 
            color: '#fff',
            padding: '2px',
            '&:hover': { background: 'rgba(255,255,255,0.1)' }
          }}
          title="Xem lịch sử giao dịch"
        >
          <History sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Dialog xem lịch sử giao dịch */}
      <Dialog open={transactionDialogOpen} onClose={() => setTransactionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Lịch sử giao dịch coin
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell align="right">Số lượng</TableCell>
                  <TableCell>Số dư sau</TableCell>
                  <TableCell>Mô tả</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">
                        Chưa có giao dịch nào
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.transactionID}>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getTransactionTypeLabel(transaction.transactionType)}
                          color={getTransactionColor(transaction.transactionType)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {transaction.balanceAfter.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {transaction.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Header = ({
  mode = "user",
  onSearch,
  title,
}) => {
  const [value, setValue] = useState("");
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Lắng nghe thay đổi localStorage (nếu có nhiều tab)
    const syncUser = () => {
      const u = localStorage.getItem("user");
      setUser(u ? JSON.parse(u) : null);
    };
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const handleInput = (e) => {
    setValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const handleForum = () => {
    navigate("/forum");
  };

  const isAdmin = mode === "admin";

  return (
    <header
      style={{
        background: isAdmin ? "#222" : "#1976d2",
        color: "#fff",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: isAdmin ? "4px solid #1976d2" : "none",
        minHeight: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ fontWeight: "bold", fontSize: 24, marginRight: 32 }}>
          {title || (isAdmin ? "Admin Dashboard" : "Game Portal")}
        </div>
        {/* Nút diễn đàn */}
        {!isAdmin && (
          <button
            onClick={handleForum}
            style={{
              marginLeft: 8,
              padding: "6px 16px",
              borderRadius: 4,
              border: "none",
              background: "#fff",
              color: "#1976d2",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Diễn đàn
          </button>
        )}
      </div>

      {!isAdmin && onSearch && (
        <input
          type="text"
          placeholder="Tìm kiếm game..."
          value={value}
          onChange={handleInput}
          style={{
            padding: 8,
            borderRadius: 4,
            border: "none",
            width: 300,
            marginRight: 24,
            background: "#fff",
            color: "#222",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Hiển thị coin nếu user đã đăng nhập và không phải admin */}
        {user && !isAdmin && (
          <UserCoinDisplay username={user.username} />
        )}
        
        {user ? (
          <>
            <span>
              Xin chào, <b>{user.username}</b>
              {isAdmin && <span style={{ marginLeft: 12, fontStyle: "italic" }}>(Admin)</span>}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                borderRadius: 4,
                border: "none",
                background: "#fff",
                color: "#1976d2",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            style={{
              padding: "6px 16px",
              borderRadius: 4,
              border: "none",
              background: "#fff",
              color: "#1976d2",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;