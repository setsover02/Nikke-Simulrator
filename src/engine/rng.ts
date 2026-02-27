// engine/rng.ts

export class Random {
    private seed: number;

    constructor(seed = Date.now()) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return this.seed / 2147483647;
    }

    range(min: number, max: number) {
        return min + this.next() * (max - min);
    }
}