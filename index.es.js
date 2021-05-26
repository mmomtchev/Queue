class Queue {
	/**
	 * @class Queue
	 * Priority queue with rate limiting
	 * See the medium article:
	 * https://mmomtchev.medium.com/parallelizing-download-loops-in-js-with-async-await-queue-670420880cd6
	 * 
	 * @param {number} [_maxConcurrent=1] Number of tasks allowed to run simultaneously
	 * @param {number} [_minCycle=0] Minimum number of milliseconds between two consecutive tasks
	 */
	constructor(_maxConcurrent, _minCycle) {
		this.maxConcurrent = _maxConcurrent || 1;
		this.minCycle = _minCycle || 0;
		this.queueRunning = [];
		this.queueWaiting = {};
		this.lastRun = 0;
	}

	/** @private */
	dequeue(hash) {
		const q = this.queueRunning;
		const idx = q.findIndex(x => x.hash === hash);
		if (idx == -1)
			throw 'queue desync';
		const o = q[idx];
		q.splice(idx, 1);
		return o;
	}

	/** @private */
	getFirstWaiting() {
		for (let p of Object.keys(this.queueWaiting).sort((a, b) => a - b))
			if (this.queueWaiting[p] !== undefined && this.queueWaiting[p].length > 0)
				return this.queueWaiting[p];
		return undefined;
	}

	/**
	 * Signal that the task `hash` has finished
	 * Frees its slot in the queue
	 * 
	 * @method end
	 * @param {any} hash Unique hash identifying the task, Symbol() works very well
	 */
	end(hash) {
		const me = this.dequeue(hash);
		me.resolve();
		/* Choose the next task to run and unblock its promise */
		const q = this.getFirstWaiting();
		if (q !== undefined) {
			const next = q.shift();
			next.resolve();
		}
	}

	/**
	 * Wait for a slot in the queue
	 * 
	 * @method wait
	 * @param {any} hash Unique hash identifying the task
	 * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
	 * @return {Promise<void>} Resolved when the task is ready to run
	 */
	async wait(hash, _priority) {
		const priority = _priority === undefined ? 0 : _priority;
		/* Us on the queue */
		let me = { hash, priority };
		/* Create priorities on the fly */
		if (this.queueWaiting[priority] == undefined)
			this.queueWaiting[priority] = [];

		/* Are we allowed to run? */
		if (this.queueRunning.length >= this.maxConcurrent) {
			/* This promise will be unlocked from the outside */
			/* and it cannot reject */
			me.promise = new Promise((resolve) => {
				me.resolve = resolve;
			});
			/* Get in the line */
			this.queueWaiting[priority].push(me);
			await me.promise;
		}

		this.queueRunning.push(me);
		me.promise = new Promise((resolve) => {
			me.resolve = resolve;
		});
		/* Wait if it is too soon */
		while (Date.now() - this.lastRun < this.minCycle) {
			await new Promise((resolve) => setTimeout(resolve, this.minCycle - Date.now() + this.lastRun));
		}
		this.lastRun = Date.now();
	}

	/**
	 * Run a job (equivalent to calling Queue.wait(), job() and then Queue.end())
	 *
	 * fn can be both synchronous or asynchronous function
	 * 
	 * @method run<T>
	 * @param {() => T|Promise<T>} fn The job
	 * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
	 * @return {Promise<T>} Resolved when the task has finished with the return value of fn
	 */
	run(job, _priority) {
		const priority = _priority === undefined ? 0 : _priority;
		const id = Symbol();
		return this.wait(id, priority)
			.then(() => job())
			.finally((r) => {
				this.end(id);
				return r;
			});
	}

	/**
	 * @interface QueueStats {running: {number}, waiting: {number}, last: {number}}
	 */

	/**
	 * Return the number of running and waiting jobs
	 * 
	 * @method stat
	 * @return {QueueStats} running, waiting, last
	 */
	stat() {
		return {
			running: this.queueRunning.length,
			waiting: Object.keys(this.queueWaiting).reduce((t, x) => (t += this.queueWaiting[x].length), 0),
			last: this.lastRun
		};
	}

	/**
	 * Returns a promise that resolves when the queue is empty
	 * 
	 * @method flush
	 * @return {Promise<void>}
	 */
	async flush() {
		/* Aways wait on the lowest priority in the queue */
		while (this.stat().waiting > 0) {
			for (let p of Object.keys(this.queueWaiting).sort((a, b) => b - a)) {
				const qp = this.queueWaiting[p];
				if (qp !== undefined && qp.length > 0) {
					await qp[qp.length - 1].promise;
				}
			}
		}
		/* And then finish on the running queue */
		while (this.queueRunning.length > 0) {
			await Promise.allSettled(this.queueRunning.map(x => x.promise));
		}
	}
}

export default Queue;
