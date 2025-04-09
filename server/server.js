const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: ["http://localhost:5173", "https://watch-frontend-liard.vercel.app"],
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    console.log(`Пользователь ${username} присоединился к комнате ${roomId}`);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username });
    
    socket.join(roomId);
    io.to(roomId).emit("update-users", rooms[roomId]); // Отправляем список пользователей
  });

  socket.on("video-action", ({ roomId, action, time }) => {
    console.log(`Действие видео: ${action} в комнате ${roomId} на ${time} секунд`);
    if (rooms[roomId]) {
      io.to(roomId).emit("sync-video", { action, time });
    }
  });

  socket.on("chat-message", (data) => {
    console.log("Получено сообщение:", data);
    const { roomId, message, username, timestamp } = data;
    io.to(roomId).emit("chat-message", { username, message, timestamp });
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился:", socket.id);
    for (let roomId in rooms) {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
        io.to(roomId).emit("update-users", rooms[roomId]);
      }
    }
  });
});

// Используем порт из переменной окружения для Render
const port = process.env.PORT || 5001;
http.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
