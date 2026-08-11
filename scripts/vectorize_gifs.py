"""Auto-trace the Sevi reaction GIFs into SVGs.

Source: sevi-asset/exports/gifs/*.gif (animated stickers, gitignored source
library). For each gif, grabs the middle frame (the settled "peak" pose in a
loop that eases out from and back to a neutral frame 0) and traces it to a
color SVG with vtracer.

Outputs a sibling .svg next to each .gif (matching the pattern already used
in avatar-states/, professions/, and stickers/), then mirrors normalized
copies into public/sevi-reactions/ for the app to consume.
"""
from pathlib import Path
from PIL import Image
import vtracer

HERE = Path(__file__).resolve().parent.parent
GIFS = HERE / "sevi-asset" / "exports" / "gifs"
PUBLIC = HERE / "public" / "sevi-reactions"
PUBLIC.mkdir(exist_ok=True)

TRACE_KW = dict(
    colormode="color",
    hierarchical="stacked",
    mode="spline",
    filter_speckle=4,
    color_precision=6,
    layer_difference=8,
    corner_threshold=60,
    length_threshold=4.0,
    splice_threshold=45,
    path_precision=4,
)

# gif stem -> clean reaction key used by the app (sevi-<key>.svg)
KEYS = {
    "approve2": "approve",
    "cheerup2": "cheerup",
    "confuse2": "confuse",
    "excited2": "excited",
    "happy2": "happy",
    "idea2": "idea",
    "listening2": "listening",
    "love2": "love",
    "ok2": "ok",
    "sleepy2": "sleepy",
    "thinking": "thinking",
}

for gif_path in sorted(GIFS.glob("*.gif")):
    stem = gif_path.stem
    key = KEYS.get(stem)
    if key is None:
        print(f"skip {gif_path.name}: no key mapping")
        continue

    im = Image.open(gif_path)
    im.seek(im.n_frames // 2)
    frame = im.convert("RGBA")

    frame_png = gif_path.with_suffix(".png")
    frame.save(frame_png)

    svg_path = gif_path.with_suffix(".svg")
    vtracer.convert_image_to_svg_py(str(frame_png), str(svg_path), **TRACE_KW)

    dest = PUBLIC / f"sevi-{key}.svg"
    dest.write_bytes(svg_path.read_bytes())
    print(f"wrote {svg_path.relative_to(HERE)}  ->  {dest.relative_to(HERE)}")
