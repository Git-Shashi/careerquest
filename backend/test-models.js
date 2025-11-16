import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listAvailableModels() {
  console.log('🔍 Checking available Gemini models...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try to list models
    const models = await genAI.listModels();
    
    console.log('\n📋 Available models:');
    models.forEach(model => {
      console.log(`  - ${model.name}`);
    });
    
    // Try with the most common model names
    const commonModels = [
      'gemini-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'models/gemini-pro',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro'
    ];
    
    console.log('\n🧪 Testing common model names:');
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Test');
        console.log(`✅ ${modelName} - Working!`);
        break;
      } catch (error) {
        console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAvailableModels();