const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://watch-frontend-liard.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"]
  }
});

// Подключаемся к базе данных MongoDB
const dbURI = process.env.MONGO_URI || "mongodb+srv://daniyar:0000@cluster0.j1faecs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Подключение к MongoDB успешно!'))
  .catch((error) => console.log('Ошибка подключения к MongoDB:', error));

// Обработка подключений через сокеты
io.on("connection", async (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  // Подключение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      room = new Room({ roomId, users: [{ username, socketId: socket.id }], chat: [] });
      await room.save();
    } else {
      room.users.push({ username, socketId: socket.id });
      await room.save();
    }

    socket.join(roomId);
    io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
    socket.emit("chat-history", room.chat);  // Отправляем историю чата
    socket.emit("video-time", room.videoTime);  // Отправляем время видео при подключении
  });

  // Выход из комнаты
  socket.on("leave-room", async (roomId) => {
    let room = await Room.findOne({ roomId });

    if (room) {
      room.users = room.users.filter(user => user.socketId !== socket.id);
      await room.save();
      io.to(roomId).emit("update-users", room.users);
    }

    socket.leave(roomId);
  });

  // Обработка отправки сообщений
  socket.on("chat-message", async (data) => {
    const { roomId, message, username, timestamp } = data;
    let room = await Room.findOne({ roomId });

    if (room) {
      room.chat.push({ username, message, timestamp });
      await room.save();
      io.to(roomId).emit("chat-message", { username, message, timestamp });
    }
  });

  // Синхронизация времени видео
  socket.on("sync-video-time", async ({ roomId, time }) => {
    let room = await Room.findOne({ roomId });

    if (room) {
      room.videoTime = time;
      await room.save();  // Сохраняем новое время видео
      io.to(roomId).emit("video-time", time);  // Отправляем всем пользователям обновленное время видео
    }
  });

  // Отключение пользователя
  socket.on("disconnect", async () => {
    // Очистка пользователей, которые отключились
    for (let roomId in rooms) {
      let room = await Room.findOne({ roomId });
      if (room) {
        room.users = room.users.filter(user => user.socketId !== socket.id);
        await room.save();
        io.to(roomId).emit("update-users", room.users);
      }
    }
  });
});

// Запуск сервера
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Сервер работает на порту ${port}`);
});
