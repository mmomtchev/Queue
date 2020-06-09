export default class {
  constructor(e, t) {
    this.maxConcurrent = e || 1, this.minCycle = t || 0, this.queueRunning = [], this.queueWaiting = {}, 
    this.lastRun = 0;
  }
  dequeue(e) {
    const t = this.queueRunning, i = t.findIndex(t => t.hash === e);
    if (-1 == i) throw "queue desync";
    const n = t[i];
    return t.splice(i, 1), n;
  }
  getFirstWaiting() {
    for (let e of Object.keys(this.queueWaiting).sort((e, t) => e - t)) if (void 0 !== this.queueWaiting[e] && this.queueWaiting[e].length > 0) return this.queueWaiting[e];
  }
  end(e) {
    this.dequeue(e).resolve();
    const t = this.getFirstWaiting();
    if (void 0 !== t) {
      t.shift().resolve();
    }
  }
  async wait(e, t) {
    let i = {
      hash: e,
      priority: t
    };
    for (null == this.queueWaiting[t] && (this.queueWaiting[t] = []), this.queueRunning.length >= this.maxConcurrent && (i.promise = new Promise(e => {
      i.resolve = e;
    }), this.queueWaiting[t].push(i), await i.promise), this.queueRunning.push(i), i.promise = new Promise(e => {
      i.resolve = e;
    }); Date.now() - this.lastRun < this.minCycle; ) await new Promise(e => setTimeout(e, this.minCycle - Date.now() + this.lastRun));
    this.lastRun = Date.now();
  }
  stat() {
    return {
      running: this.queueRunning.length,
      waiting: Object.keys(this.queueWaiting).reduce((e, t) => e + this.queueWaiting[t].length, 0),
      last: this.lastRun
    };
  }
  async flush() {
    for (;this.stat().waiting > 0; ) for (let e of Object.keys(this.queueWaiting).sort((e, t) => t - e)) {
      const t = this.queueWaiting[e];
      void 0 !== t && t.length > 0 && await t[t.length - 1].promise;
    }
    for (;this.queueRunning.length > 0; ) await Promise.allSettled(this.queueRunning.map(e => e.promise));
  }
}
