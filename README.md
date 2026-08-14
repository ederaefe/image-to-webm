# Seamless WebM Studio

An AI-powered, browser-native studio designed to generate seamlessly looping WebM product showcases from static fashion/e-commerce images using **Google Gemini Veo** (`veo-3.1-fast-generate-preview`).

This project completely removes FFmpeg dependencies, performing high-quality VP9 WebM encoding directly client-side.

---

## Key Features

### 🎥 Native Client-Side WebM Conversion
Instead of shipping a ~25MB WASM FFmpeg binary to the browser or running expensive server-side video conversion processes, this application uses the browser's native **`HTMLMediaElement.captureStream()`** and **`MediaRecorder`** APIs. 
- It captures the video player stream in real-time as it plays.
- Encodes it directly to `video/webm` (using VP9 codec if supported).
- Generates a seamless loop without server lag or client package bloat.

### 💾 Bulletproof IndexedDB Session Recovery
Built-in resilience for interrupted sessions or lost internet connections:
- **Source Images & Blobs Caching**: Uploaded images, proxy MP4s, and final WebM files are stored in a local browser IndexedDB database (`WebmStudioDB`). Reloading the page instantly restores your workspace.
- **Polling Resumption**: If the browser reloads or the connection drops during an active video generation, the studio remembers the active Google API `operationId` and automatically resumes polling upon reload.
- **Log Conservation**: Keeps a copy of your session terminal output.

### ⚙️ User-Configurable Settings with Caching
- **Prompt Customization**: Full control over the prompt description sent to Veo.
- **Flexible Dimensions & Durations**: Interactive configuration for Video Duration (4s, 6s, 8s) and Aspect Ratios (1:1 Square, 16:9 Landscape, 9:16 Portrait).
- **Auto-Save Preferences**: Remembers your preferred aspect ratios, prompts, and settings using `localStorage` caching.

### 🛡️ Secure Vercel Edge Proxying
- API keys are securely kept on the backend using Vercel environment variables.
- An edge-runtime proxy (`api/video.js`) streams the generated video chunk-by-chunk while appending the required `x-goog-api-key` header to Google AI Studio, solving CORS issues and preventing key exposure.
- Built-in automatic retry fallback on backend 5xx API limits.

---

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), Vanilla JavaScript.
- **Backend API**: Node.js Vercel Serverless Functions & Edge Runtime.
- **Storage**: Browser IndexedDB (Blobs) & LocalStorage (JSON configs).

---

## File Structure
```bash
├── api/
│   ├── start.js      # Initiates Gemini Veo generation with retry/fallback rules
│   ├── poll.js       # Checks operation progress from Google API
│   └── video.js      # Secure Vercel Edge proxy for video streaming
├── public/
│   └── index.html    # Glassmorphic UI with MediaRecorder & IndexedDB logic
├── vercel.json       # Routes and rewrites for Serverless deployment
└── README.md         # Project documentation
```

---

## Getting Started

### 1. Prerequisites
Ensure you have the Vercel CLI installed:
```bash
npm install -g vercel
```

### 2. Environment Variables
Obtain a Gemini API key from Google AI Studio. Set up a local `.env` file or Vercel project environment variable:
```env
GEMINI_API=your_gemini_api_key_here
```

### 3. Running Locally
Run the server locally using the Vercel Development server:
```bash
vercel dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploying to Vercel
Deploy directly to production:
```bash
vercel --prod
```

---

## License
MIT License. Created for seamless fashion and e-commerce asset generation.
