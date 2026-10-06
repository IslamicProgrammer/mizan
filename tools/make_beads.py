#!/usr/bin/env python3
"""Cut the generated wooden beads out of their white backgrounds.

Flat circles do not read as a tasbih; a turned wooden bead does, because the
specular highlight and the falloff tell you it is a sphere. These are photo-real
renders, so they are keyed, trimmed to the bead, and normalised to one size —
the generator frames each one differently and a strand of mismatched beads
looks worse than flat circles did.
"""
import pathlib
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC = pathlib.Path("logos/iconset")
DST = pathlib.Path("design-v3/assets/img")
SIZE = 132          # 44pt at 3x
THRESH = 26         # distance from white that still counts as background


def key(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(int)
    h, w, _ = a.shape
    dist = np.sqrt(((a - 255) ** 2).sum(axis=2))
    bg = dist < THRESH

    seen = np.zeros((h, w), bool)
    q: deque = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x]:
                q.append((y, x)); seen[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x]:
                q.append((y, x)); seen[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bg[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    alpha = np.clip((dist - THRESH) / 14.0, 0, 1)
    alpha[seen] = 0.0
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")


def build(src_name: str, out_name: str) -> None:
    im = key(Image.open(SRC / src_name))
    mask = im.split()[3].point(lambda v: 255 if v > 12 else 0)
    box = mask.getbbox()
    bw, bh = box[2] - box[0], box[3] - box[1]

    touches = box[0] <= 1 or box[1] <= 1 or box[2] >= im.width - 1 or box[3] >= im.height - 1
    im = im.crop(box)

    # pad to a square so every bead ends up the same shape regardless of framing
    side = max(bw, bh)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - bw) // 2, (side - bh) // 2))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)

    DST.mkdir(parents=True, exist_ok=True)
    dst = DST / out_name
    sq.save(dst, optimize=True)
    flag = "  CLIPPED at frame edge" if touches else ""
    print(f"  {out_name:18} {bw}x{bh} -> {SIZE}px  {dst.stat().st_size // 1024}KB{flag}")


if __name__ == "__main__":
    args = sys.argv[1:] or [
        "bead-dark.png", "bead-on.png",
        "bead-gold.png", "bead-done.png",
        "bead-pale.png", "bead-off.png",
    ]
    for i in range(0, len(args), 2):
        build(args[i], args[i + 1])
