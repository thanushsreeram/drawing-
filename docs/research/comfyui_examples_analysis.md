# Research Analysis: ComfyUI Example Workflows

**Stage**: Stage 3 — Workflow Techniques & Practical Architecture Research  
**Target Repository**: [ComfyUI Examples (comfyanonymous/ComfyUI_examples)](https://github.com/comfyanonymous/ComfyUI_examples.git)  
**Research Date**: November 2026  
**Document Path**: `docs/research/comfyui_examples_analysis.md`  

---

## 1. Repository Overview

The `ComfyUI_examples` repository is the official reference library maintained by the creator of ComfyUI (`comfyanonymous`). Rather than containing extensive Python code, it primarily consists of documented workflow directories where actual workflows are embedded directly inside PNG metadata (`tEXt` chunks holding serialized JSON representations of the node graph under the keys `'prompt'` and `'workflow'`).

By inspecting these embedded graphs and corresponding documentation, we gain verified technical insights into how standard diffusion models, conditioning nodes, ControlNets, and latent manipulators behave in practice under real-world generation tasks.

---

## 2. Relevant Examples and Exact File Paths

| Topic / Category | Exact Repository Paths | Key Workflow Files | Verified Mechanism |
| :--- | :--- | :--- | :--- |
| **Area / Multi-Panel Composition** | `temp_research/ComfyUI_examples/area_composition/` | `night_evening_day_morning.png`, `square_area_for_subject.png`, `workflow_night_evening_day_morning.png` | `ConditioningSetArea`, `ConditioningCombine` |
| **Latent Composition** | `temp_research/ComfyUI_examples/noisy_latent_composition/` | `noisy_latents_3_subjects.png` | Compositing noisy latents mid-sampling |
| **ControlNet & Scribble** | `temp_research/ComfyUI_examples/controlnet/` | `controlnet_example.png`, `input_scribble_example.png`, `mixing_controlnets.png` | `ControlNetLoader`, `ControlNetApply`, `DiffControlNetLoader` |
| **Image-to-Image (Img2Img)** | `temp_research/ComfyUI_examples/img2img/` | `img2img_workflow.png` | `LoadImage`, `VAEEncode`, `KSampler` (`denoise < 1.0`) |
| **Inpainting & Masking** | `temp_research/ComfyUI_examples/inpaint/` | `inpaint_example.png`, `inpain_model_cat.png`, `yosemite_inpaint_example.png` | `VAEEncodeForInpaint`, Alpha channel masks, `SetLatentNoiseMask` |
| **Two-Pass High-Resolution** | `temp_research/ComfyUI_examples/2_pass_txt2img/` | `hiresfix_latent_workflow.png`, `hiresfix_esrgan_workflow.png` | Latent upscale + 2nd pass KSampler; Pixel ESRGAN + VAE |
| **Pixel Upscaling Models** | `temp_research/ComfyUI_examples/upscale_models/` | `esrgan_example.png` | `UpscaleModelLoader`, `ImageUpscaleWithModel` |
| **LoRA Style Adaptation** | `temp_research/ComfyUI_examples/lora/` | `lora.png`, `lora_multiple.png` | `LoraLoader` chained patching on `MODEL` & `CLIP` |
| **Grounded Spatial Box (GLIGEN)** | `temp_research/ComfyUI_examples/gligen/` | `gligen_textbox_example.png` | `GLIGENLoader`, `GLIGENTextBoxApply` |
| **Image-Guided Conditioning (unCLIP)** | `temp_research/ComfyUI_examples/unclip/` | `unclip_example.png`, `unclip_2pass.png` | `unCLIPCheckpointLoader`, `CLIPVisionEncode` |

---

## 3. Image Generation Workflows

### A. Baseline Text-to-Image (T2I)
- **Verified Operation**: An empty latent tensor (`EmptyLatentImage`) is denoised via `KSampler` from pure Gaussian noise (`denoise = 1.0`) guided by positive and negative `CLIPTextEncode` conditionings.
- **Relevance for SketchFlow AI**: Limited for user-uploaded drawing tutorials, but forms the foundational sub-graph for initializing blank canvas grids.

### B. Image-to-Image (Img2Img) (`img2img/img2img_workflow.png`)
- **Verified Operation**: An existing raster image is loaded (`LoadImage`), encoded into latent space via `VAEEncode`, and fed into `KSampler` with `denoise < 1.0` (typically 0.4 to 0.7).
- **Technical Behavior**:
  - `denoise = 0.87` (as used in the example): Drastically redraws the image, changing forms and line placement while preserving rough macro composition.
  - `denoise = 0.30 – 0.50`: Retains line contours, stroke positions, and silhouettes while refining lines, smoothing artifacts, or converting a rough sketch into clean ink.
- **Relevance for SketchFlow AI**: **High**. Provides a direct method to clean up, normalize, or stylize user-uploaded reference sketches into standardized line art before tutorial generation.

---

## 4. Image Reference & Consistency Techniques

Preserving the identity of the user's reference drawing is the central challenge of SketchFlow AI. The examples demonstrate three primary reference techniques:

### 1. Scribble & Lineart ControlNet (`controlnet/controlnet_example.png`)
- **Verified Operation**: A user's rough hand-drawn scribble (`input_scribble_example.png`) is passed to `ControlNetApply` alongside a loaded scribble ControlNet model (`ControlNetLoader`).
- **Behavior**: The ControlNet constrains the diffusion model's U-Net attention layers so the generated image follows the exact line paths of the input scribble, regardless of prompt variations.
- **Significance for SketchFlow AI**: **Critical**. When a user uploads a drawing of a dog or car, a Lineart/Scribble ControlNet guarantees that the generated tutorial steps correspond to the actual proportions and contours of the user's subject.

### 2. T2I-Adapter vs. Full ControlNet (`controlnet/README.md`)
- **Verified Fact**: The author notes that full ControlNets evaluate model weights at *every single sampling step* (e.g. 25 times), which substantially slows down generation. In contrast, **T2I-Adapters** execute only once at the beginning of the pipeline and inject static conditioning features.
- **Performance Trade-off**: T2I-Adapters use significantly less VRAM and compute time, though full ControlNets offer tighter contour adherence.

### 3. Image Embedding Conditioning via unCLIP (`unclip/unclip_example.png`)
- **Verified Operation**: Uses specialized unCLIP models where reference images are passed through `CLIPVisionEncode`.
- **Behavior**: Instead of enforcing pixel-level edge alignment, unCLIP extracts abstract visual semantics (color harmony, thematic identity, subject concept) and injects them into the prompt stream.
- **Significance for SketchFlow AI**: Less useful than ControlNet for structural drawing tutorials, as it captures semantic vibe rather than stroke-level contours.

---

## 5. Structure and Consistency Control

| Technique | Verified Workflow | Core vs. Extension | Value for SketchFlow AI | Prototype Priority |
| :--- | :--- | :---: | :--- | :--- |
| **ControlNet (Scribble / Canny)** | `controlnet/controlnet_example.png` | **Core** (models external) | **Critical**: Forces model to preserve reference contours. | **Immediate / High** |
| **Area Conditioning (`ConditioningSetArea`)** | `area_composition/night_evening_day_morning.png` | **Core** | **High**: Enables multi-panel sub-prompting inside a single canvas. | **Immediate / High** |
| **Noisy Latent Composition** | `noisy_latent_composition/noisy_latents_3_subjects.png` | **Core** | Moderate: Advanced multi-subject placement; high setup complexity. | Investigate Later |
| **GLIGEN Bounding Box** | `gligen/gligen_textbox_example.png` | **Core** (models external) | Moderate: Text box spatial positioning; requires GLIGEN weights. | Investigate Later |
| **Inpainting Masking** | `inpaint/inpaint_example.png` | **Core** | **Critical**: Surgical replacement of a single failed step in a grid. | **Immediate / High** |
| **LoRA Style Patching** | `lora/lora.png` | **Core** (models external) | **High**: Enforces minimalist line art / sketch tutorial aesthetic. | **Immediate / High** |
| **IP-Adapter** | *Not in ComfyUI Examples* | **Custom Node** | High for character identity; requires external node pack. | Not Needed for Prototype |

---

## 6. Inpainting and Correction

In `inpaint/inpaint_example.png` and `inpaint/README.md`, two distinct inpainting paradigms are verified:

1. **Standard Diffusion Model with Mask (`inpaint_example.png`)**:
   - `VAEEncodeForInpaint` takes an image and a binary mask (or alpha channel).
   - The unmasked region is preserved; the masked region is encoded with noise and redrawn by `KSampler`.
2. **Dedicated Inpainting Checkpoints (`inpain_model_cat.png`)**:
   - Uses specialized inpainting models trained on 9-channel inputs (image + mask + latent).
   - Produces superior edge blending across mask seams.

### Crucial Architectural Insight for SketchFlow AI:
If our 3×3 grid generator produces 8 good steps but cell #4 contains an anomaly (e.g. malformed lines or a hallucination), **we do not need to discard the entire sheet**. 
- We can mask cell #4 (coordinates: $x=341, y=341, w=341, h=341$).
- Route the 3×3 sheet through `VAEEncodeForInpaint`.
- Re-sample only cell #4 using targeted corrective instructions while locking the remaining 8 cells in place.

---

## 7. Upscaling and Refinement

In `2_pass_txt2img/` and `upscale_models/`, two upscaling strategies are demonstrated:

### 1. Latent Upscale (2-Pass Hires Fix) (`hiresfix_latent_workflow.png`)
- Operates by upscaling the latent tensor using bilinear/bicubic interpolation (`LatentUpscale`), followed by a second `KSampler` pass at low denoise (0.4–0.6).
- **Risk for Drawing Tutorials**: A second generative sampling pass introduces *new* hallucinated details (extra textures, micro-lines, shading). This violates pedagogical consistency where early steps must remain strictly simple.

### 2. Model-Based Pixel Upscaling (`upscale_models/esrgan_example.png`)
- Uses `UpscaleModelLoader` and `ImageUpscaleWithModel` with neural super-resolution models (e.g. `ESRGAN`, `RealESRGAN_x4plus_anime_6B`).
- **Advantage for Drawing Tutorials**: Operates in pure pixel space using deterministic convolutional super-resolution. It sharpens edges and quadruples resolution **without hallucinating new objects, extra strokes, or style changes**.
- **Recommendation**: Use model-based pixel upscaling for final sheet rendering and cell exports rather than latent diffusion re-sampling.

---

## 8. 3×3 Grid Generation Relevance

The `area_composition/` examples (`night_evening_day_morning.png` and `workflow_night_evening_day_morning.png`) provide the most direct evidence regarding multi-panel layout inside ComfyUI:

### How Area Composition Operates:
- `ConditioningSetArea` assigns explicit pixel bounding boxes:
  ```python
  Node 11: width=704, height=384, x=0, y=512, conditioning=[Prompt_Night]
  Node 18: width=704, height=384, x=0, y=320, conditioning=[Prompt_Evening]
  Node 34: width=704, height=384, x=0, y=0,   conditioning=[Prompt_Morning]
  ```
- `ConditioningCombine` combines these into a single conditioning structure.
- During sampling, the U-Net applies spatial attention so that each text prompt influences only its designated rectangular canvas region.

### Critical Limitations Verified from the Example Author:
1. **Diffusion Cross-Bleed**:
   > *"Stable Diffusion tries to make the overall image consistent with itself and one of the side effects of that is merging the hair colors together."* — `area_composition/README.md`
   In a 3×3 grid, adjacent prompts (e.g. Cell 1 "simple oval" vs Cell 2 "oval with crosshairs") will naturally bleed across borders unless explicitly bounded.
2. **Lack of Strict Grid Framing**:
   `ConditioningSetArea` does not draw black grid border lines or enforce rigid comic-strip gutters. The borders between regions are soft and blended.
3. **No Inherent Pedagogical Concept**:
   The diffusion model has no native understanding that Cell 1 must be a prerequisite for Cell 2. It simply tries to satisfy 9 regional prompts simultaneously on one continuous latent canvas.

### Conclusion on 3×3 Grid Feasibility:
`ConditioningSetArea` proves that ComfyUI Core can partition a single canvas into multiple prompt regions. However, to achieve clean, isolated, pedagogical drawing sheets, **area conditioning alone is insufficient**. It must be combined with:
- A structural **Grid Template ControlNet** (enforcing rigid black borders between cells), OR
- A specialized **Drawing Sheet LoRA**, OR
- An automated assembly pipeline where FastAPI generates individual cells and stitches them into a 3×3 composite sheet.

---

## 9. Required Models and Custom Nodes

All key techniques inspected in this repository rely strictly on **ComfyUI Core native nodes**:
- `ControlNetApply`, `ControlNetLoader`: Native to `nodes.py`.
- `ConditioningSetArea`, `ConditioningCombine`: Native to `nodes.py`.
- `VAEEncodeForInpaint`: Native to `nodes.py`.
- `UpscaleModelLoader`, `ImageUpscaleWithModel`: Native to `comfy_extras/nodes_upscale_model.py`.
- `LoraLoader`: Native to `nodes.py`.

### External Model Weights Needed:
1. **Diffusion Checkpoint**: A Stable Diffusion 1.5 or SDXL checkpoint tuned for illustration (e.g. `AnythingV3`, `DreamShaper`, or a minimalist line-art checkpoint).
2. **ControlNet Model**: A `control_v11p_sd15_scribble` or `control_v11p_sd15_lineart` `.safetensors` file (approx. 1.4 GB).
3. **Upscaler**: An ESRGAN anime/lineart model (e.g. `RealESRGAN_x4plus_anime_6B.pth`, approx. 65 MB) in `models/upscale_models/`.
4. **LoRA**: An optional sketch/drawing-guide LoRA (approx. 50–150 MB).

*No custom third-party node repositories (like ComfyUI-Manager or IP-Adapter-Plus) are required to execute these baseline workflows.*

---

## 10. Hardware and Complexity Considerations

- **VRAM Footprint**:
  - Baseline SD 1.5 + Scribble ControlNet: Requires **4.5 GB to 6.5 GB VRAM** at 512×512 or 768×768 resolution.
  - SDXL + Control-LoRA: Requires **8 GB to 12 GB VRAM** at 1024×1024 resolution.
  - Pixel ESRGAN Upscale: Executes on CPU or GPU in seconds with negligible VRAM overhead (<1 GB).
- **Execution Time**:
  - SD 1.5 + ControlNet (25 steps, DPM++ 2M / Euler): ~4–8 seconds on modern laptop GPUs (e.g. RTX 3060/4060).
  - Area Composition (4–9 regions): Increases sampling computation slightly, but runs in a single pass (~8–15 seconds total).
- **Complexity**:
  - Simple Img2Img / ControlNet: Low complexity (8–12 nodes).
  - Area Composition (9 cells): Moderate complexity (approx. 25–35 nodes in API JSON), but highly templateable.

---

## 11. Recommended Workflows for SketchFlow AI

Based on direct inspection of the example repository, the following three core workflows are recommended for our architecture:

```
+-----------------------------------------------------------------------------------+
|                        RECOMMENDED WORKFLOW PIPELINE                              |
|                                                                                   |
| 1. REFERENCE CONDITIONING WORKFLOW                                                |
|    Reference Upload -> Pillow Canny Edge -> ControlNet Lineart -> SD 1.5 / SDXL   |
|                                                                                   |
| 2. GRID SHEET GENERATION WORKFLOW                                                 |
|    9x ConditioningSetArea (3x3 grid boxes) + Grid Border Template -> 1-Pass Sheet |
|                                                                                   |
| 3. SURGICAL REPAIR WORKFLOW                                                       |
|    Failed Cell Mask -> VAEEncodeForInpaint -> Local Inpaint -> Clean Composite     |
|                                                                                   |
| 4. FINAL EXPORT ENHANCEMENT                                                       |
|    Pillow Cell Crop (9 images) -> ImageUpscaleWithModel (ESRGAN) -> Sharp Assets  |
+-----------------------------------------------------------------------------------+
```

---

## 12. What We Can Use Immediately

1. **`controlnet_example.png` Architecture**: Direct blueprint for passing a user-uploaded sketch into `ControlNetApply` to maintain structural identity.
2. **`area_composition` Pattern**: Mathematical partitioning of a canvas into coordinate regions (`x`, `y`, `w`, `h`) with distinct positive text prompts.
3. **`inpaint_example.png` Pattern**: Native masking pipeline for replacing an individual failed step without restarting the lesson.
4. **`esrgan_example.png` Pattern**: Model-based deterministic upscaling for clean high-DPI export of drawing steps.

---

## 13. What We Should Investigate Later

1. **T2I-Adapter vs. ControlNet Speed Benchmark**: Test whether T2I-Adapters provide enough contour fidelity while cutting inference time in half.
2. **Custom Lineart Preprocessors (`comfy_controlnet_preprocessors`)**: Evaluate whether pre-extracting lines via OpenCV/Pillow in FastAPI is sufficient or if neural preprocessors (e.g. Lineart Realistic / Anime) produce significantly cleaner guidance.
3. **LoRA Fine-Tuning**: Testing a dedicated "drawing tutorial" LoRA trained on multi-panel drawing guides.

---

## 14. What We Do Not Need

- **Latent 2-Pass Hires Fix (`hiresfix_latent_workflow.png`)**: Unsuitable for early drawing tutorial stages because generative re-sampling hallucinates extra details.
- **unCLIP Models (`unclip_example.png`)**: Focuses on abstract image semantics rather than strict structural line reproduction.
- **GLIGEN Models (`gligen/`)**: Redundant given that `ConditioningSetArea` achieves spatial bounding using standard diffusion models without requiring specialized GLIGEN checkpoints.
- **Video & Audio Examples (`video/`, `audio/`, `mochi/`, `cosmos/`)**: Completely irrelevant for 2D drawing tutorials.

---

## 15. Limitations and Risks

1. **Concept Bleed Across Cells**: In an unconstrained 3×3 grid, area conditioning can cause details or colors from Step 9 to bleed into Step 1.
2. **Cell Border Irregularity**: Diffusion models naturally render smooth painterly transitions; they will not produce sharp, millimeter-precise rectangular comic gutters without external mask conditioning.
3. **Model Knowledge Gap**: Standard Stable Diffusion checkpoints know what a "drawing" is, but struggle to comprehend the pedagogical progression of "drawing a rough circle, then adding contour lines, then shading" unless steered by strict prompts or LoRAs.

---

## 16. Sources and Repository Paths Examined

The following files from `comfyanonymous/ComfyUI_examples` were cloned into the temporary research workspace and verified:

- **Root & Guides**:
  - `README.md`: Lines 1–127 (Catalog of all example categories and external resources).
- **Area & Latent Composition**:
  - `area_composition/README.md`: Lines 1–46 (Verified `ConditioningSetArea`, 2-pass behavior, and color-bleed documentation).
  - `area_composition/night_evening_day_morning.png`: Embedded JSON metadata verified (29 nodes: `ConditioningSetArea`, `ConditioningCombine`, `LatentUpscale`).
  - `noisy_latent_composition/README.md`: Lines 1–21 (Verified noisy latent merging mid-sampling).
- **ControlNet & Conditioning**:
  - `controlnet/README.md`: Lines 1–73 (Verified Scribble ControlNet, T2I-Adapter latency differences, model paths).
  - `controlnet/controlnet_example.png`: Embedded JSON metadata verified (11 nodes: `ControlNetLoader`, `ControlNetApply`, `LoadImage`, `KSampler`).
- **Inpainting & Transformations**:
  - `img2img/README.md`: Lines 1–13 (Verified VAE encode + denoise ratio mechanism).
  - `inpaint/README.md`: Lines 1–38 (Verified alpha-mask inpainting, outpainting padding).
  - `inpaint/inpaint_example.png`: Embedded JSON metadata verified (8 nodes: `VAEEncodeForInpaint`, `LoadImage`).
- **Upscaling & Quality**:
  - `2_pass_txt2img/README.md`: Lines 1–26 (Verified latent vs non-latent ESRGAN upscaling).
  - `upscale_models/README.md`: Lines 1–11 (Verified `UpscaleModelLoader` and `ImageUpscaleWithModel`).
- **Specialized Conditioning**:
  - `lora/README.md`: Lines 1–13 (Verified single and chained LoRA patching).
  - `gligen/README.md`: Lines 1–14 (Verified text box spatial conditioning).
  - `unclip/README.md`: Lines 1–33 (Verified unCLIP semantic image prompts).
