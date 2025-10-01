// /src/engine/TimeManager.js
export class TimeManager {
    constructor() {
        this.timeScale = 1.0;
        this.isSlowed = false;
    }

    setTimeScale(scale) {
        this.timeScale = scale;
        this.isSlowed = scale < 1.0;
    }

    slowDown(scale = 0.5) {
        this.timeScale = scale;
        this.isSlowed = true;
    }

    reset() {
        this.timeScale = 1.0;
        this.isSlowed = false;
    }

    toggle(scale = 0.5) {
        if (this.isSlowed) {
            this.reset();
        } else {
            this.slowDown(scale);
        }
    }
}
