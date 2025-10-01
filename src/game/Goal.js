import { Vec2 } from '../utils/Vec2.js';

export class Goal {
    constructor(x, y) {
        this.position = new Vec2(x, y);
        this.width = 32;
        this.height = 64;
    }

    draw(context) {
        context.fillStyle = 'gold';
        context.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
}
