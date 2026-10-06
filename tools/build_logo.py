#!/usr/bin/env python3
"""Build every Mizan logo asset from the one traced icon.

Everything here derives from logos/mizan/icon.svg, so the mark can only be
changed in one place. Run tools/trace_icon.py first if the silhouette changes.
"""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "logos" / "mizan"
EXPORT = OUT / "export"
EXPORT.mkdir(parents=True, exist_ok=True)

GOLD, BROWN, CREAM = "#E8B762", "#50320F", "#F8F2EA"

src = (OUT / "icon.svg").read_text()
# the three gold shapes, without the tile behind them
shapes = re.search(r'<g fill="#E8B762">(.*?)</g>', src, re.S).group(1).strip()

# Where the mark sits inside its own 512 box, measured from the traced paths.
SYM_L, SYM_R, SYM_T, SYM_B = 85.5, 426.0, 102.6, 409.4
SYM_W, SYM_H = SYM_R - SYM_L, SYM_B - SYM_T

# ---------------------------------------------------------------- adaptive icon
# Android draws 108dp but may mask anything outside the central 66dp, so the
# foreground layer is the same mark scaled to sit inside that safe zone. The
# mark is already centred on (256, 256), so this is a pure scale about centre.
SAFE = 66 / 108
tx = 256 * (1 - SAFE)
(OUT / "icon-foreground.svg").write_text(
    f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Android adaptive foreground: the mark scaled into the 66/108 safe zone.
       Pair it with icon-background.svg (a flat {BROWN} fill). -->
  <g transform="translate({tx:.1f} {tx:.1f}) scale({SAFE:.4f})" fill="{GOLD}">
{shapes}
  </g>
</svg>
''')

(OUT / "icon-background.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
    f'<rect width="512" height="512" fill="{BROWN}"/></svg>\n')

# ---------------------------------------------------------------- mono variants
for name, fg, bg in [("icon-light", BROWN, CREAM), ("icon-mono", GOLD, None)]:
    tile = "" if bg is None else f'<rect width="512" height="512" rx="112" fill="{bg}"/>'
    (OUT / f"{name}.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{tile}'
        f'<g fill="{fg}">{shapes}</g></svg>\n')

# ---------------------------------------------------------------- wordmark
# Onest is the app's typeface, so it is named first; the system stack behind it
# keeps the file usable in tools that have no webfont. Metrics measured in the
# browser at 112px/800: advance 320.8, cap height 85.3, so the cap box is centred
# on the canvas when the baseline sits at 256 + 85.3/2.
FONT = "Onest, 'Helvetica Neue', Helvetica, Arial, sans-serif"
SIZE, TRACK = 112, -3
TEXT_W = 320.8 + TRACK * 4          # four inter-letter gaps in "Mizan"
BASELINE = 256 + 85.3 / 2
GAP = 70                            # optical gap from the mark to the M


def word(x, ink):
    return (f'  <g id="wordmark">\n'
            f'    <text x="{x:.0f}" y="{BASELINE:.0f}" font-family="{FONT}"'
            f' font-size="{SIZE}" font-weight="800" letter-spacing="{TRACK}"'
            f' fill="{ink}">Mizan</text>\n  </g>')


def tiled(path, ink, mark=GOLD, tile=BROWN):
    """Lockup that leads with the app icon exactly as the store shows it."""
    side = 320.0
    s = side / 512
    tile_x, tile_y = 168.0, (512 - side) / 2
    # the gap is measured from the tile's edge, not the mark's: the tile already
    # carries its own padding, and measuring from the mark buries the M against it
    text_x = tile_x + side + GAP
    (OUT / path).write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 512">
  <g id="icon" transform="translate({tile_x:.0f} {tile_y:.0f}) scale({s:.4f})">
    <rect width="512" height="512" rx="112" fill="{tile}"/>
    <g fill="{mark}">{shapes}</g>
  </g>
{word(text_x, ink)}
</svg>
''')


def bare(path, ink, mark):
    """Lockup with the bare symbol, for print, headers and one-colour use."""
    s = 300.0 / SYM_H
    ox = 160.0 - SYM_L * s            # 160 = optical left margin
    oy = 256.0 - (SYM_T + SYM_H / 2) * s
    text_x = ox + SYM_R * s + GAP
    (OUT / path).write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 512">
  <g id="icon" transform="translate({ox:.1f} {oy:.1f}) scale({s:.4f})" fill="{mark}">
{shapes}
  </g>
{word(text_x, ink)}
</svg>
''')


tiled("logo.svg", BROWN)                       # on cream
tiled("logo-onbrown.svg", CREAM, tile="none")  # on a dark background
bare("logo-bare.svg", BROWN, BROWN)            # one colour, no tile
bare("logo-bare-gold.svg", CREAM, GOLD)        # one colour, on dark

# ---------------------------------------------------------------- raster export
jobs = [("icon", [16, 32, 48, 64, 128, 192, 256, 512, 1024]),
        ("icon-foreground", [432, 512]),
        ("logo", [1024, 2048]),
        ("logo-bare", [1024])]
for stem, sizes in jobs:
    for w in sizes:
        h = w // 2 if stem.startswith("logo") else w
        dst = EXPORT / f"{stem}-{w}.png"
        subprocess.run(["rsvg-convert", "-w", str(w), "-h", str(h),
                        str(OUT / f"{stem}.svg"), "-o", str(dst)], check=True)
        print(f"  {dst.relative_to(ROOT)}  {dst.stat().st_size // 1024}KB")

# the screens link the mark straight from assets/img, so keep a copy of both forms
img = ROOT / "design-v3" / "assets" / "img"
(img / "mizan-mark.svg").write_text(src)
subprocess.run(["rsvg-convert", "-w", "512", "-h", "512",
                str(OUT / "icon.svg"), "-o", str(img / "mizan-mark.png")], check=True)
subprocess.run(["rsvg-convert", "-w", "64", "-h", "64",
                str(OUT / "icon.svg"), "-o", str(img / "favicon.png")], check=True)
print("wrote design-v3/assets/img/mizan-mark.svg, mizan-mark.png, favicon.png")
