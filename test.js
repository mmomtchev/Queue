const Queue = require('async-await-queue');

async function test(id, pri) {
	await q.wait(id, pri);

	setTimeout(() => {
		console.log(id);
		q.end(id);
	}, 100);
}


setTimeout(() => {}, 6000);

let q = new Queue(2, 1000);

test(1, 5);
test(2, 5);
test(3, 5);
test(4, 5);
test(5, 0);


