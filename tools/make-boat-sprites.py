# Cuts the individual boats out of the CC0 "Boats" sprite sheets and shrinks them to the game's pixel scale.
# Usage: python3 tools/make-boat-sprites.py <folder containing Boat.png, Ship.png>
import sys
from PIL import Image, ImageEnhance

src = sys.argv[1]
out = 'src/assets/boats/'

def cells(path, cols, rows):
    im = Image.open(path).convert('RGBA')
    w, h = im.width / cols, im.height / rows
    for r in range(rows):
        for c in range(cols):
            yield r, c, im.crop((round(c * w), round(r * h), round((c + 1) * w), round((r + 1) * h)))

def shrink(im, k):
    im = im.crop(im.getbbox())
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.BOX)
    a = im.getchannel('A').point(lambda v: 255 if v > 110 else 0)   # crisp edges, no semi-transparent pixels
    rgb = ImageEnhance.Brightness(im.convert('RGB')).enhance(1.65)   # lift the dark wood so it reads against the dusk sea
    rgb = ImageEnhance.Color(rgb).enhance(1.15)
    rgb.putalpha(a)
    return rgb

# Fleet tiers 1-7 (rowboat -> grand schooner), written as fleet1.png ... fleet7.png
BOAT_TIERS = {(0, 0): 1, (1, 0): 2, (1, 1): 3, (1, 2): 4, (2, 2): 5}
for r, c, im in cells(src + '/Boat.png', 3, 3):
    if (r, c) in BOAT_TIERS:
        shrink(im, 0.30).save(f"{out}fleet{BOAT_TIERS[(r, c)]}.png")
for r, c, im in cells(src + '/Ship.png', 3, 1):
    if c in (1, 2):
        shrink(im, 0.24).save(f"{out}fleet{5 + c}.png")
for r, c, im in cells(src + '/Raft.png', 3, 2):
    if r == 1 and c == 0:  # raft with barrel and net (scenery)
        shrink(im, 0.30).save(f'{out}raft.png')
