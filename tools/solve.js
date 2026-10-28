const E = require("./engine.js");
const i = +process.argv[2];
const start = E.loadLevel(i);
const crackIdx = start.t.map((c, j) => c === "%" ? j : -1).filter(j => j >= 0);
const ch = n => String.fromCharCode(48 + n);
function key(s) {
  let k = ch(s.p.x) + ch(s.p.y) + (s.p.face > 0 ? 1 : 0) + s.p.jump + (s.tick % 3);
  for (const j of crackIdx) k += s.t[j] === "%" ? 1 : 0;
  k += s.pieces.map(b => b.kind + ch(b.x) + ch(b.y) + (b.shake||0) + (b.falling||0)).sort().join("");
  for (const c of s.chicks) k += c.got ? 1 : 0;
  for (const e of s.enemies) k += e.alive ? ch(e.x) + ch(e.y) + (e.d > 0 ? 1 : 0) : "xxx";
  return k;
}
const ids = new Map(); const par = []; const act = []; const states = [];
ids.set(key(start), 0); par.push(-1); act.push(0);
let q = [start], qi = [0], found = -1, n = 0;
outer: while (q.length) {
  const nq = [], nqi = [];
  for (let a0 = 0; a0 < q.length; a0++) {
    const s = q[a0];
    for (let a = 0; a < 6; a++) {
      const t = E.step(E.clone(s), a); n++;
      if (t.dead) continue;
      const k = key(t);
      if (ids.has(k)) continue;
      const id = par.length; ids.set(k, id); par.push(qi[a0]); act.push(a);
      if (t.won) { found = id; break outer; }
      nq.push(t); nqi.push(id);
    }
  }
  q = nq; qi = nqi;
  if (ids.size % 1 === 0 && q.length) process.stderr.write(`\rdepth states ${ids.size} frontier ${q.length}   `);
}
if (found < 0) { console.log(`\nL${i + 1}: NO SOLUTION (${ids.size})`); process.exit(); }
const path = []; for (let id = found; par[id] >= 0; id = par[id]) path.push(act[id]);
path.reverse();
console.log(`\nL${i + 1}: ${path.length} ticks, ${ids.size} states\n  ${path.map(a => "·←→↑↓A"[a]).join("")}`);
