"""Generate og:image + favicons for godwincreates.net/diwa link previews.

Source: c:\\Users\\user\\Documents\\POC\\SeviAI\\ref\\diwa.jpg (Diwa wordmark).
Outputs land in public/ so the GH Pages build serves them at /diwa/.
"""
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent.parent
SRC = Path(r"C:\Users\user\Documents\POC\SeviAI\ref\diwa.jpg")
PUB = HERE / "public"
PUB.mkdir(exist_ok=True)

CREAM = (245, 241, 230)

src = Image.open(SRC).convert("RGB")

# og:image — 1200x630, wordmark centered on cream, slight pad
og = Image.new("RGB", (1200, 630), CREAM)
scaled = ImageOps.contain(src, (1080, 540))
og.paste(scaled, ((1200 - scaled.size[0]) // 2, (630 - scaled.size[1]) // 2))
og.save(PUB / "og-image.jpg", quality=90, optimize=True)
print(f"wrote {PUB / 'og-image.jpg'}  {og.size}")

# Square favicon variants — crop the "Di" portion which is the densest visual
# (centered on the source image), then resize.
sw, sh = src.size
crop_size = min(sw, sh)
left = (sw - crop_size) // 2
top = (sh - crop_size) // 2
sq = src.crop((left, top, left + crop_size, top + crop_size))

for size, name in [(192, "favicon-192.png"), (32, "favicon-32.png"), (180, "apple-touch-icon.png")]:
    sq.resize((size, size), Image.LANCZOS).save(PUB / name, optimize=True)
    print(f"wrote {PUB / name}  {size}x{size}")
