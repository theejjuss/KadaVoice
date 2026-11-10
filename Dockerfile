# ========================================================
# KadaVoice Multi-Stage Production Dockerfile
# Combines React/Vite Frontend + FastAPI/Gnani NLP Backend
# ========================================================

# Stage 1: Build Frontend Single-Page Application
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY "Redesign KadaVoice Grocery App/package*.json" ./
RUN npm ci

COPY "Redesign KadaVoice Grocery App" ./
RUN npm run build

# Stage 2: Python Production Runtime
FROM python:3.11-slim AS production

# System dependencies for audio handling and graphics/fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements & install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Source Code & Existing SQLite Database
COPY database.py ./
COPY backend_api.py ./
COPY order_processor.py ./
COPY seed_catalogue.py ./
COPY stt.py ./
COPY tts.py ./
COPY kadavoice.db ./

# Copy built frontend assets from Stage 1 into the exact expected directory
COPY --from=frontend-builder /app/frontend/dist ./"Redesign KadaVoice Grocery App"/dist

# Create storage directories
RUN mkdir -p assets/recordings assets/generated_audio assets/invoices

# Environment configuration
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start unified FastAPI server serving both API and Frontend SPA
CMD ["sh", "-c", "uvicorn backend_api:app --host 0.0.0.0 --port ${PORT:-8000}"]
