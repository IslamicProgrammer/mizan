#!/usr/bin/env python3
"""Generate the in-app screens. Shared chrome lives in tokens.css / app.css."""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "design-v3"
IC = "assets/icons/%s.png"

STATUS = '''  <div class="status">9:41<span class="r">
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect y="7.5" width="3" height="3.5" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" width="3" height="11" rx="1"/></svg>
    <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x=".5" y=".5" width="20" height="10" rx="3" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="17" height="7" rx="1.8" fill="currentColor"/><path d="M22 4v3a2 2 0 0 0 0-3" fill="currentColor" opacity=".5"/></svg>
  </span></div>
'''

CHEV = ('<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>')
BACK = ('<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19 8 12l7-7"/></svg>')

NAV_ITEMS = [
    ("home.html", "Bosh",
     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11 12 4.2 20 11"/><path d="M6.6 9.8V20h10.8V9.8"/></svg>'),
    ("timetable.html", "Vaqtlar",
     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.3V12l3.3 2" stroke-linecap="round"/></svg>'),
    ("garden.html", "Bog'",
     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20.6V11"/><path d="M12 11C12 7.2 9.3 5.2 5.3 5.2 5.3 9 8 11 12 11z"/><path d="M12 11c0-3.1 2.3-4.8 5.6-4.8C17.6 9.3 15.3 11 12 11z"/></svg>'),
    ("charity-promise.html", "Ehson",
     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20.4 4.7 13.2a4.5 4.5 0 1 1 7.3-5.1 4.5 4.5 0 1 1 7.3 5.1z"/></svg>'),
]


def nav(active=""):
    out = ["  <nav>"]
    for href, label, svg in NAV_ITEMS:
        on = " class=\"on\"" if href == active else ""
        out.append(f'    <a{on} href="{href}">{svg}<span>{label}</span></a>')
    out.append("  </nav>")
    return "\n".join(out)


def page(title, body, extra_css="", glow="soft", tab=""):
    g = f'<div class="glow {glow}"></div>' if glow else ""
    css = f"<style>\n{extra_css}\n</style>" if extra_css else ""
    return f'''<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Mizan — {title}</title>
<link rel="icon" href="assets/img/mizan-mark.svg">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="app.css">
{css}
</head>
<body>
<div class="screen">
  {g}<div class="bleed"></div>
{STATUS}{body}
{nav(tab) if tab else ""}
  <div class="grain"></div>
</div>
</body>
</html>
'''


def bar(title, back=None, right=""):
    b = f'<a class="ic" href="{back}" aria-label="Orqaga">{BACK}</a>' if back else ""
    return f'  <div class="bar">{b}<h1>{title}</h1>{right}</div>\n'


def li(icon=None, title="", sub="", value="", right="", chev=False, cls="", href=None):
    img = f'<img src="{IC % icon}" alt="">' if icon else ""
    s = f"<s>{sub}</s>" if sub else ""
    v = f'<span class="v">{value}</span>' if value else ""
    r = f'<span class="r">{right}</span>' if right else ""
    c = CHEV if chev else ""
    tag = "a" if href else "div"
    h = f' href="{href}"' if href else ""
    return (f'    <{tag} class="li {cls}"{h}>{img}<span class="l"><b>{title}</b>{s}</span>{v}{r}{c}</{tag}>')


def group(rows, style=""):
    st = f' style="{style}"' if style else ""
    return f'  <div class="list"{st}>\n' + "\n".join(rows) + "\n  </div>\n"


def tiles(items):
    out = ['  <div class="tiles">']
    for v, l in items:
        out.append(f'    <span class="tile"><b>{v}</b><s>{l}</s></span>')
    out.append("  </div>")
    return "\n".join(out) + "\n"
