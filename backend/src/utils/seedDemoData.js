import mongoose from 'mongoose';
import Mention from '../models/Mention.js';
import { config } from 'dotenv';

config();

// Sample mentions for demo purposes
const sampleMentions = [
  {
    text: "RapidQuest Solutions has revolutionized our hiring process with their AI-powered platform! Amazing innovation.",
    platform: "twitter",
    url: "https://twitter.com/demo/status/1",
    author: "tech_recruiter_pro",
    authorProfile: "https://twitter.com/tech_recruiter_pro",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    sentiment: {
      score: 0.8,
      label: "positive",
      confidence: 0.9
    },
    keywords: [{word: "innovation", relevance: 0.9}, {word: "AI", relevance: 0.8}],
    topics: ["innovation", "AI", "hiring"],
    engagement: { likes: 45, shares: 12, comments: 8, views: 230 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "Just tried the new recruitment platform from RapidQuest. The AI matching is incredible - found perfect candidates in minutes!",
    platform: "news",
    url: "https://techcrunch.com/demo-article",
    author: "hr_manager_2024",
    authorProfile: "https://techcrunch.com/author/hr_manager_2024",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    sentiment: {
      score: 0.75,
      label: "positive",
      confidence: 0.85
    },
    keywords: [{word: "AI", relevance: 0.95}, {word: "matching", relevance: 0.8}],
    topics: ["AI", "recruitment", "matching"],
    engagement: { likes: 23, shares: 15, comments: 15, views: 156 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "RapidQuest's new hiring challenge is generating buzz in the tech community. Their approach to AI-powered marketing solutions is innovative.",
    platform: "news",
    url: "https://techcrunch.com/demo-article-2",
    author: "TechCrunch",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    sentiment: {
      score: 0.65,
      label: "positive",
      confidence: 0.8
    },
    keywords: [{word: "innovative", relevance: 0.9}, {word: "buzz", relevance: 0.7}],
    topics: ["innovation", "AI", "marketing", "hiring"],
    engagement: { likes: 89, shares: 34, comments: 22, views: 1250 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "Disappointed with RapidQuest's latest update. The new interface is confusing and the AI recommendations seem off.",
    platform: "twitter",
    url: "https://twitter.com/demo/status/2",
    author: "frustrated_user_x",
    authorProfile: "https://twitter.com/frustrated_user_x",
    publishedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    sentiment: {
      score: -0.7,
      label: "negative",
      confidence: 0.85
    },
    keywords: [{word: "disappointed", relevance: 0.9}, {word: "confusing", relevance: 0.8}],
    topics: ["interface", "AI", "update"],
    engagement: { likes: 12, shares: 3, comments: 18, views: 89 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "The future of recruitment is here! RapidQuest's AI-powered matching algorithm is a game-changer for HR departments.",
    platform: "news",
    url: "https://venturebeat.com/demo-article",
    author: "future_hr_today",
    authorProfile: "https://venturebeat.com/author/future_hr_today",
    publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    sentiment: {
      score: 0.9,
      label: "positive",
      confidence: 0.95
    },
    keywords: [{word: "future", relevance: 0.8}, {word: "game-changer", relevance: 0.9}],
    topics: ["future", "AI", "recruitment", "algorithm"],
    engagement: { likes: 67, shares: 25, comments: 24, views: 245 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "RapidQuest needs to fix their customer support. Been waiting 3 days for a response to my technical issue.",
    platform: "twitter",
    url: "https://twitter.com/demo/status/3",
    author: "impatient_customer",
    authorProfile: "https://twitter.com/impatient_customer",
    publishedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    sentiment: {
      score: -0.6,
      label: "negative",
      confidence: 0.8
    },
    keywords: [{word: "fix", relevance: 0.7}, {word: "waiting", relevance: 0.8}],
    topics: ["support", "technical", "response"],
    engagement: { likes: 8, shares: 2, comments: 5, views: 45 },
    brandMentions: ["RapidQuest"]
  },
  {
    text: "CareerQuest platform by RapidQuest is transforming how we approach talent acquisition. The AI insights are remarkable!",
    platform: "news",
    url: "https://forbes.com/demo-article",
    author: "Forbes Tech",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    sentiment: {
      score: 0.85,
      label: "positive",
      confidence: 0.9
    },
    keywords: [{word: "transforming", relevance: 0.9}, {word: "remarkable", relevance: 0.8}],
    topics: ["transformation", "AI", "talent", "insights"],
    engagement: { likes: 156, shares: 42, comments: 31, views: 2100 },
    brandMentions: ["RapidQuest", "CareerQuest"]
  },
  {
    text: "Mixed feelings about RapidQuest's new features. Some are great, others need work.",
    platform: "twitter",
    url: "https://twitter.com/demo/status/4",
    author: "neutral_reviewer",
    authorProfile: "https://twitter.com/neutral_reviewer",
    publishedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    sentiment: {
      score: 0.1,
      label: "neutral",
      confidence: 0.7
    },
    keywords: [{word: "mixed", relevance: 0.8}, {word: "features", relevance: 0.9}],
    topics: ["features", "review", "feedback"],
    engagement: { likes: 15, shares: 4, comments: 12, views: 78 },
    brandMentions: ["RapidQuest"]
  }
];

async function seedDemoData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/brandtracker');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing mentions for clean demo
    await Mention.deleteMany({});
    console.log('🗑️  Cleared existing mentions');
    
    // Insert sample mentions
    const insertedMentions = await Mention.insertMany(sampleMentions.map(mention => ({
      ...mention,
      processed: true,
      collectedAt: new Date()
    })));
    
    console.log(`✅ Inserted ${insertedMentions.length} sample mentions for demo`);
    console.log('📊 Demo data includes:');
    console.log(`   - ${sampleMentions.filter(m => m.sentiment.label === 'positive').length} Positive mentions`);
    console.log(`   - ${sampleMentions.filter(m => m.sentiment.label === 'negative').length} Negative mentions`);
    console.log(`   - ${sampleMentions.filter(m => m.sentiment.label === 'neutral').length} Neutral mentions`);
    console.log(`   - ${sampleMentions.filter(m => m.platform === 'twitter').length} Twitter mentions`);
    console.log(`   - ${sampleMentions.filter(m => m.platform === 'news').length} News mentions`);
    
    await mongoose.disconnect();
    console.log('🎉 Demo data seeded successfully!');
    console.log('\n🚀 Now start the application: npm run dev');
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData();
}

export { seedDemoData, sampleMentions };