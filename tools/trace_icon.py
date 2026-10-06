#!/usr/bin/env python3
"""Trace the arch silhouette out of the Gemini reference and emit clean vector paths.

Gemini gives a raster, and a raster cannot ship as a launcher icon. Rather than
re-derive the arch from arc geometry (an attempt at that produced a shape too
narrow and too spiky), this samples the reference's own edges every few units and
fits smooth cubics through them, so the vector keeps the silhouette that worked.
"""
import numpy as np
from PIL import Image

SRC = "logos/explorations/ico-f-2.png"
SPR = 512 / 1024  # reference is 1024px; the icon's viewBox is 512

a = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
gold = (a[:, :, 0] > 170) & (a[:, :, 1] > 120) & (a[:, :, 2] < 160) & ((a[:, :, 0] - a[:, :, 2]) > 60)

APEX_Y, PLINTH_Y = 102.6, 354.0   # measured: tip of the arch, top of the base bar
CX = 255.75


def edges(y512):
    """(outer, inner) x of the right-hand band at this height, in 512 units."""
    row = np.nonzero(gold[int(round(y512 / SPR))])[0] * SPR
    right = row[row > CX]
    if len(right) == 0:
        return None
    # the right band is the last contiguous run
    brk = np.nonzero(np.diff(right) > 1.5)[0]
    run = right[brk[-1] + 1:] if len(brk) else right
    return run.max(), run.min()


def sample(step=8.0):
    out, inn = [], []
    y = APEX_Y + step
    while y < PLINTH_Y - 4:
        e = edges(y)
        if e:
            out.append((e[0], y))
            if e[1] > CX + 2:      # inner edge only exists below the inner apex
                inn.append((e[1], y))
        y += step
    return out, inn


def catmull(pts):
    """Catmull-Rom through pts -> cubic Bezier segments (c1, c2, endpoint)."""
    p = [pts[0]] + list(pts) + [pts[-1]]
    segs = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        segs.append((c1, c2, p2))
    return segs


def n(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def curve(pts):
    return " ".join(f"C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(p[0])} {n(p[1])}"
                    for c1, c2, p in catmull(pts))


def mirror(pts):
    return [(512 - x, y) for x, y in pts]


outer, inner = sample()
inner_apex_y = min(y for _, y in inner) - 7.0

LEG = 360.0   # legs run 6 units into the plinth so the join is seamless
out_r = [p for p in outer if p[1] <= LEG] + [(outer[-1][0], LEG)]
in_r = [p for p in inner if p[1] <= LEG] + [(inner[-1][0], LEG)]

out_l, in_l = mirror(out_r), mirror(in_r)

# One closed outline: down the right outside, across to the right inside, up and
# over the inner apex, down the left inside, across to the left outside, back up
# over the tip.
path = (
    f"M256 {n(APEX_Y)} {curve(out_r)}"
    f" L{n(in_r[-1][0])} {n(LEG)}"
    f" {curve(list(reversed(in_r)) + [(256, inner_apex_y)])}"
    f" {curve([(256, inner_apex_y)] + in_l)}"
    f" L{n(out_l[-1][0])} {n(LEG)}"
    f" {curve(list(reversed(out_l)))}"
    " Z"
)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Mizan. A Timurid iwan portal with dawn rising inside it.
       The outline is traced from the reference every 8 units and fitted with cubics,
       so it is a true vector but keeps the silhouette that survived the 16px
       legibility check. Do not "tidy" the arch into a circular arc: that makes it
       narrow and spiky, which is what the first hand-drawn attempt got wrong. -->
  <rect width="512" height="512" rx="112" fill="#50320F"/>
  <g fill="#E8B762">
    <path d="{path}"/>
    <path d="M160 354a96 96 0 0 1 192 0z"/>
    <rect x="85.5" y="354" width="341" height="55.5" rx="7"/>
  </g>
</svg>
'''
open("logos/mizan/icon.svg", "w").write(svg)
print(f"outer {len(out_r)} pts, inner {len(in_r)} pts, inner apex y={inner_apex_y:.1f}")
print("wrote logos/mizan/icon.svg")
