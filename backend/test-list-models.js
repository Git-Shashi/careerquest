import 'dotenv/config';

async function testBasicModels() {
  console.log('🧪 Testing basic Gemini models...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-1.5-flash',
    'gemini-pro',
    'text-bison-001',
    'models/text-bison-001'
  ];

  for (const model of models) {
    console.log(`\n🔍 Testing: ${model}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{
          text: 'Say "Hello, this model works!"'
        }]
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${model} works!`);
        console.log(`📤 Response:`, data.candidates[0].content.parts[0].text);
        return model; // Return the working model
      } else {
        const error = await response.json();
        console.log(`❌ ${model} failed: ${error.error.message.split('.')[0]}`);
      }
    } catch (error) {
      console.log(`❌ ${model} error: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Let\'s try listing available models...');
  
  // Try to list models
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(listUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📋 Available models:');
      data.models.forEach(model => {
        if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
          console.log(`  ✅ ${model.name} (supports generateContent)`);
        }
      });
    }
  } catch (error) {
    console.log('❌ Could not list models:', error.message);
  }
}

testBasicModels();