export as namespace AsyncAwaitQueue;

export = Queue;

interface Stat {
    running: number;
    waiting: number;
    last: Date;
}

declare class Queue {
    constructor(_maxConcurrent?: number, _minCycle?: number);

    end(hash: any);
    wait(hash: any, priority: number): Promise<void>;
    stat(): Stat;
    flush(): Promise<void>;
}