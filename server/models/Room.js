const mongoose = require('mongoose');

// Схема для комнаты
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  users: [{ username: String, socketId: String }],
  chat: [
    {
      username: String,
      message: String,
      timestamp: String,
    },
  ],
  videoTime: { type: Number, default: 0 },  // Сохраняем время видео в секундах
});

// Модель для работы с комнатой
const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
