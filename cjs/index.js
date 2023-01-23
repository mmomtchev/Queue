"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
exports.__esModule = true;
exports.Queue = void 0;
var typescript_collections_1 = require("typescript-collections");
// This will be optimized away by V8 as I have proven in
// https://bugs.chromium.org/p/v8/issues/detail?id=12756
var debug = ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.QUEUE_DEBUG) ? console.debug.bind(console) : function () { return undefined; };
function prioCompare(a, b) {
    return b.prio - a.prio || b.counter - a.counter;
}
var Queue = /** @class */ (function () {
    /**
     * @class Queue
     *
     * Priority queue with rate limiting<br>
     * See the medium article:<br>
     * https://mmomtchev.medium.com/parallelizing-download-loops-in-js-with-async-await-queue-670420880cd6
     * (the code has changed a lot since that article but the basic idea of using Promises as locks remains the same)
     *
     * @param {number} [maxConcurrent=1] Number of tasks allowed to run simultaneously
     * @param {number} [minCycle=0] Minimum number of milliseconds between two consecutive tasks
     */
    function Queue(maxConcurrent, minCycle) {
        this.maxConcurrent = maxConcurrent || 1;
        this.minCycle = minCycle || 0;
        this.queueRunning = new Map;
        this.queueWaiting = new typescript_collections_1.PriorityQueue(prioCompare);
        this.lastRun = 0;
        this.nextTimer = null;
        this.counter = 0;
    }
    /**
     * @private
     */
    Queue.prototype.tryRun = function () {
        var _this = this;
        debug('tryRun');
        this.nextTimer = null;
        if (!this.queueWaiting.peek() || this.queueRunning.size >= this.maxConcurrent)
            return;
        /* Wait if it is too soon */
        if (Date.now() - this.lastRun < this.minCycle) {
            debug('will throttle', Date.now() % 1000, (this.minCycle + this.lastRun) % 1000, Date.now() - this.lastRun);
            if (this.nextTimer === null) {
                this.nextTimer = new Promise(function (resolve) { return setTimeout(function () {
                    _this.tryRun();
                    resolve();
                }, _this.minCycle - Date.now() + _this.lastRun); });
            }
        }
        else {
            /* Choose the next task to run and unblock its promise */
            var next = this.queueWaiting.dequeue();
            debug('wont throttle', this.lastRun % 1000, Date.now() % 1000, 'next is ', next === null || next === void 0 ? void 0 : next.hash);
            if (next !== undefined) {
                var finishSignal_1;
                var finishWait = new Promise(function (resolve) {
                    finishSignal_1 = resolve;
                });
                var finish = { wait: finishWait, signal: finishSignal_1 };
                var nextRunning = { hash: next.hash, prio: next.prio, finish: finish };
                this.queueRunning.set(next.hash, nextRunning);
                this.lastRun = Date.now();
                next.start.signal();
            }
        }
    };
    /**
     * Signal that the task `hash` has finished.<br>
     * Frees its slot in the queue
     *
     * @method end
     * @param {any} hash Unique hash identifying the task, Symbol() works very well
     */
    Queue.prototype.end = function (hash) {
        debug(hash, 'end');
        var me = this.queueRunning.get(hash);
        if (me === undefined)
            throw new Error('queue desync');
        this.queueRunning["delete"](hash);
        me.finish.signal();
        this.tryRun();
    };
    /**
     * Wait for a slot in the queue
     *
     * @method wait
     * @param {any} hash Unique hash identifying the task
     * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
     * @return {Promise<void>} Resolved when the task is ready to run
     */
    Queue.prototype.wait = function (hash, priority) {
        return __awaiter(this, void 0, void 0, function () {
            var prio, signal, wait, meWaiting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prio = priority !== null && priority !== void 0 ? priority : 0;
                        debug(hash, 'waiting');
                        wait = new Promise(function (resolve) {
                            signal = resolve;
                        });
                        meWaiting = { hash: hash, prio: prio, start: { signal: signal, wait: wait }, counter: this.counter++ };
                        /* Get in the line */
                        this.queueWaiting.enqueue(meWaiting);
                        this.tryRun();
                        return [4 /*yield*/, wait];
                    case 1:
                        _a.sent();
                        this.lastRun = Date.now();
                        debug(hash, 'will run', this.lastRun % 1000, Date.now() % 1000);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run a job (equivalent to calling Queue.wait(), fn() and then Queue.end())<br>
     * fn can be both synchronous or asynchronous function
     *
     * @method run
     * @param {Function} job The job
     * @param {number} [priority=0] Optional priority, -1 is higher priority than 1
     * @return {Promise<any>} Resolved when the task has finished with the return value of fn
     */
    Queue.prototype.run = function (job, priority) {
        var _this = this;
        var prio = priority !== null && priority !== void 0 ? priority : 0;
        var id = Symbol();
        return this.wait(id, prio)
            .then(job)["finally"](function () {
            _this.end(id);
        });
    };
    /**
     * @interface QueueStats {running: number, waiting: number, last: number}
     */
    /**
     * Return the number of running and waiting jobs
     *
     * @method stat
     * @return {QueueStats} running, waiting, last
     */
    Queue.prototype.stat = function () {
        return {
            running: this.queueRunning.size,
            waiting: this.queueWaiting.size(),
            last: this.lastRun
        };
    };
    /**
     * Returns a promise that resolves when the queue is empty
     *
     * @method flush
     * @return {Promise<void>}
     */
    Queue.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var waiting, running;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug('flush', this.stat());
                        _a.label = 1;
                    case 1:
                        if (!(this.queueRunning.size > 0 || this.queueWaiting.size() > 0)) return [3 /*break*/, 6];
                        waiting = this.queueWaiting.peek();
                        if (!waiting) return [3 /*break*/, 3];
                        return [4 /*yield*/, waiting.start.wait];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!(this.queueRunning.size > 0)) return [3 /*break*/, 5];
                        running = this.queueRunning.values().next().value;
                        return [4 /*yield*/, running.finish.wait];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        debug('retry flush', this.stat());
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return Queue;
}());
exports.Queue = Queue;
//# sourceMappingURL=index.js.map