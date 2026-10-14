#!/usr/bin/env python3
"""Cut the six plant growth stages out of one generated sheet.

The icon slicer normalises every cell to the same square, which is right for
icons and wrong here: it would scale the bare soil and the full flower to the
same height and the plant would never appear to grow.

So all six cells are keyed, then cropped to ONE shared frame — the union of
their bounding boxes — which preserves relative scale and keeps the soil mound
on a common baseline across stages.
"""
import pathlib
from collections import deque

import numpy as np
from PIL import Image

# NOTE: this sheet was a working file and was never committed, so this script
# cannot be re-run as-is. The six plant stages it produced are already in
# design-v3/assets/img and the app. To change them, regenerate a 3x2 sheet
# first - see hero-spec.txt in logos/iconset for the prompt style used.
SRC = pathlib.Path("logos/iconset/grow-1.png")
DST = pathlib.Path("design-v3/assets/img")
COLS, ROWS = 3, 2
INSET = 0.04
OUT_W = 420          # 140pt at 3x
THRESH = 20


def key(cell: Image.Image) -> Image.Image:
    a = np.asarray(cell.convert("RGB")).astype(int)
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

    alpha = np.clip((dist - THRESH) / 12.0, 0, 1)
    alpha[seen] = 0.0
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")


def main() -> None:
    sheet = Image.open(SRC).convert("RGB")
    W, H = sheet.size
    cw, ch = W / COLS, H / ROWS

    cells = []
    for i in range(COLS * ROWS):
        r, c = divmod(i, COLS)
        box = (int(c * cw + cw * INSET), int(r * ch + ch * INSET),
               int((c + 1) * cw - cw * INSET), int((r + 1) * ch - ch * INSET))
        cells.append(key(sheet.crop(box)))

    # one frame for all six, so scale and baseline are shared
    boxes = [c.split()[3].point(lambda v: 255 if v > 10 else 0).getbbox() for c in cells]
    L = min(b[0] for b in boxes)
    T = min(b[1] for b in boxes)
    R = max(b[2] for b in boxes)
    B = max(b[3] for b in boxes)
    print(f"shared frame: {R - L}x{B - T}")

    DST.mkdir(parents=True, exist_ok=True)
    for i, cell in enumerate(cells):
        out = cell.crop((L, T, R, B))
        out = out.resize((OUT_W, round(out.height * OUT_W / out.width)), Image.LANCZOS)
        dst = DST / f"plant-{i}.png"
        out.save(dst, optimize=True)
        # how tall the plant actually is at this stage, as a sanity check
        bb = out.split()[3].point(lambda v: 255 if v > 10 else 0).getbbox()
        print(f"  plant-{i}  {out.width}x{out.height}  content top y={bb[1]:3d}  "
              f"{dst.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
