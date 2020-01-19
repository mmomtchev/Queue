const Queue = require('./queue');


async function test(id, pri) {
	await q.wait(id, pri);

	setTimeout(() => {
		console.log(id);
		q.end(id);
		tests--;
	}, 100);
}

let q = new Queue(2, 1000);

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