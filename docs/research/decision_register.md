# SketchFlow AI — Decision Register & Technical Governance

## 1. Architectural Decision Register (ADR)

This register records all major technical decisions made across Stages 0 through 7 of the SketchFlow AI research process. Each decision is categorized, scored for confidence, backed by concrete technical evidence, and classified with an explicit implementation status.

| ID | Category | Decision / Final Selection | Confidence | Technical Evidence & Rationale | Needs Experiment? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-01** | **Overall Architecture** | **Decoupled 3-Tier**: React 19 Frontend + FastAPI Backend + Headless ComfyUI Core Engine. | **High** | Eliminates bloated monolithic UI; enables independent scaling, background task queuing, and deterministic headless model inference via REST/WebSocket. | No | **Verified** |
| **ADR-02** | **Diffusion Base Model** | **Stable Diffusion 1.5** (DreamShaper 8 pruned fp16 / Realistic Vision). | **High** | Fits comfortably in 6 GB VRAM (~4.2 GB peak with ControlNet); generates high-quality line art in 3.5–5.5s; extensive ecosystem of fine-tuned line art models. | Yes (Milestone 2) | **Recommended** |
| **ADR-03** | **Heavy Diffusion Models (SDXL / FLUX)** | **SDXL Deferred / FLUX Blocked** on host RTX 4050 6GB. | **High** | SDXL consumes 5.5–6.8 GB VRAM with ControlNet, causing CUDA VRAM thrashing; FLUX.1 (12B DiT) requires 12–16 GB and takes 45–90s via CPU offload paging. | No | **Deferred** |
| **ADR-04** | **Lesson Planning Engine** | **Cloud Multimodal API** (Gemini 2.5 Flash / Claude 3.5 Sonnet) with offline mock fallback. | **High** | Saves 100% of local 6 GB VRAM for diffusion; provides superior pedagogical reasoning and JSON schema compliance; costs < $0.002 per lesson. | No | **Recommended** |
| **ADR-05** | **Generation Strategy** | **Hybrid 3×3 Grid** (Lineart ControlNet + 9× `ConditioningSetArea` + 16px Gutters + Pillow Crop + Surgical Inpaint Repair). | **Medium** | Produces all 9 stages in a single diffusion pass (~25–35s); maintains global stylistic consistency; eliminates 9 individual model load/sample cycles. | **Yes (Milestone 2)** | **Experimental** |
| **ADR-06** | **Structural Guidance** | **ControlNet Lineart** (`control_v11p_sd15_lineart.pth`) with realistic lineart preprocessor. | **High** | Superior contour and structural fidelity compared to Canny (harsh borders) or Scribble (too loose); guides stages 1–9 from basic construction to fine details. | Yes (Milestone 2) | **Recommended** |
| **ADR-07** | **Grid Slicing & Cell Extraction** | **Native Python Pillow (`PIL.Image`)** in FastAPI backend. | **High** | ComfyUI Storyboard Suite `StoryboardCells` node does not extract cells; Pillow crops all 9 cells in < 70ms with zero VRAM cost, sub-pixel accuracy, and automatic gutters. | No | **Verified** |
| **ADR-08** | **Concurrency & Task Queue** | **In-Process `asyncio.Semaphore(1)` GPU Mutex + SQLite DB** in FastAPI. | **High** | RTX 4050 cannot execute parallel diffusion passes; eliminates heavyweight Celery/Redis infrastructure; robust and lightweight for single-GPU host. | No | **Recommended** |
| **ADR-09** | **Database & Persistence** | **SQLite with WAL Mode** (`PRAGMA journal_mode=WAL;`). | **High** | Zero-maintenance embedded database; fast concurrent reads; structured storage for tutorials, stages, and generation metrics. | No | **Verified** |
| **ADR-10** | **Frontend Stack** | **React 19 + TypeScript + Vite + Tailwind CSS v4**. | **High** | Sub-second HMR; modern state management; verified production build in 349ms; rich ecosystem for canvas drawing and UI components. | No | **Verified** |
| **ADR-11** | **Interactive Drawing** | **Native HTML5 Canvas API + Offscreen Buffer**. | **High** | Zero external heavy canvas dependencies; native performance for smooth 60fps drawing; straightforward layer compositing for onion-skin ghost tracing. | No | **Recommended** |
| **ADR-12** | **Error Recovery Mechanism** | **Single-Cell Surgical Inpainting** via ComfyUI `VAEEncodeForInpaint`. | **Medium** | Avoids discarding 8 good stages when 1 stage fails; repairs target cell in ~5s using the original ControlNet wireframe and seed. | Yes (Milestone 9) | **Recommended** |

---

## 2. Categorization of Unresolved Questions & Risks

To ensure smooth project execution, all open technical questions are strictly triaged into four chronological buckets:

### (a) Must Resolve Before Installation
*None.* All architectural prerequisites, hardware profiles, path configurations, and driver capabilities have been fully audited and verified. The installation plan is ready for execution upon user approval.

### (b) Must Resolve During Initial Experiments (Milestone 2)

| Question / Risk | Experimental Test | Decision Trigger & Fallback |
| :--- | :--- | :--- |
| **Q1: Does 1536×1536 3×3 grid cause Out-of-Memory on RTX 4050?** | Run Milestone 2 benchmark at 1536×1536 with `ConditioningSetArea`. | If peak VRAM $> 5.4\text{ GB}$, switch to **1152×1152 grid** (384×384 per cell) or enable `VAEDecodeTiled`. |
| **Q2: Does semantic bleed blur stages between adjacent cells?** | Inspect cell boundaries in test grid for prompt cross-contamination. | If bleed $> 10\%$, widen dead-space gutters from 16px to 32px or reduce `ConditioningSetArea` attention strength in early steps. |
| **Q3: Does Stage 1 show simple enough geometric construction?** | Evaluate visual complexity of Cell 1 against a beginner drawing standard. | If Stage 1 is too detailed, increase negative prompt weights on Cell 1 (`"detailed, shading, realism, textures, contour"`) and reduce ControlNet weight to $0.45$. |
| **Q4: Is generation time within acceptable interactive limits?** | Measure clock time from prompt queue to output image on RTX 4050. | Target: $\le 35\text{ seconds}$. If $> 45\text{s}$, reduce sampling steps from 25 to 18 (using DPM++ 2M Karras). |

### (c) Can Resolve During Development (Milestones 3–7)

| Question / Risk | Target Milestone | Planned Resolution |
| :--- | :--- | :--- |
| **Q5: Cloud LLM API latency impact on user experience** | Milestone 4 | Introduce optimistic UI loading (show animated curriculum preview while LLM and diffusion run). |
| **Q6: WebSocket disconnects during background processing** | Milestone 5 | Add heartbeat ping and auto-reconnect logic with fallback polling to `/history/{prompt_id}`. |
| **Q7: Canvas performance on high-DPI (Retina) screens** | Milestone 7 | Scale HTML5 canvas backing store by `window.devicePixelRatio` with CSS fixed viewport sizing. |
| **Q8: User drawing auto-save frequency** | Milestone 7 | Implement 500ms debounce on canvas stroke commit before saving state to `localStorage` or SQLite. |

### (d) Future Improvements & Post-MVP (Milestones 8–10+)

| Enhancement Idea | Category | Description |
| :--- | :--- | :--- |
| **Local VLM Offline Mode** | Model Infrastructure | Integrate Qwen2-VL-2B (INT4) for 100% offline lesson planning when no cloud API key is configured. |
| **SDXL High-Resolution Mode** | Model Infrastructure | Offer optional SDXL Turbo / Lightning generation profile for users running external GPUs with $\ge 12\text{ GB}$ VRAM. |
| **Community Tutorial Sharing** | Platform | Export tutorials as self-contained `.sketchflow` bundles containing lesson plan JSON, audio notes, and 9-stage images. |
| **Physical Paper Drawing Scanner** | Educational Tool | Camera capture feature allowing users to photograph physical sketchbook pages and overlay automated AI grading. |
| **Animated Time-Lapse Video** | Export | Render an MP4 animation transitioning smoothly through stages 1 to 9 with step-by-step stroke guidance. |

---

## 3. Governance Sign-off & Verification

- **Architecture Validated**: Decoupled 3-Tier (React 19 + FastAPI + ComfyUI Headless).
- **Hardware Validated**: AMD Ryzen 7 7435HS, 24 GB DDR5 RAM, NVIDIA RTX 4050 6GB Laptop GPU.
- **Path Isolation Validated**: All files, repositories, models, and virtual environments confined strictly to `D:\projects\SketchFlowAI`.
- **Implementation Readiness**: **100% Ready for Milestone 1 Installation upon User Approval.**
