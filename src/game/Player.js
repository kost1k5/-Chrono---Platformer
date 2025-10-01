// Filename: Player.js
import { Vec2 } from '../utils/Vec2.js';
import { checkAABBCollision } from '../utils/Collision.js';
import { Sprite } from '../engine/Sprite.js';

/**
 * Класс игрока - управляет движением, анимацией и взаимодействием главного персонажа
 */
export class Player {
    /**
     * Создает новый экземпляр игрока
     * @param {number} x - Начальная X координата
     * @param {number} y - Начальная Y координата  
     * @param {Object} config - Конфигурация игрока
     * @param {Object} config.sprites - Спрайты для анимации
     * @param {AudioManager} config.audioManager - Менеджер аудио
     * @param {TimeManager} config.timeManager - Менеджер времени
     * @param {ParticleSystem} config.particleSystem - Система частиц
     */
    constructor(x, y, { sprites, audioManager, timeManager, particleSystem }) {
        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);

        this.width = 32;  
        this.height = 50;

        this.isGrounded = false;
        this.wasGrounded = false;
        this.onPlatform = null;
        this.ridingPlatform = null;

        this.hasKey = false;
        this.facingDirection = 1;
        this.jumps = 0;
        this.maxJumps = 2;
        this.isJumping = false;
        this.inputState = { left: false, right: false, jump: false };

        this.audioManager = audioManager;
        this.timeManager = timeManager;
        this.particleSystem = particleSystem;

        this.gravity = 980;
        this.moveSpeed = 250;
        this.jumpForce = 500;
        this.maxSpeedX = 300;
        this.terminalVelocityY = 1000;
        this.friction = 0.85;

        this.yOffset = 0;
        
        // Таймер для звука шагов
        this.footstepTimer = 0;
        this.footstepInterval = 400; // Интервал между звуками шагов в миллисекундах
        
        this.sprite = new Sprite({
            frameWidth: this.width,
            frameHeight: this.height,
            animations: {
                idle: { image: sprites.idle, row: 0, frameCount: 1, frameInterval: 0 }, // Статичная idle
                run: { image: sprites.run, row: 0, frameCount: 6, frameInterval: 80 }, // Быстрая анимация бега
                jump: { image: sprites.jump, row: 0, frameCount: 1, frameInterval: 100 },
                fall: { image: sprites.fall, row: 0, frameCount: 1, frameInterval: 100 },
                doublejump: { image: sprites.doublejump, row: 0, frameCount: 7, frameInterval: 50 }, // Новая анимация двойного прыжка
            }
        });
        
        // Звук шагов
        this.footstepTimer = 0;
        this.footstepInterval = 300;
        
        this.animationTransitionTimer = 0;
        this.animationTransitionDelay = 50;
    }

    /**
     * Основной метод обновления логики игрока
     * @param {number} scaledDeltaTime - Масштабированное время дельты
     * @param {number} rawDeltaTime - Немасштабированное время дельты
     * @param {InputHandler} input - Обработчик ввода
     * @param {Level} level - Текущий уровень
     * @param {Array} enemies - Массив врагов
     * @param {Array} platforms - Массив движущихся платформ
     * @param {Array} keys - Массив ключей
     * @param {Array} doors - Массив дверей
     * @param {Goal} goal - Цель уровня
     * @param {Array} fallingBlocks - Массив падающих блоков
     * @returns {Object} Результат обновления с информацией о состоянии игры
     */
    update(scaledDeltaTime, rawDeltaTime, input, level, enemies, platforms, keys, doors, goal, fallingBlocks = []) {
        const dt = scaledDeltaTime / 1000;
        if (this.ridingPlatform && this.ridingPlatform.deltaMovement) {
             this.position.x += this.ridingPlatform.deltaMovement.x;
             this.position.y += this.ridingPlatform.deltaMovement.y;
        }

        // --- 2. Ввод, Физика и Трение ---
        this.wasGrounded = this.isGrounded;
        this.handleInput(input);

        if (!this.inputState.left && !this.inputState.right) {
            this.velocity.x *= this.friction;
        }

        this.velocity.y += this.gravity * dt;

        // Ограничения
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        this.velocity.x = Math.max(-this.maxSpeedX, Math.min(this.maxSpeedX, this.velocity.x));
        this.velocity.y = Math.min(this.terminalVelocityY, this.velocity.y);


        // --- 3. Горизонтальное Движение (X) и Столкновения ---
        this.position.x += this.velocity.x * dt;
        // Передаем 'horizontal' для приоритета разрешения по X в этой фазе
        this.handleCollisions('horizontal', level.tiles, doors, platforms, fallingBlocks);


        // --- 4. Вертикальное Движение (Y) и Столкновения ---
        this.position.y += this.velocity.y * dt;

        this.isGrounded = false;
        this.onPlatform = null;

        // Передаем 'vertical' для приоритета разрешения по Y в этой фазе
        this.handleCollisions('vertical', level.tiles, doors, platforms, fallingBlocks);


        // --- 5. Финальные Обновления и Статус ---
        this.ridingPlatform = (this.isGrounded && this.onPlatform) ? this.onPlatform : null;

        if (this.isGrounded && !this.wasGrounded) {
            this.jumps = 0;
            // Удаляем звук приземления, так как land.mp3 теперь фоновая музыка
            // if (this.audioManager) this.audioManager.playSound('land', this.timeManager.timeScale);
            this.emitLandingParticles();
        }

        // --- 6. Игровая логика ---
        if (this.clampAndCheckBounds(level)) {
            return { gameOver: true, levelComplete: false };
        }

        if (goal && this.handleGoalCollision(goal)) {
            return { levelComplete: true, gameOver: false };
        }

        this.handleItemCollisions(keys, doors);
        const enemyCollision = this.handleEnemyCollisions(enemies);
        if (enemyCollision.gameOver) {
            return { gameOver: true, levelComplete: false };
        }

        // --- 7. Анимация ---
        this.updateAnimationState();
        this.sprite.update(rawDeltaTime);
        
        // --- 8. Звук шагов ---
        this.updateFootstepSound(rawDeltaTime);

        return { gameOver: false, levelComplete: false };
    }

    // ИСПРАВЛЕНО: Разрешение столкновений (Minimum Translation Vector - MTV)
    handleCollisions(phase, tiles, doors, platforms = [], fallingBlocks = []) {
        const allObstacles = [...tiles, ...platforms, ...doors.filter(d => d.isLocked)];
        
        // Добавляем активные падающие блоки как препятствия
        const activeBlocks = fallingBlocks.filter(block => !block.shouldBeRemoved).map(block => ({
            x: block.position.x,
            y: block.position.y,
            width: block.width,
            height: block.height
        }));
        allObstacles.push(...activeBlocks);

        for (const obstacle of allObstacles) {
            const obstacleX = obstacle.position ? obstacle.position.x : obstacle.x;
            const obstacleY = obstacle.position ? obstacle.position.y : obstacle.y;

            if (obstacleX === undefined || obstacleY === undefined) continue;

            const playerBox = { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
            const obstacleBox = { x: obstacleX, y: obstacleY, width: obstacle.width, height: obstacle.height };

            if (checkAABBCollision(playerBox, obstacleBox)) {

                // 1. Вычисляем центры и расстояние между ними
                const playerCenterX = this.position.x + this.width / 2;
                const playerCenterY = this.position.y + this.height / 2;
                const obstacleCenterX = obstacleX + obstacle.width / 2;
                const obstacleCenterY = obstacleY + obstacle.height / 2;

                const dx = playerCenterX - obstacleCenterX;
                const dy = playerCenterY - obstacleCenterY;

                // 2. Вычисляем минимальное необходимое расстояние
                const combinedHalfWidths = this.width / 2 + obstacle.width / 2;
                const combinedHalfHeights = this.height / 2 + obstacle.height / 2;

                // 3. Вычисляем глубину проникновения (Overlap)
                const overlapX = combinedHalfWidths - Math.abs(dx);
                const overlapY = combinedHalfHeights - Math.abs(dy);

                // 4. Разрешаем столкновение по оси с наименьшим проникновением (MTV).
                // Если проникновение по X больше, чем по Y, то кратчайший путь наружу - по Y.
                // Используем 'phase' для разрешения угловых случаев (когда проникновение одинаково).

                // Добавляем минимальный порог для коллизий, чтобы избежать микро-корректировок
                const COLLISION_TOLERANCE = 0.1;
                
                if (overlapX < COLLISION_TOLERANCE && overlapY < COLLISION_TOLERANCE) {
                    // Игнорируем очень маленькие пересечения
                    continue;
                }

                if (overlapX > overlapY || (Math.abs(overlapX - overlapY) < 0.001 && phase === 'vertical')) {
                    // Разрешение по Y (Вертикальное)
                    if (dy > 0) {
                        // Игрок ниже препятствия (Удар головой)
                        this.position.y += overlapY;
                        if (this.velocity.y < 0) this.velocity.y = 0;
                    } else {
                        // Игрок выше препятствия (Приземление) - ИСПРАВЛЕНО
                        this.position.y -= overlapY;
                        this.isGrounded = true;
                        if (this.velocity.y > 0) this.velocity.y = 0;

                        if (platforms.includes(obstacle)) {
                            this.onPlatform = obstacle;
                        }
                    }
                } else {
                    // Разрешение по X (Горизонтальное)
                    if (dx > 0) {
                        // Игрок справа от препятствия
                        this.position.x += overlapX;
                        if (this.velocity.x < 0) this.velocity.x = 0;
                    } else {
                        // Игрок слева от препятствия
                        this.position.x -= overlapX;
                        if (this.velocity.x > 0) this.velocity.x = 0;
                    }
                }
            }
        }
    }

    // (Остальные методы Player.js включены для полноты)

    handleInput(input) {
        this.inputState.left = input.keys.has('ArrowLeft');
        this.inputState.right = input.keys.has('ArrowRight');
        this.inputState.jump = input.keys.has('Space') || input.keys.has('ArrowUp');

        if (this.inputState.left) {
            this.velocity.x = -this.moveSpeed;
            this.facingDirection = -1;
        } else if (this.inputState.right) {
            this.velocity.x = this.moveSpeed;
            this.facingDirection = 1;
        }

        if (this.inputState.jump && !this.isJumping) {
            if (this.isGrounded || this.jumps < this.maxJumps) {
                this.jump();
            }
        }
        this.isJumping = this.inputState.jump;
    }

    /**
     * Выполняет прыжок игрока
     */
    jump() {
        this.velocity.y = -this.jumpForce;
        this.isGrounded = false;
        this.onPlatform = null;
        this.ridingPlatform = null;
        this.jumps++;
        if (this.audioManager) this.audioManager.playSound('jump', this.timeManager.timeScale);
        this.emitJumpParticles();
    }

    handleGoalCollision(goal) {
        const playerBox = { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
        const goalBox = { x: goal.position.x, y: goal.position.y, width: goal.width, height: goal.height };
        return checkAABBCollision(playerBox, goalBox);
    }

    clampAndCheckBounds(level) {
        const levelPixelWidth = level.width * level.tileSize;
        const levelPixelHeight = level.height * level.tileSize;

        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x = 0;
        } else if (this.position.x + this.width > levelPixelWidth) {
            this.position.x = levelPixelWidth - this.width;
            this.velocity.x = 0;
        }

        if (this.position.y > levelPixelHeight + 200) {
            return true;
        }
        return false;
    }

    updateAnimationState() {
        let newState = 'idle'; // По умолчанию

        // Определяем новое состояние на основе физики
        if (!this.isGrounded) {
            if (this.jumps > 1) {
                newState = 'doublejump'; // Анимация двойного прыжка
            } else if (this.velocity.y < -50) {
                newState = 'jump';
            } else {
                newState = 'fall';
            }
        } else {
            if (Math.abs(this.velocity.x) > 30) { // Увеличил порог с 20 до 30
                newState = 'run';
            } else {
                newState = 'idle';
            }
        }

        // Простое переключение без задержек для предотвращения мерцания
        this.sprite.setState(newState);
    }

    updateFootstepSound(deltaTime) {
        // Проверяем, что игрок движется по земле
        const isWalking = this.isGrounded && Math.abs(this.velocity.x) > 10;
        
        if (isWalking) {
            this.footstepTimer += deltaTime;
            
            if (this.footstepTimer >= this.footstepInterval) {
                if (this.audioManager) {
                    this.audioManager.playSound('footstep', this.timeManager.timeScale, 0.3);
                }
                this.footstepTimer = 0;
            }
        } else {
            this.footstepTimer = 0;
        }
    }

    emitLandingParticles() {
        if (!this.particleSystem) return;
        this.particleSystem.emit({
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height,
            count: 8, color: '#D2B48C', speed: 80,
            lifetime: 300, size: 3, gravity: -200
        });
    }

    emitJumpParticles() {
        if (!this.particleSystem) return;
        this.particleSystem.emit({
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height,
            count: 5, color: 'white', speed: 50,
            lifetime: 400, size: 2, gravity: 200
        });
    }

    handleEnemyCollisions(enemies) {
        const playerBox = { x: this.position.x, y: this.position.y, width: this.width, height: this.height };
        for (const enemy of enemies) {
            if (!enemy.isActive) continue;

            const enemyBox = { x: enemy.position.x, y: enemy.position.y, width: enemy.width, height: enemy.height };

            if (checkAABBCollision(playerBox, enemyBox)) {
                const isStomping = this.velocity.y > 0 && (this.position.y + this.height) < (enemy.position.y + enemy.height * 0.5);
                if (isStomping) {
                    enemy.isActive = false;
                    this.velocity.y = -this.jumpForce * 0.6;
                    if (this.audioManager) this.audioManager.playSound('enemy_stomp', this.timeManager.timeScale);
                } else {
                    return { gameOver: true };
                }
            }
        }
        return { gameOver: false };
    }

    handleItemCollisions(keys, doors) {
        const playerBox = { x: this.position.x, y: this.position.y, width: this.width, height: this.height };

        keys.forEach(key => {
            const keyBox = { x: key.position.x, y: key.position.y, width: key.width, height: key.height };
            if (key.isActive && checkAABBCollision(playerBox, keyBox)) {
                key.isActive = false; 
                this.hasKey = true;
            }
        });
        
        doors.forEach((door, index) => {
            const doorBox = { x: door.position.x, y: door.position.y, width: door.width, height: door.height };
            const isColliding = checkAABBCollision(playerBox, doorBox);
            
            if (door.isLocked && this.hasKey && isColliding) {
                door.isLocked = false; 
                this.hasKey = false;
            }
        });
    }

    draw(context) {
        // Округляем для отрисовки, чтобы избежать размытия пиксель-арта, но сохраняем плавность движения.
        const drawX = Math.floor(this.position.x);
        const drawY = Math.floor(this.position.y + this.yOffset);

        context.save();
        if (this.facingDirection === -1) {
            context.scale(-1, 1);
            this.sprite.draw(context, -drawX - this.width, drawY);
        } else {
            this.sprite.draw(context, drawX, drawY);
        }
        context.restore();
    }

}
