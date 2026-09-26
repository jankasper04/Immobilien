// hilbert.js: "Hilberts Hotel", 40 s, 9:16. The storyboard is STORYBOARD_hilbert.md.
// One endless hotel tower, one clock. Where every guest is, is a pure function of time: guest n sits in room n until
// the first bell, then in room n + 1. After the second bell the guest of room n sits in room 2n, and bus passenger p
// moves into room 2p - 1. The shots only choose cameras and transitions. The tower is drawn for the visible floors
// only, so it never ends, and there are no numbers anywhere: a room is a window, taken is lit, free is dark.
(() => {
  // ---------- world ----------
  const GY = 1700;                                        // the ground line
  const TX = 540, TW = 540, TL = TX - TW / 2, TR = TX + TW / 2;   // the tower
  const LOB = 540, FH = 290, WW = 250, WH = 196;          // lobby height, floor height, window size
  const GU = 13, PU = 11, U = 24, CX = 540;               // guest unit, bus passenger unit, Clawd's unit and place
  const base = r => GY - LOB - (r - 1) * FH;              // floor line of room r (room 1 is the lowest)
  const sill = r => base(r) - 40;                         // where a guest stands in room r
  const roomAt = y => (GY - LOB - y) / FH + 1;            // fractional room at world height y
  const DESK = { x0: 372, x1: 700, top: GY - 78 };
  const DB = [676, GY - 78];                              // the desk bell (foot)
  const BIG = [396, GY - 486];                            // the big bell's hinge
  const GX = 774;                                         // arriving guests stand here, facing left
  const SEAT = 210, NOSE = 170, BUS_Y = GY + 150;         // bus: seat spacing, nose length, wheel line
  const BUS_TOP = BUS_Y - 350, BUS_BOT = BUS_Y - 50, WIN_T = BUS_Y - 318, WIN_B = BUS_Y - 190;
  const C = {
    facade: '#B89A9E', facadeDk: '#9A7C8C', facadeLt: '#CBB0AE', trim: '#76597A', trimLt: '#E2CDBF',
    lobby: '#8A6C86', door: '#2F5160', lit: '#FFD98A', glow: '#FFC766', dark: '#2A2C58', frame: '#EFE0CC',
    curtain: '#B8455A', sil: '#35273F', rim: '#FFE3A6', eye: '#FFF1C4', trail: '#FFD27A',
    brass: '#E6AE3E', brassDk: '#A8741E', wood: '#7A4535', woodLt: '#9A5D45', rope: '#D8B27A',
    walk: '#6A5E7E', street: '#3F3853', bus: '#E8AA38', busRoof: '#F2C96B', busStripe: '#C8543E', busLit: '#FFE3A0',
    awn: '#C8455A', case: '#8A5A3C',
  };
  const N1COL = { col: '#9C8AD0', dk: '#6C5AA6', lt: '#D2C6F2', hat: 'beanie' };   // guest 1
  const N2COL = { col: '#78C29C', dk: '#4A9070', lt: '#BDE7CF', hat: 'top' };      // guest 2, at the end

  // ---------- the clock ----------
  const lin = (s, K) => kf(s, K, x => x);
  const DING = [.5, 36.25, 39.35];                       // a guest slaps the desk bell
  const DONG = [7.2, 20.4];                               // Clawd rings the big bell (on beats 12 and 34)
  const UP1 = 7.8, LAND1 = 10.25;                         // move 1: everyone one up, with slow motion in the middle
  const K1 = t => lin(t, [[UP1, 0], [UP1 + .3, .3], [9.75, .6], [LAND1, 1]]);
  const N1HOP = [12.55, 13.35];                           // guest 1 hops into room 1
  const BUS_IN = [14.5, 15.6], BUS_OUT = [31.0, 33.2];
  const UP2 = 20.95, LAND2 = 22.05;                       // move 2: room n to room 2n
  const FAN0 = 27.3, FAN_DT = .12, FAN_FLY = 1.15;        // bus passenger p leaves at fanT0(p) for room 2p - 1
  const fanT0 = p => FAN0 + (p - 1) * FAN_DT;
  const N2WALK = [34.0, 35.7];

  // ---------- camera and flat colour ----------
  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    VIEW = { x0: cx - W / 2 / z, x1: cx + W / 2 / z, y0: cy - H / 2 / z, y1: cy + H / 2 / z, z, cx, cy };
  }
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  // flat colour for big backgrounds and irises (see theseus.js: huge washes are slow on software WebGL)
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const inView = (x0, y0, x1, y1, m = 60) => x1 > VIEW.x0 - m && x0 < VIEW.x1 + m && y1 > VIEW.y0 - m && y0 < VIEW.y1 + m;
  // many glows at once: one flush, then additive light (glow() flushes for every call)
  function glows(G) {
    if (!G.length) return;
    flushBrush();
    push(); blendMode(ADD);
    for (const [x, y, r, col, a] of G) { const c = color(col); tint(red(c), green(c), blue(c), 150 * clamp(a)); image(glowTex, x - r, y - r, 2 * r, 2 * r); }
    noTint(); blendMode(BLEND); pop();
  }
  // a window: square at the bottom, round at the top
  function archPts(x, y, w, h, r) {
    const P = [[x, y + h]];
    for (let i = 0; i <= 5; i++) { const a = Math.PI + i / 5 * Math.PI / 2; P.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]); }
    for (let i = 0; i <= 5; i++) { const a = 1.5 * Math.PI + i / 5 * Math.PI / 2; P.push([x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]); }
    P.push([x + w, y + h]);
    return P;
  }
  const sparkle = (x, y, r, k) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: '#FFF5E2', washOp: 255 * (1 - k * k), ink: null }); };

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
  function merge(m, p) {
    const o = { ...m, ...p };
    o.dy = (m.dy || 0) + (p.dy || 0); o.sq = (m.sq || 0) + (p.sq || 0); o.rot = (m.rot || 0) + (p.rot || 0);
    return o;
  }

  // ---------- who is where ----------
  const seedOf = id => typeof id === 'number' ? id : id === 'N1' ? 901 : id === 'N2' ? 902 : 3000 + +id.slice(1);
  // hat silhouettes, as points along the top edge of the body (body: x -5..5, y -8..-2, legs to 0)
  const HATS = {
    plain: [],
    top: [[-3.9, -8], [-3.9, -8.7], [-2.6, -8.7], [-2.6, -12.3], [2.6, -12.3], [2.6, -8.7], [3.9, -8.7], [3.9, -8]],
    party: [[-1.9, -8], [0, -12.6], [1.9, -8]],
    cat: [[-4.9, -8], [-4.3, -11], [-1.9, -8], [1.9, -8], [4.3, -11], [4.9, -8]],
    bow: [[1.1, -8], [1.2, -9.8], [2.6, -8.6], [4, -9.8], [4.1, -8]],
    beanie: [[-3.9, -8], [-3.6, -9.4], [-2.6, -10.3], [-.9, -10.8], [-.8, -11.5], [0, -12.1], [.8, -11.5], [.9, -10.8], [2.6, -10.3], [3.6, -9.4], [3.9, -8]],
    crown: [[-3, -8], [-3, -10.8], [-1.5, -9.3], [0, -11.2], [1.5, -9.3], [3, -10.8], [3, -8]],
    fedora: [[-4.6, -8], [-4.6, -8.7], [-2.8, -8.7], [-2.3, -10.9], [0, -10.3], [2.3, -10.9], [2.8, -8.7], [4.6, -8.7], [4.6, -8]],
    antenna: [[-.3, -8], [-.3, -10.5], [-.9, -11.1], [0, -12], [.9, -11.1], [.3, -10.5], [.3, -8]],
  };
  const TYPES = ['plain', 'top', 'party', 'cat', 'bow', 'crown', 'fedora', 'antenna', 'plain', 'cat', 'party'];
  const typeOf = id => id === 'N1' ? 'beanie' : id === 'N2' ? 'top' : TYPES[Math.floor(hash(seedOf(id) * 7.31 + 2) * TYPES.length)];

  // how lit room r's window is (0..1): lit = taken
  function lightOf(r, t) {
    if (r % 2 === 1 && t >= UP2) {
      const land = fanT0((r + 1) / 2) + FAN_FLY;
      return t < land ? 1 - seg(t, UP2 + .04, UP2 + .14) : seg(t, land, land + .12);
    }
    if (r === 1 && t >= UP1) return t < N1HOP[1] ? 1 - seg(t, UP1 + .04, UP1 + .14) : seg(t, N1HOP[1], N1HOP[1] + .12);
    return 1;
  }
  // who stands in room r's window at t (null while its guests are in the air, or when it's free)
  function restingIn(r, t) {
    if (t < UP1) return { id: r };
    if (t < LAND1) return null;
    if (t < UP2) return r >= 2 ? { id: r - 1, land: LAND1 } : t >= N1HOP[1] ? { id: 'N1', land: N1HOP[1] } : null;
    if (t < LAND2) return null;
    if (r % 2 === 0) { const s = r / 2; return { id: s === 1 ? 'N1' : s - 1, land: LAND2 }; }
    const p = (r + 1) / 2, land = fanT0(p) + FAN_FLY;
    return t >= land ? { id: 'P' + p, land } : null;
  }
  const blinkOf = (sd, t) => { const per = 2.6 + 2 * hash(sd + 9), ph = frac(t / per + hash(sd + 4)); return ph < .045 ? 1 - Math.abs(ph / .0225 - 1) : 0; };
  // a guest standing in a window: bobbing on the beat, reacting to the bells, crouching before a jump, landing
  function restPose(id, t, land, r) {
    const sd = seedOf(id), b = bpOf(t) + hash(sd) * 4, s1 = Math.sin(b * Math.PI), ab = Math.abs(s1);
    const o = { dy: -.3 * ab, sq: .04 * pulse(t - hash(sd + 1) * BEAT), aL: -.35 + .18 * s1, aR: -.35 - .14 * Math.sin(b * Math.PI + 1), lookX: .5 * Math.sin(b * .5), lookY: 0 };
    if (t < 7.1) { o.lookY = .9; o.lookX = .6; }                    // all eyes on the newcomer at the desk
    for (const D of DONG) { const tk = take(t, D + .14 + .08 * hash(sd + 3), 1); o.sq += tk.sq; o.dy += tk.dy; }
    for (const Up of [UP1, UP2]) if (t < Up && t > Up - .42) {      // anticipation: crouch, arms back, look up
      const k = ease(seg(t, Up - .4, Up - .04)); o.sq += .3 * k; o.aL = lerp(o.aL, -1.1, k); o.aR = lerp(o.aR, -1.1, k); o.lookY = -1; o.lookX = 0;
    }
    if (land != null && t >= land) { const a = t - land; o.sq += .34 * Math.exp(-7 * a) * Math.cos(18 * a); }
    if (id === 'N1' && t > N1HOP[1] + .25 && t < UP2 - .5) { o.aR = 1.15 + .45 * Math.sin((t - N1HOP[1]) * TAU * 2.2); o.lookY = .8; o.lookX = .4; }   // waving down
    if (t > 32 && r != null) { o.lookY = .9; o.lookX = .5; }        // the end: all eyes on the next newcomer
    o.blink = blinkOf(sd, t);
    return o;
  }
  function passPose(p, t) {
    const sd = 3000 + p, b = bpOf(t) + hash(sd) * 4, s1 = Math.sin(b * Math.PI);
    const o = { dy: -.3 * Math.abs(s1), sq: 0, aL: -.35 + .15 * s1, aR: -.35 - .15 * s1, lookX: -.6, lookY: 0, blink: blinkOf(sd, t) };
    if (t > BUS_IN[1] - .2 && t < 18) { o.lookX = -.9; }
    if (t > 25.8) { o.lookY = -1; o.lookX = -.5; const tk = take(t, 25.95 + .1 * hash(sd), .8); o.sq += tk.sq; o.dy += tk.dy; }
    const t0 = fanT0(p), k = ease(seg(t, t0 - .34, t0 - .02)); o.sq += .3 * k; o.aL = lerp(o.aL, -1.1, k); o.aR = lerp(o.aR, -1.1, k);
    return o;
  }

  // every guest in the air at t, culled to the view. A flight: from p0 to p1 over k = 0..1, bulging sideways and up.
  const pathPt = (f, k) => [lerp(f.p0[0], f.p1[0], k) + f.side * f.bulge * Math.sin(Math.PI * k), lerp(f.p0[1], f.p1[1], k) - f.h * 4 * k * (1 - k)];
  function flightSeen(f) {
    for (let i = 0; i <= 8; i++) { const [x, y] = pathPt(f, i / 8); if (inView(x - 150, y - 200, x + 150, y + 60, 60)) return true; }
    return false;
  }
  function flights(t) {
    const out = [], lo = roomAt(VIEW.y1 + 400), hi = roomAt(VIEW.y0 - 400);
    if (t >= UP1 && t < LAND1) {                      // move 1: everyone one window up, all at the same moment
      const k = K1(t);
      for (let g = Math.max(1, Math.floor(lo) - 1); g <= Math.ceil(hi); g++)
        out.push({ id: g, p0: [TX, sill(g)], p1: [TX, sill(g + 1)], k, side: hash(g + .5) > .5 ? 1 : -1, bulge: 95, h: 70, s0: GU, s1: GU, rot: .35, fly: true });
    }
    if (t >= UP2 && t < LAND2 + 2) {                  // move 2: room r to room 2r; the higher, the farther
      const k = seg(t, UP2, LAND2), tail = ease(seg(t, LAND2 + .5, LAND2 + 1.9));
      for (let r = Math.max(1, Math.floor(lo / 2) - 1); r <= Math.ceil(hi) + 1; r++) {
        const f = { id: r === 1 ? 'N1' : r - 1, p0: [TX, sill(r)], p1: [TX, sill(2 * r)], k, side: r % 2 ? -1 : 1, bulge: 120 + 75 * Math.sqrt(r), h: 50 + 16 * r, s0: GU, s1: GU, rot: .45, tail, fly: t < LAND2 };
        if (flightSeen(f)) out.push(f);
      }
    }
    const bx = busAt(t);
    if (t > FAN0 - .1 && bx != null) for (let p = 1; p <= 90; p++) {   // the bus passengers, one after another
      const t0 = fanT0(p), t1 = t0 + FAN_FLY;
      if (t < t0 || t > t1 + 1.7) continue;
      const P0 = [seatX(bx, p), WIN_B + 30], P1 = [TX + 30, sill(2 * p - 1)], d = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
      const f = { id: 'P' + p, p0: P0, p1: P1, k: seg(t, t0, t1), side: 0, bulge: 0, h: 240 + .1 * d, s0: PU, s1: GU, rot: -.3, tail: ease(seg(t, t1 + .3, t1 + 1.6)), fly: t < t1 };
      if (flightSeen(f)) out.push(f);
    }
    return out;
  }
  function flyPose(f, t) {
    const k = f.k, sd = seedOf(f.id);
    return { sq: -.22 * Math.sin(Math.PI * k) + .22 * (1 - seg(k, 0, .08)), aL: 1.15 + .25 * Math.sin(t * 9 + sd), aR: 1.3 + .25 * Math.sin(t * 8 + sd * 2),
             rot: f.rot * Math.sin(Math.PI * k) * (f.side || 1), lookY: -.9, lookX: 0, tuck: true, blink: 0 };
  }

  // ---------- painted pieces ----------
  // a guest as a backlit silhouette: one shape (body, legs, arm nubs, hat) with a warm rim, and two glowing eyes
  function silPts(type, o) {
    const P = [[-5, -8], ...HATS[type], [5, -8]];
    const arm = a => { const d = [Math.cos(a), -Math.sin(a)], n = [Math.sin(a), Math.cos(a)], c = [5 + d[0] * 1.9, -4.5 + d[1] * 1.9];
      return [[5, -5], [c[0] - n[0] * .5, c[1] - n[1] * .5], [c[0] + n[0] * .5, c[1] + n[1] * .5], [5, -4]]; };
    P.push(...arm(o.aR ?? -.35), [5, -2]);
    const L = o.tuck ? 1.1 : 2.1;
    for (const lx of [3, 1, -2, -4]) P.push([lx + 1, -2], [lx + 1, -2 + L], [lx, -2 + L], [lx, -2]);
    P.push([-5, -2], ...arm(o.aL ?? -.35).map(([x, y]) => [-x, y]).reverse());
    return P;
  }
  function sil(x, y, s, type, o = {}) {
    const sq = o.sq || 0, sx = 1 + sq * .6, sy = 1 - sq, r = o.rot || 0, c = Math.cos(r), sn = Math.sin(r), dy = (o.dy || 0) * s;
    const T = ([px, py]) => { const X = px * s * sx, Y = py * s * sy; return [x + X * c - Y * sn, y + dy + X * sn + Y * c]; };
    boilSeed(o.key || 'sil');
    paint(silPts(type, o).map(T), { wash: C.sil, ink: C.rim, sw: .75 });
    if (s * VIEW.z > 4.5) {
      const lx = .55 * (o.lookX || 0), ly = .5 * (o.lookY || 0), h = 2 * (1 - (o.blink || 0) * .9);
      for (const ex of [-2.5, 2.5]) paint([[ex - .45 + lx, -6 + ly - h / 2], [ex + .45 + lx, -6 + ly - h / 2], [ex + .45 + lx, -6 + ly + h / 2], [ex - .45 + lx, -6 + ly + h / 2]].map(T), { wash: C.eye, ink: null });
    }
  }

  // sky: bands from warm dusk at the horizon to deep night far up, over whatever the camera sees
  const SKY = [[-300, '#C98492'], [450, '#93649C'], [1400, '#514688'], [3200, '#2E3068'], [8000, '#1E2254'], [16000, '#14173B']];
  function skyAt(y) {
    const h = GY - y;
    if (h <= SKY[0][0]) return SKY[0][1];
    for (let i = 1; i < SKY.length; i++) if (h < SKY[i][0]) return mixCol(SKY[i - 1][1], SKY[i][1], (h - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
    return SKY[SKY.length - 1][1];
  }
  function sky() {
    const { x0, x1, y0, y1, z } = VIEW, m = 160 / z, top = y0 - m, bot = Math.min(y1 + m, GY + 20);
    if (bot <= top) return;
    const n = 8, X0 = x0 - m, X1 = x1 + m, st = (X1 - X0) / 10, amp = 16 / z;
    const edge = (i, x) => i === 0 ? top : i === n ? bot + 2 : lerp(top, bot, i / n) + amp * Math.sin(x * .003 + i * 1.7);
    for (let i = 0; i < n; i++) {
      const P = [];
      for (let k = 0; k <= 10; k++) P.push([X0 + k * st, edge(i, X0 + k * st)]);
      for (let k = 10; k >= 0; k--) P.push([X0 + k * st, edge(i + 1, X0 + k * st) + 1]);
      flat(P, skyAt(lerp(top, bot, (i + .5) / n)));
    }
  }
  // stars and moon live far away: they drift down slowly as the camera climbs (parallax) and keep their screen size
  function starsMoon(t) {
    const { z, cx, cy } = VIEW, climb = (GY - 700 - cy) * z;
    const toW = (sx, sy) => [cx + (sx - W / 2) / z, cy + (sy - H / 2) / z];
    for (let i = 0; i < 46; i++) {
      const sx = hash(i + 3) * W, sy = ((hash(i + 60) * H * 1.25 + climb * .08) % (H * 1.25)) - H * .12;
      const [wx, wy] = toW(sx, sy), k = seg(GY - wy, 900, 2600);
      if (k < .05 || (wx > TL - 30 && wx < TR + 30)) continue;
      const tw = .6 + .4 * Math.sin(t * (2 + 2 * hash(i + 9)) + i), r = (3 + 5 * hash(i + 7)) * tw / z;
      boilSeed('star' + i);
      paint(starPts(wx, wy, r, .35, 4), { wash: '#FFF5E2', washOp: 255 * k * Math.min(1, .5 + tw), ink: null });
    }
    const [mx, my] = toW(880, 250 + climb * .045);
    if (mx > TR + 60 / z && GY - my > 900) {
      glow(mx, my, 230 / z, '#FFF1C8', .7);
      boilSeed('moon');
      paint(ellPts(mx, my, 50 / z, 50 / z, 24, 1 / z), { wash: '#FBF0D2', ink: null });
      paint(ellPts(mx + 14 / z, my - 10 / z, 12 / z, 9 / z, 12), { wash: '#E9DCBC', ink: null });
      paint(ellPts(mx - 16 / z, my + 14 / z, 8 / z, 6 / z, 10), { wash: '#E9DCBC', ink: null });
    }
  }
  // the town far behind, and the street
  function town() {
    const { x0, x1, y1 } = VIEW; if (y1 < GY - 560) return;
    for (let i = -16; i < 30; i++) {
      const bx = i * 140 - 30, w = 100 + 50 * hash(i + 11), h = 150 + 330 * hash(i + 31);
      if (bx + w < x0 - 60 || bx > x1 + 60) continue;
      flat(rectPts(bx, GY - h, w, h + 4), mixCol('#5A4A7E', '#6E5A8C', hash(i + 5)));
      for (let j = 0; j < 3; j++) if (hash(i * 3 + j) > .45) flat(rectPts(bx + 18 + 26 * j, GY - h + 30 + 50 * hash(i + j * 7), 12, 16), '#F4C98A');
    }
  }
  function street() {
    const { x0, x1, y1 } = VIEW; if (y1 < GY - 10) return;
    const X0 = x0 - 200, X1 = x1 + 200;
    flat(rectPts(X0, GY - 2, X1 - X0, 72), C.walk);
    flat(rectPts(X0, GY + 66, X1 - X0, Math.max(20, y1 + 300 - GY)), C.street);
  }
  function streetInk(t) {
    const { x0, x1, y1 } = VIEW; if (y1 < GY - 10) return;
    for (let x = Math.floor((x0 - 100) / 900) * 900; x < x1 + 100; x += 900) {
      boilSeed('curb' + x);
      inkLine([[x, GY + 66], [x + 910, GY + 66]], 1.1, PAL.ink, 'ink', 0);
      if (y1 > GY + 200) paint(rectPts(x + 120, GY + 262, 300, 12, 1), { wash: '#5E5676', ink: null });
    }
  }

  // the tower: flat facade, cornices and frames first, then the painted windows, their light, the guests, the sills
  const roomRange = () => [Math.max(1, Math.floor(roomAt(VIEW.y1 + 60))), Math.max(0, Math.ceil(roomAt(VIEW.y0 - 60)))];
  function towerFlat() {
    const { x0, x1, y0, y1, z } = VIEW;
    if (TR < x0 - 40 || TL > x1 + 40) return;
    const top = y0 - 200 / z, bot = Math.min(y1 + 50, GY);
    if (bot <= top) return;
    flat(rectPts(TL, top, TW, bot - top), C.facade);
    flat(rectPts(TR - 58, top, 58, bot - top), C.facadeDk);
    flat(rectPts(TL, top, 22, bot - top), C.facadeLt);
    if (bot > GY - LOB) flat(rectPts(TL, GY - LOB, TW, LOB), C.lobby);
    const [ra, rb] = roomRange();
    for (let r = ra; r <= rb; r++) {
      const b = base(r);
      flat(rectPts(TL - 18, b - 14, TW + 36, 24), C.trim);
      flat(rectPts(TL - 18, b - 14, TW + 36, 6), C.trimLt);
      flat(archPts(TX - WW / 2 - 16, sill(r) - WH - 16, WW + 32, WH + 16, 40), C.frame);
    }
  }
  function towerPaint(t) {
    const { x0, x1, y0, y1, z } = VIEW;
    if (TR < x0 - 40 || TL > x1 + 40) return;
    const top = y0 - 100 / z, bot = Math.min(y1 + 50, GY), [ra, rb] = roomRange(), piece = 1100 / z;
    for (let y = Math.floor(top / piece) * piece; y < bot; y += piece) for (const x of [TL, TR]) {
      boilSeed('edge' + x + '_' + Math.round(y / piece));
      inkLine([[x, Math.max(y, top)], [x, Math.min(y + piece + 4, bot)]], 1.3, PAL.ink, 'ink', 0);
    }
    const G = [];
    for (let r = ra; r <= rb; r++) {
      const L = lightOf(r, t), wy = sill(r) - WH;
      boilSeed('win' + r);
      paint(archPts(TX - WW / 2, wy, WW, WH, 30), { wash: mixCol(C.dark, C.lit, L), ink: PAL.ink, sw: .9 });
      if (L < .5 && z > .3) inkLine([[TX + 40, wy + 40], [TX + 90, wy + 10]], 1.4, '#5A5E92', 'inkfine', 0);   // a glint on dark glass
      if (L > .02) G.push([TX, wy + WH * .55, 250, C.glow, .6 * L]);
    }
    glows(G);
    for (let r = ra; r <= rb; r++) {
      const who = restingIn(r, t), wy = sill(r) - WH;
      if (who) sil(TX + (hash(seedOf(who.id) + 2) - .5) * 40, sill(r), GU, typeOf(who.id), { ...restPose(who.id, t, who.land, r), key: 'g' + r });
      if (z > .42) for (const s of [-1, 1]) {
        boilSeed('cur' + r + s);
        const xo = TX + s * WW / 2, P = [[xo, wy + 20], [xo - s * 58, wy + 14], [xo - s * 26, wy + 70], [xo - s * 12, wy + 150], [xo, wy + 160]];
        paint(P, { wash: C.curtain, ink: PAL.ink, sw: .6, curv: .5 });
      }
      boilSeed('sill' + r);
      paint(rectPts(TX - WW / 2 - 28, sill(r) - 6, WW + 56, 20, 1), { wash: C.trimLt, ink: PAL.ink, sw: .8 });
    }
  }
  // clouds far up the tower: the crane shots fly through them
  function clouds(t) {
    for (let i = 0; i < 9; i++) {
      const cy = GY - 6400 - i * 560 - 300 * hash(i + 4), w = 360 + 300 * hash(i + 6), cx = -900 + ((hash(i) * 2600 + t * (18 + 22 * hash(i + 2))) % 2800);
      if (!inView(cx - w, cy - 100, cx + w, cy + 40, 100)) continue;
      boilSeed('cloud' + i);
      paint(through([[cx - w, cy + 30], [cx - w * .8, cy - 18], [cx - w * .58, cy - 8], [cx - w * .38, cy - 70], [cx - w * .08, cy - 44], [cx + w * .2, cy - 100], [cx + w * .52, cy - 50], [cx + w * .76, cy - 62], [cx + w, cy + 30]], 5).concat([[cx - w, cy + 30]]),
        { wash: mixCol('#8C88BC', '#626096', hash(i + 8)), washOp: 235, ink: null });
    }
  }

  // ---------- the lobby: door, awning, desk, bells ----------
  function lobby(t) {
    if (!inView(TL - 100, GY - LOB, TR + 100, GY + 10)) return;
    const ax = CX, aw = 230;
    boilSeed('door');
    paint(archPts(ax - aw / 2, GY - 330, aw, 330, 100), { wash: C.door, ink: PAL.ink, sw: 1.2 });
    paint(archPts(ax - aw / 2 + 22, GY - 300, aw - 44, 300, 80), { wash: '#F2C98A', ink: PAL.ink, sw: .8 });
    inkLine([[ax, GY - 300], [ax, GY]], 1.2, PAL.ink, 'ink', 0);
    glows([[ax, GY - 200, 260, '#FFC766', .45]]);
    // the awning: red and cream stripes with a scalloped edge
    boilSeed('awning');
    const y0 = GY - 400, y1 = GY - 330, xa = ax - 190, xb = ax + 190;
    paint([[xa + 20, y0], [xb - 20, y0], [xb, y1], [xa, y1]], { wash: C.awn, ink: PAL.ink, sw: 1 });
    for (let i = 0; i < 5; i++) { const u0 = (2 * i + 1) / 10, u1 = (2 * i + 2) / 10; paint([[lerp(xa + 20, xb - 20, u0), y0 + 2], [lerp(xa + 20, xb - 20, u1), y0 + 2], [lerp(xa, xb, u1), y1], [lerp(xa, xb, u0), y1]], { wash: '#F3E4CF', ink: null }); }
    const sc = []; for (let i = 0; i <= 10; i++) { const x = lerp(xa, xb, i / 10); sc.push([x, y1]); if (i < 10) sc.push([x + (xb - xa) / 20, y1 + 22]); }
    paint(sc.concat([[xb, y1 - 2], [xa, y1 - 2]]), { wash: C.awn, ink: PAL.ink, sw: .8 });
    // two wall lamps
    const G = [];
    for (const lx of [TL + 60, TR - 60]) { boilSeed('lamp' + lx); paint(rrPts(lx - 16, GY - 300, 32, 46, 10), { wash: '#FFE7A8', ink: PAL.ink, sw: .8 }); G.push([lx, GY - 277, 140, '#FFC766', .8]); }
    glows(G);
  }
  function desk(t) {
    if (!inView(DESK.x0, DESK.top - 60, DESK.x1, GY)) return;
    boilSeed('desk');
    paint(rectPts(DESK.x0, DESK.top, DESK.x1 - DESK.x0, GY - DESK.top, 1.5), { wash: C.wood, ink: PAL.ink, sw: 1.2 });
    paint(rectPts(DESK.x0 - 14, DESK.top - 12, DESK.x1 - DESK.x0 + 28, 16, 1), { wash: C.woodLt, ink: PAL.ink, sw: 1 });
    for (const px of [DESK.x0 + 26, (DESK.x0 + DESK.x1) / 2 + 8]) paint(rectPts(px, DESK.top + 14, (DESK.x1 - DESK.x0) / 2 - 48, GY - DESK.top - 26, 1), { wash: '#6A3A2E', ink: PAL.ink, sw: .6 });
    inkLine([[DESK.x0 + 6, DESK.top + 6], [DESK.x1 - 6, DESK.top + 6]], 1.6, C.brass, 'inkfine', 0);
  }
  // the little desk bell: its button dips and it rings (spark strokes) when slapped
  function deskBell(t) {
    const [x, y] = DB;
    if (!inView(x - 60, y - 60, x + 60, y)) return;
    let press = 0, shake = 0;
    for (const d of DING) { const a = t - d; if (a > -.04 && a < .6) { press = Math.max(press, a < .08 ? 1 : 1 - seg(a, .08, .2)); shake += Math.exp(-6 * Math.max(0, a)) * Math.sin(a * 60) * (a > 0); } }
    boilSeed('dbell');
    paint(ellPts(x, y - 3, 30, 6, 16), { wash: '#4A3A4E', ink: PAL.ink, sw: .7 });
    push(); translate(x, y - 6); rotate(.06 * shake);
    const D = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; D.push([Math.cos(a) * 25, Math.sin(a) * 22]); }
    paint(D, { wash: C.brass, ink: PAL.ink, sw: .9 });
    inkLine([[-14, -12], [-6, -18]], 1.2, '#FFF1C4', 'inkfine', 0);
    paint(rectPts(-3, -30 + 5 * press, 6, 9), { wash: C.brassDk, ink: PAL.ink, sw: .6 });
    paint(ellPts(0, -31 + 5 * press, 7, 4, 10), { wash: C.brassDk, ink: PAL.ink, sw: .6 });
    pop();
    for (const d of DING) {
      const a = t - d; if (a < 0 || a > .45) continue;
      const k = a / .45;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI * (.15 + .7 * i / 4), r0 = 42 + 40 * easeOut(k), r1 = r0 + 26 * (1 - k);
        boilSeed('ding' + i);
        inkLine([[x + Math.cos(ang) * r0, y - 22 + Math.sin(ang) * r0], [x + Math.cos(ang) * r1, y - 22 + Math.sin(ang) * r1]], 2.6 * (1 - k * .6), '#FFF1C4', 'ink', 0);
      }
      if (a < .25) glows([[x, y - 20, 120, '#FFE3A6', .7 * (1 - a / .25)]]);
    }
  }
  // the big bell: swings when the rope is yanked; the rope hangs from it or runs to Clawd's hand
  function bellAng(t) {
    let a = .03 * Math.sin(t * 1.3);
    for (const D of DONG) {
      if (t > D - .2 && t < D) a += -.28 * easeIn(seg(t, D - .2, D));
      else if (t >= D) a += .5 * Math.exp(-2.2 * (t - D)) * Math.sin(11 * (t - D) - .6);
    }
    return a;
  }
  function bigBell(t, hand) {
    const [hx, hy] = BIG, ang = bellAng(t);
    if (!inView(hx - 200, hy - 40, hx + 120, GY)) return;
    boilSeed('bracket');
    paint([[TL, hy - 26], [hx + 10, hy - 26], [hx + 10, hy - 12], [TL + 40, hy - 12], [TL, hy + 30]], { wash: '#4A3A4E', ink: PAL.ink, sw: .9 });
    const rot = ([x, y]) => [hx + x * Math.cos(ang) - y * Math.sin(ang), hy + x * Math.sin(ang) + y * Math.cos(ang)];
    const B = through([[-12, 4], [-22, 22], [-30, 58], [-38, 88], [-58, 108], [58, 108], [38, 88], [30, 58], [22, 22], [12, 4]], 3);
    boilSeed('bigbell');
    paint(B.map(rot), { wash: C.brass, ink: PAL.ink, sw: 1.3 });
    paint([[-16, 30], [-24, 60], [-30, 90], [-20, 92], [-14, 60], [-8, 32]].map(rot), { wash: '#F8D27A', ink: null });
    paint(ellPts(0, 108, 58, 10, 18).map(rot), { wash: C.brassDk, ink: PAL.ink, sw: .9 });
    const cl = rot([6 * Math.sin(t * 7) * (ang > .1 ? 1 : 0), 120]);
    paint(ellPts(cl[0], cl[1], 12, 12, 12), { wash: C.brassDk, ink: PAL.ink, sw: .8 });
    // the rope
    const end = hand || [cl[0] + 6 * Math.sin(t * 1.7), GY - 170];
    boilSeed('rope');
    const mid = [(cl[0] + end[0]) / 2 + (hand ? 0 : 5), (cl[1] + end[1]) / 2];
    inkLine([cl, mid, end], 3.4, C.rope, 'ink', .5);
    if (!hand) paint(ellPts(end[0], end[1] + 8, 10, 14, 12), { wash: C.awn, ink: PAL.ink, sw: .7 });
    // DONG: strike lines, a flash of light and rings of sound climbing the tower
    for (const D of DONG) {
      const a = t - D; if (a < 0 || a > 1.4) continue;
      if (a < .35) { glows([[hx, hy + 80, 300, '#FFE3A6', .9 * (1 - a / .35)]]); for (let i = 0; i < 7; i++) { const g = -Math.PI * (.05 + .9 * i / 6), r0 = 90 + 120 * easeOut(a / .35); boilSeed('strike' + i); inkLine([[hx + Math.cos(g) * r0, hy + 70 + Math.sin(g) * r0], [hx + Math.cos(g) * (r0 + 50), hy + 70 + Math.sin(g) * (r0 + 50)]], 3.4 * (1 - a / .35), '#FFF1C4', 'ink', 0); } }
      for (let j = 0; j < 3; j++) {
        const b = a - j * .16; if (b < 0 || b > 1.1) continue;
        const R = 120 + 1900 * easeOut(b / 1.1), n = 7;
        for (let s = 0; s < n; s++) {
          const g0 = -Math.PI * (.02 + .96 * s / n), g1 = -Math.PI * (.02 + .96 * (s + .8) / n), P = [];
          for (let q = 0; q <= 4; q++) { const g = lerp(g0, g1, q / 4); P.push([hx + Math.cos(g) * R, hy + 70 + Math.sin(g) * R]); }
          if (!inView(Math.min(P[0][0], P[4][0]), Math.min(P[0][1], P[4][1]), Math.max(P[0][0], P[4][0]), Math.max(P[0][1], P[4][1]))) continue;
          boilSeed('ring' + j + s);
          inkLine(P, (5 - 4 * b / 1.1) / Math.max(VIEW.z, .4), '#FFF1C4', 'ink', .5);
        }
      }
    }
  }

  // ---------- Clawd ----------
  const MOOD = [
    [0, 'happy', { lookX: .8 }], [1.9, 'neutral', { lookX: .1, lookY: -1 }], [3.4, 'nervous'], [4.6, 'thinking'], [5.5, 'idea'],
    [6.3, 'determined', { lookX: -.7, lookY: -.7 }], [7.5, 'excited', { lookY: -1 }], [10.4, 'proud'], [11.25, 'happy', { lookY: -1, lookX: .2 }], [13.4, 'laugh'],
    [14.7, 'surprised', { lookX: 1 }], [17.55, 'scared'], [18.7, 'thinking'], [19.25, 'idea'], [19.65, 'determined', { lookX: -.7, lookY: -.7 }],
    [20.7, 'excited', { lookY: -1 }], [25.5, 'excited', { lookX: .8, lookY: -.6 }], [28.6, 'love'], [31.4, 'proud'], [33.0, 'happy', { lookY: -.8 }],
    [34.3, 'neutral', { lookX: .9 }], [36.35, 'surprised', { lookX: .9 }], [36.75, 'cool'], [38.2, 'mischief', { lookX: -.6, lookY: -.6 }],
  ];
  function clawdPose(t) {
    const m = emotions(t, MOOD), p = {};
    let hold = false;
    for (const D of DONG) {                      // reach up, grab the rope, stretch, yank: DONG
      if (t < D - 1.05 || t > D + .75) continue;
      const a0 = m.aL ?? .2;
      if (t < D - .6) p.aL = lerp(a0, 1.45, ease(seg(t, D - 1.05, D - .6)));
      else if (t < D - .16) { p.aL = lerp(1.45, 1.62, ease(seg(t, D - .6, D - .16))); p.sq = -.1 * ease(seg(t, D - .6, D - .3)); }
      else if (t < D) { p.aL = lerp(1.62, -.3, easeIn(seg(t, D - .16, D))); p.sq = lerp(-.1, .2, seg(t, D - .16, D)); }
      else { p.aL = lerp(-.3, a0, ease(seg(t, D + .3, D + .75))); p.sq = .2 * Math.exp(-6 * (t - D)) * Math.cos(16 * (t - D)); }
      hold = t > D - .62 && t < D + .3;
    }
    if (t > 11.25 && t < 12.9) p.aR = lerp(m.aR ?? .2, 1.4 + .12 * Math.sin(t * 7), ease(seg(t, 11.25, 11.6)) * (1 - ease(seg(t, 12.5, 12.9))));   // presents room 1
    if (t > 25.5 && t < 27.2) p.aR = lerp(m.aR ?? .2, 1.3 + .3 * Math.sin(t * TAU * 2), ease(seg(t, 25.5, 25.8)) * (1 - ease(seg(t, 26.9, 27.2))));  // come in, all of you
    if (t > 38.2) { p.aL = lerp(m.aL ?? .2, 1.45, ease(seg(t, 38.2, 38.7))); hold = t > 38.65; }                                                        // here we go again
    return { o: merge(m, p), hold };
  }
  // the receptionist's cap, painted in body space on top of the head
  const cap = o => (u, sw) => {
    const V = VIEWS[o.view] || VIEWS.front;
    push(); translate(V.hat * u + 1.1 * u, -8 * u); rotate(.14);
    paint(rectPts(-1.8 * u, -1.9 * u, 3.6 * u, 1.95 * u), { wash: '#C8324A', ink: PAL.ink, sw: sw * .7 });
    paint(rectPts(-1.8 * u, -.62 * u, 3.6 * u, .45 * u), { wash: '#F2C14E', ink: null });
    pop();
  };
  function drawClawd(t) {
    if (!inView(CX - 300, GY - 300, CX + 300, GY)) return null;
    const { o, hold } = clawdPose(t);
    clawd(CX, GY - 8, U, { ...o, hat: 'bowtie', draw: cap(o), noShadow: true, boilKey: 'clawd' });
    return hold ? armTip(CX, GY - 8, U, o, 'L') : null;
  }

  // ---------- the arriving guests ----------
  const N1MOOD = [[0, 'determined', { lookX: .6 }], [.95, 'hopeful', { lookX: .8 }], [2.0, 'neutral', { lookY: -1, lookX: .1 }], [3.55, 'sad', { lookX: .6 }],
    [5.55, 'surprised', { lookX: .8, lookY: -.4 }], [6.3, 'hopeful', { lookX: .8, lookY: -.6 }], [7.3, 'surprised', { lookY: -1 }], [10.45, 'hopeful', { lookY: -1 }], [11.5, 'starstruck'], [12.3, 'excited', { lookY: -1 }]];
  const N2MOOD = [[34, 'happy'], [35.75, 'determined', { lookX: .6 }], [36.55, 'hopeful', { lookX: .8 }], [37.6, 'confused', { lookX: .8 }], [38.9, 'determined', { lookX: .6 }]];
  // a hop that slaps the desk bell at time d: the near arm winds up and slams down at the top of the hop
  function slap(t, d) {
    const j = jump(t, d - .27, d + .16, 3.6);
    if (t < d - .45 || t > d + .5) return null;
    const aR = t < d - .1 ? lerp(-.3, 1.35, ease(seg(t, d - .45, d - .15))) : t < d ? lerp(1.35, -.55, easeIn(seg(t, d - .1, d))) : lerp(-.55, -.3, seg(t, d + .15, d + .5));
    return { ...j, aR };
  }
  function suitcase(x, y, key) {   // hanging from its handle at (x, y)
    boilSeed(key);
    inkLine([[x - 8, y + 8], [x - 7, y - 2], [x + 7, y - 2], [x + 8, y + 8]], 2, PAL.ink, 'ink', .6);
    paint(rrPts(x - 34, y + 7, 68, 44, 7, .5), { wash: C.case, ink: PAL.ink, sw: .9 });
    paint(ellPts(x + 14, y + 30, 8, 8, 10), { wash: '#E8AA38', ink: null });
    inkLine([[x - 34, y + 20], [x + 34, y + 20]], 1, '#5E3A26', 'inkfine', 0);
  }
  function deskGuest(t) {
    let who, x = GX, y = GY, pose, cols;
    if (t < N1HOP[1]) {
      cols = N1COL;
      const m = emotions(t, N1MOOD, { take: .7 });
      pose = merge(m, { view: 'q', flip: true, aL: -.9 });
      const s = slap(t, DING[0]); if (s) pose = merge(pose, s), pose.aR = s.aR;
      if (t > N1HOP[0] - .25) {                          // crouch, then the hop into room 1, suitcase and all
        const k = seg(t, N1HOP[0], N1HOP[1]), c = ease(seg(t, N1HOP[0] - .25, N1HOP[0])) * (t < N1HOP[0] ? 1 : 0);
        [x, y] = arcPt([GX, GY], [TX, sill(1)], 260, k);
        pose = merge(pose, { sq: .25 * c - .2 * Math.sin(Math.PI * k), rot: -.25 * Math.sin(Math.PI * k) });
        pose.aR = k > 0 ? 1.3 : pose.aR; pose.aL = k > 0 ? -.4 : pose.aL;
      }
      who = 'N1';
    } else if (t > N2WALK[0]) {
      cols = N2COL;
      const m = emotions(t, N2MOOD, { take: .7 }), w = stroll(t, N2WALK[0], N2WALK[1], 1320, GX, 13);
      x = w.x;
      pose = merge(m, { view: t < N2WALK[1] ? 'side' : 'q', flip: true, walk: w.walk, dy: w.dy, aL: -.9 });
      for (const d of DING.slice(1)) { const s = slap(t, d); if (s) { pose = merge(pose, s); pose.aR = s.aR; } }
      who = 'N2';
    } else return;
    if (!inView(x - 120, y - 200, x + 120, y + 60)) return;
    const o = { ...pose, ...cols, boilKey: who };
    clawd(x, y, 13, o);
    const [hx, hy] = armTip(x, y, 13, o, 'L');
    suitcase(hx, hy - 2, 'case' + who);
    if (who === 'N1' && t > N1HOP[1] - .08) for (let i = 0; i < 6; i++) { const a = seg(t, N1HOP[1] - .08, N1HOP[1] + .5), g = i * TAU / 6 + .3; sparkle(TX + Math.cos(g) * 170 * easeOut(a), sill(1) - 90 + Math.sin(g) * 120 * easeOut(a), 26, a); }
  }

  // ---------- the endless bus ----------
  function busAt(t) { return t < BUS_IN[0] || t > BUS_OUT[1] ? null : 880 + 2900 * (1 - easeOut(seg(t, ...BUS_IN))) + 5600 * easeIn(seg(t, ...BUS_OUT)); }
  const seatX = (bx, p) => bx + NOSE + (p - .5) * SEAT;
  function bus(t) {
    const bx = busAt(t); if (bx == null) return;
    const { x0, x1 } = VIEW;
    if (bx > x1 + 60 || !inView(bx, BUS_TOP, x1, BUS_Y)) return;
    const CH = 4 * SEAT, c0 = Math.max(0, Math.floor((x0 - bx - NOSE) / CH)), c1 = Math.floor((x1 - bx - NOSE) / CH);
    const dip = 5 * spring(t, BUS_IN[1], 4, 14);
    push(); translate(0, dip);
    boilSeed('busshadow');
    // body, in chunks no bigger than the canvas
    for (let c = c0; c <= c1; c++) {
      const cx0 = bx + NOSE + c * CH - 2;
      boilSeed('busc' + c);
      paint(rectPts(cx0, BUS_TOP, CH + 4, BUS_BOT - BUS_TOP), { wash: C.bus, ink: null });
      paint(rectPts(cx0, BUS_TOP, CH + 4, 30), { wash: C.busRoof, ink: null });
      inkLine([[cx0, BUS_TOP], [cx0 + CH + 4, BUS_TOP]], 1.3, PAL.ink, 'ink', 0);
      inkLine([[cx0, BUS_BOT], [cx0 + CH + 4, BUS_BOT]], 1.3, PAL.ink, 'ink', 0);
    }
    // the nose, the driver and the headlight
    if (bx + NOSE > x0 - 60) {
      boilSeed('nose');
      paint([[bx + NOSE + 4, BUS_TOP], [bx + 50, BUS_TOP], [bx + 12, BUS_TOP + 44], [bx, BUS_TOP + 130], [bx, BUS_BOT - 12], [bx + 12, BUS_BOT], [bx + NOSE + 4, BUS_BOT]], { wash: C.bus, ink: PAL.ink, sw: 1.3, curv: .3 });
      paint([[bx + 26, BUS_TOP + 44], [bx + NOSE - 16, BUS_TOP + 34], [bx + NOSE - 16, WIN_B], [bx + 14, WIN_B]], { wash: '#BFD6E6', ink: PAL.ink, sw: .9 });
      sil(bx + 100, WIN_B + 30, PU, 'fedora', { lookX: -1, key: 'driver', dy: -.2 * Math.abs(Math.sin(bpOf(t) * Math.PI)) });
      paint(ellPts(bx + 16, BUS_BOT - 56, 12, 18, 12), { wash: '#FFF1C4', ink: PAL.ink, sw: .8 });
      glows([[bx + 10, BUS_BOT - 56, 160, '#FFE3A6', .8]]);
    }
    // windows, each with a passenger until they leap out
    const p0 = Math.max(1, Math.floor((x0 - bx - NOSE) / SEAT)), p1 = Math.floor((x1 - bx - NOSE) / SEAT) + 1, G = [];
    for (let p = p0; p <= p1; p++) {
      const wx = seatX(bx, p), occ = t < fanT0(p);
      boilSeed('busw' + p);
      paint(rrPts(wx - 82, WIN_T, 164, WIN_B - WIN_T + 10, 16), { wash: occ ? C.busLit : C.dark, ink: PAL.ink, sw: .9 });
      if (occ) G.push([wx, (WIN_T + WIN_B) / 2, 150, C.glow, .45]);
    }
    glows(G);
    for (let p = p0; p <= p1; p++) if (t < fanT0(p)) sil(seatX(bx, p), WIN_B + 30, PU, typeOf('P' + p), { ...passPose(p, t), key: 'pas' + p });
    // the belt over the window bottoms, and the wheels
    for (let c = c0; c <= c1; c++) {
      const cx0 = bx + NOSE + c * CH - 2;
      boilSeed('belt' + c);
      paint(rectPts(cx0, WIN_B, CH + 4, 40), { wash: C.busStripe, ink: null });
      inkLine([[cx0, WIN_B], [cx0 + CH + 4, WIN_B]], 1, PAL.ink, 'ink', 0);
      for (const q of [.5, 3.5]) {
        const wx = bx + NOSE + (c * 4 + q) * SEAT, sp = (bx / 46);
        boilSeed('wheel' + c + q);
        paint(ellPts(wx, BUS_Y - 46, 50, 50, 20), { wash: '#2B2233', ink: PAL.ink, sw: 1 });
        paint(ellPts(wx, BUS_Y - 46, 22, 22, 14), { wash: '#9A96A8', ink: null });
        inkLine([[wx + Math.cos(sp) * 20, BUS_Y - 46 + Math.sin(sp) * 20], [wx - Math.cos(sp) * 20, BUS_Y - 46 - Math.sin(sp) * 20]], 1.4, PAL.ink, 'ink', 0);
      }
    }
    // the horn
    const a = t - 15.0;
    if (a > 0 && a < .7) for (let i = 0; i < 3; i++) { const g = Math.PI + (i - 1) * .45, r0 = 30 + 60 * easeOut(a / .7); boilSeed('horn' + i); inkLine([[bx - 10 + Math.cos(g) * r0, BUS_TOP + 120 + Math.sin(g) * r0], [bx - 10 + Math.cos(g) * (r0 + 40), BUS_TOP + 120 + Math.sin(g) * (r0 + 40)]], 3 * (1 - a / .7), '#FFF1C4', 'ink', 0); }
    pop();
  }

  // guests in the air: glowing trails first, then the leapers
  function drawFlights(t) {
    const F = flights(t), sw = 3.2 / Math.max(VIEW.z, .35);
    for (const f of F) {
      if (f.tail == null || f.tail >= f.k - .01) continue;
      const P = [], n = 16; for (let i = 0; i <= n; i++) P.push(pathPt(f, lerp(f.tail, f.k, i / n)));
      boilSeed('trail' + f.id);
      inkLine(P.map(([x, y]) => [x, y - 50]), sw, C.trail, 'inkfine', .5);
    }
    for (const f of F) if (f.fly) {
      const [x, y] = pathPt(f, f.k);
      sil(x, y, lerp(f.s0, f.s1, f.k), typeOf(f.id), { ...flyPose(f, t), key: 'fly' + f.id });
    }
  }

  // ---------- one frame, from any camera ----------
  function frame(t, c, o = {}) {
    cam(c);
    sky();
    starsMoon(t);
    flushBrush();
    town();
    street();
    towerFlat();
    towerPaint(t);
    clouds(t);
    streetInk(t);
    lobby(t);
    const hand = drawClawd(t);
    desk(t);
    deskBell(t);
    bigBell(t, hand);
    deskGuest(t);
    bus(t);
    drawFlights(t);
    camEnd();
    if (o.streak != null) streaks(o.streak, o.dir || 'v');
    if (o.iris != null) iris2(o.iris);
  }
  function streaks(k, dir) {   // speed lines over whip pans and fast cranes
    const a = Math.sin(Math.PI * clamp(k)); if (a < .05) return;
    for (let i = 0; i < 14; i++) {
      const L = 400 + 600 * hash(i + 3);
      boilSeed('streak' + i);
      const col = i % 3 ? '#FFF1D0' : '#C9B8E8', w = (1.2 + 1.6 * hash(i + 7)) * a;
      if (dir === 'v') { const x = (i + .5) / 14 * W + jit(20), y = H / 2 + (hash(i) - .5) * H * .7; inkLine([[x, y - L / 2], [x + jit(6), y + L / 2]], w, col, 'ink', 0); }
      else { const y = (i + .5) / 14 * H + jit(20), x = W / 2 + (hash(i) - .5) * W * .6; inkLine([[x - L / 2, y], [x + L / 2, y + jit(6)]], w, col, 'ink', 0); }
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }

  // ---------- shots ----------
  const BELLC = [DB[0] + 10, DB[1] - 70, 2.2];
  const OPEN = [560, GY - 720, .8], LOOKUP = [555, GY - 1250, .72], DESKM = [610, GY - 330, 1.22];
  const bellScr = c => scr([DB[0], DB[1] - 22], c);

  // A 0–5.4: the full hotel and a new guest
  function shotA(t) {
    let c;
    if (t < 1.9) c = mixCam(BELLC, OPEN, ease(seg(t, .62, 1.9)));
    else if (t < 3.3) c = mixCam(OPEN, LOOKUP, ease(seg(t, 1.9, 3.1)));
    else c = mixCam(LOOKUP, DESKM, ease(seg(t, 3.3, 4.2)));
    if (t > 4.2) c = [c[0] - 10 * (t - 4.2), c[1], c[2] * (1 + .03 * (t - 4.2))];
    frame(t, c, t < .6 ? { iris: [...bellScr(c), lerp(0, 1500, easeIn(t / .6))] } : {});
  }
  // B 5.4–10.25: the idea, the big bell, everyone one up, the crane up the endless tower, the whip back down
  const TOWER1 = [560, GY - 960, .74], TOP1 = [560, base(30), .45], DOWN1 = [575, GY - 820, .68];
  function shotB(t) {
    let c, o = {};
    if (t < DONG[0]) {
      const d = [DESKM[0] - 12, DESKM[1], DESKM[2] * 1.036];
      c = mixCam(d, [545, GY - 250, 1.6], ease(seg(t, 5.4, 6.0)));
      c = mixCam(c, [470, GY - 340, 1.38], ease(seg(t, 6.2, 6.9)));
    } else if (t < UP1 + .3) {
      const sh = shakeXY(t, 16 * Math.exp(-(t - DONG[0]) * 6));
      c = [TOWER1[0] + sh[0], TOWER1[1] + sh[1] - 40 * (t - DONG[0]), TOWER1[2]];
    } else if (t < 9.75) {
      const k = ease(seg(t, UP1 + .3, 9.4));
      c = [560, lerp(TOWER1[1] - 44, TOP1[1], k), lerp(TOWER1[2], TOP1[2], ease(seg(t, UP1 + .3, 8.9)))];
      c[1] -= 60 * seg(t, 9.4, 9.75); c[2] *= 1 - .2 * ease(seg(t, 9.3, 9.75));
    } else {
      const k = seg(t, 9.75, 10.2);
      c = mixCam([560, TOP1[1] - 60, TOP1[2] * .8], DOWN1, ease(k));
      o.streak = k;
    }
    frame(t, c, o);
  }
  // C 10.25–14.5: room 1 is free; the guest moves in
  function shotC(t) {
    let c = mixCam(DOWN1, [595, GY - 580, .98], ease(seg(t, 10.3, 11.3)));
    if (t > 12.3) c = mixCam(c, [585, GY - 680, .92], ease(seg(t, 12.3, 13.3)));
    c = [c[0], c[1], c[2] * (1 + .01 * (t - 10.25))];
    frame(t, c);
  }
  // D 14.5–20.4: the endless bus; fear; the idea; the rope
  function shotD(t) {
    let c, o = {};
    const m0 = [620, GY - 380, .98];
    if (t < 15.7) c = mixCam(m0, [700, GY - 360, 1.0], ease(seg(t, 14.5, 15.6)));
    else if (t < 17.1) { const k = ease(seg(t, 15.7, 17.1)); c = [lerp(700, 5200, k), lerp(GY - 360, GY - 260, k), lerp(1.0, .5, k)]; o.streak = seg(t, 16.8, 17.4) * .5; o.dir = 'h'; }
    else if (t < 17.55) { const k = seg(t, 17.1, 17.55); c = mixCam([5200, GY - 260, .5], [560, GY - 300, 1.35], ease(k)); o.streak = .5 + k * .5; o.dir = 'h'; }
    else if (t < 19.3) c = [560 - 8 * (t - 17.55), GY - 300, 1.35 + .03 * (t - 17.55)];
    else c = mixCam([546, GY - 300, 1.4], [470, GY - 340, 1.38], ease(seg(t, 19.3, 19.9)));
    frame(t, c, o);
  }
  // E 20.4–25.5: everyone to the double room; the pattern, forever
  const TOWER2 = [590, GY - 1560, .56], TOP2 = [560, base(36), .4], BUSM = [760, GY - 380, .92];
  function shotE(t) {
    let c, o = {};
    if (t < 23.3) { const sh = shakeXY(t, 14 * Math.exp(-(t - DONG[1]) * 6)); c = [TOWER2[0] + sh[0], TOWER2[1] + sh[1] - 25 * (t - 20.4), TOWER2[2] * (1 + .01 * (t - 20.4))]; }
    else if (t < 24.7) { const k = ease(seg(t, 23.3, 24.6)); c = [lerp(600, TOP2[0], k), lerp(TOWER2[1] - 72, TOP2[1], k), lerp(TOWER2[2] * 1.03, TOP2[2], ease(seg(t, 23.3, 24.2)))]; }
    else { const k = seg(t, 24.7, 25.45); c = mixCam(TOP2, BUSM, ease(k)); o.streak = k; }
    frame(t, c, o);
  }
  // F 25.5–32.8: the passengers stream into the free rooms; the bus leaves
  const FAN = [1080, GY - 1250, .4];
  const front = t => 2 * ((t - FAN0 - FAN_FLY) / FAN_DT + 1) - 1;   // the highest room just filled
  function shotF(t) {
    let c, o = {};
    if (t < 26.7) c = [BUSM[0] + 10 * (t - 25.5), BUSM[1], BUSM[2]];
    else if (t < 28.3) c = mixCam([BUSM[0] + 12, BUSM[1], BUSM[2]], FAN, ease(seg(t, 26.7, 27.5)));
    else if (t < 30.0) {
      const k = ease(seg(t, 28.3, 29.9)), yf = base(Math.max(3, front(Math.min(t, 29.9)) + 5));
      c = [lerp(FAN[0], 820, k), lerp(FAN[1], Math.min(FAN[1], yf), ease(seg(t, 28.3, 28.9))), lerp(FAN[2], .36, k)];
    } else {
      const top = [820, Math.min(FAN[1], base(front(29.9) + 5)), .36], k = seg(t, 30.0, 30.85);
      c = mixCam(top, [700, GY - 420, .9], ease(k)); o.streak = k;
    }
    if (t > 30.85) c = [700 + 40 * (t - 30.85), GY - 420, .9 + .01 * (t - 30.85)];
    frame(t, c, o);
  }
  // G 32.8–40: all full again; another guest; iris shut on the bell
  function shotG(t) {
    let c = mixCam([778, GY - 420, .92], OPEN, ease(seg(t, 32.8, 33.9)));
    if (t > 33.9) c = mixCam(OPEN, DESKM, ease(seg(t, 34.6, 35.8)));
    if (t > 37.9) c = mixCam(DESKM, BELLC, ease(seg(t, 37.9, 39.2)));
    const r = t > 39.15 ? lerp(1500, 0, easeIn(seg(t, 39.15, 39.96))) : null;
    frame(t, c, r != null ? { iris: [...bellScr(c), r] } : {});
  }

  shots([[0, shotA], [5.4, shotB], [10.25, shotC], [14.5, shotD], [20.4, shotE], [25.5, shotF], [32.8, shotG]]);
})();
