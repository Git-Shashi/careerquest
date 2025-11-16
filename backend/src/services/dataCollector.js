import axios from 'axios';
import cron from 'node-cron';
import Mention from '../models/Mention.js';
import sentimentService from './sentimentService.js';

class TwitterCollector {
  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.baseUrl = 'https://api.twitter.com/2';
  }

  async collectMentions(companyData = [
    { account: 'RapidQuest', brands: ['RapidQuest', 'Rapid Quest'] },
    { account: 'YourCompany', brands: ['YourCompany', 'Your Company'] }
  ]) {
    if (!this.bearerToken) {
      console.log('⚠️  Twitter Bearer Token not configured');
      return [];
    }

    try {
      // Build comprehensive query for brand monitoring
      const queryParts = [];
      
      companyData.forEach(company => {
        // Posts FROM company official account
        queryParts.push(`from:${company.account}`);
        
        // Mentions OF company (@company)
        queryParts.push(`@${company.account}`);
        
        // Brand name mentions (with quotes for exact match)
        company.brands.forEach(brand => {
          queryParts.push(`"${brand}"`);
        });
      });
      
      const query = queryParts.join(' OR ');
      console.log(`🐦 Twitter Query: ${query}`);
      
      const params = {
        query: query,
        'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
        'user.fields': 'username,name,public_metrics,verified',
        'expansions': 'author_id',
        max_results: 50
      };

      const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        },
        params
      });

      const tweets = response.data.data || [];
      const users = response.data.includes?.users || [];
      
      return tweets.map(tweet => {
        const author = users.find(u => u.id === tweet.author_id);
        
        // Determine mention type and extract brand mentions
        const mentionType = this.determineMentionType(tweet, author, companyData);
        const brandMentions = this.extractBrandMentions(tweet.text, companyData);
        
        return {
          text: tweet.text,
          platform: 'twitter',
          url: `https://twitter.com/i/status/${tweet.id}`,
          author: author?.username || 'unknown',
          authorProfile: author ? `https://twitter.com/${author.username}` : null,
          publishedAt: new Date(tweet.created_at),
          engagement: {
            likes: tweet.public_metrics?.like_count || 0,
            shares: tweet.public_metrics?.retweet_count || 0,
            comments: tweet.public_metrics?.reply_count || 0,
            views: tweet.public_metrics?.impression_count || 0
          },
          brandMentions,
          mentionType, // 'official', 'mention', 'brand_discussion'
          isFromCompany: mentionType === 'official',
          companyEngagement: author?.verified || false
        };
      });
    } catch (error) {
      console.error('❌ Twitter collection error:', error.response?.data || error.message);
      return [];
    }
  }

  determineMentionType(tweet, author, companyData) {
    // Check if it's from an official company account
    const isOfficialAccount = companyData.some(company => 
      author?.username?.toLowerCase() === company.account.toLowerCase()
    );
    
    if (isOfficialAccount) {
      return 'official';
    }
    
    // Check if it's a direct mention (@company)
    const hasDirectMention = companyData.some(company =>
      tweet.text.includes(`@${company.account}`)
    );
    
    if (hasDirectMention) {
      return 'mention';
    }
    
    // Otherwise it's brand discussion
    return 'brand_discussion';
  }
  
  extractBrandMentions(text, companyData) {
    const mentions = [];
    const lowerText = text.toLowerCase();
    
    companyData.forEach(company => {
      // Check account mentions
      if (lowerText.includes(`@${company.account.toLowerCase()}`)) {
        mentions.push(`@${company.account}`);
      }
      
      // Check brand name mentions
      company.brands.forEach(brand => {
        if (lowerText.includes(brand.toLowerCase())) {
          mentions.push(brand);
        }
      });
    });
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  async getCompanyTimeline(username, maxResults = 10) {
    if (!this.bearerToken) {
      console.log('⚠️  Twitter Bearer Token not configured');
      return [];
    }

    try {
      // First get user ID by username
      const userResponse = await axios.get(`${this.baseUrl}/users/by/username/${username}`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        },
        params: {
          'user.fields': 'id,username,name,public_metrics,verified'
        }
      });

      const userId = userResponse.data.data.id;
      const userInfo = userResponse.data.data;

      // Get user's timeline
      const timelineResponse = await axios.get(`${this.baseUrl}/users/${userId}/tweets`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        },
        params: {
          'tweet.fields': 'created_at,public_metrics,context_annotations',
          max_results: maxResults
        }
      });

      const tweets = timelineResponse.data.data || [];
      
      return tweets.map(tweet => ({
        text: tweet.text,
        platform: 'twitter',
        url: `https://twitter.com/${userInfo.username}/status/${tweet.id}`,
        author: userInfo.username,
        authorProfile: `https://twitter.com/${userInfo.username}`,
        isCompanyAccount: true,
        publishedAt: new Date(tweet.created_at),
        engagement: {
          likes: tweet.public_metrics?.like_count || 0,
          shares: tweet.public_metrics?.retweet_count || 0,
          comments: tweet.public_metrics?.reply_count || 0,
          views: tweet.public_metrics?.impression_count || 0
        }
      }));

    } catch (error) {
      console.error(`❌ Twitter timeline error for @${username}:`, error.response?.data || error.message);
      return [];
    }
  }
}

class RedditCollector {
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.accessToken = null;
  }

  async getAccessToken() {
    if (!this.clientId || !this.clientSecret) {
      console.log('⚠️  Reddit credentials not configured');
      return null;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'BrandTracker/1.0'
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('❌ Reddit auth error:', error.response?.data || error.message);
      return null;
    }
  }

  async collectMentions(keywords = ['OpenAI', 'ChatGPT', 'AI']) {
    if (!this.accessToken) {
      await this.getAccessToken();
    }

    if (!this.accessToken) return [];

    try {
      const query = keywords.join(' OR ');
      const response = await axios.get('https://oauth.reddit.com/search', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'BrandTracker/1.0'
        },
        params: {
          q: query,
          sort: 'new',
          limit: 10,
          type: 'link,comment'
        }
      });

      const posts = response.data.data?.children || [];
      
      return posts.map(post => {
        const data = post.data;
        
        return {
          text: data.title || data.body || '',
          platform: 'reddit',
          url: `https://reddit.com${data.permalink}`,
          author: data.author || 'unknown',
          authorProfile: `https://reddit.com/u/${data.author}`,
          publishedAt: new Date(data.created_utc * 1000),
          engagement: {
            likes: data.ups || 0,
            shares: 0,
            comments: data.num_comments || 0,
            views: 0
          },
          brandMentions: keywords.filter(keyword => 
            (data.title || data.body || '').toLowerCase().includes(keyword.toLowerCase())
          )
        };
      });
    } catch (error) {
      console.error('❌ Reddit collection error:', error.response?.data || error.message);
      return [];
    }
  }
}

class NewsCollector {
  constructor() {
    this.apiKey = process.env.GOOGLE_NEWS_API_KEY;
  }

  async collectMentions(keywords = ['OpenAI', 'ChatGPT', 'AI']) {
    if (!this.apiKey) {
      console.log('⚠️  Google News API key not configured');
      return [];
    }

    try {
      const query = keywords.join(' OR ');
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          sortBy: 'publishedAt',
          pageSize: 10,
          language: 'en',
          apiKey: this.apiKey
        }
      });

      const articles = response.data.articles || [];
      
      return articles.map(article => ({
        text: `${article.title}. ${article.description || ''}`,
        platform: 'news',
        url: article.url,
        author: article.author || article.source.name || 'unknown',
        authorProfile: null,
        publishedAt: new Date(article.publishedAt),
        engagement: {
          likes: 0,
          shares: 0,
          comments: 0,
          views: 0
        },
        brandMentions: keywords.filter(keyword => 
          `${article.title} ${article.description || ''}`.toLowerCase().includes(keyword.toLowerCase())
        )
      }));
    } catch (error) {
      console.error('❌ News collection error:', error.response?.data || error.message);
      return [];
    }
  }
}

class DataCollector {
  constructor() {
    this.collectors = {
      twitter: new TwitterCollector(),
      reddit: new RedditCollector(),
      news: new NewsCollector()
    };
    this.isRunning = false;
  }

  async collectAllMentions(keywords = null) {
    // Use configured keywords or defaults
    const monitoredBrands = process.env.MONITORED_BRANDS?.split(',') || ['OpenAI', 'ChatGPT'];
    const monitoredKeywords = process.env.MONITORED_KEYWORDS?.split(',') || ['artificial intelligence', 'AI'];
    const searchTerms = keywords || [...monitoredBrands, ...monitoredKeywords];
    
    console.log('🔍 Starting data collection for:', searchTerms);
    
    const allMentions = [];
    
    for (const [platform, collector] of Object.entries(this.collectors)) {
      try {
        console.log(`📡 Collecting from ${platform}...`);
        const mentions = await collector.collectMentions(searchTerms);
        console.log(`✅ Found ${mentions.length} mentions on ${platform}`);
        allMentions.push(...mentions);
      } catch (error) {
        console.error(`❌ Error collecting from ${platform}:`, error.message);
      }
    }

    // Process and save mentions
    if (allMentions.length > 0) {
      await this.processMentions(allMentions);
    }

    return allMentions;
  }

  async processMentions(mentions) {
    console.log(`🔄 Processing ${mentions.length} mentions...`);
    
    for (const mentionData of mentions) {
      try {
        // Check if mention already exists
        const existing = await Mention.findOne({
          url: mentionData.url,
          platform: mentionData.platform
        });

        if (existing) continue;

        // Analyze sentiment
        const sentimentResult = await sentimentService.analyzeSentiment(mentionData.text);
        
        // Create mention document
        const mention = new Mention({
          ...mentionData,
          sentiment: {
            score: sentimentResult.score,
            label: sentimentResult.label,
            confidence: sentimentResult.confidence
          },
          keywords: sentimentResult.keywords.map(word => ({
            word,
            relevance: 1
          })),
          topics: sentimentResult.keywords,
          processed: true
        });

        await mention.save();
        
        // Emit real-time update
        if (global.io) {
          global.io.emit('newMention', mention);
        }
        
        console.log(`💾 Saved mention: ${mention.platform} - ${mention.sentiment.label}`);
        
      } catch (error) {
        console.error('❌ Error processing mention:', error.message);
      }
    }
  }

  startCollection() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting automated data collection...');
    
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      await this.collectAllMentions();
    });
    
    // Initial collection
    this.collectAllMentions();
  }

  stopCollection() {
    this.isRunning = false;
    console.log('⏹️  Stopped data collection');
  }
}

export { DataCollector };
export const startDataCollection = () => {
  const collector = new DataCollector();
  collector.startCollection();
  return collector;
};