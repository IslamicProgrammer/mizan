#!/usr/bin/env python3
"""
Free, keyless image assets for the app.

    generate (pollinations) -> crop watermark -> segment -> trim -> transparent PNG

Usage:
    python3 tools/makeasset.py <slug> "<prompt>" [-n 3] [--seed 1] [--size 1024]

Output: design-v3/assets/img/<slug>[-N].png   (RGBA, trimmed to the object)

No API key. Pollinations stamps a watermark in the bottom-right, so the bottom
strip is cropped before segmentation and never reaches the cutout.
"""
import argparse, io, pathlib, subprocess, sys, tempfile, time, urllib.parse

from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "design-v3" / "assets" / "img"
WATERMARK_STRIP = 0.085          # fraction of height to cut off the bottom
MODEL = "u2net"                  # u2netp is faster but mushes soft-edged subjects


def generate(prompt: str, size: int, seed: int) -> Image.Image:
    q = urllib.parse.quote(prompt, safe="")
    url = (f"https://image.pollinations.ai/prompt/{q}"
           f"?width={size}&height={size}&nologo=true&seed={seed}")
    # curl, not urllib: python on macOS does not use the system cert store
    with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as tmp:
        path = tmp.name
    data = b""
    for attempt in range(5):
        res = subprocess.run(
            ["curl", "-sSL", "--max-time", "180", "-o", path, url],
            capture_output=True, text=True,
        )
        data = pathlib.Path(path).read_bytes() if pathlib.Path(path).exists() else b""
        if res.returncode == 0 and len(data) >= 2000:
            break
        time.sleep(6 * (attempt + 1))          # rate limited
    pathlib.Path(path).unlink(missing_ok=True)
    if len(data) < 2000:
        raise RuntimeError(f"response too small ({len(data)}b) after retries")
    return Image.open(io.BytesIO(data)).convert("RGBA")


def cutout(im: Image.Image) -> Image.Image:
    from rembg import remove, new_session
    sess = new_session(MODEL)

    # drop the watermark strip before anything sees it
    w, h = im.size
    im = im.crop((0, 0, w, int(h * (1 - WATERMARK_STRIP))))

    out = remove(im, session=sess)

    # soften the matte edge — segmentation leaves a hard 1px stair otherwise
    r, g, b, a = out.split()
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.merge("RGBA", (r, g, b, a))

    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("prompt")
    ap.add_argument("-n", type=int, default=1)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--raw", action="store_true", help="skip segmentation")
    a = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    for i in range(a.n):
        name = f"{a.slug}.png" if a.n == 1 else f"{a.slug}-{i+1}.png"
        try:
            im = generate(a.prompt, a.size, a.seed + i)
            if not a.raw:
                im = cutout(im)
            im.save(OUT / name)
            print(f"ok  {name}  {im.size[0]}x{im.size[1]}  "
                  f"{(OUT / name).stat().st_size // 1024} KB")
        except Exception as e:                                   # noqa: BLE001
            print(f"FAIL {name}  {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
