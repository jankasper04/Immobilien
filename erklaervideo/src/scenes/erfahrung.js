// erfahrung.js: "Die Erfahrungsmaschine" (Robert Nozick), 36 s, 9:16. The storyboard is STORYBOARD_erfahrung.md.
// One street in three versions: the real one (grey, rain), the paradise the helmet makes of it (the same houses in
// pastel, sun, confetti, a crowd, a cake) and the lab behind the paradise (only in glitches, same camera, same spot).
// Everything is a pure function of t; the shots only choose the camera and the transitions. The last image (the
// helmet glowing in the dark) is the first image, so the video loops.
(() => {
  const SKIP = k => window.ERF_SKIP && window.ERF_SKIP[k];   // DEBUG
  // ---------- world ----------
  const U = 24, CX = 540, SY = 1560;              // Clawd's size unit, x and ground (feet)
  const GY = 1470, CURB = 1668, FX = 820;         // foot of the house fronts, the kerb, where the friend stops
  const RIM = 7.7;                                // the helmet's rim on the head, in u above the feet
  const HOVER = SY - 14.4 * U, Y0 = -300;         // the helmet's rim hanging over Clawd, and at t = 0
  const GLOW = '#7FE3FF', WARM = '#FFB46E', RED = '#D8394E', DARK = '#16131B';
  const T_SNAP = 6.2, T_OFF = 19.0, T_BLACK = 33.4;
  const GLITCH = [[11.45, 11.8], [14.05, 14.55], [16.1, 17.1]];   // tear, lab ..., tear
  const TEARS = [[17.2, 17.3], [17.45, 17.55]];                   // single torn frames after the long glitch
  const CONF = ['#E27A92', '#F2C53D', '#3A9C98', '#7B5CA8', '#FFF5E2', '#6FB8EC'];
  const FCOL = { col: '#E3A948', dk: '#AE7A2C', lt: '#F7D58E' };  // the friend: mustard, with a teal beanie

  const PALS = {
    rain: { sky: ['#1A1D27', '#262B37', '#353B49', '#4A5161', '#5E6676'], house: ['#7B8190', '#6E7585', '#848A97'], trim: '#5E6472',
            win: '#434958', frame: '#9AA0AC', door: '#4F4A58', walk: '#8A8E97', kerb: '#6A6E77', road: '#4A4F5A', dash: '#6A6F7A',
            puddle: '#A3AEBF', puddleDk: '#6F7A8C', line: '#6E727C', lamp: '#3D4250' },
    para: { sky: ['#5DAEEA', '#79BFEE', '#9DD2F1', '#C8E6EE', '#F7E7C2'], house: ['#F4B3C4', '#BCE3C9', '#FFE08F'], trim: '#E58FA5',
            win: '#FFF1C9', frame: '#4FA9A6', door: '#E27A92', walk: '#F4D27E', kerb: '#E3A94F', road: '#F6BDCB', dash: '#FFF5E2',
            puddle: '#FFE58F', puddleDk: '#EFB84A', line: '#D9A94E', lamp: '#E3A94F' },
  };

  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    VIEW = { x0: cx - W / 2 / z, x1: cx + W / 2 / z, y0: cy - H / 2 / z, y1: cy + H / 2 / z, z };
  }
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const inView = (x0, y0, x1, y1, m = 60) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  // flat colour for the big backgrounds and the full-frame overlays (huge washes are slow on software WebGL)
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  function flatA(P, col, a) { const c = color(col); c.setAlpha(255 * clamp(a)); noStroke(); fill(c); beginShape(); for (const p of P) vertex(p[0], p[1]); endShape(CLOSE); }
  const viewBox = (m = 120) => [[VIEW.x0 - m, VIEW.y0 - m], [VIEW.x1 + m, VIEW.y0 - m], [VIEW.x1 + m, VIEW.y1 + m], [VIEW.x0 - m, VIEW.y1 + m]];
  const SCREEN = [[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]];
  const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  // ---------- acting helpers (from theseus.js) ----------
  // where an arm's tip lands, replicating clawd()'s transforms, so held things touch the hand
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
  // a point in Clawd's body space (front view units) → world
  function bodyPt(x, y, u, o, bx, by) {
    const sq = (o.sq || 0) + (o.take || 0), c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0);
    const lx = bx * u * (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6), ly = by * u * (o.sy ?? 1) * (1 - sq);
    return [x + (o.dx || 0) * u + lx * c - ly * s, y + (o.dy || 0) * u + lx * s + ly * c];
  }
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0);
    return o;
  }
  const sparkle = (x, y, r, k, col = '#FFF5E2') => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, washOp: 255 * (1 - k * k), ink: null }); };

  // ---------- the helmet ----------
  // drawn around the middle of its rim (0, 0), dome up. leds: five values 0..1.
  function helmetShape(u, sw, leds = [1, 1, 1, 1, 1]) {
    const dome = []; for (let i = 0; i <= 18; i++) { const a = Math.PI + i / 18 * Math.PI; dome.push([Math.cos(a) * 5.1 * u, -.35 * u + Math.sin(a) * 4.0 * u]); }
    paint(dome, { wash: '#C4C3DA', ink: PAL.ink, sw });
    paint(ellPts(2.2 * u, -1.5 * u, 2.3 * u, 1.3 * u, 14, 0, -.5), { wash: '#A6A5C4', ink: null });
    paint(ellPts(-2.2 * u, -2.8 * u, 1.5 * u, .7 * u, 12, 0, -.45), { wash: '#EEEEF8', ink: null });
    for (const s of [-1, 1]) paint(rrPts(s * 5.45 * u - .55 * u, -.4 * u, 1.1 * u, 2.3 * u, .45 * u), { wash: '#6E6C93', ink: PAL.ink, sw: sw * .8 });   // ear plates
    paint(rrPts(-5.6 * u, -.8 * u, 11.2 * u, 1.55 * u, .6 * u), { wash: '#5E5C86', ink: PAL.ink, sw: sw * .9 });
    for (let i = 0; i < 5; i++) paint(ellPts((-3.6 + i * 1.8) * u, 0, .38 * u, .38 * u, 10), { wash: mixCol('#3F4668', '#D2F8FF', clamp(leds[i])), ink: null });
    paint(rrPts(-.8 * u, -5.1 * u, 1.6 * u, .95 * u, .25 * u), { wash: '#5E5C86', ink: PAL.ink, sw: sw * .8 });
  }
  function ledsAt(t) {
    if (t < 5.4) return [0, 1, 2, 3, 4].map(i => .35 + .35 * Math.sin(t * 5 + i * 1.3));
    if (t < T_SNAP) return [0, 1, 2, 3, 4].map(i => t > 5.45 + i * .13 ? 1 : .1);
    return [0, 1, 2, 3, 4].map(i => .5 + .5 * Math.sin(t * 7 - i * 1.3));
  }
  // the hook that puts the helmet on Clawd's head (body-local, follows squash, flip and rot)
  const helmetHook = (o, leds, extra) => (u, sw) => {
    const V = VIEWS[o.view] || VIEWS.front;
    push(); translate(V.hat * u, -RIM * u); scale(V.hw, 1); helmetShape(u, sw, leds); pop();
    if (extra) extra(u, sw);
  };
  // the helmet anywhere in the world, with its cable up into the sky
  function helmetAt(x, y, a, t, o = {}) {
    const sw = clamp(U / 15, .45, 2.4), top = [x, y].map((v, i) => v + rot2([0, -5.1 * U], a)[i]);
    if (o.cable !== false && VIEW.y0 < top[1]) {
      const sway = 18 * wob(t, 1 / 9), P = [top, [top[0] + 4, top[1] - 160], [top[0] + 8 + sway * .5, top[1] - 420], [top[0] + 12 + sway, Math.min(top[1] - 500, VIEW.y0 - 80)]];
      boilSeed('cable');
      inkLine(P, 2.4, '#2A2D38', 'ink', .5);
    }
    boilSeed('helmet');
    push(); translate(x, y); rotate(a); helmetShape(U, sw, o.leds); pop();
  }
  const glowK = t => 1 + .12 * wob(t, .5);                           // the helmet's pulse (loops with the video)
  function helmetGlow(x, y, k, a = 1) { glow(x, y - 2 * U, 7.5 * U * k, GLOW, a); glow(x, y - 1.5 * U, 3 * U * k, '#E6FDFF', .55 * a); }

  // ---------- the street ----------
  const HOUSES = [{ x0: -440, x1: 250, top: 560 }, { x0: 250, x1: 830, top: 400 }, { x0: 830, x1: 1520, top: 610 }];
  const WINS = [];
  HOUSES.forEach((h, hi) => {
    const n = 3, cw = (h.x1 - h.x0) / n;
    for (let r = 0; ; r++) {
      const y = h.top + 100 + r * 235; if (y + 150 > GY - 90) break;
      for (let k = 0; k < n; k++) {
        const x = h.x0 + (k + .5) * cw;
        WINS.push({ x, y, key: hi * 100 + r * 10 + k });
      }
    }
  });
  const PUDS = [[190, GY + 118, 110, 16], [735, GY + 150, 130, 18], [330, CURB + 150, 220, 34], [900, CURB + 270, 180, 30], [60, CURB + 430, 210, 34], [700, CURB + 520, 240, 40]];
  const winPts = w => { boilSeed('win' + w.key); return rectPts(w.x - 55, w.y, 110, 150, 1.5); };
  const LAMP_X = 40;

  // the sky in painted bands (flat), dark at the top
  function sky(P) {
    const { x0, x1, y0, y1 } = VIEW, m = 120, X = x0 - m, Wd = x1 - x0 + 2 * m;
    const bands = [[-1e5, P.sky[0]], [-380, P.sky[1]], [60, P.sky[2]], [290, P.sky[3]], [470, P.sky[4]]];
    const step = 120, xs = Math.floor(X / step) * step, xe = X + Wd + step;
    const edge = (i, x) => i >= bands.length ? GY + 4 : bands[i][0] + 14 * Math.sin(x * .004 + i);
    bands.forEach(([, col], i) => {
      const ya = i ? bands[i][0] - 20 : -1e5, yb = i + 1 < bands.length ? bands[i + 1][0] + 20 : GY + 4;
      if (yb < y0 - m || ya > y1 + m) return;
      const P2 = [];
      for (let x = xs; x <= xe; x += step) P2.push([x, i ? Math.max(edge(i, x), y0 - m) : y0 - m]);
      for (let x = Math.floor(xe / step) * step; x >= xs; x -= step) P2.push([x, Math.min(edge(i + 1, x) + 1, y1 + m)]);
      flat(P2, col);
    });
  }
  // flat layer: sky, house fronts, pavement, road, puddles
  function streetFlat(P, para) {
    const { x0, x1, y1 } = VIEW, m = 120, X = x0 - m, Wd = x1 - x0 + 2 * m;
    sky(P);
    HOUSES.forEach((h, i) => {
      if (!inView(h.x0, h.top - 60, h.x1, GY)) return;
      flat(rectPts(h.x0, h.top, h.x1 - h.x0, GY - h.top + 6), P.house[i]);
      flat(rectPts(h.x0 - 14, h.top - 28, h.x1 - h.x0 + 28, 36), P.trim);
      flat(rectPts(h.x0, GY - 42, h.x1 - h.x0, 44), P.trim);
    });
    for (const [cx, top, w] of [[40, 560, 70], [1100, 610, 80]]) if (inView(cx, top - 120, cx + w, top)) flat(rectPts(cx, top - 110, w, 112), P.trim);
    for (const w of WINS) {
      if (!inView(w.x - 70, w.y, w.x + 70, w.y + 170)) continue;
      const lit = !para && (w.key === 111 || w.key === 220 || w.key === 1);
      flat(winPts(w), lit ? '#C9A873' : P.win);
      boilSeed('sill' + w.key);
      if (para) { flat(rectPts(w.x - 64, w.y + 142, 128, 22, 1), '#E27A92'); for (const k of [-1, 1]) flat(ellPts(w.x + k * 32, w.y + 136, 13, 11, 10), k < 0 ? '#FFF5E2' : '#F2C53D'); }
      else flat(rectPts(w.x - 64, w.y + 150, 128, 12, 1), P.trim);
    }
    if (y1 < GY - 10) return;
    flat(rectPts(X, GY, Wd, CURB - GY), P.walk);
    flat(rectPts(X, CURB, Wd, 22), P.kerb);
    if (y1 > CURB) flat(rectPts(X, CURB + 22, Wd, Math.max(10, y1 + m - CURB - 22)), P.road);
    if (y1 > CURB + 340) for (let x = Math.floor(X / 300) * 300; x < X + Wd; x += 300) flat(rectPts(x, CURB + 360, 150, 16), P.dash);
    for (const [px, py, rx, ry] of PUDS) {
      if (!inView(px - rx, py - ry, px + rx, py + ry)) continue;
      flat(ellPts(px, py, rx, ry, 24), P.puddleDk);
      flat(ellPts(px + 6, py - 2, rx * .9, ry * .72, 24), P.puddle);
    }
  }
  // brush layer: window outlines, paving, lamp
  function streetInk(P, t, para) {
    if (SKIP('ink')) return;
    for (const w of WINS) {
      if (!inView(w.x - 70, w.y, w.x + 70, w.y + 170)) continue;
      paint(winPts(w), { ink: PAL.ink, sw: .8 });
      inkLine([[w.x, w.y + 4], [w.x, w.y + 146]], 1.1, P.frame, 'ink', 0);
    }
    if (VIEW.y1 > GY) {   // pavement joints and the kerb edge
      boilSeed('paving');
      const s = 200, a = Math.floor((VIEW.x0 - 50) / s), b = Math.ceil((VIEW.x1 + 50) / s);
      for (let i = a; i <= b; i++) inkLine([[i * s + 30, GY + 8], [i * s + 10, CURB - 6]], .8, P.line, 'inkfine', 0);
      inkLine([[VIEW.x0 - 40, CURB + 1], [VIEW.x1 + 40, CURB + 1]], 1.1, PAL.ink, 'ink', 0);
    }
    if (inView(LAMP_X - 60, 880, LAMP_X + 120, GY + 40)) {
      boilSeed('lamp');
      paint(rectPts(LAMP_X - 7, 930, 14, GY + 34 - 930, 1), { wash: P.lamp, ink: PAL.ink, sw: .8 });
      inkLine([[LAMP_X, 940], [LAMP_X + 30, 900], [LAMP_X + 80, 910]], 3, P.lamp, 'ink', .6);
      paint([[LAMP_X + 55, 905], [LAMP_X + 105, 905], [LAMP_X + 96, 950], [LAMP_X + 64, 950]], { wash: para ? '#FFF1C9' : '#D9C088', ink: PAL.ink, sw: .8 });
    }
  }
  // rain: world-anchored cells, each with one streak cycling down; shelter = the umbrella (no rain under it)
  function rain(t, shelter, light) {
    const cs = 190, i0 = Math.floor((VIEW.x0 - 60) / cs), i1 = Math.floor((VIEW.x1 + 60) / cs), j0 = Math.floor((VIEW.y0 - 120) / cs), j1 = Math.floor((VIEW.y1 + 40) / cs);
    const dens = clamp(Math.pow(VIEW.z, 1.3), .35, 1);
    let n = 0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (hash(i * 131.7 + j * 71.3) > dens) continue;
      const x = (i + hash(i * 17.1 + j * 3.7)) * cs, y = (j + frac(hash(i * 5.3 + j * 11.9) + t * 6.2)) * cs;
      if (y > SY + 700) continue;
      if (shelter && x > shelter[0] && x < shelter[1] && y > shelter[2]) continue;
      let col = '#AEB9C9';
      if (light) { const d = Math.hypot(x - light[0], y - light[1]); if (d < 420) col = mixCol(col, '#E4FCFF', 1 - d / 420); }
      boilSeed('drop' + n++);
      inkLine([[x, y], [x - 11, y + 64]], 1.2, col, 'inkfine', 0);
    }
  }
  // rings in the puddles and splash ticks on the pavement
  function ripples(t, shelter) {
    PUDS.forEach(([px, py, rx, ry], i) => {
      if (!inView(px - rx, py - ry, px + rx, py + ry)) return;
      for (let k = 0; k < 2; k++) {
        const ph = frac(t * 1.1 + hash(i * 3 + k)), r = .15 + .7 * ph;
        boilSeed('ring' + i + k);
        inkLine(ellPts(px + (hash(i + k * 9) - .5) * rx * .8, py, rx * .5 * r, ry * .5 * r, 14), 1.1 * (1 - ph), '#D6DEE8', 'inkfine', .5);
      }
    });
    const f = Math.floor(t * 12);
    for (let i = 0; i < 9; i++) {
      const x = VIEW.x0 + hash(f * 3.1 + i) * (VIEW.x1 - VIEW.x0), y = GY + 16 + hash(f * 7.3 + i * 1.7) * Math.max(0, Math.min(VIEW.y1, SY + 650) - GY - 16);
      if (y > VIEW.y1 || (shelter && x > shelter[0] && x < shelter[1])) continue;
      boilSeed('tick' + i);
      inkLine([[x - 9, y - 11], [x, y], [x + 9, y - 11]], .9, '#C9D2DE', 'inkfine', 0);
    }
  }

  // ---------- paradise pieces ----------
  function sun(t) {
    if (SKIP('sun')) return;
    const sx = 880, sy = 400; if (!inView(sx - 300, sy - 300, sx + 300, sy + 300)) return;
    glow(sx, sy, 330, '#FFE8A6', .85);
    boilSeed('sun');
    flat(ellPts(sx, sy, 62, 62, 24, 1), '#FFF0B8');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * .25, r0 = 92, r1 = 140 + 14 * Math.sin(t * 3 + i); inkLine([[sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1]], 2.6, '#FFE08A', 'ink', 0); }
  }
  const BUNT = [[-300, 880, 1400, 930, 120], [-300, 1110, 1400, 1070, 80]];
  function bunting(t) {
    if (SKIP('bunt')) return;
    flushBrush();   // the flags are flat and must sit over the window outlines
    BUNT.forEach(([x0, y0, x1, y1, sag], s) => {
      if (!inView(x0, Math.min(y0, y1), x1, Math.max(y0, y1) + sag + 70)) return;
      const at = k => [lerp(x0, x1, k), lerp(y0, y1, k) + sag * 4 * k * (1 - k) + 5 * Math.sin(t * 2 + k * 9 + s)];
      const n = 20;
      for (let i = 0; i < n; i++) {
        const a = at((i + .12) / n), b = at((i + .88) / n); if (!inView(a[0], a[1], b[0], b[1] + 60)) continue;
        const mid = [(a[0] + b[0]) / 2 + 5 * Math.sin(t * 3 + i), (a[1] + b[1]) / 2 + 56];
        flat([a, b, mid], CONF[(i + s * 3) % 5]);
      }
      const P = []; for (let k = 0; k <= 16; k++) P.push(at(k / 16));
      boilSeed('bunt' + s);
      inkLine(P, 1.2, PAL.ink, 'ink', .5);
    });
  }
  // the red carpet from Clawd's feet down the road
  function carpet() { if (VIEW.y1 > GY + 40) flat([[CX - 90, GY + 50], [CX + 90, GY + 50], [CX + 190, VIEW.y1 + 150], [CX - 190, VIEW.y1 + 150]], '#C8324A'); }
  function goldPools(t) {
    if (SKIP('pools')) return;
    PUDS.forEach(([px, py, rx, ry], i) => {
      if (!inView(px - rx, py - ry, px + rx, py + ry)) return;
      for (let k = 0; k < 1; k++) { const ph = frac(t * .8 + hash(i * 5 + k)); boilSeed('pool' + i + k); sparkle(px + (hash(i * 7 + k) - .5) * rx, py + (hash(i + k * 3) - .5) * ry, 16, ph); }
    });
  }
  // confetti: world-anchored cells like the rain, but slow and fluttering; plus the burst at the snap
  function confetti(t) {
    if (SKIP('conf')) return;
    const cs = 175, i0 = Math.floor((VIEW.x0 - 40) / cs), i1 = Math.floor((VIEW.x1 + 40) / cs), j0 = Math.floor((VIEW.y0 - 40) / cs), j1 = Math.floor((VIEW.y1 + 40) / cs);
    const dens = clamp(VIEW.z * .75, .3, .85), fall = seg(t, T_SNAP, T_SNAP + 1.2);
    let n = 0;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (hash(i * 91.3 + j * 37.9) > dens) continue;
      const x = (i + hash(i * 13.7 + j * 5.1)) * cs + 26 * Math.sin(t * 2.2 + i * 1.7 + j), y = (j + frac(hash(i * 3.3 + j * 17.9) + t * .5)) * cs;
      if (y > SY + 900 || y > VIEW.y0 + fall * (VIEW.y1 - VIEW.y0 + 200)) continue;
      const a = t * (2.5 + 3 * hash(i + j * 7)) + i, s = 9 + 6 * hash(i * 7 + j), fl = Math.abs(Math.cos(t * 5 + i + j));
      n++;
      flat([[-s, -s * .5 * fl], [s, -s * .5 * fl], [s, s * .5 * fl], [-s, s * .5 * fl]].map(p => { const r = rot2(p, a); return [x + r[0], y + r[1]]; }), CONF[Math.floor(hash(i * 3 + j * 11) * 6)]);
    }
    const age = t - T_SNAP;
    if (age > 0 && age < 1.4) for (let k = 0; k < 22; k++) {   // the burst from the crown
      const ang = -Math.PI / 2 + (hash(k + 50) - .5) * 2.8, v = 650 + 500 * hash(k + 60), x = CX + Math.cos(ang) * v * age, y = SY - 10 * U + Math.sin(ang) * v * age + 700 * age * age;
      const s = 11 + 5 * hash(k), a = age * 9 + k;
      flat([[-s, -s * .45], [s, -s * .45], [s, s * .45], [-s, s * .45]].map(p => { const r = rot2(p, a); return [x + r[0], y + r[1]]; }), CONF[k % 6]);
    }
  }
  // The crowd, painted cheaply: flat body, legs and arms, one outline, and (from the front) happy eyes and a grin.
  // It's the same Clawd model; only the main characters need the full watercolour clawd().
  function miniClawd(x, y, u, col, o) {
    const f = o.flip ? -1 : 1, sx = 1 + o.sq * .6, sy = 1 - o.sq, dk = mixCol(col, PAL.ink, .3);
    const W2 = P => P.map(([a, c]) => [x + f * a * u * sx, y + o.dy * u + c * u * sy]);
    boilSeed(o.key);
    const legs = o.back ? [[3.3, 1], [.8, 0], [-1.8, 0], [-4.3, 0]] : [[-4, 0], [-2, 0], [1, 0], [3, 0]];
    for (const [lx, far] of legs) flat(W2(rectPts(lx, -2.4, 1, 2.2, .05)), far ? mixCol(dk, PAL.ink, .2) : dk);
    for (const [px, dir, a] of [[-4.9, -1, o.aL], [4.9, 1, o.aR]]) {
      const root = px + dir * .55 * clamp((Math.abs(a) - .7) / .9), r = dir < 0 ? a : -a;
      flat(W2([[0, -.5], [2.2 * dir, -.5], [2.2 * dir, .5], [0, .5]].map(q => { const v = rot2(q, r); return [root + v[0], -4.5 + v[1]]; })), col);
    }
    const body = W2(rectPts(-5.05, -8, 10.1, 6, .06));
    flat(body, col);
    flat(W2(rectPts(-4.8, -3.8, 9.6, 1.6, .04)), mixCol(col, dk, .35));
    if (o.back) flat(W2(rectPts(2.3, -8, 2.7, 6, .04)), mixCol(col, dk, .45));
    else {
      for (const s of [-1, 1]) flat(W2(ellPts(s * 3.6, -4.6, .85, .42, 10)), mixCol(col, PAL.rose, .6));
      flat(W2([[-1.3, -4.8], [1.3, -4.8], [.9, -3.9], [-.9, -3.9]]), '#4A1F2A');
    }
    paint(body, { ink: PAL.ink, sw: clamp(u / 15, .6, 2) });
    if (!o.back) for (const s of [-1, 1]) inkLine(W2([[s * 2.5 - .9, -5.3], [s * 2.5, -6.5], [s * 2.5 + .9, -5.3]]), clamp(u / 15, .6, 2) * 1.3, PAL.ink, 'ink', .2);
    if (o.hearts) for (let i = 0; i < 2; i++) {   // hearts rising
      const ph = frac(o.t * .55 + i / 2), a = Math.sin(ph * Math.PI); if (a < .15) continue;
      flat(W2(heartPts(4.5 + Math.sin(ph * 6 + i * 2) * .7, -9 - ph * 4, .45 + .5 * a, 16)), '#E2476E');
    }
  }
  // [x, y, u, colour, flip, phase, hearts, back]
  const CROWD_BACK = [[95, GY + 10, 13, '#E27A92', false, .1, true, false], [225, GY + 4, 12, '#7FA6DE', false, .55, false, false],
                      [862, GY + 4, 12, '#8FC66A', false, .8, false, false], [992, GY + 10, 13, '#B58AD8', false, .3, true, false]];
  const CROWD_FRONT = [[150, SY + 370, 30, '#F0BE46', false, .35, false, true], [945, SY + 395, 32, '#6FC0B8', true, .7, false, true]];
  // cheering: arms up, alternating, hopping on the beat; clockwork = all in step (after the second glitch)
  function crowd(t, list, key, clockwork) {
    if (SKIP(key)) return;
    list.forEach(([x, y, u, col, flip, ph, hearts, back], i) => {
      if (!inView(x - 8 * u, y - 13 * u, x + 8 * u, y + u)) return;
      const b = bpOf(t) + (clockwork ? 0 : ph), s = Math.sin(b * TAU);
      miniClawd(x, y, u, col, { flip, back, hearts, t: t + ph * 3, key: key + i, aL: 1.2 + .38 * s, aR: 1.2 - .38 * s,
        dy: -1.1 * Math.abs(Math.sin(b * Math.PI)), sq: .1 * pulse(t + (clockwork ? 0 : ph) * BEAT) });
    });
  }
  // the cake grows out of the ground behind Clawd
  const CAKE_T = [9.0, 9.75];
  const CAKE_BASE = GY + 30, TIERS = [[640, 250, '#F4BCCB', '#FFF5E2'], [470, 215, '#FBE2E9', '#F4BCCB'], [310, 185, '#F4BCCB', '#FFF5E2']];
  const CAKE_TOP = CAKE_BASE - TIERS.reduce((s, x) => s + x[1], 0);
  function cake(t) {
    if (SKIP('cake')) return;
    const g = t < CAKE_T[0] ? 0 : backOut(seg(t, ...CAKE_T)); if (g < .02) return;
    const w = .05 * spring(t, CAKE_T[1], 5, 14);
    push(); translate(CX, CAKE_BASE); scale(1 + w, g); translate(-CX, -CAKE_BASE);
    flushBrush();   // flat tiers over the crowd and flags behind
    let y = CAKE_BASE;
    const outlines = [];
    TIERS.forEach(([wd, h, c, ic], i) => {
      boilSeed('tier' + i);
      const T = rectPts(CX - wd / 2, y - h, wd, h, 2);
      flat(T, c);
      const P = [[CX - wd / 2 - 8, y - h - 8], [CX + wd / 2 + 8, y - h - 8]];
      for (let k = 12; k >= 0; k--) P.push([CX - wd / 2 - 8 + k * (wd + 16) / 12, y - h + 22 + (k % 2 ? 22 + 18 * hash(k + i * 7) : 2)]);
      const Ps = through(P.concat([P[0]]), 3);
      flat(Ps, ic);
      for (let k = 0; k < 4; k++) flat(ellPts(CX - wd / 2 + (k + .5) * wd / 4, y - h * .35, 13, 13, 10), RED);
      outlines.push(T, Ps);
      y -= h;
    });
    for (const dx of [-80, 0, 80]) { boilSeed('candle' + dx); const C = rectPts(CX + dx - 11, y - 96, 22, 96, 1); flat(C, dx ? '#7FB8E6' : '#F2C53D'); outlines.push(C); }
    outlines.forEach((O, i) => { boilSeed('cakeink' + i); paint(O, { ink: PAL.ink, sw: 1.1 }); });
    pop();
    if (g > .9) {
      const fy = CAKE_BASE + (CAKE_TOP - 96 - CAKE_BASE) * g;
      glow(CX, fy - 20, 220, '#FFD27A', .8);
      for (const dx of [-80, 0, 80]) {
        const fl = 1 + .15 * Math.sin(t * 13 + dx);
        boilSeed('flame' + dx);
        paint([[CX + dx, fy - 52 * fl], [CX + dx + 13, fy - 18], [CX + dx, fy - 4], [CX + dx - 13, fy - 18]], { wash: '#FFD86B', ink: PAL.ink, sw: .6, curv: .6 });
      }
    }
  }
  function slice(x, y, a, s = 1) {
    boilSeed('slice');
    push(); translate(x, y); rotate(a); scale(s);
    paint([[-70, 26], [66, -34], [66, 30], [-70, 30]], { wash: '#F4BCCB', ink: PAL.ink, sw: 1 });
    paint([[-70, 24], [66, -36], [70, -24], [-64, 30]], { wash: '#FFF5E2', ink: PAL.ink, sw: .7 });
    inkLine([[-40, 22], [62, 0]], 1.6, '#E27A92', 'ink', 0);
    paint(ellPts(50, -44, 13, 13, 10), { wash: RED, ink: PAL.ink, sw: .6 });
    pop();
  }
  const SLICE_T = [11.95, 12.7], CHOMPS = [13.0, 13.35, 13.72, 14.0];
  function lidAt(t) {
    let l = kf(t, [[12.05, 0], [12.35, .95], [12.62, .95], [12.7, 0]], easeOut);
    for (const c of CHOMPS) l += .38 * Math.sin(Math.PI * seg(t, c - .14, c + .1));
    if (t > 14.55) l = .32 * (1 - ease(seg(t, 14.9, 15.3)));   // frozen mid-chew
    return l;
  }

  // ---------- the lab (only in glitches) ----------
  const LABPOSE = { view: 'front', eyes: 'blank', mouth: 'o', tint: 'pale', tintK: .55, aL: -1.05, aR: -.98, noLegs: true, noShadow: true, lookX: 0, lookY: 0 };
  function lab(t) {
    flat(viewBox(), '#141A26');
    flat(rectPts(VIEW.x0 - 120, SY - 110, VIEW.x1 - VIEW.x0 + 240, VIEW.y1 - SY + 260), '#1E2536');
    boilSeed('labwall');
    for (const dx of [-440, -230, 230, 440]) if (inView(CX + dx, VIEW.y0, CX + dx, SY)) inkLine([[CX + dx, Math.max(VIEW.y0 - 20, SY - 1400)], [CX + dx, SY - 112]], 1.2, '#2A3348', 'ink', 0);
    inkLine([[VIEW.x0 - 30, SY - 110], [VIEW.x1 + 30, SY - 110]], 1.4, '#34405A', 'ink', 0);
    // the machine above and its cables down to the helmet
    const my = SY - 700, sock = [CX, SY - (RIM + 5.1) * U];
    if (inView(CX - 320, my - 420, CX + 320, my)) {
      boilSeed('machine');
      paint(rrPts(CX - 310, my - 420, 620, 420, 24, 2), { wash: '#252C3E', ink: PAL.ink, sw: 1.2 });
      for (let i = 0; i < 8; i++) { const on = hash(Math.floor(t * 8) * 3 + i) > .45; paint(ellPts(CX - 210 + i * 60, my - 60, 9, 9, 8), { wash: on ? (i % 3 ? '#6BE3FF' : '#FF6B8A') : '#39425A', ink: null }); }
    }
    [-1.5, -.5, .5, 1.5].forEach((k, i) => {
      boilSeed('lcable' + i);
      inkLine(through([[sock[0] + k * 14, sock[1] + 6], [sock[0] + k * 70, sock[1] - 150], [CX + k * 150, my - 10]], 6), 7, '#3B4660', 'ink', .5);
    });
    for (const s of [-1, 1]) { boilSeed('droop' + s); inkLine(through([[CX + s * 250, my], [CX + s * 330, SY - 300], [CX + s * 380, SY - 60]], 6), 6, '#2F3950', 'ink', .5); }
    // the chair
    boilSeed('chair');
    paint(rrPts(CX - 150, SY - 340, 300, 300, 60, 2), { wash: '#3A3552', ink: PAL.ink, sw: 1.1 });
    helmetGlow(CX, sock[1] + 5.1 * U, 1.15, .95);
    clawd(CX, SY, U, { ...LABPOSE, sq: .05 + .01 * Math.sin(t * 2), boilKey: 'lab', draw: helmetHook(LABPOSE, ledsAt(t)) });
    boilSeed('seat');
    paint(rrPts(CX - 165, SY - 2 * U - 6, 330, 58, 22, 1), { wash: '#48415F', ink: PAL.ink, sw: 1.1 });
    paint(rectPts(CX - 13, SY + 8, 26, 70, 1), { wash: '#2A2F40', ink: PAL.ink, sw: .8 });
    paint(ellPts(CX, SY + 84, 110, 16, 18), { wash: '#2A2F40', ink: PAL.ink, sw: .8 });
    // the monitor with a slow heartbeat
    const mx = CX + 330, myy = SY - 470;
    if (inView(mx - 110, myy, mx + 110, SY + 90)) {
      boilSeed('monitor');
      paint(rectPts(mx - 7, myy + 150, 14, SY + 80 - myy - 150, 1), { wash: '#2A2F40', ink: PAL.ink, sw: .8 });
      paint(rrPts(mx - 100, myy, 200, 150, 16, 1), { wash: '#0E1A17', ink: PAL.ink, sw: 1 });
      const ph = frac(t * .7), P = [];
      for (let k = 0; k <= 16; k++) { const x = mx - 84 + k * 10.5, d = k / 16 - ph; P.push([x, myy + 80 - (Math.abs(d) < .04 ? 44 * Math.sign(d + .02) : 0)]); }
      inkLine(P, 1.6, '#6BE39A', 'ink', 0);
    }
  }

  // ---------- Clawd ----------
  const MOOD = [
    [0, 'sad', { emote: null }], [2.35, 'surprised', { lookY: -1 }], [3.0, 'hopeful', { lookY: -1 }], [4.45, 'determined', { lookY: -1 }],
    [5.4, 'relieved', { emote: null }], [6.4, 'starstruck'], [7.8, 'excited'], [9.75, 'love', { lookY: -1 }], [10.7, 'laugh'],
    [11.95, 'neutral', { eyes: 'wide', mouth: 'O', lookX: .9, lookY: -.3, emote: null }], [12.75, 'happy', { emote: null, eyes: 'squeeze' }], [14.65, 'confused'], [15.35, 'nervous'],
    [17.15, 'scared'], [17.65, 'determined'], [19.05, 'surprised', { emote: 'sweat' }], [19.6, 'sad', { emote: null }],
    [24.65, 'surprised', { lookY: -1, emote: null }], [25.7, 'relieved', { emote: null, lookX: .8 }], [26.4, 'happy', { lookX: .7 }],
    [27.6, 'hopeful', { lookX: -1 }], [29.0, 'neutral', { eyes: 'look', seed: 1.96 }], [32.95, 'determined', { emote: null }],
  ];
  const LOOKS = [[27.6, -1], [28.9, -1], [29.05, 1], [29.75, 1], [29.9, -1], [30.35, -1], [30.5, 1], [30.9, 1], [31.05, -1], [31.7, -1], [31.9, 1], [32.35, 1], [32.5, 0]];
  const HAND_T = [27.7, 28.3];   // the helmet lifted
  // Clawd at time t: { x, y, o, helm } where helm says where the helmet is: cable | head | hands | hand | none
  function clawdAt(t) {
    const m = emotions(t, MOOD), p = {};
    let helm = 'none';
    if (t < 4.75) {
      if (t > 3.2) { p.aL = kf(t, [[3.2, m.aL], [3.8, .55]]); p.aR = kf(t, [[3.3, m.aR], [3.9, .5]]); }
      if (t > 3.95 && t < 4.45) { p.lookX = kf(t, [[3.95, 0], [4.05, -.9], [4.3, -.9], [4.42, 0]]); p.lookY = kf(t, [[3.95, -1], [4.05, .4], [4.3, .4], [4.42, -1]]); }
      helm = 'cable';
    } else if (t < T_SNAP) {
      const j = jump(t, 4.75, 5.35, 6.7);
      p.dy = j.dy; p.sq = j.sq;
      p.aL = kf(t, [[4.55, .5], [4.72, -.3], [4.85, 1.45], [5.35, 1.35], [5.7, 1.1], [6.2, .9]]);
      p.aR = kf(t, [[4.55, .5], [4.74, -.35], [4.87, 1.4], [5.37, 1.3], [5.75, 1.05], [6.2, .85]]);
      if (t > 5.75) { p.sq -= .1 * ease(seg(t, 5.75, 6.2)); p.dx = .05 * Math.sin(t * 70) * seg(t, 5.6, 6.2); }
      helm = t < 5.05 ? 'cable' : 'head';
    } else if (t < T_OFF) {
      p.hat = 'crown';
      if (t > 12.0 && t < 15.3) { p.lid = lidAt(t); p.view = 'front'; }
      if (t > 12.7 && t < 14.6) p.sx = 1.06;
      if (t > 17.65) {
        p.aL = kf(t, [[17.7, .3], [17.95, 1.45]]); p.aR = kf(t, [[17.72, .3], [17.98, 1.42]]);
        const pull = ease(seg(t, 18.1, 18.82)), a = t - 18.85;
        if (a < 0) { p.sq = -.3 * pull + .03 * Math.sin(t * 55) * pull; p.dy = -.3 * pull; }
        else p.sq = .25 * Math.exp(-8 * a) * Math.cos(25 * a);
        if (t > 18.2 && a < 0 && hash(Math.floor(t * 12) + 7) > .45) { p.hat = null; helm = 'head'; }
        if (a >= 0) { p.hat = null; helm = 'hands'; }
      }
    } else {
      helm = 'hand';
      p.aL = -.3 + .06 * Math.sin(t * 1.3);
      if (t > HAND_T[0]) p.aL = kf(t, [[HAND_T[0], -.3 + .06 * Math.sin(HAND_T[0] * 1.3)], [HAND_T[1], 1.12], [HAND_T[1] + .2, 1.0]], easeOut) + .03 * Math.sin(t * 2);
      if (t > 25.2 && t < 25.7) p.lookX = kf(t, [[25.2, 0], [25.35, 1]]);
      if (t > 26.0 && t < 27.6) p.rot = .06 * ease(seg(t, 26.0, 26.5)) * (1 - ease(seg(t, 27.3, 27.6)));
      if (t > LOOKS[0][0]) { p.lookX = kf(t, LOOKS, easeOut); p.lookY = 0; }
      if (t > 32.45 && t < 32.95) p.squint = kf(t, [[32.45, 0], [32.62, 1]]);
    }
    const o = merge(m, p);
    return { x: CX, y: SY, o, helm };
  }
  // where the helmet is (rim middle) and its tilt
  function helmPos(t, c) {
    if (c.helm === 'cable') {
      let x = CX, y = t < 2.7 ? lerp(Y0, HOVER, ease(seg(t, 0, 2.7))) : HOVER;
      const bob = (1 - seg(t, 4.4, 4.85)) * seg(t, 2.4, 3.0);
      y += bob * 9 * Math.sin((t - 2.4) * 3);
      let a = bob * .05 * Math.sin((t - 2.4) * 2.1);
      if (t > 4.93) { const k = ease(seg(t, 4.93, 5.05)), h = bodyPt(c.x, c.y, U, c.o, 0, -RIM); x = lerp(x, h[0], k); y = lerp(y, h[1], k); a *= 1 - k; }
      return { x, y, a };
    }
    if (c.helm === 'head') { const h = bodyPt(c.x, c.y, U, c.o, 0, -RIM); return { x: h[0], y: h[1], a: c.o.rot || 0, onHead: true }; }
    if (c.helm === 'hands') {
      const l = armTip(c.x, c.y, U, c.o, 'L'), r = armTip(c.x, c.y, U, c.o, 'R'), lift = 60 * easeOut(seg(t, 18.85, 19.0));
      return { x: (l[0] + r[0]) / 2, y: (l[1] + r[1]) / 2 - .2 * U - lift, a: 0 };
    }
    if (c.helm === 'hand') { const h = armTip(c.x, c.y, U, c.o, 'L'); return { x: h[0] - 5.35 * U, y: h[1] + .2 * U, a: -.06 + .03 * Math.sin(t * 1.7) }; }
    return null;
  }

  // ---------- the friend ----------
  const FMOOD = [[0, 'happy'], [24.9, 'happy', { lookX: -1 }], [26.1, 'happy', { lookX: -.8, blush: .7 }], [27.6, 'hopeful', { lookX: -1 }]];
  const FWALK = [22.0, 23.9], UMB_MOVE = [24.15, 24.8];
  function friendAt(t) {
    if (t < FWALK[0]) return null;
    const m = emotions(t, FMOOD);
    let x, p;
    if (t < FWALK[1]) {
      const k = seg(t, ...FWALK), e = 1 - Math.pow(1 - k, 1.7);
      x = lerp(1440, FX, e);
      const walk = (1440 - x) / (3.4 * U);
      p = { view: 'side', flip: true, walk, aL: 1.3, dy: -Math.abs(Math.sin(walk * TAU)) * .35, lookX: 0 };
    } else {
      x = FX;
      p = { ...turn(t, FWALK[1], FWALK[1] + .2, -.25, 0), aL: 1.3 };
      if (t > 26.0) p.rot = -.07 * ease(seg(t, 26.0, 26.5));
    }
    return { x, y: SY, o: merge(m, { ...p, ...FCOL, hat: 'beanie', boilKey: 'friend' }) };
  }
  // the umbrella: apex over the friend while walking, then moved over both of them
  const UR = 255, UH = 150;
  function umbAt(t, f) {
    if (!f) return null;
    const hand = armTip(f.x, f.y, U, f.o, 'L');
    const ax = t < UMB_MOVE[0] ? f.x - 20 : lerp(FX - 20, 682, backOut(seg(t, ...UMB_MOVE))), ay = SY - 395;
    return { hand, ax, ay, a: .12 * Math.sin(t * 1.1) * .2 + (t < FWALK[1] ? -.05 : 0) };
  }
  function umbrella(u, t) {
    const { hand, ax, ay, a } = u;
    boilSeed('pole');
    inkLine([hand, [ax, ay]], 3.4, '#3B3448', 'ink', 0);
    inkLine([[hand[0], hand[1] - 4], [hand[0], hand[1] + 22], [hand[0] - 14, hand[1] + 30], [hand[0] - 22, hand[1] + 20]], 3.4, '#3B3448', 'ink', .6);
    const P = [];
    for (let i = 0; i <= 20; i++) { const g = Math.PI + i / 20 * Math.PI; P.push([Math.cos(g) * UR, UH + Math.sin(g) * UH]); }
    const ribs = 6;
    for (let r = ribs; r > 0; r--) { const xa = -UR + r * 2 * UR / ribs, xb = xa - 2 * UR / ribs; P.push([lerp(xa, xb, .5), UH - 26]); P.push([xb, UH]); }
    boilSeed('canopy');
    push(); translate(ax, ay); rotate(a);
    paint(P, { wash: RED, ink: PAL.ink, sw: 1.3, curv: .15 });
    paint(ellPts(-UR * .42, UH * .42, UR * .32, UH * .22, 14, 0, -.5), { wash: '#E9707F', ink: null });
    for (let r = 1; r < ribs; r++) inkLine([[0, 0], [(-UR + r * 2 * UR / ribs) * .6, UH * .38], [-UR + r * 2 * UR / ribs, UH]], .9, '#8E1F30', 'inkfine', .5);
    paint(ellPts(0, -6, 7, 9, 8), { wash: '#3B3448', ink: null });
    pop();
    // drips off the rib tips
    for (let r = 0; r <= ribs; r++) {
      const ph = frac(t * 1.3 + hash(r + 40)), tip = rot2([-UR + r * 2 * UR / ribs, UH], a);
      boilSeed('udrip' + r);
      paint(ellPts(ax + tip[0], ay + tip[1] + 6 + ph * 170, 4, 6, 8), { wash: '#BFD3E6', washOp: 255 * (1 - ph), ink: null });
    }
  }

  // ---------- the worlds ----------
  function rainWorld(t, o = {}) {
    const P = PALS.rain;
    streetFlat(P, false);
    streetInk(P, t, false);
    if (inView(LAMP_X, 880, LAMP_X + 120, 980)) glow(LAMP_X + 80, 935, 120, '#E8C98A', .35);
    const c = clawdAt(t), f = friendAt(t), um = umbAt(t, f), hp = helmPos(t, c);
    const shelter = um ? [um.ax - UR + 25, um.ax + UR - 25, um.ay + 50] : null;
    ripples(t, shelter);
    boilSeed('shadowMe');
    clawd(c.x, c.y, U, { ...c.o, boilKey: 'me', draw: hp && hp.onHead ? helmetHook(c.o, ledsAt(t), o.eyeHook) : o.eyeHook });
    if (f) { clawd(f.x, f.y, U, f.o); umbrella(um, t); }
    const wet = 1 - (shelter && CX > shelter[0] && CX < shelter[1] ? seg(t, 24.5, 25.0) : 0);
    if (t < 3.6 || t > T_OFF) for (let i = 0; i < 3; i++) {   // Clawd drips
      const ph = frac(t * .9 + hash(i + 3)), [dx, dy] = bodyPt(c.x, c.y, U, c.o, [-4.7, 4.7, -1.2][i], -2);
      boilSeed('drip' + i);
      paint(ellPts(dx, dy + ph * 2.2 * U, .22 * U, .3 * U, 8), { wash: '#C3D4E6', washOp: 255 * wet * (1 - ph * .6), ink: null });
    }
    if (hp && !o.noHelmet) helmetLayer(t, c, hp);
    if (um && t > 25.3) glow(um.ax, SY - 160, 280, WARM, .3 * seg(t, 25.3, 26.3));
    rain(t, shelter, hp && !o.noHelmet ? [hp.x, hp.y - 2 * U] : null);
    if (o.after) o.after(c, hp, um);
  }
  // the helmet in the rain world: glow, cable, helmet (on the head it's drawn by clawd())
  function helmetLayer(t, c, hp, k = null) {
    const lure = t > 27.4 ? 1 + .35 * ease(seg(t, 27.4, 28.2)) : 1;
    const g = k ?? (t < 5.4 ? glowK(t) : t < T_SNAP ? glowK(t) * (1 + 1.2 * ease(seg(t, 5.4, 6.2))) : t > T_OFF ? .8 * lure * glowK(t) : glowK(t));
    helmetGlow(hp.x, hp.y, g, 1);
    if (!hp.onHead) helmetAt(hp.x, hp.y, hp.a, t, { leds: ledsAt(t) });
    else if (VIEW.y0 < hp.y - 5 * U) { const top = [hp.x, hp.y - 5.1 * U]; boilSeed('cable'); inkLine([top, [top[0] + 4, top[1] - 200], [top[0] + 10, VIEW.y0 - 80]], 2.4, '#2A2D38', 'ink', .5); }
    if (t > 27.4 && t < T_BLACK) for (let i = 0; i < 7; i++) {   // the lure: little gold glints of the paradise circling it
      const a = t * 1.3 + i * TAU / 7, r = (110 + 30 * Math.sin(t * 2 + i)) * seg(t, 27.4, 28.0), k2 = frac(t * .9 + hash(i));
      boilSeed('lure' + i);
      sparkle(hp.x + Math.cos(a) * r, hp.y - 2 * U + Math.sin(a) * r * .7, 15, k2, i % 2 ? '#FFE08A' : '#F6B8C8');
    }
  }
  function paradise(t) {
    const P = PALS.para, clock = t > 15.3;
    streetFlat(P, true);
    carpet();
    sun(t);
    streetInk(P, t, true);
    bunting(t);
    goldPools(t);
    crowd(t, CROWD_BACK, 'cb', clock);
    cake(t);
    const c = clawdAt(t), hp = helmPos(t, c);
    // the slice flies in from the crowd, into the open lunchbox
    if (t > SLICE_T[0] && t < SLICE_T[1]) {
      const k = seg(t, ...SLICE_T), [x, y] = arcPt([930, SY - 470], [CX + 60, SY - 5.4 * U], 200, easeIn(k) * .4 + k * .6);
      slice(x, y, -1.6 + k * 1.6, 1.25);
    }
    boilSeed('shadowMe');
    clawd(c.x, c.y, U, { ...c.o, boilKey: 'me', draw: hp && hp.onHead ? helmetHook(c.o, ledsAt(t)) : undefined });
    if (hp && !hp.onHead) { helmetGlow(hp.x, hp.y, 1.2, .8); helmetAt(hp.x, hp.y, hp.a, t, { cable: false, leds: ledsAt(t) }); }
    for (const ch of CHOMPS) {   // crumbs
      const a = t - ch; if (a < 0 || a > .6) continue;
      for (let i = 0; i < 6; i++) {
        const ang = (i % 2 ? 0 : Math.PI) + (hash(i + ch * 10) - .5) * 1.4, v = 260 + 200 * hash(i + 3), x = CX + (i % 2 ? 4.6 : -4.6) * U + Math.cos(ang) * v * a, y = SY - 5.4 * U - 300 * a + 900 * a * a;
        boilSeed('crumb' + i);
        paint(ellPts(x, y, 7, 6, 8), { wash: i % 3 ? '#F4BCCB' : '#FFF5E2', ink: PAL.ink, sw: .4 });
      }
    }
    flushBrush();   // the front row and the confetti are flat and sit over everything
    crowd(t, CROWD_FRONT, 'cf', clock);
    confetti(t);
  }

  // ---------- frame and effects ----------
  function glitchAt(t) {
    for (const [a, b] of GLITCH) if (t >= a && t < b) {
      const edge = t < a + .09 || t >= b - .09 || (b - a > .8 && Math.abs(t - (a + b) / 2) < .045);
      return { kind: edge ? 'tear' : 'lab', f: Math.floor(t * 12) };
    }
    for (const [a, b] of TEARS) if (t >= a && t < b) return { kind: 'tear', f: Math.floor(t * 12) };
    return null;
  }
  function tearFX(f, heavy) {
    flushBrush();
    const n = heavy ? 8 : 3, cols = ['#5FE6FF', '#FF5FA8', '#141A26', '#FFE08A', '#141A26', '#E9F7FF'];
    for (let i = 0; i < n; i++) {
      const y = hash(f * 13.1 + i * 7.7) * H, h = (heavy ? 14 : 5) + (heavy ? 150 : 26) * Math.pow(hash(f * 5.3 + i), 2), dx = (hash(f * 3.9 + i * 1.3) - .5) * 220;
      flatA(rectPts(dx - 60, y, W + 120, h), cols[Math.floor(hash(f * 2.2 + i * 9.1) * cols.length)], heavy ? .9 : .75);
    }
    if (heavy) for (let i = 0; i < 2; i++) { const y = hash(f * 1.7 + i) * H; flatA(rectPts(-20, y, W + 40, 4), '#5FE6FF', .9); flatA(rectPts(-20, y + 6, W + 40, 4), '#FF5FA8', .9); }
  }
  function frame(t, c, o = {}) {
    const g = t >= T_SNAP && t < T_OFF ? glitchAt(t) : null;
    const cc = g && g.kind === 'tear' ? [c[0] + (hash(g.f * 1.3) - .5) * 90, c[1], c[2]] : c;
    cam(cc);
    if (t < T_SNAP || t >= T_OFF) rainWorld(t, o);
    else if (g && g.kind === 'lab') lab(t);
    else paradise(t);
    camEnd();
    if (g) tearFX(g.f, g.kind === 'tear');
    if (o.flash > .01) { flushBrush(); flatA(SCREEN, '#FFF6DA', o.flash); }
  }

  // ---------- shots ----------
  const hyA = t => lerp(Y0, HOVER, ease(seg(t, 0, 2.7)));
  const camA = t => [CX, lerp(hyA(t) + 300, SY - 210, ease(seg(t, 1.0, 2.8))), lerp(1.25, 1.32, ease(seg(t, 1.5, 3.6)))];

  // A 0–3.6: from the dark, the glowing helmet sinks into the grey rain in front of sad Clawd
  function shotA(t) {
    const c = camA(t), fade = 1 - ease(seg(t, .15, 1.1));
    if (fade <= 0) { frame(t, c); return; }
    cam(c); rainWorld(t, { noHelmet: true }); camEnd();
    flushBrush(); flatA(SCREEN, DARK, fade);
    cam(c); const cl = clawdAt(t); helmetLayer(t, cl, helmPos(t, cl)); camEnd();
  }
  // B 3.6–6.2: the light on Clawd's face; the jump into the helmet; the lights come on; flash
  function shotB(t) {
    const sh = shakeXY(t, 10 * Math.exp(-(t - 5.35) * 7) * (t > 5.35 ? 1 : 0) + 5 * seg(t, 5.7, 6.2));
    const c = [CX + sh[0], lerp(SY - 230, SY - 250, seg(t, 3.6, 6.2)) + sh[1], lerp(1.72, 1.98, ease(seg(t, 3.6, 6.2)))];
    frame(t, c, { flash: easeIn(seg(t, 5.95, 6.2)) });
  }
  // C 6.2–11.9: paradise; pull back to the crowd; the cake; G1
  function shotC(t) {
    let c;
    if (t < 6.9) c = [CX, SY - 250, 1.98 - .05 * seg(t, 6.2, 6.9)];
    else if (t < 8.9) c = mixCam([CX, SY - 250, 1.93], [CX, SY - 440, 1.0], ease(seg(t, 6.9, 8.9)));
    else if (t < 10.15) c = mixCam([CX, SY - 440, 1.0], [CX, 1010, 1.02], ease(seg(t, 8.95, 10.1)));
    else c = mixCam([CX, 1010, 1.02], [CX, SY - 270, 1.4], ease(seg(t, 10.15, 11.0)));
    frame(t, c, { flash: 1 - easeOut(seg(t, 6.2, 6.6)) });
  }
  // D 11.9–15.3: the slice, chomping, G2, frozen; E 15.3–17.6: looking round, G3, scared (one slow push in)
  function shotDE(t) {
    let c;
    if (t < 15.3) c = [CX, lerp(SY - 215, SY - 205, seg(t, 11.9, 15.3)), lerp(1.55, 1.72, ease(seg(t, 11.9, 15.3)))];
    else c = mixCam([CX, SY - 205, 1.72], [CX, SY - 6.6 * U, 2.75], ease(seg(t, 15.3, 17.2)));
    frame(t, c);
  }
  // F 17.6–19.0: the decision; pulling the crown off
  function shotF(t) {
    const sh = t > 18.85 ? shakeXY(t, 14 * Math.exp(-(t - 18.85) * 9)) : [0, 0];
    frame(t, [CX + sh[0], lerp(SY - 260, SY - 300, ease(seg(t, 17.6, 19.0))) + sh[1], lerp(1.66, 1.5, ease(seg(t, 17.6, 19.0)))]);
  }
  // G 19.0–22.6: smash cut to the rain; pull back: alone
  function shotG(t) {
    frame(t, mixCam([470, SY - 205, 1.5], [560, SY - 420, .82], ease(seg(t, 19.5, 22.3))));
  }
  // H 22.6–27.4: the friend and the umbrella
  function shotH(t) {
    frame(t, [lerp(705, 680, seg(t, 22.6, 27.4)), lerp(SY - 230, SY - 215, seg(t, 22.6, 27.4)), lerp(1.2, 1.36, ease(seg(t, 22.6, 27.4)))]);
  }
  // I 27.4–33.4: helmet or friend; push in on the eyes
  const EYES = [CX, SY - 6.1 * U];
  function shotI(t) {
    let c;
    const two = [lerp(560, 548, seg(t, 28.4, 30.6)), SY - 228, lerp(1.2, 1.28, seg(t, 28.4, 30.6))];
    if (t < 28.4) c = mixCam([680, SY - 215, 1.36], [560, SY - 228, 1.2], ease(seg(t, 27.4, 28.4)));
    else if (t < 30.6) c = two;
    else if (t < 31.6) c = mixCam([548, SY - 228, 1.28], [...EYES, 4.2], ease(seg(t, 30.6, 31.6)));
    else c = [EYES[0], EYES[1], lerp(4.2, 5.0, ease(seg(t, 31.6, 33.4)))];
    frame(t, c, { after: (cl, hp) => { if (t > 30.4) { const k = seg(t, 30.4, 31.2); glow(hp.x + 60, hp.y - 2 * U, 13 * U, GLOW, .55 * k); glow(CX + 10 * U, SY - 6 * U, 10 * U, WARM, .45 * k); } } });
  }
  // J 33.4–36: black; the helmet glows in the dark (= the first frame)
  function shotJ(t) {
    flat(SCREEN, DARK);
    const k = ease(seg(t, 34.2, 35.2)); if (k <= 0) return;
    const c = camA(0);
    cam(c);
    const y = Y0 + 10 * wob(t, .25) * seg(t, 34.2, 35.0), a = .04 * wob(t, .25) * seg(t, 34.2, 35.0);
    helmetGlow(CX, y, glowK(t), k);
    helmetAt(CX, y, a, t, { leds: ledsAt(t - 36).map(v => v * k) });
    camEnd();
    if (k < 1) { flushBrush(); flatA(SCREEN, DARK, 1 - k); }
  }

  shots([[0, shotA], [3.6, shotB], [6.2, shotC], [11.9, shotDE], [17.6, shotF], [19.0, shotG], [22.6, shotH], [27.4, shotI], [33.4, shotJ]]);
})();
