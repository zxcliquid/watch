const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Создаем модель для комнаты (Room)
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

// Подключаемся к базе данных MongoDB
const dbURI = process.env.MONGO_URI || 'mongodb+srv://daniyar:0000@cluster0.j1faecs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI)
  .then(() => console.log('Подключение к MongoDB успешно!'))
  .catch((err) => console.log('Ошибка подключения к MongoDB:', err));

// Логика обработки подключений через сокеты
io.on("connection", async (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  // Обработчик запроса истории чата
  socket.on("get-chat-history", async ({ roomId }) => {
    let room = await Room.findOne({ roomId });
    if (room) {
      socket.emit("chat-history", room.chat);
    }
  });

  // Подключение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      // Если комнаты нет, создаем новую
      room = new Room({
        roomId,
        users: [{ username, socketId: socket.id }],
        chat: []
      });
      await room.save();
    } else {
      // Если комната существует, добавляем пользователя
      room.users.push({ username, socketId: socket.id });
      await room.save();
    }

    socket.join(roomId);
    io.to(roomId).emit("update-users", room.users);
    // Отправляем историю чата при подключении для тех, кто успевает
    socket.emit("chat-history", room.chat);
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

  // Выход пользователя из комнаты
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
    // Если у вас реализована логика очистки пользователей, убедитесь, что используете корректную структуру.
    // Здесь пример обхода комнат, в которых мог участвовать пользователь
    // (обратите внимание: переменная "rooms" должна быть корректно определена; если её нет, возможно, стоит использовать другие методы)
    // Для простоты можно пропустить очистку в disconnect, если она уже обрабатывается в leave-room.
  });
});

// Запуск сервера
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Сервер работает на порту ${port}`);
});
