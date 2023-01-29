import { Queue } from '../src/index';

const CONCURRENCY = 1000;
const DELAY = 100;
const CYCLE = 1;
const TOTAL = 1e5;
const ECHO = 1e3;

const q = new Queue<number>(CONCURRENCY, CYCLE);
let counter = 0;
let last = -1;
let concurrency = 0;

async function main() {
  while (counter < TOTAL) {
    const me = counter++;
    if (me % ECHO == 0) {
      console.log('- scheduled', me);
    }
    if (q.stat().waiting > ECHO * 2) {
      console.log('- throttling');
      await q.flush();
    }
    q.wait(me, 0).then(() => {
      concurrency++;
      if (concurrency > CONCURRENCY) {
        throw new Error('overflow ' + concurrency);
      }
      if (me % ECHO == 0) {
        console.log('- run', me, concurrency);
      }
      setTimeout(() => {
        if (me % ECHO == 0) {
          console.log('- finished', me, concurrency);
        }
        if (last >= me) {
          throw new Error('desync');
        }
        last = me;
        q.end(me);
        concurrency--;
      }, DELAY);
    });
  }
  await q.flush();
  console.log('last', last);
}

main();
