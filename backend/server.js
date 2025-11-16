import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// route imports
import mentionRoutes from './src/routes/mentionRoutes.js';
import alertRoutes from './src/routes/alertRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import { startDataCollection } from './src/services/dataCollector.js';
import { createErrorHandler } from './src/utils/errors.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rate limiting - don't want to get hammered
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// connect to mongo
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/brandtracker';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/mentions', mentionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);

// get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { default: Mention } = await import('./src/models/Mention.js');
    
    // get all the data we need
    const totalMentions = await Mention.countDocuments();
    const sentimentStats = await Mention.aggregate([
      { $group: { 
        _id: '$sentiment.label', 
        count: { $sum: 1 },
        avgScore: { $avg: '$sentiment.score' }
      }}
    ]);
    const platformStats = await Mention.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } }}
    ]);
    const recentMentions = await Mention.find().sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      totalMentions,
      sentimentStats,
      platformStats,
      recentMentions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Brand Mention Tracker API'
  });
});

// websocket stuff
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// make socket available globally
global.io = io;

// start collecting data
startDataCollection();

// error handling
app.use(createErrorHandler());

// catch all 404s
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

export { app, server, io };
export default { app, server, io };