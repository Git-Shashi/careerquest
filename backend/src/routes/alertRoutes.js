import express from 'express';
import AlertConfig from '../models/AlertConfig.js';

const router = express.Router();

// GET /api/alerts - Get all alert configurations
router.get('/', async (req, res) => {
  try {
    const alerts = await AlertConfig.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts - Create new alert configuration
router.post('/', async (req, res) => {
  try {
    const alertConfig = new AlertConfig(req.body);
    await alertConfig.save();
    
    res.status(201).json(alertConfig);
  } catch (error) {
    console.error('❌ Error creating alert:', error);
    res.status(400).json({ error: 'Failed to create alert', details: error.message });
  }
});

// PUT /api/alerts/:id - Update alert configuration
router.put('/:id', async (req, res) => {
  try {
    const alertConfig = await AlertConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!alertConfig) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }
    
    res.json(alertConfig);
  } catch (error) {
    console.error('❌ Error updating alert:', error);
    res.status(400).json({ error: 'Failed to update alert', details: error.message });
  }
});

// DELETE /api/alerts/:id - Delete alert configuration
router.delete('/:id', async (req, res) => {
  try {
    const alertConfig = await AlertConfig.findByIdAndDelete(req.params.id);
    
    if (!alertConfig) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }
    
    res.json({ message: 'Alert configuration deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// POST /api/alerts/:id/toggle - Toggle alert active status
router.post('/:id/toggle', async (req, res) => {
  try {
    const alertConfig = await AlertConfig.findById(req.params.id);
    
    if (!alertConfig) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }
    
    alertConfig.isActive = !alertConfig.isActive;
    await alertConfig.save();
    
    res.json(alertConfig);
  } catch (error) {
    console.error('❌ Error toggling alert:', error);
    res.status(500).json({ error: 'Failed to toggle alert status' });
  }
});

// GET /api/alerts/:id/test - Test alert configuration
router.get('/:id/test', async (req, res) => {
  try {
    const alertConfig = await AlertConfig.findById(req.params.id);
    
    if (!alertConfig) {
      return res.status(404).json({ error: 'Alert configuration not found' });
    }
    
    // Create a test mention that would trigger this alert
    const testMention = {
      text: `This is a test mention about ${alertConfig.monitoredBrands[0] || 'your brand'}. This is terrible and disappointing!`,
      platform: 'test',
      sentiment: {
        score: -0.8,
        label: 'negative',
        confidence: 0.9
      },
      brandMentions: alertConfig.monitoredBrands,
      engagementScore: alertConfig.triggers.highEngagementThreshold + 100
    };
    
    const shouldTrigger = alertConfig.shouldTrigger(testMention);
    
    res.json({
      alertConfig: alertConfig.name,
      testMention: testMention.text,
      wouldTrigger: shouldTrigger,
      reasons: shouldTrigger ? [
        testMention.sentiment.score <= alertConfig.triggers.negativeSentimentThreshold ? 'Negative sentiment threshold' : null,
        testMention.engagementScore >= alertConfig.triggers.highEngagementThreshold ? 'High engagement threshold' : null,
        alertConfig.triggers.criticalKeywords.some(keyword =>
          testMention.text.toLowerCase().includes(keyword.toLowerCase())
        ) ? 'Critical keywords detected' : null
      ].filter(Boolean) : ['No trigger conditions met']
    });
    
  } catch (error) {
    console.error('❌ Error testing alert:', error);
    res.status(500).json({ error: 'Failed to test alert' });
  }
});

export default router;