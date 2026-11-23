# SketchFlow AI — Phased Build & Implementation Roadmap

## 1. Overview & Strategy

This document defines the 10 sequential development milestones required to build **SketchFlow AI** from scratch. 

The implementation strategy follows an empirical, risk-first approach:
1. **Low-Level Hardware & Diffusion Engine (Milestones 1–2)**: Validate that ComfyUI runs headlessly on the host RTX 4050 (6GB VRAM) and test the 3×3 grid hypothesis empirically.
2. **Backend & Orchestration (Milestones 3–6)**: Construct the asynchronous FastAPI server, multimodal lesson planning prompt, WebSocket communication bridge, and Pillow image slicing pipeline.
3. **Frontend & Interactive Experience (Milestones 7–8)**: Build the interactive React 19 drawing tutor UI with step navigation, canvas drawing, and side-by-side reference comparison.
4. **Hardening & Advanced Capabilities (Milestones 9–10)**: Add surgical cell inpainting, automated validation, and export capabilities.

```mermaid
flowchart LR
    subgraph Phase I: Engine Validation
        M1[M1: ComfyUI Headless Setup] --> M2[M2: 3x3 Grid Benchmark]
    end
    subgraph Phase II: Core Architecture
        M2 --> M3[M3: Backend & Queue]
        M3 --> M4[M4: AI Lesson Planner]
        M4 --> M5[M5: ComfyUI Client Bridge]
        M5 --> M6[M6: Pillow Slicing Pipeline]
    end
    subgraph Phase III: UI & Integration
        M6 --> M7[M7: React Tutor UI]
        M7 --> M8[M8: End-to-End Integration]
    end
    subgraph Phase IV: Polish & Hardening
        M8 --> M9[M9: Surgical Repair & QA]
        M9 --> M10[M10: Advanced Tutor Tools]
    end
```

---

## Milestone 1: ComfyUI Local Environment & Headless API Validation

### Objective
Install ComfyUI Core into `backend/comfyui/`, configure PyTorch with bundled CUDA 12.4 support, and verify headless execution over REST and WebSocket APIs without launching a browser UI.

### Inputs
- Host RTX 4050 GPU (6GB VRAM, Driver 621.24)
- Python 3.11 installation
- Installation instructions from `docs/research/installation_roadmap.md`

### Tasks & Deliverables
1. Clone ComfyUI Core into `backend/comfyui`.
2. Set up virtual environment `backend/comfyui_env` with PyTorch cu124.
3. Download base checkpoint `dreamshaper_8_pruned.safetensors` (2.1GB) to `models/checkpoints/`.
4. Create headless runner script `backend/scripts/start_comfyui.ps1` with flags:
   `--listen 127.0.0.1 --port 8188 --lowvram --disable-auto-launch`.
5. Write diagnostic Python script `backend/scripts/test_comfyui_connection.py` that probes `/system_stats` and verifies CUDA device identification.

### Outputs
- Running headless ComfyUI service on port 8188.
- Verified test report showing PyTorch recognizing RTX 4050 (6.14 GB).

### Acceptance Criteria & Testing Protocol
- `GET http://127.0.0.1:8188/system_stats` returns HTTP 200 with `cuda:0` device name.
- ComfyUI consumes $< 1.8\text{ GB}$ VRAM at idle.
- Zero GUI windows or browsers auto-launch upon process startup.

### Risk & Mitigation
- **Risk**: Port 8188 conflict or permission errors.
- **Mitigation**: Add port detection and configurable port parameter in startup script.

---

## Milestone 2: 3×3 Grid Generation Experiment & Empirical Benchmark

### Objective
Execute actual diffusion generation of a 3×3 grid (1536×1536 or 1152×1152) using `ConditioningSetArea` nodes and ControlNet Lineart to empirically validate quality, bleed, and VRAM consumption.

### Inputs
- Running ComfyUI instance from Milestone 1.
- `control_v11p_sd15_lineart.pth` in `models/controlnet/`.
- Test reference image (simple cartoon cat or teapot).

### Tasks & Deliverables
1. Install `comfyui_controlnet_aux` custom nodes.
2. Build JSON workflow template `backend/workflows/grid_3x3_experiment.json`:
   - Lineart preprocessor extracts wireframe from reference.
   - 9 distinct `ConditioningSetArea` nodes with coordinates $(0,0), (512,0), \dots, (1024,1024)$.
   - Prompts parameterized for progressive stages (1: wireframe rough shapes $\rightarrow$ 9: finished sketch).
3. Execute generation via ComfyUI REST API (`POST /prompt`).
4. Log VRAM peak with `nvidia-smi` and measure generation latency.
5. Inspect generated grid for cell bleed, spatial overlap, and stylistic continuity.

### Outputs
- First empirical 3×3 grid image generated on local hardware.
- Performance log documenting VRAM usage, iteration speed (it/s), and total seconds.

### Acceptance Criteria & Testing Protocol
- Peak VRAM strictly $\le 5.2\text{ GB}$ during sampling (no CUDA Out of Memory).
- Total generation time $\le 35\text{ seconds}$ for 20 sampling steps.
- Cells 1, 5, and 9 exhibit clear structural progression from rough construction to finished details.

### Risk & Mitigation
- **Risk**: 1536×1536 latent space causes VRAM spike $> 5.8\text{ GB}$.
- **Mitigation**: Fall back to 1152×1152 grid (384×384 per cell) or use tiled VAE decode (`VAEEncodeTiled` / `VAEDecodeTiled`).

---

## Milestone 3: Backend Foundation & Asynchronous Orchestration Engine

### Objective
Build the core FastAPI application structure, SQLite database models, async task queue mutex, and health/status endpoints.

### Inputs
- Python `backend/venv` with FastAPI, Pydantic v2, and SQLite3.

### Tasks & Deliverables
1. Implement database schema (`backend/app/db/models.py`) with tables:
   - `tutorials` (id, title, status, prompt_plan, grid_image_path, created_at)
   - `stages` (id, tutorial_id, stage_number, title, prompt, description, image_path, status)
2. Implement repository layer (`backend/app/db/repository.py`) for atomic CRUD operations.
3. Build GPU concurrency mutex in `backend/app/services/queue_manager.py` using `asyncio.Semaphore(1)` to prevent concurrent ComfyUI execution.
4. Expose endpoints in `backend/app/api/tutorials.py`:
   - `POST /api/tutorials` (upload image, enqueue lesson creation)
   - `GET /api/tutorials/{id}` (fetch status, stages, and image URLs)
   - `GET /api/tutorials` (list recent tutorials)

### Outputs
- Functional, self-contained REST API with SQLite persistence.
- Automated unit tests covering database CRUD and queue concurrency.

### Acceptance Criteria & Testing Protocol
- `pytest backend/tests/test_backend.py` passes 100%.
- Concurrent requests to `POST /api/tutorials` queue sequentially rather than executing in parallel.

### Risk & Mitigation
- **Risk**: SQLite file lock collisions under multi-threaded FastAPI workers.
- **Mitigation**: Use WAL mode (`PRAGMA journal_mode=WAL;`) and scoped database sessions.

---

## Milestone 4: AI Lesson Planning Engine (Multimodal LLM)

### Objective
Implement the curriculum planning engine that analyzes a user reference image and produces a structured 9-stage JSON pedagogical curriculum.

### Inputs
- Reference image uploaded by user.
- Cloud multimodal API key (Gemini 2.5 Flash / Claude 3.5 Sonnet) or local mock.

### Tasks & Deliverables
1. Design structured prompt engineering template in `backend/app/services/lesson_planner.py`:
   - Directs the LLM to inspect silhouette, geometric construction, primary masses, contour line, and details.
   - Enforces strict Pydantic JSON schema output matching `LessonPlan` (title, subject_category, 9 sequential stage descriptions and prompt modifiers).
2. Implement fallback heuristic planner for offline development or when API quota is unavailable.
3. Validate schema compliance with Pydantic v2 parser.

### Outputs
- `LessonPlan` generator returning validated 9-stage drawing curricula.
- Fixture test dataset containing pre-computed curricula for 5 sample subjects (animal, vehicle, face, character, still life).

### Acceptance Criteria & Testing Protocol
- `lesson_planner.generate_plan(image_bytes)` returns valid JSON adhering to the 9-stage schema.
- Stage 1 consistently describes rough geometric primitives (circles, boxes, cylinders).
- Stage 9 consistently describes finished rendering and contrast.

### Risk & Mitigation
- **Risk**: LLM hallucination producing non-JSON output or invalid step counts.
- **Mitigation**: Enforce strict JSON mode in API call and apply Pydantic validation retry loop.

---

## Milestone 5: Generation Pipeline Integration (ComfyUI WebSocket Bridge)

### Objective
Integrate the FastAPI backend with ComfyUI's REST and WebSocket interfaces to submit workflows dynamically and stream live generation progress to the user.

### Inputs
- Validated ComfyUI headless instance (Milestone 1).
- Workflow template (Milestone 2).
- Lesson plan output (Milestone 4).

### Tasks & Deliverables
1. Build `ComfyUIClient` in `backend/app/services/comfy_client.py`:
   - `upload_image(file_bytes)` $\rightarrow$ `POST /upload/image`
   - `queue_prompt(workflow_dict)` $\rightarrow$ `POST /prompt`
   - `listen_progress(prompt_id)` $\rightarrow$ `WebSocket /ws` to capture node execution and step percentages.
2. Build dynamic workflow builder:
   - Injects the uploaded reference image into the ControlNet preprocessor node.
   - Injects the 9 stage prompts from the Lesson Plan into the 9 `ConditioningSetArea` nodes.
3. Stream execution status to the backend queue manager.

### Outputs
- End-to-end Python client capable of running a prompt from code, tracking progress, and downloading the output image buffer.

### Acceptance Criteria & Testing Protocol
- Backend submits a test workflow, receives real-time node progress over WebSocket, and successfully captures the output filename upon execution completion.

### Risk & Mitigation
- **Risk**: WebSocket connection drops during long generation cycles.
- **Mitigation**: Implement automatic reconnection and fallback polling via `GET /history/{prompt_id}`.

---

## Milestone 6: Image Processing, Grid Slicing & Quality Assurance

### Objective
Build a deterministic image processing service that takes the generated 3×3 grid sheet, validates dimensions, slices it into 9 stage images using native Pillow, and registers them in the database.

### Inputs
- 1536×1536 (or 1152×1152) generated grid image from ComfyUI output.

### Tasks & Deliverables
1. Implement `GridSlicer` service in `backend/app/services/image_processor.py`:
   - Calculates cell offsets accounting for optional 16px dead-space gutters:
     $$\text{Box}(c, r) = [c \cdot (W_c + G), r \cdot (H_c + G), c \cdot (W_c + G) + W_c, r \cdot (H_c + G) + H_c]$$
   - Slices 9 distinct images and saves them as web-optimized JPEG/PNG in `backend/data/stages/{tutorial_id}/stage_{n}.png`.
   - Generates responsive thumbnails (256×256) for UI step strips.
2. Implement automated quality checks:
   - Structural density verification (verifies later stages contain higher line density than earlier stages).
   - Empty/black/blank image detection.

### Outputs
- 9 cleanly cropped stage images and thumbnails stored on disk and linked in SQLite.
- Slicing benchmark verifying execution time $< 80\text{ ms}$ for all 9 cells.

### Acceptance Criteria & Testing Protocol
- Slicing 1536×1536 grid yields exactly 9 512×512 images without edge artifacts or bleed lines from adjacent cells.
- Processing completes in under 100ms on AMD Ryzen 7 7435HS.

### Risk & Mitigation
- **Risk**: Outer border line art leaking into border cells.
- **Mitigation**: Add 8px inner margin crop when saving sliced stages.

---

## Milestone 7: Interactive Frontend Drawing Tutor (React 19 + Canvas)

### Objective
Build the responsive React 19 web application where users can view step-by-step tutorials, compare their drawing with the reference, and draw directly on an interactive HTML5 canvas.

### Inputs
- Existing Vite + React 19 + Tailwind CSS v4 codebase in `frontend/`.

### Tasks & Deliverables
1. Build tutorial navigation components:
   - `StepTimeline`: Horizontal progression strip showing 9 stages with active state indicators.
   - `StageViewer`: High-resolution display of current stage image with zoom, pan, and stage description.
   - `ReferenceSideBySide`: Toggleable side-by-side view showing the original reference photo alongside the drawing stage.
2. Build interactive `DrawingCanvas` component:
   - Freehand brush, eraser, stroke color, stroke width, undo/redo stack.
   - "Ghost Tracing / Onion Skinning" mode: Overlays the current AI stage at configurable opacity ($0\% - 100\%$) directly on the user's drawing canvas.
3. Build `UploadModal`: Drag-and-drop reference image upload with real-time generation progress bar.

### Outputs
- Polished, responsive user interface built with Tailwind CSS v4 and Lucide icons.
- Complete interactive drawing experience working in desktop and tablet viewports.

### Acceptance Criteria & Testing Protocol
- Users can switch between steps 1–9 using keyboard arrows or timeline clicks.
- Onion skinning slider smoothly adjusts reference opacity over user canvas without lag.
- Canvas undo/redo supports at least 20 historical states.

### Risk & Mitigation
- **Risk**: Canvas redraw lag on high-DPI displays.
- **Mitigation**: Use offscreen canvas buffer and requestAnimationFrame throttling.

---

## Milestone 8: Full End-to-End System Integration & State Persistence

### Objective
Connect the frontend, backend, ComfyUI engine, and database into a unified, seamless user workflow.

### Inputs
- Completed Milestones 1 through 7.

### Tasks & Deliverables
1. Connect frontend upload to backend `POST /api/tutorials`.
2. Connect backend status polling / SSE to frontend progress indicator.
3. Automatically load the 9 generated stages into the tutorial viewer upon completion.
4. Implement tutorial history gallery: users can browse past tutorials, resume drawing, or delete old sessions.
5. Provide single-command startup script `start_sketchflow.ps1` that launches ComfyUI, FastAPI backend, and Vite frontend.

### Outputs
- Complete working application ready for local demonstration and user testing.
- Unified startup and teardown scripts.

### Acceptance Criteria & Testing Protocol
- User can drop an image into the browser, watch progress reach 100%, and immediately begin drawing through stages 1 to 9.
- System recovers gracefully if a browser tab is refreshed mid-generation.

### Risk & Mitigation
- **Risk**: Backend crash leaves orphaned ComfyUI processes.
- **Mitigation**: Startup script tracks PIDs in a `.pid` lockfile and terminates all child processes on exit.

---

## Milestone 9: Quality Evaluation, Error Recovery & Surgical Inpainting

### Objective
Implement automated post-generation quality scoring and single-cell surgical inpainting for recovering flawed stages without regenerating the entire 3×3 grid.

### Inputs
- Full end-to-end pipeline from Milestone 8.

### Tasks & Deliverables
1. Build `QualityEvaluator` in backend:
   - Compares Edge-SSIM of stage 9 against reference image wireframe.
   - Flags out-of-order stages (e.g., stage 3 having more lines than stage 6).
2. Build surgical cell repair endpoint `POST /api/tutorials/{id}/stages/{stage_num}/regenerate`:
   - Runs a fast single-image img2img or inpainting workflow targeting only the failed cell.
   - Re-inserts the repaired image into the database and updates the tutorial.

### Outputs
- "Regenerate Step" button in the frontend tutor UI for seamless user recovery.
- Automated quality score logged for every generation.

### Acceptance Criteria & Testing Protocol
- Triggering single-stage regeneration completes in $< 6\text{ seconds}$ without modifying the remaining 8 stages.

### Risk & Mitigation
- **Risk**: Repaired stage does not match the artistic style of surrounding stages.
- **Mitigation**: Condition the repair workflow on the same ControlNet lineart wireframe and base seed.

---

## Milestone 10: Advanced Tutor Features & Export Tools

### Objective
Add professional drawing tutor features: time-lapse replay, PDF worksheet export, side-by-side grading, and downloadable printable practice sheets.

### Inputs
- Stable integrated system from Milestone 9.

### Tasks & Deliverables
1. Build `PrintableWorksheetGenerator`:
   - Uses Pillow / ReportLab to generate a high-resolution 300 DPI printable PDF with the 9 steps and practice drawing boxes.
2. Build `UserDrawingEvaluator`:
   - User can snap a photo of their physical paper drawing or export digital canvas.
   - AI highlights contour accuracy and provides encouraging feedback.
3. Implement dark/light theme toggle and customizable UI preferences.

### Outputs
- Production-ready SketchFlow AI application with comprehensive export and educational tooling.

### Acceptance Criteria & Testing Protocol
- Generated PDF prints cleanly onto standard A4 / Letter paper with high-contrast line art.
- User drawing comparison provides constructive, beginner-friendly textual feedback.
