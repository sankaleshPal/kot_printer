require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory storage
const printers = new Map();
const users = new Map();

// Authentication middleware
io.use((socket, next) => {
  const { password } = socket.handshake.auth;
  if (password === process.env.APP_PASSWORD) {
    users.set(socket.id, { status: 'connected' });
    return next();
  }
  next(new Error('Authentication failed'));
});

// Socket events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Printer registration
  socket.on('register-printer', (printerData, ack) => {
    printers.set(printerData.ip, {
      ...printerData,
      socketId: socket.id,
      status: 'connected'
    });
    ack({ success: true });
  });

  // Print command
  socket.on('print-kot', (data, ack) => {
    const printer = printers.get(data.printerIp);
    if (!printer) return ack({ success: false, error: 'Printer not found' });
    
    socket.to(printer.socketId).emit('print-job', data, (response) => {
      ack(response);
    });
  });

  // Status updates
  socket.on('printer-status', (status) => {
    const printer = Array.from(printers.values())
      .find(p => p.socketId === socket.id);
    if (printer) printer.status = status;
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    Array.from(printers.values())
      .filter(p => p.socketId === socket.id)
      .forEach(p => p.status = 'disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});