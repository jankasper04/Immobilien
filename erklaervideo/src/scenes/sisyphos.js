// sisyphos.js: "Sisyphos", 58 s, 9:16. The storyboard is STORYBOARD_sisyphos.md.
// One steep slope, one boulder, one clock. The boulder's distance up the slope is a pure function of time; Clawd
// pushes behind it, jumps over it when it rolls back, and the seasons turn from summer to winter and back to spring.
(() => {
  // ---------- world ----------
  const A = .75, CA = Math.cos(A), SA = Math.sin(A);
  const B0 = [400, 3000];                     // the foot of the slope; the valley is flat to the left
  const DTOP = 2600, R = 130, U = 22;         // slope length to the peak, boulder radius, Clawd's unit
  const DIR = [CA, -SA], NRM = [-SA, -CA];    // up the slope, and away from it (up and left)
  const at = d => [B0[0] + DIR[0] * d, B0[1] + DIR[1] * d];
  const PEAK = at(DTOP);
  const groundY = x => x <= B0[0] ? B0[1] : x >= PEAK[0] ? PEAK[1] : B0[1] - (x - B0[0]) * SA / CA;
  const FLOWER_X = B0[0] - 150, SIT_X = B0[0] - 360;

  let VIEW = null;
  function cam([cx, cy, z, rot = 0]) {
    camBegin(cx, cy, z, rot);
    const r = 1 + Math.abs(rot) * 1.2;
    VIEW = { x0: cx - W / 2 / z * r, x1: cx + W / 2 / z * r, y0: cy - H / 2 / z * r, y1: cy + H / 2 / z * r };
  }
  const mixCam = (a, b, k) => a.map((v, i) => lerp(v, b[i] ?? 0, k));
  const scr = ([x, y], [cx, cy, z]) => [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z];
  function flat(P, col, hole = null) {
    noStroke(); fill(col); beginShape(); for (const p of P) vertex(p[0], p[1]);
    if (hole) { beginContour(); for (let i = hole.length - 1; i >= 0; i--) vertex(hole[i][0], hole[i][1]); endContour(); }
    endShape(CLOSE);
  }
  const inView = (x, y, m = 200) => x > VIEW.x0 - m && x < VIEW.x1 + m && y > VIEW.y0 - m && y < VIEW.y1 + m;

  // ---------- the clock ----------
  // pushes: time span, distance from/to, and the slip back to the bottom
  const PUSH = [
    { t0: 0, t1: 11.0, d0: 600, d1: 2440, slip: [11.2, 12.8] },
    { t0: 16.0, t1: 18.7, d0: 1500, d1: 2320, slip: [18.8, 19.9] },
    { t0: 20.0, t1: 22.0, d0: 1700, d1: 2360, slip: [22.1, 23.0] },
    { t0: 23.1, t1: 24.7, d0: 1900, d1: 2400, slip: [24.8, 25.5] },
    { t0: 25.6, t1: 26.9, d0: 2000, d1: 2420, slip: [27.0, 27.8] },
    { t0: 38.6, t1: 47.8, d0: 0, d1: 2450, slip: [48.2, 49.8] },
  ];
  const pushAt = t => { let p = PUSH[0]; for (const q of PUSH) if (t >= q.t0) p = q; return p; };
  // boulder: distance up the slope, and how far it has rolled (for its spin)
  function boulder(t) {
    const p = pushAt(t);
    if (t < p.t1) { const k = seg(t, p.t0, p.t1), step = .012 * Math.sin(bpOf(t) * TAU); return { d: lerp(p.d0, p.d1, clamp(k + step * (k > 0 && k < 1))), rolling: 0 }; }
    if (t < p.slip[0]) return { d: p.d1, rolling: 0 };
    const k = easeIn(seg(t, ...p.slip));
    return { d: lerp(p.d1, 0, k) + (t > p.slip[1] ? 0 : 0) + 30 * spring(t, p.slip[1], 5, 14) * (t > p.slip[1] ? 1 : 0), rolling: k < 1 ? 1 : 0 };
  }
  const bCentre = d => { const p = at(Math.max(0, d)); return d >= 0 ? [p[0] + NRM[0] * R, p[1] + NRM[1] * R] : [B0[0] + d, B0[1] - R]; };

  // seasons: 0 spring, 1 summer, 2 autumn, 3 winter; the melt brings spring back from the flower
  const MELT = [35.2, 37.6];
  function season(t) {
    const S = { spring: { sky: ['#9CC9E6', '#E4EDD8'], ground: '#86B865', deep: '#6E9F52', tuft: '#4F7A40' },
                summer: { sky: ['#7DB6E4', '#D8ECEF'], ground: '#7CA85A', deep: '#668F4A', tuft: '#4A7038' },
                autumn: { sky: ['#8FAAC8', '#F2D2A6'], ground: '#C99448', deep: '#A77A3B', tuft: '#8A5A2E' },
                late:   { sky: ['#9BA6B8', '#E3CDB8'], ground: '#A88A5E', deep: '#8C7250', tuft: '#6B5238' },
                winter: { sky: ['#B7C3D2', '#E8ECEF'], ground: '#EEF1F4', deep: '#DDE3EA', tuft: '#9FA9B5' },
                lush:   { sky: ['#8EC6EA', '#FBE8C4'], ground: '#8FC66A', deep: '#76AD55', tuft: '#4F7A40' } };
    if (t < 16) return { ...S.spring, snow: 0 };
    if (t < 20) return { ...S.summer, snow: 0 };
    if (t < 23.1) return { ...S.autumn, snow: 0 };
    if (t < 25.6) return { ...S.late, snow: 0 };
    if (t < MELT[0]) return { ...S.winter, snow: 1 };
    const k = ease(seg(t, ...MELT)), mix = (a, b) => typeof a === 'string' ? mixCol(a, b, k) : a.map((c, i) => mixCol(c, b[i], k));
    const o = {}; for (const f in S.lush) o[f] = mix(S.winter[f], S.lush[f]); o.snow = 1 - k; o.bloom = seg(t, MELT[0] + .5, 40); return o;
  }

  // ---------- set pieces ----------
  function background(t, S) {
    const { x0, x1, y0, y1 } = VIEW, m = 200;
    const top = y0 - m, bot = y1 + m;
    const bands = 5;
    for (let i = 0; i < bands; i++) {   // sky: top colour to horizon colour in soft bands
      const ya = lerp(top, Math.max(bot, B0[1]), i / bands), yb = lerp(top, Math.max(bot, B0[1]), (i + 1) / bands) + 2;
      const P = []; for (let x = x0 - m; x <= x1 + m + 150; x += 150) P.push([x, ya + (i ? 12 * Math.sin(x * .004 + i) : 0)]);
      for (let x = x1 + m + 150; x >= x0 - m; x -= 150) P.push([x, yb + 12 * Math.sin(x * .004 + i + 1)]);
      flat(P, mixCol(S.sky[0], S.sky[1], i / (bands - 1)));
    }
    // distant mountains, pale
    const far = mixCol(S.sky[1], '#8C9BB0', .45), F = [];
    const fy = lerp(y0, y1, .5);   // parallax: the far range stays in the lower half of the view
    for (let x = Math.floor((x0 - m) / 160) * 160; x <= x1 + m + 160; x += 160) F.push([x, fy - 180 * (.5 + .5 * Math.sin(x * .0021 + .7)) - 90 * hash(Math.round(x / 160))]);
    flat(F.concat([[x1 + m + 160, bot + 400], [x0 - m, bot + 400]]), far);
    // the mountain: valley, slope, peak
    const G = [[Math.min(x0 - m, B0[0] - 2000), bot + 2000], [Math.min(x0 - m, B0[0] - 2000), B0[1]], B0, PEAK, [Math.max(x1 + m, PEAK[0] + 3000), PEAK[1]], [Math.max(x1 + m, PEAK[0] + 3000), bot + 2000]];
    flat(G, S.ground);
    // darker ground a little below the surface
    flat(G.map(([x, y], i) => i === 0 || i === 5 ? [x, y] : [x, y + 110]), S.deep);
    // the surface line, in canvas-sized pieces
    for (let d = -1500; d < DTOP + 1500; d += 300) {
      const p0 = d < 0 ? [B0[0] + d, B0[1]] : d > DTOP ? [PEAK[0] + d - DTOP, PEAK[1]] : at(d), d2 = d + 300;
      const p1 = d2 < 0 ? [B0[0] + d2, B0[1]] : d2 > DTOP ? [PEAK[0] + d2 - DTOP, PEAK[1]] : at(d2);
      if (!inView(p0[0], p0[1]) && !inView(p1[0], p1[1])) continue;
      boilSeed('edge' + d);
      inkLine(d < 0 && d2 > 0 ? [p0, B0, p1] : d < DTOP && d2 > DTOP ? [p0, PEAK, p1] : [p0, p1], 1.2, PAL.ink, 'ink', 0);
    }
    // grass tufts and, in the lush spring, flowers along the surface
    for (let i = 0; i < 90; i++) {
      const d = -1400 + i * 50 + hash(i) * 30, p = d < 0 ? [B0[0] + d, B0[1]] : d > DTOP ? [PEAK[0] + d - DTOP, PEAK[1]] : at(d);
      if (!inView(p[0], p[1], 60)) continue;
      const sw = wob(t, .4, hash(i) * 3) * 4;
      boilSeed('tuft' + i);
      if (S.snow < .5 || hash(i + 7) > .7) for (const k of [-1, 0, 1]) inkLine([[p[0] + k * 6, p[1] + 2], [p[0] + k * 9 + sw, p[1] - 16 - 6 * hash(i + k)]], .7, S.tuft, 'inkfine', .4);
      if (S.bloom > hash(i + 30) && hash(i + 50) > .45) {
        const cols = ['#F6C3D0', '#FFE27A', '#FFFFFF', '#C9A8E8'], c = cols[i % 4];
        for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; paint(ellPts(p[0] + Math.cos(a) * 7, p[1] - 22 + Math.sin(a) * 7, 6, 6, 8), { wash: c, ink: null }); }
        paint(ellPts(p[0], p[1] - 22, 4, 4, 8), { wash: '#E8AA38', ink: null });
      }
    }
    // the peak: a little cairn that never gets reached
    boilSeed('cairn');
    for (let k = 0; k < 3; k++) paint(ellPts(PEAK[0] + 60, PEAK[1] - 16 - k * 26, 34 - k * 8, 14, 12, 1.5), { wash: '#9A97A0', ink: PAL.ink, sw: .8 });
  }
  function snowfall(t, S) {
    if (S.snow <= .02) return;
    for (let i = 0; i < 60; i++) {
      const x = VIEW.x0 + hash(i) * (VIEW.x1 - VIEW.x0) + 30 * Math.sin(t + i), y = VIEW.y0 + frac(hash(i + 9) + t * (.05 + .05 * hash(i + 3))) * (VIEW.y1 - VIEW.y0);
      boilSeed('flake' + i);
      paint(ellPts(x, y, 5 + 3 * hash(i + 2), 5 + 3 * hash(i + 2), 8), { wash: '#FFFFFF', washOp: 255 * S.snow, ink: null });
    }
  }
  function rock(d, t) {
    const [x, y] = bCentre(d), a = d / R;
    boilSeed('rock');
    push(); translate(x, y); rotate(a);
    paint(ellPts(0, 0, R, R * .96, 30, 2), { wash: '#8F8B95', ink: PAL.ink, sw: 1.4 });
    paint(ellPts(-40, -45, 50, 32, 16, 2), { wash: '#A8A4AE', ink: null });
    for (const [a0, a1, r0] of [[.4, 1.2, .5], [2.2, 2.9, .7], [4.1, 4.9, .45]]) inkLine([[Math.cos(a0) * R * r0, Math.sin(a0) * R * r0], [Math.cos((a0 + a1) / 2) * R * (r0 + .2), Math.sin((a0 + a1) / 2) * R * (r0 + .2)], [Math.cos(a1) * R * (r0 + .1), Math.sin(a1) * R * (r0 + .1)]], 1, '#5E5A66', 'ink', .4);
    pop();
  }
  function dust(x, y, t0, t) {
    const a = t - t0; if (a < 0 || a > 1.2) return;
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + i / 6 * Math.PI, r = (40 + 50 * hash(i)) * (1 + a * 1.6);
      boilSeed('dust' + i);
      paint(ellPts(x + Math.cos(ang) * 120 * easeOut(a), y + Math.sin(ang) * 60 * easeOut(a) - 20, r * .5, r * .35, 14, 2), { wash: '#E9DFCC', washOp: 255 * (1 - a / 1.2), ink: null });
    }
  }
  // the flower in the snow: grows 31–32.5, picked at 36.8
  const FLOWER = [31.0, 32.6], PICK = 36.8;
  function flower(t) {
    const k = ease(seg(t, ...FLOWER)); if (k <= 0 || t > PICK) return;
    const x = FLOWER_X, y = B0[1], h = 70 * k;
    boilSeed('flower');
    inkLine([[x, y], [x + 4 * Math.sin(t * 2), y - h]], 1.6, '#4F8A3E', 'ink', .4);
    if (k > .4) paint(ellPts(x - 10, y - h * .5, 12 * k, 6 * k, 10, 0, -.5), { wash: '#6FA257', ink: PAL.ink, sw: .5 });
    if (k > .7) {
      const b = backOut(seg(t, FLOWER[0] + 1.1, FLOWER[1] + .2));
      for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + .3; paint(ellPts(x + Math.cos(a) * 11 * b, y - h + Math.sin(a) * 11 * b, 9 * b, 9 * b, 10), { wash: '#FFF5E2', ink: PAL.ink, sw: .5 }); }
      paint(ellPts(x, y - h, 7 * b, 7 * b, 10), { wash: '#E8AA38', ink: PAL.ink, sw: .5 });
      if (t > FLOWER[1]) glow(x, y - h, 90, '#FFE9A8', .5 * (1 - seg(t, 34, 36)));
    }
  }
  function birds(t) {
    if (t < 49) return;
    for (let i = 0; i < 4; i++) {
      const x = 900 + i * 130 + ((t - 49) * 60) % 600, y = 1200 - i * 60 + 20 * Math.sin(t * 2 + i), f = 14 * Math.sin(t * 9 + i);
      boilSeed('bird' + i);
      inkLine([[x - 24, y - f], [x, y], [x + 24, y - f]], 1.3, PAL.ink, 'ink', .5);
    }
  }

  // ---------- Clawd ----------
  const MOOD = [
    [0, 'determined', { emote: 'sweat' }], [10.6, 'hopeful'], [11.25, 'surprised'], [12.9, 'sad', { lookX: -.6, lookY: .8 }],
    [16, 'determined', { emote: 'sweat' }], [18.9, 'bored'], [20, 'determined'], [22.2, 'sad'], [23.1, 'determined'], [24.9, 'sad'],
    [25.6, 'determined'], [27.1, 'cry'], [28.3, 'sad', { lookY: .6 }], [32.7, 'neutral', { lookX: -.8, lookY: .8 }],
    [33.6, 'surprised', { lookX: -.8, lookY: .8 }], [34.4, 'hopeful', { lookX: -.8, lookY: .6 }], [36.3, 'love'], [38.4, 'happy', { emote: 'music' }],
    [48.3, 'surprised'], [49.0, 'laugh'], [51.0, 'happy', { emote: 'music' }],
  ];
  // Clawd's place and pose at time t: { x, y, o }
  function clawdAt(t) {
    const m = emotions(t, MOOD), p = pushAt(t), b = boulder(t);
    const hat = t > PICK ? 'flower' : undefined;
    const BACK = R + 6.8 * U;   // Clawd leans in from behind; upright, the head sits further up the slope than the feet
    const cz = p.t1 > 0 ? p.d1 - BACK : 0;
    let d, o = {};
    if (t >= 28 && t < 38.6) { // winter: sitting in the valley, then up and over to the boulder
      if (t > 38.0) { const w = stroll(t, 38.0, 38.6, SIT_X, B0[0] - R - 6.8 * U, U); return { x: w.x, y: B0[1], o: { ...m, view: 'side', walk: w.walk, hat } }; }
      const x = SIT_X;
      o = { view: 'front', sq: .22, dy: 0, aL: -.8, aR: -.8 };
      if (t > PICK - .5 && t < PICK + .3) o = { ...o, view: 'q', flip: true, aL: .6 };
      return { x, y: B0[1], o: { ...m, ...o, sq: (m.sq || 0) + o.sq, hat } };
    }
    if (t < p.t1 + .2) {   // pushing
      d = b.d - BACK;
      const pl = pulse(t, 5);
      o = { view: 'side', walk: d / (4 * U), aL: .72 + .08 * pl, rot: .5 + .03 * pl };
    } else {
      d = cz;
      const tp = p.slip[0] + .45;   // the boulder passes under: jump
      const j = jump(t, tp - .18, tp + .38, 13);
      o = { view: 'side', aL: 1.2, aR: 1.2, ...j };
      if (t > tp + .6) {
        if (p === PUSH[5] && t > 49.4) {   // trotting down after it, laughing
          const k = seg(t, 49.4, 53.0);
          d = lerp(cz, 0, ease(k));
          o = { view: 'side', flip: true, walk: (cz - d) / (4 * U) };
        } else o = { view: 'side', flip: true };
      }
    }
    const [x, y] = d >= 0 ? at(d) : [B0[0] + d, B0[1]];
    const ang = d > 0 ? -A * .0 : 0;
    const merged = { ...m, ...o, dy: (m.dy || 0) + (o.dy || 0), sq: (m.sq || 0) + (o.sq || 0), rot: (m.rot || 0) * .3 + (o.rot || 0) + ang, hat };
    if (t > 53) return { x: B0[0] - 460, y: B0[1], o: { ...m, view: 'q', hat: 'flower' } };
    return { x, y, o: merged };
  }
  // where Clawd's eye is, for the close-ups
  function eyeAt(t) {
    const { x, y, o } = clawdAt(t), V = VIEWS[o.view] || VIEWS.front, F = V.face || { cx: 0, fw: 1 };
    let ex = (F.cx + 2.5 * F.fw) * U * (o.flip ? -1 : 1), ey = -6 * U + (o.dy || 0) * U;
    const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
    return [x + ex * c - ey * s, y + ex * s + ey * c];
  }

  // ---------- frame and shots ----------
  function frame(t, c, o = {}) {
    const S = season(t);
    cam(c);
    background(t, S);
    flower(t);
    const b = boulder(t);
    const cl = clawdAt(t);
    // the boulder in front when Clawd sits behind it in the valley; otherwise Clawd pushes from behind
    clawd(cl.x, cl.y + 6, U, { ...cl.o, boilKey: 'A' });
    rock(b.d, t);
    const imp = pushAt(t).slip[1];
    dust(B0[0] - 40, B0[1], imp, t);
    for (let k = 0; k < 4; k++) {   // sparkles of melting snow
      const a = t - (MELT[0] + k * .35); if (a > 0 && a < .6) { boilSeed('mspark' + k); const r = 60 + 500 * (a / .6 + k * .3); paint(starPts(FLOWER_X + Math.cos(k * 2) * r, B0[1] - 40 - Math.abs(Math.sin(k * 2)) * r * .4, 18 * (1 - a / .6), .25, 4), { wash: '#FFF5E2', ink: null }); }
    }
    birds(t);
    snowfall(t, S);
    camEnd();
    if (o.shake) {}
    if (o.whip != null) whipFX(o.whip);
    if (o.iris != null) iris2(o.iris);
  }
  function whipFX(k) {
    const a = Math.sin(Math.PI * clamp(k)); if (a < .05) return;
    for (let i = 0; i < 14; i++) {
      const x = (i + .5) / 14 * W + jit(20), L = 500 + 500 * hash(i + 3), y = H / 2 + (hash(i) - .5) * H * .5;
      boilSeed('whip' + i);
      inkLine([[x - L * .25, y - L / 2], [x + L * .25 + jit(6), y + L / 2]], 3 * a, i % 3 ? '#FFFFFF' : PAL.ink, 'dry', .2);
    }
  }
  function iris2([x, y, r]) {
    flushBrush();
    flat([[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]], PAL.ink, r < 3 ? null : ellPts(x, y, r, r, 48));
  }
  const follow = t => { const c = bCentre(boulder(t).d); return [c[0] - 170, c[1] + 30, 1.35]; };

  // A 0–3 and B 3–11.2: the eye, then the crane up the slope with the push
  function shotAB(t) {
    const e = eyeAt(t), c = t < 1.3 ? [e[0], e[1], 4.4 - .15 * t] : mixCam([e[0], e[1], 4.2], follow(t), ease(seg(t, 1.3, 2.9)));
    frame(t, c, t < .5 ? { iris: [W / 2, H / 2, lerp(0, 1300, easeIn(t / .5))] } : {});
  }
  // C 11.2–16: the slip, the whip down, the impact, Clawd looking down
  function shotC(t) {
    let c, whip = null;
    const top = follow(11.2);
    if (t < 11.8) c = top;
    else if (t < 12.8) { const k = ease(seg(t, 11.8, 12.8)); c = mixCam(top, [B0[0] + 60, B0[1] - 200, 1.0], k); whip = k; }
    else if (t < 13.5) { const sh = shakeXY(t, 16 * Math.exp(-(t - 12.8) * 5)); c = [B0[0] + 60 + sh[0], B0[1] - 200 + sh[1], 1.05]; }
    else { const { x, y } = clawdAt(t); c = [x - 120, y + 160, 1.25 + .03 * (t - 13.5)]; }
    frame(t, c, whip != null ? { whip } : {});
  }
  // D 16–28: the repetitions, locked to the boulder so each cut is a match cut
  function shotD(t) {
    const p = pushAt(t);
    frame(t, t < p.slip[0] + .2 ? follow(t) : follow(p.slip[0]));
  }
  // E 28–38: winter in the valley; the flower; the melt
  function shotE(t) {
    const base = [SIT_X + 120, B0[1] - 260, 1.3 + .02 * (t - 28)], close = [FLOWER_X - 100, B0[1] - 140, 2.0], wide = [B0[0] + 150, B0[1] - 600, .8];
    let c = base;
    if (t > 30.6) c = mixCam(base, close, ease(seg(t, 30.6, 31.6)));
    if (t > 35.0) c = mixCam(close, wide, ease(seg(t, 35.0, 37.4)));
    frame(t, c);
  }
  // F 38–53: pushing again, happy; the slip; the laugh; the whole mountain
  function shotF(t) {
    let c;
    if (t < 38.6) c = [SIT_X + 300, B0[1] - 300, 1.1];
    else if (t < 49.4) c = follow(Math.min(t, 48.2));
    else if (t < 50.6) { const { x, y } = clawdAt(t); c = mixCam(follow(48.2), [x, y - 200, 1.1], ease(seg(t, 49.4, 50.2))); }
    else { const { x, y } = clawdAt(50.6); c = mixCam([x, y - 200, 1.1], [1300, 2000, .42], ease(seg(t, 50.6, 52.8))); }
    frame(t, c);
  }
  // G 53–58: the eye again, happy; iris shut
  function shotG(t) {
    const e = eyeAt(t), c = mixCam([B0[0] - 100, B0[1] - 300, 1.3], [e[0], e[1], 4.2], ease(seg(t, 53.3, 55.2)));
    const r = t > 56.9 ? lerp(1300, 0, easeIn(seg(t, 56.9, 57.85))) : null;
    frame(t, c, r != null ? { iris: [...scr(e, c), r] } : {});
  }

  shots([[0, shotAB], [11.2, shotC], [16, shotD], [28, shotE], [38, shotF], [53, shotG]]);
})();
