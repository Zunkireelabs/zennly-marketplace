#!/usr/bin/env python3
"""Snapshot every page in a site's sitemap: the yardstick for the /businesses migration.

For each URL it records what a crawler sees (raw HTML: status, redirects, title, description,
robots, canonical, Open Graph, JSON-LD, headings, links, images) and what a person sees
(rendered text, plus mobile and desktop screenshots). It also records the OLD pre-move URL of
every marketing page (must still redirect) and the root SEO files.

Read-only against the target. Output goes to snapshots/<name>/ (gitignored).

    python scripts/snapshot-seo.py before                       # live https://zennly.io
    python scripts/snapshot-seo.py after --base http://localhost:3001
    python scripts/snapshot-seo.py before --only /businesses/pricing /businesses

Needs: playwright, pillow, beautifulsoup4, lxml, and system Chrome (channel="chrome").
"""
import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
VIEWPORTS = {"mobile": (390, 844), "desktop": (1440, 900)}
ROOT_FILES = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt", "/feed.xml",
              "/10666449c543422a85b0f3a9700e1039.txt", "/favicon.ico", "/favicon.png"]
UA = "zennly-seo-snapshot/1"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


_opener = urllib.request.build_opener(NoRedirect)


def fetch(url, host=None):
    """One request, redirects NOT followed. Returns (status, headers, body_bytes)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Host": host} if host else {})})
    try:
        r = _opener.open(req, timeout=30)
        return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()
    except Exception as e:  # network error is data too
        return 0, {"error": str(e)}, b""


def follow(url):
    """Redirect chain as [(status, url, location)], ending at the final response."""
    chain, cur = [], url
    for _ in range(8):
        status, headers, body = fetch(cur)
        loc = headers.get("Location") or headers.get("location")
        chain.append({"status": status, "url": cur, "location": loc})
        if status in (301, 302, 303, 307, 308) and loc:
            cur = urljoin(cur, loc)
            continue
        return chain, headers, body
    return chain, {}, b""


def sitemap_urls(base):
    status, _, body = fetch(base + "/sitemap.xml")
    if status != 200:
        sys.exit(f"sitemap.xml returned {status}")
    return re.findall(r"<loc>\s*([^<]+?)\s*</loc>", body.decode("utf8"))


def parse_html(html, page_url):
    soup = BeautifulSoup(html, "lxml")

    def meta(**attrs):
        t = soup.find("meta", attrs=attrs)
        return t.get("content") if t else None

    def metas(prefix):
        out = {}
        for t in soup.find_all("meta"):
            k = t.get("property") or t.get("name") or ""
            if k.startswith(prefix):
                out.setdefault(k, []).append(t.get("content"))
        return {k: (v[0] if len(v) == 1 else v) for k, v in sorted(out.items())}

    jsonld = []
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            jsonld.append(json.loads(s.string or ""))
        except Exception as e:
            jsonld.append({"_invalid_json": str(e), "_raw": (s.string or "")[:200]})

    canon = soup.find("link", rel="canonical")
    host = urlparse(page_url).netloc
    links = []
    for a in soup.find_all("a", href=True):
        h = a["href"].strip()
        if re.match(r"^(#|mailto:|tel:|javascript:)", h):
            continue
        links.append(urljoin(page_url, h))
    imgs = soup.find_all("img")
    return {
        "title": soup.title.get_text(strip=True) if soup.title else None,
        "description": meta(name="description"),
        "robots": meta(name="robots"),
        "canonical": canon.get("href") if canon else None,
        "html_lang": (soup.html or {}).get("lang") if soup.html else None,
        "og": metas("og:"),
        "twitter": metas("twitter:"),
        "hreflang": [(l.get("hreflang"), l.get("href")) for l in soup.find_all("link", rel="alternate") if l.get("hreflang")],
        "alternate_feeds": [l.get("href") for l in soup.find_all("link", rel="alternate") if "xml" in (l.get("type") or "")],
        "jsonld": jsonld,
        "headings": [[h.name, h.get_text(" ", strip=True)] for h in soup.find_all(["h1", "h2", "h3"])],
        "links_internal": sorted({l for l in links if urlparse(l).netloc == host}),
        "links_external": sorted({l for l in links if urlparse(l).netloc != host}),
        "images": len(imgs),
        "images_missing_alt": sum(1 for i in imgs if not (i.get("alt") or "").strip()),
    }


def slug(url, base):
    p = urlparse(url).path.strip("/") or "home"
    return re.sub(r"[^A-Za-z0-9._-]+", "_", p)


def capture(ctx_factory, url, out_dir):
    """Rendered text + screenshots for one URL. Returns dict of what was captured."""
    result = {}
    for name, (w, h) in VIEWPORTS.items():
        ctx = ctx_factory(w, h)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))
        page.on("console", lambda m: errors.append(m.text[:200]) if m.type == "error" else None)
        try:
            page.goto(url, wait_until="networkidle", timeout=45000)
        except Exception as e:
            errors.append(f"goto: {str(e)[:200]}")
        # Scroll through so scroll-triggered reveals (GSAP) fire, then return to the top.
        # Native lazy images below the fold otherwise stay blank in a full-page capture, which
        # looks like a layout difference but is only a screenshot artefact: load them all and
        # wait until every <img> has finished.
        try:
            page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')")
            try:
                page.wait_for_function(
                    "Array.from(document.images).every(i => i.complete)", timeout=15000)
            except Exception:
                errors.append("images: not all finished loading within 15s")
            height = None
            height = page.evaluate("document.documentElement.scrollHeight")
            for y in range(0, height, 500):
                page.evaluate(f"window.scrollTo(0,{y})")
                page.wait_for_timeout(60)
            page.evaluate("window.scrollTo(0,0)")
            page.wait_for_timeout(500)
            if name == "desktop":
                text = page.evaluate("document.body.innerText")
                (out_dir / "text").mkdir(exist_ok=True)
                (out_dir / "text" / f"{slug(url, '')}.txt").write_text(text)
                result["words"] = len(text.split())
            (out_dir / "shots").mkdir(exist_ok=True)
            page.screenshot(path=str(out_dir / "shots" / f"{slug(url, '')}.{name}.jpg"),
                            full_page=True, type="jpeg", quality=55)
            result[f"{name}_height"] = page.evaluate("document.documentElement.scrollHeight")
        except Exception as e:
            errors.append(f"capture: {str(e)[:200]}")
        result[f"{name}_errors"] = errors
        ctx.close()
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name", help="snapshot name, e.g. before / after")
    ap.add_argument("--base", default="https://zennly.io")
    ap.add_argument("--only", nargs="*", help="paths to snapshot instead of the whole sitemap")
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args()
    base = a.base.rstrip("/")
    out = ROOT / "snapshots" / a.name
    (out / "pages").mkdir(parents=True, exist_ok=True)

    if a.only:
        urls = [base + p for p in a.only]
        smap = None
    else:
        smap = sitemap_urls(base)
        urls = smap
    print(f"{len(urls)} URLs from {base}")

    pages = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        def ctx_factory(w, h):
            return browser.new_context(viewport={"width": w, "height": h}, user_agent=UA + " Mozilla/5.0")

        for i, url in enumerate(urls, 1):
            chain, headers, body = follow(url)
            html = body.decode("utf8", "replace")
            rec = {
                "url": url,
                "redirect_chain": chain,
                "final_status": chain[-1]["status"],
                "x_robots_tag": headers.get("X-Robots-Tag") or headers.get("x-robots-tag"),
                "content_type": headers.get("Content-Type") or headers.get("content-type"),
                "html_sha1": hashlib.sha1(body).hexdigest(),
            }
            if rec["final_status"] == 200 and "html" in (rec["content_type"] or ""):
                rec.update(parse_html(html, chain[-1]["url"]))
                if not a.no_shots:
                    rec["rendered"] = capture(ctx_factory, chain[-1]["url"], out)
            pages[url] = rec
            (out / "pages" / f"{slug(url, base)}.json").write_text(json.dumps(rec, indent=1, ensure_ascii=False))
            print(f"[{i}/{len(urls)}] {rec['final_status']} {url}")
        browser.close()

    # Old pre-move URLs: every /businesses page used to live at the root and must still redirect.
    old = {}
    for url in urls:
        path = urlparse(url).path
        if path.startswith("/businesses"):
            old_path = path[len("/businesses"):] or "/"
            old_url = base + old_path
            if old_path == "/":
                continue  # the root is the marketplace homepage now, not a redirect
            chain, _, _ = follow(old_url)
            old[old_url] = {"expected": url, "chain": chain, "ends_at": chain[-1]["url"],
                            "final_status": chain[-1]["status"]}
    root = {}
    for path in ROOT_FILES:
        status, headers, body = fetch(base + path)
        root[path] = {"status": status, "content_type": headers.get("Content-Type"), "bytes": len(body),
                      "sha1": hashlib.sha1(body).hexdigest()}
    (out / "summary.json").write_text(json.dumps(
        {"base": base, "count": len(urls), "sitemap": smap, "old_urls": old, "root_files": root},
        indent=1, ensure_ascii=False))
    print(f"done -> {out}")


if __name__ == "__main__":
    main()
