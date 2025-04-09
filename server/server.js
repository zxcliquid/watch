const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://watch-frontend-liard.vercel.app",  // Фронтенд на Vercel
      "http://localhost:5173"  // Локальная разработка
    ],
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // Объект для хранения всех комнат

// Генерация уникального roomId
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 9);  // Генерация уникального roomId
};

// Обработка подключения пользователей
io.on('connection', (socket) => {
  console.log('Новый пользователь подключился:', socket.id);

  // Создание комнаты
  socket.on('create-room', () => {
    const roomId = generateRoomId(); // Генерация уникального ID комнаты
    rooms[roomId] = [];  // Создаём комнату в объекте rooms
    console.log(`Комната с ID ${roomId} создана.`);
    
    socket.emit('room-created', roomId);  // Отправляем обратно ID комнаты
  });

  // Присоединение к комнате
  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      io.to(roomId).emit('user-joined', socket.id);  // Уведомляем остальных пользователей
      console.log(`Пользователь ${socket.id} присоединился к комнате ${roomId}`);
    } else {
      console.log(`Комната с ID ${roomId} не существует.`);
    }
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Запуск сервера
const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
