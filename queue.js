class Queue {
	/**
	 * 
	 * @param {number} _maxConcurrent Number of tasks allowed to run simultaneously
	 * @param {number} _minCycle Minimum number of milliseconds between two tasks
	 */
	constructor(_maxConcurrent, _minCycle) {
		this.maxConcurrent = _maxConcurrent || 1;
		this.minCycle = _minCycle || 0;
		this.queueRunning = [];
		this.queueWaiting = {};
		this.lastRun = 0;
	}

	/** @private */
	dequeue(hash, _q) {
		const q = _q || this.queueRunning;
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
	 * 
	 * @param {*} hash Unique hash identifying the task
	 */
	end(hash) {
		this.dequeue(hash, this.queueRunning);
		/* Choose the next task to run and unblock its promise */
		const q = this.getFirstWaiting();
		if (q !== undefined) {
			const next = q.shift();
			next.resolve();
		}
	}

	/**
	 * 
	 * @param {*} hash Unique hash identifying the task
	 * @param {number} priority
	 * @returns {Promise} Resolved when the task is ready to run
	 */
	async wait(hash, priority) {
		/* Us on the queue */
		let me = { hash, priority };
		/* Create priorities on the fly */
		if (this.queueWaiting[priority] == undefined)
			this.queueWaiting[priority] = [];

		/* Are we allowed to run? */
		if (this.queueRunning.length >= this.maxConcurrent) {
			/* This promise will be unlocked from the outside */
			me.promise = new Promise((resolve, reject) => {
				me.resolve = resolve;
			});
			/* Get in the line */
			this.queueWaiting[priority].push(me);
			await me.promise;
		}

		this.queueRunning.push(me);
		/* Wait while keeping the running lock if it is too soon */
		while (Date.now() - this.lastRun < this.minCycle) {
			await new Promise((resolve, reject) => setTimeout(resolve, this.minCycle - Date.now() + this.lastRun));
		}
		this.lastRun = Date.now();
	}
}

module.exports = Queue;
