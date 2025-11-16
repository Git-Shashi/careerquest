import express from 'express';
import Mention from '../models/Mention.js';

const router = express.Router();

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', async (req, res) => {
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

    // Run all analytics queries in parallel
    const [
      totalMentions,
      sentimentStats,
      platformStats,
      topKeywords,
      recentMentions,
      sentimentTrend
    ] = await Promise.all([
      // Total mentions count
      Mention.countDocuments({ publishedAt: { $gte: cutoff } }),
      
      // Sentiment breakdown
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: '$sentiment.label',
          count: { $sum: 1 },
          avgScore: { $avg: '$sentiment.score' },
          avgConfidence: { $avg: '$sentiment.confidence' }
        }}
      ]),
      
      // Platform breakdown
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: '$platform',
          count: { $sum: 1 },
          avgSentiment: { $avg: '$sentiment.score' },
          totalEngagement: { $sum: {
            $add: [
              '$engagement.likes',
              { $multiply: ['$engagement.shares', 2] },
              { $multiply: ['$engagement.comments', 1.5] }
            ]
          }}
        }}
      ]),
      
      // Top keywords
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $unwind: '$keywords' },
        { $group: {
          _id: '$keywords.word',
          count: { $sum: 1 },
          avgRelevance: { $avg: '$keywords.relevance' },
          avgSentiment: { $avg: '$sentiment.score' }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Recent mentions (last 5)
      Mention.find({ publishedAt: { $gte: cutoff } })
        .sort({ publishedAt: -1 })
        .limit(5)
        .select('text platform author sentiment publishedAt engagement url')
        .lean(),
      
      // Sentiment trend (hourly for 24h, daily for longer periods)
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: timeframe === '24h' || timeframe === '1h' ? {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' },
            day: { $dayOfMonth: '$publishedAt' },
            hour: { $hour: '$publishedAt' }
          } : {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' },
            day: { $dayOfMonth: '$publishedAt' }
          },
          avgSentiment: { $avg: '$sentiment.score' },
          mentionCount: { $sum: 1 }
        }},
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculate sentiment distribution percentages
    const sentimentDistribution = {
      positive: 0,
      negative: 0,
      neutral: 0
    };

    sentimentStats.forEach(stat => {
      sentimentDistribution[stat._id] = (stat.count / totalMentions * 100) || 0;
    });

    // Calculate overall sentiment score
    const overallSentiment = sentimentStats.reduce((acc, stat) => {
      return acc + (stat.avgScore * stat.count);
    }, 0) / totalMentions || 0;

    // Format response
    const analytics = {
      timeframe,
      summary: {
        totalMentions,
        overallSentiment: Math.round(overallSentiment * 100) / 100,
        sentimentDistribution,
        mostActivePlatform: platformStats.reduce((prev, current) => 
          (prev.count > current.count) ? prev : current
        )?._id || 'N/A'
      },
      sentimentStats: sentimentStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          percentage: Math.round((stat.count / totalMentions) * 100) || 0,
          avgScore: Math.round(stat.avgScore * 100) / 100,
          avgConfidence: Math.round(stat.avgConfidence * 100) / 100
        };
        return acc;
      }, {}),
      platformStats,
      topKeywords,
      recentMentions,
      sentimentTrend: sentimentTrend.map(point => ({
        timestamp: point._id,
        sentiment: Math.round(point.avgSentiment * 100) / 100,
        mentions: point.mentionCount
      })),
      generatedAt: new Date().toISOString()
    };

    res.json(analytics);

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/engagement - Get engagement analytics
router.get('/engagement', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate time cutoff
    const now = new Date();
    let cutoff;
    switch (timeframe) {
      case '24h': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: cutoff = new Date(now - 24 * 60 * 60 * 1000);
    }

    const engagementStats = await Mention.aggregate([
      { $match: { publishedAt: { $gte: cutoff } } },
      { $group: {
        _id: '$platform',
        totalLikes: { $sum: '$engagement.likes' },
        totalShares: { $sum: '$engagement.shares' },
        totalComments: { $sum: '$engagement.comments' },
        totalViews: { $sum: '$engagement.views' },
        avgLikes: { $avg: '$engagement.likes' },
        avgShares: { $avg: '$engagement.shares' },
        avgComments: { $avg: '$engagement.comments' },
        topMention: { $max: {
          $add: [
            '$engagement.likes',
            { $multiply: ['$engagement.shares', 2] },
            '$engagement.comments'
          ]
        }},
        mentionCount: { $sum: 1 }
      }}
    ]);

    // Get top performing mentions
    const topMentions = await Mention.find({ publishedAt: { $gte: cutoff } })
      .sort({
        'engagement.likes': -1,
        'engagement.shares': -1,
        'engagement.comments': -1
      })
      .limit(10)
      .select('text platform author sentiment engagement url publishedAt')
      .lean();

    res.json({
      timeframe,
      engagementByPlatform: engagementStats,
      topMentions,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching engagement analytics:', error);
    res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
});

// GET /api/analytics/trends - Get trending analysis
router.get('/trends', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Calculate time cutoff
    const now = new Date();
    let cutoff;
    switch (timeframe) {
      case '24h': cutoff = new Date(now - 24 * 60 * 60 * 1000); break;
      case '7d': cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
      default: cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const [trendingTopics, sentimentTrends, volumeTrends] = await Promise.all([
      // Trending topics with sentiment
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $unwind: '$topics' },
        { $group: {
          _id: '$topics',
          count: { $sum: 1 },
          avgSentiment: { $avg: '$sentiment.score' },
          platforms: { $addToSet: '$platform' },
          recentMentions: { $push: {
            text: { $substr: ['$text', 0, 100] },
            platform: '$platform',
            sentiment: '$sentiment.label',
            publishedAt: '$publishedAt'
          }}
        }},
        { $project: {
          count: 1,
          avgSentiment: 1,
          platforms: 1,
          recentMentions: { $slice: ['$recentMentions', 3] }
        }},
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      
      // Sentiment trends over time
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: {
            date: { $dateToString: { 
              format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$publishedAt'
            }},
            sentiment: '$sentiment.label'
          },
          count: { $sum: 1 }
        }},
        { $group: {
          _id: '$_id.date',
          sentiments: { $push: {
            label: '$_id.sentiment',
            count: '$count'
          }},
          totalMentions: { $sum: '$count' }
        }},
        { $sort: { '_id': 1 } }
      ]),
      
      // Volume trends
      Mention.aggregate([
        { $match: { publishedAt: { $gte: cutoff } } },
        { $group: {
          _id: { $dateToString: { 
            format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
            date: '$publishedAt'
          }},
          count: { $sum: 1 },
          avgSentiment: { $avg: '$sentiment.score' },
          platforms: { $addToSet: '$platform' }
        }},
        { $sort: { '_id': 1 } }
      ])
    ]);

    res.json({
      timeframe,
      trendingTopics,
      sentimentTrends,
      volumeTrends,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

export default router;