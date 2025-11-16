import 'dotenv/config';
import sentimentService from './src/services/sentimentService.js';

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini AI sentiment analysis...');
  
  // Test sample texts
  const testTexts = [
    "I absolutely love this new product! It's amazing and works perfectly!",
    "This is the worst experience I've ever had. Completely disappointed.",
    "The product is okay, nothing special but does the job.",
    "Brand X has the best customer service and quality products!"
  ];

  try {
    for (const text of testTexts) {
      console.log(`\n📝 Analyzing: "${text.substring(0, 50)}..."`);
      const result = await sentimentService.analyzeSentiment(text);
      console.log('📊 Result:', {
        score: result.score,
        label: result.label,
        confidence: result.confidence,
        keywords: result.keywords
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Gemini API integration test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure your GEMINI_API_KEY is set in the .env file');
  }
}

testGeminiAPI();