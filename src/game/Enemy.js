import { Vec2 } from '../utils/Vec2.js';
import { Sprite } from '../engine/Sprite.js';
import { checkAABBCollision } from '../utils/Collision.js';

export class Enemy {
    constructor(x, y, { spritesheet, moveRange = 80, speed = 50 }) {
        this.position = new Vec2(x, y);
        this.velocity = new Vec2(Math.random() > 0.5 ? -speed : speed, 0); // Используем переданную скорость

        this.width = 45;
        this.height = 50;
        this.isActive = true;

        // Физика
        this.gravity = 980;
        this.terminalVelocity = 600;
        this.isGrounded = false;
        
        this.startPos = new Vec2(x, y);
        this.moveRange = moveRange; // Используем переданный радиус движения
        this.speed = speed; // Сохраняем базовую скорость

        this.sprite = null;
        if (spritesheet) {
            this.sprite = new Sprite({
                frameWidth: this.width,
                frameHeight: this.height,
                animations: {
                    walk: { image: spritesheet, row: 0, frameCount: 2, frameInterval: 200 }
                }
            });
            this.sprite.setState('walk');
        } else {
            console.warn('Enemy spritesheet не загружен!');
        }
    }

    update(deltaTime, level, platforms = []) {
        if (!this.isActive) return;

        const dt = deltaTime / 1000;
        
        // Сохраняем старую позицию для отката в случае столкновения
        const oldX = this.position.x;
        const oldY = this.position.y;
        
        // Применяем гравитацию
        this.velocity.y += this.gravity * dt;
        if (this.velocity.y > this.terminalVelocity) {
            this.velocity.y = this.terminalVelocity;
        }

        // ДВИЖЕНИЕ ПО ГОРИЗОНТАЛИ СНАЧАЛА
        this.position.x += this.velocity.x * dt;
        
        // Проверяем столкновения по горизонтали с уровнем и платформами
        if ((level && this.checkCollisionWithLevel(level)) || this.checkCollisionWithPlatforms(platforms)) {
            this.position.x = oldX; // Откат
            this.velocity.x *= -1; // Разворот с сохранением скорости
        }

        // ДВИЖЕНИЕ ПО ВЕРТИКАЛИ ПОТОМ  
        this.position.y += this.velocity.y * dt;
        
        // Проверяем столкновения по вертикали
        if (level) {
            this.handleVerticalCollisions(level);
        }
        
        // Проверяем столкновения с платформами по вертикали
        this.handlePlatformCollisions(platforms);

        // Проверяем землю впереди (чтобы не упасть с платформы)
        if (this.isGrounded && level) {
            const direction = this.velocity.x > 0 ? 1 : -1;
            const frontX = this.position.x + (direction > 0 ? this.width + 5 : -5);
            const groundY = this.position.y + this.height + 5;
            
            const tileSize = level.tileSize || 32;
            const tileX = Math.floor(frontX / tileSize);
            const tileY = Math.floor(groundY / tileSize);
            
            // Если впереди нет земли - разворачиваемся
            if (!level.getTileAt || !level.getTileAt(tileX, tileY)) {
                this.velocity.x *= -1;
            }
        }

        // Проверяем границы патрулирования
        if (this.position.x <= this.startPos.x - this.moveRange || 
            this.position.x >= this.startPos.x + this.moveRange) {
            this.velocity.x = this.velocity.x > 0 ? -this.speed : this.speed; // Правильно меняем направление
        }

        if (this.sprite) {
            this.sprite.update(deltaTime);
        }
    }

    checkCollisionWithLevel(level) {
        const tileSize = level.tileSize || 32;
        const leftTile = Math.floor(this.position.x / tileSize);
        const rightTile = Math.floor((this.position.x + this.width - 1) / tileSize);
        const topTile = Math.floor(this.position.y / tileSize);
        const bottomTile = Math.floor((this.position.y + this.height - 1) / tileSize);

        for (let x = leftTile; x <= rightTile; x++) {
            for (let y = topTile; y <= bottomTile; y++) {
                if (level.getTileAt && level.getTileAt(x, y)) {
                    return true; // Найдено столкновение
                }
            }
        }
        return false;
    }

    handleVerticalCollisions(level) {
        this.isGrounded = false;
        
        const tileSize = level.tileSize || 32;
        const leftTile = Math.floor(this.position.x / tileSize);
        const rightTile = Math.floor((this.position.x + this.width - 1) / tileSize);
        const topTile = Math.floor(this.position.y / tileSize);
        const bottomTile = Math.floor((this.position.y + this.height) / tileSize);

        for (let x = leftTile; x <= rightTile; x++) {
            for (let y = topTile; y <= bottomTile; y++) {
                if (level.getTileAt && level.getTileAt(x, y)) {
                    const tileRect = {
                        x: x * tileSize,
                        y: y * tileSize,
                        width: tileSize,
                        height: tileSize
                    };

                    const enemyRect = {
                        x: this.position.x,
                        y: this.position.y,
                        width: this.width,
                        height: this.height
                    };

                    if (checkAABBCollision(enemyRect, tileRect)) {
                        if (this.velocity.y > 0) {
                            // Падение - ставим на верх блока
                            this.position.y = tileRect.y - this.height;
                            this.velocity.y = 0;
                            this.isGrounded = true;
                        } else if (this.velocity.y < 0) {
                            // Прыжок вверх - ударились головой
                            this.position.y = tileRect.y + tileRect.height;
                            this.velocity.y = 0;
                        }
                    }
                }
            }
        }
    }

    checkCollisionWithPlatforms(platforms) {
        for (const platform of platforms) {
            const platformRect = {
                x: platform.position.x,
                y: platform.position.y,
                width: platform.width,
                height: platform.height
            };

            const enemyRect = {
                x: this.position.x,
                y: this.position.y,
                width: this.width,
                height: this.height
            };

            if (checkAABBCollision(enemyRect, platformRect)) {
                // ТОЛКАНИЕ ПО ГОРИЗОНТАЛИ: Если платформа толкает врага сбоку
                if (platform.velocity && platform.velocity.x !== 0) {
                    const platformCenterX = platform.position.x + platform.width / 2;
                    const enemyCenterX = this.position.x + this.width / 2;
                    
                    if (platformCenterX < enemyCenterX) {
                        // Платформа слева от врага - толкаем вправо
                        this.position.x += Math.abs(platform.velocity.x) * (1/60);
                    } else {
                        // Платформа справа от врага - толкаем влево
                        this.position.x -= Math.abs(platform.velocity.x) * (1/60);
                    }
                }
                return true;
            }
        }
        return false;
    }

    handlePlatformCollisions(platforms) {
        for (const platform of platforms) {
            const platformRect = {
                x: platform.position.x,
                y: platform.position.y,
                width: platform.width,
                height: platform.height
            };

            const enemyRect = {
                x: this.position.x,
                y: this.position.y,
                width: this.width,
                height: this.height
            };

            if (checkAABBCollision(enemyRect, platformRect)) {
                if (this.velocity.y > 0) {
                    // Падение на платформу
                    this.position.y = platformRect.y - this.height;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    
                    // ТОЛКАНИЕ: Если враг на движущейся платформе, двигаем его вместе с ней
                    if (platform.velocity) {
                        this.position.x += platform.velocity.x * (1/60); // Приблизительно deltaTime
                        this.position.y += platform.velocity.y * (1/60);
                    }
                }
            }
        }
    }

    draw(context, camera) {
        if (!this.isActive) return;

        // Поскольку трансформация камеры уже применена к контексту,
        // используем мировые координаты напрямую
        const drawX = this.position.x;
        const drawY = this.position.y;

        if (this.sprite) {
            context.save();
            // Отражаем спрайт в зависимости от направления
            if (this.velocity.x > 0) {
                context.scale(-1, 1);
                this.sprite.draw(context, -drawX - this.width, drawY);
            } else {
                this.sprite.draw(context, drawX, drawY);
            }
            context.restore();
        } else {
            // Fallback: простой красный прямоугольник если спрайт не загружен
            context.fillStyle = '#ff6b6b';
            context.fillRect(drawX, drawY, this.width, this.height);
        }
    }
}
