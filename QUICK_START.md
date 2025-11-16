# 🚀 Quick Setup Guide - Brand Mention Tracker

## ✅ Current Status
- ✅ Environment files created
- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed
- ⏳ Need API keys and MongoDB setup

## 🔑 Required API Keys (Get These First!)

### 1. **MongoDB Atlas (FREE - Required)**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free account
3. Create a new cluster (select FREE tier)
4. Create a database user with username/password
5. Whitelist your IP (0.0.0.0/0 for development)
6. Get connection string and update `MONGODB_URI` in `/backend/.env`

### 2. **Google Gemini API (FREE - Required for AI)**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key and update `GEMINI_API_KEY` in `/backend/.env`

### 3. **Optional APIs (for social media monitoring)**
- **Twitter API**: [Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- **Reddit API**: [Apps Page](https://www.reddit.com/prefs/apps)
- **News API**: [NewsAPI.org](https://newsapi.org/)

## 🏃‍♂️ Quick Start Commands

### Step 1: Update MongoDB URI
```bash
# Edit the backend .env file
code /Users/shashi/Documents/projects/careerquest/backend/.env
# Replace MONGODB_URI with your actual Atlas connection string
```

### Step 2: Add Gemini API Key
```bash
# In the same .env file, replace:
GEMINI_API_KEY=your_gemini_api_key_here
# With your actual Gemini API key
```

### Step 3: Start Backend (Terminal 1)
```bash
cd /Users/shashi/Documents/projects/careerquest/backend
npm run dev
```

### Step 4: Start Frontend (Terminal 2)
```bash
cd /Users/shashi/Documents/projects/careerquest/frontend
npm start
```

### Step 5: Open Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 🧪 Test the Setup

### Test Backend Connection
```bash
cd /Users/shashi/Documents/projects/careerquest/backend
node test-mongodb.js
```

### Test Gemini AI
```bash
cd /Users/shashi/Documents/projects/careerquest/backend
node test-gemini.js
```

## 📁 Project Structure
```
careerquest/
├── backend/           # Node.js API server
│   ├── .env          # Your environment variables
│   ├── server.js     # Main server file
│   └── src/          # API routes and services
├── frontend/         # React dashboard
│   ├── .env          # Frontend configuration
│   └── src/          # React components
└── README.md
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Make sure your IP is whitelisted in Atlas
- Check username/password in connection string
- Ensure database user has read/write permissions

### Gemini API Issues
- Verify API key is correct
- Check if you have API quota remaining
- Ensure no extra spaces in the .env file

### Port Conflicts
- Backend runs on port 5000
- Frontend runs on port 3000
- Make sure these ports are available

## 🎯 Next Steps After Setup
1. **Customize Brand Monitoring**: Update `MONITORED_BRANDS` in backend/.env
2. **Add Social Media APIs**: Get Twitter/Reddit API keys for real data
3. **Deploy to Cloud**: Use the deployment guides in DEPLOYMENT.md

---
**Need Help?** Check the other guide files:
- `API_KEYS_GUIDE.md` - Detailed API setup instructions
- `DEPLOYMENT.md` - How to deploy to production
- `HACKATHON_GUIDE.md` - Hackathon-specific tips