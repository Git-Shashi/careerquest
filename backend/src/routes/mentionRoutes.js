import express from 'express';
import Mention from '../models/Mention.js';

const router = express.Router();

// GET /api/mentions - Get recent mentions with filtering
router.get('/', async (req, res) => {
  try {
    const {
      platform,
      sentiment,
      limit = 50,
      page = 1,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      keywords
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (platform) filter.platform = platform;
    if (sentiment) filter['sentiment.label'] = sentiment;
    
    if (dateFrom || dateTo) {
      filter.publishedAt = {};
      if (dateFrom) filter.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.publishedAt.$lte = new Date(dateTo);
    }
    
    if (keywords) {
      const keywordArray = keywords.split(',');
      filter.$or = keywordArray.map(keyword => ({
        $or: [
          { text: { $regex: keyword, $options: 'i' } },
          { brandMentions: { $in: [keyword] } }
        ]
      }));
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const mentions = await Mention.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Mention.countDocuments(filter);

    res.json({
      mentions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching mentions:', error);
    res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

// GET /api/mentions/stats - Get mention statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate time cutoff
    const now = new Date();
    let cutoff;
    switch (timeframe) {
      case '1h': cutoff = new Date(now - 60 * 60 * 1000); break;
      case '24h': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: cutoff = new Date(now - 24 * 60 * 60 * 1000);
    }

    // Aggregate statistics
    const stats = await Promise.all([
      // Total mentions by sentiment
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 },
          avgScore: { $avg: '$sentiment.score' }
        }}
      ]),
      
      // Mentions by platform
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }}
      ]),
      
      // Hourly mention volume
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' },
            day: { $dayOfMonth: '$publishedAt' },
            hour: { $hour: '$publishedAt' }
          },
          count: { $sum: 1 },
          avgSentiment: { $avg: '$sentiment.score' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]),
      
      // Top keywords/topics
      Mention.getTrendingTopics(timeframe === '24h' ? 24 : 168)
    ]);

    res.json({
      timeframe,
      sentimentBreakdown: stats[0],
      platformBreakdown: stats[1],
      hourlyVolume: stats[2],
      trendingTopics: stats[3],
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/mentions/sentiment-timeline - Get sentiment over time
router.get('/sentiment-timeline', async (req, res) => {
  try {
    const { timeframe = '24h', granularity = 'hour' } = req.query;
    
    // Calculate time cutoff
    const now = new Date();
    let cutoff;
    switch (timeframe) {
      case '24h': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: cutoff = new Date(now - 24 * 60 * 60 * 1000);
    }

    // Build aggregation based on granularity
    let groupBy;
    if (granularity === 'hour') {
      groupBy = {
        year: { $year: '$publishedAt' },
        month: { $month: '$publishedAt' },
        day: { $dayOfMonth: '$publishedAt' },
        hour: { $hour: '$publishedAt' }
      };
    } else if (granularity === 'day') {
      groupBy = {
        year: { $year: '$publishedAt' },
        month: { $month: '$publishedAt' },
        day: { $dayOfMonth: '$publishedAt' }
      };
    }

    const timeline = await Mention.aggregate([
      { $match: { publishedAt: { $gte: cutoff } } },
      { $group: {
        _id: groupBy,
        avgSentiment: { $avg: '$sentiment.score' },
        totalMentions: { $sum: 1 },
        positiveMentions: {
          $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
        },
        negativeMentions: {
          $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
        },
        neutralMentions: {
          $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] }
        }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json({
      timeframe,
      granularity,
      timeline,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching sentiment timeline:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment timeline' });
  }
});

// GET /api/mentions/:id - Get specific mention
router.get('/:id', async (req, res) => {
  try {
    const mention = await Mention.findById(req.params.id);
    
    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    res.json(mention);

  } catch (error) {
    console.error('❌ Error fetching mention:', error);
    res.status(500).json({ error: 'Failed to fetch mention' });
  }
});

// DELETE /api/mentions/:id - Delete specific mention
router.delete('/:id', async (req, res) => {
  try {
    const mention = await Mention.findByIdAndDelete(req.params.id);
    
    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    res.json({ message: 'Mention deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting mention:', error);
    res.status(500).json({ error: 'Failed to delete mention' });
  }
});

export default router;