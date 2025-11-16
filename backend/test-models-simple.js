import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testModels() {
  console.log('🧪 Testing different Gemini model names...');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const modelsToTest = [
    'gemini-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro', 
    'models/gemini-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
    'gemini-1.0-pro',
    'models/gemini-1.0-pro'
  ];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`\n🔍 Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent('Analyze the sentiment of this text: "This is great!" Return only: positive');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ ${modelName} works!`);
      console.log(`📤 Response: ${text.trim()}`);
      
      // If we found a working model, update the service
      console.log(`\n🎉 Found working model: ${modelName}`);
      break;
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message.split('\n')[0]}`);
    }
  }
}

testModels();