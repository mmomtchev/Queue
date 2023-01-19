const Queue = require('../index.umd.js');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const testSequence = [
	{ id: Symbol(0), prio: 5 },
	{ id: Symbol(1), prio: 5 },
	{ id: Symbol(2), prio: 5 },
	{ id: Symbol(3), prio: 5 },
	{ id: Symbol(4) },
];

/* The correct order of execution should be 0, 1, 4, 2, 3 */
/* 0 passes immediately, there is 1 running */
/* 1 passes immediately, there are 2 running */
/* 2 has to wait */
/* 3 has to wait */
/* 4 has to wait but passes before 2 and 3 */
/* 4 is the first to be dequeued */
/* 2 is next */
/* 3 is last */
const correctOrder = [
	testSequence[0],
	testSequence[1],
	testSequence[4],
	testSequence[2],
	testSequence[3]
];

/* Style 1 -> call wait, do your job, then call end */
describe('wait() -> end()', () => {
	it('test1', async () => {
		const testOrder = [];
		const q = new Queue(2, 500);

		for (const test of testSequence) {
			q.wait(test.id, test.prio).then(() => {
				setTimeout(() => {
					//console.log(test.id, q.stat());
					testOrder.push(test);
					q.end(test.id);
				}, 1000);
			});
		}
		await q.flush();
		assert.sameOrderedMembers(testOrder, correctOrder);
	});
});

/* Style 2 -> call run and pass a function */
describe('run()', () => {
	it('test2', async () => {
		const testOrder = [];
		const q = new Queue(2, 500);

		for (const test of testSequence)
			q.run(() => {
				return new Promise((res) => {
					setTimeout(() => {
						//console.log(test.id, q.stat());
						testOrder.push(test);
						res(test.id);
					}, 1000);
				});
			}, test.prio)
				.then((r) => assert(r === test.id));

		await q.flush();
		assert.sameOrderedMembers(testOrder, correctOrder);
	});
});
