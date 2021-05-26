export interface QueueStats {running: {number}, waiting: {number}, last: {number}}

export class Queue {
/**
	 * @class Queue
	 * 
	 * Priority queue with rate limiting<br>
	 * See the medium article:<br>
	 * https://mmomtchev.medium.com/parallelizing-download-loops-in-js-with-async-await-queue-670420880cd6
	 * 
	 * @param {number} [_maxConcurrent=1] Number of tasks allowed to run simultaneously
	 * @param {number} [_minCycle=0] Minimum number of milliseconds between two consecutive tasks
	 */
  constructor(_maxConcurrent?: number, _minCycle?: number)

  /**
	 * Signal that the task `hash` has finished.<br>
	 * Frees its slot in the queue
	 * 
	 * @method end
	 * @param {any} hash Unique hash identifying the task, Symbol() works very well
	 */
  end(hash: any): void

  /**
	 * Wait for a slot in the queue
	 * 
	 * @method wait
	 * @param {any} hash Unique hash identifying the task
	 * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
	 * @return {Promise<void>} Resolved when the task is ready to run
	 */
  wait(hash: any, priority?: number): Promise<void>

  /**
	 * Run a job (equivalent to calling Queue.wait(), fn() and then Queue.end())<br>
	 * fn can be both synchronous or asynchronous function
	 * 
	 * @method run
	 * @param {Function} fn The job
	 * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
	 * @return {Promise<any>} Resolved when the task has finished with the return value of fn
	 */
  run(fn: Function, priority?: number): Promise<any>

  /**
	 * Return the number of running and waiting jobs
	 * 
	 * @method stat
	 * @return {QueueStats} running, waiting, last
	 */
  stat(): QueueStats

  /**
	 * Returns a promise that resolves when the queue is empty
	 * 
	 * @method flush
	 * @return {Promise<void>}
	 */
  flush(): Promise<void>
}

export default Queue;

