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

  it('infers synchronous job results', async () => {
    const q = new Queue();
    const value = Symbol();
    const result: Promise<symbol> = q.run(() => value);
    assert.strictEqual(await result, value);
    await q.flush();
    assert.strictEqual(q.stat().running, 0);
  });

  it('accepts synchronous jobs without a return value', async () => {
    const q = new Queue();
    let ran = false;
    const result: Promise<void> = q.run(() => {
      ran = true;
    });
    assert.isUndefined(await result);
    assert.isTrue(ran);
    await q.flush();
  });

  it('infers jobs returning either values or promises', async () => {
    const q = new Queue();
    const job = (asynchronous: boolean): number | Promise<number> =>
      asynchronous ? Promise.resolve(42) : 42;
    const synchronous: Promise<number> = q.run(() => job(false));
    const asynchronous: Promise<number> = q.run(() => job(true));
    assert.strictEqual(await synchronous, 42);
    assert.strictEqual(await asynchronous, 42);
    await q.flush();
  });

  it('accepts promise like job results', async () => {
    const q = new Queue();
    const thenable: PromiseLike<number> = {
      then: (onfulfilled, onrejected) => Promise.resolve(42).then(onfulfilled, onrejected)
    };
    const result: Promise<number> = q.run(() => thenable);
    assert.strictEqual(await result, 42);
    await q.flush();
  });

  it('releases capacity after a synchronous job throws', async () => {
    const q = new Queue();
    const error = new Error('job failed');
    const failed: Promise<never> = q.run(() => {
      throw error;
    });
    const next: Promise<string> = q.run(() => 'next');
    await failed.then(
      () => assert.fail('expected job rejection'),
      (actual: Error) => assert.strictEqual(actual, error)
    );
    assert.strictEqual(await next, 'next');
    await q.flush();
    assert.strictEqual(q.stat().running, 0);
  });
});
