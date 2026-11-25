const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
  const state = mongoose.connection.readyState;
  if (state === 1) return mongoose.connection;
  if (state === 2) return mongoose.connection.asPromise();
  connectionPromise = undefined;

  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production.');
  }

  try {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/examflow');
    const conn = await connectionPromise;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    connectionPromise = undefined;
    console.error('[Database] MongoDB connection failed', { name: error.name, code: error.code });
    throw error;
  }
};

module.exports = connectDB;
