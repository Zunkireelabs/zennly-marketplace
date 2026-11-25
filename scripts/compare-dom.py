#!/usr/bin/env python3
"""DOM equality gate for ported /businesses pages: ported route vs its same-tree mirror copy.

    python scripts/compare-dom.py --base http://localhost:3011 about blog/x ...      (paths under /businesses)
    python scripts/compare-dom.py --base http://localhost:3011 --all                 (every path in businesses-ported.ts)

Fetches http://BASE/businesses/<p> (ported) and http://BASE/businesses/<p>/index.html (mirror), parses both RAW (no JS run)
with the same lenient parser and compares <body> and <head>.
Body ignores ONLY: display:contents wrapper divs (unwrapped), React's empty hidden div, Next's own <script>s (/_next, __next_f),
a trailing ';' in style attributes, HTML comments (React/Next add markers; invisible), whitespace runs.
Head compares the SET of (tag, attrs, text) for title/meta/link/style/script, ignoring Next's own tags and charset/viewport (/_next, preload, next-size-adjust).
Exit 1 on any difference.
"""
import argparse, re, sys, urllib.request
from lxml import html as LH
from lxml import etree

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "dom-compare/1"}), timeout=60).read().decode("utf-8")

def norm_style(v):
    v = re.sub(r"\s+", " ", v).strip()
    parts = [p.strip() for p in v.split(";") if p.strip()]
    return "; ".join(re.sub(r"\s*:\s*", ": ", p) for p in parts)

def norm_attrs(el):
    out = {}
    for k, v in el.attrib.items():
        v = v or ""
        if k == "style":
            v = norm_style(v)
        elif k == "class":
            v = " ".join(v.split())
        out[k] = v
    return tuple(sorted(out.items()))

def is_next_script(el):
    if el.tag != "script": return False
    src = el.get("src") or ""
    txt = el.text or ""
    return src.startswith("/_next/") or "__next_f" in txt or "$RC" in txt or "$RS" in txt or "self.__next" in txt or "_next/static" in src or el.get("id", "").startswith("_R_") or "next-" in (el.get("data-nscript") or "next-")

def is_wrapper(el):
    return el.tag == "div" and (el.get("style") or "").replace(" ", "").rstrip(";") == "display:contents" and list(el.attrib.keys()) == ["style"]

def is_react_hidden(el):
    return el.tag == "div" and el.get("hidden") is not None and all(not isinstance(c.tag, str) for c in el) and not (el.text or "").strip()

def canon(el):
    """Flatten to a list of tokens: ('open', tag, attrs) / ('text', t) / ('close', tag), unwrapping ignorable nodes."""
    toks = []
    def txt(t):
        t = re.sub(r"\s+", " ", t or "")
        if t.strip(): toks.append(("text", t.strip() if False else t))
    def walk(e, top=False):
        for c in e:
            if not isinstance(c.tag, str):  # comment / PI
                txt(c.tail); continue
            if is_next_script(c) or is_react_hidden(c):
                txt(c.tail); continue
            if is_wrapper(c):
                txt(c.text); walk(c); txt(c.tail); continue
            toks.append(("open", c.tag, norm_attrs(c)))
            txt(c.text)
            walk(c)
            toks.append(("close", c.tag))
            txt(c.tail)
    txt(el.text); walk(el)
    # merge adjacent text tokens and trim spaces next to tags
    merged = []
    for t in toks:
        if t[0] == "text" and merged and merged[-1][0] == "text":
            merged[-1] = ("text", merged[-1][1] + t[1])
        else:
            merged.append(t)
    out = []
    for t in merged:
        if t[0] == "text":
            s = re.sub(r"\s+", " ", t[1]).strip()
            if s: out.append(("text", s))
        else: out.append(t)
    return out

def head_set(doc):
    s = set()
    for e in doc.find("head"):
        if not isinstance(e.tag, str): continue
        if e.tag == "link" and (e.get("rel") in ("preload", "modulepreload") or (e.get("href") or "").startswith("/_next/")): continue
        if e.tag == "meta" and (e.get("name") in ("next-size-adjust", "viewport") or e.get("charset")): continue  # Next's own charset/viewport (viewport "1" vs "1.0"): same since the pilot
        if is_next_script(e): continue
        if e.tag == "script" and (e.get("src") or "").startswith("/_next/"): continue
        s.add((e.tag, norm_attrs(e), re.sub(r"\s+", " ", (e.text or "")).strip()))
    return s

def show(tok):
    return " ".join(str(x) for x in tok)[:200]

def diff(a, b, label, n=3):
    msgs = []
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]: i += 1
    if i == len(a) == len(b): return msgs
    ctx = lambda L: " | ".join(show(t) for t in L[max(0, i - 2): i + 3])
    msgs.append(f"{label}: first difference at token {i} of {len(a)}/{len(b)}\n    ported: {ctx(a)}\n    mirror: {ctx(b)}")
    return msgs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*"); ap.add_argument("--base", default="http://localhost:3011"); ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    paths = a.paths
    if a.all:
        src = open(__file__.replace("scripts/compare-dom.py", "src/lib/businesses-ported.ts")).read()
        paths = [re.sub(r"^/businesses/?", "", p) for p in re.findall(r'"(/businesses[^"]*)"', src)]
    bad = 0
    for p in paths:
        base = f"{a.base}/businesses" + ("/" + p if p else "")
        try:
            ported, mirror = get(base), get(base + "/index.html" if p else base + "/index.html")
        except Exception as e:
            print(f"FAIL {p or '/'}: fetch error {e}"); bad += 1; continue
        P, M = LH.document_fromstring(ported), LH.document_fromstring(mirror)
        msgs = diff(canon(P.find("body")), canon(M.find("body")), "body")
        if (P.find("body").get("class") or "") != (M.find("body").get("class") or ""):
            msgs.append(f"body class: {P.find('body').get('class')!r} vs {M.find('body').get('class')!r}")
        hp, hm = head_set(P), head_set(M)
        for t in sorted(hp - hm, key=str)[:4]: msgs.append("head only in ported: " + show(t))
        for t in sorted(hm - hp, key=str)[:4]: msgs.append("head only in mirror: " + show(t))
        if msgs:
            bad += 1; print(f"FAIL {p or '/'}"); [print("  " + m) for m in msgs]
    print(f"DOM EQUALITY: {len(paths) - bad}/{len(paths)} pages identical, {bad} with differences")
    sys.exit(1 if bad else 0)

main()
