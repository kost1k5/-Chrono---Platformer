import { Particle } from './Particle.js';

export class ParticleSystem {
    constructor(maxParticles = 100) {
        this.pool = [];
        for (let i = 0; i < maxParticles; i++) {
            this.pool.push(new Particle());
        }
    }

    emit({ x, y, count = 10, color = 'white', speed = 100, lifetime = 500, size = 2, gravity = 300 }) {
        for (let i = 0; i < count; i++) {
            const particle = this.pool.find(p => !p.isActive);
            if (particle) {
                const angle = Math.random() * Math.PI * 2;
                const currentSpeed = speed * (0.5 + Math.random() * 0.5);
                particle.init({ x, y, speed: currentSpeed, angle, gravity, lifetime, size, color });
            }
        }
    }

    update(deltaTime) {
        for (const particle of this.pool) {
            if (particle.isActive) {
                particle.update(deltaTime);
            }
        }
    }

    draw(context) {
        for (const particle of this.pool) {
            if (particle.isActive) {
                particle.draw(context);
            }
        }
    }
}
