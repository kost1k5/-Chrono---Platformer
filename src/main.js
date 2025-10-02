// Filename: main.js
import { InputHandler } from './engine/InputHandler.js';
import { Player } from './game/Player.js';
import { Enemy } from './game/Enemy.js';
import { Level } from './game/Level.js';
import { AssetManager } from './engine/AssetManager.js';
import { TimeManager } from './engine/TimeManager.js';
import { AudioManager } from './engine/AudioManager.js';
import { UI } from './game/UI.js';
import { SaveManager } from './engine/SaveManager.js';
import { Leaderboard } from './game/Leaderboard.js';
import { Goal } from './game/Goal.js';
import { MovingPlatform } from './game/MovingPlatform.js';
import { Key } from './game/Key.js';
import { Door } from './game/Door.js';
import { ParticleSystem } from './engine/ParticleSystem.js';
import { Camera } from './engine/Camera.js';
import { FallingBlock } from './game/FallingBlock.js';
// Новые системы
import { Crystal } from './game/Crystal.js';
import SpecialBlocks from './game/SpecialBlocks.js';
import { PowerUp, PowerUpManager } from './game/PowerUp.js';
import { ObjectiveSystem, SecretArea } from './game/GameObjectives.js';

/**
 * Точка входа в игру - инициализируется после загрузки DOM
 */
window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 960;
    canvas.height = 540;

    const game = {
        width: canvas.width,
        height: canvas.height,
        score: 0,
        highScore: 0,
        gameState: 'loading',
        currentLevelIndex: 0,

        /**
         * Инициализация всех подсистем игры
         */
        /**
         * Инициализация всех подсистем игры
         */
        init() {
            this.assetManager = new AssetManager();
            this.audioManager = new AudioManager();
            this.timeManager = new TimeManager();
            this.saveManager = new SaveManager();
            this.leaderboard = new Leaderboard();
            this.camera = new Camera(this.width, this.height);
            this.particleSystem = new ParticleSystem();
            this.level = new Level();
            this.ui = new UI(this);
            this.inputHandler = new InputHandler(canvas, this.ui);
            
            // Инициализация новых систем
            this.powerUpManager = new PowerUpManager();
            this.objectiveSystem = new ObjectiveSystem();
            
            this.enemies = [];
            this.platforms = [];
            this.keys = [];
            this.doors = [];
            this.fallingBlocks = [];
            
            // Новые массивы для новых систем
            this.crystals = [];
            this.specialBlocks = [];
            this.powerUps = [];
            this.secretAreas = [];
            
            this.player = null;
            this.goal = null;

            const saveData = this.saveManager.load();
            if (saveData && saveData.highScore) this.highScore = saveData.highScore;

            // Регистрируем игру глобально для доступа из других систем
            window.gameInstance = this;

            this.setupEventListeners();
        },

        /**
         * Загрузка всех игровых ресурсов (изображения и звуки)
         */
        loadAssets() {
            this.gameState = 'loading';
            // Загрузка оригинальных спрайтов игрока
            this.assetManager.queueImage('player_idle', './assets/images/player_idle.png');
            this.assetManager.queueImage('player_run', './assets/images/player_run.png');
            this.assetManager.queueImage('player_jump', './assets/images/player_jump.png');
            this.assetManager.queueImage('player_fall', './assets/images/player_fall.png');
            this.assetManager.queueImage('player_doublejump', './assets/images/player_doublejump.png');
            this.assetManager.queueImage('enemy_walk', './assets/images/enemy_walk.png');

            this.audioManager.loadSounds([
                { name: 'jump', path: './assets/audio/jump.mp3' },
                { name: 'background', path: './assets/audio/land.mp3' },
                { name: 'enemy_stomp', path: './assets/audio/enemy_stomp.mp3' },
                { name: 'footstep', path: './assets/audio/footstep.mp3' },
                // Новые звуки для новых механик
                { name: 'crystal_collect', path: './assets/audio/crystal_collect.mp3' },
                { name: 'crystal_rare', path: './assets/audio/crystal_rare.mp3' },
                { name: 'crystal_legendary', path: './assets/audio/crystal_legendary.mp3' },
                { name: 'powerup_collect', path: './assets/audio/powerup_collect.mp3' },
                { name: 'powerup_expire', path: './assets/audio/powerup_expire.mp3' },
                { name: 'spring_bounce', path: './assets/audio/spring_bounce.mp3' },
                { name: 'teleport', path: './assets/audio/teleport.mp3' },
                { name: 'switch_activate', path: './assets/audio/switch_activate.mp3' },
                { name: 'objective_complete', path: './assets/audio/objective_complete.mp3' },
                { name: 'secret_found', path: './assets/audio/secret_found.mp3' }
            ]);

            this.assetManager.loadAll(() => this.setupGame());
        },

        /**
         * Инициализация игровых состояний после загрузки ресурсов
         */
        async setupGame() {
            this.gameState = 'mainMenu';
        },

        /**
         * Начинает новую игру с первого уровня
         */
        async startNewGame() {
            if (this.gameState === 'playing' || this.gameState === 'loadingLevel') return;

            if (window.screen && screen.orientation && screen.orientation.lock) {
                try { 
                    await screen.orientation.lock('landscape'); 
                } catch (err) { 
                    // Игнорируем ошибки блокировки ориентации
                }
            }

            this.score = 0;
            this.currentLevelIndex = 0;
            await this.loadLevel(this.currentLevelIndex);
            // Состояние 'playing' устанавливается внутри loadLevel после завершения загрузки.
        },

        /**
         * Перезапускает текущий уровень (например, после смерти игрока)
         */
        async restartCurrentLevel() {
             if (this.gameState === 'playing' || this.gameState === 'loadingLevel') return;
             await this.loadLevel(this.currentLevelIndex);
        },

        /**
         * Загружает указанный уровень по индексу
         * @param {number} levelIndex - Индекс уровня для загрузки
         */
        async loadLevel(levelIndex) {
            this.gameState = 'loadingLevel';

            // Проверяем наличие тестового уровня в localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const testLevel = urlParams.get('testLevel');
            
            if (testLevel === 'true') {
                const testLevelData = localStorage.getItem('testLevel');
                if (testLevelData) {
                    try {
                        const levelData = JSON.parse(testLevelData);
                        await this.level.loadFromData(levelData);
                        await this.initializeLevel();
                        
                        // Убеждаемся что состояние правильно установлено
                        if (this.gameState === 'loadingLevel') {
                            this.gameState = 'playing';
                            this.audioManager.init();
                            // Останавливаем текущую музыку перед запуском новой
                            this.audioManager.stopBackgroundMusic();
                            this.audioManager.playBackgroundMusic('background');
                        }
                        return;
                    } catch (error) {
                        console.error('Ошибка загрузки тестового уровня:', error);
                        // Переходим к обычной загрузке уровня при ошибке
                    }
                }
            }

            // Загружаем список уровней динамически
            if (!this.levelsList) {
                try {
                    const response = await fetch('./assets/levels/levels_list.json');
                    if (!response.ok) {
                        throw new Error('Cannot load levels list');
                    }
                    const levelsData = await response.json();
                    this.levelsList = levelsData.levels;
                } catch (error) {
                    console.error('Ошибка загрузки списка уровней:', error);
                    this.gameState = 'error';
                    return;
                }
            }
            
            const levelInfo = this.levelsList[levelIndex];
            if (!levelInfo) {
                this.gameState = 'gameWon';
                return;
            }

            try {
                const levelData = await this.level.load(levelInfo.path);
                await this.initializeLevel();
                
                if (this.gameState === 'loadingLevel') {
                    this.gameState = 'playing';
                    this.audioManager.init();
                    // Останавливаем текущую музыку перед запуском новой
                    this.audioManager.stopBackgroundMusic();
                    this.audioManager.playBackgroundMusic('background');
                }

            } catch (error) {
                console.error('Ошибка загрузки уровня:', error);
                this.gameState = 'error';
            }
        },

        async initializeLevel() {
            // Инициализация сущностей из данных уровня
            // this.level уже содержит загруженные данные
            
            // Создание объекта спрайтов
            const playerSprites = {
                idle: this.assetManager.getImage('player_idle'),
                run: this.assetManager.getImage('player_run'),
                jump: this.assetManager.getImage('player_jump'),
                fall: this.assetManager.getImage('player_fall'),
                doublejump: this.assetManager.getImage('player_doublejump'),
            };

            const playerData = this.level.entities.find(e => e.type === 'player');
            if (!playerData) {
                throw new Error('Player not found in level data');
            }
            
            this.player = new Player(playerData.x, playerData.y, {
                sprites: playerSprites,
                audioManager: this.audioManager,
                timeManager: this.timeManager,
                particleSystem: this.particleSystem,
                powerUpManager: this.powerUpManager
            });

            const enemySpritesheet = this.assetManager.getImage('enemy_walk');
            const enemyEntities = this.level.entities.filter(e => e.type === 'enemy') || [];
            this.enemies = enemyEntities.map(data => new Enemy(data.x, data.y, { 
                spritesheet: enemySpritesheet,
                moveRange: data.moveRange || 80,
                speed: data.speed || 50
            }));
            
            this.platforms = (this.level.movingPlatforms || []).map(data => new MovingPlatform(data.x, data.y, data.width, data.height, data.endX, data.endY, data.speed));
            this.keys = (this.level.entities.filter(e => e.type === 'key') || []).map(data => new Key(data.x, data.y));
            this.doors = (this.level.entities.filter(e => e.type === 'door') || []).map(data => new Door(data.x, data.y));
            
            // Создаем падающие блоки из данных уровня
            this.fallingBlocks = (this.level.fallingBlocks || []).map(data => new FallingBlock(data.x, data.y, data.width || 32, data.height || 32));
            
            // === ИНИЦИАЛИЗАЦИЯ НОВЫХ СИСТЕМ ===
            
            // Инициализация кристаллов
            this.crystals = (this.level.crystals || []).map(data => 
                new Crystal(data.x, data.y, data.type || 'common', data.value || 10, this.particleSystem)
            );
            
            // Инициализация специальных блоков
            this.specialBlocks = (this.level.specialBlocks || []).map(data => {
                const blockClass = SpecialBlocks[data.type.charAt(0).toUpperCase() + data.type.slice(1) + 'Block'];
                if (blockClass) {
                    return new blockClass(data.x, data.y, data.width || 32, data.height || 16, data, this.particleSystem, this.audioManager);
                }
                return null;
            }).filter(block => block !== null);
            
            // Инициализация power-ups
            this.powerUps = (this.level.powerUps || []).map(data =>
                new PowerUp(data.x, data.y, data.type, data.duration || 5000, this.particleSystem, this.audioManager)
            );
            
            // Инициализация секретных областей
            this.secretAreas = (this.level.secretAreas || []).map(data =>
                new SecretArea(data.id, data.x, data.y, data.width, data.height, data.reward, data.requiredAction)
            );
            
            // Инициализация системы целей
            this.objectiveSystem.initializeLevelObjectives(this.level);
            
            const goalData = this.level.entities.find(e => e.type === 'goal');
            this.goal = goalData ? new Goal(goalData.x, goalData.y) : null;
        },

        async loadCustomLevel() {
            this.gameState = 'loadingLevel';

            try {
                const customLevelData = localStorage.getItem('customLevel');
                if (!customLevelData) {
                    this.gameState = 'gameWon';
                    return;
                }

                const levelData = JSON.parse(customLevelData);
                await this.level.loadFromData(levelData);
                await this.initializeLevel();
                
                if (this.gameState === 'loadingLevel') {
                    this.gameState = 'playing';
                    this.audioManager.init();
                    this.audioManager.playBackgroundMusic('background');
                }

            } catch (error) {
                this.gameState = 'gameWon';
            }
        },

        update(rawDeltaTime) {
            // Предотвращаем обновление, если игра не активна (включая loadingLevel)
            if (this.gameState !== 'playing') return;

            // --- Механика Времени ---
            const slowMoActive = this.inputHandler.keys.has('ShiftLeft') || this.inputHandler.keys.has('ShiftRight');
            this.timeManager.setTimeScale(slowMoActive ? 0.3 : 1.0);
            const scaledDeltaTime = rawDeltaTime * this.timeManager.timeScale;

            // --- Обновления Мира (Платформы ДО игрока) ---
            if (this.platforms && this.platforms.length > 0) {
                this.platforms.forEach(p => p.update(scaledDeltaTime));
            }
            this.level.update(scaledDeltaTime);
            this.enemies.forEach(e => e.update(scaledDeltaTime, this.level, this.platforms));
            
            // Обновляем падающие блоки
            this.fallingBlocks.forEach(block => block.update(scaledDeltaTime, this.player.position));
            // Удаляем блоки, которые нужно убрать
            this.fallingBlocks = this.fallingBlocks.filter(block => !block.shouldBeRemoved);

            // --- Обновление новых систем ---
            // Обновляем кристаллы
            this.crystals.forEach(crystal => crystal.update(scaledDeltaTime, this.player.position));
            
            // Обновляем power-ups  
            this.powerUps.forEach(powerUp => powerUp.update(scaledDeltaTime));
            this.powerUpManager.update(scaledDeltaTime);
            
            // Обновляем специальные блоки
            this.specialBlocks.forEach(block => block.update(scaledDeltaTime));
            
            // Обновляем систему целей
            this.objectiveSystem.update(scaledDeltaTime);

            // --- Обновление Игрока ---
            const playerStatus = this.player.update(
                scaledDeltaTime,
                rawDeltaTime,
                this.inputHandler,
                this.level,
                this.enemies,
                this.platforms,
                this.keys,
                this.doors,
                this.goal,
                this.fallingBlocks,
                // Новые параметры
                this.crystals,
                this.powerUps,
                this.specialBlocks
            );

            // --- Обработка Статуса Игрока ---
            if (playerStatus.gameOver) {
                this.gameState = 'gameOver';
                return;
            }

            // ИСПРАВЛЕНО: Обработка завершения уровня
            if (playerStatus.levelComplete) {
                this.currentLevelIndex++;
                // Проверяем, есть ли следующий уровень (используем динамический список)
                const hasNextLevel = this.levelsList && this.currentLevelIndex < this.levelsList.length;
                if (hasNextLevel) {
                    // Эта асинхронная функция установит 'loadingLevel' и приостановит update
                    this.loadLevel(this.currentLevelIndex);
                } else {
                    // Пробуем загрузить пользовательский уровень
                    const customLevel = localStorage.getItem('customLevel');
                    if (customLevel) {
                        this.loadCustomLevel();
                    } else {
                        // Нет пользовательского уровня - игра завершена
                        this.gameState = 'gameWon';
                    }
                }
                return; // Прекращаем обновление в этом кадре
            }

            this.particleSystem.update(scaledDeltaTime);

            // Камера
            const levelPixelWidth = this.level.width * this.level.tileSize;
            const levelPixelHeight = this.level.height * this.level.tileSize;
            this.camera.follow(this.player, levelPixelWidth, levelPixelHeight);
        },

        draw() {
            ctx.clearRect(0, 0, this.width, this.height);

            if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameOver' || this.gameState === 'gameWon' || this.gameState === 'loadingLevel') {
                this.level.drawBackground(ctx, this.camera);
                ctx.save();
                this.camera.apply(ctx);
                this.level.drawWorld(ctx, this.camera);
                if (this.platforms && this.platforms.length > 0) {
                    this.platforms.forEach(p => p.draw(ctx));
                }
                this.doors.forEach(d => d.draw(ctx));
                this.keys.forEach(k => k.draw(ctx));
                this.fallingBlocks.forEach(block => block.draw(ctx, this.camera));
                
                // Отрисовка новых элементов
                this.specialBlocks.forEach(block => block.draw(ctx));
                this.crystals.forEach(crystal => crystal.draw(ctx));
                this.powerUps.forEach(powerUp => powerUp.draw(ctx));
                this.secretAreas.forEach(area => area.draw(ctx));
                
                if (this.goal) this.goal.draw(ctx);
                if (this.enemies) {
                    this.enemies.forEach((enemy, index) => {
                        enemy.draw(ctx, this.camera);
                    });
                }
                if (this.player) this.player.draw(ctx);
                this.particleSystem.draw(ctx);
                ctx.restore();
            }

            // Добавим индикатор загрузки
            if (this.gameState === 'loadingLevel') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.font = '30px Arial';
                ctx.fillText('Загрузка уровня...', this.width / 2, this.height / 2);
            }

            this.ui.draw(ctx);
        },

        /**
         * Настройка обработчиков событий для управления игрой
         */
        setupEventListeners() {
            window.addEventListener('keydown', (e) => {
                 if (e.code === 'Escape' && (this.gameState === 'playing' || this.gameState === 'paused')) {
                    this.gameState = this.gameState === 'playing' ? 'paused' : 'playing';
                    if (this.gameState === 'paused') {
                        this.audioManager.pauseBackgroundMusic();
                    } else {
                        this.audioManager.resumeBackgroundMusic();
                    }
                }
                if (e.code === 'KeyM') {
                    this.audioManager.init();
                    this.audioManager.toggleMute();
                }
            });

            // Автосохранение при закрытии страницы
            window.addEventListener('pagehide', () => {
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveManager.save({ 
                        highScore: this.highScore,
                        currentLevel: this.currentLevelIndex 
                    });
                }
                if (this.audioManager) {
                    this.audioManager.stopBackgroundMusic();
                }
            });
        }
    };

    /**
     * Основной игровой цикл - выполняется каждый кадр
     * Обрабатывает обновление логики и отрисовку
     */
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (lastTime === 0) {
            lastTime = timestamp;
            requestAnimationFrame(gameLoop);
            return;
        }

        const rawDeltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (game.gameState === 'playing') {
            game.update(rawDeltaTime);
        } else {
            // Обработка ввода в состояниях меню
            const enterPressed = game.inputHandler.keys.has('Enter');
            if (enterPressed) {
                game.inputHandler.keys.delete('Enter');

                if (game.gameState === 'gameOver') {
                    game.restartCurrentLevel();
                } else if (game.gameState === 'gameWon' || game.gameState === 'mainMenu') {
                    game.startNewGame();
                }
            }
        }

        game.draw();
        requestAnimationFrame(gameLoop);
    }

    // Инициализация и запуск игры
    game.init();
    game.loadAssets();
    requestAnimationFrame(gameLoop);
});
