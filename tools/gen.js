// Hill-climb a stage toward a longer, more demanding shortest solution, keeping it solvable.
// usage: node gen.js <levelIndex> <seconds> <seed>
const fs = require("fs"), vm = require("vm");
const ctx = { module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext("var LEVELS = [];\n" + fs.readFileSync(__dirname + "/core.js", "utf8") + "\nthis.LEVELS = LEVELS; this.loadLevel = loadLevel; this.clone = clone; this.step = step;", ctx);
const ALL = JSON.parse(fs.readFileSync(__dirname + "/levels.json", "utf8"));
const li = +process.argv[2], SECS = +process.argv[3] || 300;
let seed = +process.argv[4] || 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = n => Math.floor(rnd() * n);
const LIMIT = li === 9 ? 400000 : 250000;

function solve(map) {
  ctx.LEVELS[0] = { name: "x", hint: "", map };
  let start;
  try { start = ctx.loadLevel(0); } catch (e) { return null; }
  if (!start.p || !start.chicks.length) return null;
  // every stone must already rest on something: no free falls the player can't react to
  { let t = ctx.clone(start); const before = JSON.stringify(t.pieces.map(b => [b.x, b.y]));
    for (let k = 0; k < 8; k++) t = ctx.step(t, 0);
    if (t.dead || JSON.stringify(t.pieces.map(b => [b.x, b.y])) !== before) return null; }
  const crack = start.t.map((c, j) => c === "%" ? j : -1).filter(j => j >= 0);
  const ch = n => String.fromCharCode(48 + n);
  const key = s => {
    let k = ch(s.p.x) + ch(s.p.y) + (s.p.face > 0 ? 1 : 0) + s.p.jump + (s.enemies.length ? s.tick % 3 : 0);
    for (const j of crack) k += s.t[j] === "%" ? 1 : 0;
    k += s.pieces.map(b => ch(b.x) + ch(b.y) + (b.shake || 0) + (b.falling || 0)).sort().join("");
    for (const c of s.chicks) k += c.got ? 1 : 0;
    for (const e of s.enemies) k += e.alive ? ch(e.x) + ch(e.y) + (e.d > 0 ? 1 : 0) : "xxx";
    return k;
  };
  const par = [-1], act = [0], ids = new Map([[key(start), 0]]);
  let q = [start], qi = [0];
  while (q.length) {
    const nq = [], nqi = [];
    for (let n = 0; n < q.length; n++) for (let a = 0; a < 6; a++) {
      const t = ctx.step(ctx.clone(q[n]), a);
      if (t.dead) continue;
      const k = key(t);
      if (ids.has(k)) continue;
      const id = par.length; ids.set(k, id); par.push(qi[n]); act.push(a);
      if (t.won) {
        const path = []; for (let x = id; par[x] >= 0; x = par[x]) path.push(act[x]);
        path.reverse();
        return { path, states: ids.size };
      }
      if (ids.size > LIMIT) return null;
      nq.push(t); nqi.push(id);
    }
    q = nq; qi = nqi;
  }
  return null;
}

function score(map, sol) {
  ctx.LEVELS[0] = { name: "x", hint: "", map };
  let s = ctx.loadLevel(0);
  let moves = 0, pushes = 0, breaks = 0, kindsMoved = new Set();
  const pos0 = s.pieces.map(b => b.x + "," + b.y);
  for (const a of sol.path) {
    const st = s.steps;
    s = ctx.step(s, a);
    if (s.steps > st) moves++;
    if (s.events.includes("push")) pushes++;
    if (s.events.includes("break")) breaks++;
  }
  s.pieces.forEach((b, i) => { if (b.x + "," + b.y !== pos0[i]) kindsMoved.add(b.kind); });
  let diff = 0; const o = ALL[li].map;
  for (let y = 0; y < map.length; y++) for (let x = 0; x < 16; x++) if (map[y][x] !== o[y][x]) diff++;
  return { moves, pushes, breaks, diff, kindsMoved: [...kindsMoved], val: moves + 4 * pushes + 5 * breaks + 6 * kindsMoved.size + Math.min(30, Math.log2(sol.states) * 2) - 1.2 * diff };
}

const W = 16, H = 12;
const g = m => m.map(r => r.split(""));
const ungrid = a => a.map(r => r.join(""));
const supported = (a, x, y) => "#%H".includes(a[y + 1][x]) || /[a-zO]/.test(a[y + 1][x]);
const feature = new Set(ALL[li].map.join("").split("").filter(c => /[a-z]/.test(c)));

function mutate(map) {
  const a = g(map);
  const kind = ri(7);
  const x = 1 + ri(W - 2), y = 1 + ri(H - 2);
  const c = a[y][x];
  if (kind <= 1) {                       // wall <-> air
    if (c === "#") a[y][x] = " "; else if (c === " ") a[y][x] = "#"; else return null;
  } else if (kind === 2) {               // cracked toggle
    if (c === "#") a[y][x] = "%"; else if (c === "%") a[y][x] = "#"; else return null;
  } else if (kind === 3) {               // spikes toggle on a supported air cell
    if (c === " " && supported(a, x, y)) a[y][x] = "^"; else if (c === "^") a[y][x] = " "; else return null;
  } else if (kind === 4) {               // move a chick / exit / player
    const which = "CEP"[ri(3)];
    const all = []; a.forEach((r, yy) => r.forEach((v, xx) => { if (v === which) all.push([xx, yy]); }));
    if (!all.length) return null;
    const [ox, oy] = all[ri(all.length)];
    if (c !== " " || !supported(a, x, y)) return null;
    a[oy][ox] = " "; a[y][x] = which;
  } else {                               // shift a whole stone by one cell
    const letters = [...new Set(a.flat().filter(v => /[a-zO]/.test(v)))];
    if (!letters.length) return null;
    const L = letters[ri(letters.length)];
    const cells = []; a.forEach((r, yy) => r.forEach((v, xx) => { if (v === L) cells.push([xx, yy]); }));
    const pick = L === "O" ? [cells[ri(cells.length)]] : cells;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)];
    for (const [cx, cy] of pick) a[cy][cx] = " ";
    for (const [cx, cy] of pick) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 1 || ny < 1 || nx > W - 2 || ny > H - 2 || a[ny][nx] !== " ") return null;
    }
    for (const [cx, cy] of pick) a[cy + dy][cx + dx] = L;
  }
  return ungrid(a);
}

let cur = ALL[li].map, curSol = solve(cur);
if (!curSol) { console.error("start unsolvable"); process.exit(1); }
let curSc = score(cur, curSol);
const startSc = curSc;
let best = cur, bestSc = curSc;
const t0 = Date.now();
let it = 0;
while ((Date.now() - t0) / 1000 < SECS) {
  it++;
  let m = cur;
  const n = 1 + ri(2);
  for (let k = 0; k < n && m; k++) m = mutate(m);
  if (!m) continue;
  const sol = solve(m);
  if (!sol) continue;
  const sc = score(m, sol);
  if (![...feature].every(f => true)) continue;
  // the featured multi-cell stones must still matter
  if (feature.size && !sc.kindsMoved.some(k => k !== "cube") && startSc.kindsMoved.some(k => k !== "cube")) continue;
  if (sc.val >= curSc.val - 1) { cur = m; curSc = sc; }
  if (sc.val > bestSc.val) { best = m; bestSc = sc; }
}
fs.writeFileSync(__dirname + `/gen_${li}.json`, JSON.stringify({ li, it, start: startSc, best: bestSc, map: best }, null, 1));
console.log(`L${li + 1} its=${it} ${JSON.stringify(startSc)} -> ${JSON.stringify(bestSc)}`);
console.log(best.join("\n"));
