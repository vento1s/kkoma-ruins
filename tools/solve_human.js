// BFS solver that follows the on-screen control rules, not just the engine:
//  - pushing a stone needs the direction held: the first push happens on the 3rd tick of pressing,
//    and while you keep holding, the next one on every 2nd tick (shell.html PUSH_TICKS logic)
//  - pushes in mid-jump stay immediate (same as the game)
// usage: node tools/solve_human.js <stageIndex> [stateLimit]
const fs = require("fs"), vm = require("vm");
const ctx = { module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/engine.js", "utf8") +
  "\nthis.loadLevel = loadLevel; this.clone = clone; this.step = step; this.pieceAt = pieceAt; this.canShift = canShift; this.LEVELS = LEVELS;", ctx);
const PUSH_TICKS = 3;
const li = +process.argv[2], LIMIT = +(process.argv[3] || 6e6);

function hstep(s, a) {
  // returns [newState, newPushHold]; s.ph is the shell's pushHold counter
  let input = a, ph = s.ph || 0;
  if ((a === 1 || a === 2) && !s.p.jump && !s.dead) {
    const d = a === 1 ? -1 : 1;
    const pi = ctx.pieceAt(s, s.p.x + d, s.p.y);
    if (pi >= 0 && ctx.canShift(s, pi, d, 0, false)) {
      if (++ph >= PUSH_TICKS) ph = PUSH_TICKS - 2;
      else { input = 0; }
    } else ph = 0;
  } else ph = 0;
  const t = ctx.clone(s);
  if (input === 0 && (a === 1 || a === 2)) t.p.face = a === 1 ? -1 : 1;
  const n = ctx.step(t, input);
  n.ph = ph;
  return n;
}

const start = ctx.loadLevel(li); start.ph = 0;
const crack = start.t.map((c, j) => c === "%" ? j : -1).filter(j => j >= 0);
const ch = n => String.fromCharCode(48 + n);
function key(s) {
  let k = ch(s.p.x) + ch(s.p.y) + (s.p.face > 0 ? 1 : 0) + s.p.jump + s.ph + (s.enemies.length ? s.tick % 3 : 0);
  for (const j of crack) k += s.t[j] === "%" ? 1 : 0;
  k += s.pieces.map(b => b.kind + ch(b.x) + ch(b.y) + (b.shake || 0) + (b.falling || 0)).sort().join("");
  for (const c of s.chicks) k += c.got ? 1 : 0;
  for (const e of s.enemies) k += e.alive ? ch(e.x) + ch(e.y) + (e.d > 0 ? 1 : 0) : "xxx";
  return k;
}
const ids = new Map([[key(start), 0]]), par = [-1], act = [0];
let q = [start], qi = [0], found = -1;
outer: while (q.length) {
  const nq = [], nqi = [];
  for (let n = 0; n < q.length; n++) for (let a = 0; a < 6; a++) {
    const t = hstep(q[n], a);
    if (t.dead) continue;
    const k = key(t);
    if (ids.has(k)) continue;
    const id = par.length; ids.set(k, id); par.push(qi[n]); act.push(a);
    if (t.won) { found = id; break outer; }
    if (ids.size > LIMIT) { console.log(`L${li + 1}: gave up after ${ids.size} states`); process.exit(); }
    nq.push(t); nqi.push(id);
  }
  q = nq; qi = nqi;
}
if (found < 0) { console.log(`L${li + 1}: NO HUMAN SOLUTION (${ids.size} states)`); process.exit(); }
const path = []; for (let id = found; par[id] >= 0; id = par[id]) path.push(act[id]);
path.reverse();
console.log(`L${li + 1}: ${path.length} ticks, ${ids.size} states\n  ${path.map(a => "·←→↑↓A"[a]).join("")}`);
