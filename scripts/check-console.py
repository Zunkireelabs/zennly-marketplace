#!/usr/bin/env python3
"""Console gate: load each /businesses path (desktop 1440 + mobile 390), report console errors/warnings and page errors.
    python scripts/check-console.py --base http://localhost:3011 about blog/x ...   (hydration warnings count; ERR_NETWORK-type noise is listed separately)
Non-GET requests are aborted; GA is blocked."""
import argparse, re
from playwright.sync_api import sync_playwright
NOISE = re.compile(r"ERR_NETWORK|ERR_QUIC|INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_ABORTED|ERR_BLOCKED|Failed to load resource")
ap = argparse.ArgumentParser(); ap.add_argument("paths", nargs="+"); ap.add_argument("--base", default="http://localhost:3011"); a = ap.parse_args()
bad = 0
with sync_playwright() as p:
    br = p.chromium.launch(channel="chrome")
    for path in a.paths:
        for name, (w, h) in {"desktop": (1440, 900), "mobile": (390, 844)}.items():
            ctx = br.new_context(viewport={"width": w, "height": h}, **({"is_mobile": True} if name == "mobile" else {}))
            ctx.route("**/*", lambda r: r.abort() if (r.request.method != "GET" or "googletagmanager" in r.request.url or "google-analytics" in r.request.url) else r.continue_())
            pg = ctx.new_page(); msgs = []
            pg.on("console", lambda m: msgs.append(f"{m.type}: {m.text[:160]}") if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: msgs.append("pageerror: " + str(e)[:160]))
            try: pg.goto(f"{a.base}/businesses/{path}".rstrip("/"), wait_until="networkidle", timeout=45000)
            except Exception as e: msgs.append("goto: " + str(e)[:100])
            pg.wait_for_timeout(800)
            real = [m for m in msgs if not NOISE.search(m)]; noise = [m for m in msgs if NOISE.search(m)]
            if real: bad += 1
            print(f"{'FAIL' if real else 'ok  '} {path or '/'} {name}: {len(real)} real, {len(noise)} network-noise" + "".join("\n      " + m for m in real + noise[:2]), flush=True)
            ctx.close()
    br.close()
print(f"CONSOLE: {bad} page/viewport combinations with real console errors/warnings")
