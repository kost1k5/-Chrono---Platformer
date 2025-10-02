import { Particle } from './Particle.js';

/**
 * Улучшенная система частиц с поддержкой различных эффектов
 * Следует паттерну Object Pool для оптимизации памяти
 */
export class ParticleSystem {
    constructor(maxParticles = 500) {
        this.pool = [];
        this.activeParticles = [];
        this.inactiveParticles = [];
        
        // Инициализация пула частиц
        for (let i = 0; i < maxParticles; i++) {
            const particle = new Particle();
            this.pool.push(particle);
            this.inactiveParticles.push(particle);
        }
        
        // Предустановленные эффекты
        this.presets = {
            explosion: {
                count: 15,
                speed: { min: 80, max: 200 },
                lifetime: { min: 300, max: 600 },
                size: { min: 2, max: 5 },
                colors: ['#ff5722', '#ff9800', '#ffc107'],
                spread: Math.PI * 2,
                gravity: true,
                fadeOut: true
            },
            sparkle: {
                count: 8,
                speed: { min: 20, max: 60 },
                lifetime: { min: 200, max: 400 },
                size: { min: 1, max: 3 },
                colors: ['#ffeb3b', '#fff59d', '#ffffff'],
                spread: Math.PI * 2,
                gravity: false,
                fadeOut: true,
                twinkle: true
            },
            smoke: {
                count: 12,
                speed: { min: 10, max: 40 },
                lifetime: { min: 800, max: 1200 },
                size: { min: 4, max: 8 },
                colors: ['#424242', '#616161', '#757575'],
                spread: Math.PI / 3,
                gravity: false,
                fadeOut: true,
                expand: true
            },
            magic: {
                count: 20,
                speed: { min: 30, max: 80 },
                lifetime: { min: 400, max: 800 },
                size: { min: 1, max: 4 },
                colors: ['#9c27b0', '#e91e63', '#3f51b5'],
                spread: Math.PI * 2,
                gravity: false,
                fadeOut: true,
                spiral: true
            },
            trail: {
                count: 3,
                speed: { min: 5, max: 15 },
                lifetime: { min: 100, max: 300 },
                size: { min: 2, max: 4 },
                colors: ['#2196f3', '#64b5f6'],
                spread: Math.PI / 6,
                gravity: false,
                fadeOut: true
            }
        };
    }
    
    /**
     * Создание частиц с расширенными параметрами
     */
    emit(config = {}) {
        const {
            x = 0,
            y = 0,
            count = 1,
            speed = 100,
            angle = 0,
            spread = 0,
            lifetime = 500,
            size = 2,
            color = 'white',
            colors = null,
            gravity = 300,
            fadeOut = false,
            twinkle = false,
            expand = false,
            spiral = false,
            velocityX = null,
            velocityY = null
        } = config;
        
        const actualCount = typeof count === 'number' ? count : this.randomBetween(count.min, count.max);
        
        for (let i = 0; i < actualCount; i++) {
            const particle = this.getInactiveParticle();
            if (!particle) break; // Нет доступных частиц
            
            // Вычисляем параметры частицы
            const particleSpeed = typeof speed === 'number' ? speed : this.randomBetween(speed.min, speed.max);
            const particleLifetime = typeof lifetime === 'number' ? lifetime : this.randomBetween(lifetime.min, lifetime.max);
            const particleSize = typeof size === 'number' ? size : this.randomBetween(size.min, size.max);
            
            // Цвет
            let particleColor = color;
            if (colors && colors.length > 0) {
                particleColor = colors[Math.floor(Math.random() * colors.length)];
            }
            
            // Направление и скорость
            let vx, vy;
            if (velocityX !== null && velocityY !== null) {
                vx = velocityX;
                vy = velocityY;
            } else {
                const particleAngle = angle + (spread > 0 ? (Math.random() - 0.5) * spread : 0);
                vx = Math.cos(particleAngle) * particleSpeed;
                vy = Math.sin(particleAngle) * particleSpeed;
            }
            
            // Инициализация частицы
            particle.init({
                x, y,
                velocityX: vx,
                velocityY: vy,
                life: particleLifetime,
                size: particleSize,
                color: particleColor,
                gravity: gravity,
                fadeOut: fadeOut,
                twinkle: twinkle,
                expand: expand,
                spiral: spiral
            });
            
            this.activateParticle(particle);
        }
    }
    
    /**
     * Создание эффекта по предустановке
     */
    emitPreset(presetName, x, y, overrides = {}) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`Preset "${presetName}" not found`);
            return;
        }
        
        const config = { ...preset, x, y, ...overrides };
        this.emit(config);
    }
    
    /**
     * Эффект следа за движущимся объектом
     */
    emitTrail(x, y, prevX, prevY, config = {}) {
        const distance = Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
        if (distance < 5) return; // Слишком малое движение
        
        const steps = Math.min(Math.floor(distance / 3), 5);
        
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const trailX = prevX + (x - prevX) * t;
            const trailY = prevY + (y - prevY) * t;
            
            this.emit({
                x: trailX + (Math.random() - 0.5) * 4,
                y: trailY + (Math.random() - 0.5) * 4,
                count: 1,
                speed: 20,
                lifetime: 200,
                size: 2,
                color: config.color || '#64b5f6',
                gravity: false,
                fadeOut: true,
                ...config
            });
        }
    }
    
    /**
     * Получение неактивной частицы из пула
     */
    getInactiveParticle() {
        return this.inactiveParticles.pop() || null;
    }
    
    /**
     * Активация частицы
     */
    activateParticle(particle) {
        this.activeParticles.push(particle);
    }
    
    /**
     * Деактивация частицы
     */
    deactivateParticle(particle) {
        const index = this.activeParticles.indexOf(particle);
        if (index !== -1) {
            this.activeParticles.splice(index, 1);
            this.inactiveParticles.push(particle);
        }
    }
    
    /**
     * Обновление всех активных частиц
     */
    update(deltaTime) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            particle.update(deltaTime);
            
            if (!particle.isActive) {
                this.deactivateParticle(particle);
            }
        }
    }
    
    /**
     * Отрисовка всех активных частиц
     */
    draw(context, camera) {
        for (const particle of this.activeParticles) {
            particle.draw(context, camera);
        }
    }
    
    /**
     * Получение случайного числа в диапазоне
     */
    randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }
    
    /**
     * Очистка всех частиц
     */
    clear() {
        for (const particle of this.activeParticles) {
            particle.isActive = false;
        }
        this.inactiveParticles.push(...this.activeParticles);
        this.activeParticles.length = 0;
    }
    
    /**
     * Получение статистики системы
     */
    getStats() {
        return {
            active: this.activeParticles.length,
            inactive: this.inactiveParticles.length,
            total: this.pool.length
        };
    }
}
