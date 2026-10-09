"""Make the clean-page plate under the Opus Journal's handwriting.

The journal block writes the five printed lines of src/assets/diary-open.webp
in one by one: the original photograph is revealed line by line over a copy
whose ink has been lifted off the page. This script makes that copy,
src/assets/diary-open-blank.webp, and prints the line geometry used by
`journalLines` in src/components/product/content.ts.

    pip install pillow numpy
    python scripts/make-diary-plate.py

The ink is found as dark pixels inside the band of handwriting (baselines run
at 19 degrees), widened past its anti-aliased edge, and refilled from the
surrounding paper by normalised convolution, fine scale first. The dot grid
around the words is untouched.
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "src/assets"
ANGLE = math.radians(19)  # baseline slope of the handwriting
# Bands across the baselines (pixels along the normal), one per line.
BANDS = [(426, 478), (478, 520), (534, 582), (604, 640), (660, 738)]


def box(a, r, axis):
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    n = c.shape[axis]
    return (np.take(c, range(2 * r + 1, n), axis=axis) - np.take(c, range(0, n - 2 * r - 1), axis=axis)) / (2 * r + 1)


def blur(a, r):
    """Three box passes: close to a Gaussian, fast in numpy."""
    for _ in range(3):
        a = box(box(a, r, 0), r, 1)
    return a


def main():
    image = np.array(Image.open(ASSETS / "diary-open.webp").convert("RGBA")).astype(np.float32)
    height, width = image.shape[:2]
    rgb = image[..., :3]
    alpha = image[..., 3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    ys, xs = np.mgrid[0:height, 0:width]
    along = xs * math.cos(ANGLE) - ys * math.sin(ANGLE)
    across = xs * math.sin(ANGLE) + ys * math.cos(ANGLE)

    page = (alpha > 250) & (xs > 150) & (xs < 900) & (ys > 220) & (ys < 760)
    band = (across > 418) & (across < 748) & (along > 0) & (along < 770)
    ink = page & band & (lum < 135)
    grown = Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(11))
    ink = np.array(grown) > 0

    # Refill from clean paper, each pixel at the finest scale with enough support.
    paper = ((~ink) & (alpha > 250)).astype(np.float32)
    fill = np.zeros_like(rgb)
    done = np.zeros((height, width), bool)
    for radius in (4, 10, 24, 48):
        num = np.stack([blur(rgb[..., c] * paper, radius) for c in range(3)], -1)
        den = blur(paper, radius)
        ok = (den > 0.12) & ~done
        fill[ok] = num[ok] / den[ok][:, None]
        done |= ok

    out = rgb.copy()
    grain = np.random.default_rng(1).normal(0, 1.2, out.shape).astype(np.float32)
    out[ink] = fill[ink] + grain[ink]
    plate = np.concatenate([np.clip(out, 0, 255), image[..., 3:]], -1).astype(np.uint8)
    Image.fromarray(plate, "RGBA").save(ASSETS / "diary-open-blank.webp", quality=88, method=6)

    # Line geometry, normalised to the image box, for the reveal masks.
    text = page & (lum < 120)
    ty, tx = np.nonzero(text)
    t_along = tx * math.cos(ANGLE) - ty * math.sin(ANGLE)
    t_across = tx * math.sin(ANGLE) + ty * math.cos(ANGLE)
    lines = []
    for lo, hi in BANDS:
        sel = (t_across >= lo) & (t_across < hi)
        lines.append(
            {
                "across": [lo, hi],
                "along": [round(float(np.percentile(t_along[sel], 0.2))), round(float(np.percentile(t_along[sel], 99.8)))],
            }
        )
    print(json.dumps({"width": width, "height": height, "angle": 19, "lines": lines}))


if __name__ == "__main__":
    main()
