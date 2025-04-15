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

  // Подключение к комнате
  socket.on("join-room", async ({ roomId, username }) => {
    let room = await Room.findOne({ roomId });

    if (!room) {
      // Если комнаты нет в базе данных, создаем новую
      room = new Room({
        roomId,
        users: [{ username, socketId: socket.id }],
        chat: []
      });
      await room.save();  // Сохраняем в базу данных
    } else {
      // Проверяем, существует ли пользователь в комнате
      const userExists = room.users.some(user => user.username === username);
      
      if (!userExists) {
        // Если пользователя нет, добавляем его в комнату
        room.users.push({ username, socketId: socket.id });
        await room.save();  // Обновляем данные в базе данных
      }
    }

    socket.join(roomId);  // Пользователь присоединился к комнате
    io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
    socket.emit("chat-history", room.chat);  // Отправляем историю чата
  });

  // Обработка отправки сообщений
  socket.on("chat-message", async (data) => {
    const { roomId, message, username, timestamp } = data;
    let room = await Room.findOne({ roomId });

    if (room) {
      room.chat.push({ username, message, timestamp });
      await room.save();  // Сохраняем сообщение в базе данных
      io.to(roomId).emit("chat-message", { username, message, timestamp });  // Отправляем сообщение всем в комнате
    }
  });

  // Выход пользователя из комнаты
  socket.on("leave-room", async (roomId) => {
    let room = await Room.findOne({ roomId });

    if (room) {
      room.users = room.users.filter(user => user.socketId !== socket.id);  // Убираем пользователя из списка
      await room.save();  // Обновляем данные в базе данных
      io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
    }

    socket.leave(roomId);  // Отключаем пользователя от комнаты
  });

  // Отключение пользователя
  socket.on("disconnect", async () => {
    for (let roomId in rooms) {
      let room = await Room.findOne({ roomId });
      if (room) {
        room.users = room.users.filter(user => user.socketId !== socket.id);  // Убираем пользователя из списка
        if (room.users.length === 0) {
          await Room.deleteOne({ roomId });  // Удаляем комнату, если в ней больше нет пользователей
        } else {
          await room.save();  // Сохраняем изменения в базе данных
        }
        io.to(roomId).emit("update-users", room.users);  // Обновляем список пользователей
      }
    }
  });
});

// Запуск сервера
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Сервер работает на порту ${port}`);
});
