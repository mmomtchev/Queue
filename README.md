# async/await-compatible Promise-based priority queues

** Bare-bones implementation **

This is an interesting solution to the priority queues problem.

There are other Promise-based queues out there but they are not async/await compatible and do not support priorities.

It guarantees order and never wakes up contexts that won't run.

I use it with tens of thousands of jobs on the queue. O(1) on the number of jobs, O(n) on the number of different priorities, so be reasonable. Just make sure to awalys call .end().

These can be used to rate-limit expensive external API requests.

The queues keep references to the Promise resolve() function and resolve it from the outside.
This is a very unusual use of Promises to implement locks that I find interesting.
The language specification doesn't make it clear if this is allowed or not, but it seems to work very well.

Install:

`npm install --save async-await-queue`

Example use:

```
const Queue = require('async-await-queue');
/* No more than 2 concurrent tasks with
 * at least 100ms between two tasks
 */
myq = new Queue(2, 100);

....

async function downloadTheUniverse() {
    /* The third call will wait for the previous two to complete
        * plus the time needed to make this at least 100ms
        * after the second call
            * The first argument needs to be unique for every
            * task on the queue
        */
    const me = Symbol();
    await myq.wait(me, myPriority);

    try {
        /* Do your expensive task */
        downloadTheInternet();

    } catch (e) {
        
    } finally {
        /* Signal that we are finished */
        /* Do not forget to manage the exceptions! */
        myq.end(me);
    }
}
```
