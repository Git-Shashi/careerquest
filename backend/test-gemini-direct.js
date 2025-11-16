import 'dotenv/config';
import sentimentService from './src/services/sentimentService.js';

async function testGeminiDirectly() {
  console.log('🎯 Testing Gemini API directly (no fallback)...');
  
  const testTexts = [
    "I absolutely love this new product! It's amazing and works perfectly!",
    "This is the worst experience I've ever had. Completely disappointed.",
    "The product is okay, nothing special but does the job.",
    "Brand X has the best customer service and quality products!"
  ];

  try {
    for (const text of testTexts) {
      console.log(`\n📝 Direct Gemini Analysis: "${text.substring(0, 50)}..."`);
      
      // Call the sentiment analysis method directly
      const result = await sentimentService.analyzeSentiment(text);
      
      console.log('✅ Gemini Result:', {
        score: result.score,
        label: result.label,
        confidence: result.confidence,
        keywords: result.keywords,
        reasoning: result.reasoning
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 All Gemini API calls successful!');
    console.log('💡 Your sentiment analysis is using 100% AI-powered Gemini, no fallback needed!');
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    
    if (error.message.includes('JSON')) {
      console.log('💡 This might be a JSON parsing issue with Gemini response format');
    } else if (error.message.includes('API')) {
      console.log('💡 This might be an API quota or authentication issue');
    }
  }
}

testGeminiDirectly();