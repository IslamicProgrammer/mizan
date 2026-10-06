#!/usr/bin/env python3
"""
Generate images with the Gemini image API.

Usage:
    python3 tools/genimg.py <slug> "<prompt>" [--ar 9:16] [--model <id>] [-n 3]

The key is read from (first match wins):
    $GEMINI_API_KEY
    .secrets/gemini.key        <- gitignored, never printed

Output: design-v3/assets/img/<slug>[-N].png
"""
import base64, json, os, subprocess, sys, tempfile, pathlib, argparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT  = ROOT / "design-v3" / "assets" / "img"

# gemini-2.5-flash-image shuts down 2026-10-02, so it is not the default.
DEFAULT_MODEL = "gemini-3-pro-image"
FALLBACKS = ["gemini-3.1-flash-image", "gemini-3-pro-image-preview"]


def load_key() -> str:
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if k:
        return k
    f = ROOT / ".secrets" / "gemini.key"
    if f.exists():
        return f.read_text(encoding="utf-8").strip()
    sys.exit(
        "No API key.\n"
        "  mkdir -p '.secrets' && printf '%s' 'YOUR_KEY' > '.secrets/gemini.key'\n"
        "Get one at https://aistudio.google.com/apikey"
    )


def call(model: str, key: str, prompt: str, ar: str) -> bytes:
    """POST via curl — python on macOS does not use the system cert store."""
    url = (f"https://generativelanguage.googleapis.com/v1beta/"
           f"models/{model}:generateContent")
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"imageConfig": {"aspectRatio": ar}},
    }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(body, f)
        req_path = f.name
    res = subprocess.run(
        ["curl", "-sS", "--max-time", "300", url,
         "-H", "Content-Type: application/json",
         "-H", f"x-goog-api-key: {key}",          # header, not the URL
         "--data-binary", f"@{req_path}"],
        capture_output=True, text=True,
    )
    pathlib.Path(req_path).unlink(missing_ok=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl: {res.stderr.strip()[:200]}")

    data = json.loads(res.stdout)
    if "error" in data:
        raise RuntimeError(f"api: {data['error'].get('message','')[:200]}")
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError("no image in response: " + json.dumps(data)[:300])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("prompt")
    ap.add_argument("--ar", default="9:16")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("-n", type=int, default=1, help="variations to generate")
    a = ap.parse_args()

    key = load_key()
    OUT.mkdir(parents=True, exist_ok=True)

    models = [a.model] + [m for m in FALLBACKS if m != a.model]
    for i in range(a.n):
        name = f"{a.slug}.png" if a.n == 1 else f"{a.slug}-{i+1}.png"
        last = None
        for m in models:
            try:
                png = call(m, key, a.prompt, a.ar)
                (OUT / name).write_bytes(png)
                print(f"ok  {name}  ({len(png)//1024} KB, {m})")
                break
            except Exception as e:                       # noqa: BLE001
                last = f"{m}: {e}"
        else:
            print(f"FAIL {name}  {last}")


if __name__ == "__main__":
    main()
