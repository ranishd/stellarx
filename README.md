# StellarX (formerly AstraPilot)

> Autonomous space fleet management powered by an AI orchestrator and real-time physics telemetry.

## Overview

StellarX is a web-based command interface and backend orchestration system designed to manage large constellations of satellites. It simulates real-time physics (Keplerian orbits, perturbations) and handles chaos events (Solar Flares, System Failures, Debris Storms) using AI-driven autonomous decisions.

This project was built for the [Hackathon Name/Theme]. 

## Architecture

StellarX uses a split-deployment architecture for maximum performance and reliability:

1. **Frontend (Vercel):**
   - Built with **React + Vite**.
   - **Three.js / react-three-fiber** for 3D orbital visualizations.
   - **TailwindCSS** for UI styling.
   - Connects to the backend via a 10Hz WebSocket stream.

2. **Backend (Render / Railway / Stateful Host):**
   - **Node.js + Express** HTTP server.
   - **WebSocket Server (`ws`)** streaming live physics telemetry at 10Hz.
   - **SQLite** database for persistent event logging and metrics.
   - Custom physics engine and AI agent orchestrator (`@google/genai`).

*Note: Due to Vercel's serverless nature which spins down functions and does not support WebSockets or persistent SQLite disks, the backend must be hosted on a stateful provider to ensure uninterrupted, real-time operation.*

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Start the Backend
The backend runs the physics simulation and WebSocket server on port 8080.
```bash
cd server
npm install
node index.js
```

### 2. Start the Frontend
The Vite frontend runs on port 5173. In a new terminal window:
```bash
npm install
npm run dev
```

## Deployment Configuration

When deploying the frontend to Vercel, ensure you set the `VITE_WS_URL` environment variable to point to your deployed backend (e.g., `wss://stellarx-backend.onrender.com`). If not set, it defaults to the host's `8080` port.

## License
MIT
