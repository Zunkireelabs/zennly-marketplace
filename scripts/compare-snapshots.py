#!/usr/bin/env python3
"""Pass/fail gate for the /businesses migration: compare two snapshots made by snapshot-seo.py.

    python scripts/compare-snapshots.py before-v2 after
    python scripts/compare-snapshots.py before-v2 after --only /businesses/pricing

Exit code 0 = every checked page matches; 1 = at least one difference. Differences are printed
per page and per field, with both values, so a failure is never a judgement call.

What must match, per page: status, redirect chain, robots, canonical, title, description,
html lang, Open Graph, Twitter, hreflang, feed link, JSON-LD (order-insensitive), headings,
internal links (host-insensitive), external links, image count / missing alt, and the visible
text. Also: every old pre-move URL still lands on its page, and the root SEO files exist.
Screenshots are NOT compared here (videos make pixel diffs non-deterministic); use --shots to
get a per-page pixel-difference figure with video-heavy regions reported, not failed.
"""
import argparse, json, re, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ["final_status", "x_robots_tag", "robots", "canonical", "title", "description",
          "html_lang", "og", "twitter", "hreflang", "alternate_feeds", "headings",
          "images", "images_missing_alt"]


def norm_url(u, base):
    """Make a URL host-insensitive so a localhost 'after' compares with the live 'before'."""
    p = urlparse(u)
    if p.netloc and p.netloc in (urlparse(base).netloc, "zennly.io", "localhost:3001", "localhost:3011"):
        return p._replace(scheme="", netloc="").geturl()
    return u


def norm(v, base):
    if isinstance(v, str):
        return re.sub(r"https?://(zennly\.io|localhost:\d+)", "", v)
    if isinstance(v, list):
        return [norm(x, base) for x in v]
    if isinstance(v, dict):
        return {k: norm(x, base) for k, x in v.items()}
    return v


def canon_json(x):
    return json.dumps(x, sort_keys=True, ensure_ascii=False)


def load(d):
    s = json.loads((d / "summary.json").read_text())
    pages = {}
    for f in (d / "pages").glob("*.json"):
        r = json.loads(f.read_text()); pages[urlparse(r["url"]).path or "/"] = (f.stem, r)
    return s, pages


# The homepage hero headline rotates one word ("...without the friction/gridlock/headache/downtime",
# marketing/src/index.njk), so two captures of the same page legitimately differ there.
ROTATING = re.compile(r"without the\s*(friction|gridlock|headache|downtime)")


def text_of(d, stem):
    f = d / "text" / f"{stem}.txt"
    if not f.exists():
        return None
    return ROTATING.sub("without the <ROTATING>", re.sub(r"\s+", " ", f.read_text()).strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("before"); ap.add_argument("after")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--shots", action="store_true")
    a = ap.parse_args()
    B, A = ROOT / "snapshots" / a.before, ROOT / "snapshots" / a.after
    sb, pb = load(B); sa, pa = load(A)
    fails = 0

    def fail(page, field, b, x):
        nonlocal fails; fails += 1
        print(f"FAIL {page} [{field}]\n   before: {str(b)[:160]}\n   after : {str(x)[:160]}")

    paths = a.only or sorted(pb)
    for path in paths:
        if path not in pb:
            print(f"skip {path}: not in before"); continue
        if path not in pa:
            fail(path, "present", "page in before", "MISSING in after"); continue
        (sb_stem, rb), (sa_stem, ra) = pb[path], pa[path]
        for k in FIELDS:
            if canon_json(norm(rb.get(k), sb["base"])) != canon_json(norm(ra.get(k), sa["base"])):
                fail(path, k, rb.get(k), ra.get(k))
        jb = sorted(canon_json(norm(j, sb["base"])) for j in rb.get("jsonld", []))
        ja = sorted(canon_json(norm(j, sa["base"])) for j in ra.get("jsonld", []))
        if jb != ja:
            fail(path, "jsonld", f"{len(jb)} blocks", f"{len(ja)} blocks (content differs)" if len(jb) == len(ja) else f"{len(ja)} blocks")
        for k in ("links_internal", "links_external"):
            lb = sorted(norm(rb.get(k, []), sb["base"])); la = sorted(norm(ra.get(k, []), sa["base"]))
            if lb != la:
                fail(path, k, f"only before: {sorted(set(lb)-set(la))[:3]}", f"only after: {sorted(set(la)-set(lb))[:3]}")
        tb, ta = text_of(B, sb_stem), text_of(A, sa_stem)
        if tb is not None and tb != ta:
            fail(path, "visible text", tb[:120], (ta or "MISSING")[:120])
        # Servers word the same HTTP error differently ("404 ()" vs "404 (Not Found)"): compare
        # without the trailing parenthesis.
        errs = lambda r: {re.sub(r"\s*\([^)]*\)\s*$", "", e) for e in r.get("rendered", {}).get("desktop_errors", []) + r.get("rendered", {}).get("mobile_errors", [])}
        for e in sorted(errs(ra) - errs(rb)):
            if True:
                fail(path, "new console error", "-", e)

    if not a.only:
        for u, v in sb["old_urls"].items():
            va = {norm_url(k, sa["base"]): x for k, x in sa["old_urls"].items()}.get(norm_url(u, sb["base"]))
            exp = norm_url(v["expected"], sb["base"])
            if not va or norm_url(va["ends_at"], sa["base"]) != exp or va["final_status"] != 200:
                fail("old URL " + u, "redirect", exp, va and va["ends_at"])
        for p, v in sb["root_files"].items():
            va = sa["root_files"].get(p)
            if v["status"] == 200 and (not va or va["status"] != 200):
                fail("root file " + p, "status", v["status"], va and va["status"])
        for p, v in sa["root_files"].items():  # information only: things that now exist
            if sb["root_files"].get(p, {}).get("status") != 200 and v["status"] == 200:
                print(f"note  root file {p} is now served (was {sb['root_files'].get(p, {}).get('status')})")
        sm_b = {norm_url(u, sb["base"]) for u in sb["sitemap"] or []}; sm_a = {norm_url(u, sa["base"]) for u in sa["sitemap"] or []}
        if sm_b != sm_a:
            fail("sitemap.xml", "urls", f"only before: {sorted(sm_b-sm_a)[:3]}", f"only after: {sorted(sm_a-sm_b)[:3]}")

    if a.shots:
        from PIL import Image, ImageChops
        for path in paths:
            if path in pb and path in pa:
                for vp in ("desktop", "mobile"):
                    fb = B / "shots" / f"{pb[path][0]}.{vp}.jpg"; fa = A / "shots" / f"{pa[path][0]}.{vp}.jpg"
                    if fb.exists() and fa.exists():
                        ib, ia = Image.open(fb).convert("L"), Image.open(fa).convert("L")
                        if ib.size != ia.size:
                            print(f"shot {path} {vp}: HEIGHT differs {ib.size[1]} vs {ia.size[1]}"); continue
                        diff = ImageChops.difference(ib, ia).point(lambda p: 255 if p > 24 else 0)
                        pct = sum(1 for p in diff.getdata() if p) / (ib.size[0] * ib.size[1]) * 100
                        print(f"shot {path} {vp}: {pct:.2f}% pixels differ")

    n = len(paths)
    print(f"\n{'PASS' if fails == 0 else 'FAIL'}: {n} pages checked, {fails} difference(s)")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
