const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Room = require('./models/Room');
const cronJobs = require('./cronJobs');

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

const dbURI = process.env.MONGO_URI || 'mongodb+srv://daniyar:0000@cluster0.j1faecs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI)
  .then(() => console.log('Подключение к MongoDB успешно!'))
  .catch((err) => console.log('Ошибка подключения к MongoDB:', err));

io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  // История чата
  socket.on("get-chat-history", async ({ roomId }) => {
    let room = await Room.findOne({ roomId });
    if (room) {
      socket.emit("chat-history", room.chat);
    }
  });

  // Присоединение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      room = new Room({
        roomId,
        users: [{ username, socketId: socket.id }],
        chat: [],
        videoId: "dQw4w9WgXcQ", // по умолчанию
        videoTime: 0
      });
      await room.save();
    } else {
      const userIndex = room.users.findIndex(user => user.username === username);
      if (userIndex === -1) {
        room.users.push({ username, socketId: socket.id });
      } else {
        room.users[userIndex].socketId = socket.id;
      }
      await room.save();
    }

    socket.join(roomId);
    io.to(roomId).emit("update-users", room.users);
    socket.emit("chat-history", room.chat);

    // Отправляем актуальное видео и время подключившемуся
    socket.emit("sync-video", {
      action: "pause",
      time: room.videoTime || 0,
      videoId: room.videoId || "dQw4w9WgXcQ"
    });
  });

  // Сообщения чата
  socket.on("chat-message", async (data) => {
    const { roomId, message, username, timestamp } = data;
    let room = await Room.findOne({ roomId });
    if (room) {
      room.chat.push({ username, message, timestamp });
      await room.save();
      io.to(roomId).emit("chat-message", { username, message, timestamp });
    }
  });

  // Синхронизация видео
  socket.on("sync-video", async ({ roomId, action, time, videoId }) => {
    if (videoId) {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.videoId = videoId;
        room.videoTime = time || 0;
        await room.save();
      }
    }

    socket.to(roomId).emit("sync-video", { action, time, videoId });
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

  // Отключение пользователя
  socket.on("disconnect", async () => {
    const rooms = await Room.find({ "users.socketId": socket.id });
    for (const room of rooms) {
      room.users = room.users.filter(user => user.socketId !== socket.id);
      await room.save();
      io.to(room.roomId).emit("update-users", room.users);
    }
  });
});

const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Сервер работает на порту ${port}`);
});
