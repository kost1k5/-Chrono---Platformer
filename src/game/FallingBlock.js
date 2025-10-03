import { Vec2 } from '../utils/Vec2.js';

export class FallingBlock {
    constructor(x, y, width = 32, height = 32) {
        this.position = new Vec2(x, y);
        this.originalPosition = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this.width = width;
        this.height = height;
        
        this.isTriggered = false;
        this.isFalling = false;
        this.fallDelay = 1000; // 1 секунда задержки
        this.triggerTimer = 0;
        
        this.gravity = 800;
        this.hasPlayerTouched = false;
        
        // Визуальные эффекты
        this.shakeIntensity = 0;
        this.shakeTimer = 0;
    }
    
    update(deltaTime, playerPosition) {
        // Проверка касания игрока
        if (!this.hasPlayerTouched && this.checkPlayerCollision(playerPosition)) {
            this.hasPlayerTouched = true;
            this.isTriggered = true;
            this.triggerTimer = 0;
        }
        
        // Если блок активирован, начинаем отсчет
        if (this.isTriggered && !this.isFalling) {
            this.triggerTimer += deltaTime;
            
            // Эффект тряски перед падением
            if (this.triggerTimer > this.fallDelay * 0.5) {
                this.shakeTimer += deltaTime;
                this.shakeIntensity = Math.sin(this.shakeTimer * 0.02) * 2;
            }
            
            // Начинаем падение
            if (this.triggerTimer >= this.fallDelay) {
                this.isFalling = true;
                this.shakeIntensity = 0;
            }
        }
        
        // Физика падения
        if (this.isFalling) {
            this.velocity.y += this.gravity * deltaTime * 0.001;
            this.position.y += this.velocity.y * deltaTime * 0.001;
            
            // Удаляем блок, если он упал слишком далеко
            if (this.position.y > 1000) {
                this.shouldBeRemoved = true;
            }
        }
    }
    
    checkPlayerCollision(playerPosition) {
        const playerHitbox = {
            x: playerPosition.x,
            y: playerPosition.y,
            width: 32,  // Вернул к оригинальному размеру
            height: 64  // Вернул к оригинальному размеру
        };
        
        return (
            playerHitbox.x < this.position.x + this.width &&
            playerHitbox.x + playerHitbox.width > this.position.x &&
            playerHitbox.y < this.position.y + this.height &&
            playerHitbox.y + playerHitbox.height > this.position.y
        );
    }
    
    // Для системы коллизий
    getBounds() {
        return {
            x: this.position.x + this.shakeIntensity,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
    
    draw(ctx, camera) {
        if (this.shouldBeRemoved) return;
        
        // Поскольку трансформация камеры уже применена к контексту,
        // используем мировые координаты с эффектом тряски
        const drawX = this.position.x + this.shakeIntensity;
        const drawY = this.position.y;
        
        // Цвет зависит от состояния
        if (this.isFalling) {
            ctx.fillStyle = '#8B4513'; // Коричневый - падающий
        } else if (this.isTriggered) {
            ctx.fillStyle = '#FF4500'; // Оранжевый - активированный
        } else {
            ctx.fillStyle = '#654321'; // Темно-коричневый - обычный
        }
        
        ctx.fillRect(drawX, drawY, this.width, this.height);
    }
}
