const Queue = require('./queue');


async function test(id, pri) {
	await q.wait(id, pri);

	setTimeout(() => {
		console.log(id, q.stat());
		q.end(id);
	}, 1000);
}

let q = new Queue(2, 500);

/* The correct order of execution should be 1, 2, 5, 3, 4 */
test(Symbol(1), 5);
test(Symbol(2), 5);
test(Symbol(3), 5);
test(Symbol(4), 5);
test(Symbol(5), 0);

q.flush().then(() => {
	process.exit(0);
});

