# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dual-mode audio/video transcription project using OpenAI's Whisper model. It operates in two completely independent architectures:

1. **REST API Mode**: Server-side transcription using WhisperX via Docker
2. **Browser Mode**: Client-side transcription using Transformers.js and WebAssembly via GitHub Pages

These are NOT integrated - they are separate implementations of the same functionality for different use cases.

## Development Commands

### REST API (Docker)

Start the API service:
```bash
docker-compose up -d --build
```

View logs:
```bash
docker logs -f whisperx-service
```

Stop the service:
```bash
docker-compose down
```

Test the API:
```bash
curl http://localhost:8000/health
curl -X POST "http://localhost:8000/transcribe" \
  -F "audio_file=@/path/to/audio.mp3" \
  -F "language=ru" \
  -F "model=base"
```

API documentation is auto-generated and available at `http://localhost:8000/docs` when running.

### Browser Application

Local development server:
```bash
python -m http.server 8000
# Then open http://localhost:8000
```

The browser app is automatically deployed to GitHub Pages on push to main via `.github/workflows/deploy.yml`.

## Architecture

### REST API Architecture (api.py)

- **Framework**: FastAPI with uvicorn server
- **Python Version**: 3.13-slim
- **Core Library**: WhisperX (wrapper around OpenAI Whisper with enhanced alignment)
- **GPU Support**: Auto-detects GPU availability via nvidia-smi or CUDA environment variables
- **Compute Types**:
  - `float16` for GPU (faster)
  - `float32` for CPU (default fallback)
- **File Handling**:
  - Input files saved to `/app/input/` with UUID prefixes
  - Output JSON saved to `/app/output/{uuid}/`
  - Automatic cleanup after processing
- **Endpoints**:
  - `GET /health` - Returns service status and compute type
  - `POST /transcribe` - Main transcription endpoint with parameters:
    - `audio_file`: File upload
    - `language`: Default "ru" (Russian)
    - `model`: Default "base" (tiny/base/small/medium/large supported)
    - `align`: Optional alignment for precise timestamps

**Key Implementation Detail**: The API uses subprocess to call WhisperX CLI rather than importing it as a library. This is important when debugging or modifying behavior.

### Browser Architecture (index.html)

- **Single-file application**: All HTML, CSS, and JavaScript in `index.html`
- **Core Library**: Transformers.js (@xenova/transformers@2.17.1) from CDN
- **Model Loading**: Uses Hugging Face models (Xenova/whisper-* series)
- **CSP Policy**: Intentionally relaxed for CDN access to transformers.js and model files
- **Audio Processing**: Uses Web Audio API to convert audio to required format
- **Progress Tracking**:
  - Model download progress (file-based)
  - Transcription progress (simulated via setInterval since callback_function may not work reliably with ASR pipeline)
- **Error Handling**:
  - 10-minute transcription timeout to prevent hangs
  - Heartbeat monitoring for detecting frozen processing
  - Global error handlers to prevent white screen crashes
- **Model Cache**: Models are cached by browser after first download

**Important Constraints for Browser Mode**:
- Large models (large/large-v3) are ~3GB and impractical in browsers
- Recommended models: tiny, base, small, medium
- First model load can take several minutes
- WebAssembly and modern browser required

### Project Structure

```
.
├── api.py              # FastAPI server (REST API mode)
├── Dockerfile          # Container with Python 3.13 + WhisperX
├── docker-compose.yml  # Service orchestration with volume mounts
├── index.html          # Complete browser app (no build step needed)
├── .github/workflows/deploy.yml  # Auto-deploy to GitHub Pages
├── input/              # Temporary upload directory (Docker volume)
├── output/             # Transcription results (Docker volume)
└── models/             # Whisper model cache (Docker volume)
```

## Model Selection Guidelines

- **tiny**: Fastest, lowest accuracy - good for quick tests
- **base**: Recommended for browser, good balance for Docker
- **small**: Better accuracy, still reasonable in browser
- **medium**: High accuracy, works in browser but slow, good for Docker
- **large/large-v3**: Maximum accuracy, Docker + GPU only

## Common Pitfalls

1. **Browser Mode**: Do not expect `callback_function` to work reliably with the ASR pipeline in Transformers.js - use simulated progress instead
2. **Browser Mode**: Progress tracking must be handled carefully as the pipeline can freeze without proper timeout/heartbeat mechanisms
3. **Docker API**: The service auto-detects GPU but requires nvidia-docker runtime to actually use it (see docker-compose.yml comments)
4. **Both Modes**: First run with a new model downloads the full model (~500MB for base, ~3GB for large)
5. **Docker Volumes**: Models are cached in `./models` volume to avoid re-downloading on container restarts
6. **API Endpoint**: WhisperX creates output files named after the input file stem, not the UUID - search for `*.json` in output directory

## GitHub Pages Deployment

The workflow deploys the entire repository root to Pages. This means:
- `index.html` becomes the landing page
- All files are publicly accessible (don't commit secrets)
- Deployment is automatic on push to main
- Requires Pages to be enabled with "GitHub Actions" source in repository settings
