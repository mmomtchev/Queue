const Queue = require('./index.umd.js');

const testSequence = [ 
	{ id: Symbol(0), prio: 5 },
	{ id: Symbol(1), prio: 5 },
	{ id: Symbol(2), prio: 5 },
	{ id: Symbol(3), prio: 5 },
	{ id: Symbol(4), prio: 0 },	
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

const testOrder = [];

async function do_test(id, pri) {
	await q.wait(id, pri);

	setTimeout(() => {
		console.log(id, q.stat());
		testOrder.push({ id });
		q.end(id);
	}, 1000);
}

let q = new Queue(2, 500);

for (let test of testSequence)
	do_test(test.id, test.prio);

q.flush().then(() => {
	for (let ti in correctOrder)
		if (correctOrder[ti].id !== testOrder[ti].id) {
			console.error(`test failed for sequence ${ti}, should be `, correctOrder[ti].id, ' is ', testOrder[ti].id);
			process.exit(1);
		}
	console.log('test ok');
	process.exit(0);
});

