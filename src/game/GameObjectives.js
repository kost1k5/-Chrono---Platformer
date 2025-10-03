
/**
 * Система целей и достижений для уровней
 * Следует паттерну Observer для отслеживания событий
 */
class ObjectiveSystem {
    constructor() {
        this.objectives = new Map();
        this.completedObjectives = new Set();
        this.listeners = [];
        
        // Статистика текущего уровня
        this.levelStats = {
            crystalsCollected: 0,
            totalCrystals: 0,
            timeElapsed: 0,
            deathCount: 0,
            secretAreasFound: 0,
            totalSecretAreas: 0,
            airTime: 0, // Время в воздухе для испытания "без касания земли"
            lastGroundTime: 0
        };
        
        // Типы целей
        this.objectiveTypes = {
            COLLECT_ALL_CRYSTALS: 'collect_all_crystals',
            TIME_TRIAL: 'time_trial',
            NO_DEATH: 'no_death',
            FIND_SECRETS: 'find_secrets',
            AIR_TIME: 'air_time', // Испытание без касания земли
            PERFECT_RUN: 'perfect_run' // Все кристаллы + время + без смертей
        };
    }
    
    /**
     * Инициализация целей для уровня
     */
    initializeLevelObjectives(levelData) {
        this.objectives.clear();
        this.completedObjectives.clear();
        this.resetLevelStats();
        
        // Подсчитываем общее количество элементов уровня
        this.levelStats.totalCrystals = this.countCrystals(levelData);
        this.levelStats.totalSecretAreas = this.countSecretAreas(levelData);
        
        // Создаем стандартные цели
        this.createStandardObjectives(levelData);
        
        // Создаем специальные цели (если указаны в данных уровня)
        if (levelData.objectives) {
            this.createCustomObjectives(levelData.objectives);
        }
    }
    
    /**
     * Подсчет кристаллов в данных уровня
     */
    countCrystals(levelData) {
        if (!levelData.entities) return 0;
        return levelData.entities.filter(entity => entity.type === 'crystal').length;
    }
    
    /**
     * Подсчет секретных областей
     */
    countSecretAreas(levelData) {
        if (!levelData.secretAreas) return 0;
        return levelData.secretAreas.length;
    }
    
    /**
     * Создание стандартных целей
     */
    createStandardObjectives(levelData) {
        // Цель: собрать все кристаллы
        if (this.levelStats.totalCrystals > 0) {
            this.addObjective({
                id: 'collect_all_crystals',
                type: this.objectiveTypes.COLLECT_ALL_CRYSTALS,
                title: '💎 Коллекционер',
                description: `Соберите все кристаллы (${this.levelStats.totalCrystals})`,
                targetValue: this.levelStats.totalCrystals,
                currentValue: 0,
                reward: {
                    score: this.levelStats.totalCrystals * 100,
                    badge: 'crystal_collector'
                }
            });
        }
        
        // Цель: завершить без смертей
        this.addObjective({
            id: 'no_death',
            type: this.objectiveTypes.NO_DEATH,
            title: '🛡️ Выживший',
            description: 'Завершите уровень без смертей',
            targetValue: 0,
            currentValue: 0,
            reward: {
                score: 500,
                badge: 'survivor'
            }
        });
        
        // Цель: найти секретные области
        if (this.levelStats.totalSecretAreas > 0) {
            this.addObjective({
                id: 'find_secrets',
                type: this.objectiveTypes.FIND_SECRETS,
                title: '🔍 Исследователь',
                description: `Найдите все секретные области (${this.levelStats.totalSecretAreas})`,
                targetValue: this.levelStats.totalSecretAreas,
                currentValue: 0,
                reward: {
                    score: this.levelStats.totalSecretAreas * 200,
                    badge: 'explorer'
                }
            });
        }
        
        // Временное испытание (если указано в levelData)
        if (levelData.timeTrialTarget) {
            this.addObjective({
                id: 'time_trial',
                type: this.objectiveTypes.TIME_TRIAL,
                title: '⏱️ Спидраннер',
                description: `Завершите за ${this.formatTime(levelData.timeTrialTarget)}`,
                targetValue: levelData.timeTrialTarget,
                currentValue: 0,
                reward: {
                    score: 1000,
                    badge: 'speedrunner'
                }
            });
        }
        
        // Испытание "в воздухе" (если в уровне есть платформы для прыжков)
        if (this.hasJumpChallengeElements(levelData)) {
            this.addObjective({
                id: 'air_time',
                type: this.objectiveTypes.AIR_TIME,
                title: '🦅 Летун',
                description: 'Проведите 80% времени в воздухе',
                targetValue: 0.8, // 80%
                currentValue: 0,
                reward: {
                    score: 800,
                    badge: 'air_master'
                }
            });
        }
        
        // Идеальное прохождение
        this.addObjective({
            id: 'perfect_run',
            type: this.objectiveTypes.PERFECT_RUN,
            title: '⭐ Перфекционист',
            description: 'Идеальное прохождение: все кристаллы, без смертей, быстро',
            targetValue: 1,
            currentValue: 0,
            isComposite: true, // Составная цель
            dependencies: ['collect_all_crystals', 'no_death'],
            reward: {
                score: 2000,
                badge: 'perfectionist'
            }
        });
    }
    
    /**
     * Создание пользовательских целей
     */
    createCustomObjectives(customObjectives) {
        for (const objective of customObjectives) {
            this.addObjective(objective);
        }
    }
    
    /**
     * Проверка наличия элементов для прыжкового испытания
     */
    hasJumpChallengeElements(levelData) {
        if (!levelData.entities) return false;
        
        // Проверяем наличие пружинящих блоков или движущихся платформ
        return levelData.entities.some(entity => 
            entity.type === 'spring_block' || entity.type === 'moving_platform'
        ) || (levelData.movingPlatforms && levelData.movingPlatforms.length > 0);
    }
    
    /**
     * Добавление цели
     */
    addObjective(objective) {
        this.objectives.set(objective.id, {
            ...objective,
            isCompleted: false,
            completedAt: null
        });
    }
    
    /**
     * Обновление статистики уровня
     */
    updateLevelStats(stats) {
        Object.assign(this.levelStats, stats);
        this.checkObjectiveProgress();
    }
    
    /**
     * Событие: кристалл собран
     */
    onCrystalCollected() {
        this.levelStats.crystalsCollected++;
        this.checkObjectiveProgress();
        this.notifyListeners('crystal_collected', this.levelStats);
    }
    
    /**
     * Событие: игрок умер
     */
    onPlayerDeath() {
        this.levelStats.deathCount++;
        this.checkObjectiveProgress();
        this.notifyListeners('player_death', this.levelStats);
    }
    
    /**
     * Событие: секретная область найдена
     */
    onSecretAreaFound(areaId) {
        this.levelStats.secretAreasFound++;
        this.checkObjectiveProgress();
        this.notifyListeners('secret_found', { areaId, stats: this.levelStats });
    }
    
    /**
     * Событие: игрок приземлился/взлетел
     */
    onGroundStateChanged(isGrounded, currentTime) {
        if (isGrounded) {
            if (this.levelStats.lastGroundTime > 0) {
                this.levelStats.airTime += currentTime - this.levelStats.lastGroundTime;
            }
        } else {
            this.levelStats.lastGroundTime = currentTime;
        }
        this.checkObjectiveProgress();
    }
    
    /**
     * Обновление времени уровня
     */
    updateTime(timeElapsed) {
        this.levelStats.timeElapsed = timeElapsed;
        this.checkObjectiveProgress();
    }
    
    /**
     * Проверка прогресса всех целей
     */
    checkObjectiveProgress() {
        for (const [id, objective] of this.objectives) {
            if (objective.isCompleted) continue;
            
            let isCompleted = false;
            let currentValue = objective.currentValue;
            
            switch (objective.type) {
                case this.objectiveTypes.COLLECT_ALL_CRYSTALS:
                    currentValue = this.levelStats.crystalsCollected;
                    isCompleted = this.levelStats.crystalsCollected >= this.levelStats.totalCrystals;
                    break;
                    
                case this.objectiveTypes.NO_DEATH:
                    currentValue = this.levelStats.deathCount;
                    isCompleted = this.levelStats.deathCount === 0;
                    break;
                    
                case this.objectiveTypes.TIME_TRIAL:
                    currentValue = this.levelStats.timeElapsed;
                    isCompleted = this.levelStats.timeElapsed <= objective.targetValue;
                    break;
                    
                case this.objectiveTypes.FIND_SECRETS:
                    currentValue = this.levelStats.secretAreasFound;
                    isCompleted = this.levelStats.secretAreasFound >= this.levelStats.totalSecretAreas;
                    break;
                    
                case this.objectiveTypes.AIR_TIME:
                    const totalTime = this.levelStats.timeElapsed;
                    const airTimeRatio = totalTime > 0 ? this.levelStats.airTime / totalTime : 0;
                    currentValue = airTimeRatio;
                    isCompleted = airTimeRatio >= objective.targetValue;
                    break;
                    
                case this.objectiveTypes.PERFECT_RUN:
                    if (objective.isComposite) {
                        isCompleted = this.checkCompositeObjective(objective);
                        currentValue = isCompleted ? 1 : 0;
                    }
                    break;
            }
            
            // Обновляем текущее значение
            objective.currentValue = currentValue;
            
            // Если цель выполнена
            if (isCompleted && !objective.isCompleted) {
                this.completeObjective(id);
            }
        }
    }
    
    /**
     * Проверка составной цели
     */
    checkCompositeObjective(objective) {
        if (!objective.dependencies) return false;
        
        return objective.dependencies.every(depId => {
            const dependency = this.objectives.get(depId);
            return dependency && dependency.isCompleted;
        });
    }
    
    /**
     * Завершение цели
     */
    completeObjective(objectiveId) {
        const objective = this.objectives.get(objectiveId);
        if (!objective || objective.isCompleted) return;
        
        objective.isCompleted = true;
        objective.completedAt = performance.now();
        this.completedObjectives.add(objectiveId);
        
        this.notifyListeners('objective_completed', objective);
        
        // Показываем уведомление в UI
        if (window.gameInstance && window.gameInstance.ui) {
            // TODO: Добавить метод showObjectiveCompleted в UI
            // window.gameInstance.ui.showObjectiveCompleted(objective);
        }
    }
    
    /**
     * Получение всех целей
     */
    getAllObjectives() {
        return Array.from(this.objectives.values());
    }
    
    /**
     * Получение завершенных целей
     */
    getCompletedObjectives() {
        return Array.from(this.objectives.values()).filter(obj => obj.isCompleted);
    }
    
    /**
     * Получение прогресса целей в процентах
     */
    getOverallProgress() {
        const total = this.objectives.size;
        const completed = this.completedObjectives.size;
        return total > 0 ? (completed / total) * 100 : 0;
    }
    
    /**
     * Сброс статистики уровня
     */
    resetLevelStats() {
        this.levelStats = {
            crystalsCollected: 0,
            totalCrystals: 0,
            timeElapsed: 0,
            deathCount: 0,
            secretAreasFound: 0,
            totalSecretAreas: 0,
            airTime: 0,
            lastGroundTime: 0
        };
    }
    
    /**
     * Форматирование времени
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Получение итогового счета
     */
    getFinalScore() {
        let totalScore = 0;
        
        for (const objective of this.getCompletedObjectives()) {
            if (objective.reward && objective.reward.score) {
                totalScore += objective.reward.score;
            }
        }
        
        // Бонус за общий прогресс
        const progressBonus = Math.floor(this.getOverallProgress() * 10);
        totalScore += progressBonus;
        
        return totalScore;
    }
    
    /**
     * Получение заработанных значков
     */
    getEarnedBadges() {
        const badges = [];
        
        for (const objective of this.getCompletedObjectives()) {
            if (objective.reward && objective.reward.badge) {
                badges.push(objective.reward.badge);
            }
        }
        
        return badges;
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
    
    notifyListeners(event, data) {
        for (const listener of this.listeners) {
            if (typeof listener === 'function') {
                listener(event, data);
            }
        }
    }
    
    /**
     * Обновление системы целей
     */
    update(deltaTime) {
        // Обновляем время уровня для временных испытаний
        this.updateTime(deltaTime);
        
        // Проверяем прогресс целей
        this.checkObjectiveProgress();
    }
}

/**
 * Класс для секретных областей
 */
class SecretArea {
    constructor(x, y, width, height, id, reward = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.id = id;
        this.reward = reward;
        this.isDiscovered = false;
        
        // Визуальные эффекты
        this.glowIntensity = 0;
        this.discoveryAnimation = {
            isActive: false,
            progress: 0,
            duration: 1000
        };
    }
    
    /**
     * Проверка обнаружения игроком
     */
    checkDiscovery(playerBounds) {
        if (this.isDiscovered) return false;
        
        const areaOverlap = (
            playerBounds.x < this.x + this.width &&
            playerBounds.x + playerBounds.width > this.x &&
            playerBounds.y < this.y + this.height &&
            playerBounds.y + playerBounds.height > this.y
        );
        
        if (areaOverlap) {
            this.discover();
            return true;
        }
        
        return false;
    }
    
    /**
     * Обнаружение секретной области
     */
    discover() {
        if (this.isDiscovered) return;
        
        this.isDiscovered = true;
        this.discoveryAnimation.isActive = true;
        this.discoveryAnimation.progress = 0;
        
        // Уведомляем систему целей
        if (window.gameInstance && window.gameInstance.objectiveSystem) {
            window.gameInstance.objectiveSystem.onSecretAreaFound(this.id);
        }
        
        // Применяем награду
        if (this.reward) {
            this.applyReward();
        }
    }
    
    /**
     * Применение награды
     */
    applyReward() {
        if (!this.reward) return;
        
        switch (this.reward.type) {
            case 'crystal':
                // Создаем кристалл в центре области
                const centerX = this.x + this.width / 2;
                const centerY = this.y + this.height / 2;
                // Логика создания кристалла будет добавлена при интеграции
                break;
                
            case 'powerup':
                // Создаем power-up
                // Аналогично кристаллу
                break;
                
            case 'score':
                // Добавляем очки (временно через основную игру)
                if (window.gameInstance) {
                    window.gameInstance.score += this.reward.value || 100;
                }
                break;
        }
    }
    
    /**
     * Обновление анимации
     */
    update(deltaTime) {
        if (this.discoveryAnimation.isActive) {
            this.discoveryAnimation.progress += deltaTime;
            
            if (this.discoveryAnimation.progress >= this.discoveryAnimation.duration) {
                this.discoveryAnimation.isActive = false;
            }
        }
        
        // Эффект свечения для обнаруженных областей
        if (this.isDiscovered) {
            this.glowIntensity = 0.5 + Math.sin(performance.now() / 200) * 0.3;
        }
    }
    
    /**
     * Отрисовка секретной области (только когда обнаружена)
     */
    draw(context, camera) {
        if (!this.isDiscovered) return;
        
        const screenPos = camera.worldToScreen({ x: this.x, y: this.y });
        
        context.save();
        
        if (this.isDiscovered) {
            // Отрисовка обнаруженной области
            context.fillStyle = `rgba(255, 215, 0, ${this.glowIntensity * 0.3})`;
            context.fillRect(screenPos.x, screenPos.y, this.width, this.height);
            
            context.strokeStyle = `rgba(255, 215, 0, ${this.glowIntensity})`;
            context.lineWidth = 2;
            context.strokeRect(screenPos.x, screenPos.y, this.width, this.height);
        }
        
        context.restore();
    }
}

// Экспорт классов
export { ObjectiveSystem, SecretArea };
