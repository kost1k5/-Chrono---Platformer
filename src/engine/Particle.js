import { Vec2 } from '../utils/Vec2.js';

export class Particle {
    constructor() {
        this.position = new Vec2();
        this.velocity = new Vec2();
        this.lifetime = 0;
        this.size = 1;
        this.color = 'white';
        this.isActive = false;
    }

    init({ x, y, speed, angle, gravity, lifetime, size, color }) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
        this.gravity = gravity;
        this.lifetime = lifetime;
        this.initialLifetime = lifetime;
        this.size = size;
        this.color = color;
        this.isActive = true;
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.isActive = false;
            return;
        }

        const dt = deltaTime / 1000;
        this.velocity.y += this.gravity * dt;
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
    }

    draw(context) {
        if (!this.isActive) return;

        // Fade out as the particle dies
        const alpha = Math.max(0, this.lifetime / this.initialLifetime);

        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = this.color;
        context.fillRect(this.position.x - this.size / 2, this.position.y - this.size / 2, this.size, this.size);
        context.restore();
    }
}
