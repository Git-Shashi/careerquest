import 'dotenv/config';

async function testDirectAPI() {
  console.log('🧪 Testing Gemini API directly with curl...');
  console.log('🔑 API Key (first 10 chars):', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{
        text: 'Analyze the sentiment of this text: "This product is amazing!" Return only the sentiment as positive, negative, or neutral.'
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

    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API working!');
      console.log('📤 Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ API Error:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testDirectAPI();