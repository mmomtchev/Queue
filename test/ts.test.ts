import Queue from '..';
import { describe, it } from 'mocha';
import { assert } from 'chai';

describe('TS import', () => {
  it('TS constructor', () => {
    const q = new Queue(2, 50);
    assert.instanceOf(q, Queue);
  });
});
