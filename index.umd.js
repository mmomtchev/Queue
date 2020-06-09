(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.default = factory());
}(this, (function () { 'use strict';

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
		 * 
		 * @param {*} hash Unique hash identifying the task
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
		 * @returns {object} running, waiting, last
		 */
		stat() {
			return {
				running: this.queueRunning.length,
				waiting: Object.keys(this.queueWaiting).reduce((t, x) => (t += this.queueWaiting[x].length), 0),
				last: this.lastRun
			};
		}

		/**
		 * @returns {Promise} returns when the queue is empty
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

	return Queue;

})));
