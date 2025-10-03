import { Vec2 } from '../utils/Vec2.js';
import { checkAABBCollision } from '../utils/Collision.js';

/**
 * Базовый класс для power-ups
 * Следует паттерну Strategy для различных типов эффектов
 */
class PowerUp {
    constructor(x, y, type = 'speed', duration = 5000) {
        this.position = new Vec2(x, y);
        this.startPosition = new Vec2(x, y);
        
        this.width = 28;
        this.height = 28;
        this.type = type;
        this.duration = duration; // мс
        
        this.isActive = true;
        this.isCollected = false;
        
        // Анимация
        this.bobOffset = 0;
        this.rotationAngle = 0;
        this.glowIntensity = 0;
        this.scale = 1;
        
        // Анимация появления
        this.spawnAnimation = {
            progress: 0,
            duration: 400,
            isComplete: false
        };
        
        // Анимация сбора
        this.collectAnimation = {
            progress: 0,
            duration: 300,
            isActive: false
        };
        
        // Конфигурация по типам
        this.configs = {
            speed: {
                color: '#ff5722',
                secondaryColor: '#ffab91',
                icon: '⚡',
                name: 'Speed Boost',
                description: 'Увеличивает скорость движения',
                multiplier: 1.8
            },
            jump: {
                color: '#4caf50',
                secondaryColor: '#a5d6a7',
                icon: '🦘',
                name: 'Jump Boost',
                description: 'Увеличивает высоту прыжка',
                multiplier: 1.5
            },
            invulnerability: {
                color: '#9c27b0',
                secondaryColor: '#ce93d8',
                icon: '🛡️',
                name: 'Shield',
                description: 'Временная неуязвимость',
                multiplier: 1.0
            },
            magnetism: {
                color: '#ffeb3b',
                secondaryColor: '#fff59d',
                icon: '🧲',
                name: 'Magnet',
                description: 'Притягивает кристаллы',
                multiplier: 2.0
            }
        };
        
        this.config = this.configs[type] || this.configs.speed;
    }
    
    update(deltaTime, player = null) {
        if (!this.isActive || this.isCollected) return;
        
        const dt = deltaTime / 1000;
        
        // Анимация появления
        if (!this.spawnAnimation.isComplete) {
            this.updateSpawnAnimation(deltaTime);
        }
        
        // Анимация сбора
        if (this.collectAnimation.isActive) {
            this.updateCollectAnimation(deltaTime);
            return;
        }
        
        // Анимация плавания
        this.bobOffset += dt * 3;
        this.position.y = this.startPosition.y + Math.sin(this.bobOffset) * 4;
        
        // Вращение
        this.rotationAngle += dt * 2;
        
        // Эффект свечения
        this.glowIntensity = 0.6 + Math.sin(this.bobOffset * 2) * 0.4;
        
        // Проверка сбора игроком
        if (player && this.tryCollect(player)) {
            this.collect(player);
        }
    }
    
    updateSpawnAnimation(deltaTime) {
        this.spawnAnimation.progress += deltaTime;
        const progress = Math.min(this.spawnAnimation.progress / this.spawnAnimation.duration, 1);
        
        this.scale = this.easeOutBack(progress);
        
        if (progress >= 1) {
            this.spawnAnimation.isComplete = true;
            this.scale = 1;
        }
    }
    
    updateCollectAnimation(deltaTime) {
        this.collectAnimation.progress += deltaTime;
        const progress = Math.min(this.collectAnimation.progress / this.collectAnimation.duration, 1);
        
        // Эффект исчезновения с увеличением
        this.scale = 1 + progress * 2;
        this.glowIntensity = 1 - progress;
        
        if (progress >= 1) {
            this.isActive = false;
            this.isCollected = true;
        }
    }
    
    tryCollect(player) {
        const playerBounds = {
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        };
        
        const powerUpBounds = {
            x: this.position.x - this.width / 2,
            y: this.position.y - this.height / 2,
            width: this.width,
            height: this.height
        };
        
        return checkAABBCollision(playerBounds, powerUpBounds);
    }
    
    collect(player) {
        if (this.isCollected) return;
        
        // Запускаем анимацию сбора
        this.collectAnimation.isActive = true;
        this.collectAnimation.progress = 0;
        
        // Применяем эффект к игроку
        this.applyEffect(player);
        
        // Эффекты
        this.emitCollectParticles(player);
        this.playCollectSound(player);
    }
    
    applyEffect(player) {
        if (!player.powerUps) {
            player.powerUps = new Map();
        }
        
        // Создаем эффект power-up
        const effect = {
            type: this.type,
            config: this.config,
            startTime: performance.now(),
            duration: this.duration,
            isActive: true
        };
        
        // Добавляем эффект к игроку
        player.powerUps.set(this.type, effect);
        
        // Уведомление в UI
        if (window.gameInstance && window.gameInstance.ui) {
            window.gameInstance.ui.showPowerUpNotification(this.config.name, this.duration);
        }
    }
    
    emitCollectParticles(player) {
        if (!player.particleSystem) return;
        
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const speed = 60 + Math.random() * 40;
            
            player.particleSystem.emit({
                x: this.position.x,
                y: this.position.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                life: 500,
                color: this.config.color,
                size: 2 + Math.random() * 3,
                fadeOut: true,
                gravity: false
            });
        }
    }
    
    playCollectSound(player) {
        if (player.audioManager) {
            player.audioManager.playSound('powerup_collect');
        }
    }
    
    // Easing функция
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    draw(context, camera) {
        if (!this.isActive) return;
        
        const screenPos = camera.worldToScreen(this.position);
        
        context.save();
        context.translate(screenPos.x, screenPos.y);
        context.scale(this.scale, this.scale);
        context.rotate(this.rotationAngle);
        
        // Эффект свечения
        if (this.glowIntensity > 0) {
            context.shadowColor = this.config.color;
            context.shadowBlur = 15 * this.glowIntensity;
        }
        
        // Основной орб
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
        gradient.addColorStop(0, this.config.secondaryColor);
        gradient.addColorStop(0.7, this.config.color);
        gradient.addColorStop(1, this.config.color + '80');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        context.fill();
        
        // Контур
        context.strokeStyle = this.config.color;
        context.lineWidth = 2;
        context.stroke();
        
        // Иконка/символ (если это простая форма)
        if (this.type === 'speed') {
            this.drawSpeedIcon(context);
        } else if (this.type === 'jump') {
            this.drawJumpIcon(context);
        } else if (this.type === 'invulnerability') {
            this.drawShieldIcon(context);
        } else if (this.type === 'magnetism') {
            this.drawMagnetIcon(context);
        }
        
        context.restore();
    }
    
    drawSpeedIcon(context) {
        context.fillStyle = '#fff';
        context.beginPath();
        // Стрелка вправо
        context.moveTo(-6, -4);
        context.lineTo(2, 0);
        context.lineTo(-6, 4);
        context.lineTo(-4, 2);
        context.lineTo(-8, 2);
        context.lineTo(-8, -2);
        context.lineTo(-4, -2);
        context.closePath();
        context.fill();
    }
    
    drawJumpIcon(context) {
        context.strokeStyle = '#fff';
        context.lineWidth = 2;
        context.lineCap = 'round';
        
        // Стрелка вверх
        context.beginPath();
        context.moveTo(-4, 2);
        context.lineTo(0, -4);
        context.lineTo(4, 2);
        context.stroke();
        
        // Основание
        context.beginPath();
        context.moveTo(-6, 4);
        context.lineTo(6, 4);
        context.stroke();
    }
    
    drawShieldIcon(context) {
        context.fillStyle = '#fff';
        context.beginPath();
        // Щит
        context.moveTo(0, -6);
        context.quadraticCurveTo(4, -4, 4, 0);
        context.quadraticCurveTo(4, 4, 0, 6);
        context.quadraticCurveTo(-4, 4, -4, 0);
        context.quadraticCurveTo(-4, -4, 0, -6);
        context.fill();
    }
    
    drawMagnetIcon(context) {
        context.strokeStyle = '#fff';
        context.lineWidth = 2;
        context.lineCap = 'round';
        
        // U-образный магнит
        context.beginPath();
        context.moveTo(-4, -2);
        context.lineTo(-4, 2);
        context.quadraticCurveTo(-4, 4, -2, 4);
        context.lineTo(2, 4);
        context.quadraticCurveTo(4, 4, 4, 2);
        context.lineTo(4, -2);
        context.stroke();
    }
    
    /**
     * Статический метод для создания power-up из данных уровня
     */
    static fromLevelData(data, { audioManager, particleSystem }) {
        const powerUp = new PowerUp(data.x, data.y, data.powerType || 'speed', data.duration || 5000);
        
        // Передаем менеджеры для эффектов
        powerUp.audioManager = audioManager;
        powerUp.particleSystem = particleSystem;
        
        return powerUp;
    }
    
    /**
     * Получить данные для сериализации
     */
    serialize() {
        return {
            type: 'powerup',
            x: this.startPosition.x,
            y: this.startPosition.y,
            powerType: this.type,
            duration: this.duration
        };
    }
}

/**
 * Менеджер эффектов power-ups для игрока
 * Следует паттерну Observer для уведомлений об изменениях
 */
class PowerUpManager {
    constructor(player) {
        this.player = player;
        this.activeEffects = new Map();
        this.listeners = [];
    }
    
    update(deltaTime) {
        const currentTime = performance.now();
        const expiredEffects = [];
        
        // Обновляем активные эффекты
        for (const [type, effect] of this.activeEffects) {
            const elapsed = currentTime - effect.startTime;
            
            if (elapsed >= effect.duration) {
                expiredEffects.push(type);
            } else {
                // Обновляем прогресс эффекта
                effect.progress = elapsed / effect.duration;
                this.applyEffect(type, effect);
            }
        }
        
        // Удаляем истекшие эффекты
        for (const type of expiredEffects) {
            this.removeEffect(type);
        }
    }
    
    addEffect(type, effect) {
        // Удаляем предыдущий эффект того же типа
        if (this.activeEffects.has(type)) {
            this.removeEffect(type);
        }
        
        this.activeEffects.set(type, effect);
        this.applyEffect(type, effect);
        this.notifyListeners('added', type, effect);
    }
    
    removeEffect(type) {
        if (!this.activeEffects.has(type)) return;
        
        const effect = this.activeEffects.get(type);
        this.removeEffectFromPlayer(type, effect);
        this.activeEffects.delete(type);
        this.notifyListeners('removed', type, effect);
    }
    
    applyEffect(type, effect) {
        switch (type) {
            case 'speed':
                this.player.speedMultiplier = effect.config.multiplier;
                break;
                
            case 'jump':
                this.player.jumpMultiplier = effect.config.multiplier;
                break;
                
            case 'invulnerability':
                this.player.isInvulnerable = true;
                break;
                
            case 'magnetism':
                this.player.magnetRange = 120 * effect.config.multiplier;
                this.player.hasMagnetism = true;
                break;
        }
    }
    
    removeEffectFromPlayer(type, effect) {
        switch (type) {
            case 'speed':
                this.player.speedMultiplier = 1.0;
                break;
                
            case 'jump':
                this.player.jumpMultiplier = 1.0;
                break;
                
            case 'invulnerability':
                this.player.isInvulnerable = false;
                break;
                
            case 'magnetism':
                this.player.magnetRange = 0;
                this.player.hasMagnetism = false;
                break;
        }
    }
    
    hasEffect(type) {
        return this.activeEffects.has(type);
    }
    
    getEffect(type) {
        return this.activeEffects.get(type);
    }
    
    getAllEffects() {
        return Array.from(this.activeEffects.values());
    }
    
    // Observer pattern
    addListener(listener) {
        this.listeners.push(listener);
    }
    
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    notifyListeners(action, type, effect) {
        for (const listener of this.listeners) {
            if (typeof listener === 'function') {
                listener(action, type, effect);
            }
        }
    }
    
    clear() {
        for (const type of this.activeEffects.keys()) {
            this.removeEffect(type);
        }
    }
}

export { PowerUp, PowerUpManager };
