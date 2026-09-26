// schroedinger.js: "Schrödingers Katze", 32 s, 9:16. The storyboard is STORYBOARD_schroedinger.md.
// One room, one box, one cat, one clock. The lid's angle, where the cat is and how see-through the box is are pure
// functions of video time t; the shots only choose the camera and the transitions.
(() => {
  // ---------- world ----------
  const GY = 1500, FAR = GY - 110;                         // where things stand; where the wall meets the floor
  const BX = 700, BW = 460, BH = 220, BTOP = GY - BH, BL = BX - BW / 2, BR = BX + BW / 2;   // the box
  const LT = 30, LL = BW + 24, PV = [BR + 12, BTOP];       // the lid: thickness, length, hinge at its bottom-right corner
  const CX = 250, U = 34;                                  // Clawd
  const S = 32, CATX = BX + 120, SITY = GY - 12, PEEKY = 1352;   // the cat: size, its spot in the box, sitting / peeking
  const GHOSTY = 1185;                                     // the ghost's tail tip when it floats above the lid
  const LAMPX = 640, LAMPY = 905;
  const WALL = ['#2C2952', '#353167', '#403C76'], FLOOR = '#8A5E42', FLOOR2 = '#7A5239', BOARD = '#6A442F', RUG = '#A24E68';
  const WOOD = { face: '#D9A866', bat: '#BE8A4C', line: '#8A5A30', lid: '#C8904F', lidTop: '#E3BB7C', inside: '#3E2618', back: '#8A5C34' };
  const CATC = { body: '#C4C8D4', stripe: '#6F7690', light: '#F2ECE0', pink: '#E88FA0', ink: PAL.ink };
  const GHOST = { body: '#E6F2F4', stripe: '#BFD2DC', light: '#FFFFFF', pink: '#F3C3CE', ink: '#7D93AE' };
  const XR = { panel: '#163247', grid: '#2A5872', line: '#D6FBF6', dark: '#1F4A5E', lite: '#BFF1EC', glow: '#6FE3DC' };
  const SPC = { panel: '#2A2150', grid: '#4A3B84', line: '#E6DAFF', dark: '#3B2F6E', lite: '#D9CCFF', glow: '#B69CFF' };
  const ATOM = '#C6F57A', HALO = '#EDBE4A';

  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  // flat colour for the big backgrounds, the flash and the iris (huge washes are slow on software WebGL)
  function flat(P, col, hole = null, a = 1) {
    const c = color(col); c.setAlpha(255 * a);
    noStroke(); fill(c); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const lum = c => { const p = parseInt(c.slice(1), 16); return (.3 * (p >> 16 & 255) + .59 * (p >> 8 & 255) + .11 * (p & 255)) / 255; };
  const closed = P => P.concat([P[0]]);
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0); o.dx = (m.dx || 0) + (p.dx || 0);
    return o;
  }
  // Where an arm's tip lands, replicating clawd()'s transforms (as in theseus.js), so the hand touches the lid.
  function armTip(x, y, u, o, which = 'R') {
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
  const sparkle = (x, y, r, k, col = '#FFF5E2') => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, washOp: 255 * (1 - k * k), ink: null }); };

  // ---------- the cat ----------
  // Colours for a look: the real cat, the ghost, the x-ray negative; a < 1 fades it toward the colour behind it.
  function catCols(kind, a = 1, bg = null) {
    let C = kind === 'ghost' ? GHOST : CATC;
    if (kind === 'xr' || kind === 'sp') {
      const P = kind === 'xr' ? XR : SPC, m = c => mixCol(P.dark, P.lite, clamp(lum(c) * 1.15));
      C = { body: m(CATC.body), stripe: m(CATC.stripe), light: m(CATC.light), pink: m(CATC.pink), ink: P.line };
    }
    if (bg && a < 1) { const o = {}; for (const k in C) o[k] = mixCol(bg, C[k], a); C = o; }
    return C;
  }
  // The head: one outline with both ears in it, inner ears, muzzle, the tabby "M", face.
  function catHead(hx, hy, s, o, C, sw, op) {
    const ear = o.ear ?? 1, spread = .62 + (1 - ear) * .5, E = [-Math.PI / 2 - spread, -Math.PI / 2 + spread], eh = .3 + .5 * ear, ew = .36;
    const rx = 1.2, ry = 1.0;
    const bump = a => { let k = 1; for (const e of E) { const d = Math.abs(Math.atan2(Math.sin(a - e), Math.cos(a - e))); k += eh * Math.max(0, 1 - d / ew); } return k; };
    const A = []; for (let i = 0; i < 40; i++) A.push(-Math.PI + i / 40 * TAU); A.push(...E); A.sort((p, q) => p - q);
    const at = (a, r) => [(hx + Math.cos(a) * rx * r) * s, (hy + Math.sin(a) * ry * r) * s];
    paint(A.map(a => at(a, bump(a))), { wash: C.body, washOp: op, ink: C.ink, sw });
    for (const e of E) paint([at(e, 1 + eh * .72), at(e - .19, 1.0), at(e + .19, 1.0)], { wash: C.pink, washOp: op, ink: null });
    const fx = hx + .1, P = pts => pts.map(([a, b]) => [a * s, b * s]);
    paint(ellPts(fx * s, (hy + .42) * s, .46 * s, .28 * s, 14), { wash: C.light, washOp: op, ink: null });
    for (const d of [-.34, 0, .34]) inkLine(P([[hx + d, hy - .93 + Math.abs(d) * .3], [hx + d * .85, hy - .68]]), sw * .75, C.stripe, 'ink', 0);
    // eyes
    const lx = (o.lookX || 0) * .09, ly = (o.lookY || 0) * .09, ey = hy - .04;
    let kinds = o.eyes === 'wink' ? ['open', 'happy'] : [o.eyes || 'open', o.eyes || 'open'];
    if (((T * .8 + (o.seed || 0)) % 2.9) < .11) kinds = kinds.map(k => k === 'open' ? 'closed' : k);
    kinds.forEach((kd, i) => {
      const ex = fx + (i ? .44 : -.44);
      if (kd === 'open') {
        paint(ellPts((ex + lx) * s, (ey + ly) * s, .17 * s, .25 * s, 12), { wash: C.ink, washOp: op, ink: null });
        paint(ellPts((ex + lx - .05) * s, (ey + ly - .09) * s, .06 * s, .07 * s, 8), { wash: C.light, washOp: op, ink: null });
      } else if (kd === 'wide') {
        paint(ellPts(ex * s, ey * s, .25 * s, .31 * s, 14), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .6 });
        paint(ellPts((ex + lx * 1.3) * s, (ey + ly * 1.3) * s, .11 * s, .17 * s, 10), { wash: C.ink, washOp: op, ink: null });
      } else if (kd === 'happy') inkLine(P([[ex - .19, ey + .08], [ex, ey - .13], [ex + .19, ey + .08]]), sw * 1.1, C.ink, 'ink', .5);
      else inkLine(P([[ex - .19, ey - .03], [ex, ey + .1], [ex + .19, ey - .03]]), sw * 1.1, C.ink, 'ink', .5);
    });
    if (o.blush) for (const d of [-.72, .72]) paint(ellPts((fx + d) * s, (hy + .3) * s, .2 * s, .1 * s, 10), { wash: C.pink, washOp: op * o.blush, ink: null });
    paint(P([[fx - .1, hy + .24], [fx + .1, hy + .24], [fx, hy + .34]]), { wash: C.pink, washOp: op, ink: null });
    const m = o.mouth || 'w';
    if (m === 'open') {
      paint(ellPts(fx * s, (hy + .55) * s, .15 * s, .15 * s, 12), { wash: mixCol('#4A1F2A', C.body, op < 255 ? .4 : 0), washOp: op, ink: C.ink, sw: sw * .4 });
    } else {
      inkLine(P([[fx - .2, hy + .45], [fx - .1, hy + .5], [fx, hy + .42], [fx + .1, hy + .5], [fx + .2, hy + .45]]), sw * .45, C.ink, 'inkfine', .5);
      if (m === 'tongue') paint(ellPts((fx + .06) * s, (hy + .6) * s, .09 * s, .11 * s, 10), { wash: C.pink, washOp: op, ink: C.ink, sw: sw * .35 });
    }
    for (const sd of [-1, 1]) for (const k of [0, 1]) inkLine(P([[fx + sd * .5, hy + .36 + k * .12], [fx + sd * 1.45, hy + .24 + k * .32]]), sw * .35, C.ink, 'inkfine', .3);
  }
  // cat(x, y, s, o): (x, y) is the ground point under the body (the body centre for 'leap'); s is the size unit.
  // o: pose (sit | leap | loaf | ghost), flip, rot, sq, sx, eyes (open wide happy closed wink), lookX/Y, mouth (w, open,
  // tongue), ear (1 up .. 0 flat), paw (raised paw angle, or null), wag (tail phase), blush, cols, op (wash opacity), key.
  function cat(x, y, s, o = {}) {
    const C = o.cols || CATC, op = o.op ?? 255, sw = (o.sw ?? 1) * clamp(s / 24, .45, 1.5), key = o.key || 'cat';
    const P = pts => pts.map(([a, b]) => [a * s, b * s]), fillPx = (pts, col, inkOn = true) => paint(pts, { wash: col, washOp: op, ink: inkOn ? C.ink : null, sw });
    const pose = o.pose || 'sit', w = Math.sin(o.wag ?? T * 3), sq = o.sq || 0;
    push(); translate(x, y); if (o.rot) rotate(o.rot); scale((o.flip ? -1 : 1) * (1 + sq * .5) * (o.sx ?? 1), (1 - sq) * (o.sy ?? 1));
    let hx = .32, hy = -3.45;
    if (pose === 'sit') {
      boilSeed(key + 't');
      fillPx(ribbon(P([[-.95, -.3], [-1.75, -.2], [-2.15, -.85], [-2.0 + .15 * w, -1.65], [-1.6 + .35 * w, -2.05 - .1 * w]]), .48 * s, .26 * s), C.body);
      boilSeed(key + 'b');
      fillPx(through(P([[-.1, .02], [-1.15, 0], [-1.32, -.75], [-1.12, -1.65], [-.62, -2.4], [.05, -2.8], [.7, -2.62], [1.02, -1.95], [1.1, -1.1], [1.18, -.35], [.95, 0], [-.1, .02]]), 4), C.body);
      paint(ellPts(.55 * s, -1.25 * s, .42 * s, .85 * s, 16), { wash: C.light, washOp: op, ink: null });
      for (let k = 0; k < 3; k++) inkLine(P([[-1.26, -.72 - .48 * k], [-.9, -.64 - .48 * k]]), sw * 1.6, C.stripe, 'ink', 0);
      boilSeed(key + 'p');
      if (o.paw != null) {
        const pa = o.paw, tip = [.8 + .95 * Math.cos(pa), -1.95 - .95 * Math.sin(pa)];
        fillPx(ribbon(P([[.8, -1.95], [(.8 + tip[0]) / 2, (-1.95 + tip[1]) / 2 - .05], tip]), .38 * s, .34 * s), C.body);
        paint(ellPts(tip[0] * s, tip[1] * s, .22 * s, .2 * s, 12), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .7 });
        paint(ellPts(.32 * s, -.12 * s, .28 * s, .16 * s, 12), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .7 });
      } else for (const px of [.32, .92]) paint(ellPts(px * s, -.12 * s, .28 * s, .16 * s, 12), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .7 });
    } else if (pose === 'leap') {
      hx = 1.85; hy = -.55;
      const far = mixCol(C.body, C.stripe, .35);
      boilSeed(key + 'lg');
      for (const [pts, col] of [[[[-.9, .3], [-1.6, .8], [-2.2, 1.0]], far], [[[.8, .3], [1.4, .8], [2.0, .95]], far], [[[-1.1, .2], [-1.9, .55], [-2.5, .62]], C.body], [[[1.0, .2], [1.7, .55], [2.3, .5]], C.body]])
        fillPx(ribbon(P(pts), .42 * s, .3 * s), col);
      boilSeed(key + 't');
      fillPx(ribbon(P([[-1.45, -.1], [-2.3, -.45], [-3.0, -.35 + .2 * w], [-3.5, -.65 + .3 * w]]), .45 * s, .25 * s), C.body);
      boilSeed(key + 'b');
      fillPx(through(P([[0, .52], [-1.0, .5], [-1.6, .2], [-1.55, -.3], [-.9, -.62], [.2, -.7], [1.1, -.55], [1.55, -.1], [1.35, .38], [.6, .55], [0, .52]]), 4), C.body);
      paint(ellPts(.3 * s, .28 * s, .8 * s, .2 * s, 14), { wash: C.light, washOp: op, ink: null });
      for (let k = 0; k < 3; k++) inkLine(P([[-1.0 + .5 * k, -.6], [-.9 + .5 * k, -.28]]), sw * 1.6, C.stripe, 'ink', 0);
    } else if (pose === 'loaf') {
      hx = 1.5; hy = -1.6;
      boilSeed(key + 't');
      fillPx(ribbon(P([[-1.55, -.5], [-2.1, -.15], [-2.25, .55], [-2.1 + .12 * w, 1.25], [-1.85 + .2 * w, 1.7]]), .45 * s, .28 * s), C.body);
      boilSeed(key + 'b');
      fillPx(through(P([[0, .02], [-1.7, 0], [-1.95, -.55], [-1.55, -1.15], [-.6, -1.45], [.5, -1.45], [1.3, -1.15], [1.7, -.5], [1.6, 0], [0, .02]]), 4), C.body);
      for (let k = 0; k < 3; k++) inkLine(P([[-1.25 + .55 * k, -1.36], [-1.15 + .55 * k, -.98]]), sw * 1.6, C.stripe, 'ink', 0);
      for (const px of [.95, 1.5]) paint(ellPts(px * s, -.1 * s, .26 * s, .15 * s, 12), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .7 });
    } else if (pose === 'ghost') {
      const fl = Math.sin(T * 7);
      boilSeed(key + 'w');
      for (const sd of [-1, 1]) {
        const bx = sd < 0 ? -.45 : 1.05, by = -2.35;
        fillPx(through(P([[bx, by + .3], [bx + sd * .9, by - .75 - .18 * fl], [bx + sd * 1.3, by - .15], [bx + sd * .95, by + .3], [bx + sd * .3, by + .45], [bx, by + .3]]), 3), C.light);
      }
      boilSeed(key + 'b');
      fillPx(ribbon(P([[.3, -2.75], [.2, -1.9], [.4 + .15 * w, -1.0], [.15 + .2 * Math.sin(T * 3 + 1), -.2], [.4 + .18 * Math.sin(T * 3 + 2), .55]]), 2.1 * s, .12 * s), C.body);
      for (const px of [-.1, .7]) paint(ellPts(px * s, -2.02 * s, .2 * s, .14 * s, 10), { wash: C.light, washOp: op, ink: C.ink, sw: sw * .6 });
    }
    boilSeed(key + 'h');
    catHead(hx, hy, s, o, C, sw, op);
    if (o.halo) {
      boilSeed(key + 'halo');
      const hb = hy - 1.9 + .06 * Math.sin(T * 4);
      glow(hx * s, hb * s, 2.6 * s, '#FFE08A', .6 * o.halo);
      paint(ellPts(hx * s, hb * s, .9 * s, .27 * s, 24), { ink: mixCol(o.haloBg || C.body, HALO, o.halo), sw: sw * 1.1 });
    }
    pop();
  }
  // head centre of a sitting cat, relative to its ground point
  const HEAD = [.32 + .1, -3.45];

  // ---------- the clock ----------
  const SLAMS = [.95, 28.75], THUMPS = [3.3, 30.25];
  const slamBounce = t => SLAMS.reduce((a, t0) => a + (t > t0 ? .085 * Math.abs(spring(t, t0, 7, 24)) : 0), 0);
  const thump = t => THUMPS.reduce((a, t0) => a + kf(t, [[t0 - .02, 0], [t0 + .07, .07], [t0 + .18, 0], [t0 + .25, .02], [t0 + .32, 0]]), 0);
  // the box squashes a little on slams, thumps and landings
  const jig = t => [...SLAMS, ...THUMPS, 26.8].reduce((a, t0) => a + (t > t0 ? .03 * Math.exp(-(t - t0) * 9) * Math.cos((t - t0) * 30) : 0), 0);
  // Clawd's hand under the lid while he opens it
  const REACH = [18.45, 20.3], STEP = 1.2;
  function lidAt(t, hand) {
    if (t < SLAMS[0]) return t < .45 ? 1.52 + .03 * Math.sin(t * 9) : t < .62 ? lerp(1.52, 1.36, ease(seg(t, .45, .62))) : lerp(1.36, 0, easeIn(seg(t, .62, SLAMS[0])));
    if (t < 19.3) return slamBounce(t) + thump(t);
    if (t < 20.3) {
      let a = t < 19.8 ? kf(t, [[19.35, 0], [19.55, .045], [19.8, .03]]) : lerp(.03, 2.02, easeOut(seg(t, 19.8, 20.05))) - .1 * spring(t, 20.05, 5, 16);
      if (hand && t < 19.95) a = Math.max(a, Math.atan2(PV[1] - hand[1] - 4, PV[0] - hand[0]));
      return a;
    }
    if (t < 26.8) return 1.92 - .1 * spring(t, 20.05, 5, 16);
    if (t < 28.2) return lerp(1.92, 1.63, ease(seg(t, 26.95, 27.6))) + .1 * spring(t, 26.8, 4, 15);
    if (t < SLAMS[1]) return t < 28.45 ? kf(t, [[28.2, 1.63], [28.3, 1.67], [28.45, 1.5]]) : lerp(1.5, 0, easeIn(seg(t, 28.45, SLAMS[1])));
    return slamBounce(t) + thump(t);
  }
  // the see-through views: x-ray (5.0–10.5) and the violet "both" view (10.7–19.85); f = how much of the front is see-through
  const COLLAPSE = 19.85;
  function viewAt(t) {
    if (t >= 5.0 && t < 10.5) return { P: XR, kind: 'xr', f: t < 5.8 ? ease(seg(t, 5.0, 5.8)) : 1 - ease(seg(t, 9.9, 10.5)) };
    if (t >= 10.7 && t < COLLAPSE) return { P: SPC, kind: 'sp', f: ease(seg(t, 10.7, 11.4)) };
    return null;
  }
  // the atom flares: twice in the x-ray, and at random in the "both" view
  const flare = t => [8.25, 8.95, 9.4].reduce((a, t0, i) => Math.max(a, t > t0 - .05 ? (i === 2 ? .45 : 1) * Math.exp(-Math.max(0, t - t0) * 7) * seg(t, t0 - .05, t0) : 0), 0) + (t > 10.7 && hash(Math.floor(t * 12) * 1.3) > .8 ? .5 : 0);

  // ---------- Clawd ----------
  const MOOD = [
    [0, 'neutral', { lookX: .9 }], [3.38, 'surprised', { lookX: .9 }], [3.95, 'confused', { lookX: .9 }], [4.45, 'thinking', { lookX: .9, lookY: .3 }],
    [15.55, 'confused', { lookY: -1 }], [16.25, 'dizzy'],
    [17.95, 'determined', { lookX: .9, lookY: -.2 }], [18.95, 'nervous', { lookX: .9, lookY: -.3 }], [19.9, 'surprised', { lookX: .9, lookY: -.2 }],
    [21.0, 'happy', { lookX: .9 }], [22.6, 'surprised', { lookY: -1, lookX: .2, emote: '!' }], [23.4, 'love'], [25.45, 'happy', { lookY: -1, lookX: .4 }],
    [26.35, 'excited', { lookX: .9 }],
  ];
  // the thought bubble swaps between the two cats, faster and faster
  const swapN = t => { const u = Math.max(0, t - 14.95); return Math.floor(2 * u + 2.6 * u * u); };
  function clawdAt(t) {
    const m = emotions(t, MOOD), p = {};
    if (t > 4.3 && t < 10.8) p.dx = .3 * ease(seg(t, 4.3, 4.8)) * (1 - ease(seg(t, 4.9, 5.3)));
    if (t > 17.95) { const k = seg(t, 18.0, 18.5); p.dx = STEP * ease(k); if (k > 0 && k < 1) { p.walk = STEP * ease(k) / 4 * 1.6; p.view = 'q'; } }
    if (t >= 14.5 && t < 16.25) { p.lookY = -1; p.lookX = swapN(t) % 2 ? .75 : -.45; if (t < 15.55) p.emote = null; }
    if (t > REACH[0] && t < REACH[1]) {
      p.aR = kf(t, [[REACH[0], m.aR ?? .2], [19.2, .92], [19.8, .98], [19.95, 1.6], [REACH[1], m.aR ?? 1.1]]) + (t > 19.2 && t < 19.8 ? .03 * Math.sin(t * 60) : 0);
      const lean = ease(seg(t, 18.45, 19.1)) * (1 - ease(seg(t, 20.0, 20.3)));
      p.dx = STEP + .28 * lean; p.dy = -.35 * lean; p.rot = .05 * lean;
    }
    return merge(m, p);
  }
  // the top of Clawd's head in the world, for the cat hat
  function headTop(o) { const h = 8 * U * (1 - (o.sq || 0)), r = o.rot || 0, x = CX + (o.dx || 0) * U, y = GY + (o.dy || 0) * U; return [x + h * Math.sin(r), y - h * Math.cos(r), r]; }

  // ---------- the cat's clock ----------
  const LEAP1 = [21.9, 22.55], LEAP2 = [26.2, 26.8];
  function leapRot(p0, p1, h, k, flip) {
    const vx = p1[0] - p0[0], vy = (p1[1] - p0[1]) - h * 4 * (1 - 2 * k);
    return .7 * (flip ? Math.atan2(-vy, -vx) : Math.atan2(vy, vx));
  }
  // The real cat (not the see-through views): { x, y, o, where: 'in' (behind the box front) | 'out', peek }
  function catAt(t, co) {
    if (t < SLAMS[0]) {
      const duck = easeIn(seg(t, .7, .9)), up = t > .42;
      return { x: CATX, y: lerp(PEEKY, SITY, duck), where: 'in', peek: duck < .35,
        o: { pose: 'sit', eyes: up ? 'wide' : 'open', lookY: up ? -1 : 0, ear: 1 - .7 * duck, mouth: up ? 'open' : 'w' } };
    }
    if (t < COLLAPSE) return null;
    if (t < LEAP1[0]) {   // pops up, alive; looks at Clawd; crouches
      const rise = backOut(seg(t, 19.95, 20.3)), cr = ease(seg(t, LEAP1[0] - .3, LEAP1[0]));
      return { x: CATX, y: lerp(SITY, PEEKY, rise) + 14 * cr, where: 'in', peek: rise > .6,
        o: { pose: 'sit', flip: t > 20.95, eyes: t < 20.55 ? 'happy' : 'open', lookX: t < 20.95 ? 0 : -1, mouth: t < 20.55 ? 'open' : 'w', sq: .22 * cr - .08 * spring(t, 20.3, 6, 18), ear: 1 - .4 * cr } };
    }
    const top = headTop(co);
    if (t < LEAP1[1]) {
      const k = seg(t, ...LEAP1), p0 = [CATX, PEEKY - 1.6 * S], p1 = [top[0] + 4, top[1] - .72 * S], h = 175;
      const [x, y] = arcPt(p0, p1, h, k);
      return { x, y, where: k < .12 ? 'in' : 'out', o: { pose: 'leap', flip: true, rot: leapRot(p0, p1, h, k, true), sx: 1 + .12 * Math.sin(Math.PI * k), eyes: 'wide', ear: .6 } };
    }
    if (t < LEAP2[0]) {   // the hat
      const land = t - LEAP1[1], cr = ease(seg(t, 25.95, LEAP2[0])), turned = t > 25.95;
      const eyes = t < 23.1 ? 'wide' : t < 25.2 ? 'closed' : 'open';
      return { x: top[0] + (turned ? -4 : 4), y: top[1] + 2, where: 'out',
        o: { pose: 'loaf', flip: !turned, rot: top[2], sq: .25 * Math.exp(-land * 7) * Math.cos(land * 18) + .2 * cr, eyes, lookX: t > 25.2 ? 1 : 0, blush: t > 23.1 && t < 25.2 ? .8 : 0, ear: t < 25.2 ? .75 : 1, wag: t * 1.5 } };
    }
    if (t < LEAP2[1]) {
      const k = seg(t, ...LEAP2), p0 = [top[0], top[1] - .72 * S], p1 = [CATX, GY - 40], h = 190;
      const [x, y] = arcPt(p0, p1, h, k);
      return { x, y, where: k > .72 ? 'in' : 'out', o: { pose: 'leap', rot: leapRot(p0, p1, h, k, false), sx: 1 + .12 * Math.sin(Math.PI * k), eyes: 'happy', ear: .7 } };
    }
    if (t < 27.05) return null;
    if (t < SLAMS[1]) {
      const rise = backOut(seg(t, 27.05, 27.4)), duck = easeIn(seg(t, 28.5, 28.7)), wink = t > 27.7 && t < 28.15, up = t > 28.2;
      return { x: CATX, y: lerp(SITY, PEEKY, rise) + lerp(0, SITY - PEEKY, duck), where: 'in', peek: rise > .6 && duck < .35,
        o: { pose: 'sit', eyes: wink ? 'wink' : up ? 'wide' : 'open', mouth: wink ? 'tongue' : up ? 'open' : 'w', lookY: up ? -1 : 0, ear: 1 - .7 * duck } };
    }
    return null;
  }

  // ---------- set pieces ----------
  function room(t) {
    const { x0, x1, y0, y1 } = VIEW, m = 100, X0 = x0 - m, X1 = x1 + m, st = 120, xs = Math.floor(X0 / st) * st, xe = Math.ceil((X1 + st) / st) * st;
    const band = (ya, yb, col, ph) => {
      if (yb < y0 - m || ya > y1 + m) return;
      const P = []; for (let x = xs; x <= xe; x += st) P.push([x, ya + (ph ? 9 * Math.sin(x * .006 + ph) : 0)]);
      for (let x = xe; x >= xs; x -= st) P.push([x, yb]);
      flat(P, col);
    };
    band(Math.min(y0 - m, 200), FAR - 620, WALL[0], 0);
    band(FAR - 640, FAR - 300, WALL[1], 1);
    band(FAR - 320, FAR, WALL[2], 2);
    band(FAR - 26, FAR + 2, '#241F44', 0);
    if (y1 > FAR) { band(FAR, y1 + m, FLOOR, 0); if (y1 > GY + 120) band(GY + 120, y1 + m, FLOOR2, 0); }
    // floor boards
    [FAR + 34, FAR + 80, FAR + 138, GY + 60, GY + 170, GY + 320].forEach((fy, i) => {
      if (fy < y0 - 20 || fy > y1 + 20) return;
      for (let x = xs; x < xe; x += 480) { boilSeed('board' + i + '_' + x); inkLine([[x, fy], [x + 490, fy + 2]], .8, BOARD, 'inkfine', 0); }
    });
    // the window, with the moon
    const wx = 60, wy = FAR - 590, ww = 190, wh = 240;
    if (wx + ww > x0 - 50 && wy + wh > y0 - 50 && wx < x1 + 50) {
      boilSeed('window');
      paint(rrPts(wx - 14, wy - 14, ww + 28, wh + 28, 16, 1), { wash: '#57497F', ink: PAL.ink, sw: 1 });
      paint(rrPts(wx, wy, ww, wh, 10, 1), { wash: '#191C42', ink: PAL.ink, sw: .8 });
      glow(wx + 150, wy + 80, 150, '#FFF1C4', .5);
      paint(ellPts(wx + 150, wy + 80, 34, 34, 20), { wash: '#FFF1C4', ink: null });
      paint(ellPts(wx + 164, wy + 70, 30, 30, 20), { wash: '#191C42', ink: null });
      for (let i = 0; i < 4; i++) { const tw = .8 + .3 * Math.sin(t * 3 + i * 2); paint(starPts(wx + 30 + hash(i + 4) * 170, wy + 30 + hash(i + 9) * 200, 7 * tw, .35, 4), { wash: '#FFF5E2', ink: null }); }
      inkLine([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 3, '#57497F', 'ink', 0);
      inkLine([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]], 3, '#57497F', 'ink', 0);
    }
    // the rug and the light pool
    boilSeed('rug');
    paint(ellPts(560, GY + 14, 500, 58, 36, 1.5), { wash: RUG, ink: null });
    inkLine(closed(ellPts(560, GY + 14, 450, 42, 30)), 1, '#C9788E', 'inkfine', .5);
    glow(LAMPX, GY - 60, 560, '#FFC98A', .28);
    // the lamp, swinging a little after each slam
    const sw = .05 * ring(t, SLAMS, 2.2, 5.5) + .01 * Math.sin(t * 1.3), top = Math.min(y0 - 40, LAMPY - 200);
    push(); translate(LAMPX, top); rotate(sw);
    const L = LAMPY - top;
    boilSeed('cord'); inkLine([[0, 0], [0, L]], 1.4, PAL.ink, 'ink', 0);
    glow(0, L + 88, 380, '#FFD9A0', .55);
    boilSeed('lamp');
    paint(ellPts(0, L + 84, 22, 20, 14), { wash: '#FFF1C4', ink: null });
    paint([[-26, L], [26, L], [80, L + 78], [-80, L + 78]], { wash: PAL.ochre, ink: PAL.ink, sw: 1 });
    inkLine([[-70, L + 70], [70, L + 70]], .8, '#B97D22', 'inkfine', 0);
    pop();
  }
  // the box's inside, seen when the lid is up: the back wall's rim and the dark inside
  function boxBack(open) {
    if (open < .03) return;
    boilSeed('boxback');
    paint(rectPts(BL + 16, BTOP - 24, BW - 10, 36, .8), { wash: WOOD.back, ink: PAL.ink, sw: .9 });
    paint(rectPts(BL + 16, BTOP - 6, BW - 18, 10, 0), { wash: WOOD.inside, ink: null });
  }
  function boxFront() {
    boilSeed('boxfront');
    paint(rectPts(BL, BTOP, BW, BH, .8), { wash: WOOD.face, ink: null });
    for (const x of [BL, BR - 34]) paint(rectPts(x, BTOP, 34, BH, .6), { wash: WOOD.bat, ink: null });
    for (const k of [1, 2]) inkLine([[BL + 34, BTOP + k * BH / 3], [BR - 34, BTOP + k * BH / 3 + 2]], .9, WOOD.line, 'inkfine', 0);
    for (const [x, y] of [[BL + 17, BTOP + 18], [BL + 17, GY - 18], [BR - 17, BTOP + 18], [BR - 17, GY - 18]]) paint(ellPts(x, y, 4, 4, 8), { wash: '#6B4A2E', ink: null });
    for (let i = 0; i < 4; i++) inkLine([[BL + 70 + i * 90, BTOP + 30 + (i % 2) * 90], [BL + 120 + i * 90, BTOP + 34 + (i % 2) * 90]], .6, '#B98548', 'inkfine', .3);
    paint(rectPts(BL, BTOP, BW, BH, .8), { ink: PAL.ink, sw: 1.3 });
  }
  // the see-through front: the panel covers the front from the top down to the scan line
  function panel(t, M) {
    const P = M.P, f = M.f, y = BTOP + BH * f;
    boilSeed('panel');
    paint(rectPts(BL + 3, BTOP + 3, BW - 6, (BH - 6) * f, 0), { wash: P.panel, ink: null });
    for (let x = BL + 46; x < BR - 20; x += 46) inkLine([[x, BTOP + 6], [x, y - 4]], .5, P.grid, 'inkfine', 0);
    for (let yy = BTOP + 44; yy < y - 6; yy += 44) inkLine([[BL + 8, yy], [BR - 8, yy]], .5, P.grid, 'inkfine', 0);
    paint(rectPts(BL, BTOP, BW, BH, .8), { ink: mixCol(PAL.ink, P.line, f), sw: 1.3 });
    if (f > 0 && f < 1) {   // the scan line
      glow(BX, y, 300, P.glow, .9);
      boilSeed('scan');
      inkLine([[BL - 12, y], [BR + 12, y + 1]], 3, P.line, 'ink', 0);
    }
  }
  // the contraption inside: the atom under a bell jar, a wire, a hammer over a flask
  const JAR = [BL + 95, GY - 14], POST = [BL + 190, GY - 12], HAMP = [BL + 190, GY - 128], FLASK = [BL + 252, GY - 14];
  function apparatus(t, M, a, fl) {
    if (a <= .02) return;
    const P = M.P, ln = mixCol(P.panel, P.line, a), mid = mixCol(P.panel, P.grid, a), ax = JAR[0], ay = JAR[1] - 50;
    boilSeed('jar');
    paint(rectPts(ax - 38, JAR[1] - 8, 76, 14, .5), { wash: mid, ink: ln, sw: .8 });
    inkLine(through([[ax - 30, JAR[1] - 8], [ax - 31, ay - 8], [ax - 20, ay - 34], [ax, ay - 42], [ax + 20, ay - 34], [ax + 31, ay - 8], [ax + 30, JAR[1] - 8]], 4), 1.1, ln, 'inkfine', .3);
    glow(ax, ay, 80 + 90 * fl, ATOM, a * (.5 + .5 * fl));
    boilSeed('atom');
    const oc = mixCol(P.panel, ATOM, a);
    for (const r of [.6, -.6]) inkLine(closed(ellPts(ax, ay, 25, 8, 16, 0, r)), .8, oc, 'inkfine', .5);
    const j = fl * 3;
    paint(ellPts(ax + jit(j), ay + jit(j), 8 + 3 * fl, 8 + 3 * fl, 12), { wash: mixCol(P.panel, '#F4FFDC', a), ink: null });
    for (let i = 0; i < 2; i++) { const e = t * 5 + i * Math.PI, r = i ? -.6 : .6, ex = Math.cos(e) * 25, ey = Math.sin(e) * 8; paint(ellPts(ax + ex * Math.cos(r) - ey * Math.sin(r), ay + ex * Math.sin(r) + ey * Math.cos(r), 3.2, 3.2, 8), { wash: oc, ink: null }); }
    if (fl > .35) for (let i = 0; i < 5; i++) { const ang = i * TAU / 5 + t * 3; sparkle(ax + Math.cos(ang) * 36 * fl, ay + Math.sin(ang) * 30 * fl, 9, clamp(1 - fl), oc); }
    // wire, post, hammer (it twitches up when the atom flares)
    boilSeed('wire');
    inkLine([[ax + 38, JAR[1] - 2], [POST[0] - 50, JAR[1] - 3], [POST[0] - 20, JAR[1] - 3], [POST[0] - 6, JAR[1] - 12]], 1.3, ln, 'ink', .3);
    paint(rectPts(POST[0] - 5, HAMP[1], 10, POST[1] - HAMP[1], .4), { wash: mid, ink: ln, sw: .7 });
    push(); translate(HAMP[0], HAMP[1]); rotate(-.35 * fl);
    paint(rectPts(0, -4, 60, 8, .3), { wash: mid, ink: ln, sw: .7 });
    paint(rectPts(50, -14, 24, 26, .4), { wash: mixCol(P.panel, P.lite, a * .7), ink: ln, sw: .8 });
    pop();
    paint(ellPts(HAMP[0], HAMP[1], 5, 5, 8), { wash: ln, ink: null });
    boilSeed('flask');
    // the flask's outline: neck, then the round belly from its upper left all the way round to its upper right
    const fx = FLASK[0], fy = FLASK[1], cy = fy - 26, R = 26, th1 = -Math.PI / 2 - Math.asin(8 / R), th2 = -Math.PI / 2 + Math.asin(8 / R) - TAU;
    const F = [[fx - 8, fy - 84]];
    for (let i = 0; i <= 14; i++) { const an = lerp(th1, th2, i / 14); F.push([fx + Math.cos(an) * R, cy + Math.sin(an) * R]); }
    F.push([fx + 8, fy - 84]);
    paint(ellPts(fx, fy - 22, 24, 18, 14), { wash: mixCol(P.panel, '#9B7BD8', a * .8), ink: null });
    paint(F, { ink: ln, sw: .9 });
  }
  function dust(x, y, t0, t, dir) {
    const a = t - t0; if (a < 0 || a > .7) return;
    for (let i = 0; i < 4; i++) {
      const r = (14 + 12 * hash(i + 3)) * (1 + a * 2), d = (30 + 50 * hash(i)) * easeOut(a / .7);
      boilSeed('dust' + dir + i);
      paint(ellPts(x + dir * d, y - 10 - i * 12 * easeOut(a / .7), r, r * .7, 12, 1.5), { wash: '#EFE3CC', washOp: 255 * (1 - a / .7), ink: null });
    }
  }
  // Clawd's thought bubble: the awake cat and the ghost, swapping faster and faster, then a swirl, then pop
  const BUB = [180, 920], BUBT = [14.55, 16.5];
  function bubble(t) {
    const k = backOut(seg(t, BUBT[0], BUBT[0] + .3)), after = t - BUBT[1];
    if (k <= .02) return;
    const [bx, by] = BUB;
    if (after > 0) { if (after < .5) for (let i = 0; i < 8; i++) { const ang = i * TAU / 8; boilSeed('bp' + i); sparkle(bx + Math.cos(ang) * 240 * easeOut(after / .5), by + Math.sin(ang) * 180 * easeOut(after / .5), 26, after / .5); } return; }
    const spin = ease(seg(t, 16.05, BUBT[1]));
    boilSeed('puffs');
    paint(ellPts(CX + 5, 1200, 12 * k, 10 * k, 12), { wash: '#EEE7F6', ink: PAL.ink, sw: .8 });
    paint(ellPts(CX - 12, 1163, 19 * k, 16 * k, 14), { wash: '#EEE7F6', ink: PAL.ink, sw: .8 });
    push(); translate(bx, by); scale(k * (1 + .06 * Math.sin(t * 30) * spin)); rotate(.25 * spin * Math.sin(t * 22));
    boilSeed('bubble');
    const C = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, r = 1 + .09 * Math.abs(Math.sin(a * 3.5)); C.push([Math.cos(a) * 262 * r, Math.sin(a) * 200 * r]); }
    paint(C, { wash: '#EEE7F6', ink: PAL.ink, sw: 1.1 });
    const which = swapN(t) % 2;
    if (spin < .22) {
      if (!which) cat(-50, 135, 40, { pose: 'sit', eyes: 'wink', mouth: 'tongue', paw: 1 + .6 * Math.sin(t * 11), wag: t * 8, key: 'ba' });
      else cat(15, 95, 36, { pose: 'ghost', cols: GHOST, eyes: 'closed', halo: 1, key: 'bg' });
    } else {
      rotate(spin * TAU * 1.5);
      cat(-50, 135, 34, { pose: 'sit', eyes: 'wink', mouth: 'tongue', paw: 1.2, op: 200, key: 'ba' });
      cat(15, 95, 30, { pose: 'ghost', cols: GHOST, eyes: 'closed', halo: 1, op: 200, key: 'bg' });
      const sp = []; for (let i = 0; i < 26; i++) { const a = i * .55, r = 6 + i * 5.5; sp.push([Math.cos(a) * r, Math.sin(a) * r * .8]); }
      boilSeed('swirl'); inkLine(sp, 2.4 * spin, PAL.violet, 'ink', .6);
    }
    pop();
  }

  // ---------- one frame ----------
  function frame(t, c, o = {}) {
    cam(c);
    room(t);
    const co = clawdAt(t);
    const hand = t > REACH[0] && t < REACH[1] ? armTip(CX, GY, U, co, 'R') : null;
    const a = lidAt(t, hand), M = viewAt(t), K = catAt(t, co), J = jig(t);
    // shadow under the box
    boilSeed('boxshadow');
    paint(ellPts(BX + 10, GY + 6, BW * .62, 22, 22), { fill: PAL.ink, fillOp: 90, bleed: .2, tex: .3, border: .1, ink: null });
    push(); translate(BX, GY); scale(1 + J * .6, 1 - J); translate(-BX, -GY);
    boxBack(a);
    if (K && K.where === 'in') cat(K.x, K.y, S, { ...K.o, key: 'kitty' });
    boxFront();
    if (M && M.f > 0) {
      panel(t, M);
      const bg = M.P.panel;
      // the contents fade in once the sweep has uncovered the whole front, and out before it sweeps back
      const ca = M.kind === 'xr' ? seg(t, 5.75, 6.05) * (1 - seg(t, 9.72, 9.92)) : seg(t, 11.35, 11.7);
      apparatus(t, M, ca * (M.kind === 'sp' ? .6 : 1), flare(t));
      if (ca < .02) {}
      else if (M.kind === 'xr') cat(CATX, SITY, S, { pose: 'sit', cols: catCols('xr', ca, bg), eyes: 'open', wag: t * 2.5, seed: 1.3, key: 'xrcat' });
      else {
        const hop = Math.abs(Math.sin(bpOf(t) * Math.PI)), alt = t > 17.9 ? .5 + .5 * Math.sin(t * 7) : 1;
        cat(CATX, SITY - 18 * hop, S, { pose: 'sit', cols: catCols('normal', ca * (.45 + .25 * alt), bg), op: 150, eyes: 'wink', mouth: 'tongue', paw: 1 + .7 * Math.sin(t * 9), wag: t * 7, sq: .08 * pulse(t), key: 'spcat' });
      }
      if (M.f > 0 && M.f < 1) { boilSeed('scanline'); inkLine([[BL - 12, BTOP + BH * M.f], [BR + 12, BTOP + BH * M.f + 1]], 3, M.P.line, 'ink', 0); }
    }
    if (K && K.peek) {   // paws on the rim
      boilSeed('rimpaws');
      const fx = K.x + (K.o.flip ? -1 : 1) * HEAD[0] * S;
      for (const d of [-.42, .42]) paint(ellPts(fx + d * S, BTOP + 2, .3 * S, .17 * S, 12), { wash: CATC.light, ink: PAL.ink, sw: 1 });
    }
    // the lid
    boilSeed('lid');
    push(); translate(PV[0], PV[1]); rotate(a);
    paint(rectPts(-LL, -LT, LL, LT, .6), { wash: WOOD.lid, ink: null });
    paint(rectPts(-LL, -LT, LL, 9, .4), { wash: WOOD.lidTop, ink: null });
    paint(rectPts(-LL, -LT, LL, LT, .6), { ink: PAL.ink, sw: 1.2 });
    paint(ellPts(-LL + 24, -LT / 2, 8, 7, 10), { wash: '#6B4A2E', ink: PAL.ink, sw: .7 });
    pop();
    pop();
    for (const t0 of SLAMS) { dust(BL - 14, BTOP, t0, t, -1); dust(BR + 14, BTOP, t0, t, 1); }
    if (t > 26.8 && t < 27.5) for (let i = 0; i < 4; i++) { const k = seg(t, 26.8, 27.4); boilSeed('in' + i); sparkle(CATX - 60 + i * 40, BTOP - 30 - 90 * easeOut(k) * hash(i + 2), 16, k, '#EFE3CC'); }
    // Clawd
    clawd(CX, GY, U, { ...co, boilKey: 'A' });
    if (K && K.where === 'out') cat(K.x, K.y, S, { ...K.o, key: 'kitty' });
    // the ghost: out of the cat, up through the lid; still there, fainter, while Clawd reaches for the lid
    if (M && M.kind === 'sp' && t > 12.9) {
      const up = ease(seg(t, 12.9, 14.2)), alt = t > 17.9 ? .5 - .5 * Math.sin(t * 7) : 1, al = (t < 17.9 ? .85 : .45 + .3 * alt) * seg(t, 12.9, 13.3);
      const gy = lerp(SITY - 10, t > 17.9 ? GHOSTY + 40 : GHOSTY, up) + 10 * Math.sin(t * 2.2), gx = CATX + 14 * Math.sin(t * 1.3);
      glow(gx + HEAD[0] * S, gy - 2.6 * S, 170, '#CFE4FF', .4 * al);
      cat(gx, gy, S, { pose: 'ghost', cols: catCols('ghost', al, '#35306A'), op: 215, eyes: 'closed', mouth: 'w', halo: al, haloBg: '#35306A', key: 'ghost' });
    }
    // the collapse: the ghost bursts into sparkles, a burst of warm light from the box
    const ca = t - COLLAPSE;
    if (ca > 0 && ca < .7) {
      for (let i = 0; i < 8; i++) { const ang = i * TAU / 8 + .3; boilSeed('cs' + i); sparkle(CATX + 14 + Math.cos(ang) * 190 * easeOut(ca / .7), GHOSTY - 60 + Math.sin(ang) * 150 * easeOut(ca / .7), 24, ca / .7); }
      glow(BX, BTOP - 30, 700 * (1 - ca / .7 * .5), '#FFE2A0', 1 - ca / .7);
    }
    // the last "both": a pale halo drifts up out of the shut lid
    if (t > 29.5) { const k = seg(t, 29.5, 31.2), hx = CATX + HEAD[0] * S, hy = BTOP - 60 - 170 * ease(k), al = Math.sin(Math.PI * clamp(k * 1.2)) * .8; if (al > .02) { glow(hx, hy, 120, '#FFE08A', .85 * al); boilSeed('lasthalo'); paint(ellPts(hx, hy, .9 * S, .27 * S, 24), { ink: mixCol(WALL[2], '#FFE49A', al), sw: 1.3 }); } }
    bubble(t);
    camEnd();
    if (ca > 0 && ca < .3) { flushBrush(); flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], '#FFF3D6', null, .5 * (1 - ca / .3)); }
    if (o.iris != null) irisTo(o.iris);
  }
  function irisTo([x, y, r]) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }

  // ---------- shots ----------
  const CLOSE = [CATX + 12, 1225, 2.75];
  const TWO = [520, 1335, 1.2];
  const shake = (c, t) => { let a = 0; for (const t0 of SLAMS) if (t > t0) a += 18 * Math.exp(-(t - t0) * 7); for (const t0 of THUMPS) if (t > t0) a += 5 * Math.exp(-(t - t0) * 9); const [dx, dy] = shakeXY(t, a); return [c[0] + dx / c[2], c[1] + dy / c[2], c[2], c[3] || 0]; };
  const faceAt = t => [CATX + HEAD[0] * S, PEEKY + HEAD[1] * S + 10];

  // A 0–4.8: the peek, the slam; pull back to Clawd; the thump; curiosity
  function shotA(t) {
    let c;
    if (t < 1.9) c = [CLOSE[0], CLOSE[1], CLOSE[2] + .05 * t];
    else if (t < 3.15) c = mixCam([CLOSE[0], CLOSE[1], CLOSE[2] + .095], TWO, ease(seg(t, 1.9, 2.95)));
    else c = mixCam(TWO, [545, 1345, 1.35], ease(seg(t, 3.7, 4.8)));
    c = shake(c, t);
    frame(t, c, t < .4 ? { iris: [...scr(faceAt(t), c), lerp(0, 1300, easeIn(t / .4))] } : {});
  }
  // B 4.8–10.6: the x-ray: the cat, the atom, the hammer, the flask; maybe, maybe not
  const XR1 = [BX + 40, 1395, 2.05], CATCAM = [CATX + 10, 1405, 2.5], APPCAM = [BL + 202, 1410, 2.95], BACK = [BX + 48, 1370, 1.95];
  function shotB(t) {
    let c;
    if (t < 5.8) c = mixCam([545, 1345, 1.35], XR1, ease(seg(t, 4.8, 5.5)));
    else if (t < 7.0) c = mixCam(XR1, CATCAM, ease(seg(t, 5.9, 6.6)));
    else if (t < 8.1) c = mixCam(CATCAM, APPCAM, ease(seg(t, 7.0, 7.7)));
    else if (t < 9.7) c = [APPCAM[0], APPCAM[1], APPCAM[2] + .1 * seg(t, 8.1, 9.7)];
    else c = mixCam([APPCAM[0], APPCAM[1], APPCAM[2] + .1], BACK, ease(seg(t, 9.7, 10.5)));
    frame(t, c);
    if (t > 9.05 && t < 9.9) { const k = seg(t, 9.05, 9.35), q = toScreenAt([JAR[0] + 34, JAR[1] - 118], c); emote('?', q[0], q[1], 13 * c[2], k * (1 - seg(t, 9.7, 9.9)), t - 9.05); }
  }
  const toScreenAt = ([x, y], c) => scr([x, y], c);
  // C 10.6–14.5: the violet "both" view: awake and playful, and a ghost rising out of it
  function shotC(t) {
    let c = mixCam(BACK, [BX + 60, 1390, 2.05], ease(seg(t, 10.6, 12.0)));
    if (t > 12.9) c = mixCam(c, [CATX - 20, 1255, 2.0], ease(seg(t, 12.9, 14.3)));
    frame(t, c);
  }
  // D 14.5–17.9: Clawd tries to picture both at once; the bubble; dizzy
  function shotD(t) {
    const dz = seg(t, 16.25, 16.6);
    frame(t, [CX + 5, 1140 + 10 * dz * Math.sin(t * 4), 1.48 + .03 * (t - 14.5), .045 * dz * Math.sin(t * 3.4)]);
  }
  // E 17.9–25.2: the lid; the collapse; the cat jumps on Clawd's head
  function shotE(t) {
    let c;
    const E1 = [545, 1330, 1.28], EC = [CATX - 20, 1262, 2.15], E2 = [545, 1300, 1.25], E3 = [CX + 100, 1230, 1.5], E4 = [CX + 40, 1195, 1.85];
    if (t < COLLAPSE) c = mixCam(TWO, E1, ease(seg(t, 17.9, 19.8)));
    else if (t < 20.9) c = mixCam(E1, EC, ease(seg(t, COLLAPSE, 20.3)));
    else if (t < 21.8) c = mixCam(EC, E2, ease(seg(t, 20.9, 21.45)));
    else if (t < 22.7) c = mixCam(E2, E3, ease(seg(t, 21.8, 22.65)));
    else c = mixCam(E3, E4, ease(seg(t, 22.8, 25.2)));
    frame(t, c);
  }
  // F 25.2–32: back into the box; the peek; the wink; the slam again; the last halo; iris
  function shotF(t) {
    let c;
    const hat = [CX + 40, 1195, 1.85];
    if (t < 26.1) c = [hat[0] + 10 * (t - 25.2), hat[1], hat[2]];
    else if (t < 26.95) c = mixCam([hat[0] + 9, hat[1], hat[2]], [CATX - 80, 1280, 1.6], ease(seg(t, 26.1, 26.9)));
    else c = mixCam([CATX - 80, 1280, 1.6], [CLOSE[0], CLOSE[1], CLOSE[2] + .05], ease(seg(t, 26.95, 27.9)));
    if (t > 27.9) c = [c[0], c[1], c[2] + .03 * (t - 27.9)];
    c = shake(c, t);
    const r = t > 30.9 ? lerp(1300, 0, easeIn(seg(t, 30.9, 31.85))) : null;
    frame(t, c, r != null ? { iris: [...scr([CATX + HEAD[0] * S, BTOP - 40], c), r] } : {});
  }

  shots([[0, shotA], [4.8, shotB], [10.6, shotC], [14.5, shotD], [17.9, shotE], [25.2, shotF]]);
})();
