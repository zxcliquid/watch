const cron = require('node-cron');
const Room = require('./Room.js'); 

cron.schedule('0 0 * * *', async () => {  
  try {
    const deletedRooms = await Room.deleteMany({ users: { $size: 0 } }); 
    console.log(`${deletedRooms.deletedCount} rooms without users deleted.`);
  } catch (err) {
    console.error('Error cleaning rooms:', err);
  }
});
