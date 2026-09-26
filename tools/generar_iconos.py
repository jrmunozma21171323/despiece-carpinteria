# Genera los íconos de la PWA: python tools/generar_iconos.py
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
S = 1024
def draw(scale_content=1.0):
    im = Image.new("RGB", (S, S))
    d = ImageDraw.Draw(im)
    # vertical gradient background (walnut)
    top, bot = (86, 54, 32), (38, 23, 13)
    for y in range(S):
        t = y / (S - 1)
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    c = scale_content
    def X(v): return 512 + (v - 512) * c
    def R(x0, y0, x1, y1, fill, r=0):
        box = [X(x0), X(y0), X(x1), X(y1)]
        if r: d.rounded_rectangle(box, radius=r * c, fill=fill)
        else: d.rectangle(box, fill=fill)
    WOOD, INSIDE, INSIDE2, EDGE = (228, 176, 116), (122, 76, 42), (104, 63, 34), (246, 214, 168)
    ROD, AMBER, HANDLE = (222, 222, 218), (247, 183, 51), (92, 56, 30)
    x0, x1, y0, y1, t = 252, 772, 290, 790, 24
    # carcass
    R(x0, y0, x1, y1 + 34, WOOD, 10)
    R(x0 + 14, y1, x1 - 14, y1 + 34, (170, 118, 70))          # plinth
    cols = [(x0 + t, 418), (442, 582), (606, x1 - t)]
    # inner cavities
    for a, b in cols:
        R(a, y0 + t, b, y1 - 0, INSIDE)
    # top storage row
    for a, b in cols:
        R(a, y0 + t, b, 382, INSIDE2)
        R(a, 382, b, 404, WOOD)
    # side columns: rod + drawers
    for a, b in (cols[0], cols[2]):
        R(a + 10, 432, b - 10, 444, ROD, 6)
        R(a, 612, b, 626, WOOD)
        for k, (u, v) in enumerate(((632, 690), (698, 756))):
            R(a + 4, u, b - 4, v, EDGE, 4)
            m = (a + b) / 2
            R(m - 26, (u + v) / 2 - 5, m + 26, (u + v) / 2 + 5, HANDLE, 5)
    # middle column: cubbies + rod
    a, b = cols[1]
    R(a, 500, b, 520, WOOD)
    R((a + b) / 2 - 9, 404, (a + b) / 2 + 9, 500, WOOD)
    R(a + 10, 552, b - 10, 564, ROD, 6)
    # dimension line (the "despiece" idea: measure)
    yd = 208
    R(x0, yd - 5, x1, yd + 5, AMBER, 5)
    for xx in (x0, x1):
        R(xx - 6, yd - 34, xx + 6, yd + 34, AMBER, 6)
    for xx, sgn in ((x0 + 8, 1), (x1 - 8, -1)):
        d.polygon([(X(xx), X(yd)), (X(xx + sgn * 44), X(yd - 22)), (X(xx + sgn * 44), X(yd + 22))], fill=AMBER)
    return im

def save(im, name, size):
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)

any_ = draw(1.12)   # "any": content bigger
mask = draw(1.0)    # maskable: content inside 80% safe zone
for s in (192, 512): save(any_, f"icon-{s}.png", s)
for s in (192, 512): save(mask, f"maskable-{s}.png", s)
save(any_, "apple-touch-icon.png", 180)
save(any_, "favicon-32.png", 32)
