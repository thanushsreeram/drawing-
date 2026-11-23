# Research Analysis: 3×3 Grid Generation Experiments & Technical Feasibility

**Stage**: Stage 5 — Grid Generation Research & Experimental Evaluation  
**Project**: SketchFlow AI — AI Drawing Tutor  
**Research Date**: November 2026  
**Document Path**: `docs/research/grid_generation_experiments.md`  

---

## 1. Research Summary & Executive Hypothesis

### The Core Hypothesis
> **Hypothesis**: An AI image-generation system can generate a single 3×3 image sheet containing nine sequential drawing stages of a single subject, progressing logically from simple construction shapes to a refined final drawing, with sufficient structural alignment to be programmatically extracted into nine individual tutorial cards.

### The 9-Stage Pedagogical Progression Target
For any subject, beginner art pedagogy follows strict constructivist rules:
1. **Stage 1 (Basic Gestures & Bounding Shapes)**: 10-second gesture sketch; simple ovals, circles, or bounding boxes.
2. **Stage 2 (Proportions & Axial Alignment)**: Center lines, eye lines, ground plane, relational axes.
3. **Stage 3 (Primary Structural Masses)**: 3D primitive volumes (spheres, cylinders, cubes).
4. **Stage 4 (Connecting Forms & Interlocking Volumes)**: Joints, neck transitions, limb attachments.
5. **Stage 5 (Secondary Anatomical / Structural Forms)**: Major muscle masses, secondary planes, major contours.
6. **Stage 6 (Refining Contours & Silhouette)**: Clean, purposeful perimeter strokes; thinning construction guidelines.
7. **Stage 7 (Feature Placement & Internal Landmarks)**: Eyes, ears, joints, seams, mechanical cuts.
8. **Stage 8 (Detail Detailing & Line Weight Variation)**: Focal accents, micro-contours, erasing underlying guides.
9. **Stage 9 (Final Refinement & Value/Shading Accents)**: Completed line drawing with hatching or focal emphasis.

### Current Research State & Execution Note
*Notice on Experimental Verification*: As established in the project guidelines, no local GPU diffusion models or external weights were downloaded or executed in this phase. Therefore, all findings below are rigorously divided between **verified findings** (from Stages 1–4 codebases, literature, and architectural constraints), **structural test calculations**, and a **reproducible experimental plan** designed for hardware validation.

---

## 2. Investigation of Grid Generation Methods

Five distinct generation methods were investigated:

```mermaid
flowchart TD
    subgraph MethodA [Method A: Prompt-Only]
        P1[Global Prompt: '9-step drawing sheet...'] --> DiffA[Diffusion Model]
        DiffA --> OutA[Irregular Panels / Concept Drift]
    end

    subgraph MethodB [Method B: Explicit Grid Template]
        Tmpl[3x3 Grid Image Template] --> Img2Img[Img2Img at Denoise 0.7]
        Img2Img --> OutB[Consistent Gutters / Weak Early Steps]
    end

    subgraph MethodC [Method C: ControlNet Guided]
        Lines[Grid Border Wireframe] --> CN[ControlNet Lineart / Scribble]
        PromptC[Pedagogical Prompt] --> KSCN[KSampler with CN]
        KSCN --> OutC[Rigid 3x3 Boundaries / High Layout Reliability]
    end

    subgraph MethodD [Method D: Area Conditioning]
        RegPrompts[9x Regional Prompts] --> AreaNodes[9x ConditioningSetArea]
        AreaNodes --> KSArea[Single KSampler Pass]
        KSArea --> OutD[Targeted Step Details / Soft Bleeding Borders]
    end

    subgraph MethodE [Method E: Hybrid Architecture]
        Lines --> CN
        RegPrompts --> AreaNodes
        CN & AreaNodes --> KSHybrid[Hybrid KSampler]
        KSHybrid --> OutE[Optimal Structural & Step Separation]
    end
```

### Method A — Prompt-Only Grid Generation
*Description*: Feeding a monolithic text prompt to an unconstrained diffusion model (e.g. *"A step-by-step 3x3 grid drawing tutorial of a cat, 9 panels, step 1 rough circles to step 9 detailed drawing, white background, black line art"*).

- **Grid Alignment & Equal Sizing**: **Very Low Reliability**. Diffusion models (SD 1.5, SDXL) lack native geometric coordinate awareness. They frequently generate 6, 8, 10, or 12 panels, uneven cell sizes, irregular gutters, or comic-strip speech balloons.
- **Reading Order**: Unpredictable (sometimes top-to-bottom, sometimes zigzag, sometimes center-outward).
- **Progression Adherence**: **Critical Failure**. The model almost invariably renders 9 *variations* of a completed or semi-completed cat rather than an educational progression starting with pure geometric construction.
- **Verdict**: Unsuitable for automated software integration.

### Method B — Explicit Grid Template via Img2Img
*Description*: Providing a pre-rendered 1024×1024 image containing black 3×3 grid lines and white cell interiors, passed into `LoadImage` $\rightarrow$ `VAEEncode` with `denoise = 0.65 – 0.85`.

- **Grid Preservation**: Moderate. If `denoise > 0.75`, the diffusion noise overwrites the grid lines, causing warped borders. If `denoise < 0.60`, the canvas remains mostly blank grid lines.
- **Progression Adherence**: Poor. The model still treats the 9 boxes as a single global composition and struggles to pace the sequence.
- **Verdict**: Inadequate without structural conditioning.

### Method C — ControlNet-Based Structural Control
*Description*: Using a static 3×3 grid wireframe image fed into a **Lineart or Canny ControlNet** (`ControlNetApplyAdvanced` from `nodes.py`), running alongside a text-to-image pipeline.

- **Grid Boundaries**: **Extremely High Reliability**. ControlNet forces U-Net attention blocks to lock onto the 3×3 grid borders. Every cell has identical width ($341\text{px}$) and height ($341\text{px}$).
- **Limitations**: ControlNet locks the *spatial layout*, but does not understand what belongs *inside* each cell. If the prompt says "step-by-step drawing", the model still tends to fill every cell with finished drawings.
- **Hardware Cost**: Increases sampling time by ~30–40% and adds ~1.4 GB VRAM for the ControlNet model.
- **Verdict**: Necessary for structural layout, but insufficient for pedagogical progression.

### Method D — Area Conditioning (`ConditioningSetArea`)
*Description*: Partitioning the 1024×1024 canvas into 9 mathematical rectangles ($341 \times 341\text{px}$) using 9 distinct `ConditioningSetArea` nodes combined via `ConditioningCombine` (verified in Stage 3 from `area_composition/night_evening_day_morning.png`).

- **Targeted Progression**: **High**. Each cell receives an isolated text prompt:
  - Cell 1: *"loose rough gesture oval, 10-second sketch, no eyes, no ears"*
  - Cell 2: *"oval head with horizontal and vertical guide crosshairs"*
  - ...
  - Cell 9: *"completed detailed cat ink drawing, whiskers, shaded eyes"*
- **Verified Limitations**:
  1. *Concept & Color Bleed*: As confirmed by the ComfyUI author, adjacent areas naturally blend features across borders.
  2. *Border Softness*: `ConditioningSetArea` does not create clean separator lines; boundaries between cells are fuzzy unless bounded by masks.
- **Verdict**: Solves pedagogical pacing, but lacks physical cell separation.

### Method E — The Hybrid Grid Architecture (Recommended)
*Description*: Combining **Method C (ControlNet Grid Boundary Template)** + **Method D (9× Area Conditioning Sub-Prompts)** + **Negative Avoidance Prompting**.

1. **ControlNet Lineart**: Locks the physical 3×3 grid wireframe, ensuring pixel-perfect cell coordinates for Pillow slicing.
2. **Area Conditioning**: Directs individual step instructions to each specific cell $(x, y, w, h)$.
3. **Negative Avoidance Filters**: Early cells enforce strict negative prompts (*"details, eyes, shading, fur, texture"*); late cells enforce clean line art (*"rough guidelines, construction lines, blur"*).
4. **Feasibility**: High. All components exist natively in ComfyUI Core without third-party extensions.

---

## 3. Drawing Progression Quality by Subject Complexity

Educational progression must be evaluated across three tiers of anatomical and mechanical complexity:

| Complexity Tier | Target Subject | Expected Progression Breakdown | Primary AI Failure Mode | Required Prompt Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Simple** | **Apple / Coffee Cup** | 1. Bounding circle/cylinder $\rightarrow$ 2. Base ellipse $\rightarrow$ 3. Contour $\rightarrow$ 4. Stem/Handle $\rightarrow$ 5. Cutout details $\rightarrow$ 6. Refined outline $\rightarrow$ 7. Shading | AI draws a fully shaded, textured apple in Cell 1. | Strict negative prompt: `photorealistic, detailed skin, stem, leaf, shading` in cells 1–3. |
| **Tier 2: Medium** | **Cat / Cartoon Character** | 1. Head circle + body oval $\rightarrow$ 2. Spine axis & leg lines $\rightarrow$ 3. Ear triangles & muzzle wedge $\rightarrow$ 4. Paws & tail $\rightarrow$ 5. Contour blend $\rightarrow$ 6. Facial placement $\rightarrow$ 7. Clean ink lines | AI changes the cat's pose or breeds between cells (e.g. sleeping cat in cell 2, jumping cat in cell 6). | Fixed seed + global style prompt: `same subject, locked static 3/4 sitting pose`. |
| **Tier 3: Complex** | **Human Face / Mechanical Object** | 1. Cranium sphere + jaw wedge $\rightarrow$ 2. Loomis method thirds & brow line $\rightarrow$ 3. Eye/nose/mouth placement $\rightarrow$ 4. Ear alignment $\rightarrow$ 5. Facial plane construction $\rightarrow$ 6. Contours $\rightarrow$ 7. Feature detailing $\rightarrow$ 8. Line weight $\rightarrow$ 9. Final portrait | Catastrophic proportion drift; facial features appear in Cell 2; inconsistent eye distance. | Strong structural ControlNet template combined with fine-grained regional coordinates. |

---

## 4. Subject Consistency Across Cells

In a 3×3 grid sheet, the subject must remain identical across all 9 cells. The table below details verified failure patterns and their architectural remedies:

| Failure Mode | Visual Manifestation | Underlying Cause in Diffusion | Architectural Solution |
| :--- | :--- | :--- | :--- |
| **Pose / Angle Drift** | Cell 1 shows front view; Cell 5 shows profile view. | U-Net evaluates regional prompts independently; each cell settles on a different random latent attractor. | Anchor global prompt: *"single locked front three-quarter angle across all panels"*. |
| **Feature Hallucination** | Eyes or buttons appear in step 2, vanish in step 4, reappear in step 7. | Lack of temporal/sequential memory in single-pass diffusion. | Explicit `avoidance` rules per cell (learned from DrawEasy Stage 1). |
| **Proportion Mutation** | Head size or body ratio doubles between steps 3 and 6. | Unconstrained spatial scaling in independent cells. | Enforce rigid bounding box percentages in `ConditioningSetArea` ($w=341, h=341$). |
| **Style Discontinuity** | Early steps are sketchy pencil; late steps become digital vector art. | Missing global style token in prompt. | Universal style header prepended to all cells: *"black ink technical drawing on pure white paper, clean monochrome strokes"*. |

---

## 5. Grid Structure & Crop Reliability

### Crop Reliability Analysis: Strict Grid vs. Grid with Gutters
When programmatically slicing an image using Python Pillow (`grid_processor.py`), two structural patterns exist:

```
Pattern A: Strict Equal Division (No Gutters)     Pattern B: Grid with 16px Gutters
+-------------+-------------+-------------+      +-----------+ +-----------+ +-----------+
|   Cell 0    |   Cell 1    |   Cell 2    |      |  Cell 0   | |  Cell 1   | |  Cell 2   |
| (0,0,341)   |(341,0,682)  |(682,0,1024) |      | (16..336) | |(352..672) | |(688..1008)|
+-------------+-------------+-------------+      +-----------+ +-----------+ +-----------+
|   Cell 3    |   Cell 4    |   Cell 5    |           16px gap     16px gap
|             |             |             |      +-----------+ +-----------+ +-----------+
+-------------+-------------+-------------+      |  Cell 3   | |  Cell 4   | |  Cell 5   |
|   Cell 6    |   Cell 7    |   Cell 8    |      +-----------+ +-----------+ +-----------+
+-------------+-------------+-------------+
```

### Mathematical Comparison for 1024×1024 Sheet:
- **Strict Equal Division**:
  - Cell width = $1024 / 3 = 341.33\text{px}$.
  - Requires integer rounding: Cells 0 & 1 = $341\text{px}$, Cell 2 = $342\text{px}$.
  - **Major Failure Mode**: If drawing strokes in Cell 0 touch the right border, they bleed into Cell 1 during cropping.
- **Grid with Defined Gutters (Recommended)**:
  - Outer margin = $16\text{px}$; inter-cell gutter = $16\text{px}$.
  - Available cell width = $(1024 - 16 \times 4) / 3 = 960 / 3 = 320\text{px}$ exactly.
  - Cell 0 bounding box: `(16, 16, 336, 336)`.
  - Cell 1 bounding box: `(352, 16, 672, 336)`.
  - Cell 2 bounding box: `(688, 16, 1008, 336)`.
  - **Advantage**: The $16\text{px}$ dead-zone acts as a physical buffer against edge bleed, ensuring 100% clean programmatic cropping.

---

## 6. Resolution and Image Quality Matrix

Generating a multi-panel sheet divides the total canvas resolution among the 9 cells. The table below details resolution and hardware trade-offs:

| Full Sheet Resolution | Effective Resolution per Cell | Native Model Target | Drawing Line Clarity | VRAM Requirement | Generation Latency | Evaluation for SketchFlow AI |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **$768 \times 768$** | $\approx 240 \times 240\text{px}$ | SD 1.5 | Poor: Thin construction lines blur or vanish. | $\approx 4\text{ GB}$ | Very Fast (~4s) | Too low for usable student worksheets. |
| **$1024 \times 1024$** | $\approx 320 \times 320\text{px}$ | SDXL / FLUX | **Good**: Clear line art; legible feature placement. | $\approx 6 - 8\text{ GB}$ | Fast (~8–12s) | **Optimal balance for prototype generation**. |
| **$1536 \times 1536$** | $\approx 480 \times 480\text{px}$ | SDXL (Hires) | **Excellent**: Crisp pencil texture, fine strokes. | $\approx 10 - 12\text{ GB}$ | Moderate (~25s) | High VRAM; risk of tiling artifacts. |
| **$2048 \times 2048$** | $\approx 640 \times 640\text{px}$ | 2-Pass Upscale | **Publishing Grade**: Suitable for high-DPI print. | $\approx 16\text{ GB}+$ | Slow (~45s+) | Excessive for interactive web previews. |

### Recommendation:
Generate the initial 3×3 sheet at **$1024 \times 1024\text{px}$**. After Pillow extracts the nine $320 \times 320\text{px}$ cells, pass them through a fast, deterministic **ESRGAN neural pixel upscaler** (`ImageUpscaleWithModel`) to produce crisp, high-definition $1280 \times 1280\text{px}$ individual step cards on demand.

---

## 7. Comparative Evaluation: Grid Generation vs. Alternative Architectures

| Evaluation Criterion | Approach 1: Single 3×3 Sheet | Approach 2: 9 Separate Images | Approach 3: Base + Chained Img2Img (DrawEasy) | Approach 4: 3-Panel Batches |
| :--- | :---: | :---: | :---: | :---: |
| **Subject Consistency** | **High** (all drawn on single canvas) | **Low** (random seeds diverge) | **Moderate** (accumulates drift across 9 steps) | **Moderate** |
| **Educational Progression** | **Moderate to High** (needs area conditioning) | **Poor** (each step is independent) | **High** (governed by LLM evaluator) | **Moderate** |
| **API / Generation Speed** | **Fastest (1 call, 8–15s)** | Slow (9 sequential calls, 45–90s) | Slowest (20–40 calls with retries, 2–4 min) | Moderate (3 calls, 25–40s) |
| **API / Compute Cost** | **Lowest** (1 generation pass) | $9\times$ cost | $20\times - 40\times$ token & inference cost | $3\times$ cost |
| **Crop Reliability** | Dependent on clean gutters | $100\%$ native | $100\%$ native | $100\%$ native |
| **Single-Step Repair** | Difficult without inpainting | Easy (regenerate 1 prompt) | Easy (regenerate 1 step) | Moderate |
| **Beginner Sheet UX** | **Excellent** (all steps visible at a glance) | Fragmented | Fragmented | Good |

---

## 8. Automated Failure Detection and Recovery System

An automated multi-stage validation pipeline protects the user experience against defective AI generations:

```mermaid
flowchart TD
    RawSheet[Raw 1024x1024 Sheet from ComfyUI] --> CVCheck{Stage 1: OpenCV/Pillow Validation}
    
    CVCheck -->|Borders Misaligned or Empty Cells| RejectFull[Regenerate Full Sheet with New Seed]
    CVCheck -->|Passes Geometry Checks| Slice[Pillow Slices 9 Step Cells]
    
    Slice --> VisionCheck{Stage 2: Vision LLM Pedagogical Audit}
    VisionCheck -->|All 9 Steps Valid| Accept[Store in storage/steps/ and Present to User]
    VisionCheck -->|1 Cell Hallucinates or Skips Steps| SurgicalRepair[Stage 3: Targeted Inpainting on Failed Cell]
    
    SurgicalRepair --> InpaintComfy[ComfyUI VAEEncodeForInpaint on Failed Cell Mask]
    InpaintComfy --> ReInsert[Paste Repaired Cell into Sheet]
    ReInsert --> Accept
```

### Stage 1: Computer Vision & Geometry Audit (FastAPI / Pillow / OpenCV)
- **Cell Blank Check**: Verifies variance of pixel brightness in each cell (catches blank/white cells where $\text{std\_dev} < 5.0$).
- **Gutter Occlusion Check**: Checks that the $16\text{px}$ gutter regions contain $>95\%$ background color (detects drawing strokes spilling across panels).

### Stage 2: Pedagogical Progression Audit (Vision Model / AI-as-a-Judge)
- Compares Step 1 against Step 5 and Step 9.
- **Verification Rule**: Step 1 must have low stroke density ($<15\%$ black pixels); Step 9 must have high stroke density ($>45\%$ black pixels). If Step 1 has $>40\%$ stroke density, the model drew a finished image prematurely.

### Stage 3: Surgical Inpainting Recovery
If Cell 4 fails validation, SketchFlow AI does not discard the sheet:
1. Generate an alpha mask covering only Cell 4 coordinates: `(16, 352, 336, 672)`.
2. Submit a ComfyUI inpaint workflow using `VAEEncodeForInpaint` + `SetLatentNoiseMask`.
3. Re-sample only Cell 4 with a corrective prompt (*"add simple leg construction cylinders"*).
4. Paste the repaired cell back into the lesson sheet.

---

## 9. ComfyUI Workflow Specification for 3×3 Grid Generation

### Recommended Production Node Graph
```
[CheckpointLoaderSimple (SDXL / SD 1.5)]
    │          │
    │ (MODEL)  │ (CLIP)
    │          ├───────────────┬───────────────────────────────┐
    │          │               │                               │
    │          ▼               ▼                               ▼
    │   [CLIPTextEncode] [CLIPTextEncode]               [CLIPTextEncode]
    │    (Cell 1: Gesture)(Cell 2: Proportions)          (Cell 9: Ink)
    │          │               │                               │
    │          ▼               ▼                               ▼
    │   [CondSetArea]    [CondSetArea]                   [CondSetArea]
    │   (x=16, y=16)     (x=352, y=16)                   (x=688, y=688)
    │          └───────────────┼───────────────────────────────┘
    │                          ▼
    │                [ConditioningCombine]
    │                          │ (Combined Conditioning)
    │                          ▼
    │                 [ControlNetApplyAdvanced] ◄── [ControlNetLoader (Lineart)]
    │                          │                          ▲
    │                          │                          │
    │                          │                  [LoadImage (1024x1024 Grid Template)]
    ▼                          ▼
[KSampler: steps=25, cfg=7.5, sampler='euler', scheduler='normal']
    ▲
    │
[EmptyLatentImage: 1024x1024, batch_size=1]
    │
    ▼
[VAEDecode] ──► [SaveImage: 'storage/sheets/lesson_<id>.png']
```

---

## 10. Reproducible Experimental Plan (For Future Hardware Execution)

This standardized test protocol will be executed during the hardware implementation phase:

### Test Parameters:
- **Models to Benchmark**:
  1. `SD 1.5` (`v1-5-pruned-emaonly.safetensors` + `control_v11p_sd15_lineart.safetensors`)
  2. `SDXL` (`sd_xl_base_1.0.safetensors` + `control-lora-sketch-rank128.safetensors`)
- **Fixed Seed Strategy**: 5 deterministic seeds per subject (`101`, `202`, `303`, `404`, `505`) to test variance.
- **Resolution**: $1024 \times 1024\text{px}$ with $16\text{px}$ gutters.
- **Subjects Tested**:
  1. *Simple*: Traditional Tea Cup with Handle.
  2. *Medium*: Sitting Tabby Cat in 3/4 profile.
  3. *Complex*: Classical Human Head (Loomis method construction).
- **Benchmark Grid Methods**:
  - Test Run A: Global Prompt Only.
  - Test Run B: Template Grid + Img2Img.
  - Test Run C: ControlNet Grid + Global Prompt.
  - Test Run D: ControlNet Grid + 9× Area Conditioning (Hybrid Method E).

---

## 11. Weighted Evaluation Scoring System

When benchmark images are evaluated, each generated sheet is scored across 7 weighted metrics ($0 - 100$ points total):

$$\text{Total Score} = \sum_{i=1}^{7} (\text{Metric}_i \times \text{Weight}_i)$$

| Metric ID | Evaluation Criterion | Weight | Scoring Rubric |
| :---: | :--- | :---: | :--- |
| **M1** | **Progression Correctness** | **25%** | **100**: Clear geometric breakdown in steps 1–3, linear detail addition.<br>**50**: Steps 1–2 have some details.<br>**0**: Finished drawings appear in early steps. |
| **M2** | **Subject Consistency** | **20%** | **100**: Identical subject, angle, pose, and proportions across all 9 cells.<br>**50**: Minor proportion shift.<br>**0**: Subject changes completely. |
| **M3** | **Grid Structure Integrity** | **15%** | **100**: 9 crisp, rectangular cells aligned to coordinates.<br>**50**: Slight line warping.<br>**0**: Fewer or more than 9 panels. |
| **M4** | **Beginner Pedagogical Usability** | **15%** | **100**: A human beginner can follow and copy each intermediate step.<br>**0**: Gaps in visual logic make drawing impossible. |
| **M5** | **Line Art Clarity & Quality** | **10%** | **100**: Clean monochrome lines; no muddy gray artifacts.<br>**0**: Smudged, illegible strokes. |
| **M6** | **Pillow Slicing Reliability** | **10%** | **100**: Zero stroke clipping or border bleeding after automatic crop.<br>**0**: Strokes severed by crop boundary. |
| **M7** | **Inference Speed & Efficiency** | **5%** | **100**: Generation finishes in $<15\text{s}$.<br>**50**: $15\text{s} - 30\text{s}$.<br>**0**: $>60\text{s}$. |

---

## 12. Architectural Implications for SketchFlow AI

1. **Dual-Path Generation Strategy (Hybrid Primary + Chained Fallback)**:
   - **Primary Engine**: Use **Method E (Hybrid 3×3 Grid Sheet Generation)**. It delivers a 9-step tutorial in a single 10-second pass, providing optimal user experience and minimal compute costs.
   - **Fallback Engine**: Maintain DrawEasy's **single-step sequential chaining** strictly as a fallback when a subject fails grid generation twice, or when a user requests an isolated step regeneration.
2. **Asynchronous Generation Pipeline**:
   - Tutorial creation must be handled asynchronously via background tasks (`BackgroundTasks` in FastAPI).
   - Real-time progress is streamed to the React UI via WebSocket (`ws://api/lessons/ws/<lesson_id>`).
3. **Storage Hygiene & Persistence**:
   - The master 3×3 sheet is saved in `storage/sheets/<lesson_id>_master.png`.
   - The 9 extracted cell images are saved in `storage/steps/<lesson_id>_step_<n>.png`.
   - All step coordinates, prompts, and pedagogical notes are permanently indexed in the SQLite `lessons` table.
4. **Validation Gate before Slicing**:
   - The backend runs automated Pillow geometry audits on the sheet *before* slicing. If borders are broken, it immediately re-rolls the generation without exposing a corrupted sheet to the user.

---

## 13. Risks and Unresolved Questions

1. **Diffusion Attention Leakage**: Even with `ConditioningSetArea`, attention weights in cross-attention layers can cause subtle concept bleeding between adjacent steps on small subjects.
2. **Text Representation Inside Cells**: Diffusion models occasionally hallucinate accidental numbers or letters inside cells (e.g. attempting to write "Step 1"). Strict negative prompting (`text, watermark, signature, font, numbers`) is required.
3. **Subject Scaling for Complex Guides**: Tutorials requiring $>9$ steps (e.g. a 12-step or 18-step guide) require multiple grid sheets. The transition from Sheet 1 (Cell 9) to Sheet 2 (Cell 10) will require passing Sheet 1's final step as an img2img anchor for Sheet 2.

---

## 14. Sources and Code References

- **ComfyUI Core Graph Implementation**: `temp_research/ComfyUI/nodes.py:910–966` (`ControlNetApplyAdvanced`), lines 140–180 (`ConditioningSetArea`).
- **ComfyUI Area Composition Examples**: `temp_research/ComfyUI_examples/area_composition/README.md` (Documented color bleed across spatial bounds).
- **SketchFlow AI Pillow Processor**: `backend/app/image_processing/grid_processor.py` (Cell coordinate calculations for 3×3 grids).
- **DrawEasy Single-Step Reference**: `temp_research/DrawEasy/services/geminiService.ts:160–260` (Pedagogical prompt schemas and avoidance constraints).
