import { Vec2 } from '../utils/Vec2.js';
import { checkAABBCollision } from '../utils/Collision.js';
import { Sprite } from '../engine/Sprite.js';
import { PowerUpManager } from './PowerUp.js';

/**
 * Расширенный класс игрока с поддержкой всех новых механик
 * Следует принципам SOLID и композиции для гибкости
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
     * @param {PowerUpManager} config.powerUpManager - Менеджер power-ups
     */
    constructor(x, y, { sprites, audioManager, timeManager, particleSystem, powerUpManager, game }) {
        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this.previousPosition = new Vec2(x, y); // Для следов

        // Размеры персонажа (как было изначально)
        this.width = 45;  
        this.height = 50;

        // Ссылки на менеджеры
        this.audioManager = audioManager;
        this.timeManager = timeManager;
        this.particleSystem = particleSystem;
        this.powerUpManager = powerUpManager || new PowerUpManager(this);
        this.game = game;  // Ссылка на основной объект игры

        // Основная физика
        this.isGrounded = false;
        this.wasGrounded = false;
        this.onPlatform = null;
        this.ridingPlatform = null;

        // Инвентарь и состояние
        this.hasKey = false;
        this.facingDirection = 1;
        this.jumps = 0;
        this.maxJumps = 2;
        this.isJumping = false;
        this.inputState = { left: false, right: false, jump: false };

        // Физические параметры
        this.gravity = 980;
        this.moveSpeed = 250;
        this.jumpForce = 500;
        this.maxSpeedX = 300;
        this.terminalVelocityY = 1000;
        this.friction = 0.85;
        
        // === НОВЫЕ СИСТЕМЫ ===
        
        // Power-ups система (уже инициализирован в конструкторе)
        this.speedMultiplier = 1.0;
        this.jumpMultiplier = 1.0;
        this.isInvulnerable = false;
        this.invulnerabilityFlicker = 0;
        this.magnetRange = 0;
        this.hasMagnetism = false;
        
        // Специальная физика
        this.onIce = false;
        this.iceFriction = 0.02;
        this.onConveyor = false;
        this.conveyorForce = 0;
        
        // Система кристаллов
        this.crystalsCollected = 0;
        this.totalScore = 0;
        
        // Визуальные эффекты
        this.trailTimer = 0;
        this.trailInterval = 50; // мс между следами
        this.speedEffectThreshold = 200; // Минимальная скорость для эффектов
        
        // Взаимодействие с блоками
        this.lastSpringBounce = 0;
        this.springCooldown = 200;
        this.lastTeleportTime = 0;
        this.teleportCooldown = 500;

        this.yOffset = 0;
        
        // Таймер для звука шагов
        this.footstepTimer = 0;
        this.footstepInterval = 400; // Интервал между звуками шагов в миллисекундах
        
        // Создание системы спрайтов с оригинальными настройками
        this.sprite = new Sprite({
            frameWidth: this.width,
            frameHeight: this.height,
            animations: {
                idle: { 
                    image: sprites.idle, 
                    row: 0, 
                    frameCount: 4,  // 4 кадра дыхания
                    frameInterval: 200  // Медленная анимация дыхания
                },
                run: { 
                    image: sprites.run, 
                    row: 0, 
                    frameCount: 6,  // 6 кадров бега
                    frameInterval: 100  // Быстрая анимация бега
                },
                jump: { 
                    image: sprites.jump, 
                    row: 0, 
                    frameCount: 1,  // 1 кадр прыжка
                    frameInterval: 100 
                },
                fall: { 
                    image: sprites.fall, 
                    row: 0, 
                    frameCount: 1,  // 1 кадр падения
                    frameInterval: 100 
                },
                doublejump: { 
                    image: sprites.doublejump, 
                    row: 0, 
                    frameCount: 6,  // 6 кадров двойного прыжка с эффектами
                    frameInterval: 80   // Быстрая анимация с эффектами
                }
            }
        });
        
        // Звук шагов
        this.footstepTimer = 0;
        this.footstepInterval = 300;
        
        this.animationTransitionTimer = 0;
        this.animationTransitionDelay = 50;
    }

    /**
     * Основной метод обновления логики игрока с поддержкой всех новых механик
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
     * @param {Array} crystals - Массив кристаллов
     * @param {Array} powerUps - Массив power-ups
     * @returns {Object} Результат обновления с информацией о состоянии игры
     */
    update(scaledDeltaTime, rawDeltaTime, input, level, enemies, platforms, keys, doors, goal, fallingBlocks = [], crystals = [], powerUps = []) {
        const dt = scaledDeltaTime / 1000;
        
        // Сохраняем предыдущую позицию для следов
        this.previousPosition.x = this.position.x;
        this.previousPosition.y = this.position.y;
        
        // --- 1. Обновление power-ups ---
        this.powerUpManager.update(scaledDeltaTime);
        
        // --- 2. Движущиеся платформы ---
        if (this.ridingPlatform && this.ridingPlatform.deltaMovement) {
             this.position.x += this.ridingPlatform.deltaMovement.x;
             this.position.y += this.ridingPlatform.deltaMovement.y;
        }

        // --- 3. Ввод и физика ---
        this.wasGrounded = this.isGrounded;
        this.handleInput(input);
        
        // Сброс специальных состояний
        this.onIce = false;
        this.onConveyor = false;
        this.conveyorForce = 0;

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
        
        // --- НОВЫЕ СИСТЕМЫ ВЗАИМОДЕЙСТВИЯ ---
        
        // Взаимодействие с кристаллами
        if (crystals && crystals.length > 0) {
            this.handleCrystalCollisions(crystals);
        }
        
        // Взаимодействие с power-ups
        if (powerUps && powerUps.length > 0) {
            this.handlePowerUpCollisions(powerUps);
        }
        
        // Взаимодействие со специальными блоками
        if (level.specialBlocks && level.specialBlocks.length > 0) {
            this.handleSpecialBlocksInteraction(level.specialBlocks);
        }
        
        // Проверка секретных областей
        if (level.secretAreas && level.secretAreas.length > 0) {
            level.checkSecretAreas(this);
        }
        
        // Применяем модификаторы скорости от power-ups
        this.applySpeedModifications();
        
        const enemyCollision = this.handleEnemyCollisions(enemies);
        if (enemyCollision.gameOver && !this.isInvulnerable) {
            return { gameOver: true, levelComplete: false };
        }

        // --- 7. Визуальные эффекты ---
        this.updateVisualEffects(scaledDeltaTime);
        
        // --- 8. Анимация ---
        this.updateAnimationState();
        this.sprite.update(rawDeltaTime);
        
        // --- 9. Звук шагов ---
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
                    
                    // Начисляем очки за убийство врага
                    if (this.game && this.game.addScore) {
                        this.game.addScore(20, 'убийство врага');
                    }
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
    
    // === НОВЫЕ МЕТОДЫ ВЗАИМОДЕЙСТВИЯ ===
    
    /**
     * Взаимодействие с кристаллами
     */
    handleCrystalCollisions(crystals) {
        const playerBounds = {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
        
        for (const crystal of crystals) {
            if (crystal.tryCollect(playerBounds)) {
                this.crystalsCollected++;
                this.totalScore += crystal.value;
                
                // Уведомляем систему целей
                if (window.gameInstance && window.gameInstance.objectiveSystem) {
                    window.gameInstance.objectiveSystem.onCrystalCollected();
                }
                
                // Звуковой эффект
                if (this.audioManager) {
                    const soundName = crystal.type === 'legendary' ? 'crystal_legendary' : 
                                     crystal.type === 'rare' ? 'crystal_rare' : 'crystal_collect';
                    this.audioManager.playSound(soundName);
                }
            }
        }
    }
    
    /**
     * Взаимодействие с power-ups
     */
    handlePowerUpCollisions(powerUps) {
        for (const powerUp of powerUps) {
            if (powerUp.tryCollect(this)) {
                // Power-up сам применяет эффект через powerUpManager
                // Здесь можем добавить дополнительную логику если нужно
            }
        }
    }
    
    /**
     * Взаимодействие со специальными блоками
     */
    handleSpecialBlocksInteraction(specialBlocks) {
        const currentTime = performance.now();
        
        for (const block of specialBlocks) {
            const collision = block.checkCollision({
                x: this.position.x,
                y: this.position.y,
                width: this.width,
                height: this.height
            });
            
            if (collision) {
                switch (block.type) {
                    case 'spring':
                        if (currentTime - this.lastSpringBounce > this.springCooldown) {
                            if (block.interact(this)) {
                                this.lastSpringBounce = currentTime;
                                this.emitJumpParticles(); // Дополнительные эффекты
                            }
                        }
                        break;
                        
                    case 'ice':
                        block.interact(this);
                        break;
                        
                    case 'conveyor':
                        block.interact(this);
                        this.onConveyor = true;
                        this.conveyorForce = block.speed * block.direction;
                        break;
                        
                    case 'switch':
                        block.interact(this);
                        break;
                        
                    case 'teleport':
                        if (currentTime - this.lastTeleportTime > this.teleportCooldown) {
                            if (block.interact(this)) {
                                this.lastTeleportTime = currentTime;
                                // Эффекты телепортации добавляются в самом блоке
                            }
                        }
                        break;
                }
            }
        }
    }
    
    /**
     * Применение модификаторов скорости
     */
    applySpeedModifications() {
        // Модификации от power-ups уже применены через powerUpManager
        
        // Применяем ледяную физику
        if (this.onIce) {
            this.friction = this.iceFriction;
        } else {
            this.friction = 0.85; // Восстанавливаем обычное трение
        }
        
        // Применяем силу конвейера
        if (this.onConveyor) {
            this.velocity.x += this.conveyorForce * (1/60); // Приблизительный deltaTime
        }
    }
    
    /**
     * Обновление визуальных эффектов
     */
    updateVisualEffects(deltaTime) {
        // Обновляем мерцание неуязвимости
        if (this.isInvulnerable) {
            this.invulnerabilityFlicker += deltaTime;
        }
        
        // Следы движения при высокой скорости
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        
        if (speed > this.speedEffectThreshold && this.isGrounded) {
            this.trailTimer += deltaTime;
            
            if (this.trailTimer >= this.trailInterval) {
                this.trailTimer = 0;
                this.emitMovementTrail();
            }
        }
        
        // Магнетизм для кристаллов
        if (this.hasMagnetism && this.magnetRange > 0) {
            this.updateCrystalMagnetism();
        }
    }
    
    /**
     * Эффект следов движения
     */
    emitMovementTrail() {
        if (!this.particleSystem) return;
        
        // Определяем цвет следа в зависимости от активных power-ups
        let trailColor = '#64b5f6'; // Стандартный синий
        
        if (this.powerUpManager.hasEffect('speed')) {
            trailColor = '#ff5722'; // Красный для скорости
        } else if (this.powerUpManager.hasEffect('jump')) {
            trailColor = '#4caf50'; // Зеленый для прыжков
        }
        
        this.particleSystem.emitTrail(
            this.position.x + this.width / 2,
            this.position.y + this.height,
            this.previousPosition.x + this.width / 2,
            this.previousPosition.y + this.height,
            {
                color: trailColor,
                count: 2,
                lifetime: 300,
                size: 3
            }
        );
    }
    
    /**
     * Обновление магнетизма кристаллов
     */
    updateCrystalMagnetism() {
        // Эта логика будет обрабатываться самими кристаллами
        // через их метод update с передачей позиции игрока
        // Здесь можем добавить визуальные эффекты магнетизма
        
        if (this.particleSystem && Math.random() < 0.3) {
            this.particleSystem.emit({
                x: this.position.x + this.width / 2 + (Math.random() - 0.5) * this.magnetRange,
                y: this.position.y + this.height / 2 + (Math.random() - 0.5) * this.magnetRange,
                velocityX: (Math.random() - 0.5) * 20,
                velocityY: (Math.random() - 0.5) * 20,
                life: 200,
                color: '#ffeb3b',
                size: 1,
                fadeOut: true,
                gravity: false
            });
        }
    }
    
    /**
     * Улучшенный метод обработки столкновений с врагами (с учетом неуязвимости)
     */
    handleEnemyCollisions(enemies) {
        if (this.isInvulnerable) {
            return { gameOver: false }; // Неуязвимость защищает от врагов
        }
        
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
                    
                    // Эффекты уничтожения врага
                    this.particleSystem.emitPreset('explosion', 
                        enemy.position.x + enemy.width / 2,
                        enemy.position.y + enemy.height / 2
                    );
                } else {
                    // Уведомляем систему целей о смерти
                    if (window.gameInstance && window.gameInstance.objectiveSystem) {
                        window.gameInstance.objectiveSystem.onPlayerDeath();
                    }
                    return { gameOver: true };
                }
            }
        }
        return { gameOver: false };
    }
    
    /**
     * Переопределенный метод прыжка с учетом power-ups
     */
    jump() {
        const canJump = this.isGrounded || this.jumps < this.maxJumps;
        if (!canJump) return;

        const jumpForce = this.jumpForce * this.jumpMultiplier; // Применяем модификатор
        this.velocity.y = -jumpForce;
        this.isGrounded = false;
        this.jumps++;
        this.isJumping = true;

        this.emitJumpParticles();
        if (this.audioManager) this.audioManager.playSound('jump', this.timeManager.timeScale);
    }
    
    /**
     * Улучшенная обработка ввода с учетом модификаторов
     */
    handleInput(input) {
        this.inputState.left = input.keys.has('ArrowLeft') || input.keys.has('KeyA');
        this.inputState.right = input.keys.has('ArrowRight') || input.keys.has('KeyD');
        this.inputState.jump = input.keys.has('Space') || input.keys.has('ArrowUp') || input.keys.has('KeyW');

        const moveForce = this.moveSpeed * this.speedMultiplier; // Применяем модификатор скорости

        if (this.inputState.left) {
            this.velocity.x -= moveForce * (1/60);
            this.facingDirection = -1;
        }
        if (this.inputState.right) {
            this.velocity.x += moveForce * (1/60);
            this.facingDirection = 1;
        }

        if (this.inputState.jump && !this.isJumping) {
            this.jump();
        }

        if (!this.inputState.jump) {
            this.isJumping = false;
        }
    }
    
    /**
     * Метод отрисовки с учетом эффектов
     */
    draw(context) {
        // Округляем для отрисовки, чтобы избежать размытия пиксель-арта, но сохраняем плавность движения.
        const drawX = Math.floor(this.position.x);
        const drawY = Math.floor(this.position.y + this.yOffset);

        context.save();
        
        // Эффект мерцания при неуязвимости
        if (this.isInvulnerable) {
            const flickerAlpha = Math.sin(this.invulnerabilityFlicker / 100) * 0.5 + 0.5;
            context.globalAlpha = 0.3 + flickerAlpha * 0.7;
        }
        
        // Эффект свечения от power-ups
        if (this.powerUpManager.hasEffect('speed')) {
            context.shadowColor = '#ff5722';
            context.shadowBlur = 10;
        } else if (this.powerUpManager.hasEffect('jump')) {
            context.shadowColor = '#4caf50';
            context.shadowBlur = 8;
        } else if (this.powerUpManager.hasEffect('invulnerability')) {
            context.shadowColor = '#9c27b0';
            context.shadowBlur = 12;
        }
        
        if (this.facingDirection === -1) {
            context.scale(-1, 1);
            this.sprite.draw(context, -drawX - this.width, drawY);
        } else {
            this.sprite.draw(context, drawX, drawY);
        }
        context.restore();
    }
    
    /**
     * Получение статистики игрока
     */
    getStats() {
        return {
            crystalsCollected: this.crystalsCollected,
            totalScore: this.totalScore,
            activePowerUps: this.powerUpManager.getAllEffects(),
            position: { x: this.position.x, y: this.position.y },
            isGrounded: this.isGrounded,
            hasKey: this.hasKey
        };
    }
    
    /**
     * Сброс состояния игрока (для рестарта уровня)
     */
    reset(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        this.isGrounded = false;
        this.hasKey = false;
        this.jumps = 0;
        this.crystalsCollected = 0;
        
        // Очищаем все power-ups
        this.powerUpManager.clear();
        
        // Сбрасываем модификаторы
        this.speedMultiplier = 1.0;
        this.jumpMultiplier = 1.0;
        this.isInvulnerable = false;
        this.magnetRange = 0;
        this.hasMagnetism = false;
        
        // Сбрасываем специальные состояния
        this.onIce = false;
        this.onConveyor = false;
        this.invulnerabilityFlicker = 0;
    }

}
