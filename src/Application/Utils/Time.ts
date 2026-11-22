import UIEventBus from '../UI/EventBus';
import EventEmitter from './EventEmitter';

export default class Time extends EventEmitter {
    start: number;
    current: number;
    elapsed: number;
    delta: number;
    private rafId: number | null;
    private hiddenAt: number | null;

    constructor() {
        super();

        // Setup
        this.start = Date.now();
        this.current = this.start;
        this.elapsed = 0;
        this.delta = 16;
        this.rafId = null;
        this.hiddenAt = null;

        this.startTick();

        UIEventBus.on('loadingScreenDone', () => {
            this.start = Date.now();
        });

        // Suspend the 3D loop while the tab is hidden; keep elapsed time
        // continuous so camera drift and steam do not jump on return.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.rafId !== null) {
                    window.cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
                this.hiddenAt = Date.now();
            } else {
                if (this.hiddenAt !== null) {
                    this.start += Date.now() - this.hiddenAt;
                    this.hiddenAt = null;
                }
                this.current = Date.now();
                this.startTick();
            }
        });
    }

    private startTick() {
        if (this.rafId === null) {
            this.rafId = window.requestAnimationFrame(() => {
                this.tick();
            });
        }
    }

    tick() {
        this.rafId = null;
        const currentTime = Date.now();
        this.delta = currentTime - this.current;
        this.current = currentTime;
        this.elapsed = this.current - this.start;

        this.trigger('tick');

        this.startTick();
    }
}
