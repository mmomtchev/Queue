/* eslint-disable @typescript-eslint/no-var-requires */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const { Queue } = require('..');

const testSequence = [
	{ id: Symbol(0), prio: 5 },
	{ id: Symbol(1), prio: 5 },
	{ id: Symbol(2), prio: 5 },
	{ id: Symbol(3), prio: 5 },
	{ id: Symbol(4) },
];

/* The correct order of execution should be 0, 1, 4, 2, 3 */
/* 0 passes immediately, there is 1 running */
/* 1 has to wait for the cool down, there is still 1 running */
/* 2 has to wait */
/* 3 has to wait */
/* 4 has to wait but passes before the others */
/* 4 is the first to be dequeued */
/* 1 is next */
/* 2 is next */
/* 3 is last */
const correctOrder = [
	testSequence[0],
	testSequence[4],
	testSequence[1],
	testSequence[2],
	testSequence[3]
];

function checkIntervals(times, interval) {
	for (let i = 1; i < times.length; i++)
		// We cut 2ms slack
		if (times[i] - times[i - 1] < interval - 2)
			throw new Error(`Bad timing between ${i} and ${i - 1}: ${times[i]} - ${times[i - 1]} = ${times[i] - times[i - 1]}`);
}

/* Style 1 -> call wait, do your job, then call end */
describe('wait() -> end()', () => {
	it('simple test', async () => {
		const testOrder = [];
		const q = new Queue(2, 50);
		const times = [];
		let concurrency = 0;

		for (const test of testSequence) {
			q.wait(test.id, test.prio).then(() => {
				concurrency++;
				times.push(Date.now());
				testOrder.push(test);
				assert.isAtMost(concurrency, 2);
				setTimeout(() => {
					concurrency--;
					q.end(test.id);
				}, 200);
			});
		}
		await q.flush();
		checkIntervals(times, 50);
		assert.sameOrderedMembers(testOrder, correctOrder);
	});

	it('simple ordering w/ throttling', async () => {
		const testOrder = [];
		const q = new Queue(2, 50);

		const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		const times = [];
		for (const item of seq) {
			q.wait(item).then(() => {
				testOrder.push(item);
				times.push(Date.now());
				q.end(item);
			});
		}
		await q.flush();
		checkIntervals(times, 50);
		assert.sameOrderedMembers(testOrder, seq);
	});

	it('simple ordering w/o throttling', async () => {
		const testOrder = [];
		const q = new Queue(2, 0);

		const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		const times = [];
		for (const item of seq) {
			q.wait(item).then(() => {
				testOrder.push(item);
				times.push(Date.now());
				q.end(item);
			});
		}
		await q.flush();
		checkIntervals(times, 0);
		assert.sameOrderedMembers(testOrder, seq);
	});

	it('simple ordering w/ race condition', async () => {
		// Mixing throttling with timeouts from other sources
		// More generic version inspired by https://github.com/mmomtchev/Queue/pull/54
		const q = new Queue(2, 50);
		const actualOrder = [];
		const expectedOrder = [];
		const times = [];

		setTimeout(async () => {
			expectedOrder.push('old');
			await q.wait('old', 0);
			actualOrder.push('old');
			q.end('old');
		}, 0);

		async function task(id) {
			expectedOrder.push(id);
			await q.wait(id, 0);
			actualOrder.push(id);
			times.push(Date.now());
			q.end(id);
		}

		task(1);
		task(2);
		task(3);

		await q.flush();
		checkIntervals(times, 50);
		assert.sameOrderedMembers(actualOrder, expectedOrder);
	});
});

/* Style 2 -> call run and pass a function */
describe('run()', () => {
	it('simple test', async () => {
		const testOrder = [];
		const q = new Queue(2, 50);
		const times = [];
		let concurrency = 0;

		for (const test of testSequence)
			q.run(() => {
				concurrency++;
				assert.isAtMost(concurrency, 2);
				times.push(Date.now());
				return new Promise((res) => {
					setTimeout(() => {
						testOrder.push(test);
						concurrency--;
						res(test.id);
					}, 100);
				});
			}, test.prio)
				.then((r) => assert(r === test.id));

		await q.flush();
		checkIntervals(times, 50);
		assert.sameOrderedMembers(testOrder, correctOrder);
	});
});
