# CivicAI – Smart Civic Issue Reporting Platform

## Overview

A full-stack AI-powered civic issue reporting platform for India. Citizens can report problems like garbage, potholes, water leakage, and broken street lights using photo upload + AI detection. The system auto-routes complaints to the right authority and rewards reporters with points redeemable as cash.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Radix UI + Recharts + Framer Motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Applications

- `artifacts/civicai` — Main frontend app (React + Vite), served at `/`
- `artifacts/api-server` — Express REST API, served at `/api`

## Features

1. **Issue Reporting** — Upload photo, auto-detect GPS, AI identifies issue type + confidence score
2. **AI Detection** — Simulated YOLOv8-style detection; detects garbage, potholes, water leakage, street lights, plastic
3. **Smart Auto-Routing** — Garbage→Municipality, Plastic→Recycling, Road→PWD, Light→Electricity Dept
4. **Dashboard** — Bar chart (issues by type), line chart (over time), recent reports table, issue map
5. **Gamification** — 100pts on report, 200pts on resolution; 10pts=₹1; City Hero/Top Reporter badges
6. **Leaderboard** — Top contributors ranked by points with badge system
7. **Wallet** — Points balance, cash value, UPI withdrawal (mock), transaction history
8. **Authority Panel** — Department login, view assigned issues, accept/reject/resolve actions
9. **Fraud Prevention** — Image hash duplicate detection, prevents double-reporting
10. **Multi-role** — Citizens, Authority officials, Admin

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Demo Accounts

**Citizens:**
- amit@example.com / password123 (City Hero — 5200 pts)
- kavya@example.com / password123 (Top Reporter — 2300 pts)
- ravi@example.com / password123 (Civic Champion — 800 pts)

**Authorities:**
- municipality@civicai.in / authority123 (Municipality)
- pwd@civicai.in / authority123 (PWD Department)
- electricity@civicai.in / authority123 (Electricity Department)
- water@civicai.in / authority123 (Water Authority)

## Database Schema

- `users` — id, name, email, password_hash, phone, role (user/authority/admin), department, points, badge, total_reports, resolved_reports
- `issues` — id, user_id, issue_type, description, image_url, latitude, longitude, address, status (pending/in_progress/resolved), department, confidence_score, resolved_image_url, image_hash, reporter_name, points_awarded
- `rewards` — id, user_id, type (earned/withdrawn), points, description, upi_id, transaction_id

## API Endpoints

- `GET /api/healthz`
- `GET/POST /api/issues`
- `GET/PATCH /api/issues/:id`
- `POST /api/issues/detect` — AI detection
- `POST /api/users` — register
- `POST /api/users/login`
- `GET /api/users/:id`
- `GET /api/users/leaderboard`
- `GET /api/rewards/:userId`
- `POST /api/rewards/withdraw`
- `POST /api/authorities/login`
- `GET /api/authorities/issues`
- `GET /api/analytics/summary`
- `GET /api/analytics/issues-by-type`
- `GET /api/analytics/issues-over-time`
- `GET /api/analytics/recent-activity`
