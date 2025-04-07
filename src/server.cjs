const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('play', (roomId) => {
    console.log(`Play event in room ${roomId}`);
    socket.to(roomId).emit('play');
  });

  socket.on('pause', (roomId) => {
    console.log(`Pause event in room ${roomId}`);
    socket.to(roomId).emit('pause');
  });

  socket.on('seek', ({ roomId, time }) => {
    console.log(`Seek event in room ${roomId} to time ${time}`);
    socket.to(roomId).emit('seek', { time });
  });

  socket.on("loadVideoById", ({ roomId, videoId }) => {
    console.log(`Load video event in room ${roomId} with video ${videoId}`);
    socket.to(roomId).emit("loadVideoById", { videoId });
  });

  socket.on("roomClosed", (roomId) => {
    console.log(`Room ${roomId} has been closed by admin`);
    socket.to(roomId).emit("roomClosed");
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Socket.IO server running on http://localhost:3001');
});