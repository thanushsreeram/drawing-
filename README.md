# SketchFlow AI

An AI-powered drawing tutor application designed to deconstruct reference images into structured, step-by-step drawing lessons and guided worksheets.

---

## Current Status: Phase 1 — Project Initialization

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 initialized with centralized API service architecture.
- **Backend**: FastAPI + Uvicorn + Pydantic v2 application structure with CORS configuration and health verification.
- **Image Processing**: Foundational modules using Pillow prepared for image validation, aspect-ratio resizing, 3×3 grid splitting, and step export.
- **Storage**: Directory structure for uploads, sheets, steps, and lessons initialized and safeguarded with `.gitignore`.

---

## Project Structure

```
SketchFlowAI/
├── frontend/                     # React + TypeScript + Vite client
│   ├── src/
│   │   ├── components/           # Reusable UI components (e.g., StatusBadge)
│   │   ├── pages/                # Page views (e.g., HomePage development foundation)
│   │   ├── features/             # Feature-specific modules (reserved for Phase 2+)
│   │   ├── hooks/                # Custom React hooks (e.g., useHealthCheck)
│   │   ├── services/             # Centralized API service layer (apiClient, healthService)
│   │   ├── types/                # TypeScript interface and type definitions
│   │   ├── utils/                # Utility helpers (formatters, calculations)
│   │   ├── assets/               # Static client assets (logos, icons)
│   │   ├── App.tsx               # Root component
│   │   ├── main.tsx              # Application entrypoint
│   │   └── index.css             # Tailwind CSS entrypoint
│   ├── public/                   # Static public assets
│   ├── .env.example              # Frontend environment variables template
│   ├── package.json              # Frontend dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.ts            # Vite & Tailwind build plugins
│
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/           # API endpoints (health check)
│   │   ├── core/                 # App configuration & environment settings
│   │   ├── services/             # Core business logic services
│   │   ├── image_processing/     # Image validation, resizing, grid processor
│   │   ├── models/               # Pydantic schemas (health, image metadata, grid)
│   │   └── main.py               # FastAPI application factory & CORS setup
│   ├── tests/                    # Unit tests for backend endpoints and modules
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   └── .env                      # Local environment configuration
│
├── storage/                      # File storage (gitignored except .gitkeep)
│   ├── uploads/                  # Raw user-uploaded reference images
│   ├── sheets/                   # Generated multi-step drawing sheets
│   ├── steps/                    # Extracted step-by-step cropped cell images
│   └── lessons/                  # Structured lesson metadata and exported guides
│
├── docs/                         # Project documentation and architectural plans
├── .gitignore                    # Git ignore configuration
└── README.md                     # Project documentation
```

---

## Prerequisites

- **Node.js**: v18.0.0 or newer (tested on Node v26)
- **Python**: 3.10 or newer (tested on Python 3.14)
- **Package Managers**: `npm` and `pip`

---

## Quick Start & Installation

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (cmd):
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Verify backend unit tests
python -m unittest discover -s tests

# Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will start at:
- API Root: `http://127.0.0.1:8000`
- Health Endpoint: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will be available at:
- `http://localhost:5173` (or `http://127.0.0.1:5173`)

---

## Testing Frontend-to-Backend Connectivity

1. Open `http://localhost:5173` in your browser.
2. The development page will immediately ping `GET /api/health`.
3. If the backend is running, the **FastAPI Health Service** card will display a green `Connected` badge, latency in milliseconds, and the JSON payload:
   ```json
   {
     "status": "ok",
     "app": "SketchFlow AI"
   }
   ```
4. Click **Test Backend Connection** at any time to re-test the live connection.

---

## Installed Packages

### Frontend Dependencies (`frontend/package.json`)
- `react` (`^19.3.1`) — React library
- `react-dom` (`^19.3.1`) — React DOM renderer
- `tailwindcss` (`^4.3.5`) — Utility-first CSS framework
- `@tailwindcss/vite` (`^4.3.5`) — Tailwind CSS Vite plugin
- `vite` (`^8.3.6`) — Next-generation frontend tooling
- `typescript` (`~7.0.2`) — Static type checking
- `@types/react`, `@types/react-dom`, `@types/node` — TypeScript definitions

### Backend Dependencies (`backend/requirements.txt`)
- `fastapi` (`>=0.115.0`) — Modern, fast web framework for APIs
- `uvicorn[standard]` (`>=0.32.0`) — ASGI web server implementation
- `pillow` (`>=11.0.0`) — Python Imaging Library for raster image processing
- `pydantic` (`>=2.10.0`) — Data validation and settings management using Python type annotations
- `pydantic-settings` (`>=2.6.0`) — Settings management from environment variables
- `python-multipart` (`>=0.0.12`) — Streaming multipart parser for image uploads

---

## Architectural Principles

1. **Decoupled API Layer**: All frontend HTTP communication is abstracted through `src/services/apiClient.ts` and domain services (`src/services/healthService.ts`), ensuring components do not scatter direct `fetch` calls.
2. **Safe CORS Policy**: The backend restricts allowed origins to explicit local development URLs configured in `backend/app/core/config.py` and `.env`.
3. **Pillow Image Processing Foundation**: Validation (`validator.py`), aspect-ratio resizing (`resizer.py`), and grid division (`grid_processor.py`) are modularly isolated from web route handlers.
4. **Clean Git Hygiene**: Generated lesson sheets, uploads, steps, and virtual environments are explicitly excluded via `.gitignore` while keeping directory scaffolds using `.gitkeep`.
# drawing-
