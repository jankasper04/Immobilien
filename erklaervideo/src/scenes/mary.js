// mary.js: "Marys Zimmer" (Frank Jackson), 36 s, 9:16. The storyboard is STORYBOARD_mary.md.
// Clawd knows everything about colour but lives in a grey room. One world on one clock: every colour is painted through
// C(colour, s), where s (0 = grey, 1 = full colour) is how far the colour wave has reached that spot. Until the door opens
// everything is grey; the real apple outside is the only red. Then a wave runs out from the apple, first through the
// garden, then through the room. The garden has its own coordinates and is seen through the door at scale S; its wave is
// the same kind of circle, centred on the apple.
(() => {
  // ---------- world ----------
  const FY = 1600;                                   // base of the room's back wall
  const U = 24, UG = 30;                             // Clawd in the room, in the garden
  const DOOR = { x0: 640, x1: 900, y0: 1060, y1: FY, cx: 770 };
  const KNOB = [876, 1505];
  const S = .3, PX0 = DOOR.cx - 540 * S, PY0 = 1585 - 1500 * S;   // garden → room: seen through the door, far away
  const toRoom = ([x, y]) => [PX0 + x * S, PY0 + y * S];
  const GGY = 1500;                                  // the garden's horizon
  const APPLE_G = [660, 770], APR = 40, APPLE_RM = toRoom(APPLE_G);
  const BOOK = { x0: 160, x1: 500, y0: 1470, y1: 1650, sp: 330 };
  const PL = { x0: 169, x1: 326, y0: 1479, y1: 1641 }, PR = { x0: 334, x1: 491, y0: 1479, y1: 1641 };
  const DRAWN = [247, 1556], DRR = 36;               // the apple drawn in the book
  const READ = [330, 1535];                          // Clawd on a (hidden) book stack behind the stand
  const HOLE = [150, 700];                          // the light beam through the shutter (it lands where the held prism will be)
  const LEDGE = [452, 1446];                         // where the prism rests
  const MAG_REST = [120, 1672];
  const DOORSPEC = { x: 706, y0: 1200, y1: 1440 };   // where the prism's fan lands on the door
  const JUMP_TO = [590, 1665], STAND = [740, 1665];
  const WIDE = [600, 1210, .92];

  // ---------- the clock ----------
  const FLIPS = [2.85, 4.05, 5.25], FLIP_D = .32;
  const PRISM_UP = [6.5, 6.8], PRISM_DOWN = [11.3, 11.55], FAN = [7.7, 8.3], FAN_OFF = [11.1, 11.28];
  const SEEP = 12.9, JUMP = [14.0, 14.45], WALK = [14.5, 15.3], TURN_B = [15.3, 15.5], REACH = [15.5, 15.85];
  const DOOR_T = [15.95, 16.6];
  const REV = [20.4, 21.8];
  const BURST = 22.4, ROOM_W = 23.9, FULL = 26.2;
  const TURN_F = [26.2, 26.38], DASH = [26.95, 27.4];
  const G_RUN = [27.4, 28.5];
  const LOOP = 34.3;                                 // the match cut: the world is back where it started
  const story = t => t >= LOOP ? t - DUR : t;

  // ---------- colours (the real ones; the grey world shows their grey values) ----------
  const RC = {
    wall: '#B9D5D3', stripe: '#A9C9C6', wainscot: '#7FA7A6', skirt: '#6E4A31', ceil: '#9DBDBB', floor: '#94694A', plank: '#5E412D',
    wood: '#9A6A45', woodDk: '#6E4A31', door: '#8C5A38', doorDk: '#5E3A24', paper: '#F4ECDA', page: '#F7EFDD', pencil: '#5E5A60',
    brass: '#E2A93B', cover: '#7A2E3A', glass: '#CFEAF1', shade: '#3F8F8A', light: '#FFF3D0', stone: '#B8AE9E',
  };
  const GC = {
    skyTop: '#7DB6E4', sky: '#A6D1EC', skyLo: '#D5ECF0', sun: '#FFE9A8', cloud: '#FFF8EC', hillFar: '#A9C99A', hill: '#93BC7C',
    grass: '#7DB15C', grassDk: '#6A9C4C', tuft: '#4F7A40', trunk: '#7A5A44', trunkDk: '#5E4436', crown: '#5E9A48', crownLt: '#7DB85A', crownDk: '#4A8038',
  };
  const RED = '#D42A3C', RED_DK = '#99202F', RED_LT = '#FFD6CC', STEM = '#6B4A2E', LEAF = '#5E9A3C';
  const RAINBOW = ['#D8394E', '#EE8A3A', '#F2C94C', '#6FAE5A', '#3F86C6', '#4B4FA0', '#8A5CB0'];
  const BOOKC = ['#C8543E', '#3A9C98', '#E8AA38', '#7B5CA8', '#6E9F58', '#2F3C7A', '#D97757', '#E27A92', '#B5563A', '#4F8FB8'];
  const FLOWERC = ['#F6C3D0', '#FFE27A', '#FFFFFF', '#C9A8E8', '#F29A6B'];

  // ---------- grey → colour ----------
  // C(colour, s): the colour's grey value (Rec. 709 luma) at s = 0, the colour itself at s = 1.
  const GREY = new Map();
  function greyOf(c) {
    let g = GREY.get(c);
    if (!g) {
      const n = parseInt(c.slice(1), 16), v = Math.round(clamp(.2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255), 0, 255));
      const h = v.toString(16).padStart(2, '0'); g = '#' + h + h + h; GREY.set(c, g);
    }
    return g;
  }
  const C = (c, s) => s >= .999 ? c : s <= .001 ? greyOf(c) : mixCol(greyOf(c), c, s);
  const ink = s => C(PAL.ink, s);
  // The wave in the space being painted: centre and radius. r < 0: nothing has colour yet; r = Infinity: all of it.
  let WV = { c: [0, 0], r: -1 }, CIRC = null;
  const setWave = (c, r) => { WV = { c, r }; CIRC = null; };
  const satAt = (x, y, band = 70) => WV.r < 0 ? 0 : WV.r === Infinity ? 1 : clamp((WV.r - Math.hypot(x - WV.c[0], y - WV.c[1])) / band);
  // PAL swapped to its grey values for one call (clawd() reads PAL), restored in the same frame
  function withPal(s, fn) {
    if (s >= .999) return fn();
    const saved = { ...PAL };
    for (const k in PAL) PAL[k] = C(saved[k], s);
    try { fn(); } finally { Object.assign(PAL, saved); }
  }
  function clawdS(x, y, u, o, s) {
    const swMul = Math.min(1, 2.6 / PXZ);
    if (s >= .999) return clawd(x, y, u, { ...o, swMul });
    const c = tintCols(o);
    const o2 = { ...o, col: C(c.col, s), dk: C(c.dk, s), lt: C(c.lt, s), tint: null, swMul };
    withPal(s, () => clawd(x, y, u, o2));
  }

  // ---------- camera and big flat areas ----------
  let VIEW = { x0: 0, x1: W, y0: 0, y1: H }, PXZ = 1;
  function cam(c) {
    const [cx, cy, z, rot = 0] = c;
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
    PXZ = z;
  }
  const inView = (x0, y0, x1, y1, m = 40) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  const lw = (b, k = 2.2) => b * Math.min(1, k / PXZ);            // detail lines stay fine in close-ups
  const camAt = (P, off, z, rot = 0) => [P[0] - off[0] / z, P[1] - off[1] / z, z, rot];
  // Move between two cameras around a pivot P: P's screen position moves linearly, the zoom logarithmically.
  function camPath(P, c0, c1, k) {
    const off = c => [(P[0] - c[0]) * c[2], (P[1] - c[1]) * c[2]];
    const o0 = off(c0), o1 = off(c1), z = Math.exp(lerp(Math.log(c0[2]), Math.log(c1[2]), k));
    return camAt(P, [lerp(o0[0], o1[0], k), lerp(o0[1], o1[1], k)], z, lerp(c0[3] || 0, c1[3] || 0, k));
  }
  const mixCam = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), k)), lerp(a[3] || 0, b[3] || 0, k)];
  const scr = ([x, y], c) => toScreen(x, y, { cx: c[0], cy: c[1], zoom: c[2], rot: c[3] || 0 });
  const bx4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  // flat colour for big areas (see theseus.js: huge washes are slow on software WebGL)
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  // Sutherland–Hodgman: the part of polygon P inside the convex polygon Cl
  function clipPoly(P, Cl) {
    let area = 0; for (let i = 0; i < Cl.length; i++) { const a = Cl[i], b = Cl[(i + 1) % Cl.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? 1 : -1;
    let out = P;
    for (let i = 0; i < Cl.length && out.length; i++) {
      const A = Cl[i], B = Cl[(i + 1) % Cl.length], ex = B[0] - A[0], ey = B[1] - A[1];
      const side = p => sg * (ex * (p[1] - A[1]) - ey * (p[0] - A[0]));
      const inp = out; out = [];
      for (let j = 0; j < inp.length; j++) {
        const cur = inp[j], prv = inp[(j + inp.length - 1) % inp.length], sc = side(cur), sp = side(prv);
        const cut = () => { const k = sp / (sp - sc); return [lerp(prv[0], cur[0], k), lerp(prv[1], cur[1], k)]; };
        if (sc >= 0) { if (sp < 0) out.push(cut()); out.push(cur); }
        else if (sp >= 0) out.push(cut());
      }
    }
    return out;
  }
  function waveCircle() {
    if (CIRC) return CIRC;
    const n = 64, P = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r = WV.r * (1 + .006 * Math.sin(a * 7 + BOILN * .9)); P.push([WV.c[0] + Math.cos(a) * r, WV.c[1] + Math.sin(a) * r]); }
    return (CIRC = P);
  }
  // a flat area in grey, with the part the wave has reached in colour (a crisp, round front)
  function flatW(P, col) {
    if (WV.r === Infinity) return flat(P, col);
    flat(P, greyOf(col));
    if (WV.r <= 0) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const [cx, cy] = WV.c, r = WV.r, dx = Math.max(x0 - cx, 0, cx - x1), dy = Math.max(y0 - cy, 0, cy - y1);
    if (dx * dx + dy * dy > r * r) return;
    const far = Math.max(Math.hypot(x0 - cx, y0 - cy), Math.hypot(x1 - cx, y0 - cy), Math.hypot(x0 - cx, y1 - cy), Math.hypot(x1 - cx, y1 - cy));
    if (far < r * .99) return flat(P, col);
    const Q = clipPoly(P, waveCircle());
    if (Q.length > 2) flat(Q, col);
  }
  // horizontal line in canvas-sized pieces (long strokes lose their outline under a zoomed camera)
  function hline(y, xa, xb, sw, col, key, br = 'ink') {
    const a = Math.max(xa, VIEW.x0 - 60), b = Math.min(xb, VIEW.x1 + 60);
    if (b <= a || y < VIEW.y0 - 40 || y > VIEW.y1 + 40) return;
    const st = 360, i0 = Math.floor(a / st);
    for (let i = i0; i * st < b; i++) {
      const p = Math.max(a, i * st), q = Math.min(b, (i + 1) * st); if (q - p < 4) continue;
      boilSeed(key + i);
      inkLine([[p, y + jit(1)], [(p + q) / 2, y + jit(1.5)], [q, y + jit(1)]], sw, C(col, satAt((p + q) / 2, y)), br, .4);
    }
  }
  const sparkle = (x, y, r, k, col) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, ink: null }); };

  // ---------- the apple ----------
  const angd = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  function applePt(cx, cy, r, a) {
    const top = Math.exp(-Math.pow(angd(a, -Math.PI / 2) / .45, 2)), bot = Math.exp(-Math.pow(angd(a, Math.PI / 2) / .55, 2));
    const rr = r * (1 - .19 * top - .05 * bot);
    return [cx + Math.cos(a) * rr * 1.07, cy + Math.sin(a) * rr + .03 * r];
  }
  const applePts = (cx, cy, r, n = 36) => Array.from({ length: n }, (_, i) => applePt(cx, cy, r, -Math.PI / 2 + i / n * TAU));
  // the shaded side: the apple's right edge and an inner arc
  function crescent(cx, cy, r) {
    const P = [];
    for (let k = 0; k <= 10; k++) P.push(applePt(cx, cy, r, lerp(-1.25, 1.95, k / 10)));
    for (let k = 10; k >= 0; k--) { const a = lerp(-1.25, 1.95, k / 10); P.push([cx - .2 * r + Math.cos(a) * r * .86, cy + .04 * r + Math.sin(a) * r * .84]); }
    return P;
  }
  const leafPts = (x, y, r) => through([[x, y], [x + .22 * r, y - .22 * r], [x + .6 * r, y - .3 * r], [x + .5 * r, y - .06 * r], [x + .2 * r, y + .04 * r], [x, y]], 4);
  // the real apple, around its own centre. s = colour of the body, sl = colour of stem and leaf
  function apple(x, y, r, o = {}) {
    const s = o.s ?? 1, sl = o.sl ?? 1, sq = o.sq || 0, sw = lw(1.1, 2.6), I = ink(sl);
    if (r * (o.k || 1) < .6) return;
    push(); translate(x, y); rotate(o.rot || 0); scale((1 + sq) * (o.k || 1), (1 - sq) * (o.k || 1));
    boilSeed('apple' + (o.key || ''));
    inkLine([[.02 * r, -.7 * r], [.07 * r, -.95 * r], [.16 * r, -1.2 * r]], lw(2.2, 2.6), C(STEM, sl), 'ink', .5);
    paint(leafPts(.1 * r, -.9 * r, r), { wash: C(LEAF, sl), ink: I, sw: sw * .7 });
    paint(applePts(0, 0, r, 40), { wash: C(RED, s), ink: I, sw });
    paint(crescent(0, 0, r), { wash: C(RED_DK, s), ink: null });
    paint(ellPts(-.4 * r, -.3 * r, .13 * r, .22 * r, 12, 0, .35), { wash: C(RED_LT, s), ink: null });
    paint(ellPts(-.2 * r, -.52 * r, .05 * r, .05 * r, 8), { wash: C(RED_LT, s), ink: null });
    pop();
  }
  // the apple drawn in pencil in the book: always grey, it's a drawing
  function drawnApple(cx, cy, r, sPage) {
    const pen = '#555555', shade = '#A2A2A2', dark = '#7E7E7E', sw = lw(.9, 2.6);
    boilSeed('drawnApple');
    paint(applePts(cx, cy, r, 36), { wash: shade, ink: null });
    paint(crescent(cx, cy, r), { wash: dark, ink: null });
    paint(ellPts(cx - .4 * r, cy - .3 * r, .13 * r, .22 * r, 12, 0, .35), { wash: C(RC.page, sPage), ink: null });
    for (let i = 0; i < 6; i++) {   // hatching over the shaded side
      const d = -.05 + i * .15, h = Math.sqrt(Math.max(0, 1 - d * d)) * .72;
      inkLine([[cx + (d + .12) * r, cy - h * r], [cx + (d - .12) * r, cy + h * r]], lw(.4, 2.6), pen, 'inkfine', 0);
    }
    const P = applePts(cx, cy, r, 36); P.push(P[0], P[1]);
    inkLine(P, sw, pen, 'ink', .5);
    inkLine(applePts(cx + .6, cy - .8, r * 1.02, 18).slice(2, 13), sw * .45, pen, 'inkfine', .5);   // a second, sketchy pass
    inkLine([[cx + .02 * r, cy - .7 * r], [cx + .07 * r, cy - .95 * r], [cx + .16 * r, cy - 1.2 * r]], sw * 1.1, pen, 'ink', .5);
    const L = leafPts(cx + .1 * r, cy - .9 * r, r); L.push(L[1]);
    inkLine(L, sw * .7, pen, 'ink', .4);
    inkLine([[cx + .12 * r, cy - .9 * r], [cx + .5 * r, cy - .1 * r - .9 * r + .08 * r]], sw * .4, pen, 'inkfine', 0);
  }

  // ---------- the room ----------
  function roomShell(open) {
    const { x0, x1, y0, y1 } = VIEW, m = 60, X0 = x0 - m, X1 = x1 + m, Y0 = y0 - m, Y1 = y1 + m;
    const CEIL = 250, RAIL = 1480;
    if (Y0 < CEIL) flatW(bx4(X0, Y0, X1, CEIL), RC.ceil);
    for (const [a, b, c, d] of [[X0, CEIL - 2, DOOR.x0, FY], [DOOR.x1, CEIL - 2, X1, FY], [DOOR.x0, CEIL - 2, DOOR.x1, DOOR.y0]])
      if (c > a && d > b && inView(a, b, c, d, 0)) flatW(bx4(a, Math.max(b, Y0), c, Math.min(d, Y1)), RC.wall);
    if (!open && inView(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1, 0)) flat(bx4(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1), greyOf('#3A2E28'));
    for (let i = Math.floor(X0 / 96); i * 96 < X1; i++) {   // wallpaper stripes
      const sx = i * 96 + 34, sw = 28, nearDoor = sx + sw > DOOR.x0 - 36 && sx < DOOR.x1 + 36;
      const top = Math.max(CEIL + 24, Y0), bot = Math.min(nearDoor ? DOOR.y0 - 36 : RAIL, Y1);
      if (bot > top && inView(sx, top, sx + sw, bot, 0)) flatW(bx4(sx, top, sx + sw, bot), RC.stripe);
    }
    for (const [a, c] of [[X0, DOOR.x0], [DOOR.x1, X1]]) {   // wainscot and skirting
      if (c <= a || !inView(a, RAIL, c, FY, 0)) continue;
      flatW(bx4(a, RAIL, c, FY), RC.wainscot);
      flatW(bx4(a, FY - 24, c, FY), RC.skirt);
    }
    if (Y1 > FY) flatW(bx4(X0, FY, X1, Y1), RC.floor);
    // lines: moulding, rail, skirting, floor planks
    hline(CEIL, X0, X1, .9, PAL.ink, 'ceil');
    hline(RAIL, X0, DOOR.x0 - 30, .8, PAL.ink, 'railL'); hline(RAIL, DOOR.x1 + 30, X1, .8, PAL.ink, 'railR');
    hline(FY - 24, X0, DOOR.x0 - 30, .7, PAL.ink, 'skL'); hline(FY - 24, DOOR.x1 + 30, X1, .7, PAL.ink, 'skR');
    hline(FY, X0, X1, 1, PAL.ink, 'fy');
    const rows = [FY, FY + 38, FY + 86, FY + 146, FY + 222, FY + 318, FY + 440, FY + 600];
    rows.forEach((ry, i) => {
      if (i) hline(ry, X0, X1, .6, RC.plank, 'pl' + i);
      if (i + 1 >= rows.length) return;
      const ny = rows[i + 1], stp = 170 + i * 40;
      for (let j = Math.floor(X0 / stp); j * stp < X1; j++) {
        const sx = j * stp + stp * hash(i * 17 + j * 3 + 400);
        if (!inView(sx, ry, sx, ny, 10)) continue;
        boilSeed('seam' + i + '_' + j);
        inkLine([[sx, ry + 3], [sx + (sx - 700) * .04, ny - 3]], .5, C(RC.plank, satAt(sx, ry)), 'inkfine', 0);
      }
    });
  }

  // the door's opening: drawn keys, one per step, like a hand-drawn swing (never a projected 3D door)
  const LEAF_KEYS = [0, .22, .5, .78, .94, 1];
  const doorK = st => { const k = seg(st, ...DOOR_T); return k <= 0 ? 0 : LEAF_KEYS[Math.min(5, 1 + Math.floor(k * 5))]; };
  function doorway(t, st, kd) {
    const s = satAt(DOOR.cx, 1330, 200), I = ink(s), sw = lw(.9);
    if (kd < 1) {   // the leaf, swinging outward on its left hinge
      const hx = DOOR.x0 + 3, xe = lerp(DOOR.x1 - 3, DOOR.x0 + 16, kd), sh = 40 * kd;
      const q = (u, v) => [lerp(hx, xe, u), lerp(lerp(DOOR.y0 + 3, DOOR.y0 + 3 + sh, u), lerp(FY - 3, FY - 3 - sh * .5, u), v)];
      const col = mixCol(RC.door, RC.doorDk, kd * .85);
      boilSeed('leaf');
      paint([q(0, 0), q(1, 0), q(1, 1), q(0, 1)], { wash: C(col, s), ink: I, sw });
      if (xe - hx > 30) for (const [v0, v1] of [[.07, .45], [.53, .93]]) paint([q(.15, v0), q(.85, v0), q(.85, v1), q(.15, v1)], { wash: C(mixCol(col, RC.doorDk, .35), s), ink: I, sw: sw * .6 });
      if (kd < .6) { const [kx, ky] = q(.92, .82); paint(ellPts(kx, ky, 8, 8, 12), { wash: C(RC.brass, s), ink: I, sw: sw * .6 }); }
    }
    // light seeping round the closed door: something bright is out there
    const seep = kd <= 0 ? seg(st, SEEP, SEEP + .45) : 0;
    if (seep > 0) {
      const lc = C('#FFF8E6', s), fl = .75 + .25 * Math.sin(t * 9);
      glow(DOOR.x1, 1180, 200, lc, .8 * seep * fl); glow(DOOR.x1, 1440, 200, lc, .8 * seep * fl); glow(DOOR.cx, FY, 240, lc, .75 * seep * fl); glow(DOOR.x0 + 40, DOOR.y0, 160, lc, .5 * seep * fl);
      boilSeed('seep');
      inkLine([[DOOR.x1 - 3, DOOR.y0 + 6], [DOOR.x1 - 3, (DOOR.y0 + FY) / 2], [DOOR.x1 - 3, FY - 4]], 3.4 * seep, lc, 'dry', .2);
      inkLine([[DOOR.x0 + 8, FY - 4], [DOOR.cx, FY - 3], [DOOR.x1 - 6, FY - 4]], 3.6 * seep, lc, 'dry', .2);
      inkLine([[DOOR.x0 + 10, DOOR.y0 + 4], [DOOR.cx, DOOR.y0 + 4], [DOOR.x1 - 8, DOOR.y0 + 4]], 2.2 * seep, lc, 'dry', .2);
      for (let i = 0; i < 5; i++) {   // rays fanning out under the door
        const x = lerp(DOOR.x0 + 30, DOOR.x1 - 30, i / 4);
        inkLine([[x, FY + 2], [x + (x - DOOR.cx) * .5, FY + 60 + 12 * (i % 2)]], 1.6 * seep, lc, 'dry', 0);
      }
    }
    // casing and threshold
    boilSeed('casing');
    const cw = 30;
    paint(rectPts(DOOR.x0 - 8, FY - 14, DOOR.x1 - DOOR.x0 + 16, 18, 1), { wash: C(RC.stone, s), ink: I, sw: sw * .8 });
    paint(rectPts(DOOR.x0 - cw, DOOR.y0 - cw + 4, cw, FY - DOOR.y0 + cw - 4, 1), { wash: C(RC.wood, s), ink: I, sw });
    paint(rectPts(DOOR.x1, DOOR.y0 - cw + 4, cw, FY - DOOR.y0 + cw - 4, 1), { wash: C(RC.wood, s), ink: I, sw });
    paint(rectPts(DOOR.x0 - cw - 10, DOOR.y0 - cw - 16, DOOR.x1 - DOOR.x0 + 2 * cw + 20, 22, 1), { wash: C(RC.woodDk, s), ink: I, sw });
    if (kd > 0) {   // daylight pours in: a burst, then a bright patch on the floor
      const lk = kd, b = 1 - seg(st, 16.4, 17.6);
      boilSeed('floorlight');
      paint([[DOOR.x0 + 18, FY + 2], [DOOR.x1 - 4, FY + 2], [DOOR.x1 + 170 * lk, FY + 330 * lk], [DOOR.x0 - 70 * lk, FY + 330 * lk]], { wash: C(mixCol(RC.floor, RC.light, .45), satAt(DOOR.cx, FY + 150, 150)), ink: null });
      if (b > 0) glow(DOOR.cx, 1330, 520, C('#FFF8E6', s), .9 * b * lk);
    }
  }

  function windowHole(t) {
    const [hx, hy] = HOLE; if (!inView(hx - 80, hy - 90, hx + 80, hy + 90)) return;
    const s = satAt(hx, hy), I = ink(s);
    boilSeed('window');
    paint(rectPts(hx - 72, hy - 84, 144, 168, 1.5), { wash: C(RC.woodDk, s), ink: I, sw: .9 });
    [[-60, -72, 120, 44, '#8A6040'], [-60, -24, 120, 44, '#7E5838'], [-60, 24, 120, 48, '#8F6644']].forEach(([a, b, w, h, c]) => paint(rectPts(hx + a, hy + b, w, h, 1), { wash: C(c, s), ink: I, sw: .6 }));
    for (const [a, b] of [[-48, -60], [44, -60], [-48, 60], [44, 60]]) paint(ellPts(hx + a, hy + b, 3, 3, 6), { wash: I, ink: null });
    paint(ellPts(hx, hy, 13, 12, 14), { wash: C('#FFF8E6', s), ink: I, sw: .5 });
    glow(hx, hy, 120, C('#FFF6DE', s), .8);
  }

  const SHELVES = [{ x0: 230, x1: 560, y: 850, k: 0 }, { x0: 955, x1: 1175, y: 850, k: 1 }];
  const SHELF_BOOKS = (() => {
    const B = [];
    for (const sh of SHELVES) {
      let x = sh.x0 + 8, i = 0;
      while (x < sh.x1 - 34) {
        const h0 = sh.k * 50 + i, w = 20 + 16 * hash(h0 + 1), h = 84 + 52 * hash(h0 + 7), lean = hash(h0 + 13) > .86 ? .2 : 0;
        B.push({ x, w, h, y: sh.y, lean, col: BOOKC[Math.floor(hash(h0 + 3) * BOOKC.length)], band: .15 + .2 * hash(h0 + 21) });
        x += w + 2 + (lean ? 14 : 0); i++;
      }
    }
    return B;
  })();
  function shelves() {
    for (const sh of SHELVES) {
      if (!inView(sh.x0 - 20, sh.y - 150, sh.x1 + 20, sh.y + 40)) continue;
      const s = satAt((sh.x0 + sh.x1) / 2, sh.y - 60, 120), I = ink(s);
      boilSeed('shelf' + sh.k);
      paint(rectPts(sh.x0 - 12, sh.y, sh.x1 - sh.x0 + 24, 16, 1), { wash: C(RC.wood, s), ink: I, sw: .8 });
      for (const bx of [sh.x0 + 20, sh.x1 - 34]) paint([[bx, sh.y + 16], [bx + 14, sh.y + 16], [bx + 14, sh.y + 46]], { wash: C(RC.woodDk, s), ink: I, sw: .6 });
    }
    SHELF_BOOKS.forEach((b, i) => {
      if (!inView(b.x - 20, b.y - b.h, b.x + b.w + 20, b.y)) return;
      const s = satAt(b.x + b.w / 2, b.y - b.h / 2, 90), I = ink(s);
      boilSeed('sb' + i);
      push(); translate(b.x + b.w, b.y); rotate(b.lean);
      paint(rectPts(-b.w, -b.h, b.w, b.h, .8), { wash: C(b.col, s), ink: I, sw: .7 });
      inkLine([[-b.w + 3, -b.h * (1 - b.band)], [-3, -b.h * (1 - b.band)]], 1.2, C(mixCol(b.col, '#FFF5E2', .55), s), 'inkfine', 0);
      inkLine([[-b.w + 3, -b.h * b.band], [-3, -b.h * b.band]], 1.2, C(mixCol(b.col, '#FFF5E2', .55), s), 'inkfine', 0);
      pop();
    });
  }

  function paperSheet(x0, y0, w, h, key) {
    const s = satAt(x0 + w / 2, y0 + h / 2, 120), I = ink(s);
    boilSeed(key);
    paint(rectPts(x0, y0, w, h, 1.5), { wash: C(RC.paper, s), ink: I, sw: .9 });
    for (const px of [x0 + 14, x0 + w - 14]) paint(ellPts(px, y0 + 12, 6, 6, 10), { wash: C(px < x0 + w / 2 ? '#D8394E' : '#3F86C6', s), ink: I, sw: .5 });
    return s;
  }
  function posters() {
    // a rainbow chart above the reading stand
    if (inView(150, 1000, 480, 1235)) {
      const cx = 315, cy = 1206, s = paperSheet(150, 1000, 330, 235, 'rbp');
      for (let i = 0; i < 7; i++) {
        const r1 = 138 - i * 15, r0 = r1 - 14, P = [];
        for (let k = 0; k <= 16; k++) { const a = Math.PI + k / 16 * Math.PI; P.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]); }
        for (let k = 16; k >= 0; k--) { const a = Math.PI + k / 16 * Math.PI; P.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); }
        paint(P, { wash: C(RAINBOW[i], s), ink: null });
      }
      for (const ex of [cx - 110, cx + 110]) paint(through([[ex - 44, cy + 12], [ex - 30, cy - 12], [ex - 6, cy - 22], [ex + 20, cy - 16], [ex + 40, cy - 2], [ex + 44, cy + 12]], 4), { wash: C('#FFFFFF', s), ink: ink(s), sw: .6 });
    }
    // wavelengths
    if (inView(940, 990, 1150, 1200)) {
      const s = paperSheet(940, 990, 210, 210, 'wvp');
      inkLine([[958, 1180], [1135, 1180]], .7, ink(s), 'inkfine', 0);
      [[1040, 96, '#D8394E'], [1092, 62, '#6FAE5A'], [1140, 40, '#8A5CB0']].forEach(([y, L, c], j) => {
        const P = []; for (let x = 960; x <= 1132; x += 6) P.push([x, y - 14 * Math.sin((x - 960) / L * TAU)]);
        inkLine(P, 1.3, C(c, s), 'ink', .5);
      });
    }
    // a prism diagram
    if (inView(940, 1250, 1150, 1450)) {
      const s = paperSheet(940, 1250, 210, 200, 'prp'), px = 1020, py = 1360;
      inkLine([[952, 1392], [px - 16, py + 2]], 1.4, C('#E6E0D0', s), 'ink', 0);
      inkLine([[952, 1392], [px - 16, py + 2]], .5, ink(s), 'inkfine', 0);
      for (let i = 0; i < 7; i++) inkLine([[px + 16, py - 2], [1132, 1296 + i * 20]], 1.2, C(RAINBOW[i], s), 'ink', 0);
      paint([[px, py - 40], [px + 36, py + 22], [px - 36, py + 22]], { wash: C(RC.glass, s), ink: ink(s), sw: .8 });
    }
  }
  function colourWheel(x, y, r) {
    if (!inView(x - r, y - r, x + r, y + r)) return;
    const s = satAt(x, y, 120), hues = ['#D8394E', '#EE8A3A', '#F2C94C', '#6FAE5A', '#3F86C6', '#8A5CB0'];
    boilSeed('wheel');
    paint(ellPts(x, y, r + 12, r + 12, 30, 1), { wash: C(RC.paper, s), ink: ink(s), sw: .8 });
    hues.forEach((h, i) => {
      const a0 = i / 6 * TAU - Math.PI / 2, a1 = (i + 1) / 6 * TAU - Math.PI / 2, P = [[x, y]];
      for (let k = 0; k <= 6; k++) { const a = lerp(a0, a1, k / 6); P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      paint(P, { wash: C(h, s), ink: null });
    });
    paint(ellPts(x, y, r, r, 30), { ink: ink(s), sw: .8 });
    paint(ellPts(x, y, r * .3, r * .3, 16), { wash: C(RC.paper, s), ink: ink(s), sw: .6 });
  }
  function lamp(t) {
    const a = .05 * Math.sin(t * 1.3), L = 300, tx = 560, ty = 250, bx = tx + Math.sin(a) * L, by = ty + Math.cos(a) * L;
    if (!inView(bx - 90, ty, bx + 90, by + 120)) return;
    const s = satAt(bx, by, 120), I = ink(s);
    boilSeed('lamp');
    inkLine([[tx, ty], [lerp(tx, bx, .5), lerp(ty, by, .5)], [bx, by]], 1, I, 'ink', 0);
    push(); translate(bx, by); rotate(-a);
    paint([[-22, 0], [22, 0], [64, 64], [-64, 64]], { wash: C(RC.shade, s), ink: I, sw: .9 });
    paint(ellPts(0, 70, 16, 12, 12), { wash: C('#FFF6DE', s), ink: I, sw: .5 });
    pop();
    glow(bx, by + 80, 230, C('#FFF1D0', s), .45);
  }
  const PILES = [{ x: 1055, y: 1700, n: 6, key: 'pR' }, { x: 95, y: 1712, n: 5, key: 'pL' }];
  function piles() {
    for (const p of PILES) {
      if (!inView(p.x - 100, p.y - p.n * 34, p.x + 100, p.y)) continue;
      let y = p.y;
      for (let i = 0; i < p.n; i++) {
        const w = 120 + 40 * hash(i + p.x), h = 24 + 10 * hash(i + p.x + 5), x = p.x + 16 * (hash(i + p.x + 9) - .5), col = BOOKC[Math.floor(hash(i + p.x + 2) * BOOKC.length)];
        const s = satAt(x, y - h / 2, 90), I = ink(s);
        boilSeed(p.key + i);
        paint(rectPts(x - w / 2, y - h, w, h, .8), { wash: C(col, s), ink: I, sw: .7 });
        paint(rectPts(x + w / 2 - 12, y - h + 4, 8, h - 8, .5), { wash: C('#F7EFDD', s), ink: null });
        y -= h;
      }
    }
  }

  // ---------- the book on its stand ----------
  function bookState(st) {
    if (st < 0) return { n: 0, k: -1 };
    for (let i = FLIPS.length - 1; i >= 0; i--) {
      if (st >= FLIPS[i] + FLIP_D) return { n: i + 1, k: -1 };
      if (st >= FLIPS[i]) return { n: i, k: seg(st, FLIPS[i], FLIPS[i] + FLIP_D) };
    }
    return { n: 0, k: -1 };
  }
  const pagePts = (P, left) => {
    const cu = left ? [[P.x0, P.y0 + 6], [P.x0 + 60, P.y0 - 2], [P.x1, P.y0 + 4]] : [[P.x0, P.y0 + 4], [P.x1 - 60, P.y0 - 2], [P.x1, P.y0 + 6]];
    const bt = left ? [[P.x1, P.y1], [P.x0 + 60, P.y1 + 4], [P.x0, P.y1 - 2]] : [[P.x1, P.y1 - 2], [P.x1 - 60, P.y1 + 4], [P.x0, P.y1]];
    return through(cu, 4).concat(through(bt, 4));
  };
  // what's printed on each page: diagrams only, no letters
  function pageContent(i, left) {
    const P = left ? PL : PR, cx = (P.x0 + P.x1) / 2, cy = (P.y0 + P.y1) / 2, pen = '#585858', sw = lw(.8, 2.6), fine = lw(.5, 2.6);
    boilSeed('pg' + i + (left ? 'L' : 'R'));
    const sine = (x0, x1, y, L, A) => { const Q = []; for (let x = x0; x <= x1 + .1; x += 4) Q.push([x, y - A * Math.sin((x - x0) / L * TAU)]); return Q; };
    if (i === 0) {
      if (left) {
        inkLine([[cx + 44, cy + 44], [cx + 68, cy + 58]], fine, pen, 'inkfine', 0);
        inkLine([[cx + 60, cy + 58], [cx + 68, cy + 58], [cx + 64, cy + 51]], fine, pen, 'inkfine', 0);
      } else {
        inkLine(sine(P.x0 + 16, P.x1 - 16, cy - 36, 120, 16), sw, pen, 'ink', .5);
        inkLine([[P.x0 + 16, cy + 12], [P.x1 - 16, cy + 12]], sw, pen, 'ink', 0);
        for (let k = 0; k <= 10; k++) { const x = lerp(P.x0 + 16, P.x1 - 16, k / 10); inkLine([[x, cy + 12], [x, cy + (k % 5 ? 4 : 0)]], fine, pen, 'inkfine', 0); }
        paint(rectPts(cx - 20, cy + 32, 40, 32, .5), { wash: '#4F4F4F', ink: pen, sw: fine });
      }
    } else if (i === 1) {
      if (left) {   // a prism splits a ray into a fan
        const px = cx - 6, py = cy + 4;
        inkLine([[P.x0 + 12, cy + 40], [px - 14, py + 2]], sw, pen, 'ink', 0);
        for (let k = 0; k < 7; k++) inkLine([[px + 14, py - 2], [P.x1 - 10, cy - 36 + k * 12]], fine, ['#404040', '#6A6A6A', '#9A9A9A', '#7C7C7C', '#5A5A5A', '#484848', '#3A3A3A'][k], 'inkfine', 0);
        paint([[px, py - 34], [px + 30, py + 18], [px - 30, py + 18]], { wash: '#D8D8D8', ink: pen, sw });
      } else {       // the spectrum as seven swatches, and which one belongs to the apple
        ['#5C5C5C', '#8E8E8E', '#C9C9C9', '#9A9A9A', '#6E6E6E', '#555555', '#4A4A4A'].forEach((c, k) => paint(rectPts(cx - 34, P.y0 + 18 + k * 19, 34, 17, .4), { wash: c, ink: pen, sw: fine }));
        inkLine([[cx + 40, P.y0 + 28], [cx + 8, P.y0 + 27]], sw, pen, 'ink', 0);
        inkLine([[cx + 16, P.y0 + 21], [cx + 8, P.y0 + 27], [cx + 16, P.y0 + 33]], sw, pen, 'ink', 0);
        paint(applePts(cx + 54, P.y0 + 28, 11, 20), { wash: '#A2A2A2', ink: pen, sw: fine });
      }
    } else if (i === 2) {
      if (left) {   // three wavelengths
        [[cy - 44, 70, '#454545'], [cy, 44, '#6A6A6A'], [cy + 44, 26, '#8A8A8A']].forEach(([y, L, c]) => inkLine(sine(P.x0 + 14, P.x1 - 14, y, L, 13), sw, c, 'ink', .5));
      } else {       // the sensitivity of three kinds of cones: three overlapping humps
        inkLine([[P.x0 + 12, cy + 54], [P.x1 - 12, cy + 54]], sw, pen, 'ink', 0);
        [[-38, '#4A4A4A'], [4, '#6E6E6E'], [30, '#8C8C8C']].forEach(([dx, c]) => {
          const Q = []; for (let k = -10; k <= 10; k++) Q.push([cx + dx + k * 5.5, cy + 54 - 92 * Math.exp(-k * k / 18)]);
          inkLine(Q, sw, c, 'ink', .5);
        });
      }
    } else {
      if (left) {   // the eye: rays through the lens onto the back
        paint(ellPts(cx + 8, cy, 50, 46, 30), { wash: '#E4E4E4', ink: pen, sw });
        paint(ellPts(cx - 34, cy, 9, 22, 14), { wash: '#BDBDBD', ink: pen, sw: fine });
        for (const d of [-28, 0, 28]) inkLine([[P.x0 + 4, cy + d * .9], [cx - 34, cy + d * .25], [cx + 54, cy - d * .55]], fine, pen, 'inkfine', 0);
        paint(ellPts(cx + 44, cy, 6, 24, 12), { wash: '#6E6E6E', ink: null });
      } else {       // three cone cells, wired to a little brain
        [[-44, '#555555'], [-8, '#7A7A7A'], [28, '#9E9E9E']].forEach(([dx, c]) => {
          paint([[cx + dx, cy - 44], [cx + dx + 13, cy + 6], [cx + dx - 13, cy + 6]], { wash: c, ink: pen, sw: fine });
          inkLine([[cx + dx, cy + 6], [cx + dx * .3, cy + 38]], fine, pen, 'inkfine', 0);
        });
        paint(ellPts(cx - 4, cy + 52, 30, 18, 18), { wash: '#C8C8C8', ink: pen, sw: fine });
        inkLine([[cx - 22, cy + 50], [cx - 10, cy + 44], [cx, cy + 54], [cx + 12, cy + 46]], fine, pen, 'inkfine', .6);
      }
    }
  }
  function bookStand(st) {
    if (!inView(BOOK.x0 - 30, BOOK.y0 - 20, BOOK.x1 + 30, BOOK.y1 + 90)) return;
    const s = satAt(BOOK.sp, 1560, 160), I = ink(s), sw = lw(.9), pageC = C(RC.page, s);
    boilSeed('stand');
    paint([[BOOK.x0 + 40, BOOK.y1], [BOOK.x0 + 58, BOOK.y1], [BOOK.x0 + 34, BOOK.y1 + 74], [BOOK.x0 + 16, BOOK.y1 + 74]], { wash: C(RC.woodDk, s), ink: I, sw });
    paint([[BOOK.x1 - 58, BOOK.y1], [BOOK.x1 - 40, BOOK.y1], [BOOK.x1 - 16, BOOK.y1 + 74], [BOOK.x1 - 34, BOOK.y1 + 74]], { wash: C(RC.woodDk, s), ink: I, sw });
    paint(rectPts(BOOK.x0 - 10, BOOK.y0 - 6, BOOK.x1 - BOOK.x0 + 20, BOOK.y1 - BOOK.y0 + 14, 1), { wash: C(RC.wood, s), ink: I, sw });
    paint(rectPts(BOOK.x0 - 2, BOOK.y0 + 2, BOOK.x1 - BOOK.x0 + 4, BOOK.y1 - BOOK.y0 + 2, 1), { wash: C(RC.cover, s), ink: I, sw });
    paint(pagePts(PL, true), { wash: pageC, ink: I, sw: sw * .8 });
    paint(pagePts(PR, false), { wash: pageC, ink: I, sw: sw * .8 });
    inkLine([[BOOK.sp, PL.y0 + 2], [BOOK.sp, PL.y1]], sw * 1.2, C('#9C9080', s), 'ink', 0);
    const b = bookState(st);
    if (b.k < 0) { if (b.n === 0) drawnApple(...DRAWN, DRR, s); pageContent(b.n, true); pageContent(b.n, false); }
    else {
      const k = ease(b.k), nl = k < .5 ? b.n : b.n + 1;
      if (nl === 0) drawnApple(...DRAWN, DRR, s);
      pageContent(nl, true); pageContent(b.n + 1, false);
      const xe = lerp(PR.x1, PL.x0, k), lift = Math.sin(Math.PI * k);
      if (Math.abs(xe - BOOK.sp) > 3) {
        boilSeed('flip');
        paint([[BOOK.sp, PL.y0 + 2], [xe, PL.y0 - 34 * lift], [xe, PL.y1 - 14 * lift], [BOOK.sp, PL.y1]], { wash: C(mixCol(RC.page, '#D9CFBE', .3 * lift), s), ink: I, sw: sw * .8 });
      }
    }
  }
  function magnifier(at, handTo, lying) {
    const s = satAt(at[0], at[1]), I = ink(s), R = 50;
    boilSeed('mag');
    if (lying) {
      push(); translate(at[0], at[1]);
      paint(ribbon([[R * .9, 0], [R * 2.1, 6]], 12, 10), { wash: C(RC.woodDk, s), ink: I, sw: lw(.7) });
      paint(ellPts(0, 0, R, R * .32, 26), { ink: C('#4A4A58', s), sw: lw(2.2) });
      pop();
      return;
    }
    const [x, y] = at, dx = handTo[0] - x, dy = handTo[1] - y, d = Math.hypot(dx, dy) || 1, rim = [x + dx / d * R, y + dy / d * R];
    paint(ribbon([rim, handTo], lw(12, 3), lw(14, 3)), { wash: C(RC.woodDk, s), ink: I, sw: lw(.7) });
    inkLine(ellPts(x, y, R, R, 40).concat([[x + R, y]]), lw(3.2), C('#4A4A58', s), 'ink', .5);
    inkLine(ellPts(x, y, R - 6, R - 6, 20).slice(11, 16), lw(1.1), C('#FFFDF6', s), 'inkfine', .5);
  }
  function prismShape(x, y, s, key) {
    boilSeed(key);
    paint([[x, y - 36], [x + 31, y + 18], [x - 31, y + 18]], { wash: C(RC.glass, s), ink: ink(s), sw: lw(.9) });
    inkLine([[x - 17, y + 8], [x - 5, y - 18]], lw(1), C('#FFFDF6', s), 'inkfine', 0);
  }

  // ---------- Clawd in the room ----------
  function armTip(x, y, u, o, which = 'L') {
    const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which) || V.arms[0];
    const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
    let lx, ly;
    if (dir === 0) { const r = .7 - a; lx = px * u + Math.cos(r) * 2.1 * u; ly = -4.2 * u + Math.sin(r) * 2.1 * u; }
    else { const r = dir < 0 ? a : -a, root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u; lx = root + Math.cos(r) * dir * 2.2 * u; ly = -4.5 * u + Math.sin(r) * dir * 2.2 * u; }
    const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
    lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35); ly *= (o.sy ?? 1) * (1 - sq);
    const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    return [x + (o.dx || 0) * u + lx * c - ly * s, y + (o.dy || 0) * u + lx * s + ly * c];
  }
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0);
    return o;
  }
  const MOOD = [
    [-99, 'thinking'], [5.7, 'happy'], [6.5, 'determined'], [8.25, 'surprised', { emote: null }], [9.0, 'thinking', { emote: null }],
    [10.5, 'proud'], [13.3, 'surprised', { emote: null }], [13.75, 'confused'], [14.35, 'hopeful'], [16.75, 'surprised', { emote: null, mouth: 'o' }],
    [18.4, 'neutral'], [24.3, 'surprised', { emote: null }], [26.28, 'starstruck'],
  ];
  function clawdRoom(st) {
    const m = emotions(st, MOOD);
    let x = READ[0], y = READ[1], u = U, p = {};
    if (st < JUMP[0] - .14) {                      // on the stack behind the book, front view
      if (st < 6.5) {
        const b = bookState(st), f = FLIPS.find(f => st > f - .2 && st < f + .6);
        p.lookY = .85;
        p.lookX = st < 2.5 ? -.55 : f != null ? kf(st, [[f - .2, .5], [f + .2, -.5]]) : kf(frac((st - 3.2) / 1.2), [[0, -.5], [.45, .5], [1, .5]]);
        p.aL = st < 2.3 ? .45 + .05 * Math.sin(st * 2.1) : kf(st, [[2.3, .45], [2.7, -.5]]);
        if (f != null) p.aR = kf(st, [[f - .2, .9], [f - .04, 1.35], [f + .2, .05], [f + .55, .9]]);
        if (st > 5.7) { p.lookX = 0; delete p.aR; }
      } else if (st < 11.8) {                      // the prism: grab it, hold it up in the beam, look, lower it
        p.aR = kf(st, [[6.5, .3], [6.64, -.35], [6.9, 1.32], [11.2, 1.32], [11.45, .6], [11.7, -.4]]) + (st > 7 && st < 11 ? .03 * Math.sin(st * 3) : 0);
        p.lookX = kf(st, [[6.5, .6], [6.9, .5], [8.1, .5], [8.3, 1], [9.7, 1], [9.9, -.35]]);
        p.lookY = kf(st, [[6.5, .2], [6.9, -.9], [8.1, -.9], [8.3, .15], [9.7, .15], [9.9, -1]]);
      } else if (st > 13.3) { p.lookX = 1; p.lookY = .2; }
      if (st > 13.8) p = { ...p, ...turn(st, 13.8, 13.98, 0, .25) };
    } else if (st < WALK[0]) {                    // hop down off the stack
      const k = seg(st, ...JUMP), j = jump(st, JUMP[0], JUMP[1], 5.5);
      x = lerp(READ[0], JUMP_TO[0], ease(k)); y = lerp(READ[1], JUMP_TO[1], easeIn(k));
      p = { view: 'side', ...j, aL: 1.1 };
    } else if (st < TURN_B[0]) {                  // trot to the door
      const w = stroll(st, WALK[0], WALK[1], JUMP_TO[0], STAND[0], U);
      x = w.x; y = STAND[1]; p = { view: 'side', walk: w.walk, dy: w.dy };
    } else if (st < TURN_F[0]) {                  // at the door, back to us
      x = STAND[0]; y = STAND[1];
      p = { ...turn(st, ...TURN_B, .25, .5), aL: kf(st, [[REACH[0], .2], [REACH[1], 1.2], [16.3, 1.2], [16.6, .5]]) };
      if (st > 16.6) delete p.aL;
    } else if (st < DASH[0]) {                    // turn round: starstruck
      x = STAND[0]; y = STAND[1]; p = turn(st, ...TURN_F, .5, 0);
    } else {                                      // and off into the garden
      const k = seg(st, ...DASH);
      x = lerp(STAND[0], DOOR.cx + 10, easeIn(k)); y = lerp(STAND[1], FY - 18, easeIn(k)); u = lerp(U, 9, easeIn(k));
      p = { ...turn(st, DASH[0], DASH[0] + .1, 0, .5), smear: .7 * Math.sin(Math.PI * k), smearDir: 0, dy: -1.5 * Math.sin(Math.PI * k) };
    }
    return { x, y, u, o: merge(m, p) };
  }
  function prismAt(st, q) {
    const hand = () => { const [hx, hy] = armTip(q.x, q.y, q.u, q.o, 'R'); return [hx, hy - 20]; };
    if (st < PRISM_UP[0] || st >= PRISM_DOWN[1]) return { at: LEDGE, held: false };
    if (st < PRISM_UP[1]) return { at: arcPt(LEDGE, hand(), 40, ease(seg(st, ...PRISM_UP))), held: false };
    if (st < PRISM_DOWN[0]) return { at: hand(), held: true };
    return { at: arcPt(hand(), LEDGE, 30, ease(seg(st, ...PRISM_DOWN))), held: false };
  }
  function magAt(st, q) {
    const tip = armTip(q.x, q.y, q.u, q.o, 'L');
    if (st >= 2.75) return { at: MAG_REST, lying: true };
    const hold = [DRAWN[0] + 3 * Math.sin(st * 1.7), DRAWN[1] + 2 * Math.cos(st * 1.3)];
    if (st < 2.3) return { at: hold, tip };
    const k = ease(seg(st, 2.3, 2.75));
    return { at: arcPt(hold, [MAG_REST[0] + 20, MAG_REST[1] - 40], 30, k), tip };
  }
  let FLOOR_SPOT = null;
  function floorSpot() {
    if (FLOOR_SPOT) return FLOOR_SPOT;
    const q = clawdRoom(9.0), p = prismAt(9.0, q).at, e = [p[0] - 14, p[1] - 8], k = (1760 - HOLE[1]) / (e[1] - HOLE[1]);
    return (FLOOR_SPOT = [HOLE[0] + (e[0] - HOLE[0]) * k, 1760]);
  }
  function beam(t, st, pr) {
    const into = pr.held && st >= FAN[0], end = into ? [pr.at[0] - 14, pr.at[1] - 8] : floorSpot();
    if (!inView(Math.min(HOLE[0], end[0]) - 60, HOLE[1], Math.max(HOLE[0], end[0]) + 80, end[1] + 30)) return;
    const s = satAt(400, 1200, 400), dx = end[0] - HOLE[0], dy = end[1] - HOLE[1], d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d, w0 = 11, w1 = into ? 20 : 34;
    const lc = C(RC.light, s);
    boilSeed('beam');
    paint([[HOLE[0] + nx * w0, HOLE[1] + ny * w0], [end[0] + nx * w1, end[1] + ny * w1], [end[0] - nx * w1, end[1] - ny * w1], [HOLE[0] - nx * w0, HOLE[1] - ny * w0]], { wash: lc, washOp: 150, ink: null });
    if (!into) paint(ellPts(end[0], end[1], 66, 17, 20, 1), { wash: lc, washOp: 190, ink: null });
    for (let i = 0; i < 7; i++) {   // dust drifting in the light
      const k = frac(t * .05 + hash(i + 70)), px = lerp(HOLE[0], end[0], k) + nx * (hash(i + 80) - .5) * 2 * lerp(w0, w1, k), py = lerp(HOLE[1], end[1], k) + ny * (hash(i + 80) - .5) * 2 * lerp(w0, w1, k);
      boilSeed('mote' + i);
      paint(ellPts(px + 4 * Math.sin(t + i), py, 2.6, 2.6, 6), { wash: C('#FFFDF6', s), ink: null });
    }
  }
  function fan(st, pr) {
    const k = pr.held ? easeOut(seg(st, ...FAN)) * (1 - seg(st, ...FAN_OFF)) : 0; if (k <= .01) return;
    const O = [pr.at[0] + 14, pr.at[1] - 8], s = satAt(600, 1320, 300);
    const land = seg(st, FAN[1] - .05, FAN[1] + .25) * (1 - seg(st, ...FAN_OFF));
    for (let i = 0; i < 7; i++) {
      const a = [DOORSPEC.x, lerp(DOORSPEC.y0, DOORSPEC.y1, i / 7)], b = [DOORSPEC.x, lerp(DOORSPEC.y0, DOORSPEC.y1, (i + 1) / 7)];
      const A = [lerp(O[0], a[0], k), lerp(O[1], a[1], k)], B = [lerp(O[0], b[0], k), lerp(O[1], b[1], k)];
      boilSeed('fan' + i);
      paint([O, A, B], { wash: C(RAINBOW[i], s), washOp: 225, ink: null });
      if (land > 0) paint([a, [a[0] + 80 * land, a[1] - 4 * land], [b[0] + 80 * land, b[1] - 4 * land], b], { wash: C(RAINBOW[i], s), ink: null });
    }
  }

  // ---------- the garden (its own coordinates; seen through the door, or on its own) ----------
  const TREE = { x: 540, base: 1512 };
  const CROWN = [[545, 690, 205, 118], [372, 632, 172, 138], [714, 624, 178, 142], [545, 520, 250, 195], [452, 384, 178, 142], [640, 394, 172, 136]];
  const FLOWERS = Array.from({ length: 13 }, (_, i) => ({ x: -260 + hash(i + 300) * 1560, y: 1560 + Math.pow(hash(i + 320), .8) * 420, c: FLOWERC[i % 5], r: 13 + 7 * hash(i + 340) }));
  const TUFTS = Array.from({ length: 16 }, (_, i) => ({ x: -300 + hash(i + 400) * 1600, y: 1530 + hash(i + 420) * 460 }));
  function garden(t, st, o = {}) {
    const { x0, x1, y0, y1 } = VIEW, m = 150, X0 = x0 - m, X1 = x1 + m, Y0 = y0 - m, Y1 = y1 + m;
    // sky in soft bands
    const bands = [[Math.min(Y0, -2500), GC.skyTop], [250, mixCol(GC.skyTop, GC.sky, .5)], [650, GC.sky], [1030, mixCol(GC.sky, GC.skyLo, .5)], [1290, GC.skyLo]];
    const step = 120, xs = Math.floor(X0 / step) * step, xe = X1 + step;
    const edge = (i, x) => i >= bands.length ? GGY + 4 : i ? bands[i][0] + 16 * Math.sin(x * .004 + i) : bands[0][0];
    if (Y0 < GGY) bands.forEach(([by, col], i) => {
      const nb = i + 1 < bands.length ? bands[i + 1][0] : GGY;
      if (by > Y1 || nb + 20 < Y0) return;
      const P = []; for (let x = xs; x <= xe; x += step) P.push([x, edge(i, x)]);
      for (let x = Math.floor(xe / step) * step; x >= xs; x -= step) P.push([x, edge(i + 1, x) + 1]);
      flatW(P, col);
    });
    // sun and clouds
    if (inView(60, 10, 340, 290)) {
      const s = satAt(200, 150);
      glow(200, 150, 230, C(GC.sun, s), .7);
      boilSeed('sun'); paint(ellPts(200, 150, 58, 58, 24, 1.2), { wash: C('#FFF1C4', s), ink: null });
    }
    for (let i = 0; i < 3; i++) {
      const cx = -300 + ((i * 640 + t * 14 + 200) % 1900), cy = 230 + i * 150, s = satAt(cx, cy);
      if (!inView(cx - 140, cy - 60, cx + 140, cy + 40)) continue;
      boilSeed('cloud' + i);
      paint(through([[cx - 130, cy + 24], [cx - 84, cy - 18], [cx - 20, cy - 46], [cx + 50, cy - 30], [cx + 100, cy - 8], [cx + 130, cy + 24]], 5).concat([[cx - 130, cy + 24]]), { wash: C(GC.cloud, s), ink: null });
    }
    // hills, then the lawn
    if (Y1 > GGY - 260) {
      const hs = Math.floor(X0 / 100) * 100, F = [], N = [];
      for (let x = hs; x <= X1 + 100; x += 100) {
        F.push([x, GGY - 70 - 120 * (.5 + .5 * Math.sin(x * .0031 + 1.1)) * (.6 + .4 * hash(Math.round(x / 100) + 900))]);
        N.push([x, GGY - 20 - 60 * (.5 + .5 * Math.sin(x * .0052 + 2.4))]);
      }
      flatW(through(F, 3).concat([[X1 + 100, GGY + 4], [hs, GGY + 4]]), GC.hillFar);
      flatW(through(N, 3).concat([[X1 + 100, GGY + 4], [hs, GGY + 4]]), GC.hill);
    }
    if (Y1 > GGY) { flatW(bx4(X0, GGY, X1, Y1 + 50), GC.grass); if (Y1 > GGY + 240) flatW(bx4(X0, GGY + 240, X1, Y1 + 50), GC.grassDk); }
    if (inView(X0, GGY - 10, X1, GGY + 10)) hline(GGY, X0, X1, lw(.9, 2.6), PAL.ink, 'ggy');
    TUFTS.forEach((f, i) => {
      if (!inView(f.x - 20, f.y - 30, f.x + 20, f.y)) return;
      const s = satAt(f.x, f.y), sw = wob(t, .4, hash(i) * 3) * 4;
      boilSeed('tuft' + i);
      inkLine([[f.x - 10, f.y - 16], [f.x - 3, f.y], [f.x + sw, f.y - 24], [f.x + 4, f.y], [f.x + 12, f.y - 14]], .8, C(GC.tuft, s), 'inkfine', .3);
    });
    FLOWERS.forEach((f, i) => {
      if (!inView(f.x - 30, f.y - 70, f.x + 30, f.y)) return;
      const s = satAt(f.x, f.y), h = 36 + 20 * hash(i + 360), sway = 4 * Math.sin(t * 1.6 + i), fx = f.x + sway, fy = f.y - h;
      boilSeed('fl' + i);
      inkLine([[f.x, f.y], [f.x + sway * .5, f.y - h * .5], [fx, fy]], 1, C('#4F8A3E', s), 'ink', .5);
      const P = []; for (let k = 0; k < 30; k++) { const a = k / 30 * TAU, rr = f.r * (.55 + .45 * Math.abs(Math.cos(a * 2.5))); P.push([fx + Math.cos(a) * rr, fy + Math.sin(a) * rr]); }
      paint(P, { wash: C(f.c, s), ink: ink(s), sw: lw(.5, 2.6) });
      paint(ellPts(fx, fy, f.r * .3, f.r * .3, 10), { wash: C('#E8AA38', s), ink: null });
    });
    // the tree
    if (inView(TREE.x - 450, 150, TREE.x + 450, TREE.base + 20)) {
      const x = TREE.x, b = TREE.base, s = satAt(x, b - 300, 250);
      boilSeed('trunk');
      paint([[x - 44, b + 8], [x - 27, b - 300], [x - 36, b - 560], [x - 170, b - 790], [x - 148, b - 806], [x - 12, b - 640], [x + 8, b - 840], [x + 30, b - 838], [x + 22, b - 624], [x + 158, b - 800], [x + 178, b - 782], [x + 36, b - 540], [x + 29, b - 300], [x + 46, b + 8]], { wash: C(GC.trunk, s), ink: ink(s), sw: lw(1.1, 2.6) });
      inkLine([[x - 10, b - 60], [x - 4, b - 200], [x - 14, b - 330]], lw(.7, 2.6), C(GC.trunkDk, s), 'inkfine', .5);
      CROWN.forEach(([cx, cy, rx, ry], i) => {
        const sc = satAt(cx, cy, 160);
        boilSeed('crown' + i);
        paint(ellPts(cx, cy, rx, ry, 26, 3), { wash: C(i % 2 ? GC.crown : mixCol(GC.crown, GC.crownDk, .35), sc), ink: ink(sc), sw: lw(1.1, 2.6) });
      });
      for (let i = 0; i < 7; i++) {   // lighter leaf patches
        const lx = 380 + hash(i + 500) * 340, ly = 330 + hash(i + 520) * 320, sc = satAt(lx, ly, 160);
        boilSeed('lp' + i);
        paint(ellPts(lx, ly, 34 + 20 * hash(i + 540), 20 + 10 * hash(i + 560), 12, 2, .3), { wash: C(GC.crownLt, sc), ink: null });
      }
    }
    // the apple: always red, even in the grey world
    if (inView(APPLE_G[0] - 80, APPLE_G[1] - 120, APPLE_G[0] + 80, APPLE_G[1] + 60)) {
      const sl = satAt(APPLE_G[0], APPLE_G[1] - 60, 60), sway = .05 * Math.sin(t * 1.2);
      const pk = o.pulse || 0;
      if (o.redGlow > 0) glow(APPLE_G[0], APPLE_G[1], APR * 5, '#FF3B3B', o.redGlow);
      boilSeed('twig');
      inkLine([[APPLE_G[0] - 20, APPLE_G[1] - 96], [APPLE_G[0] - 6, APPLE_G[1] - 70], [APPLE_G[0] + 3 + sway * 80, APPLE_G[1] - 46]], lw(1.6, 2.6), C(GC.trunkDk, sl), 'ink', .5);
      push(); translate(APPLE_G[0] + 3, APPLE_G[1] - 46); rotate(sway);
      apple(0, 46, APR, { s: 1, sl, sq: o.sq || 0, k: 1 + pk, key: 'G' });
      pop();
    }
    waveFront('gw');
  }
  // the colour front: a ring of bright dry-brush strokes and sparkles, where grey turns to colour
  function waveFront(key) {
    if (!(WV.r > 0) || WV.r === Infinity) return;
    const [cx, cy] = WV.c, r = WV.r, n = Math.round(clamp(TAU * r * PXZ / 64, 10, 110)), L = 70 / PXZ / r;
    for (let i = 0; i < n; i++) {
      const a = (i + .5 * hash(i + 3)) / n * TAU, rr = r - (6 + 10 * hash(i + 7)) / PXZ;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr, mm = 80 / PXZ;
      if (px < VIEW.x0 - mm || px > VIEW.x1 + mm || py < VIEW.y0 - mm || py > VIEW.y1 + mm) continue;
      const P = []; for (let k = -2; k <= 2; k++) { const b = a + k / 4 * L; P.push([cx + Math.cos(b) * rr, cy + Math.sin(b) * rr]); }
      boilSeed(key + i);
      inkLine(P, (2.6 + 1.6 * hash(i + 11)) / PXZ, RAINBOW[i % 7], 'dry', .5);
      if (i % 3 === 0) paint(starPts(px + Math.cos(a) * 16 / PXZ, py + Math.sin(a) * 16 / PXZ, (12 + 8 * hash(i + 13)) / PXZ, .3, 4, BOILN * .4 + i), { wash: '#FFF8E8', ink: null });
    }
  }

  // ---------- the colour wave on the clock ----------
  const A_Z = 21;                                         // room zoom that makes the far apple fill the frame
  const DOORCAM = [DOOR.cx, 1340, 2.9], WIDE_F = [640, 1265, .95], CLAWD_F = [735, 1480, 1.55];
  function camF(t) {
    if (t < BURST) return camAt(APPLE_RM, [0, 0], A_Z * (1 - .025 * seg(t, REV[1], BURST)));
    const c0 = camAt(APPLE_RM, [0, 0], A_Z * .975);
    if (t < ROOM_W) return camPath(APPLE_RM, c0, DOORCAM, easeOut(seg(t, BURST, ROOM_W)));
    if (t < 25.9) return camPath(APPLE_RM, DOORCAM, WIDE_F, ease(seg(t, ROOM_W, 25.9)));
    return mixCam(WIDE_F, CLAWD_F, ease(seg(t, 25.9, 26.6)));
  }
  function wavesAt(st) {
    if (st < BURST) return { g: -1, r: -1 };
    const k = seg(st, BURST, ROOM_W), z = camF(st)[2] * S;
    const g = st < ROOM_W ? lerp(270, 1320, easeOut(k)) / z : Infinity;
    const r = st < ROOM_W ? -1 : st < FULL ? 110 + 1500 * Math.pow(seg(st, ROOM_W, FULL), 1.5) : Infinity;
    return { g, r };
  }

  // ---------- frames ----------
  function roomFrame(t, st, c) {
    cam(c);
    const wv = wavesAt(st), kd = doorK(st);
    if (kd > 0) {   // the garden, seen through the doorway (the wall painted next covers the rest)
      const dv = { x0: Math.max(VIEW.x0, DOOR.x0), x1: Math.min(VIEW.x1, DOOR.x1), y0: Math.max(VIEW.y0, DOOR.y0), y1: Math.min(VIEW.y1, DOOR.y1) };
      if (dv.x1 > dv.x0 && dv.y1 > dv.y0) {
        const sv = VIEW, sp = PXZ;
        VIEW = { x0: (dv.x0 - PX0) / S, x1: (dv.x1 - PX0) / S, y0: (dv.y0 - PY0) / S, y1: (dv.y1 - PY0) / S }; PXZ = sp * S;
        setWave(APPLE_G, wv.g);
        const pk = st > 21.8 && st < BURST + .3 ? .07 * Math.max(0, Math.sin((st - 21.8) * 14)) * seg(st, 21.8, 22.0) + .12 * Math.sin(Math.PI * seg(st, 22.28, BURST + .3)) : 0;
        push(); translate(PX0, PY0); scale(S);
        garden(t, st, { pulse: pk, sq: st > 22.2 && st < BURST ? -.08 * seg(st, 22.2, BURST) : 0, redGlow: st > 21.8 && st < BURST + .8 ? .5 * seg(st, 21.8, BURST) * (1 - seg(st, BURST, BURST + .8)) : 0 });
        if (st > BURST - .05 && st < BURST + .9) glow(APPLE_G[0], APPLE_G[1], 900 * easeOut(seg(st, BURST, BURST + .5)) + 60, '#FFF1E0', 1 - seg(st, BURST, BURST + .9));
        pop();
        VIEW = sv; PXZ = sp;
        flushBrush();
      }
    }
    setWave(APPLE_RM, wv.r);
    roomShell(kd > 0);
    windowHole(t);
    shelves();
    posters();
    colourWheel(DOOR.cx, 880, 92);
    lamp(t);
    piles();
    doorway(t, st, kd);
    const q = clawdRoom(st), pr = prismAt(st, q);
    beam(t, st, pr);
    const behind = st < (JUMP[0] + JUMP[1]) / 2;
    const sC = satAt(q.x, q.y - 4 * q.u, 150);
    const drawClawd = () => clawdS(q.x, q.y, q.u, { ...q.o, boilKey: 'M' }, sC);
    if (behind) drawClawd();
    bookStand(st);
    const mg = magAt(st, q);
    if (inView(mg.at[0] - 120, mg.at[1] - 120, mg.at[0] + 120, mg.at[1] + 120)) magnifier(mg.at, mg.tip, mg.lying);
    if (!pr.held || st < PRISM_UP[1]) prismShape(pr.at[0], pr.at[1], satAt(pr.at[0], pr.at[1]), 'prism');
    if (!behind) drawClawd();
    if (pr.held) { fan(st, pr); prismShape(pr.at[0], pr.at[1], satAt(pr.at[0], pr.at[1]), 'prism'); }
    // the colour reaches Clawd: a burst of sparkles in every colour
    const ca = st - 24.35;
    if (ca > 0 && ca < .7) for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + .3; sparkle(q.x + Math.cos(a) * (140 + 60 * easeOut(ca / .7)), q.y - 4 * U + Math.sin(a) * (110 + 50 * easeOut(ca / .7)), 22, ca / .7, RAINBOW[i % 7]); }
    const ga = st - 16.85;   // the apple's first glint: lead the eye to the one red thing
    if (ga > 0 && ga < .55) sparkle(APPLE_RM[0] - 4, APPLE_RM[1] - 6, 16, ga / .55, '#FFFDF6');
    const pa = st - 10.55;   // proud: a sparkle over the head
    if (pa > 0 && pa < .6) sparkle(q.x + 40, q.y - 9.5 * U, 26, pa / .6, greyOf('#FFF5E2'));
    waveFront('rw');
    camEnd();
  }
  function gardenFrame(t, st, c) {
    cam(c);
    setWave(APPLE_G, Infinity);
    garden(t, st);
    if (st < LOOP) {
      const q = clawdGarden(st);
      clawd(q.x, q.y, UG, { ...q.o, boilKey: 'G', swMul: Math.min(1, 2.6 / PXZ) });
      const a = st - 28.7;   // starstruck: sparkles
      if (a > 0 && a < 2) for (let i = 0; i < 5; i++) { const k = frac(a * .9 + i / 5), ang = i * 1.3 + Math.floor(a * .9 + i / 5) * 2.1; sparkle(q.x + Math.cos(ang) * 190, q.y - 5 * UG + Math.sin(ang) * 130, 24, k, RAINBOW[(i * 2) % 7]); }
    }
    camEnd();
  }
  const GMOOD = [[-99, 'excited'], [28.65, 'starstruck', { lookX: .5, lookY: -1 }], [30.5, 'love', { lookX: .45, lookY: -.9 }]];
  function clawdGarden(st) {
    const m = emotions(st, GMOOD), G_FROM = -260, G_AT = [400, 1650];
    if (st < G_RUN[1]) {
      const k = seg(st, ...G_RUN), x = lerp(G_FROM, G_AT[0], easeOut(k));
      return { x, y: G_AT[1], o: merge(m, { view: 'side', walk: (x - G_FROM) / (3 * UG), smear: .5 * (1 - k), smearDir: 1 }) };
    }
    return { x: G_AT[0], y: G_AT[1], o: merge(m, turn(st, G_RUN[1], G_RUN[1] + .15, .25, 0)) };
  }
  // Gegenschuss: Clawd's grey face, seen from the garden, the red apple mirrored in both eyes
  const RMOOD = [[-99, 'neutral', { lookY: -.3, lookX: .15 }], [20.62, 'surprised', { emote: null, mouth: 'o', lookY: -.35, lookX: .12 }]];
  function reverseFrame(t) {
    const lt = t - REV[0], c = [0, 50, 1.0 + .03 * lt];
    cam(c);
    setWave([0, 0], -1);
    const { x0, x1, y0, y1 } = VIEW;
    flat(bx4(x0 - 80, y0 - 80, x1 + 80, 330), greyOf('#51666A'));
    flat(bx4(x0 - 80, 330, x1 + 80, y1 + 80), greyOf('#5E4A38'));
    let bxp = -440;   // a shelf of books inside, in shadow
    for (let i = 0; bxp < 420; i++) {
      const w = 34 + 26 * hash(i + 60), h = 120 + 70 * hash(i + 63);
      boilSeed('rs' + i);
      paint(rectPts(bxp, -420 - h, w, h, 2), { wash: greyOf(['#3E5256', '#48605F', '#384A4E'][i % 3]), ink: greyOf('#2E3A3C'), sw: 1 });
      bxp += w + 4;
    }
    boilSeed('rshelf');
    paint(rectPts(-470, -420, 940, 26, 2), { wash: greyOf('#3A3430'), ink: greyOf('#2E3A3C'), sw: 1 });
    glow(160, -700, 260, '#FFFFFF', .25);
    boilSeed('revpost');
    paint(rectPts(-560, -960, 120, 1400, 2), { wash: greyOf(RC.wood), ink: greyOf(PAL.ink), sw: 1.4 });
    paint(rectPts(440, -960, 120, 1400, 2), { wash: greyOf(RC.wood), ink: greyOf(PAL.ink), sw: 1.4 });
    paint(rectPts(-600, 380, 1200, 40, 2), { wash: greyOf(RC.stone), ink: greyOf(PAL.ink), sw: 1.2 });
    glow(0, 60, 700, '#FFFFFF', .35);
    const m = emotions(t, RMOOD), u = 62;
    const glints = (uu, sw) => {
      for (const sd of [-1, 1]) {
        const ex = sd * 2.5 * uu + (m.lookX || 0) * uu * .5, ey = -6 * uu + (m.lookY || 0) * uu * .4;
        apple(ex + .16 * uu, ey + .4 * uu, .44 * uu * backOut(seg(t, 20.5, 20.8)), { s: 1, sl: 0, key: 'eye' + sd });
      }
    };
    withPal(0, () => clawd(0, 380, u, { ...m, col: greyOf(PAL.clay), dk: greyOf(PAL.clayDk), lt: greyOf('#F5B394'), tint: null, boilKey: 'R', draw: glints }));
    camEnd();
  }
  function appleIris(sx, sy, r) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], greyOf(PAL.ink), r < 3 ? null : applePts(sx, sy, r, 48));
  }

  // ---------- shots ----------
  const ECU_Z = 7.0;
  // A 0–3.0: the drawn apple under the magnifier; pull back: a grey Clawd, reading
  function shotA(t) {
    const c0 = camAt(DRAWN, [0, 0], ECU_Z), c1 = [334, 1478, 2.05];
    const c = t < 1.2 ? camAt(DRAWN, [0, 0], ECU_Z * (1 - .05 * t)) : camPath(DRAWN, camAt(DRAWN, [0, 0], ECU_Z * .94), [c1[0] + 4 * (t - 2.3), c1[1], c1[2]], ease(seg(t, 1.2, 2.3)));
    roomFrame(t, t, c);
    if (t < .55) appleIris(...scr(DRAWN, c0), lerp(0, 1500, easeIn(t / .55)));
  }
  // B 3.0–6.5: page after page, a hard cut in the middle of every page turn
  const BCAM = [[330, 1522, 2.9, 0], [318, 1528, 3.05, .012], [342, 1518, 2.95, -.012]];
  function shotB(t) {
    const cuts = FLIPS.map(f => f + FLIP_D / 2), i = t < cuts[1] ? 0 : t < cuts[2] ? 1 : 2, lt = t - cuts[i], [x, y, z, r] = BCAM[i];
    roomFrame(t, t, [x + (i - 1) * 6 * lt, y - 3 * lt, z * (1 + .03 * lt), r]);
  }
  // C 6.5–11.6 and D 11.6–16.0: the prism; the pull back to the whole grey room; the light at the door
  const MED = [372, 1395, 1.95], FANC = [545, 1335, 1.4], PROUD = [360, 1400, 1.85], DOORC = [735, 1430, 1.3];
  function camCD(t) {
    const m = t2 => [MED[0] + 8 * (t2 - 6.5), MED[1] - 6 * (t2 - 6.5), MED[2] * (1 + .01 * (t2 - 6.5))];
    if (t < 7.8) return m(t);
    if (t < 10.1) return mixCam(m(7.8), [FANC[0] + 4 * (t - 7.8), FANC[1], FANC[2]], ease(seg(t, 7.8, 8.9)));
    const f = [FANC[0] + 9.2, FANC[1], FANC[2]];
    if (t < 11.2) return mixCam(f, PROUD, ease(seg(t, 10.1, 10.8)));
    if (t < 12.6) return mixCam(PROUD, WIDE, ease(seg(t, 11.2, 12.5)));
    const w = [WIDE[0], WIDE[1] - 3 * (t - 12.6), WIDE[2] * (1 + .012 * (t - 12.6))];
    if (t < 13.9) return w;
    return mixCam([WIDE[0], WIDE[1] - 3.9, WIDE[2] * 1.0156], DOORC, ease(seg(t, 13.9, 15.9)));
  }
  function shotC(t) { roomFrame(t, t, camCD(t)); }
  // E 16.0–20.4: over the shoulder: the door swings open; the one red apple; push in and hold
  function camE(t) {
    const ots = [768, 1410, 1.5];
    if (t < 17.9) return [ots[0], ots[1] - 4 * (t - 16), ots[2] * (1 + .03 * (t - 16))];
    const c0 = [ots[0], ots[1] - 7.6, ots[2] * 1.057];
    if (t < 19.7) return camPath(APPLE_RM, c0, camAt(APPLE_RM, [0, 0], A_Z), ease(seg(t, 17.9, 19.7)));
    return camAt(APPLE_RM, [0, 0], A_Z * (1 + .025 * (t - 19.7)));
  }
  function shotE(t) { roomFrame(t, t, camE(t)); }
  function shotRev(t) { reverseFrame(t); }
  // F 21.8–27.4: the apple pulses; the colour runs out from it, through the garden, the door, Clawd, the room
  function shotF(t) { roomFrame(t, t, camF(t)); }
  // G 27.4–32.0 and H 32.0–36.0: the garden in colour; crane up to the apple; match cut to the drawn one; iris
  const GCAM = [260, 1290, 1.02];
  function camG(t) {
    if (t < 28.6) return [lerp(GCAM[0], 470, ease(seg(t, 27.4, 28.6))), GCAM[1], GCAM[2]];
    const c = [470, lerp(1290, 1250, seg(t, 28.6, 31)), lerp(1.02, 1.12, seg(t, 28.6, 31))];
    if (t < 31.0) return c;
    const cEnd = camAt(APPLE_G, [0, 0], 6.3);
    if (t < 33.4) return camPath(APPLE_G, [470, 1250, 1.12], cEnd, ease(seg(t, 31.0, 33.4)));
    return camAt(APPLE_G, [0, 0], 6.3 * (1 + .025 * (t - 33.4)));
  }
  function shotG(t) {
    if (t < LOOP) return gardenFrame(t, t, camG(t));
    // back in the book, grey: the loop starts again
    const c = camAt(DRAWN, [0, 0], lerp(ECU_Z * .975, ECU_Z, seg(t, LOOP, DUR)));
    roomFrame(t, story(t), c);
    if (t > 35.25) appleIris(...scr(DRAWN, c), lerp(1500, 0, easeIn(seg(t, 35.25, 35.95))));
  }

  shots([[0, shotA], [FLIPS[0] + FLIP_D / 2, shotB], [6.5, shotC], [16.0, shotE], [REV[0], shotRev], [REV[1], shotF], [27.4, shotG]]);
})();
