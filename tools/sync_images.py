#!/usr/bin/env python3
"""Mirror the hero imagery from the mockups into the Expo app.

One thing happens here that the app cannot do itself:

1. **Downscale.** `hero-mosque.png` is 1150px and 1.3MB. It never renders wider
   than 336pt, so 1008px (3x) is the most any screen can use.

No colour adjustment is applied. The old hero was a photograph and needed a
   `brightness/contrast/saturate` filter to warm the marble; the current hero is
   a flat illustration generated in the palette, so touching its colour would
   only push it off-system.

Opacity is NOT baked in — the three screens use it at .60, .90 and .45, so it
stays a style prop.
"""
import pathlib

from PIL import Image

SRC = pathlib.Path("design-v3/assets/img")
DST = pathlib.Path("mobile/assets/img")
WIDTH = 1170  # 390pt full-bleed at 3x

DST.mkdir(parents=True, exist_ok=True)


def port(name: str, width: int = WIDTH) -> None:
    im = Image.open(SRC / name).convert("RGBA")
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)

    dst = DST / name
    im.save(dst, optimize=True)
    before = (SRC / name).stat().st_size // 1024
    after = dst.stat().st_size // 1024
    print(f"  {name:22} {im.width}x{im.height}  {before}KB -> {after}KB")


if __name__ == "__main__":
    port("hero-mosque.png")
    # beads are already at their final size; copy, do not rescale
    for b in ("bead-on.png", "bead-done.png", "bead-off.png"):
        port(b, width=132)
    # garden growth stages — already cut on a shared frame by make_plants.py
    for i in range(6):
        port(f"plant-{i}.png", width=420)
    print(f"images -> {DST}")
