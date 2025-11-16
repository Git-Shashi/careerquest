import mongoose from 'mongoose';

const mentionSchema = new mongoose.Schema({
  // basic mention info
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  platform: {
    type: String,
    required: true,
    enum: ['twitter', 'reddit', 'news', 'web', 'other']
  },
  url: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  authorProfile: {
    type: String,
    default: null
  },
  
  // timestamps
  publishedAt: {
    type: Date,
    required: true
  },
  collectedAt: {
    type: Date,
    default: Date.now
  },
  
  // AI sentiment analysis results
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  
  // Content Analysis
  keywords: [{
    word: String,
    relevance: Number
  }],
  topics: [String],
  language: {
    type: String,
    default: 'en'
  },
  
  // Engagement Metrics
  engagement: {
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  },
  
  // Brand Information
  brandMentions: [String], // Which brands/keywords triggered this mention
  isDirectMention: {
    type: Boolean,
    default: false
  },
  
  // Processing Status
  processed: {
    type: Boolean,
    default: false
  },
  processingErrors: [String],
  
  // Alert Status
  triggeredAlerts: [{
    alertType: String,
    triggeredAt: Date
  }]
}, {
  timestamps: true,
  indexes: [
    { publishedAt: -1 },
    { platform: 1 },
    { 'sentiment.label': 1 },
    { brandMentions: 1 },
    { collectedAt: -1 }
  ]
});

// Virtual for engagement score calculation
mentionSchema.virtual('engagementScore').get(function() {
  return this.engagement.likes + 
         (this.engagement.shares * 2) + 
         (this.engagement.comments * 1.5) + 
         (this.engagement.views * 0.1);
});

// Method to check if mention is recent
mentionSchema.methods.isRecent = function(hoursThreshold = 24) {
  const now = new Date();
  const threshold = new Date(now - (hoursThreshold * 60 * 60 * 1000));
  return this.publishedAt >= threshold;
};

// Static method to get mentions by sentiment
mentionSchema.statics.getBySentiment = function(sentiment, limit = 50) {
  return this.find({ 'sentiment.label': sentiment })
             .sort({ publishedAt: -1 })
             .limit(limit);
};

// Static method to get trending topics
mentionSchema.statics.getTrendingTopics = function(hoursBack = 24) {
  const cutoff = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
  
  return this.aggregate([
    { $match: { publishedAt: { $gte: cutoff } } },
    { $unwind: '$topics' },
    { $group: { 
      _id: '$topics', 
      count: { $sum: 1 },
      avgSentiment: { $avg: '$sentiment.score' }
    }},
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
};

export default mongoose.model('Mention', mentionSchema);