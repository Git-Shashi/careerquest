import mongoose from 'mongoose';

const alertConfigSchema = new mongoose.Schema({
  // Alert Configuration
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  
  // Trigger Conditions
  triggers: {
    // Sentiment-based triggers
    negativeSentimentThreshold: {
      type: Number,
      min: -1,
      max: 0,
      default: -0.5
    },
    
    // Volume-based triggers
    mentionVolumeSpike: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 50 }, // % increase
      timeWindow: { type: Number, default: 60 } // minutes
    },
    
    // Engagement-based triggers
    highEngagementThreshold: {
      type: Number,
      default: 1000
    },
    
    // Keyword-based triggers
    criticalKeywords: [String],
    
    // Platform-specific triggers
    platforms: {
      type: [String],
      enum: ['twitter', 'reddit', 'news', 'web'],
      default: ['twitter', 'reddit', 'news', 'web']
    }
  },
  
  // Notification Settings
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      recipients: [String],
      frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily'],
        default: 'immediate'
      }
    },
    
    webhook: {
      enabled: { type: Boolean, default: false },
      url: String,
      headers: Object
    }
  },
  
  // Brand/Keywords to Monitor
  monitoredBrands: [String],
  monitoredKeywords: [String],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  stats: {
    totalTriggered: { type: Number, default: 0 },
    lastTriggered: Date,
    lastChecked: Date
  }
}, {
  timestamps: true
});

// Method to check if alert should trigger
alertConfigSchema.methods.shouldTrigger = function(mention) {
  if (!this.isActive) return false;
  
  // Check platform
  if (!this.triggers.platforms.includes(mention.platform)) return false;
  
  // Check brand/keyword match
  const hasMatchingBrand = this.monitoredBrands.some(brand => 
    mention.brandMentions.includes(brand)
  );
  const hasMatchingKeyword = this.monitoredKeywords.some(keyword =>
    mention.text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!hasMatchingBrand && !hasMatchingKeyword) return false;
  
  // Check sentiment threshold
  if (mention.sentiment.score <= this.triggers.negativeSentimentThreshold) {
    return true;
  }
  
  // Check critical keywords
  if (this.triggers.criticalKeywords.some(keyword =>
    mention.text.toLowerCase().includes(keyword.toLowerCase())
  )) {
    return true;
  }
  
  // Check high engagement
  if (mention.engagementScore >= this.triggers.highEngagementThreshold) {
    return true;
  }
  
  return false;
};

export default mongoose.model('AlertConfig', alertConfigSchema);