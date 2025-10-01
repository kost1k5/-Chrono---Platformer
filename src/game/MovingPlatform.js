import { Vec2 } from '../utils/Vec2.js';

export class MovingPlatform {
    constructor(x, y, width, height, endX, endY, speed) {
        this.position = new Vec2(x, y);
        this.width = width;
        this.height = height;
        this.startPoint = new Vec2(x, y);
        this.endPoint = new Vec2(endX, endY);
        this.speed = speed;
        this.velocity = new Vec2(0, 0);
        this.direction = 1; // 1 for towards end, -1 for towards start

        this.calculateVelocity();
    }

    calculateVelocity() {
        const diff = this.endPoint.subtract(this.startPoint);
        if (diff.magnitude() > 0) {
            this.velocity = diff.normalize().multiply(this.speed);
        }
    }

    update(deltaTime) {
        const dt = deltaTime / 1000;

        // Move the platform
        this.position.x += this.velocity.x * this.direction * dt;
        this.position.y += this.velocity.y * this.direction * dt;

        // Check if the platform has reached or passed its target point
        const distanceToEnd = this.position.distance(this.endPoint);
        const distanceToStart = this.position.distance(this.startPoint);

        if (this.direction === 1 && distanceToEnd < 1) { // Threshold to prevent overshooting
            this.position.x = this.endPoint.x;
            this.position.y = this.endPoint.y;
            this.direction = -1;
        } else if (this.direction === -1 && distanceToStart < 1) {
            this.position.x = this.startPoint.x;
            this.position.y = this.startPoint.y;
            this.direction = 1;
        }
    }

    draw(context) {
        context.fillStyle = '#8B4513'; // A brownish color
        context.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Optional: draw a decorative pattern
        context.strokeStyle = '#A0522D';
        context.lineWidth = 2;
        for (let i = 0; i < this.width; i += 10) {
            context.beginPath();
            context.moveTo(this.position.x + i, this.position.y);
            context.lineTo(this.position.x + i, this.position.y + this.height);
            context.stroke();
        }
    }
}
