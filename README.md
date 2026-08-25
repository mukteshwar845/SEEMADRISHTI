# TRINETRA AI - Tactical Multi-Camera CCTV Surveillance & Threat Intelligence Command

An intelligent, multi-channel tactical CCTV surveillance command matrix built with React 18, TypeScript, Tailwind CSS, and HTML5 Canvas. TRINETRA delivers 60 FPS real-time computer vision simulation, automated ANPR (Automatic Number Plate Recognition), velocity tracking, virtual tripwire intrusion alarms, and multi-layout CCTV streams.

---

## 📌 Features

- **9-Camera Tactical Surveillance Matrix**:
  - **3x3 Tactical Matrix**: Monitor all 9 defense sectors simultaneously.
  - **2x2 High-Resolution Quad View**: Focused 4-channel view with page navigation.
  - **1+8 Spotlight Mode**: 1 primary stream with side camera thumbnails.
- **Computer Vision & HUD Telemetry (60 FPS)**:
  - Real-time bounding boxes with class labels and confidence percentages.
  - Dynamic optical flow trajectory vectors and ANPR license plate parsing.
  - Night Vision (NV-IR) and Thermal imaging sensor simulation filters.
  - Digital zoom (up to 3x) and real-time canvas snapshots.
- **Dual Playback Modes**:
  - **● LIVE Mode**: Real-time simulated RTSP streaming.
  - **RECORDED Archive Mode**: Timeline scrubber, play/pause controls, and 1x/2x/4x playback speed.
- **Multi-Module Intelligence Hub**:
  - **Live Camera Matrix & Multi-Cam Stitching**: Wide-angle composite stitching.
  - **Real-Time Detections & Alerts Manager**: Incident triage and risk levels.
  - **Incident Inspector**: Forensic incident analysis and evidence export.
  - **Analytics Dashboard**: Anomaly radar charts and traffic density distribution.
  - **System Gauges**: GPU compute load, inference latency, and VRAM monitoring.
  - **Audit Logs & Role-Based Access Control**: Simulated operator session management.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **Graphics & Rendering**: HTML5 Canvas (60 FPS HUD Engine)
- **Charts & Data Visualization**: Recharts, D3
- **Animation**: Motion

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/trinetra-ai-surveillance.git
cd trinetra-ai-surveillance
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Security & Privacy Notice

This project is completely client-side ready and contains **zero private credentials, passwords, personal emails, or private API keys**. All footage, streams, telemetry markers, and operator records use synthetic simulation data for security and demonstration purposes.

---

## 📄 License

MIT License. Feel free to use and customize for surveillance, defense tech, and computer vision dashboard prototypes.
