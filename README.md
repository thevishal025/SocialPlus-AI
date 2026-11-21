# SOCIALPULSE AI

**AI-Powered Social Media Comment Intelligence & Moderation SaaS Platform**

SOCIALPULSE AI connects YouTube and Instagram, retrieves available comments and replies via official APIs and the Model Context Protocol (MCP), processes them using 5 open-source AI/ML intelligence engines, and provides comprehensive analytics, human-in-the-loop auto-moderation, and downloadable CSV/PDF reports.

---

## Architecture Overview

```
Sicial Plus AI/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application with CORS & router mounting
│   │   ├── core/                       # Core configuration, security & database
│   │   │   ├── config.py               # Pydantic Settings (.env configuration loader)
│   │   │   ├── database.py             # SQLAlchemy multi-dialect engine & session
│   │   │   └── security.py             # JWT token handling & auth verification
│   │   ├── models/                     # 12 Modular SQLAlchemy models
│   │   │   ├── user.py, social_account.py, video.py, comment.py
│   │   │   ├── sentiment.py, emotion.py, intent.py, emoji.py
│   │   │   ├── moderation.py, job.py, report.py, moderation_action.py
│   │   ├── schemas/                    # Pydantic request & response contracts
│   │   ├── services/                   # Modular Service Layer
│   │   │   ├── comment_normalizer.py   # Unified common comment schema adapter
│   │   │   ├── youtube_service.py      # Official YouTube Data API v3 service
│   │   │   ├── instagram_mcp_service.py# Primary MCP JSON-RPC tool bridge
│   │   │   ├── instagram_rest_service.py# Direct REST RapidAPI fallback
│   │   │   └── analysis_service.py     # Orchestration of ingestion, ML & DB persistence
│   │   ├── ml/                         # 5 Machine Learning Classifiers
│   │   │   ├── sentiment.py            # Multilingual 4-Class Sentiment Classifier
│   │   │   ├── emotion.py              # 10-Class Emotional Spectrum Meter
│   │   │   ├── intent.py               # 10-Goal User Intent Engine
│   │   │   ├── emoji.py                # Contextual Unicode Emoji Engine
│   │   │   └── moderation.py           # Safe Auto Moderation Filter
│   │   ├── api/
│   │   │   ├── routes/                 # Production API Routes
│   │   │   │   ├── youtube.py          # /api/v1/youtube endpoints
│   │   │   │   ├── instagram.py        # /api/v1/instagram endpoints
│   │   │   │   ├── analysis.py         # /api/v1/analysis endpoints
│   │   │   │   ├── analytics.py        # /api/v1/analytics aggregate endpoints
│   │   │   │   ├── comments.py         # /api/v1/comments & deep dive endpoints
│   │   │   │   └── integrations.py     # /api/v1/integrations/status (Safe credentials)
│   │   │   └── auth.py, reports.py     # Specialized API endpoints
│   │   ├── engines/                    # Core rule & lexicon NLP inference engines
│   │   ├── evaluation/                 # ML Benchmark Evaluation Suite
│   │   │   ├── benchmark_dataset.py    # Multilingual validation dataset (En, Hi, Hinglish, Emoji)
│   │   │   └── evaluator.py            # Precision, Recall, F1, Confusion Matrix
│   │   └── reporting/                  # PDF & CSV Export Generators (ReportLab)
│   ├── tests/                          # 25 Automated Pytest integration & unit tests
│   ├── alembic/                        # Database migration revisions
│   ├── .env                            # Central API credentials (ignored by git)
│   ├── .env.example                    # Clean placeholders
│   └── requirements.txt
├── scripts/
│   └── setup_mcp.py                    # Automatic Antigravity RapidAPI MCP setup & verification
└── frontend/
    ├── src/
    │   ├── App.tsx                     # React Router with 11 pages
    │   ├── context/AnalysisContext.tsx # Central session state & demo data loader
    │   ├── api/client.ts               # Axios API client & endpoints
    │   ├── components/layout/          # Sidebar (11 pages), Header, Shell
    │   ├── components/ui/              # Card, MetricCard, Badge, Button, Modal
    │   ├── components/comments/        # CommentDetailModal, CommentFilterBar
    │   └── pages/                      # 11 Dedicated Pages
    │       ├── OverviewPage.tsx
    │       ├── AnalyzeContentPage.tsx
    │       ├── SentimentPage.tsx
    │       ├── EmotionalPage.tsx
    │       ├── IntentPage.tsx
    │       ├── EmojiPage.tsx
    │       ├── ModerationPage.tsx
    │       ├── CommentExplorerPage.tsx
    │       ├── ReportsPage.tsx
    │       ├── IntegrationsPage.tsx
    │       └── SettingsPage.tsx
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

---

## 5 Independent AI Intelligence Engines

1. **Sentiment Intelligence**
   - 4-Class Classification: Positive, Negative, Neutral, Mixed.
   - Multilingual support: English, Hinglish transliteration, and Devanagari Hindi.
   - Formula:
     $$\text{Net Sentiment Score} = \text{Positive Percentage} - \text{Negative Percentage} \quad (-100 \text{ to } +100)$$

2. **Emotional Intelligence Meter**
   - Detects 10 discrete emotions: Joy, Love, Excitement, Anger, Sadness, Surprise, Fear, Disgust, Frustration, Curiosity.
   - Multi-label confidence distribution; does not conflate positive tone with simple happiness.

3. **Intent Intelligence**
   - Detects 10 communicative goals: Questioning, Reply / Response, Appreciation, Complaint, Suggestion, Request, Feedback, Promotion, Spam, General Discussion.
   - Independent from sentiment (e.g. questions retain their true negative or positive emotional valence).

4. **Emoji Intelligence**
   - Context-aware decoding of top emojis (❤️, 😍, 🔥, 😂, 😭, 😡, 👎, 🙌, 💯, 🤔).
   - Contextual disambiguation (e.g. 😭 as laughter tears vs grief).
   - Isolates emoji-only comments and computes emoji frequency.

5. **Auto Moderation Intelligence**
   - Detects commercial spam, phishing links, hate speech, harassment, threats, bot repetitions, and duplicate comments.
   - Safe recommendation-only policy (never deletes or hides comments without explicit human moderator approval).

---

## Quickstart Guide

### 1. Central Configuration (`backend/.env`)

Enter your API keys into `backend/.env`:
```env
YOUTUBE_API_KEY=AIzaSy...
RAPIDAPI_KEY=7dbdb3...
RAPIDAPI_HOST=instagram-scraper-stable-api.p.rapidapi.com
RAPIDAPI_MCP_URL=https://mcp.rapidapi.com
INSTAGRAM_PROVIDER_NAME=Instagram Scraper Stable API
DATABASE_URL=sqlite:///./socialpulse.db
APP_NAME=SocialPulse AI
DEBUG=true
```

### 2. Configure RapidAPI MCP Server

Run the automated MCP configuration and discovery script:
```powershell
python scripts/setup_mcp.py
```
This discovers 22 tools from `https://mcp.rapidapi.com` including `Get_Post_Comments` and `Get_PostMedia_Comment_Replies_Child_Comments`.

### 3. Start Backend Server

```powershell
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: `http://127.0.0.1:8000/docs`
Safe Integrations Status: `http://127.0.0.1:8000/api/v1/integrations/status`

### 4. Start Frontend Dashboard

```powershell
cd frontend
npm install
npm run dev
```
React Dashboard: `http://127.0.0.1:5173`

### 5. Run Verification Test Suite

```powershell
cd backend
python -m pytest tests -v
```
All 25 automated unit and live API integration tests execute and pass.

---

## Security & API Key Protection

- Both API keys are read solely from `backend/.env`.
- No keys are exposed to the React frontend client.
- The `/api/v1/integrations/status` endpoint displays boolean connection flags and masked previews (`••••••••••••••••`) to guarantee raw secrets are never leaked.
- `backend/.env` is strictly excluded in `.gitignore`.
