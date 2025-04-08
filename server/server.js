const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {  // Используем http-сервер
  cors: {
    origin: "https://watch-frontend-liard.vercel.app/",
    methods: ["GET", "POST"]
  }
});

const users = {}; // { socketId: { username, room } }

const rooms = {};

io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id });
    
    socket.join(roomId);
    io.to(roomId).emit("update-users", rooms[roomId]);
  });

  socket.on("leave-room", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
      io.to(roomId).emit("update-users", rooms[roomId]);
      socket.leave(roomId);
    }
  });

  socket.on("video-action", ({ roomId, action, time }) => {  // Добавлен roomId
    if (rooms[roomId]) {
      io.to(roomId).emit("sync-video", { action, time });
    }
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
        io.to(roomId).emit("update-users", rooms[roomId]);
      }
    }
  });
});

http.listen(5001, () => {  // Запускаем HTTP-сервер
  console.log("Server is running on port 5001");
});