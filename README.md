# Brand Mention Tracker

A web app that monitors brand mentions across social platforms and analyzes sentiment using AI.

## Features

- Multi-platform monitoring (Twitter, News APIs)
- Real-time dashboard with websockets  
- AI sentiment analysis
- Analytics and visualizations
- Modern responsive UI

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- Socket.io (real-time updates)
- MongoDB (data storage)
- OpenAI API (sentiment analysis)
- Twitter API v2, Reddit API, Google News API

### Frontend
- React 18 with hooks
- Chart.js (analytics visualization)
- Socket.io-client (real-time connection)
- Tailwind CSS (styling)
- Axios (API calls)

## 🚀 Quick Start (Hackathon Demo)

```bash\n# One-command demo for judges\n./demo.sh\n\n# OR manual setup\nnpm run install-deps\n# Configure API keys in backend/.env\nnpm run dev\n```\n\n**🎯 For Hackathon Judges:**\n- Dashboard: http://localhost:3000\n- API Health: http://localhost:5000/api/health  \n- See `HACKATHON_GUIDE.md` for detailed demo scenarios

## 📁 Project Structure

```
brand-mention-tracker/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── models/         # MongoDB schemas
│   │   ├── services/       # Data collection services
│   │   ├── utils/          # Helper functions
│   │   └── config/         # Configuration files
│   ├── server.js           # Main server entry
│   └── package.json
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   ├── utils/         # Helper functions
│   │   └── App.js
│   └── package.json
└── README.md
```

## 🔧 Environment Setup

Create `.env` files in both backend and frontend directories with required API keys.

## 📊 Demo Data Flow

1. **Data Collection**: APIs fetch mentions every 60 seconds
2. **AI Analysis**: OpenAI processes sentiment and topics
3. **Real-Time Updates**: WebSocket pushes to dashboard
4. **Alert System**: Email notifications for negative spikes
5. **Analytics**: Historical trends and insights

## 🏆 Hackathon Goals

- ✅ Real-time brand monitoring
- ✅ Multi-platform data aggregation  
- ✅ AI-powered sentiment analysis
- ✅ Clean dashboard with insights
- ✅ Alert system for urgent issues

---

**Built for RapidQuest Solutions Hiring Challenge | Nov 14-16, 2025**