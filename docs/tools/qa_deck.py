"""Static layout QA for a pptxgenjs deck: text overflow, tables running off the slide, shapes outside the slide.
Measures text with the real Calibri / Cambria font files, so wraps match PowerPoint closely."""
import sys, zipfile, re, os
from xml.etree import ElementTree as ET
from PIL import ImageFont

NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main", "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
EMU = 914400.0
FONTS = r"C:\Windows\Fonts"
FILES = {("Calibri", False): "calibri.ttf", ("Calibri", True): "calibrib.ttf", ("Cambria", False): "cambria.ttc", ("Cambria", True): "cambriab.ttf"}
_cache = {}


def font(face, bold, size):
    key = (face if face in ("Calibri", "Cambria") else "Calibri", bool(bold), round(size * 4))
    if key not in _cache:
        path = os.path.join(FONTS, FILES[(key[0], key[1])])
        _cache[key] = ImageFont.truetype(path, size=max(1, int(round(size * 4))))  # 4x for sub-point accuracy
    return _cache[key]


def text_width(txt, face, bold, size):
    return font(face, bold, size).getlength(txt) / 4.0  # points


def para_lines(runs, width_pt):
    """Greedy word wrap of a paragraph made of (text, face, bold, size) runs. Returns (line count, max font size)."""
    words = []
    for txt, face, bold, size in runs:
        for i, w in enumerate(re.findall(r"\S+\s*", txt) or [""]):
            words.append((w, face, bold, size))
    lines, cur = 1, 0.0
    maxsz = max([r[3] for r in runs] or [12])
    for w, face, bold, size in words:
        wl = text_width(w.rstrip(), face, bold, size)
        ws = text_width(w, face, bold, size)
        if cur > 0 and cur + wl > width_pt:
            lines += 1
            cur = ws
        else:
            cur += ws
    return lines, maxsz


def body_height(txbody, width_pt, default_size=18):
    """Estimated text height in points for a txBody."""
    total = 0.0
    paras = txbody.findall("a:p", NS)
    for p in paras:
        ppr = p.find("a:pPr", NS)
        indent = 0.0
        if ppr is not None and ppr.find("a:buChar", NS) is not None or (ppr is not None and ppr.find("a:buAutoNum", NS) is not None):
            indent = (int(ppr.get("marL", "0")) / 12700.0) or 16.0
        spc_after = 0.0
        if ppr is not None:
            sa = ppr.find("a:spcAft/a:spcPts", NS)
            if sa is not None:
                spc_after = int(sa.get("val")) / 100.0
        runs = []
        for r in p.findall("a:r", NS):
            rpr = r.find("a:rPr", NS)
            size = int(rpr.get("sz", int(default_size * 100))) / 100.0 if rpr is not None else default_size
            bold = rpr is not None and rpr.get("b") == "1"
            lat = rpr.find("a:latin", NS) if rpr is not None else None
            face = lat.get("typeface") if lat is not None else "Calibri"
            runs.append((r.findtext("a:t", default="", namespaces=NS), face, bold, size))
        if not runs:
            total += default_size * 1.2
            continue
        n, sz = para_lines(runs, max(10.0, width_pt - indent))
        total += n * sz * 1.2 + spc_after
    return total


def check(path):
    z = zipfile.ZipFile(path)
    sw = sh = None
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    sz = pres.find("p:sldSz", NS); sw, sh = int(sz.get("cx")) / EMU, int(sz.get("cy")) / EMU
    slides = sorted([n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)], key=lambda n: int(re.findall(r"\d+", n)[0]))
    issues = []
    for sl in slides:
        num = int(re.findall(r"\d+", sl)[0])
        root = ET.fromstring(z.read(sl))
        for sp in root.iter("{%s}sp" % NS["p"]):
            xfrm = sp.find("p:spPr/a:xfrm", NS)
            tx = sp.find("p:txBody", NS)
            if xfrm is None:
                continue
            x, y = int(xfrm.find("a:off", NS).get("x")) / EMU, int(xfrm.find("a:off", NS).get("y")) / EMU
            w, h = int(xfrm.find("a:ext", NS).get("cx")) / EMU, int(xfrm.find("a:ext", NS).get("cy")) / EMU
            if x < -0.01 or y < -0.01 or x + w > sw + 0.01 or y + h > sh + 0.01:
                issues.append((num, "OUTSIDE SLIDE", f"{x:.2f},{y:.2f} {w:.2f}x{h:.2f}"))
            if tx is None:
                continue
            txt = "".join(t.text or "" for t in tx.iter("{%s}t" % NS["a"])).strip()
            if not txt:
                continue
            bp = tx.find("a:bodyPr", NS)
            li = int(bp.get("lIns", 91440)) / 12700.0; ri = int(bp.get("rIns", 91440)) / 12700.0
            ti = int(bp.get("tIns", 45720)) / 12700.0; bi = int(bp.get("bIns", 45720)) / 12700.0
            need = body_height(tx, w * 72 - li - ri) + ti + bi
            have = h * 72
            if need > have * 1.02:
                issues.append((num, "TEXT OVERFLOW", f"needs {need / 72:.2f}in has {h:.2f}in :: {txt[:60]!r}"))
        for gf in root.iter("{%s}graphicFrame" % NS["p"]):
            xf = gf.find("p:xfrm", NS)
            tbl = gf.find(".//a:tbl", NS)
            if xf is None or tbl is None:
                continue
            x, y = int(xf.find("a:off", NS).get("x")) / EMU, int(xf.find("a:off", NS).get("y")) / EMU
            cols = [int(g.get("w")) / 12700.0 for g in tbl.findall("a:tblGrid/a:gridCol", NS)]
            total_h = 0.0
            for tr in tbl.findall("a:tr", NS):
                rh = int(tr.get("h")) / 12700.0
                need = 0.0
                for ci, tc in enumerate(tr.findall("a:tc", NS)):
                    tcpr = tc.find("a:tcPr", NS)
                    ml = int(tcpr.get("marL", 91440)) / 12700.0 if tcpr is not None else 7.2
                    mr = int(tcpr.get("marR", 91440)) / 12700.0 if tcpr is not None else 7.2
                    mt = int(tcpr.get("marT", 45720)) / 12700.0 if tcpr is not None else 3.6
                    mb = int(tcpr.get("marB", 45720)) / 12700.0 if tcpr is not None else 3.6
                    hgt = body_height(tc.find("a:txBody", NS), cols[ci] - ml - mr) + mt + mb
                    need = max(need, hgt)
                total_h += max(rh, need)
            bottom = y + total_h / 72
            if bottom > sh - 0.75:
                issues.append((num, "TABLE TOO LOW", f"table bottom {bottom:.2f}in (limit {sh - 0.75:.2f}in)"))
    return issues, len(slides)


if __name__ == "__main__":
    iss, n = check(sys.argv[1])
    print(f"{n} slides checked; {len(iss)} issue(s)")
    for i in iss:
        print("  slide %d: %s  %s" % i)
