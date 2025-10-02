// Filename: SpecialBlocks.js
import { Vec2 } from '../utils/Vec2.js';
import { checkAABBCollision } from '../utils/Collision.js';

/**
 * Базовый класс для специальных блоков
 * Следует принципу наследования и полиморфизма
 */
class SpecialBlock {
    constructor(x, y, width = 32, height = 32, type = 'special') {
        this.position = new Vec2(x, y);
        this.width = width;
        this.height = height;
        this.type = type;
        this.isActive = true;
        
        // Состояние блока
        this.animationTimer = 0;
        this.effectIntensity = 1.0;
    }
    
    /**
     * Базовый метод обновления - переопределяется в наследниках
     */
    update(deltaTime) {
        this.animationTimer += deltaTime;
    }
    
    /**
     * Проверка столкновения с игроком
     */
    checkCollision(playerBounds) {
        const blockBounds = {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
        
        return checkAABBCollision(playerBounds, blockBounds);
    }
    
    /**
     * Базовый метод взаимодействия - переопределяется в наследниках
     */
    interact(player) {
        // Переопределяется в наследниках
    }
    
    /**
     * Базовый метод отрисовки
     */
    draw(context, camera) {
        // Переопределяется в наследниках
    }
}

/**
 * Пружинящий блок - подбрасывает игрока вверх
 */
export class SpringBlock extends SpecialBlock {
    constructor(x, y, springForce = 800) {
        super(x, y, 32, 32, 'spring');
        
        this.springForce = springForce;
        this.compressionLevel = 0; // 0-1, уровень сжатия пружины
        this.lastActivation = 0;
        this.cooldown = 100; // мс между активациями
        
        // Анимация
        this.isCompressed = false;
        this.compressionAnimation = {
            duration: 150, // мс
            progress: 0
        };
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Анимация восстановления пружины
        if (this.isCompressed) {
            this.compressionAnimation.progress += deltaTime;
            
            if (this.compressionAnimation.progress >= this.compressionAnimation.duration) {
                this.isCompressed = false;
                this.compressionAnimation.progress = 0;
                this.compressionLevel = 0;
            } else {
                // Easing функция для плавного восстановления
                const progress = this.compressionAnimation.progress / this.compressionAnimation.duration;
                this.compressionLevel = 1 - this.easeOutBounce(progress);
            }
        }
    }
    
    interact(player) {
        const currentTime = performance.now();
        
        // Проверяем кулдаун
        if (currentTime - this.lastActivation < this.cooldown) return false;
        
        // Проверяем, что игрок падает вниз и находится сверху блока
        if (player.velocity.y > 0 && player.position.y < this.position.y) {
            // Подбрасываем игрока
            player.velocity.y = -this.springForce;
            player.isGrounded = false;
            player.jumps = 0; // Сбрасываем счетчик прыжков
            
            // Запускаем анимацию сжатия
            this.isCompressed = true;
            this.compressionAnimation.progress = 0;
            this.compressionLevel = 1;
            
            this.lastActivation = currentTime;
            
            // Эффекты
            this.emitSpringParticles(player);
            this.playSpringSound(player);
            
            return true;
        }
        
        return false;
    }
    
    emitSpringParticles(player) {
        if (!player.particleSystem) return;
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 6) + (Math.PI * 2 / 3) * Math.random(); // Вверх и в стороны
            const speed = 100 + Math.random() * 100;
            
            player.particleSystem.emit({
                x: this.position.x + this.width / 2,
                y: this.position.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: 400,
                color: '#4fc3f7',
                size: 2 + Math.random() * 3,
                fadeOut: true,
                gravity: true
            });
        }
    }
    
    playSpringSound(player) {
        if (player.audioManager) {
            player.audioManager.playSound('spring_bounce');
        }
    }
    
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
    
    draw(context, camera) {
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x, screenPos.y);
        
        // Фон блока
        context.fillStyle = '#37474f';
        context.fillRect(0, 0, this.width, this.height);
        
        // Пружина
        const springHeight = this.height * 0.8 * (1 - this.compressionLevel * 0.7);
        const springY = this.height - springHeight;
        
        // Витки пружины
        context.strokeStyle = '#81c784';
        context.lineWidth = 3;
        context.beginPath();
        
        const coils = 6;
        const coilHeight = springHeight / coils;
        
        for (let i = 0; i < coils; i++) {
            const y = springY + i * coilHeight;
            const nextY = springY + (i + 1) * coilHeight;
            
            context.moveTo(this.width * 0.2, y);
            context.quadraticCurveTo(this.width * 0.8, y + coilHeight * 0.5, this.width * 0.2, nextY);
        }
        
        context.stroke();
        
        // Верхняя платформа
        context.fillStyle = '#4fc3f7';
        context.fillRect(0, 0, this.width, 4);
        
        // Нижняя платформа
        context.fillStyle = '#37474f';
        context.fillRect(0, this.height - 4, this.width, 4);
        
        context.restore();
    }
}

/**
 * Ледяной блок - скользкая поверхность
 */
export class IceBlock extends SpecialBlock {
    constructor(x, y) {
        super(x, y, 32, 32, 'ice');
        
        this.friction = 0.02; // Очень низкое трение
        this.slideAcceleration = 150; // Ускорение скольжения
        
        // Эффекты
        this.sparkleTimer = 0;
        this.sparkleInterval = 200;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Искрящиеся эффекты
        this.sparkleTimer += deltaTime;
        if (this.sparkleTimer >= this.sparkleInterval) {
            this.sparkleTimer = 0;
            this.emitIceSparkles();
        }
    }
    
    interact(player) {
        // Модифицируем физику игрока на льду
        if (player.isGrounded && this.checkCollision({
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        })) {
            // Применяем ледяную физику
            player.onIce = true;
            player.iceFriction = this.friction;
            
            return true;
        }
        
        return false;
    }
    
    emitIceSparkles() {
        // Эффекты искр будут добавлены когда подключим к игре
    }
    
    draw(context, camera) {
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x, screenPos.y);
        
        // Ледяной блок с градиентом
        const gradient = context.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#e1f5fe');
        gradient.addColorStop(0.5, '#b3e5fc');
        gradient.addColorStop(1, '#81d4fa');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, this.width, this.height);
        
        // Контур
        context.strokeStyle = '#0277bd';
        context.lineWidth = 2;
        context.strokeRect(0, 0, this.width, this.height);
        
        // Эффект блеска
        const glintIntensity = (Math.sin(this.animationTimer / 200) + 1) / 2;
        context.fillStyle = `rgba(255, 255, 255, ${glintIntensity * 0.5})`;
        context.fillRect(2, 2, this.width - 4, 4);
        
        context.restore();
    }
}

/**
 * Конвейерный блок - движущаяся поверхность
 */
export class ConveyorBlock extends SpecialBlock {
    constructor(x, y, direction = 1, speed = 100) {
        super(x, y, 32, 32, 'conveyor');
        
        this.direction = direction; // 1 = вправо, -1 = влево
        this.speed = speed;
        this.beltOffset = 0; // Для анимации ленты
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Анимация движения ленты
        this.beltOffset += (this.speed * this.direction * deltaTime) / 1000;
        this.beltOffset = this.beltOffset % this.width;
    }
    
    interact(player) {
        if (player.isGrounded && this.checkCollision({
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        })) {
            // Применяем силу конвейера
            const conveyorForce = this.speed * this.direction;
            player.velocity.x += conveyorForce * (1/60); // Приблизительный deltaTime
            
            return true;
        }
        
        return false;
    }
    
    draw(context, camera) {
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x, screenPos.y);
        
        // Основа конвейера
        context.fillStyle = '#424242';
        context.fillRect(0, 0, this.width, this.height);
        
        // Движущаяся лента
        context.fillStyle = '#616161';
        const beltHeight = 8;
        context.fillRect(0, 0, this.width, beltHeight);
        
        // Полоски на ленте для показа движения
        context.strokeStyle = '#757575';
        context.lineWidth = 2;
        
        const stripeWidth = 8;
        const stripeCount = Math.ceil(this.width / stripeWidth) + 1;
        
        for (let i = 0; i < stripeCount; i++) {
            const x = (i * stripeWidth + this.beltOffset) % (this.width + stripeWidth) - stripeWidth;
            context.beginPath();
            context.moveTo(x, 2);
            context.lineTo(x + 4, 2);
            context.stroke();
        }
        
        // Стрелки направления
        context.fillStyle = '#ffeb3b';
        const arrowY = this.height - 8;
        const arrowSize = 4;
        
        if (this.direction > 0) {
            // Стрелка вправо
            context.beginPath();
            context.moveTo(this.width / 2 - arrowSize, arrowY);
            context.lineTo(this.width / 2 + arrowSize, arrowY + arrowSize / 2);
            context.lineTo(this.width / 2 - arrowSize, arrowY + arrowSize);
            context.fill();
        } else {
            // Стрелка влево
            context.beginPath();
            context.moveTo(this.width / 2 + arrowSize, arrowY);
            context.lineTo(this.width / 2 - arrowSize, arrowY + arrowSize / 2);
            context.lineTo(this.width / 2 + arrowSize, arrowY + arrowSize);
            context.fill();
        }
        
        context.restore();
    }
}

/**
 * Переключатель - активирует механизмы
 */
export class SwitchBlock extends SpecialBlock {
    constructor(x, y, id = 'switch_1', targetIds = []) {
        super(x, y, 32, 32, 'switch');
        
        this.id = id;
        this.targetIds = targetIds; // ID целей для активации
        this.isActivated = false;
        this.isPressed = false;
        
        // Анимация
        this.pressDepth = 0; // 0-4 пикселя
        this.maxPressDepth = 4;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Анимация нажатия
        if (this.isPressed && this.pressDepth < this.maxPressDepth) {
            this.pressDepth = Math.min(this.pressDepth + (deltaTime / 50), this.maxPressDepth);
        } else if (!this.isPressed && this.pressDepth > 0) {
            this.pressDepth = Math.max(this.pressDepth - (deltaTime / 50), 0);
        }
    }
    
    interact(player) {
        const wasPressed = this.isPressed;
        
        // Проверяем нажатие
        this.isPressed = this.checkCollision({
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        }) && player.velocity.y >= 0;
        
        // Активация при первом нажатии
        if (this.isPressed && !wasPressed) {
            this.activate(player);
            return true;
        }
        
        return false;
    }
    
    activate(player) {
        this.isActivated = !this.isActivated;
        
        // Эффекты активации
        this.emitSwitchParticles(player);
        this.playSwitchSound(player);
        
        // Событие для других систем
        if (window.gameInstance) {
            window.gameInstance.onSwitchActivated(this.id, this.targetIds, this.isActivated);
        }
    }
    
    emitSwitchParticles(player) {
        if (!player.particleSystem) return;
        
        const color = this.isActivated ? '#4caf50' : '#f44336';
        
        for (let i = 0; i < 8; i++) {
            player.particleSystem.emit({
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height / 2,
                velocityX: (Math.random() - 0.5) * 80,
                velocityY: (Math.random() - 0.5) * 80,
                life: 300,
                color: color,
                size: 2 + Math.random() * 2,
                fadeOut: true
            });
        }
    }
    
    playSwitchSound(player) {
        if (player.audioManager) {
            player.audioManager.playSound(this.isActivated ? 'switch_on' : 'switch_off');
        }
    }
    
    draw(context, camera) {
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x, screenPos.y);
        
        // Основание переключателя
        context.fillStyle = '#37474f';
        context.fillRect(0, 0, this.width, this.height);
        
        // Кнопка переключателя
        const buttonSize = this.width * 0.6;
        const buttonX = (this.width - buttonSize) / 2;
        const buttonY = (this.height - buttonSize) / 2 + this.pressDepth;
        
        context.fillStyle = this.isActivated ? '#4caf50' : '#f44336';
        context.fillRect(buttonX, buttonY, buttonSize, buttonSize - this.pressDepth);
        
        // Контур кнопки
        context.strokeStyle = this.isActivated ? '#388e3c' : '#c62828';
        context.lineWidth = 2;
        context.strokeRect(buttonX, buttonY, buttonSize, buttonSize - this.pressDepth);
        
        // Индикатор состояния
        if (this.isActivated) {
            context.fillStyle = '#ffeb3b';
            context.beginPath();
            context.arc(
                this.width / 2, 
                this.height / 2 + this.pressDepth / 2, 
                3, 0, Math.PI * 2
            );
            context.fill();
        }
        
        context.restore();
    }
}

/**
 * Телепорт - мгновенное перемещение между точками
 */
export class TeleportBlock extends SpecialBlock {
    constructor(x, y, id = 'teleport_1', targetId = null, targetX = 0, targetY = 0) {
        super(x, y, 32, 32, 'teleport');
        
        this.id = id;
        this.targetId = targetId;
        this.targetPosition = new Vec2(targetX, targetY);
        
        this.cooldown = 500; // мс между использованиями
        this.lastUsed = 0;
        this.isCharging = false;
        
        // Эффекты
        this.portalRotation = 0;
        this.energyPulse = 0;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Анимация портала
        this.portalRotation += deltaTime / 200;
        this.energyPulse = Math.sin(this.animationTimer / 150) * 0.5 + 0.5;
        
        // Зарядка после использования
        if (this.isCharging) {
            const timeSinceUse = performance.now() - this.lastUsed;
            if (timeSinceUse >= this.cooldown) {
                this.isCharging = false;
            }
        }
    }
    
    interact(player) {
        if (this.isCharging) return false;
        
        const collision = this.checkCollision({
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        });
        
        if (collision) {
            this.teleportPlayer(player);
            return true;
        }
        
        return false;
    }
    
    teleportPlayer(player) {
        // Эффекты перед телепортацией
        this.emitTeleportParticles(player, true);
        this.playTeleportSound(player);
        
        // Телепортация
        player.position.x = this.targetPosition.x;
        player.position.y = this.targetPosition.y;
        
        // Сброс скорости для плавного появления
        player.velocity.x *= 0.5;
        player.velocity.y = Math.min(player.velocity.y, 0);
        
        // Эффекты после телепортации
        setTimeout(() => {
            this.emitTeleportParticles(player, false);
        }, 100);
        
        // Кулдаун
        this.lastUsed = performance.now();
        this.isCharging = true;
    }
    
    emitTeleportParticles(player, isDeparture) {
        if (!player.particleSystem) return;
        
        const position = isDeparture ? this.position : this.targetPosition;
        const color = isDeparture ? '#9c27b0' : '#3f51b5';
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            
            player.particleSystem.emit({
                x: position.x + this.width / 2,
                y: position.y + this.height / 2,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: 600,
                color: color,
                size: 2 + Math.random() * 4,
                fadeOut: true,
                gravity: false
            });
        }
    }
    
    playTeleportSound(player) {
        if (player.audioManager) {
            player.audioManager.playSound('teleport');
        }
    }
    
    draw(context, camera) {
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x + this.width / 2, screenPos.y + this.height / 2);
        
        // Внешнее кольцо портала
        context.rotate(this.portalRotation);
        context.strokeStyle = this.isCharging ? '#666' : '#9c27b0';
        context.lineWidth = 3;
        context.globalAlpha = this.energyPulse;
        
        context.beginPath();
        context.arc(0, 0, this.width / 2 - 2, 0, Math.PI * 2);
        context.stroke();
        
        // Внутреннее свечение
        context.rotate(-this.portalRotation * 2);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, this.width / 3);
        gradient.addColorStop(0, this.isCharging ? 'rgba(102, 102, 102, 0.8)' : 'rgba(156, 39, 176, 0.8)');
        gradient.addColorStop(1, 'rgba(156, 39, 176, 0)');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, this.width / 3, 0, Math.PI * 2);
        context.fill();
        
        // Центральная точка
        context.fillStyle = this.isCharging ? '#999' : '#e1bee7';
        context.beginPath();
        context.arc(0, 0, 2, 0, Math.PI * 2);
        context.fill();
        
        context.restore();
    }
}

// Экспорт всех классов
export { SpecialBlock };

// Создаем объект для удобного доступа к классам по типу
const SpecialBlocks = {
    Spring: SpringBlock,
    Ice: IceBlock,
    Conveyor: ConveyorBlock,
    Switch: SwitchBlock,
    Teleport: TeleportBlock
};

export default SpecialBlocks;