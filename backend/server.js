const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Simple JSON file DB (for prototype only)
const DB_FILE = path.join(__dirname, 'db.json');
const initDB = {
  wallet: { balance: 2500 },
  growth: [],
  chat_history: []
};

// Initialize database
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initDB, null, 2));
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE));
  } catch (error) {
    console.error('Database read error:', error);
    return initDB;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Database write error:', error);
  }
}

// AI Service - inline implementation
const askNutrition = async (prompt) => {
  // Try to use OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a nutrition advisor for families in Northern Nigeria. Provide practical, culturally appropriate advice using local foods like millet, sorghum, cowpeas, groundnuts, and moringa. Keep responses brief (2-3 sentences) and always recommend visiting health facilities for serious concerns.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fall through to fallback responses
    }
  }

  // Fallback responses when OpenAI is not available or fails
  const responses = {
    default: 'Include diverse local foods: eggs, beans, leafy greens, and orange-fleshed sweet potato. Visit clinic if unsure.',
    pregnancy: 'For pregnancy: aim for protein, iron-rich meals, and MMS as advised by health workers.',
    malnutrition: 'Signs of malnutrition include weight loss, fatigue, and slow growth. Seek immediate medical attention.',
    infant: 'For infants: exclusive breastfeeding for 6 months, then introduce nutrient-dense complementary foods.',
    growth: 'Healthy growth requires balanced nutrition with proteins, vitamins, and minerals. Monitor weight and height regularly.'
  };
  
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('pregn')) return responses.pregnancy;
  if (lowerPrompt.includes('malnutr')) return responses.malnutrition;
  if (lowerPrompt.includes('infant') || lowerPrompt.includes('baby')) return responses.infant;
  if (lowerPrompt.includes('growth')) return responses.growth;
  
  return responses.default;
};

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get AI response
    const response = await askNutrition(message);
    
    // Store chat history
    const db = readDB();
    const chatEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      user_message: message,
      ai_response: response
    };
    
    if (!db.chat_history) db.chat_history = [];
    db.chat_history.unshift(chatEntry);
    
    // Keep only last 50 entries
    if (db.chat_history.length > 50) {
      db.chat_history = db.chat_history.slice(0, 50);
    }
    
    writeDB(db);
    
    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// SMS webhook for Twilio/Africa's Talking
app.post('/api/sms/webhook', (req, res) => {
  console.log('SMS webhook received:', req.body);
  
  // Example Twilio webhook processing
  const { From: sender, Body: message } = req.body;
  
  if (sender && message) {
    console.log(`SMS from ${sender}: ${message}`);
  }
  
  res.sendStatus(200);
});

// Wallet endpoints
app.get('/api/wallet', (req, res) => {
  const db = readDB();
  res.json({ balance: db.wallet.balance });
});

app.post('/api/wallet/topup', (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const db = readDB();
    db.wallet.balance += Number(amount);
    writeDB(db);
    
    console.log(`Wallet topped up: +${amount}, new balance: ${db.wallet.balance}`);
    res.json({ balance: db.wallet.balance });
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ error: 'Topup failed' });
  }
});

app.post('/api/wallet/redeem', (req, res) => {
  try {
    const db = readDB();
    const redeemAmount = 1000; // Cost of NutriKit
    
    if (db.wallet.balance < redeemAmount) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: redeemAmount,
        current: db.wallet.balance
      });
    }
    
    db.wallet.balance -= redeemAmount;
    writeDB(db);
    
    console.log(`NutriKit redeemed, remaining balance: ${db.wallet.balance}`);
    
    res.json({ 
      balance: db.wallet.balance, 
      redeemed: true,
      message: 'NutriKit will be delivered to your PHC within 2-3 days'
    });
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

// Growth tracking endpoints
app.get('/api/growth', (req, res) => {
  const db = readDB();
  res.json({ entries: db.growth || [] });
});

app.post('/api/growth', (req, res) => {
  try {
    const { weight, height, muac } = req.body;
    
    // Validation
    if (!weight || !height || !muac) {
      return res.status(400).json({ error: 'Weight, height, and MUAC are required' });
    }
    
    if (weight <= 0 || height <= 0 || muac <= 0) {
      return res.status(400).json({ error: 'All measurements must be positive numbers' });
    }
    
    const db = readDB();
    const entry = {
      id: uuidv4(),
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      weight: Number(weight),
      height: Number(height),
      muac: Number(muac)
    };
    
    if (!db.growth) db.growth = [];
    db.growth.unshift(entry);
    
    // Keep only last 100 entries
    if (db.growth.length > 100) {
      db.growth = db.growth.slice(0, 100);
    }
    
    writeDB(db);
    
    // Enhanced alert logic
    let alert = null;
    const alerts = [];
    
    // MUAC-based malnutrition screening
    if (muac < 11.5) {
      alerts.push('SEVERE malnutrition risk (MUAC < 11.5 cm) - IMMEDIATE medical attention needed');
    } else if (muac < 12.5) {
      alerts.push('HIGH malnutrition risk (MUAC < 12.5 cm) - Visit health facility soon');
    }
    
    // Age-based weight checks (simplified)
    if (weight < 5) {
      alerts.push('Low weight detected - Consider nutritional assessment');
    }
    
    if (alerts.length > 0) {
      alert = alerts.join('. ');
    }
    
    console.log(`Growth entry saved: W:${weight}kg H:${height}cm MUAC:${muac}cm`);
    if (alert) console.log(`ALERT: ${alert}`);
    
    res.json({ entry, alert });
  } catch (error) {
    console.error('Growth tracking error:', error);
    res.status(500).json({ error: 'Failed to save measurements' });
  }
});

// Image analysis endpoint
app.post('/api/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    console.log(`Image uploaded: ${req.file.filename}`);
    
    res.json({
      risk: 'low',
      confidence: 0.85,
      notes: 'Image analysis placeholder - integrate with ML model',
      recommendations: [
        'Continue current feeding practices',
        'Monitor growth regularly',
        'Ensure adequate protein intake'
      ]
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${DB_FILE}`);
  console.log(`🤖 AI Service: ${process.env.OPENAI_API_KEY ? 'OpenAI Connected' : 'Fallback mode'}`);
});