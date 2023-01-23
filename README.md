# async/await-compatible Promise-based priority queues

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/mmomtchev/Queue/workflows/Node.js%20CI/badge.svg)](https://github.com/mmomtchev/Queue/actions?query=workflow%3A%22Node.js+CI%22)
[![codecov](https://codecov.io/gh/mmomtchev/Queue/branch/master/graph/badge.svg)](https://codecov.io/gh/mmomtchev/Queue)

Total size, including `typescript-collections/PriorityQueue.js`: **`6.6Kbytes` uncompressed, `2.2KBytes` gzip-compressed**

There is a medium story about using this package to parallelize download loops : [Parallelizing download loops in JS with async-await-queue](https://medium.com/@mmomtchev/parallelizing-download-loops-in-js-with-async-await-queue-670420880cd6)

This is an interesting solution to the priority queues problem.

There are other Promise-based queues out there but they are not async/await compatible and do not support priorities.

It guarantees order and never wakes up contexts that won't run.

I use it with tens of thousands of jobs on the queue. *O(log(n))* on the number of jobs, *O(log(n))* on the number of different priorities. Just make sure to awalys call `Queue.end()`. Or, since 1.2, there is a safer, but less versatile method, `Queue.run()`.

These can be used to rate-limit expensive external API requests.

The queues keep references to the Promise `resolve()` function and resolve it from outside of the Promise constructor.
This is a very unusual use of Promises to implement locks that I find interesting.
The language specification doesn't make it clear if this is allowed or not, but it seems to work very well.
It works both in the browser and in Node.js.

# Install

`npm install --save async-await-queue`

# Typical usage

Require as **CJS**
```js
const { Queue } = require('async-await-queue');
```

Import as **ES Module**
```js
import { Queue } from 'async-await-queue';
```


(or read the [jsdoc](https://mmomtchev.github.io/Queue/))

***IMPORTANT*** Keep in mind that when running asynchronous code without explicitly `await`ing it, you should always handle the eventual Promise rejections by a `.catch()` statement.

```js
const Queue = require('async-await-queue');
/* No more than 2 concurrent tasks with
 * at least 100ms between two tasks
 */
const myq = new Queue(2, 100);

....

const myPriority = -1;


/* This function will launch all tasks and will
 * wait for them to be scheduled, returning
 * only when all tasks have finished
 */
async function downloadTheInternet() {
	for (let site of Internet) {
		/* The third call will wait for the previous two to complete
		* plus the time needed to make this at least 100ms
		* after the second call
		* The first argument needs to be unique for every
		* task on the queue
		*/
		const me = Symbol();
		/* We wait in the line here */
		await myq.wait(me, myPriority);

		/* Do your expensive async task here
		* Queue will schedule it at
		* no more than 2 parallel running requests
		* launched at least 100ms apart
		*/
		download(site)
			/* Signal that we are finished */
			/* Do not forget to handle the exceptions! */
			.catch((e) => console.error(e))
			.finally(() => myq.end(me));
	}
	return await myq.flush();
}

/* This is the new style API introduced in 1.2
 * It is equivalent to the last example
 */
async function downloadTheInternet() {
	const q = [];
	for (let site of Internet) {
		/* The third call will wait for the previous two to complete
		* plus the time needed to make this at least 100ms
		* after the second call
		*/
		q.push(myq.run(() =>
			download(site)
			.catch((e) => console.error(e))
		);
	}
	return Promise.all(q);
}


/* This function will execute a single task at a time
 * waiting for its place in the queue
 */
async function downloadTheInternet() {
	let p;
	/* The third call will wait for the previous two to complete
	* plus the time needed to make this at least 100ms
	* after the second call
	* The first argument needs to be unique for every
	* task on the queue
	*/
	const me = Symbol();
	/* We wait in the line here */
	await myq.wait(me, myPriority);

	/* Do your expensive async task here
	* Queue will schedule it at
	* no more than 2 parallel running requests
	* launched at least 100ms apart
	*/
	try {
		await download(site);
	} catch (e) {
		console.error(e);
	} finally {
		/* Signal that we are finished */
		/* Do not forget to handle the exceptions! */
		myq.end(me);
	}
}


/* This function will schedule all the taks and
 * then will return immediately a single Promise
 * that can be awaited upon
 */
async function downloadTheInternet() {
	const q = [];
	for (let site of Internet) {
		/* The third call will wait for the previous two to complete
		* plus the time needed to make this at least 100ms
		* after the second call
		* The first argument needs to be unique for every
		* task on the queue
		*/
		const me = Symbol();
		q.push(myq.wait(me, myPriority)
			.then(() => download(site))
			.catch((e) => console.error(e))
			.finally(() => myq.end(me)));
	}
	return Promise.all(q);
}

```
