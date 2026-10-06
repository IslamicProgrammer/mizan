#!/usr/bin/env python3
"""Mirror the icon set from the mockups into the Expo app.

The mockups in design-v3 stay the source of truth for the icon set, so the app
never holds a second, drifting copy. Icons are downscaled here because they are
generated at 256px but never render above 46pt — shipping 256px costs ~2.5MB of
APK for pixels nobody sees.
"""
import pathlib
from PIL import Image

SRC = pathlib.Path("design-v3/assets/icons")
DST = pathlib.Path("mobile/assets/icons")
SIZE = 144   # 3x the largest on-screen use (.pair at 46pt)

DST.mkdir(parents=True, exist_ok=True)
for old in DST.glob("*.png"):
    old.unlink()

total = 0
for p in sorted(SRC.glob("*.png")):
    im = Image.open(p).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    out = DST / p.name
    im.save(out, optimize=True)
    total += out.stat().st_size

print(f"{len(list(DST.glob('*.png')))} icons -> {DST}  ({total // 1024}KB total)")
