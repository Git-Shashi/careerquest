import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

class SentimentAnalysisService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async analyzeSentiment(text) {
    try {
      // AI prompt for sentiment analysis
      const prompt = `Analyze the sentiment of the following text about a brand or product. 
      Return a JSON response with:
      - score: number between -1 (very negative) and 1 (very positive)
      - label: "positive", "negative", or "neutral"
      - confidence: number between 0 and 1
      - keywords: array of relevant keywords/topics (max 5)
      - reasoning: brief explanation

      Text: "${text}"

      Response format: {"score": 0.0, "label": "neutral", "confidence": 0.0, "keywords": [], "reasoning": ""}

      You are an expert sentiment analysis AI. Always respond with valid JSON only, no additional text.`;

      const response = await this.model.generateContent(prompt);
      let responseText = response.response.text();
      
      // clean up any markdown
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const result = JSON.parse(responseText);
      
      // make sure we return valid data
      return {
        score: Math.max(-1, Math.min(1, result.score || 0)),
        label: ['positive', 'negative', 'neutral'].includes(result.label) ? result.label : 'neutral',
        confidence: Math.max(0, Math.min(1, result.confidence || 0)),
        keywords: (result.keywords || []).slice(0, 5),
        reasoning: result.reasoning || 'No reasoning provided'
      };

    } catch (error) {
      console.error('AI sentiment analysis error:', error.message);
      
      // fallback to simple analysis if AI fails
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  fallbackSentimentAnalysis(text) {
    // basic sentiment analysis when AI isn't available
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'fantastic', 'perfect', 'outstanding'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'useless', 'broken', 'failed'];
    
    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let score = 0;
    let label = 'neutral';
    
    if (positiveScore > negativeScore) {
      score = Math.min(0.8, positiveScore * 0.2);
      label = 'positive';
    } else if (negativeScore > positiveScore) {
      score = Math.max(-0.8, negativeScore * -0.2);
      label = 'negative';
    }
    
    return {
      score,
      label,
      confidence: Math.min(0.6, (positiveScore + negativeScore) * 0.1),
      keywords: this.extractBasicKeywords(text),
      reasoning: 'Fallback keyword-based analysis'
    };
  }

  extractBasicKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'than', 'like', 'more'].includes(word));
    
    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top 5 most frequent words
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  async batchAnalyzeSentiment(texts) {
    const results = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += 5) {
      const batch = texts.slice(i, i + 5);
      const batchPromises = batch.map(text => this.analyzeSentiment(text));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + 5 < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('❌ Batch sentiment analysis error:', error.message);
        // Add fallback results for failed batch
        batch.forEach(text => {
          results.push(this.fallbackSentimentAnalysis(text));
        });
      }
    }
    
    return results;
  }
}

export default new SentimentAnalysisService();