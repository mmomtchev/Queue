/**
 * Lighter version of
 * Heap.ts from https://github.com/ignlg/heap-js/blob/master/src/Heap.ts
 * heap-js by @ignlg
 */

export type Comparator<T> = (a: T, b: T) => number;
export type IsEqual<T> = (e: T, o: T) => boolean;

export const toInt = (n: number): number => ~~n;

/**
 * Heap
 * @type {Class}
 */
export class Heap<T> {
  heapArray: Array<T> = [];
  _limit = 0;

  /**
   * Heap instance constructor.
   * @param  {Function} compare Optional comparison function, defaults to Heap.minComparator<number>
   */
  constructor(public compare: Comparator<T>) { }

  /*
            Static methods
   */

  /**
   * Gets children indices for given index.
   * @param  {Number} idx     Parent index
   * @return {Array(Number)}  Array of children indices
   */
  static getChildrenIndexOf(idx: number): Array<number> {
    return [idx * 2 + 1, idx * 2 + 2];
  }

  /**
   * Gets parent index for given index.
   * @param  {Number} idx  Children index
   * @return {Number | undefined}      Parent index, -1 if idx is 0
   */
  static getParentIndexOf(idx: number): number {
    if (idx <= 0) {
      return -1;
    }
    const whichChildren = idx % 2 ? 1 : 2;
    return Math.floor((idx - whichChildren) / 2);
  }

  /**
   * Gets sibling index for given index.
   * @param  {Number} idx  Children index
   * @return {Number | undefined}      Sibling index, -1 if idx is 0
   */
  static getSiblingIndexOf(idx: number): number {
    if (idx <= 0) {
      return -1;
    }
    const whichChildren = idx % 2 ? 1 : -1;
    return idx + whichChildren;
  }


  /**
   * Max heap comparison function.
   * @param  {any} a     First element
   * @param  {any} b     Second element
   * @return {Number}    0 if they're equal, positive if `a` goes up, negative if `b` goes up
   */
  static maxComparator<N>(a: N, b: N): number {
    if (b > a) {
      return 1;
    } else if (b < a) {
      return -1;
    } else {
      return 0;
    }
  }

  /**
   * Min number heap comparison function, default.
   * @param  {Number} a     First element
   * @param  {Number} b     Second element
   * @return {Number}    0 if they're equal, positive if `a` goes up, negative if `b` goes up
   */
  static minComparatorNumber(a: number, b: number): number {
    return a - b;
  }

  /**
   * Max number heap comparison function.
   * @param  {Number} a     First element
   * @param  {Number} b     Second element
   * @return {Number}    0 if they're equal, positive if `a` goes up, negative if `b` goes up
   */
  static maxComparatorNumber(a: number, b: number): number {
    return b - a;
  }

  /*
            Instance methods
   */

  /**
   * Adds an element to the heap. Aliases: `offer`.
   * Same as: push(element)
   * @param {any} element Element to be added
   * @return {Boolean} true
   */
  add(element: T): boolean {
    this._sortNodeUp(this.heapArray.push(element) - 1);
    return true;
  }

  /**
   * Adds an array of elements to the heap.
   * Similar as: push(element, element, ...).
   * @param {Array} elements Elements to be added
   * @return {Boolean} true
   */
  addAll(elements: Array<T>): boolean {
    let i = this.length();
    this.heapArray.push(...elements);
    for (const l = this.length(); i < l; ++i) {
      this._sortNodeUp(i);
    }
    return true;
  }


  /**
   * Remove all of the elements from this heap.
   */
  clear(): void {
    this.heapArray = [];
  }

  /**
   * Returns the comparison function.
   * @return {Function}
   */
  comparator(): Comparator<T> {
    return this.compare;
  }


  /**
   * Initialise a heap, sorting nodes
   * @param  {Array} array Optional initial state array
   */
  init(array?: Array<T>): void {
    if (array) {
      this.heapArray = [...array];
    }
    for (let i = Math.floor(this.heapArray.length); i >= 0; --i) {
      this._sortNodeDown(i);
    }
  }

  /**
   * Test if the heap has no elements.
   * @return {Boolean} True if no elements on the heap
   */
  isEmpty(): boolean {
    return this.length() === 0;
  }

  /**
   * Get the leafs of the tree (no children nodes)
   */
  leafs(): Array<T> {
    if (this.heapArray.length === 0) {
      return [];
    }
    const pi = Heap.getParentIndexOf(this.heapArray.length - 1);
    return this.heapArray.slice(pi + 1);
  }

  /**
   * Length of the heap.
   * @return {Number}
   */
  length(): number {
    return this.heapArray.length;
  }

  /**
   * Top node. Aliases: `element`.
   * Same as: `top(1)[0]`
   * @return {any} Top node
   */
  peek(): T | undefined {
    return this.heapArray[0];
  }

  /**
   * Extract the top node (root). Aliases: `poll`.
   * @return {any} Extracted top node, undefined if empty
   */
  pop(): T | undefined {
    const last = this.heapArray.pop();
    if (this.length() > 0 && last !== undefined) {
      return this.replace(last);
    }
    return last;
  }

  /**
   * Pushes element(s) to the heap.
   * @param  {...any} elements Elements to insert
   * @return {Boolean} True if elements are present
   */
  push(...elements: Array<T>): boolean {
    if (elements.length < 1) {
      return false;
    } else if (elements.length === 1) {
      return this.add(elements[0]);
    } else {
      return this.addAll(elements);
    }
  }

  /**
   * Pop the current peek value, and add the new item.
   * @param  {any} element  Element to replace peek
   * @return {any}         Old peek
   */
  replace(element: T): T {
    const peek = this.heapArray[0];
    this.heapArray[0] = element;
    this._sortNodeDown(0);
    return peek;
  }

  /**
   * Size of the heap
   * @return {Number}
   */
  size(): number {
    return this.length();
  }


  /**
   * Returns the inverse to the comparison function.
   * @return {Function}
   */
  _invertedCompare = (a: T, b: T): number => {
    return -1 * this.compare(a, b);
  };

  /**
   * Move a node to a new index, switching places
   * @param  {Number} j First node index
   * @param  {Number} k Another node index
   */
  _moveNode(j: number, k: number): void {
    [this.heapArray[j], this.heapArray[k]] = [this.heapArray[k], this.heapArray[j]];
  }

  /**
   * Move a node down the tree (to the leaves) to find a place where the heap is sorted.
   * @param  {Number} i Index of the node
   */
  _sortNodeDown(i: number): void {
    let moveIt = i < this.heapArray.length - 1;
    const self = this.heapArray[i];

    const getPotentialParent = (best: number, j: number) => {
      if (this.heapArray.length > j && this.compare(this.heapArray[j], this.heapArray[best]) < 0) {
        best = j;
      }
      return best;
    };

    while (moveIt) {
      const childrenIdx = Heap.getChildrenIndexOf(i);
      const bestChildIndex = childrenIdx.reduce(getPotentialParent, childrenIdx[0]);
      const bestChild = this.heapArray[bestChildIndex];
      if (typeof bestChild !== 'undefined' && this.compare(self, bestChild) > 0) {
        this._moveNode(i, bestChildIndex);
        i = bestChildIndex;
      } else {
        moveIt = false;
      }
    }
  }

  /**
   * Move a node up the tree (to the root) to find a place where the heap is sorted.
   * @param  {Number} i Index of the node
   */
  _sortNodeUp(i: number): void {
    let moveIt = i > 0;
    while (moveIt) {
      const pi = Heap.getParentIndexOf(i);
      if (pi >= 0 && this.compare(this.heapArray[pi], this.heapArray[i]) > 0) {
        this._moveNode(i, pi);
        i = pi;
      } else {
        moveIt = false;
      }
    }
  }

}
