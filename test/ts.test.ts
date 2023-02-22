import { describe, it } from 'mocha';
import { assert } from 'chai';

import { Queue } from '..';

describe('TS import', () => {
  it('specialized TS constructor', () => {
    const q = new Queue<symbol>(2, 50);
    assert.instanceOf(q, Queue);

    q.wait(Symbol(), 0);

    const s: Promise<symbol> = q.run(() => Promise.resolve(Symbol()));
    assert.instanceOf(s, Promise<symbol>);

    const t: Promise<symbol> = q.run(() => Promise.resolve(Symbol()), 12);
    assert.instanceOf(t, Promise<symbol>);
  });

  it('generic TS constructor', () => {
    const q = new Queue(2, 50);
    assert.instanceOf(q, Queue);

    q.wait(Symbol() as unknown, 0);

    const s: Promise<symbol> = q.run(() => Promise.resolve(Symbol()));
    assert.instanceOf(s, Promise<symbol>);

    const t: Promise<symbol> = q.run(() => Promise.resolve(Symbol()), 12);
    assert.instanceOf(t, Promise<symbol>);
  });
});
