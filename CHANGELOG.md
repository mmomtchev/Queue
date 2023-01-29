# async-await-queue Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [2.1.1] 2023-01-30
- Raise an exception when trying to add a task with an already existing id (instead of failing when trying to run it)
- Ability to dequeue multiple tasks when scheduling (fixes not reaching the maximum concurrency limit when the cool down is very low but more than zero)
- Ability to wait until there are only X tasks waiting in the queue (for throttling when enqueuing)

## [2.1.0] 2023-01-25
- Builtin ultra-light heap implementation from [`heap-js`](https://github.com/ignlg/heap-js) by @ignlg
- Drop the default export
- Size down to 1.2KBytes when compressed
- Now ships transpiled to ES2017 (aka ES8) (as it supposes that you have `async`/`await`)

# [2.0.0] 2023-01-19
- Almost complete rewrite in TypeScript
- Use `PriorityQueue` from `typescript-collection`
- O(log(n)) in all cases
- Switch to mocha and test CJS/ES6/TS
- Many bugs and edge cases fixed
- The preferred way to import is now via the named export but the default export is still there
- 2.0.0 can lead to a slightly different execution order when using different priorities, throttling and concurrency-limiting at the same time - the new order is the correct one

### [1.2.1] 2021-04-05
 - Fix [#37](https://github.com/mmomtchev/Queue/issues/37) TypeScript definitions for `QueueStats`

## [1.2.0] 2021-06-02

### Added
 - Add a run() method

### [1.1.1] 2020-06-13

 - Add TypeScript definitions

## [1.1.0] 2020-06-09

 - Support both UMD/CJS and ES Modules

### [1.0.7] 2020-06-04

 - Linting, unit testing, code coverage and various other goodness