import sys
import os
from pathlib import Path
import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import time
from datetime import datetime
import json
import skimage.metrics
import torch
from transformers import AutoImageProcessor, AutoModel, pipeline
import traceback
import math

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.ingestion import normalize
from app.fingerprint.phash import compute_phash, phash_similarity
from app.fingerprint.embedding import compute_embedding, embedding_similarity
from app.fingerprint.combine import combined_confidence

UPLOAD_DIR = Path(r"C:\Users\Anisha\.gemini\antigravity-ide\brain\514526a1-691d-4c2d-b734-1ea9474589e0\.user_uploaded")
IMAGES = {
    "ORIG": UPLOAD_DIR / "media_1791298158823.jpg",
    "MINIMAL": UPLOAD_DIR / "media_1791298158997.jpg",
    "MEDIUM": UPLOAD_DIR / "media_1791298158881.jpg",
    "HEAVY": UPLOAD_DIR / "media_1791298158968.jpg",
    "SIBLING": UPLOAD_DIR / "media_1791298158735.jpg"
}

ORIG_CROP_BOX = (0, 224, 446, 800)
SEED = 42

np.random.seed(SEED)
torch.manual_seed(SEED)

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
RESULTS_DIR = Path(f"results/{TIMESTAMP}")
PANELS_DIR = RESULTS_DIR / "panels"
SYNTH_DIR = Path("eval/spike/synth")
PANELS_DIR.mkdir(parents=True, exist_ok=True)
SYNTH_DIR.mkdir(parents=True, exist_ok=True)

# Helper functions for STEP 1
def auto_trim(img_pil: Image.Image):
    img_np = np.array(img_pil)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    
    def is_border(vec):
        return np.std(vec) < 2 and (np.mean(vec) > 240 or np.mean(vec) < 15)
        
    top, bottom = 0, gray.shape[0] - 1
    left, right = 0, gray.shape[1] - 1
    
    while top <= bottom and is_border(gray[top, :]): top += 1
    while bottom >= top and is_border(gray[bottom, :]): bottom -= 1
    while left <= right and is_border(gray[:, left]): left += 1
    while right >= left and is_border(gray[:, right]): right -= 1
    
    if top > bottom or left > right:
        return img_pil, (0, 0, img_pil.width, img_pil.height)
        
    trimmed = img_pil.crop((left, top, right + 1, bottom + 1))
    return trimmed, (left, top, right + 1, bottom + 1)

def load_and_norm(path):
    with open(path, "rb") as f:
        return normalize(f.read())

orig_raw = load_and_norm(IMAGES["ORIG"])
orig_clean_cropped = orig_raw.crop(ORIG_CROP_BOX)
orig_clean, trim_box = auto_trim(orig_clean_cropped)

suspects = {
    "MINIMAL": load_and_norm(IMAGES["MINIMAL"]),
    "MEDIUM": load_and_norm(IMAGES["MEDIUM"]),
    "HEAVY": load_and_norm(IMAGES["HEAVY"]),
    "SIBLING": load_and_norm(IMAGES["SIBLING"])
}

# Synths
synth_suspects = {}
def save_synth(name, img):
    img.save(SYNTH_DIR / f"{name}.png")
    synth_suspects[name] = img

w, h = orig_clean.size
def center_crop(img, area_pct):
    target_area = w * h * (area_pct / 100.0)
    scale = (area_pct / 100.0) ** 0.5
    cw, ch = int(w * scale), int(h * scale)
    left = (w - cw) // 2
    top = (h - ch) // 2
    return img.crop((left, top, left+cw, top+ch))

save_synth("crop_90", center_crop(orig_clean, 90))
save_synth("crop_50", center_crop(orig_clean, 50))
save_synth("crop_25", center_crop(orig_clean, 25))
save_synth("crop_10", center_crop(orig_clean, 10))
cw, ch = int(w * 0.7071), int(h * 0.7071)
save_synth("crop_50_offset", orig_clean.crop((0, 0, cw, ch)))
save_synth("hflip", orig_clean.transpose(Image.FLIP_LEFT_RIGHT))
save_synth("rot15", orig_clean.rotate(15, expand=True))
enhancer = ImageEnhance.Brightness(orig_clean)
br = enhancer.enhance(1.4)
enhancer = ImageEnhance.Contrast(br)
save_synth("bright_contrast", enhancer.enhance(1.6))
save_synth("grayscale", orig_clean.convert("L").convert("RGB"))

np_img = np.array(orig_clean).astype(np.float32)
noise = np.random.normal(0, 20, np_img.shape)
noisy = np.clip(np_img + noise, 0, 255).astype(np.uint8)
save_synth("noise_20", Image.fromarray(noisy))
save_synth("blur_3", orig_clean.filter(ImageFilter.GaussianBlur(3)))

import io
buf = io.BytesIO()
orig_clean.save(buf, format="JPEG", quality=30)
jpg_img = Image.open(buf)
save_synth("jpeg30_resize50", jpg_img.resize((w//2, h//2)))

txt_img = orig_clean.copy()
draw = ImageDraw.Draw(txt_img)
draw.rectangle([0, h//2-30, w, h//2+30], fill="black")
try: draw.text((w//2-50, h//2-10), "WATERMARK", fill="white")
except: pass
save_synth("text_banner", txt_img)

combo = center_crop(orig_clean, 50)
combo = ImageEnhance.Color(combo).enhance(2.0)
buf = io.BytesIO()
combo.save(buf, format="JPEG", quality=40)
save_synth("combo", Image.open(buf))

pairs = []
for name, sus in suspects.items():
    pairs.append((f"ORIGraw__{name}", orig_raw, sus))
    pairs.append((f"ORIGclean__{name}", orig_clean, sus))
pairs.append(("ORIGclean__ORIGclean", orig_clean, orig_clean))
for name, sus in synth_suspects.items():
    pairs.append((f"ORIGclean__{name}", orig_clean, sus))
real_names = list(suspects.keys())
for i in range(len(real_names)):
    for j in range(i+1, len(real_names)):
        n1, n2 = real_names[i], real_names[j]
        pairs.append((f"{n1}__{n2}", suspects[n1], suspects[n2]))

processor = AutoImageProcessor.from_pretrained("facebook/dinov2-small")
dino_model = AutoModel.from_pretrained("facebook/dinov2-small")
dino_model.eval()

def get_dino_features(img: Image.Image):
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        outputs = dino_model(**inputs)
    cls_token = outputs.last_hidden_state[:, 0, :]
    patch_tokens = outputs.last_hidden_state[:, 1:, :]
    patch_mean = patch_tokens.mean(dim=1)
    cls_token = torch.nn.functional.normalize(cls_token, p=2, dim=1).squeeze().numpy()
    patch_mean = torch.nn.functional.normalize(patch_mean, p=2, dim=1).squeeze().numpy()
    return cls_token, patch_mean

all_images = {"ORIGraw": orig_raw, "ORIGclean": orig_clean}
for name, img in suspects.items(): all_images[name] = img
for name, img in synth_suspects.items(): all_images[name] = img

features = {}
for name, img in all_images.items():
    ph = compute_phash(img)
    cb = compute_embedding(img)
    dcls, dpatch = get_dino_features(img)
    features[name] = {"phash": ph, "clip": cb, "dino_cls": dcls, "dino_patch": dpatch}

results = []
regression_expected = {"MINIMAL": 0.9959, "MEDIUM": 0.7973, "HEAVY": 0.0054, "SIBLING": 0.9661}
regression_diffs = {}
failures = []
wall_clocks = {}

for pair_name, img_O, img_S in pairs:
    n_O, n_S = pair_name.split("__", 1)
    p_sim = phash_similarity(features[n_O]["phash"], features[n_S]["phash"])
    c_sim = embedding_similarity(features[n_O]["clip"], features[n_S]["clip"])
    fused = combined_confidence(p_sim, c_sim)
    dino_sim = float(np.dot(features[n_O]["dino_cls"], features[n_S]["dino_cls"]))
    dino_patchmean_sim = float(np.dot(features[n_O]["dino_patch"], features[n_S]["dino_patch"]))
    
    if n_O == "ORIGraw" and n_S in regression_expected:
        regression_diffs[n_S] = abs(fused - regression_expected[n_S])
        
    results.append({
        "pair": pair_name, "phash": p_sim, "clip": c_sim,
        "dino": dino_sim, "dino_patchmean": dino_patchmean_sim, "fused": fused
    })


def resize_long_side(img_np, target_size=1024):
    h, w = img_np.shape[:2]
    long_side = max(h, w)
    if long_side == target_size: return img_np, 1.0
    scale = target_size / long_side
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    return cv2.resize(img_np, (int(w*scale), int(h*scale)), interpolation=interp), scale

sift = cv2.SIFT_create(nfeatures=4000)
bf = cv2.BFMatcher()
def extract_sift(img_np):
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    kp, des = sift.detectAndCompute(gray, None)
    return kp, des, gray

geom_results = []
dense_results = []
locality_results = []
flow_robustness_results = []

print("Running Geometric and Dense evidence...")
for pair_name, img_O_pil, img_S_pil in pairs:
    t_start = time.time()
    g_res = {"pair": pair_name, "flipped": False, "n_inliers": 0, "inlier_ratio": 0.0,
             "cov_s": 0.0, "cov_o": 0.0, "spread_s": 0.0, "spread_o": 0.0,
             "scale": 0.0, "rot": 0.0, "persp": 0.0, "sane": False}
    d_res = {"pair": pair_name, "resid_med": -1, "resid_p90": -1, "ncc_median": -1,
             "frac_ncc_gt_0.8": 0.0, "ssim": -1.0, "edge_corr": -1.0,
             "flow_median": -1.0, "flow_p90": -1.0, "frac_flow_gt_1px": 0.0}
    
    try:
        O_np = np.array(img_O_pil)
        S_np = np.array(img_S_pil)
        O_res, _ = resize_long_side(O_np)
        S_res, _ = resize_long_side(S_np)
        kp_O, des_O, gray_O = extract_sift(O_res)
        kp_S, des_S, gray_S = extract_sift(S_res)
        S_res_flip = cv2.flip(S_res, 1)
        kp_S_f, des_S_f, gray_S_f = extract_sift(S_res_flip)
        
        def match_and_homography(d_O, k_O, d_S, k_S):
            if d_O is None or d_S is None or len(d_O) < 2 or len(d_S) < 2: return None, [], None, None
            matches = bf.knnMatch(d_S, d_O, k=2)
            good = [m[0] for m in matches if len(m) == 2 and m[0].distance < 0.75 * m[1].distance]
            if len(good) < 8: return None, good, None, None
            src_pts = np.float32([k_S[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
            dst_pts = np.float32([k_O[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
            H, mask = cv2.findHomography(src_pts, dst_pts, cv2.USAC_MAGSAC, 5.0, maxIters=10000, confidence=0.999)
            return H, good, mask, (src_pts, dst_pts)
            
        t_g1 = time.time()
        H_fwd, good_fwd, mask_fwd, pts_fwd = match_and_homography(des_O, kp_O, des_S, kp_S)
        H_flp, good_flp, mask_flp, pts_flp = match_and_homography(des_O, kp_O, des_S_f, kp_S_f)
        
        inliers_fwd = int(mask_fwd.sum()) if mask_fwd is not None else 0
        inliers_flp = int(mask_flp.sum()) if mask_flp is not None else 0
        
        flipped = bool(inliers_flp > inliers_fwd)
        H = H_flp if flipped else H_fwd
        good_matches = good_flp if flipped else good_fwd
        mask = mask_flp if flipped else mask_fwd
        pts = pts_flp if flipped else pts_fwd
        S_work = S_res_flip if flipped else S_res
        gray_work = gray_S_f if flipped else gray_S
        inliers = max(inliers_fwd, inliers_flp)
        wall_clocks[f"{pair_name}_G1"] = time.time() - t_g1
        
        g_res["flipped"] = flipped
        g_res["n_inliers"] = inliers
        g_res["inlier_ratio"] = float(inliers / len(good_matches)) if len(good_matches) > 0 else 0.0
        
        t_g2 = time.time()
        hO, wO = gray_O.shape
        warped_S = S_work
        valid_pixels = np.zeros((hO, wO), dtype=bool)
        
        if H is not None and inliers >= 8:
            src_pts, dst_pts = pts
            inlier_src = src_pts[mask.ravel() == 1]
            inlier_dst = dst_pts[mask.ravel() == 1]
            def hull_area(p, shp):
                if len(p) < 3: return 0.0
                hull = cv2.convexHull(p)
                return cv2.contourArea(hull) / (shp[0]*shp[1])
            g_res["cov_s"] = hull_area(inlier_src, gray_work.shape)
            g_res["cov_o"] = hull_area(inlier_dst, gray_O.shape)
            def spread(p, shp):
                cells = set()
                for pt in p:
                    x, y = pt.ravel()
                    cx, cy = int(x / (shp[1]/4)), int(y / (shp[0]/4))
                    cells.add((min(3, max(0, cx)), min(3, max(0, cy))))
                return len(cells) / 16.0
            g_res["spread_s"] = spread(inlier_src, gray_work.shape)
            g_res["spread_o"] = spread(inlier_dst, gray_O.shape)
            
            H_norm = H / H[2, 2] if H[2, 2] != 0 else H
            scale = float(np.sqrt(abs(np.linalg.det(H_norm[0:2, 0:2]))))
            rot = float(np.degrees(np.arctan2(H_norm[1,0], H_norm[0,0])))
            persp = float(np.hypot(H_norm[2,0], H_norm[2,1]))
            g_res["scale"], g_res["rot"], g_res["persp"] = scale, rot, persp
            g_res["sane"] = bool((0.05 < scale < 20.0) and (persp < 1e-3))
            
            warped_S = cv2.warpPerspective(S_work, H, (wO, hO))
            warp_mask = cv2.warpPerspective(np.ones_like(gray_work)*255, H, (wO, hO))
            warp_mask = cv2.erode(warp_mask, np.ones((5,5), np.uint8), iterations=1)
            
            try:
                warp_gray = cv2.cvtColor(warped_S, cv2.COLOR_RGB2GRAY)
                gray_O_half = cv2.resize(gray_O, (wO//2, hO//2))
                warp_gray_half = cv2.resize(warp_gray, (wO//2, hO//2))
                mask_half = cv2.resize(warp_mask, (wO//2, hO//2))
                
                valid_pre = (mask_half > 0)
                cc_pre = np.corrcoef(gray_O_half[valid_pre].ravel(), warp_gray_half[valid_pre].ravel())[0,1] if valid_pre.sum()>100 else 0
                
                warp_mat = np.eye(2, 3, dtype=np.float32)
                crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-5)
                cc_post, warp_mat = cv2.findTransformECC(gray_O_half, warp_gray_half, warp_mat, cv2.MOTION_AFFINE, crit, mask_half)
                
                if cc_post > cc_pre:
                    warp_mat[0, 2] *= 2; warp_mat[1, 2] *= 2
                    warped_S = cv2.warpAffine(warped_S, warp_mat, (wO, hO), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
                    warp_mask = cv2.warpAffine(warp_mask, warp_mat, (wO, hO), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
            except Exception: pass
            valid_pixels = warp_mask > 0
        wall_clocks[f"{pair_name}_G2"] = time.time() - t_g2

        t_g3 = time.time()
        S_adj = warped_S.copy()
        if valid_pixels.sum() > 100:
            O_vals = O_res[valid_pixels].astype(np.float32)
            S_vals = warped_S[valid_pixels].astype(np.float32)
            idx = np.random.choice(len(O_vals), min(10000, len(O_vals)), replace=False)
            S_adj = np.zeros_like(warped_S, dtype=np.float32)
            for c in range(3):
                A = np.vstack([S_vals[idx, c], np.ones(len(idx))]).T
                a, b = np.linalg.lstsq(A, O_vals[idx, c], rcond=None)[0]
                S_adj[:, :, c] = warped_S[:, :, c].astype(np.float32) * a + b
            S_adj = np.clip(S_adj, 0, 255).astype(np.uint8)
            
            resid = np.abs(O_res.astype(np.float32) - S_adj.astype(np.float32))[valid_pixels]
            d_res["resid_med"] = float(np.median(resid))
            d_res["resid_p90"] = float(np.percentile(resid, 90))
            
            hp_O = cv2.cvtColor(O_res, cv2.COLOR_RGB2GRAY).astype(np.float32) - cv2.GaussianBlur(cv2.cvtColor(O_res, cv2.COLOR_RGB2GRAY).astype(np.float32), (0,0), sigmaX=2)
            hp_S = cv2.cvtColor(S_adj, cv2.COLOR_RGB2GRAY).astype(np.float32) - cv2.GaussianBlur(cv2.cvtColor(S_adj, cv2.COLOR_RGB2GRAY).astype(np.float32), (0,0), sigmaX=2)
            
            nccs = []
            for y in range(0, hO, 32):
                for x in range(0, wO, 32):
                    if valid_pixels[y:y+32, x:x+32].mean() >= 0.9:
                        tO = hp_O[y:y+32, x:x+32]
                        if tO.std() >= 3.0:
                            cc = np.corrcoef(tO.ravel(), hp_S[y:y+32, x:x+32].ravel())[0,1]
                            if not np.isnan(cc): nccs.append(cc)
            if nccs:
                d_res["ncc_median"] = float(np.median(nccs))
                d_res["frac_ncc_gt_0.8"] = float((np.array(nccs) > 0.8).mean())
                
            try:
                _, diff_ssim = skimage.metrics.structural_similarity(O_res, S_adj, channel_axis=2, full=True, data_range=255)
                d_res["ssim"] = float(diff_ssim[valid_pixels].mean())
            except Exception as e: failures.append(f"SSIM fail {pair_name}: {e}")
            
            def edge_mag(g):
                b = cv2.GaussianBlur(g, (0,0), sigmaX=1)
                return np.hypot(cv2.Sobel(b, cv2.CV_32F, 1, 0, 3), cv2.Sobel(b, cv2.CV_32F, 0, 1, 3))
            e_O = edge_mag(cv2.cvtColor(O_res, cv2.COLOR_RGB2GRAY))
            e_S = edge_mag(cv2.cvtColor(S_adj, cv2.COLOR_RGB2GRAY))
            d_res["edge_corr"] = float(np.corrcoef(e_O[valid_pixels].ravel(), e_S[valid_pixels].ravel())[0,1])
            
            flow = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM).calc(cv2.cvtColor(O_res, cv2.COLOR_RGB2GRAY), cv2.cvtColor(S_adj, cv2.COLOR_RGB2GRAY), None)
            mag = np.hypot(flow[...,0], flow[...,1])
            mag_v = mag[valid_pixels]
            if len(mag_v) > 0:
                d_res["flow_median"] = float(np.median(mag_v))
                d_res["flow_p90"] = float(np.percentile(mag_v, 90))
                d_res["frac_flow_gt_1px"] = float((mag_v > 1.0).mean())
        wall_clocks[f"{pair_name}_G3"] = time.time() - t_g3
        
        # STEP 2 LOCALITY DIAGNOSTIC
        if pair_name.startswith("ORIGclean__") and pair_name.split("__")[1] in ["MINIMAL", "MEDIUM", "SIBLING"] and inliers >= 8:
            rows, cols = 4, 4
            cell_h, cell_w = hO // rows, wO // cols
            loc_dict = {"pair": pair_name}
            for r in range(rows):
                for c in range(cols):
                    cell_mask = valid_pixels[r*cell_h:(r+1)*cell_h, c*cell_w:(c+1)*cell_w]
                    cell_mag = mag[r*cell_h:(r+1)*cell_h, c*cell_w:(c+1)*cell_w][cell_mask]
                    loc_dict[f"R{r}C{c}"] = float(np.median(cell_mag)) if len(cell_mag)>100 else -1.0
            locality_results.append(loc_dict)
            
        # PANELS
        t_pan = time.time()
        do_panel = False
        target_ctrls = ["MINIMAL", "MEDIUM", "SIBLING"]
        synth_ctrls = ["crop_50", "hflip", "noise_20", "blur_3"]
        suffix = pair_name.split("__")[1]
        if pair_name.startswith("ORIGclean__") and (suffix in target_ctrls or suffix in synth_ctrls): do_panel = True
        if pair_name.startswith("ORIGraw__") and suffix in target_ctrls: do_panel = True
        
        if do_panel:
            try:
                # a) matches
                match_img = cv2.drawMatches(gray_O, kp_O, gray_work, kp_S_f if flipped else kp_S, good_matches[:80], None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
                # b) 50/50 overlay
                overlay = cv2.addWeighted(O_res, 0.5, S_adj, 0.5, 0)
                # c) warped suspect next to original
                side_by_side = np.hstack((O_res, S_adj))
                # d) tile ncc
                ncc_heatmap = np.zeros_like(gray_O, dtype=np.float32)
                if inliers >= 8:
                    for y in range(0, hO, 32):
                        for x in range(0, wO, 32):
                            if valid_pixels[y:y+32, x:x+32].mean() >= 0.9:
                                tO = hp_O[y:y+32, x:x+32]
                                if tO.std() >= 3.0:
                                    cc = np.corrcoef(tO.ravel(), hp_S[y:y+32, x:x+32].ravel())[0,1]
                                    if not np.isnan(cc): ncc_heatmap[y:y+32, x:x+32] = max(0, cc)
                ncc_c = cv2.applyColorMap((ncc_heatmap*255).astype(np.uint8), cv2.COLORMAP_JET)
                # e, f) flow mag 0-5 and 0-40
                flow_mag = mag if inliers >= 8 else np.zeros_like(gray_O, dtype=np.float32)
                flow_5 = cv2.applyColorMap(np.clip(flow_mag/5.0 * 255, 0, 255).astype(np.uint8), cv2.COLORMAP_HOT)
                flow_40 = cv2.applyColorMap(np.clip(flow_mag/40.0 * 255, 0, 255).astype(np.uint8), cv2.COLORMAP_HOT)
                
                def resize_to_h(img, target_h):
                    return cv2.resize(img, (int(img.shape[1] * target_h / img.shape[0]), target_h))
                
                h_target = 800
                r1_imgs = [resize_to_h(x, h_target) for x in [match_img, overlay, side_by_side]]
                row1 = np.hstack(r1_imgs)
                r2_imgs = [resize_to_h(x, h_target) for x in [ncc_c, flow_5, flow_40]]
                row2 = np.hstack(r2_imgs)
                
                max_w = max(row1.shape[1], row2.shape[1])
                row1 = np.pad(row1, ((0,0), (0, max_w - row1.shape[1]), (0,0)))
                row2 = np.pad(row2, ((0,0), (0, max_w - row2.shape[1]), (0,0)))
                panel = np.vstack((row1, row2))
                
                cv2.imwrite(str(PANELS_DIR / f"{pair_name}.png"), cv2.cvtColor(panel, cv2.COLOR_RGB2BGR))
            except Exception as e:
                err = traceback.format_exc()
                failures.append(f"Panel failed {pair_name}: {e}\n{err}")
        wall_clocks[f"{pair_name}_Panels"] = time.time() - t_pan
            
    except Exception as e:
        failures.append(f"Failed pipeline {pair_name}: {e}\n{traceback.format_exc()}")
        
    geom_results.append(g_res)
    dense_results.append(d_res)

# STEP 3: FLOW ROBUSTNESS
print("Running Flow Robustness...")
flow_targets = ["MINIMAL", "MEDIUM", "SIBLING", "crop_50", "noise_20", "blur_3"]
for name in flow_targets:
    pair_name = f"ORIGclean__{name}"
    img_O_pil = orig_clean
    img_S_pil = suspects[name] if name in suspects else synth_suspects[name]
    
    # re-extract base SIFT for these sizes? Or just use full and resize?
    # Actually just re-run the match pipeline for 512 and 1024
    for size in [512, 1024]:
        try:
            O_np = np.array(img_O_pil)
            S_np = np.array(img_S_pil)
            O_res, scale_O = resize_long_side(O_np, size)
            S_res, scale_S = resize_long_side(S_np, size)
            
            kp_O, des_O, gray_O = extract_sift(O_res)
            kp_S, des_S, gray_S = extract_sift(S_res)
            
            matches = bf.knnMatch(des_S, des_O, k=2) if (des_S is not None and des_O is not None and len(des_S)>1 and len(des_O)>1) else []
            good = [m[0] for m in matches if len(m) == 2 and m[0].distance < 0.75 * m[1].distance]
            
            hO, wO = gray_O.shape
            
            if len(good) >= 8:
                src_pts = np.float32([kp_S[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                dst_pts = np.float32([kp_O[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
                
                # 1. Homography
                H, mask_H = cv2.findHomography(src_pts, dst_pts, cv2.USAC_MAGSAC, 5.0, maxIters=1000, confidence=0.999)
                # 2. Similarity (estimateAffinePartial2D)
                A, mask_A = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.USAC_MAGSAC, ransacReprojThreshold=5.0, maxIters=1000, confidence=0.999)
                
                # We need to compute flow for both warps and both presets
                # Build warps
                warps = []
                if H is not None:
                    wS = cv2.warpPerspective(S_res, H, (wO, hO))
                    wM = cv2.warpPerspective(np.ones_like(gray_S)*255, H, (wO, hO))
                    wM = cv2.erode(wM, np.ones((5,5), np.uint8), iterations=1)
                    warps.append(("Homography", wS, wM))
                    
                if A is not None:
                    wS = cv2.warpAffine(S_res, A, (wO, hO))
                    wM = cv2.warpAffine(np.ones_like(gray_S)*255, A, (wO, hO))
                    wM = cv2.erode(wM, np.ones((5,5), np.uint8), iterations=1)
                    warps.append(("Similarity", wS, wM))
                
                for geom_type, wS, wM in warps:
                    valid_pixels = wM > 0
                    if valid_pixels.sum() > 100:
                        S_adj = wS.copy()
                        # quick photometric
                        O_vals = O_res[valid_pixels].astype(np.float32)
                        S_vals = wS[valid_pixels].astype(np.float32)
                        idx = np.random.choice(len(O_vals), min(10000, len(O_vals)), replace=False)
                        S_adj = np.zeros_like(wS, dtype=np.float32)
                        for c in range(3):
                            At = np.vstack([S_vals[idx, c], np.ones(len(idx))]).T
                            a, b = np.linalg.lstsq(At, O_vals[idx, c], rcond=None)[0]
                            S_adj[:, :, c] = wS[:, :, c].astype(np.float32) * a + b
                        S_adj = np.clip(S_adj, 0, 255).astype(np.uint8)
                        
                        gray_O_flow = cv2.cvtColor(O_res, cv2.COLOR_RGB2GRAY)
                        gray_S_flow = cv2.cvtColor(S_adj, cv2.COLOR_RGB2GRAY)
                        
                        for preset_name, preset_val in [("FAST", cv2.DISOPTICAL_FLOW_PRESET_FAST), ("MEDIUM", cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)]:
                            flow = cv2.DISOpticalFlow_create(preset_val).calc(gray_O_flow, gray_S_flow, None)
                            mag = np.hypot(flow[...,0], flow[...,1])[valid_pixels]
                            if len(mag) > 0:
                                flow_robustness_results.append({
                                    "pair": pair_name, "size": size, "geom": geom_type, "preset": preset_name,
                                    "flow_median": float(np.median(mag)), "flow_p90": float(np.percentile(mag, 90))
                                })
        except Exception as e:
            failures.append(f"Flow Robustness fail {pair_name} {size}: {e}\n{traceback.format_exc()}")

# STEP 4: AI-ORIGIN EXPLORATION
print("Running AI Origin Exploration...")
ai_results = []
try:
    print("Loading AI detectors...")
    det1 = pipeline("image-classification", model="umm-maybe/AI-image-detector", device="cpu")
    det2 = pipeline("image-classification", model="Ateeqq/ai-vs-human-image-detector", device="cpu")
    
    print(f"Model 1: umm-maybe/AI-image-detector | License: cc-by-4.0 | Input: 224x224")
    print(f"Model 2: Ateeqq/ai-vs-human-image-detector | License: apache-2.0 | Input: 224x224")
    
    ai_images = {"ORIG": orig_raw}
    for k, v in suspects.items(): ai_images[k] = v
    for k, v in synth_suspects.items(): ai_images[k] = v
    
    phone_dir = Path("eval/spike/phone")
    if phone_dir.exists():
        for p in phone_dir.iterdir():
            if p.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                try: ai_images[f"phone_{p.stem}"] = load_and_norm(p)
                except Exception: pass
                
    def get_p_ai(res_list, ai_label):
        for r in res_list:
            if ai_label.lower() in r['label'].lower(): return r['score']
        return 0.0

    for name, img in ai_images.items():
        w, h = img.size
        # 1. As-is
        r1 = det1(img)
        r2 = det2(img)
        p1 = get_p_ai(r1, "artificial")
        p2 = get_p_ai(r2, "ai")
        
        # 2. Recompressed
        scale = 1600.0 / max(w, h)
        if scale < 1.0:
            rec = img.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
        else:
            rec = img.copy()
        buf = io.BytesIO()
        rec.save(buf, format="JPEG", quality=70)
        rec = Image.open(buf)
        
        rr1 = det1(rec)
        rr2 = det2(rec)
        rp1 = get_p_ai(rr1, "artificial")
        rp2 = get_p_ai(rr2, "ai")
        
        ai_results.append({
            "image": name,
            "umm_maybe_asis": p1, "Ateeqq_asis": p2,
            "umm_maybe_recomp": rp1, "Ateeqq_recomp": rp2
        })
except Exception as e:
    failures.append(f"AI Exploration failed: {e}\n{traceback.format_exc()}")

# ASSERT PANELS
print("Checking panels...")
expected_panels = []
target_ctrls = ["MINIMAL", "MEDIUM", "SIBLING"]
synth_ctrls = ["crop_50", "hflip", "noise_20", "blur_3"]
for t in target_ctrls:
    expected_panels.append(f"ORIGclean__{t}")
    expected_panels.append(f"ORIGraw__{t}")
for s in synth_ctrls:
    expected_panels.append(f"ORIGclean__{s}")

missing_panels = []
for p in expected_panels:
    if not (PANELS_DIR / f"{p}.png").exists():
        missing_panels.append(p)
if missing_panels:
    print(f"ASSERTION FAILED! Missing panels: {missing_panels}")
    failures.append(f"Missing panels: {missing_panels}")
else:
    print("All required panels generated successfully.")

# SAVE OUT
full_results = {
    "step3": results, "geom": geom_results, "dense": dense_results,
    "locality": locality_results, "flow_robustness": flow_robustness_results,
    "ai_origin": ai_results, "failures": failures, "wall_clocks": wall_clocks,
    "regression_diffs": regression_diffs
}

out_json = RESULTS_DIR / "results.json"
out_md = RESULTS_DIR / "results.md"

with open(out_json, "w") as f:
    json.dump(full_results, f, indent=2)

with open(out_md, "w") as f:
    f.write(f"# Spike Results {TIMESTAMP}\n\n")
    f.write(f"**Config**\n- ORIG crop box: {ORIG_CROP_BOX}\n- Seed: {SEED}\n")
    f.write(f"- OpenCV: {cv2.__version__}\n- Transformers: {__import__('transformers').__version__}\n\n")
    f.write("## Regression Check (vs Expected)\n")
    for k, v in regression_diffs.items():
        f.write(f"- {k}: abs diff {v:.4f}\n")
        
    f.write("\n## Table A (Base pipeline + DINOv2)\n")
    f.write(pd.DataFrame(results).round(3).to_markdown(index=False) if results else "No data")
    f.write("\n\n## Table B (Geometric)\n")
    f.write(pd.DataFrame(geom_results).round(3).to_markdown(index=False) if geom_results else "No data")
    f.write("\n\n## Table C (Dense Evidence)\n")
    f.write(pd.DataFrame(dense_results).round(3).to_markdown(index=False) if dense_results else "No data")
    
    f.write("\n\n## Locality Diagnostic\n")
    f.write(pd.DataFrame(locality_results).round(3).to_markdown(index=False) if locality_results else "No data")
    
    f.write("\n\n## Flow Robustness\n")
    f.write(pd.DataFrame(flow_robustness_results).round(3).to_markdown(index=False) if flow_robustness_results else "No data")
    
    f.write("\n\n## AI Origin Exploration\n")
    f.write(pd.DataFrame(ai_results).round(3).to_markdown(index=False) if ai_results else "No data")
    
    if failures:
        f.write("\n\n## Failures\n")
        for fail in failures: f.write(f"- {fail}\n")
            
    f.write("\n\n## Wall Clocks\n")
    for k, v in wall_clocks.items(): f.write(f"- {k}: {v:.2f}s\n")

print(RESULTS_DIR.resolve())
