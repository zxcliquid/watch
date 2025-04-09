const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: [
      "https://watch-frontend-liard.vercel.app",  // Указываем фронтенд на Vercel
      "http://localhost:5173"  // Для локальной разработки
    ],
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username });
    
    socket.join(roomId);
    io.to(roomId).emit("update-users", rooms[roomId]); // Отправляем список пользователей
  });

  socket.on("leave-room", (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
      io.to(roomId).emit("update-users", rooms[roomId]);
      socket.leave(roomId);
    }
  });

  socket.on("video-action", ({ roomId, action, time }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("sync-video", { action, time });
    }
  });

  socket.on("chat-message", (data) => {
    const { roomId, message, username, timestamp } = data;
    io.to(roomId).emit("chat-message", { username, message, timestamp });
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

const port = process.env.PORT || 5001;
http.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
