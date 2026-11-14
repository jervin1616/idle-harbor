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

for r, c, im in cells(src + '/Boat.png', 3, 3):
    if r == 1:  # row with crates: plain, mast, sail
        shrink(im, 0.30).save(f'{out}boat{c}.png')
for r, c, im in cells(src + '/Ship.png', 3, 1):
    if c == 2:
        shrink(im, 0.20).save(f'{out}ship.png')
