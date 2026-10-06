#!/usr/bin/env python3
"""Slice a generated 3x3 icon sheet into normalised transparent PNGs.

Icons are generated as a sheet rather than one at a time because a single
generation pass gives every icon the same material, lighting and palette;
separate passes drift, and drift is exactly what makes an icon set look bought
rather than designed.

The sheet's background is white and the palette's cream (#F8F2EA) is close to
it, so the background is removed by flood-filling inward from each cell's
border with a tight threshold. Cream survives because it sits ~26 units away
from white, well outside the threshold.
"""
import sys
import pathlib
from collections import deque

import numpy as np
from PIL import Image

OUT = pathlib.Path("design-v3/assets/icons")
SIZE = 256          # exported square
PAD = 0.06          # fraction of SIZE left empty on the tightest axis
THRESH = 18         # how close to white counts as background


def key_out(cell):
    """Return RGBA with the white surround (and its shadow halo) made transparent."""
    a = np.asarray(cell.convert("RGB")).astype(int)
    h, w, _ = a.shape
    dist = np.sqrt(((a - 255) ** 2).sum(axis=2))
    bg = dist < THRESH

    # flood fill from the border so enclosed light areas inside an icon survive
    seen = np.zeros((h, w), bool)
    q = deque()
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

    # soft edge: alpha ramps over the few units just outside the threshold
    alpha = np.clip((dist - THRESH) / 14.0, 0, 1)
    alpha[seen] = 0.0
    out = np.dstack([a, (alpha * 255)]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def normalise(img):
    """Trim to content, then centre on a square canvas with uniform padding."""
    bbox = img.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return None
    img = img.crop(bbox)
    inner = int(SIZE * (1 - 2 * PAD))
    scale = inner / max(img.size)
    img = img.resize((max(1, round(img.width * scale)),
                      max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2))
    return canvas


def slice_sheet(path, names, inset=0.045, cols=3, rows=3):
    sheet = Image.open(path).convert("RGB")
    W, H = sheet.size
    cw, ch = W / cols, H / rows
    done = []
    for i, name in enumerate(names):
        if not name:
            continue
        r, c = divmod(i, cols)
        # inset each cell so the faint grid rules the model draws are excluded
        box = (int(c * cw + cw * inset), int(r * ch + ch * inset),
               int((c + 1) * cw - cw * inset), int((r + 1) * ch - ch * inset))
        icon = normalise(key_out(sheet.crop(box)))
        if icon is None:
            print(f"  !! {name}: empty cell"); continue
        OUT.mkdir(parents=True, exist_ok=True)
        icon.save(OUT / f"{name}.png")
        done.append(name)
    return done


if __name__ == "__main__":
    sheet, names = sys.argv[1], sys.argv[2].split(",")
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    rows = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    got = slice_sheet(sheet, names, cols=cols, rows=rows)
    print(f"sliced {len(got)} from {pathlib.Path(sheet).name}: {' '.join(got)}")
