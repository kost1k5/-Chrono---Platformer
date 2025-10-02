import { Vec2 } from '../utils/Vec2.js';

/**
 * Улучшенный класс частицы с поддержкой различных эффектов
 * Следует принципам композиции для гибкости эффектов
 */
export class Particle {
    constructor() {
        this.position = new Vec2();
        this.velocity = new Vec2();
        this.acceleration = new Vec2();
        
        // Основные свойства
        this.life = 0;
        this.maxLife = 0;
        this.size = 1;
        this.initialSize = 1;
        this.color = 'white';
        this.isActive = false;
        
        // Эффекты
        this.fadeOut = false;
        this.twinkle = false;
        this.expand = false;
        this.spiral = false;
        this.gravity = 0;
        
        // Анимация
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.alpha = 1;
        this.scale = 1;
        
        // Для эффекта мерцания
        this.twinkleTimer = 0;
        this.twinkleSpeed = 0;
        
        // Для спирального движения
        this.spiralRadius = 0;
        this.spiralAngle = 0;
        this.spiralSpeed = 0;
        this.spiralCenter = new Vec2();
    }
    
    /**
     * Инициализация частицы с расширенными параметрами
     */
    init(config) {
        const {
            x = 0,
            y = 0,
            velocityX = 0,
            velocityY = 0,
            life = 1000,
            size = 2,
            color = 'white',
            gravity = 0,
            fadeOut = false,
            twinkle = false,
            expand = false,
            spiral = false,
            rotation = 0,
            rotationSpeed = 0
        } = config;
        
        // Позиция и скорость
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = velocityX;
        this.velocity.y = velocityY;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        
        // Жизнь
        this.life = life;
        this.maxLife = life;
        
        // Внешний вид
        this.size = size;
        this.initialSize = size;
        this.color = color;
        this.rotation = rotation;
        this.rotationSpeed = rotationSpeed;
        this.alpha = 1;
        this.scale = 1;
        
        // Эффекты
        this.fadeOut = fadeOut;
        this.twinkle = twinkle;
        this.expand = expand;
        this.spiral = spiral;
        this.gravity = gravity;
        
        // Инициализация эффектов
        if (this.twinkle) {
            this.twinkleSpeed = 2 + Math.random() * 3; // Случайная скорость мерцания
            this.twinkleTimer = Math.random() * Math.PI * 2;
        }
        
        if (this.spiral) {
            this.spiralCenter.x = x;
            this.spiralCenter.y = y;
            this.spiralRadius = Math.sqrt(velocityX * velocityX + velocityY * velocityY) / 10;
            this.spiralAngle = Math.atan2(velocityY, velocityX);
            this.spiralSpeed = (Math.random() - 0.5) * 0.1; // Скорость вращения спирали
        }
        
        this.isActive = true;
    }
    
    /**
     * Обновление частицы
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Уменьшение времени жизни
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.isActive = false;
            return;
        }
        
        const dt = deltaTime / 1000;
        const lifeProgress = 1 - (this.life / this.maxLife);
        
        // Применение гравитации
        if (this.gravity !== 0) {
            this.acceleration.y = this.gravity;
        }
        
        // Спиральное движение
        if (this.spiral) {
            this.updateSpiralMovement(dt, lifeProgress);
        } else {
            // Обычное движение
            this.velocity.x += this.acceleration.x * dt;
            this.velocity.y += this.acceleration.y * dt;
            
            this.position.x += this.velocity.x * dt;
            this.position.y += this.velocity.y * dt;
        }
        
        // Вращение
        this.rotation += this.rotationSpeed * dt;
        
        // Эффект затухания
        if (this.fadeOut) {
            this.alpha = this.life / this.maxLife;
        }
        
        // Эффект мерцания
        if (this.twinkle) {
            this.twinkleTimer += deltaTime / 100;
            const twinkleAlpha = (Math.sin(this.twinkleTimer * this.twinkleSpeed) + 1) / 2;
            this.alpha = this.fadeOut ? 
                (this.life / this.maxLife) * twinkleAlpha : 
                twinkleAlpha;
        }
        
        // Эффект расширения
        if (this.expand) {
            this.scale = 1 + lifeProgress * 2; // Увеличиваемся в 3 раза к концу жизни
            this.size = this.initialSize * this.scale;
        }
        
        // Сброс ускорения
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }
    
    /**
     * Спиральное движение
     */
    updateSpiralMovement(dt, lifeProgress) {
        // Увеличиваем радиус спирали со временем
        this.spiralRadius += dt * 20;
        this.spiralAngle += this.spiralSpeed;
        
        // Движение центра спирали
        this.spiralCenter.x += this.velocity.x * dt;
        this.spiralCenter.y += this.velocity.y * dt;
        
        // Позиция на спирали
        this.position.x = this.spiralCenter.x + Math.cos(this.spiralAngle) * this.spiralRadius;
        this.position.y = this.spiralCenter.y + Math.sin(this.spiralAngle) * this.spiralRadius;
    }
    
    /**
     * Отрисовка частицы
     */
    draw(context, camera) {
        if (!this.isActive || this.alpha <= 0) return;
        
        // Преобразование координат через камеру (если передана)
        let screenX = this.position.x;
        let screenY = this.position.y;
        
        if (camera) {
            const screenPos = camera.worldToScreen(this.position);
            screenX = screenPos.x;
            screenY = screenPos.y;
        }
        
        context.save();
        
        // Применяем прозрачность
        context.globalAlpha = this.alpha;
        
        // Переносим и поворачиваем
        context.translate(screenX, screenY);
        if (this.rotation !== 0) {
            context.rotate(this.rotation);
        }
        if (this.scale !== 1) {
            context.scale(this.scale, this.scale);
        }
        
        // Рисуем частицу
        this.drawShape(context);
        
        context.restore();
    }
    
    /**
     * Отрисовка формы частицы
     */
    drawShape(context) {
        const halfSize = this.size / 2;
        
        // Определяем тип частицы по цвету или размеру
        if (this.size <= 2) {
            // Маленькие частицы - точки
            context.fillStyle = this.color;
            context.fillRect(-halfSize, -halfSize, this.size, this.size);
        } else if (this.twinkle) {
            // Мерцающие частицы - звездочки
            this.drawStar(context, halfSize);
        } else if (this.spiral) {
            // Спиральные частицы - круги с хвостом
            this.drawCircleWithTail(context, halfSize);
        } else if (this.expand) {
            // Расширяющиеся частицы - полупрозрачные круги
            this.drawExpandingCircle(context, halfSize);
        } else {
            // Обычные частицы - круги
            context.fillStyle = this.color;
            context.beginPath();
            context.arc(0, 0, halfSize, 0, Math.PI * 2);
            context.fill();
        }
    }
    
    /**
     * Рисование звездочки
     */
    drawStar(context, radius) {
        context.fillStyle = this.color;
        context.beginPath();
        
        const spikes = 4;
        const step = Math.PI / spikes;
        
        for (let i = 0; i < spikes * 2; i++) {
            const angle = i * step;
            const r = i % 2 === 0 ? radius : radius * 0.4;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            
            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        
        context.closePath();
        context.fill();
    }
    
    /**
     * Рисование круга с хвостом
     */
    drawCircleWithTail(context, radius) {
        // Основной круг
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        
        // Хвост
        context.strokeStyle = this.color;
        context.lineWidth = 1;
        context.globalAlpha *= 0.5;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-this.velocity.x * 0.1, -this.velocity.y * 0.1);
        context.stroke();
    }
    
    /**
     * Рисование расширяющегося круга
     */
    drawExpandingCircle(context, radius) {
        // Внешний круг (полупрозрачный)
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.color + '00'); // Прозрачный
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        
        // Внутреннее ядро
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        context.fill();
    }
    
    /**
     * Применение силы к частице
     */
    applyForce(forceX, forceY) {
        this.acceleration.x += forceX;
        this.acceleration.y += forceY;
    }
    
    /**
     * Получение прогресса жизни (0-1)
     */
    getLifeProgress() {
        return 1 - (this.life / this.maxLife);
    }
}
