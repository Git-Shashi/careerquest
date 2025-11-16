import 'dotenv/config';
import { DataCollector } from './src/services/dataCollector.js';

async function testCompanyMonitoring() {
  console.log('🏢 Testing Company-Focused Brand Monitoring...\n');
  
  // Example company configuration for testing
  const testCompanies = [
    { 
      account: 'RapidQuest', 
      brands: ['RapidQuest', 'Rapid Quest'],
      keywords: ['hiring platform', 'recruitment automation']
    },
    { 
      account: 'OpenAI', 
      brands: ['OpenAI', 'ChatGPT', 'GPT'],
      keywords: ['artificial intelligence', 'AI chatbot']
    }
  ];
  
  console.log('📋 Company Monitoring Configuration:');
  testCompanies.forEach((company, index) => {
    console.log(`\n${index + 1}. 🏢 ${company.account}`);
    console.log(`   📱 Social Account: @${company.account}`);
    console.log(`   🏷️  Brand Names: ${company.brands.join(', ')}`);
    console.log(`   🔍 Keywords: ${company.keywords.join(', ')}`);
    console.log(`   📊 Will Monitor:`);
    console.log(`      • Posts FROM @${company.account}`);
    console.log(`      • Mentions OF @${company.account}`);
    console.log(`      • Discussions about "${company.brands.join('", "')}"`);
  });
  
  console.log('\n🐦 Example Twitter Queries Generated:');
  testCompanies.forEach(company => {
    const queryParts = [
      `from:${company.account}`,
      `@${company.account}`,
      ...company.brands.map(brand => `"${brand}"`)
    ];
    console.log(`\n🔍 ${company.account}: ${queryParts.join(' OR ')}`);
  });
  
  // Test the actual data collection (only if Twitter token is configured)
  if (process.env.TWITTER_BEARER_TOKEN && process.env.TWITTER_BEARER_TOKEN !== 'your_twitter_bearer_token_here') {
    console.log('\n🧪 Testing live data collection...');
    const collector = new DataCollector();
    
    try {
      const mentions = await collector.collectAllMentions(testCompanies);
      
      if (mentions.length > 0) {
        console.log(`\n✅ Found ${mentions.length} company-related mentions:`);
        
        mentions.forEach((mention, index) => {
          console.log(`\n${index + 1}. 📱 ${mention.platform} | ${mention.mentionType || 'general'}`);
          console.log(`   👤 @${mention.author}`);
          console.log(`   📝 "${mention.text.substring(0, 100)}..."`);
          console.log(`   🏷️  Brands: ${mention.brandMentions?.join(', ') || 'N/A'}`);
          console.log(`   💝 ${mention.engagement.likes} likes, ${mention.engagement.shares} shares`);
        });
      } else {
        console.log('\n📭 No recent mentions found (this is normal for test accounts)');
      }
      
    } catch (error) {
      console.log(`\n⚠️  Live test skipped: ${error.message}`);
    }
  } else {
    console.log('\n💡 To test live data collection:');
    console.log('   1. Get Twitter Bearer Token from: https://developer.twitter.com');
    console.log('   2. Add it to TWITTER_BEARER_TOKEN in .env');
    console.log('   3. Run this test again');
  }
  
  console.log('\n🎯 Company monitoring setup complete!');
  console.log('Your system will now track:');
  console.log('• Official company posts and announcements');
  console.log('• Customer mentions and feedback');
  console.log('• Brand discussions and sentiment');
  console.log('• Competitor mentions for comparison');
}

testCompanyMonitoring();