# KadaVoice: Deployment & Submission Guide

This guide provides instructions to run and deploy **KadaVoice** for today's submission deadline.

The project is structured as a **unified production system**: the FastAPI backend serves both the REST API endpoints and the compiled React/Vite Single-Page Application (SPA) on port **8000** with zero CORS complexity.

---

## 1. Quick Local Execution (Production Mode)

You can launch the complete application with a single command:

### On Windows
Double-click `start.bat` or run:
```cmd
.\KadaVoice\venv\Scripts\python.exe -m uvicorn backend_api:app --host 127.0.0.1 --port 8000
```
Open your browser to: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### On macOS / Linux
```bash
bash start.sh
```
Open your browser to: **[http://localhost:8000](http://localhost:8000)**

---

## 2. Instant Free Cloud Deployment (Render.com)

Render allows you to host the entire containerized application for free with automatic SSL/HTTPS.

### Steps:
1. Push your repository to **GitHub** (or GitLab).
2. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and sign in.
3. Click **New +** $\to$ **Web Service**.
4. Connect your GitHub repository:
   - **Name**: `kadavoice`
   - **Region**: Singapore or Frankfurt (lowest latency for India)
   - **Language / Environment**: `Docker`
   - **Branch**: `main` (or your active branch)
   - **Docker Command**: Leave default (`Dockerfile` is automatically detected)
   - **Plan**: `Free`
5. *(Optional)* Add Environment Variables if you have Gnani credentials:
   - `GNANI_TOKEN`: your Gnani token
   - `GNANI_ACCESS_KEY`: your access key
6. Click **Create Web Service**.
7. Render will build the multi-stage Dockerfile and deploy your app. You will receive a live URL:
   `https://kadavoice.onrender.com`

---

## 3. Instant 1-Click Cloud Deployment (Railway.app)

Railway provides instant Docker builds with zero configuration:

1. Go to **[https://railway.app](https://railway.app)** and sign in with GitHub.
2. Click **New Project** $\to$ **Deploy from GitHub repo**.
3. Select the `KadaVoice` repository.
4. Railway will automatically detect the `Dockerfile` and start the build.
5. In the project settings, click **Generate Domain** under Networking.
6. Your live deployed application is ready at `https://kadavoice-production.up.railway.app`.

---

## 4. Docker & Container Deployment

To run inside Docker locally or on any cloud VPS (AWS EC2, DigitalOcean, Hetzner, GCP):

```bash
# Build and run with Docker Compose
docker compose up --build -d

# Check running status
docker ps
```
Access the application at **`http://localhost:8000`**.

---

## 5. System Architecture & Features Summary

| Component | Capabilities |
| :--- | :--- |
| **NLP Engine (`order_processor.py`)** | • Full Malayalam, Manglish, and English numerals (`oru`, `randu`, `moonu`, `ara`, `kaal`).<br>• Conjunction suffixes (`-um`, `-o`) and plurals (`-s`, `-es`).<br>• RapidFuzz spelling and phonetic typo tolerance.<br>• Leftover unknown item extraction (`unresolved_items`).<br>• Cart assistant voice commands (`add`, `remove`, `update`, `clear`). |
| **Catalogue & Aliases (`database.py`)** | • 29 core Kerala grocery staple products seeded.<br>• Comprehensive Malayalam script, Manglish, and English aliases.<br>• Additive non-destructive schema migrations on `kadavoice.db`. |
| **Frontend UI (`App.tsx`)** | • 8 complete views: Home, Voice Order, Catalogue Manager, Order History, Dashboard, Customers, Reports, Settings.<br>• 16kHz mono audio downsampling via Web Audio API.<br>• Audio retry, clear recording, and audio playback preview.<br>• Uncatalogued items alert with 1-click cart insertion.<br>• A4 Print layout & 80mm Thermal Receipt toggle.<br>• PDF invoice generation & download.<br>• CSV sales analytics report export. |
| **Backend API (`backend_api.py`)** | • Health check at `/api/health`.<br>• Transactional orders storage with invoice numbering (`KV-YYYYMMDD-XXXXXX`).<br>• Gnani STT audio transcription and TTS voice confirmation.<br>• ReportLab high-resolution PDF invoice generator.<br>• Static SPA mounting with HTML5 history route fallback. |

---

## 6. Live Verification Proof

All 12 automated integration tests passed against the live running server:
- ✅ `GET /api/products` (29 products loaded)
- ✅ `POST /api/products` (Product CRUD verification)
- ✅ `PUT /api/products/{id}` (Update price, stock, aliases)
- ✅ `DELETE /api/products/{id}` (Safe deactivation/deletion)
- ✅ `POST /api/orders` (Transactional order creation)
- ✅ `GET /api/orders/{id}` (Detail retrieval with line totals)
- ✅ `GET /api/orders/{id}/pdf` (ReportLab A4 PDF generation)
- ✅ `PATCH /api/orders/{id}/status` (Status tracking: pending/completed/cancelled)
- ✅ `GET /api/dashboard` (Live KPI calculations)
- ✅ `GET /api/customers` (Customer directory & order count)
- ✅ `GET /api/settings` & `PUT /api/settings` (Store configuration)
- ✅ `GET /api/reports/sales` & `/api/reports/sales/csv` (Revenue reporting & CSV export)
- ✅ Benchmark phrase: `"Enikku 2 kg rice, 1 litre coconut oil, 3 soap, 2 packet biscuits venam."` correctly extracts 4 items.
