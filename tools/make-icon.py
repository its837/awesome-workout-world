#!/usr/bin/env python3
"""Draw the tablet app's icon: a little dog poop, on fire, on the neon floor.

    python3 tools/make-icon.py

Drawn on a 48 by 48 grid and blown up four times, so it has the same chunky pixels as
the home page. Writes android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png. Needs
Pillow (pip install pillow). Change the picture here and run it again.
"""
import os
from PIL import Image

S, UP = 48, 4
img = Image.new("RGB", (S, S), (7, 2, 15))
px = img.load()


def dot(x, y, c):
    if 0 <= x < S and 0 <= y < S:
        px[x, y] = c


# a few stars
for x, y, c in [(4, 3, (255, 255, 255)), (42, 5, (125, 249, 255)), (7, 16, (255, 123, 213)),
                (44, 17, (255, 242, 63)), (2, 26, (255, 255, 255)), (39, 1, (255, 255, 255))]:
    dot(x, y, c)

# the neon floor: pink lines running away, cyan lines coming toward you
FLOOR = 38
for y in range(FLOOR, S):
    for x in range(S):
        px[x, y] = (11, 2, 32)
for j in range(-7, 8):
    for y in range(FLOOR, S):
        f = (y - FLOOR) / (S - FLOOR)
        dot(round(S / 2 + j * 5 * (0.3 + f * 1.7)), y, (150 + round(105 * f), 40, 150 + round(58 * f)))
for y in (41, 45):
    for x in range(S):
        px[x, y] = (63, 200, 235)
for x in range(S):
    px[x, FLOOR] = (255, 63, 208)

# the poop: a little curl on top of three soft tiers, each wider than the one above
TIERS = [  # (first row, last row, left edge, right edge)
    (17, 19, 22, 26),      # the curl
    (20, 24, 18, 30),
    (25, 30, 14, 34),
    (31, 37, 10, 38),
]
DARK, SHADE, MID, LIGHT = (52, 28, 10), (92, 54, 24), (128, 80, 38), (168, 112, 60)
body = set()
for top, bottom, left, right in TIERS:
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            corner = (x in (left, right)) and (y in (top, bottom))
            if not corner:
                body.add((x, y))
body |= {(26, 16), (27, 16), (27, 15)}        # the tip, flopping to one side

for x, y in body:                               # a dark edge all round
    for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        if (x + ox, y + oy) not in body:
            dot(x + ox, y + oy, DARK)
for x, y in body:
    dot(x, y, MID)
for top, bottom, left, right in TIERS:         # light on the top-left of each tier, shade underneath
    for x in range(left + 1, right):
        dot(x, bottom, SHADE)
    for x in range(left + 1, left + (right - left) // 2):
        dot(x, top, LIGHT)
    dot(left + 1, top + 1, LIGHT)

# fire climbing off it (the same every time: no random numbers)
tops = {}
for x, y in body:
    tops[x] = min(tops.get(x, S), y)
for x, top in sorted(tops.items()):
    edge = abs(x - 24)
    height = max(3, 13 - edge // 2 + (x * 7) % 4 - (2 if x % 3 == 0 else 0))
    for k in range(1, height + 1):
        f = k / height
        colour = (255, 236, 120) if f < 0.3 else (255, 156, 44) if f < 0.65 else (222, 58, 20)
        if (x + k) % 5 != 0 or f < 0.45:
            dot(x, top - 1 - k, colour)
# a few sparks
for x, y, c in [(13, 9, (255, 156, 44)), (33, 6, (255, 236, 120)), (20, 3, (222, 58, 20)), (30, 11, (255, 156, 44))]:
    dot(x, y, c)

out = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res", "mipmap-xxxhdpi")
os.makedirs(out, exist_ok=True)
path = os.path.normpath(os.path.join(out, "ic_launcher.png"))
img.resize((S * UP, S * UP), Image.NEAREST).save(path)
print("wrote", path)
