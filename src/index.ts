import { Heap } from './heap';

// This will be optimized away by V8 as I have proven in
// https://bugs.chromium.org/p/v8/issues/detail?id=12756
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const debug = (..._) => undefined;

// This is the central part of the concept:
// using a Promise<void> as a semaphore
interface Semaphore {
  wait: Promise<void>;
  signal: () => void;
}

interface JobWaiting<T> {
  hash: T;
  prio: number;
  counter: number;
  start: Semaphore;
}

interface JobRunning<T> {
  hash: T;
  prio: number;
  finish: Semaphore;
}

/**
 * @type QueueStats {running: number, waiting: number, last: number}
 */
interface QueueStats {
  running: number;
  waiting: number;
  last: number;
}

function prioCompare<T>(a: JobWaiting<T>, b: JobWaiting<T>) {
  return a.prio - b.prio || a.counter - b.counter;
}

export class Queue<T = unknown> {
  maxConcurrent: number;
  minCycle: number;
  queueRunning: Map<T, JobRunning<T>>;
  queueWaiting: Heap<JobWaiting<T>>;
  lastRun: number;
  nextTimer: Promise<void> | null;
  counter: number;

  /**
   * @class Queue
   * 
   * Priority queue with rate limiting<br>
   * See the medium article:<br>
   * https://mmomtchev.medium.com/parallelizing-download-loops-in-js-with-async-await-queue-670420880cd6
   * (the code has changed a lot since that article but the basic idea of using Promises as locks remains the same)
   * 
   * @param {number} [maxConcurrent=1] Number of tasks allowed to run simultaneously
   * @param {number} [minCycle=0] Minimum number of milliseconds between two consecutive tasks
   */
  constructor(maxConcurrent?: number, minCycle?: number) {
    this.maxConcurrent = maxConcurrent || 1;
    this.minCycle = minCycle || 0;
    this.queueRunning = new Map<T, JobRunning<T>>;
    this.queueWaiting = new Heap<JobWaiting<T>>(prioCompare);
    this.lastRun = 0;
    this.nextTimer = null;
    this.counter = 0;
  }

  /**
   * @private
   */
  tryRun(): void {
    debug(`tryRun: waiting=${this.queueWaiting.size()}, running=${this.queueRunning.size}`);
    while (this.queueWaiting.size() > 0 && this.queueRunning.size < this.maxConcurrent) {
      /* Wait if it is too soon */
      if (Date.now() - this.lastRun < this.minCycle) {
        debug(`will throttle, now=${Date.now() % 1000}, next=${(this.minCycle + this.lastRun) % 1000}, elapsed=${Date.now() - this.lastRun}`);
        if (this.nextTimer === null) {
          this.nextTimer = new Promise((resolve) => setTimeout(() => {
            this.nextTimer = null;
            this.tryRun();
            resolve();
          }, this.minCycle - Date.now() + this.lastRun));
        }
        return;
      }

      /* Choose the next task to run and unblock its promise */
      const next = this.queueWaiting.pop();
      debug(`wont throttle, last=${this.lastRun % 1000}, now=${Date.now() % 1000}, next is`, next?.hash);
      if (next !== undefined) {
        let finishSignal;
        const finishWait = new Promise<void>((resolve) => {
          finishSignal = resolve;
        });
        const finish = { wait: finishWait, signal: finishSignal } as Semaphore;
        const nextRunning = { hash: next.hash, prio: next.prio, finish } as JobRunning<T>;
        if (this.queueRunning.has(next.hash)) {
          throw new Error('async-await-queue: duplicate hash ' + next.hash);
        }
        this.queueRunning.set(next.hash, nextRunning);
        this.lastRun = Date.now();

        next.start.signal();
      }
    }
  }

  /**
   * Signal that the task `hash` has finished.<br>
   * Frees its slot in the queue
   * 
   * @method end
   * @param {any} hash Unique hash identifying the task, Symbol() works very well
   */
  end(hash: T): void {
    debug(hash, 'end');
    const me = this.queueRunning.get(hash);
    if (me === undefined)
      throw new Error('async-await-queue: queue desync for ' + hash);

    this.queueRunning.delete(hash);
    me.finish.signal();

    this.tryRun();
  }

  /**
   * Wait for a slot in the queue
   * 
   * @method wait
   * @param {any} hash Unique hash identifying the task
   * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
   * @return {Promise<void>} Resolved when the task is ready to run
   */
  async wait(hash: T, priority?: number): Promise<void> {
    const prio = priority ?? 0;
    debug(hash, 'waiting');

    /* Are we allowed to run? */
    /* This promise will be unlocked from the outside */
    /* and it cannot reject */
    let signal;
    const wait = new Promise<void>((resolve) => {
      signal = resolve;
    });
    /* Us on the queue */
    const meWaiting: JobWaiting<T> = { hash, prio, start: { signal, wait }, counter: this.counter++ };

    /* Get in the line */
    this.queueWaiting.push(meWaiting);
    this.tryRun();
    await wait;

    this.lastRun = Date.now();
    debug('will run', hash, `last=${this.lastRun % 1000}, now=${Date.now() % 1000}`);
  }

  /**
   * Run a job (equivalent to calling Queue.wait(), fn() and then Queue.end())<br>
   * fn can be both synchronous or asynchronous function
   * 
   * @method run
   * @param {Function} job The job
   * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
   * @return {Promise<any>} Resolved when the task has finished with the return value of fn
   */
  run<U>(job: () => Promise<U>, priority?: number): Promise<U> {
    const prio = priority ?? 0;
    const id = Symbol();
    return this.wait(id as T, prio)
      .then(job)
      .finally(() => {
        this.end(id as T);
      });
  }

  /**
   * Return the number of running and waiting jobs
   * 
   * @method stat
   * @return {QueueStats} running, waiting, last
   */
  stat(): QueueStats {
    return {
      running: this.queueRunning.size,
      waiting: this.queueWaiting.size(),
      last: this.lastRun
    };
  }

  /**
   * Returns a promise that resolves when the queue is empty
   * (or there are no more than <maxWaiting> waiting tasks
   * if the argument is provided)
   * 
   * @method flush
   * @return {Promise<void>}
   */
  async flush(maxWaiting?: number): Promise<void> {
    debug('flush', this.stat());
    while (this.queueRunning.size > 0 || this.queueWaiting.size() > 0) {
      const waiting = this.queueWaiting.peek();
      if (waiting) {
        await waiting.start.wait;
      }
      if (maxWaiting !== undefined && this.queueWaiting.size() < maxWaiting)
        return;
      if (this.queueRunning.size > 0) {
        const running = this.queueRunning.values().next().value as JobRunning<T>;
        await running.finish.wait;
      }
      debug('retry flush', this.stat());
    }
  }
}
