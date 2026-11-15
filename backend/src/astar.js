// Generic A* over integer node ids.
//
// The heuristic must be consistent (h(a) <= cost(a,b) + h(b)); with that, a node
// is final once popped, so a closed set is safe and gives optimal paths.

class MinHeap {
  constructor() {
    this.ids = [];
    this.pri = [];
  }
  get size() {
    return this.ids.length;
  }
  push(id, p) {
    let i = this.ids.length;
    this.ids.push(id);
    this.pri.push(p);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.pri[parent] <= p) break;
      this.ids[i] = this.ids[parent];
      this.pri[i] = this.pri[parent];
      i = parent;
    }
    this.ids[i] = id;
    this.pri[i] = p;
  }
  pop() {
    const top = this.ids[0];
    const lastId = this.ids.pop();
    const lastP = this.pri.pop();
    const n = this.ids.length;
    if (n > 0) {
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && this.pri[r] < this.pri[l] ? r : l;
        if (this.pri[c] >= lastP) break;
        this.ids[i] = this.ids[c];
        this.pri[i] = this.pri[c];
        i = c;
      }
      this.ids[i] = lastId;
      this.pri[i] = lastP;
    }
    return top;
  }
}

export function astar({ size, start, goal, forEachNeighbor, edgeCost, heuristic }) {
  const g = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new MinHeap();

  g[start] = 0;
  open.push(start, heuristic(start));
  let expanded = 0;

  while (open.size > 0) {
    const current = open.pop();
    if (closed[current]) continue; // stale heap entry
    closed[current] = 1;
    expanded++;

    if (current === goal) {
      const path = [];
      for (let n = goal; n !== -1; n = parent[n]) path.push(n);
      return { path: path.reverse(), cost: g[goal], expanded };
    }

    forEachNeighbor(current, (next) => {
      if (closed[next]) return;
      const c = edgeCost(current, next);
      if (!Number.isFinite(c)) return; // impassable
      const tentative = g[current] + c;
      if (tentative < g[next]) {
        g[next] = tentative;
        parent[next] = current;
        open.push(next, tentative + heuristic(next));
      }
    });
  }

  return null;
}
