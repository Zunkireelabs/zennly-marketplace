#!/usr/bin/env python3
"""Generate Next pages for /businesses mirror pages (Step 4 of the /businesses -> Next.js migration).

usage: port-businesses-pages.py <mirror-path> [<mirror-path> ...]     e.g. about blog/spa-x
       port-businesses-pages.py --batch 1|2|3 | --all
Reads public/businesses/<path>/index.html (never edited) and writes, per page:
  src/app/(marketing-<bodyclass>)/businesses/<path>/page.tsx      (tiny)
  src/components/marketing/pages/generated/<slug>.ts               (head props + exact body strings)
  (marketing-<bodyclass>)/layout.tsx if that body-class group does not exist yet
and adds the path to src/lib/businesses-ported.ts. Content is never retyped: body segments are sliced from the mirror.
Page = shared nav | MAIN | shared footer | TAIL | shared demo modal  (nav/footer/modal come from the shared components).
Named overrides below handle one-off pages.
"""
import html, json, re, sys, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIRROR = os.path.join(ROOT, "public/businesses")
APP = os.path.join(ROOT, "src/app")
GEN = os.path.join(ROOT, "src/components/marketing/pages/generated")
PORTED = os.path.join(ROOT, "src/lib/businesses-ported.ts")
ALREADY = {"", "blog/spa-booking-app-nepal"}  # hand-ported pilots
DEFAULT_OG = "https://zennly.io/businesses/assets/images/og-default.jpg"

def lit(s):  # exact JS string literal, ASCII only
    return json.dumps(s, ensure_ascii=True)

def mirror_pages():
    out = []
    for f in sorted(glob.glob(MIRROR + "/**/index.html", recursive=True)):
        p = os.path.relpath(os.path.dirname(f), MIRROR)
        out.append("" if p == "." else p)
    return out

def meta(head, attr, key):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"\s*/?>' % (attr, re.escape(key)), head)
    return html.unescape(m.group(1)) if m else None

from html.parser import HTMLParser
VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
class _Bal(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False); self.stack = []; self.bad = False
    def handle_starttag(self, tag, attrs):
        if tag not in VOID: self.stack.append(tag)
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if tag in VOID: return
        if self.stack and self.stack[-1] == tag: self.stack.pop()
        else: self.bad = True
def balanced(s):
    b = _Bal(); b.feed(s); b.close()
    return not b.stack and not b.bad

def parse(path):
    h = open(os.path.join(MIRROR, path, "index.html"), encoding="utf-8").read()
    hi = h.index("</head>")
    head = h[:hi]
    bm = re.search(r"<body([^>]*)>", h)
    cm = re.search(r'class="([^"]*)"', bm.group(1))
    bodyclass = cm.group(1) if cm else ""
    title = html.unescape(re.search(r"<title>(.*?)</title>", head, re.S).group(1))
    desc = meta(head, "name", "description")
    canon = html.unescape(re.search(r'<link rel="canonical" href="([^"]*)"', head).group(1))
    assert canon.startswith("https://zennly.io/businesses"), canon
    cpath = canon[len("https://zennly.io/businesses"):]
    assert cpath == ("/" + path if path else ""), (path, canon)
    og_image = meta(head, "property", "og:image")
    og_type = meta(head, "property", "og:type")
    robots = meta(head, "name", "robots")
    assert robots in (None, "noindex,nofollow"), robots
    has_np = 'hreflang="en-NP"' in head
    for k, v in (("og:title", title), ("og:description", desc)):
        assert meta(head, "property", k) == v, (path, k)
    for k, v in (("twitter:title", title), ("twitter:description", desc)):
        assert meta(head, "name", k) == v, (path, k)
    props = {"title": title, "description": desc, "path": cpath}
    if og_image != DEFAULT_OG:
        assert og_image.startswith("https://zennly.io/businesses/"), og_image
        props["ogImage"] = og_image[len("https://zennly.io/businesses"):]
    if og_type != "website":
        props["ogType"] = og_type
    if robots:
        props["noindex"] = True
    if not has_np:
        props["globalPage"] = True
    if og_type == "article":
        a = {"datePublished": meta(head, "property", "article:published_time")}
        mod = meta(head, "property", "article:modified_time")
        if mod != a["datePublished"]:
            a["dateModified"] = mod
        a["dateModified"] = mod
        sec = meta(head, "property", "article:section")
        if sec:
            a["category"] = sec
        props["article"] = a
    # body slicing
    bi = bm.end()
    end = h.index('<script src="/businesses/assets/vendor/alpine.min.js"', bi)
    body = h[bi:end]
    nav0 = body.index("<!-- Shared nav")
    assert body[:nav0].strip() == "", path
    sc = body.index('id="v2-nav-mobile-scrim"', nav0)  # the shared nav = header + mega panels + mobile menu + scrim
    nav1 = body.index("</div>", sc) + len("</div>")
    f0 = body.index('<footer class="v2-site-footer">', nav1)
    f1 = body.index("</footer>", f0) + len("</footer>")
    m0 = body.index('<!-- "Try a free demo" popup', f1)
    assert body.count('<!-- "Try a free demo" popup') == 1
    main, tail = body[nav1:f0], body[f1:m0]
    inline = not (balanced(main) and balanced(tail))
    if inline:
        # An element opened before the footer is closed after it (e.g. <main> ... footer ... </main>). Split across two
        # innerHTML wrappers the browser would close it early and move the footer, so keep footer and tail in one string.
        main, tail = body[nav1:m0], ""
    return props, bodyclass, main, tail, inline

def group_name(bodyclass):
    s = re.sub(r"page--", "", bodyclass).strip()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return "(marketing-" + s + ")"

def ensure_group(bodyclass):
    g = group_name(bodyclass)
    d = os.path.join(APP, g)
    lay = os.path.join(d, "layout.tsx")
    if not os.path.exists(lay):
        os.makedirs(d, exist_ok=True)
        comp = "Marketing" + "".join(w.capitalize() for w in re.split(r"[^a-z0-9]+", g.strip("()").replace("marketing-", "")) if w) + "Layout"
        open(lay, "w").write(
            'import { MarketingShell } from "@/components/marketing/marketing-shell";\n\n'
            "// Generated by scripts/port-businesses-pages.py: one root layout per <body class> variant. See (marketing-light-nav)/layout.tsx.\n"
            "export default function %s({ children }: { children: React.ReactNode }) {\n"
            "  return <MarketingShell bodyClass=%s>{children}</MarketingShell>;\n}\n" % (comp, lit(bodyclass)))
    return g

def tsprops(props):
    parts = []
    for k, v in props.items():
        if k == "article":
            inner = ", ".join("%s: %s" % (kk, lit(vv)) for kk, vv in v.items())
            parts.append("  article: { %s }," % inner)
        elif isinstance(v, bool):
            parts.append("  %s: true," % k)
        else:
            parts.append("  %s: %s," % (k, lit(v)))
    return "\n".join(parts)

def port(path):
    props, bodyclass, main, tail, inline = parse(path)
    g = ensure_group(bodyclass)
    slug = path.replace("/", "-")
    os.makedirs(GEN, exist_ok=True)
    open(os.path.join(GEN, slug + ".ts"), "w").write(
        "// Generated by scripts/port-businesses-pages.py from public/businesses/%s/index.html. Do not edit by hand.\n"
        'import type { PageHeadProps } from "../../page-head";\n\n'
        "export const HEAD: PageHeadProps = {\n%s\n};\n"
        "/** Between the shared nav and the shared footer. */\nexport const MAIN: string = %s;\n"
        "/** Between the shared footer and the demo pop-up. */\nexport const TAIL: string = %s;\n"
        "/** True when the footer is inside MAIN (markup opened before it is closed after it). */\nexport const FOOTER_INLINE: boolean = %s;\n"
        % (path, tsprops(props), lit(main), lit(tail), "true" if inline else "false"))
    pd = os.path.join(APP, g, "businesses", path)
    os.makedirs(pd, exist_ok=True)
    open(os.path.join(pd, "page.tsx"), "w").write(
        'import { GeneratedPage } from "@/components/marketing/generated-page";\n'
        'import { FOOTER_INLINE, HEAD, MAIN, TAIL } from "@/components/marketing/pages/generated/%s";\n\n'
        "export default function Page() {\n  return <GeneratedPage head={HEAD} main={MAIN} tail={TAIL} footerInline={FOOTER_INLINE} />;\n}\n" % slug)
    return g

def add_ported(paths):
    src = open(PORTED).read()
    for p in paths:
        url = "/businesses/" + p
        if '"%s"' % url not in src:
            src = src.replace("]);\n\nexport function", '  "%s",\n]);\n\nexport function' % url, 1)
    open(PORTED, "w").write(src)

def main():
    args = sys.argv[1:]
    allp = [p for p in mirror_pages() if p not in ALREADY]
    if args[:1] == ["--all"]:
        paths = allp
    elif args[:1] == ["--batch"]:
        b = args[1]
        single = {"about","privacy-policy","cookie-policy","press","global","case-study","daily-close-checklist","contact","demo","pricing","faq","compare","features","solutions","nepal","glossary","blog"}
        if b == "1": paths = [p for p in allp if p in single]
        elif b == "2": paths = [p for p in allp if p.startswith("blog/")]
        else: paths = [p for p in allp if p not in single and not p.startswith("blog/")]
    else:
        paths = args
    for p in paths:
        assert p in allp, "unknown or already-ported page: " + p
        port(p)
    add_ported(paths)
    print("generated %d pages" % len(paths))
    for p in paths: print("  /businesses/" + p)

if __name__ == "__main__":
    main()
