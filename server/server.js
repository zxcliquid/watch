const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Импортируем модель для комнаты
const Room = require('./models/Room');

// Создаем сервер
const app = express();
const server = http.createServer(app);

// Создаем подключение для Socket.io
const io = socketIo(server, {
  cors: {
    origin: [
      "https://watch-frontend-liard.vercel.app",  // Указываем фронтенд на Vercel
      "http://localhost:5173"  // Для локальной разработки
    ],
    methods: ["GET", "POST"]
  }
});

// Подключение к MongoDB (замени <username> и <password> на свои реальные данные)
const dbURI = process.env.MONGO_URI || "mongodb://daniyar:0000@ac-jhzkjih-shard-00-00.j1faecs.mongodb.net:27017,ac-jhzkjih-shard-00-01.j1faecs.mongodb.net:27017,ac-jhzkjih-shard-00-02.j1faecs.mongodb.net:27017/watch%20together?replicaSet=atlas-gxho92-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";


mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Подключение к MongoDB успешно!'))
  .catch((error) => console.log('Ошибка подключения к MongoDB:', error));

// Логика обработки подключений через сокеты
io.on("connection", async (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  // Подключение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      // Если комнаты не существует, создаем новую
      room = new Room({ roomId, users: [{ username, socketId: socket.id }], chat: [] });
      await room.save();
    } else {
      // Если комната существует, добавляем пользователя
      room.users.push({ username, socketId: socket.id });
      await room.save();
    }

    socket.join(roomId);
    io.to(roomId).emit("update-users", room.users); // Отправляем список пользователей

    // Отправляем историю чата
    socket.emit("chat-history", room.chat);
  });

  // Выход из комнаты
  socket.on("leave-room", async (roomId) => {
    let room = await Room.findOne({ roomId });

    if (room) {
      room.users = room.users.filter(user => user.socketId !== socket.id);
      await room.save();
      io.to(roomId).emit("update-users", room.users); // Обновляем список пользователей
    }

    socket.leave(roomId);
  });

  // Отправка сообщения в чат
  socket.on("chat-message", async (data) => {
    const { roomId, message, username, timestamp } = data;
    let room = await Room.findOne({ roomId });

    if (room) {
      room.chat.push({ username, message, timestamp });
      await room.save();
      io.to(roomId).emit("chat-message", { username, message, timestamp });
    }
  });

  // Отключение пользователя
  socket.on("disconnect", async () => {
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
