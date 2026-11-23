# SketchFlow AI — Architecture Documentation

## Architectural Overview

SketchFlow AI is designed as a modular, decoupled application for transforming reference artwork into step-by-step drawing lessons.

```
+-------------------------------------------------------------+
|                     Frontend (React + Vite)                 |
|                                                             |
|  [Pages / Views]  -->  [Hooks]  -->  [Services / apiClient] |
+-------------------------------------------------------------+
                               |
                        HTTP / JSON
                               v
+-------------------------------------------------------------+
|                     Backend (FastAPI)                       |
|                                                             |
|  [API Routes]  -->  [Services]  -->  [Image Processing]     |
|                                              |              |
|                                              v              |
|                                       [Pillow Pipeline]     |
|                                              |              |
+----------------------------------------------+--------------+
                                               |
                                               v
                                   [Storage: uploads, steps]
```

## Module Responsibilities

### 1. `backend/app/core/`
Centralized application settings (`config.py`) using `pydantic_settings`. Loads `.env` file, validates CORS origins, and defines system paths.

### 2. `backend/app/models/`
Pydantic schemas providing strict validation and serialization for:
- API responses (`HealthResponse`)
- Image metadata (`ImageMetadata`)
- Grid specifications (`GridSplitConfig`, `GridCellCoordinate`, `ExtractedCell`)

### 3. `backend/app/image_processing/`
Dedicated image pipeline independent of FastAPI routes:
- **`validator.py`**: Verifies image format (PNG, JPEG, WEBP), file size limits (<=20MB), and header integrity using Pillow `verify()`.
- **`resizer.py`**: Aspect-ratio-preserving downscaling and padding logic.
- **`grid_processor.py`**: Mathematical division of drawing sheets into 3x3 step-by-step bounding boxes.
- **`sheet_exporter.py`**: Exporting individual step crops and composite sheets.

### 4. `backend/app/api/`
FastAPI route modules organized by domain. Clean separation between endpoint definitions and business logic.

### 5. `frontend/src/services/`
Encapsulated API communication layer. Ensures all endpoint paths, headers, timeout handling, and typed error responses remain in a single maintainable location.

### 6. `frontend/src/hooks/`
Encapsulates asynchronous API states (loading, data, error, latency) using reusable React hooks (`useHealthCheck`).
