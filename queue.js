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
	getLastWaiting(prio) {
		for (let p of Object.keys(this.queueWaiting).sort((a, b) => b - a))
			if (this.queueWaiting[p] !== undefined && this.queueWaiting[p].length > 0 && p <= prio)
				return this.queueWaiting[p][this.queueWaiting[p].length - 1];
		return undefined;
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
	getFirstPrioirityWaiting() {
		for (let p of Object.keys(this.queueWaiting).sort((a, b) => a - b))
			if (this.queueWaiting[p] !== undefined && this.queueWaiting[p].length > 0)
				return p;
		return Infinity;
	}

	/**
	 * 
	 * @param {*} hash Unique hash identifying the task
	 */
	end(hash) {
		const me = this.dequeue(hash, this.queueRunning);
		/* Resolve my promise to wake up the tasks waiting on me */
		me.resolve();
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

		/* Tasks waiting on us will be waiting on this promise
		 * We will keep a reference on the resolve function
		 * and resolve it from the outside */
		me.promise = new Promise((resolve, reject) => {
			me.resolve = resolve;
		});
		/* Who is the last one in the line? */
		const lastWaiting = this.getLastWaiting(this.queueWaiting);
		/* Get in the line */
		this.queueWaiting[priority].push(me);
		if (lastWaiting)
			/* Wait on the last one's promise */
			await lastWaiting.promise;
		/* Are we allowed to run?
		* No, if there are already maxConcurrent running tasks
		* And no, if there are higher priority tasks waiting
		*/
		while (this.queueRunning.length >= this.maxConcurrent || this.getFirstPrioirityWaiting() < priority) {
			/* the guy who was the last one when we arrived is now running, we are one of the next */
			/* wait on all the running promises */
			await Promise.race(this.queueRunning.map(x => x.promise));
		}
		/* Get off the line and try to run */
		this.dequeue(hash, this.queueWaiting[priority]);
		/* Wait if it is too soon */
		if (Date.now() - this.lastRun < this.minCycle)
			await new Promise((resolve, reject) => setTimeout(resolve, this.minCycle - Date.now() + this.lastRun));
		/* We are allowed to run, signal to everyone who's waiting on us to advance */
		me.resolve();
		/* Create a new promise for everyone to wait */
		me.promise = new Promise((resolve, reject) => {
			me.resolve = resolve;
		});
		this.queueRunning.push(me);
	}
}

module.exports = {
	Queue
};