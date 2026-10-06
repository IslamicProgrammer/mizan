#!/usr/bin/env python3
"""Turn a generated black-on-white skyline into a tintable alpha silhouette.

Two earlier heroes failed for the same underlying reason: they were pictures,
when the reference's hero is a MASK.

  1. A photograph of a marble mosque. At 22-60% opacity its detail became noise.
  2. A flat multi-tone illustration in gold. Being darker than the glow, it read
     as a blob sitting behind the numerals rather than a ghost behind them.

Look at refs/deen-muslim-00.png: the hero is a single pale tone LIGHTER than the
gold, spanning the full width, with its base cropped by the card below. That is
a silhouette tinted light — not an illustration.

So the asset here carries no colour at all. The black shape becomes alpha, the
RGB is filled white, and each screen picks the tint and opacity it needs. A
single flat tone by construction cannot go muddy.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

SRC = pathlib.Path("logos/iconset")
DST = pathlib.Path("design-v3/assets/img")
WIDTH = 1170  # 390pt full-bleed at 3x


def build(src_name: str, out_name: str, width: int = WIDTH) -> None:
    im = Image.open(SRC / src_name).convert("L")

    a = np.asarray(im).astype(float)
    # black -> opaque, white -> transparent, with the antialiased edge intact.
    # The generator leaves faint paper texture in the white, so anything above
    # 92% luminance is clamped to fully transparent.
    alpha = np.clip((235.0 - a) / 200.0, 0, 1)
    alpha[a > 235] = 0.0

    rgba = np.dstack([
        np.full_like(a, 255),
        np.full_like(a, 255),
        np.full_like(a, 255),
        alpha * 255,
    ]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")

    box = out.split()[3].point(lambda v: 255 if v > 10 else 0).getbbox()
    out = out.crop(box)
    out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)

    DST.mkdir(parents=True, exist_ok=True)
    dst = DST / out_name
    out.save(dst, optimize=True)
    print(f"  {out_name:20} {out.width}x{out.height}  "
          f"aspect {out.height / out.width:.4f}  {dst.stat().st_size // 1024}KB")


if __name__ == "__main__":
    args = sys.argv[1:] or ["sil-2.png", "hero-mosque.png"]
    for i in range(0, len(args), 2):
        build(args[i], args[i + 1])
