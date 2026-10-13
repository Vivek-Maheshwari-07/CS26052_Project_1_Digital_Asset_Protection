# Evaluation dataset: what to provide

The gate is only as trustworthy as the data it is measured on. The existing sets (40 landscape
photos, one toddler case study, 52 jersey photos) have no illustrations, no tripod/burst negatives
and no real platform round-trips. This is the dataset that closes those gaps. Everything marked
**(scripted)** is generated for you by `python -m eval.make_dataset`; you only supply the rest.

## Layout

```
DATASET/
  originals/        registered works                  (<id>.jpg|png|webp ...)
  distractors/      extra registered works that nothing should match
  suspects/         every image that gets checked
  manifest.csv      one row per suspect
  originals.csv     original_id, category, group        (group = creator or shoot; keeps folds honest)
```

Check it any time, without running anything heavy:

```bash
cd backend
python -m eval.gate_eval --dataset DATASET --validate
```

`manifest.csv` (UTF-8, header required):

| column | meaning |
|---|---|
| `file` | file name inside `suspects/` (unique, no spaces) |
| `original_id` | the registered work this is derived from / related to (file stem in `originals/`); blank for `unrelated` and for `hard_negative` that has no registered counterpart |
| `relation` | `copy`, `classical`, `platform`, `ai_light`, `ai_medium`, `ai_heavy`, `sibling`, `same_template`, `hard_negative`, `unrelated` |
| `category` | `illustration`, `flat_art`, `photo_people`, `product`, `landscape`, `text_poster`, `screenshot`, `pattern`, `lowlight`, ... (free text, used for per-category tables) |
| `edit` | what was done (`crop_50`, `instagram_story`, `gemini_restyle`, ...) |
| `tool` | software/model and version |
| `platform` | for `platform` rows: `whatsapp`, `instagram`, `x`, `facebook`, `telegram`, `screenshot`, `screen_photo`, `print_scan` |
| `notes` | prompt for AI edits, anything unusual |
| `split` (optional) | `dev` (default) or `test`. Put ~30% of originals' suspects in `test` and **do not look at those results until the thresholds are frozen** |

## What each relation means (and what the system is expected to do)

| relation | example | expected |
|---|---|---|
| `classical` | crop, flip, rotate, resize, JPEG, filter, text overlay | **Tier 1** (pixel evidence) |
| `platform` | the same file after a real WhatsApp / Instagram / X round-trip, a screenshot, a photo of a screen | **Tier 1**, at worst Tier 2 / lead |
| `copy` | an exact or near-exact reupload | **Tier 1** |
| `ai_light` | AI relight / filter / small object removed or added | evidence or lead |
| `ai_medium` | restyle, new background, outpainting | at least a lead |
| `ai_heavy` | regenerated using the original only as a reference | **no claim** (honest limit); a hit is a bonus |
| `sibling` | another frame of the same shoot, same scene retaken | **lead at most, never evidence** |
| `same_template` | meme / template / stock background with different content | lead at most |
| `hard_negative` | look-alikes: same vendor, same product, same artist style | lead at most |
| `unrelated` | has nothing to do with any registered work | **no claim at all** |

## What to provide, with sizes

Minimum gets a first honest reading; target gives numbers you can put in the paper.

### 1. `originals/`: minimum 100, target 200+
Unedited, at original resolution, EXIF intact. Spread across:
- **Illustration / digital art / anime: at least 60.** Include **15+ flat or vector-like images (logos, minimalist, big blank areas)** and 15+ with large plain backgrounds. This is your target user and the case the old data never covered.
- **Photographs: at least 60.** People (only with consent), pets, food, interiors, cityscapes, landscapes. **20+ product / studio shots on a fixed backdrop.** At least 10 phone portraits that carry an EXIF rotation tag.
- **Text-heavy: 15+** (posters, infographics, memes, screenshots of apps).
- **Repetitive patterns: 10+** (tiles, fabric, carpet, brick, wallpaper).
- **Low-light / high-ISO: 10+**; **black-and-white originals: 10+**.
- A few PNGs with transparency and a few WebP/HEIC (converted) so decoding paths are exercised.
- Several different creators or shoots (`group` column).

### 2. Classical edits **(scripted)**
`python -m eval.make_dataset --dataset DATASET` adds 38 alterations per original (crops from 75% down to 5%, flips, 90/180° and small rotations, resize, thumbnail, JPEG q10-q30, blur, sharpen, brightness/contrast/saturation/gamma, grayscale, sepia, noise, text/meme/watermark overlays, letterbox, a phone-UI screenshot frame, a collage, mild perspective, combined). Use `--per-original 12` for a lighter run.

### 3. Real platform round-trips: minimum 30, target 150+
Take **40-60 originals** and send each through **3-5 real channels** (upload, then save the result back): WhatsApp, Instagram (post and story), X, Facebook, Telegram. Add **phone screenshots** of the image in a gallery or app, and **photos of a monitor** showing it (moire, perspective, glare). Optionally print and scan. Row: `relation=platform`, fill `platform`.

### 4. AI edits: minimum 60 files, target 150+
**25+ originals x 3 strengths (light / medium / heavy) x at least 2 editors**, for example Gemini image editing, ChatGPT image editing, Photoshop Generative Fill, Flux Kontext, an SD inpainting pipeline.
- Keep the **raw output**, not a WhatsApp or screenshot copy.
- Heavy = the original is only a reference (new pose/background/outfit), the case that must honestly end as *no claim*.
- Put the editor, version and prompt in `tool` / `notes`. Rows: `ai_light`, `ai_medium`, `ai_heavy` with `original_id`.

### 5. Hard negatives: minimum 40, target 100+ (the most important part)
Things a naive matcher confuses with copies. Each needs a registered counterpart in `originals/` where one exists (`original_id` = that work; use `sibling`).
- **Tripod / locked-off frames of a static scene: 15+ pairs** (burst or consecutive shots where only noise and a small subject move). This is the hardest false-evidence case.
- **Hand-held adjacent frames / retakes: 15+ pairs.**
- Same scene, different angle; same person or location, different photo: 10+.
- Same product in a different colour or angle on the same backdrop: 10+ (`hard_negative`).
- Same-artist illustrations in the same style: 10+.
- Meme or stock-template bases with different content: 10+ (`same_template`).
- Photos from the same vendor / series as registered ones (like the 52 jerseys): 20+.

### 6. Unrelated suspects: minimum 50, target 150+
Images unrelated to every registered work (`unrelated`, blank `original_id`). Mix categories so flat art is not only compared with photos.

### 7. Distractors: minimum 100, target 1,000-5,000
Extra registered works that nothing should match. They make false-positive rates and latency realistic as the registry grows. Public sets are fine if their licence allows research use (for example INRIA Holidays, Copydays, COCO, Flickr30k, DISC2021 distractors).

### 8. Provenance samples (optional, separate folder `provenance/`)
10-20 images with **signed C2PA manifests** (Adobe Content Credentials, Pixel, Leica/Sony/Nikon, OpenAI or Google images that carry manifests), the same images with metadata stripped, 10 files whose XMP carries `DigitalSourceType = trainedAlgorithmicMedia`, and a few with a broken or edited manifest. A small `provenance/expected.csv` (`file, expected` where expected is `c2pa_valid`, `c2pa_ai`, `xmp_ai`, `invalid`, `none`) is enough. The positive C2PA path is untested until this exists.

## Rules that keep the numbers honest
1. **Never tune on the test split.** Reserve a `test` split up front; thresholds come from the `dev` split's cross-validation only.
2. **Raw outputs for AI edits**, and real platform files for `platform`. Re-saving through a viewer changes what is being measured.
3. **Do not pre-filter** hard negatives to "fair" ones. Include the pairs that look like copies.
4. **Rights and privacy:** only images you may use. Get consent for identifiable people; avoid identifiable children unless a parent consents. Strip GPS from anything leaving your team.
5. Keep originals and their suspects consistent: if you replace an original, regenerate its edits.

## Running it

```bash
cd backend
python -m eval.make_dataset --dataset DATASET --per-original 12     # scripted edits (once)
python -m eval.gate_eval --dataset DATASET --validate                # layout + coverage check
python -m eval.gate_eval --dataset DATASET --split dev --sweep       # full run, tables + threshold fit
python -m eval.gate_eval --analyze-only eval/results_gate/<run>      # re-read a finished run
```
A run of about 1,000 suspects takes roughly an hour on this CPU. Output: `summary.md` (per relation / edit /
platform / category tables, false-evidence rate with a 95% bound, comparison with the classic scores,
latency), `sweep.md`, `failures.csv`, `per_candidate.csv`.
