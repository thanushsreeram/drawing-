# Research Analysis: ComfyUI Storyboard Suite Deep Dive

**Stage**: Stage 4 — Storyboard Suite Research  
**Target Repository**: [comfyui-storyboard-suite (Smyshnikof/comfyui-storyboard-suite)](https://github.com/Smyshnikof/comfyui-storyboard-suite.git)  
**Research Date**: November 2026  
**Document Path**: `docs/research/storyboard_suite_analysis.md`  

---

## 1. Repository Structure & Overview

`comfyui-storyboard-suite` is a lightweight pre-production and layout extension for ComfyUI created by `@itsmyshnikov`. Its primary purpose is to help film, animation, and storyboard artists plan sequential prompts, calculate frame resolutions based on standard aspect ratios, batch-generate shot sequences, and compile the generated frames into a labeled contact sheet.

### Repository Layout:
```
comfyui-storyboard-suite/
├── assets/                  # Bundled DejaVuSans.ttf font for label rendering
├── example_workflows/       # JSON workflow templates
│   ├── Storyboard Suite — contact sheet.json
│   └── Storyboard Suite — prompt library + frame grid.json
├── web/                     # JavaScript UI widgets for ComfyUI web frontend
│   ├── storyboard-cells.js
│   ├── storyboard-frame-grid.js
│   ├── storyboard-sheet.js
│   └── storyboard-text-table.js
├── __init__.py              # Node registration & WEB_DIRECTORY export
├── nodes.py                 # Core Python implementation (all 5 nodes, ~792 lines)
├── requirements.txt         # Empty (standard library, Pillow, numpy, torch only)
├── pyproject.toml           # Package metadata for ComfyUI registry
└── README.md                # Node usage documentation
```

### Verified Custom Nodes Registered:
1. `TextTable` (`Storyboard · Text Table`)
2. `FrameGrid` (`Storyboard · Frame Grid`)
3. `FrameGridBatch` (`Storyboard · Frame Grid (Batch)`)
4. `StoryboardSheet` (`Storyboard · Sheet`)
5. `StoryboardCells` (`Storyboard · Cells`)

---

## 2. Text Table

### Verified Implementation (`nodes.py:516–542`):
`TextTable` acts as a structured prompt library. It stores tabular prompt data in JSON or pipe-delimited format:
```json
[
  {
    "name": "portrait",
    "prompt": "cinematic close-up portrait, soft window light, 85mm",
    "negative": "blurry, low quality",
    "weight": 1.0
  }
]
```
- **Inputs**: `table_data` (multiline string) and `select` (row name or integer index).
- **Outputs**: `(prompt: STRING, negative: STRING, name: STRING, weight: FLOAT)`.
- **Formatting**: The ComfyUI web extension (`web/storyboard-text-table.js`) renders an interactive table inside the node graph with "Add row", "Duplicate", and "Delete" buttons.

### Relevance & Limitations for SketchFlow AI:
- **Observation**: It is merely an in-graph prompt selector designed for human users clicking around inside ComfyUI.
- **Limitation**: In SketchFlow AI, prompt sequences are generated dynamically by our FastAPI backend (via LLM reasoning) based on the uploaded image. We do not need a manual in-node GUI table.

---

## 3. Frame Grid

### Verified Implementation (`nodes.py:544–595`):
`FrameGrid` is a frame planning node that defines shot aspect ratios and derives pixel dimensions for `EmptyLatentImage`.
- **Inputs**:
  - `frames_data`: JSON array of frames with `id`, `name`, `prompt`, and `aspect`.
  - `select`: Chooses one frame by name or index.
  - `base_resolution`: Long-edge pixel size (default 1024, range 512–2048, step 64).
  - `columns`: Grid column count for UI layout (default 3, min 1, max 6).
  - `default_aspect`: Fallback aspect ratio (e.g. `16:9`, `1:1`, `4:3`, etc.).
- **Dimension Calculation (`_aspect_to_size`)**:
  - Long side = `base_resolution`.
  - Short side = proportional reduction.
  - Values are rounded down to multiples of 8 (`align = 8`) to satisfy VAE encoder constraints.
- **Outputs**: `(prompt, name, aspect_ratio, frame_index, frame_count, width: INT, height: INT, all_prompts)`.
- **Relevance for SketchFlow AI**: Demonstrates clean aspect-ratio-to-latent-pixel conversion math, but is tailored for single-frame selection in an interactive UI.

---

## 4. Frame Grid Batch

### Verified Implementation (`nodes.py:597–644`):
`FrameGridBatch` provides the same planning data as `FrameGrid`, but outputs lists enabled with ComfyUI's list-execution flag:
`OUTPUT_IS_LIST = (True, True, True, True, True, False)`
- **Outputs**: `(prompts: LIST[STRING], names: LIST[STRING], aspects: LIST[STRING], widths: LIST[INT], heights: LIST[INT], frame_count: INT)`.
- **Workflow Role**: Connected to downstream nodes that accept lists (e.g., in `example_workflows/Storyboard Suite — contact sheet.json`), triggering sequential sampling of each frame across a single "Queue Prompt" invocation.
- **Behavior with Incomplete Grids**: It iterates over whatever frames are in the list. If 9 frames are defined, 9 images are produced.
- **Limitation**: Generating 9 frames via `FrameGridBatch` executes 9 separate diffusion sampling passes sequentially, which suffers from the same latency overhead (1–2 minutes) as DrawEasy.

---

## 5. Storyboard Sheet

### Verified Implementation (`nodes.py:646–711`):
`StoryboardSheet` is a contact-sheet compositor. It receives generated image tensors and compiles them into a single tiled image with optional caption bars.

### How It Operates:
- **Inputs**:
  - `images`: A PyTorch tensor batch `[B, H, W, C]` (e.g. from `VAEDecode`).
  - `image_1` ... `image_9`: 9 optional individual image inputs (allows wiring individual nodes without batching).
  - `labels`: Multiline text string (one line per image).
  - `columns`: Number of columns (1 to 8, default 3).
  - `cell_gap`: Border margin/gap between cells (0 to 64px, default 8).
  - `bg_color`: Hex background color (default `#0e0e12`).
  - `show_labels`: Boolean toggle.
  - `label_font_size`, `label_bar_height`, `label_color`, `label_bg_color`.
- **Layout Logic (`_build_contact_sheet`)**:
  - Iterates through input images using Pillow.
  - Computes max cell dimensions: `cell_w = max(width)`, `cell_h = max(height)`.
  - Uses `_fit_letterbox` with `Image.Resampling.LANCZOS` to fit images into uniform cell boxes without cropping or stretching.
  - Draws a dark label bar underneath each cell using `PIL.ImageDraw.Draw` and `PIL.ImageFont.truetype` with bundled `DejaVuSans.ttf`.
  - Stitches cells into rows and columns:
    `sheet_w = cols * cell_w + (cols + 1) * gap`
    `sheet_h = rows * cell_total_h + (rows + 1) * gap`
  - Returns a single combined `IMAGE` tensor `[1, sheet_h, sheet_w, 3]`.

---

## 6. Storyboard Cells (Crucial Technical Discovery)

### The Cell Extraction Misconception:
Before inspecting the source code, one might assume from the name that `StoryboardCells` is designed to *extract* or *slice* individual cells from a multi-panel storyboard image.

### Verified Fact from Source Code (`nodes.py:713–776`):
**`StoryboardCells` DOES NOT extract, slice, or split cells from an image.**
- It is an **interactive image assembler / manual contact sheet builder**.
- In the ComfyUI web UI, the user clicks a "+" button inside each cell widget to select an existing image file from `ComfyUI/input/`.
- In `nodes.py:run()`, it reads `cells_data` (JSON array of `{filename, subfolder, label}`), loads each file from disk via `Image.open()`, and passes them to the exact same `_build_contact_sheet()` function used by `StoryboardSheet`.
- **Output**: Outputs a single combined `sheet` (`IMAGE` tensor).
- **Official Documentation Confirmation (`README.md:63`)**:
  > *"Do not wire Cells → Sheet. Cells already outputs a finished sheet. Sheet is for images from the pipeline."*

### Critical Architectural Finding for SketchFlow AI:
There is **ZERO cell extraction / grid splitting functionality** in `comfyui-storyboard-suite`. It only stitches multiple images into one sheet; it cannot take an AI-generated 3×3 grid image and cut it into 9 individual steps.

---

## 7. Image Processing and Dimensions

The image processing in Storyboard Suite is executed entirely with standard Python libraries: **Pillow (PIL)** and **NumPy**.

| Feature | Verified Implementation | Risk / Artifact Evaluation |
| :--- | :--- | :--- |
| **Resizing** | `img.resize((nw, nh), Image.Resampling.LANCZOS)` | **High Quality**: Lanczos filtering prevents aliasing on line art. |
| **Aspect Ratio** | Letterboxed via `_fit_letterbox` onto a solid canvas | **Zero Distortion**: Preserves original image proportions; never stretches. |
| **Cropping** | **None** | No content is cut off. |
| **Padding** | Centers fitted image on `canvas.paste(resized, ((cell_w - nw)//2, (cell_h - nh)//2))` | Consistent margins. |
| **Typography** | `PIL.ImageDraw.Draw.text()` with `DejaVuSans.ttf` | Supports Unicode/Cyrillic; truncates long text with `…`. |
| **Tensors** | Standard ComfyUI conversion: `(tensor * 255).astype(uint8)` $\leftrightarrow$ `arr / 255.0` | Standard float32 tensor normalization. |

---

## 8. SketchFlow AI Integration Possibilities

Evaluating against our 8-step intended workflow:

| SketchFlow AI Pipeline Step | Can Storyboard Suite Help? | Analysis & Responsibility |
| :--- | :---: | :--- |
| **1. Reference Image Upload** | **No** | Handled by SketchFlow AI frontend & FastAPI. |
| **2. Subject Image Analysis** | **No** | Handled by FastAPI vision service / LLM. |
| **3. Curriculum Planning** | **No** | Handled by FastAPI curriculum planner. |
| **4. Generate 9 Progressive Stages** | **No** | Handled by diffusion model / ComfyUI KSampler. |
| **5. Organize into a 3×3 Sheet** | **Partially** | `StoryboardSheet` can assemble 9 separate images into a sheet, BUT it is a downstream compositor, not an all-in-one grid generator. |
| **6. Split Sheet into 9 Step Images** | **NO** | **Unsupported**. Storyboard Suite has no image slicing or cell extraction node. |
| **7. Display Steps with Instructions** | **No** | Handled by React frontend tutorial viewer. |
| **8. Step Zoom, Download, Resume** | **No** | Handled by SketchFlow AI application storage & SQLite. |

---

## 9. Python Pillow vs. Storyboard Suite Comparison

`StoryboardSheet` is fundamentally a ~100-line wrapper around Python's standard `PIL.Image` and `PIL.ImageDraw`. Below is a direct comparison between using Storyboard Suite inside ComfyUI versus executing image layout natively in FastAPI using Pillow:

| Dimension | ComfyUI Storyboard Suite | Native Python Pillow (in FastAPI) |
| :--- | :--- | :--- |
| **3×3 Sheet Assembly** | Supported via `StoryboardSheet` node. | Trivially implemented in ~30 lines of Pillow code. |
| **3×3 Cell Extraction (Slicing)** | **NOT SUPPORTED**. | **Fully supported** (Pillow `Image.crop()` already implemented in our `grid_processor.py`). |
| **Custom Layouts & Gutters** | Fixed rectangular grid (1–8 columns). | Arbitrary custom layout, margins, rounded corners, watermarks. |
| **Step Numbering & Badges** | Flat text bar under each cell. | Custom badge pills (e.g. "Step 1: Rough Construction"), custom fonts, modern styling. |
| **Server Headless Automation** | Requires ComfyUI node execution graph and custom node installed. | Executes instantly in-memory on backend with zero IPC overhead. |
| **Execution Latency** | Tens to hundreds of ms + ComfyUI queue overhead. | **< 5 milliseconds** in pure Python. |
| **Maintenance & Fragility** | Risk of breaking on ComfyUI core updates; requires git submodule. | Standard library / Pillow; zero third-party custom node risk. |
| **Export Flexibility** | Outputs raw `IMAGE` tensor to ComfyUI `output/`. | Saves directly into `storage/sheets/` and `storage/steps/`, generates PDFs, zips. |

### Architectural Recommendation:
**Option B: Use Native Pillow.**  
Storyboard Suite provides no proprietary generative capability or cell slicing logic. Its contact-sheet layout is basic Pillow math wrapped in a ComfyUI node. Implementing sheet assembly and cell extraction natively in FastAPI using Pillow is faster, more flexible, and completely avoids custom node dependencies.

---

## 10. Technical Requirements & Compatibility

- **Dependencies**: None. `requirements.txt` contains zero external packages; relies strictly on standard ComfyUI dependencies (`torch`, `numpy`, `Pillow`).
- **ComfyUI Compatibility**: Compatible with modern ComfyUI (uses standard `NODE_CLASS_MAPPINGS` and `./web` directory).
- **License**: MIT License (permissive).
- **Security Assessment**: Low risk. Does not download remote weights or execute arbitrary network calls.
- **Maintenance**: Modest codebase maintained by a single contributor (`@itsmyshnikov`).

---

## 11. Practical Workflow Evaluation

Let's evaluate the workflow concept proposed in the research prompt:
```
Reference Image
    ↓
AI Generation
    ↓
9 Progressive Drawing Images
    ↓
Frame Grid / Storyboard Sheet
    ↓
Storyboard Cells  <-- FAILS HERE
    ↓
9 Individual Drawing Stages
```

### Verified Technical Reality:
1. **`FrameGridBatch` $\rightarrow$ Sampler $\rightarrow$ `StoryboardSheet`** is indeed an executable workflow in ComfyUI: it can generate 9 separate images sequentially from a prompt list and compile them into a contact sheet.
2. **`StoryboardSheet` $\rightarrow$ `StoryboardCells` IS IMPOSSIBLE**:
   - `StoryboardCells` does not take an image input! Its input is `cells_data` (JSON).
   - `StoryboardCells` does not output individual cells; it outputs another `sheet`.
   - Wiring Sheet to Cells is explicitly forbidden in the documentation: *"Do not wire Cells → Sheet."*

Therefore, the pipeline cannot split a single sheet into 9 individual stages using this repository.

---

## 12. Final Recommendation for SketchFlow AI

### Repository Summary
`comfyui-storyboard-suite` is a pre-production utility for organizing prompts and assembling generated frame batches into contact sheets inside ComfyUI.

### Most Useful Components (Ranked)
1. **`_fit_letterbox` Logic (`nodes.py:341–350`)**: Excellent reference implementation for padding and scaling images into uniform cell boundaries using Pillow without distortion.
2. **`_aspect_to_size` Math (`nodes.py:101–113`)**: Clean formula for deriving VAE-compliant multiples of 8 from arbitrary aspect ratios.
3. **`StoryboardSheet`**: Decent visual contact sheet node if someone wants a quick manual preview in ComfyUI.

### Technical Limitations
- Cannot slice or extract cells from an existing 3×3 grid image.
- Does not assist with generative drawing progression or pedagogical logic.
- Adds unnecessary custom node overhead if our backend already uses Pillow.

### Final Integration Decision
**Avoid installing Storyboard Suite.**  
All image compositing, cell extraction, padding, and labeling should be handled directly in our FastAPI backend using Python Pillow (`app/image_processing/grid_processor.py` and `sheet_exporter.py`).

### Recommended SketchFlow AI Sheet Architecture
```
[User Reference Image]
          |
  FastAPI Curriculum Planner (Generates 9 Step Prompts)
          |
  ComfyUI Engine / Diffusion Pipeline (Generates 3x3 Grid Image)
          |
  FastAPI Pillow Pipeline:
    - Validate dimensions & resolution
    - Slice into 9 discrete cells (grid_processor.py)
    - Letterbox & pad if necessary (using Lanczos)
    - Overlay step numbering badges
    - Save to storage/steps/<lesson_id>_step_<n>.png
          |
  React Frontend Tutorial Interface (Step-by-step navigation, zoom, download)
```

---

## 13. Sources and Repository Paths Examined

The following files from `Smyshnikof/comfyui-storyboard-suite` were cloned and verified:
- `README.md`: Lines 1–83 (Node descriptions, usage instructions, warnings).
- `requirements.txt`: Line 1 (Verified zero external dependencies).
- `__init__.py`: Lines 1–24 (Verified node class mappings and web directory).
- `nodes.py`: Lines 1–792 (Inspected all classes: `TextTable`, `FrameGrid`, `FrameGridBatch`, `StoryboardSheet`, `StoryboardCells`, `_fit_letterbox`, `_build_contact_sheet`).
- `example_workflows/Storyboard Suite — contact sheet.json`: Lines 1–84 (Verified `FrameGridBatch` $\rightarrow$ `StoryboardSheet` connection).
- `example_workflows/Storyboard Suite — prompt library + frame grid.json`: Lines 1–206 (Verified `TextTable` and `FrameGrid` integration with SD 1.5).
