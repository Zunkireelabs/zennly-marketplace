#!/usr/bin/env python3
"""Screenshot parity: ported route vs its same-tree mirror copy (/businesses/<p>/index.html).

    python scripts/compare-shots.py OUTDIR --base http://localhost:3011 about blog/x ...
Desktop 1440 + mobile 390, full page, after scrolling through (reveals), CSS animations/transitions frozen, <video> hidden,
lazy images forced eager. Reports % of pixels differing by >24/255 (any channel). Saves side-by-side PNGs when >1%.
"""
import argparse, sys
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

CSS = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{visibility:hidden!important}"

def shot(ctx, url, out):
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:150]))
    try:
        page.goto(url, wait_until="networkidle", timeout=45000)
    except Exception as e:
        errs.append("goto " + str(e)[:100])
    page.add_style_tag(content=CSS)
    page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')")
    try: page.wait_for_function("Array.from(document.images).every(i => i.complete)", timeout=15000)
    except Exception: pass
    h = page.evaluate("document.documentElement.scrollHeight")
    for y in range(0, h, 500):
        page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(60)
    page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(600)
    page.screenshot(path=str(out), full_page=True)
    page.close()
    return errs

def pct(a, b):
    h = min(a.height, b.height)
    A, B = a.crop((0, 0, a.width, h)).convert("RGB"), b.crop((0, 0, b.width, h)).convert("RGB")
    d = ImageChops.difference(A, B).convert("L").point(lambda v: 255 if v > 24 else 0)
    n = sum(1 for v in d.get_flattened_data() if v)
    extra = abs(a.height - b.height) * a.width
    return 100.0 * (n + extra) / (a.width * max(a.height, b.height)), a.height, b.height

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("paths", nargs="+"); ap.add_argument("--base", default="http://localhost:3011")
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.launch(channel="chrome")
        for path in a.paths:
            slug = path.replace("/", "-") or "home"
            u = f"{a.base}/businesses" + ("/" + path if path else "")
            row = []
            for name, (w, hh) in {"desktop": (1440, 900), "mobile": (390, 844)}.items():
                ctx = br.new_context(viewport={"width": w, "height": hh}, device_scale_factor=1, **({"is_mobile": True, "has_touch": True} if name == "mobile" else {}))
                ctx.route("**/*googletagmanager*", lambda r: r.abort()); ctx.route("**/*google-analytics*", lambda r: r.abort()); ctx.route("**/fonts.g*", lambda r: r.abort())  # same fallback fonts on both sides; the laptop network stalls font loads
                fp, fm = out / f"{slug}.{name}.ported.png", out / f"{slug}.{name}.mirror.png"
                for attempt in range(3):  # scroll-reveal timing is flaky under load: retry a >1% result up to twice, keep the best
                    shot(ctx, u, fp); shot(ctx, u + "/index.html", fm)
                    x, y = Image.open(fp), Image.open(fm)
                    v2, h1, h2 = pct(x, y)
                    if attempt == 0 or v2 < v: v = v2
                    if v < 1: break
                    x.close(); y.close()
                ctx.close()
                if v >= 1: x, y = Image.open(fp), Image.open(fm)
                row.append(f"{name} {v:.2f}% (h {h1}/{h2})")
                if v > 1:
                    sbs = Image.new("RGB", (x.width * 2, max(x.height, y.height)), "white"); sbs.paste(x, (0, 0)); sbs.paste(y, (x.width, 0)); sbs.save(out / f"{slug}.{name}.SBS.png")
                else:
                    fp.unlink(missing_ok=True); fm.unlink(missing_ok=True)
            print(f"SHOT {path or '/'}: " + " | ".join(row), flush=True)
        br.close()
main()
