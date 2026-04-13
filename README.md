# Civicai-smart-city-platform
AI-powered civic issue reporting platform with smart auto-routing, gamification, and real-time analytics.
🧠 CivicAI – Smart Civic Issue Reporting Platform
🚀 Overview

CivicAI is a full-stack AI-powered platform that enables citizens to report civic issues using images. The system intelligently classifies the issue, routes it to the appropriate authority, and rewards users through a gamified system.

⚙️ Tech Stack
Frontend: React.js, Vite, Tailwind CSS
Backend: Node.js, Express.js
Database: PostgreSQL (Drizzle ORM)
Validation: Zod
AI Layer: Rule-based classification (extendable to YOLO / TensorFlow)
Monorepo: pnpm workspaces
Build Tool: esbuild

🤖 AI Features
Image-based issue classification
Detects:
Garbage
Potholes
Water Leakage
Street Light Issues
Plastic Waste
Confidence-based routing system
Extendable to real ML models (YOLOv8, TensorFlow)


🔥 Core Features
📸 Complaint upload with image + location
🧠 AI-based issue detection
🏢 Smart authority routing
🔐 OTP-based authentication
🎮 Gamification (coins & rewards)
💰 UPI withdrawal system (mock)
📊 Analytics dashboard
🏆 Leaderboard system
🏗️ Project Structure

CivicAI/
│
├── artifacts/
│   ├── civicai/          # Frontend (React app)
│   └── api-server/       # Backend (Express API)
│
├── lib/
│   └── db/               # Database schema (Drizzle ORM)
│
├── packages/
│   └── api-spec/         # OpenAPI + API generation
│
└── pnpm-workspace.yaml


▶️ How to Run (VERY IMPORTANT FOR INTERVIEW)
# 1. Install dependencies
pnpm install

# 2. Run backend
pnpm --filter @workspace/api-server run dev

# 3. Run frontend
pnpm --filter civicai run dev


🔑 Demo Accounts

Authorities:

garbage@civicai.in
 / 1234
road@civicai.in
 / 1234
water@civicai.in
 / 1234
street@civicai.in
 / 1234
plastic@civicai.in
 / 1234
 
🔄 System Workflow
User registers (OTP verification)
Uploads complaint
AI detects issue type
Auto-assigned to authority
Authority reviews & approves
User gets coins
User withdraws money

🌍 Future Scope
Real AI models (YOLO / TensorFlow)
Fake image detection
Mobile app
Real-time notifications
Admin dashboard
