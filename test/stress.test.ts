import { describe, it } from 'mocha';
import { assert } from 'chai';

import { Queue } from '..';

interface StressOpts {
  concurrency: number;
  delay: number;
  cycle: number;
  total: number;
  echo: number;
}

async function stress(opts: StressOpts) {
  const q = new Queue<number>(opts.concurrency, opts.cycle);
  let counter = 0;
  let last = -1;
  let concurrency = 0;

  while (counter < opts.total) {
    const me = counter++;
    if (me % opts.echo == 0) {
      if (process.env.MOCHA_ECHO) console.log('- scheduled', me);
    }
    if (q.stat().waiting > opts.echo * 2) {
      if (process.env.MOCHA_ECHO) console.log('- throttling');
      await q.flush(opts.echo / 2);
    }
    q.wait(me, 0).then(() => {
      concurrency++;
      if (concurrency > opts.concurrency) {
        throw new Error('overflow ' + concurrency);
      }
      if (me % opts.echo == 0) {
        if (process.env.MOCHA_ECHO) console.log('- run', me, concurrency);
      }
      setTimeout(() => {
        if (me % opts.echo == 0) {
          if (process.env.MOCHA_ECHO) console.log('- finished', me, concurrency);
        }
        if (last >= me) {
          throw new Error('desync');
        }
        last = me;
        q.end(me);
        concurrency--;
      }, opts.delay);
    });
  }
  await q.flush();
  assert.strictEqual(last, opts.total - 1);
}

describe('stress test', () => {
  it('limit by cool down', (done) => {
    // 1000 tasks
    // one task every 1ms
    // => 1s
    const start = Date.now();
    stress({
      concurrency: 100,
      delay: 10,
      cycle: 1,
      total: 1000,
      echo: 10
    })
      .then(() => {
        const elapsed = Date.now() - start;
        if (Math.abs(elapsed - 1000) < 250)
          done();
        else
          done(`elapsed time does not match, expected 1000ms, got ${elapsed}ms`);
      })
      .catch((e) => done(e));
  });

  it('limit by concurrency', (done) => {
    // 500 tasks
    // 50 tasks in parallel, each one of 100ms
    // => 500 tasks per second
    // => 1s
    const start = Date.now();
    stress({
      concurrency: 50,
      delay: 100,
      cycle: 1,
      total: 500,
      echo: 50
    })
      .then(() => {
        const elapsed = Date.now() - start;
        if (Math.abs(elapsed - 1000) < 250)
          done();
        else
          done(`elapsed time does not match, expected 2000ms, got ${elapsed}ms`);
      })
      .catch((e) => done(e));
  });
});
