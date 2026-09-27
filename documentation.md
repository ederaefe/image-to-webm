# Project Documentation

## Overview
This application converts an image to a seamless video and GIF using Google Gemini's Veo model and client-side FFmpeg WebAssembly.

## Architecture & Components
- **Frontend / Client-Side**:
  - `public/index.html`: Contains the styling, layout, image uploader, logs terminal, and video/GIF preview cards. It includes client-side FFmpeg (`@ffmpeg/ffmpeg` and `@ffmpeg/util`) to compile the generated video into a seamless looping GIF.
- **Backend API Routes (Vercel Serverless/Edge)**:
  - `/api/start` (`api/start.js`): Initiates the long-running video generation task using Gemini's `veo-3.1-fast-generate-preview` model.
  - `/api/poll` (`api/poll.js`): Polls the status of the long-running operation.
  - `/api/video` (`api/video.js`): An edge function that validates the completed operation, extracts the video URI, fetches the video stream using the Google API key, and proxies it back to the client.
