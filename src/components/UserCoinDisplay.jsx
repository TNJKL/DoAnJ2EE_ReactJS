import React, { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (!userCoins) {
    return null;
  }

  return (
    <Box>
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalanceWallet color="primary" />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Số coin hiện tại
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {userCoins.coinAmount.toLocaleString()} coin
            </Typography>
          </Box>
        </Box>
        <IconButton
          color="primary"
          onClick={handleViewTransactions}
          title="Xem lịch sử giao dịch"
        >
          <History />
        </IconButton>
      </Paper>

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

export default UserCoinDisplay; 