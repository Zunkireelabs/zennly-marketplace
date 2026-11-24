#!/usr/bin/env python3
"""Interaction gate for the /businesses migration: do the page behaviours still work?

The pages carry ~35 inline scripts (demo modal, plan pop-up, Calendly, nav menus, carousels,
blog filter, FAQ accordion, checklist). A page can look identical and have every one of them
dead (e.g. inline <script> does not run when HTML is injected through React), so looks-only
comparison cannot catch it. This clicks the real controls and asserts the resulting state.

    python scripts/check-interactions.py before                    # live https://zennly.io
    python scripts/check-interactions.py after --base http://localhost:3001
    python scripts/check-interactions.py after --base ... --compare before

SAFETY: every non-GET request is aborted and logged, and Google Analytics is blocked. The tests
never fill or submit the demo/contact forms, so nothing can be sent to the lead pipeline, the
email provider or analytics.

Exit 0 = every test passed (and, with --compare, nothing that passed before fails now).
Results: snapshots/<name>/interactions.json. Needs playwright + system Chrome.
"""
import argparse, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DESKTOP, MOBILE = (1440, 900), (390, 844)
UA = "zennly-interaction-check/1"


def aria(page, sel):
    return page.get_attribute(sel, "aria-expanded")


# --- tests: each takes (page) and returns (ok, detail) ------------------------------------

def t_libs(page):
    got = page.evaluate("({gsap: typeof gsap, Alpine: typeof Alpine, Lenis: typeof Lenis, ST: typeof ScrollTrigger})")
    bad = {k: v for k, v in got.items() if v == "undefined"}
    return (not bad, f"undefined: {bad}" if bad else "gsap, Alpine, Lenis, ScrollTrigger loaded")


def t_demo_modal(page):
    page.click("[data-trial-open] >> visible=true >> nth=0")
    page.wait_for_function("document.getElementById('tf-modal').classList.contains('is-open')", timeout=4000)
    open_attr = page.get_attribute("#tf-modal", "aria-hidden")
    locked = page.evaluate("document.documentElement.classList.contains('tf-lock')")
    page.keyboard.press("Escape")
    page.wait_for_function("!document.getElementById('tf-modal').classList.contains('is-open')", timeout=4000)
    return (open_attr == "false" and locked, f"aria-hidden={open_attr}, scroll locked={locked}, Escape closes")


def t_demo_modal_via_mobile_menu(page):
    page.click("#v2-nav-toggle"); page.wait_for_timeout(500)
    page.locator("#v2-nav-mobile [data-trial-open], .v2-nav-mobile [data-trial-open]").first.click()
    page.wait_for_function("document.getElementById('tf-modal').classList.contains('is-open')", timeout=4000)
    return (True, "demo modal opens from the phone menu button")


def t_demo_lower_buttons(page):
    # Every "Try a free demo" button on the page must open the modal, not only the header ones.
    res = page.evaluate("""async () => {
      const m = document.getElementById('tf-modal'), bad = [];
      for (const el of document.querySelectorAll('[data-trial-open]')) {
        m.classList.remove('is-open'); el.click(); await new Promise(r => setTimeout(r, 400));
        if (!m.classList.contains('is-open')) bad.push((el.closest('section,header,footer,nav') || {}).className || el.className);
        m.classList.remove('is-open'); document.documentElement.classList.remove('tf-lock');
      }
      return bad; }""")
    return (not res, "all demo buttons open the modal" if not res else f"do NOT open the modal: {res}")


def t_demo_step_validation(page):
    # Continue with nothing filled must stay on step 1 and show the error (no network involved).
    page.click("[data-trial-open] >> visible=true >> nth=0")
    page.wait_for_selector("#tf-modal.is-open", timeout=4000)
    page.click("#tf-next")
    page.wait_for_timeout(300)
    err_visible = page.evaluate("!document.getElementById('tf-error').hidden")
    step = page.evaluate("Array.from(document.querySelectorAll('#tf-form .tf-step')).findIndex(s => s.classList.contains('is-active'))")
    page.keyboard.press("Escape")
    return (err_visible and step == 0, f"error shown={err_visible}, still on step index {step}")


def t_hash_opens_modal(page):
    # /businesses#try-free must open the demo modal on load (links in the wild use it).
    page.goto(page.url.split("#")[0] + "#try-free")
    page.reload()
    ok = page.evaluate("document.getElementById('tf-modal').classList.contains('is-open')") if page.query_selector("#tf-modal") else False
    return (ok, f"modal open after load with #try-free: {ok}")


def t_desktop_mega_menu(page):
    trig = page.locator(".v2-nav__mega-trigger").first
    trig.hover()
    page.wait_for_timeout(500)
    state = trig.get_attribute("aria-expanded")
    return (state == "true", f"first mega-menu trigger aria-expanded={state} after hover")


def t_mobile_menu(page):
    page.click("#v2-nav-toggle")
    page.wait_for_timeout(400)
    top = aria(page, "#v2-nav-toggle")
    page.locator(".v2-nav-mobile__trigger").first.click()
    page.wait_for_timeout(300)
    sub = page.locator(".v2-nav-mobile__trigger").first.get_attribute("aria-expanded")
    return (top == "true" and sub == "true", f"menu toggle aria-expanded={top}, first submenu={sub}")


def t_faq(page):
    q = page.locator(".v2-faq__q").first
    q.scroll_into_view_if_needed()
    q.click(); page.wait_for_timeout(300)
    opened = q.get_attribute("aria-expanded")
    q.click(); page.wait_for_timeout(300)
    closed = q.get_attribute("aria-expanded")
    return (opened == "true" and closed == "false", f"open={opened}, closed again={closed}")


def t_plan_modal(page):
    page.locator('[data-plan-open="single"]').first.scroll_into_view_if_needed()
    page.locator('[data-plan-open="single"]').first.click()
    page.wait_for_timeout(500)
    hidden = page.get_attribute("#plan-modal", "aria-hidden")
    opened = page.evaluate("document.getElementById('plan-modal').classList.contains('is-open')")
    page.keyboard.press("Escape"); page.wait_for_timeout(300)
    closed = not page.evaluate("document.getElementById('plan-modal').classList.contains('is-open')")
    return (opened and hidden == "false" and closed, f"opens={opened}, aria-hidden={hidden}, Escape closes={closed}")


def t_calendly(page):
    page.locator("[data-calendly-trigger]").first.scroll_into_view_if_needed()
    page.locator("[data-calendly-trigger]").first.click()
    try:
        page.wait_for_selector(".calendly-overlay, iframe[src*='calendly.com']", timeout=10000)
        return (True, "Calendly popup appeared")
    except Exception:
        return (False, "Calendly popup did not appear within 10s")


def t_blog_filter(page):
    count = "Array.from(document.querySelectorAll('#blog2-grid .blog2-card')).filter(c => c.offsetParent !== null).length"
    before = page.evaluate(count)
    page.fill("#blog2-q", "zzzznomatchzzzz"); page.wait_for_timeout(500)
    none = page.evaluate(count)
    page.fill("#blog2-q", ""); page.wait_for_timeout(500)
    back = page.evaluate(count)
    return (before > 0 and none == 0 and back == before, f"cards before={before}, no-match={none}, cleared={back}")


def t_carousel(page):
    sc = page.locator(".sq-carousel__scroller").first
    sc.scroll_into_view_if_needed()
    a = sc.evaluate("e => e.scrollLeft")
    page.locator('.sq-carousel__btn[data-sq="1"]').first.click()
    page.wait_for_timeout(900)
    b = sc.evaluate("e => e.scrollLeft")
    return (b != a, f"scrollLeft {a:.0f} -> {b:.0f} after Next")


def t_checklist(page):
    box = page.locator("input.cl-row__input").first
    row = page.locator("label.cl-row").first  # the checkbox itself is invisible; the label is clicked
    row.scroll_into_view_if_needed()
    row.click(); page.wait_for_timeout(300)
    checked = box.is_checked()
    stored = page.evaluate("localStorage.getItem('zennly-dcl')")
    row.click()  # leave it as we found it
    return (checked and bool(stored), f"checked={checked}, saved to localStorage={bool(stored)}")


def t_contact_form_present(page):
    # Only presence + chip selection: the form is never submitted.
    ok = page.evaluate("!!document.getElementById('contact-form') && document.getElementById('contact-form').querySelectorAll('input[name=topic]').length > 0")
    return (ok, f"contact form with topic chips present: {ok}")


# Bugs already present on the live site before any migration work (found 2026-11-24 with a real
# browser: the "Try a free demo" buttons in the bottom banner and footer do nothing, at every
# screen size, in web-zenly's own code too). Reported as KNOWN, not failed; the migration must not
# make the list longer. Fixing one is a separate, deliberate change: remove its id here then.
KNOWN_BROKEN = set()  # demo-all-buttons-open-modal was listed here until fixed (see git history)

# (test id, path, viewport, fn). Paths are the /businesses paths.
TESTS = [
    ("libs-loaded/home", "/businesses", DESKTOP, t_libs),
    ("demo-modal/desktop", "/businesses", DESKTOP, t_demo_modal),
    ("demo-modal/mobile-menu", "/businesses", MOBILE, t_demo_modal_via_mobile_menu),
    ("demo-all-buttons-open-modal", "/businesses", DESKTOP, t_demo_lower_buttons),
    ("demo-step-validation", "/businesses", DESKTOP, t_demo_step_validation),
    ("demo-modal-on-inner-page", "/businesses/pricing", DESKTOP, t_demo_modal),
    ("demo-modal-on-blog-post", "/businesses/blog/spa-booking-app-nepal", DESKTOP, t_demo_modal),
    ("hash-try-free-opens-modal", "/businesses", DESKTOP, t_hash_opens_modal),
    ("mega-menu", "/businesses", DESKTOP, t_desktop_mega_menu),
    ("mobile-menu", "/businesses", MOBILE, t_mobile_menu),
    ("faq-accordion", "/businesses", DESKTOP, t_faq),
    ("plan-modal", "/businesses/pricing", DESKTOP, t_plan_modal),
    ("calendly", "/businesses/demo", DESKTOP, t_calendly),
    ("blog-filter", "/businesses/blog", DESKTOP, t_blog_filter),
    ("carousel", "/businesses/solutions/barbershop", DESKTOP, t_carousel),
    ("checklist", "/businesses/daily-close-checklist", DESKTOP, t_checklist),
    ("contact-form", "/businesses/contact", DESKTOP, t_contact_form_present),
]


PATH_MAP = {}


def run(base, only):
    results, blocked = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        for tid, path, (w, h), fn in TESTS:
            if only and not any(o in tid for o in only):
                continue
            ctx = browser.new_context(viewport={"width": w, "height": h}, user_agent=UA + " Mozilla/5.0")
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)[:160]))

            def guard(route):
                req = route.request
                if req.method != "GET":
                    blocked.append(f"{req.method} {req.url}")
                    return route.abort()
                if any(x in req.url for x in ("googletagmanager.com", "google-analytics.com", "doubleclick.net")):
                    return route.abort()
                return route.continue_()
            page.route("**/*", guard)
            try:
                page.goto(base + PATH_MAP.get(path, path), wait_until="networkidle", timeout=45000)
                ok, detail = fn(page)
            except Exception as e:
                ok, detail = False, f"exception: {str(e).splitlines()[0][:200]}"
            results.append({"test": tid, "path": path, "viewport": f"{w}x{h}", "ok": bool(ok),
                            "detail": detail, "page_errors": errors})
            results[-1]["known_broken"] = tid in KNOWN_BROKEN and not ok
            label = "PASS" if ok else ("KNOWN" if tid in KNOWN_BROKEN else "FAIL")
            print(f"{label:5} {tid:32} {detail}" + (f"   [page errors: {errors}]" if errors else ""))
            ctx.close()
        browser.close()
    return results, blocked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--base", default="https://zennly.io")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--map", action="append", default=[], metavar="FROM=TO",
                    help="serve a path from a different URL, e.g. /businesses=/trial/home (repeatable)")
    ap.add_argument("--compare", help="name of an earlier run; fail if anything that passed there fails now")
    a = ap.parse_args()
    PATH_MAP.update(dict(m.split("=", 1) for m in a.map))
    results, blocked = run(a.base.rstrip("/"), a.only)
    out = ROOT / "snapshots" / a.name
    out.mkdir(parents=True, exist_ok=True)
    (out / "interactions.json").write_text(json.dumps({"base": a.base, "results": results,
                                                        "blocked_non_get_requests": blocked}, indent=1))
    known = [r for r in results if r.get("known_broken")]
    failed = [r for r in results if not r["ok"] and not r.get("known_broken")]
    if a.compare:
        prev = {r["test"]: r for r in json.loads((ROOT / "snapshots" / a.compare / "interactions.json").read_text())["results"]}
        failed = [r for r in results if (not r["ok"] and not r.get("known_broken")) or (r["test"] in prev and r["page_errors"] and not prev[r["test"]]["page_errors"])]
        for t, r in prev.items():
            if r["ok"] and t not in {x["test"] for x in results} and not a.only:
                print(f"FAIL  {t}: ran before, missing now"); failed.append(r)
    print(f"\nBlocked non-GET requests (would have been sent): {len(blocked)}")
    print(f"Known pre-existing live-site bugs still present: {len(known)} {[r['test'] for r in known]}")
    print(f"{'PASS' if not failed else 'FAIL'}: {len(results)} interaction tests, {len(failed)} failing")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
