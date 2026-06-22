# 🤖 AI Canvas: Asynchronous Banner & Media Asset Generator

A high-performance full-stack web application designed to generate stylized, context-aware content banners using an asynchronous processing pipeline. Built with a **FastAPI** backend and a **React (Vite)** frontend, this system utilizes **Server-Sent Events (SSE)** to stream real-time background execution states directly to the client dashboard.

---

## 🏗️ Technical Architecture & Data Flow

Unlike standard synchronous applications that block the server thread during heavy AI generation cycles, this platform utilizes a fully decoupled background task worker system:

1. **Asset Provisioning Layer:** React passes a multi-part file binary payload to `/api/upload-headshot`. The backend catches the stream and stores it securely via the **ImageKit SDK**.
2. **Job Registration:** The client hits `POST /api/jobs` specifying the prompt context. A new job is instantly saved to an **SQLite database via SQLModel**, generating unique UUID tracking tokens.
3. **Decoupled Task Queue:** FastAPI spawns an unblocking background worker process using `asyncio.create_task()` and immediately returns a `200 OK` containing the `job_id` to the UI.
4. **AI Processing Hook:** The background thread processes the request context, handles the handshake with the **Pollinations AI (Flux Model)** processing array, downloads the raw binary buffer stream, and registers the optimized assets to Cloud Storage.
5. **Real-Time Event Streaming:** The UI opens a persistent network socket channel via `GET /api/jobs/{job_id}/stream`. The server routes a localized `StreamingResponse` loop, executing quick database state checks and pushing live data packets (`thumbnail_ready`, `thumbnail_failed`, `job_completed`) down the socket channel.

---

## ⚡ Tech Stack

* **Backend Engine:** FastAPI (ASGI), SQLModel (SQLAlchemy ORM), Pydantic v2 data schemas, SQLite Database, Uvicorn Server.
* **Frontend Interface:** React.js (Vite configuration), Native Browser EventSource API for SSE tracking links.

---

## 📋 API Endpoint Definitions

| Method | Endpoint | Description | Payload Type |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/upload-headshot` | Accepts binary image streams, provisions cloud assets. |
| `POST` | `/api/jobs` | Initializes database rows, spawns asynchronous AI task queues. |
| `GET` | `/api/jobs/{job_id}` | Fetches current tracking states and calculated image variants. |
| `GET` | `/api/jobs/{job_id}/stream` | Opens persistent SSE channel to stream ongoing image generation events. | 