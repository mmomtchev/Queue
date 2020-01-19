const Queue = require('./queue');


async function test(id, pri) {
	await q.wait(id, pri);

	setTimeout(() => {
		console.log(id);
		q.end(id);
		tests--;
	}, 1000);
}

let q = new Queue(2, 500);

/* The correct order of execution should be 1, 2, 5, 3, 4 */
let tests = 5;
test(Symbol(1), 5);
test(Symbol(2), 5);
test(Symbol(3), 5);
test(Symbol(4), 5);
test(Symbol(5), 0);

function wait() {
	if (tests > 0)
		setTimeout(wait, 1000);
}
wait();