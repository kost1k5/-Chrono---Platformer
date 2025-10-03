import { Vec2 } from '../utils/Vec2.js';
import { checkAABBCollision } from '../utils/Collision.js';

/**
 * Класс кристалла - собираемые объекты для получения очков
 * Следует лучшим практикам: компонентная архитектура, state management, анимации
 */
export class Crystal {
    /**
     * @param {number} x - X координата
     * @param {number} y - Y координата  
     * @param {Object} config - Конфигурация кристалла
     * @param {number} config.value - Очки за сбор (по умолчанию 10)
     * @param {string} config.type - Тип кристалла ('normal', 'rare', 'legendary')
     * @param {AudioManager} config.audioManager - Менеджер аудио
     * @param {ParticleSystem} config.particleSystem - Система частиц
     */
    constructor(x, y, { value = 10, type = 'normal', audioManager, particleSystem } = {}) {
        this.position = new Vec2(x, y);
        this.startPosition = new Vec2(x, y);
        
        // Свойства кристалла
        this.width = 24;
        this.height = 24;
        this.value = value;
        this.type = type;
        this.isCollected = false;
        
        // Состояние объекта
        this.isActive = true;
        this.bobOffset = 0; // Для плавающей анимации
        this.rotationAngle = 0;
        this.scale = 1.0;
        this.opacity = 1.0;
        
        // Анимация появления
        this.spawnAnimation = {
            progress: 0,
            duration: 300, // мс
            isComplete: false
        };
        
        // Анимация сбора
        this.collectAnimation = {
            progress: 0,
            duration: 200, // мс
            isActive: false
        };
        
        // Магнетизм (притягивание к игроку)
        this.magnetRange = 80;
        this.magnetForce = 300;
        this.isBeingMagnetized = false;
        
        // Эффекты
        this.glowIntensity = 0;
        this.sparkleTimer = 0;
        this.sparkleInterval = 100; // мс между искрами
        
        // Менеджеры
        this.audioManager = audioManager;
        this.particleSystem = particleSystem;
        
        // Цвета по типам (следуя принципу data-driven design)
        this.typeColors = {
            normal: { primary: '#4fc3f7', secondary: '#81d4fa', particles: '#b3e5fc' },
            rare: { primary: '#ba68c8', secondary: '#ce93d8', particles: '#e1bee7' },
            legendary: { primary: '#ffb74d', secondary: '#ffcc02', particles: '#fff3e0' }
        };
        
        this.colors = this.typeColors[type] || this.typeColors.normal;
        
        // Лучшая практика: сразу создаем начальные эффекты
        this.emitSpawnParticles();
    }
    
    /**
     * Обновление состояния кристалла
     * @param {number} deltaTime - Время с последнего кадра (мс)
     * @param {Vec2} playerPosition - Позиция игрока для магнетизма
     */
    update(deltaTime, playerPosition) {
        if (!this.isActive || this.isCollected) return;
        
        const dt = deltaTime / 1000; // Конвертируем в секунды
        
        // Анимация появления
        if (!this.spawnAnimation.isComplete) {
            this.updateSpawnAnimation(deltaTime);
        }
        
        // Анимация сбора
        if (this.collectAnimation.isActive) {
            this.updateCollectAnimation(deltaTime);
            return; // Не обновляем остальное во время сбора
        }
        
        // Плавающая анимация (bobbing)
        this.bobOffset += dt * 2; // 2 радиана в секунду
        this.position.y = this.startPosition.y + Math.sin(this.bobOffset) * 3;
        
        // Вращение
        this.rotationAngle += dt * 2; // 2 радиана в секунду
        
        // Эффект свечения
        this.glowIntensity = 0.5 + Math.sin(this.bobOffset * 2) * 0.3;
        
        // Искры
        this.sparkleTimer += deltaTime;
        if (this.sparkleTimer >= this.sparkleInterval) {
            this.sparkleTimer = 0;
            this.emitSparkleParticles();
        }
        
        // Магнетизм
        if (playerPosition) {
            this.updateMagnetism(playerPosition, dt);
        }
    }
    
    /**
     * Обновление анимации появления
     */
    updateSpawnAnimation(deltaTime) {
        this.spawnAnimation.progress += deltaTime;
        const progress = Math.min(this.spawnAnimation.progress / this.spawnAnimation.duration, 1);
        
        // Эффект "появления" с подскоком
        this.scale = this.easeOutBounce(progress);
        this.opacity = progress;
        
        if (progress >= 1) {
            this.spawnAnimation.isComplete = true;
            this.scale = 1;
            this.opacity = 1;
        }
    }
    
    /**
     * Обновление анимации сбора
     */
    updateCollectAnimation(deltaTime) {
        this.collectAnimation.progress += deltaTime;
        const progress = Math.min(this.collectAnimation.progress / this.collectAnimation.duration, 1);
        
        // Эффект "исчезновения" с увеличением и угасанием
        this.scale = 1 + progress * 1.5; // Увеличиваемся до 2.5x
        this.opacity = 1 - progress;
        
        if (progress >= 1) {
            this.isActive = false;
            this.isCollected = true;
        }
    }
    
    /**
     * Система магнетизма - притягивание к игроку
     */
    updateMagnetism(playerPosition, dt) {
        const distance = this.position.distance(playerPosition);
        
        if (distance <= this.magnetRange) {
            this.isBeingMagnetized = true;
            
            // Вектор к игроку
            const direction = playerPosition.subtract(this.position).normalize();
            
            // Применяем силу притяжения (обратно пропорциональна расстоянию)
            const force = this.magnetForce * (1 - distance / this.magnetRange);
            const velocity = direction.multiply(force * dt);
            
            this.position = this.position.add(velocity);
            this.startPosition = this.position; // Обновляем базовую позицию
        } else {
            this.isBeingMagnetized = false;
        }
    }
    
    /**
     * Попытка сбора кристалла игроком
     * @param {Object} playerBounds - Границы игрока {x, y, width, height}
     * @returns {boolean} Был ли кристалл собран
     */
    tryCollect(playerBounds) {
        if (!this.isActive || this.isCollected || this.collectAnimation.isActive) {
            return false;
        }
        
        const crystalBounds = {
            x: this.position.x - this.width / 2,
            y: this.position.y - this.height / 2,
            width: this.width,
            height: this.height
        };
        
        if (checkAABBCollision(playerBounds, crystalBounds)) {
            this.collect();
            return true;
        }
        
        return false;
    }
    
    /**
     * Инициация процесса сбора кристалла
     */
    collect() {
        if (this.isCollected) return;
        
        // Запускаем анимацию сбора
        this.collectAnimation.isActive = true;
        this.collectAnimation.progress = 0;
        
        // Звуковой эффект
        if (this.audioManager) {
            const soundName = this.type === 'legendary' ? 'crystal_legendary' : 
                             this.type === 'rare' ? 'crystal_rare' : 'crystal_collect';
            this.audioManager.playSound(soundName);
        }
        
        // Эффекты частиц
        this.emitCollectParticles();
    }
    
    /**
     * Частицы появления
     */
    emitSpawnParticles() {
        if (!this.particleSystem) return;
        
        for (let i = 0; i < 8; i++) {
            this.particleSystem.emit({
                x: this.position.x,
                y: this.position.y,
                velocityX: (Math.random() - 0.5) * 100,
                velocityY: (Math.random() - 0.5) * 100,
                life: 300,
                color: this.colors.particles,
                size: 2 + Math.random() * 2,
                fadeOut: true
            });
        }
    }
    
    /**
     * Искрящиеся частицы
     */
    emitSparkleParticles() {
        if (!this.particleSystem) return;
        
        // Только для редких и легендарных кристаллов
        if (this.type === 'normal') return;
        
        const count = this.type === 'legendary' ? 3 : 1;
        
        for (let i = 0; i < count; i++) {
            this.particleSystem.emit({
                x: this.position.x + (Math.random() - 0.5) * this.width,
                y: this.position.y + (Math.random() - 0.5) * this.height,
                velocityX: (Math.random() - 0.5) * 50,
                velocityY: (Math.random() - 0.5) * 50,
                life: 400,
                color: this.colors.primary,
                size: 1,
                fadeOut: true,
                gravity: false
            });
        }
    }
    
    /**
     * Частицы при сборе
     */
    emitCollectParticles() {
        if (!this.particleSystem) return;
        
        const particleCount = this.type === 'legendary' ? 20 : 
                             this.type === 'rare' ? 15 : 10;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 80 + Math.random() * 40;
            
            this.particleSystem.emit({
                x: this.position.x,
                y: this.position.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: 600,
                color: this.colors.secondary,
                size: 3 + Math.random() * 3,
                fadeOut: true,
                gravity: true
            });
        }
    }
    
    /**
     * Easing функция для анимации появления
     */
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    /**
     * Отрисовка кристалла
     * @param {CanvasRenderingContext2D} context - Контекст канваса
     * @param {Camera} camera - Камера для преобразования координат
     */
    draw(context, camera) {
        if (!this.isActive) return;
        
        // Преобразование координат через камеру
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        
        // Применяем трансформации
        context.translate(screenPos.x, screenPos.y);
        context.scale(this.scale, this.scale);
        context.rotate(this.rotationAngle);
        context.globalAlpha = this.opacity;
        
        // Эффект свечения
        if (this.glowIntensity > 0) {
            context.shadowColor = this.colors.primary;
            context.shadowBlur = 10 * this.glowIntensity;
        }
        
        // Рисуем кристалл как алмаз
        const size = this.width / 2;
        
        // Внешний контур
        context.beginPath();
        context.moveTo(0, -size);
        context.lineTo(size * 0.7, 0);
        context.lineTo(0, size);
        context.lineTo(-size * 0.7, 0);
        context.closePath();
        
        // Градиент
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, this.colors.primary);
        gradient.addColorStop(0.7, this.colors.secondary);
        gradient.addColorStop(1, this.colors.primary);
        
        context.fillStyle = gradient;
        context.fill();
        
        // Контур
        context.strokeStyle = this.colors.primary;
        context.lineWidth = 2;
        context.stroke();
        
        // Внутренний блик
        context.beginPath();
        context.moveTo(-size * 0.3, -size * 0.5);
        context.lineTo(size * 0.2, -size * 0.3);
        context.lineTo(0, size * 0.2);
        context.lineTo(-size * 0.4, 0);
        context.closePath();
        
        context.fillStyle = 'rgba(255, 255, 255, 0.6)';
        context.fill();
        
        context.restore();
    }
    

    
    /**
     * Получить данные кристалла для сериализации
     */
    serialize() {
        return {
            type: 'crystal',
            x: this.startPosition.x,
            y: this.startPosition.y,
            value: this.value,
            crystalType: this.type
        };
    }
    
    /**
     * Создать кристалл из данных уровня
     */
    static fromLevelData(data, { audioManager, particleSystem }) {
        return new Crystal(data.x, data.y, {
            value: data.value,
            type: data.crystalType || 'normal',
            audioManager,
            particleSystem
        });
    }
}
