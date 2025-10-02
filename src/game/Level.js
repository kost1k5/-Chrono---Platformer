import { Logger } from '../utils/Logger.js';
import { SpringBlock, IceBlock, ConveyorBlock, SwitchBlock, TeleportBlock } from './SpecialBlocks.js';
import { SecretArea } from './GameObjectives.js';

/**
 * Расширенная система уровня с поддержкой всех новых механик
 * Следует принципам модульности и расширяемости
 */
export class Level {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.tileSize = 0;
        this.tileData = [];
        this.entities = [];
        this.tiles = []; // Массив для хранения ОБЪЕКТОВ тайлов
        this.backgroundLayers = [];
        
        // Новые системы
        this.specialBlocks = []; // Пружины, лед, конвейеры и т.д.
        this.secretAreas = [];   // Секретные области
        this.switches = new Map(); // Переключатели и их цели
        this.teleports = new Map(); // Телепорты
        
        // Системы активации
        this.activatedObjects = new Set(); // Объекты активированные переключателями
        
        // Кеш для оптимизации
        this.tileRenderCache = new Map();
        this.lastCameraPosition = { x: 0, y: 0 };
        
        // Поддерживаемые типы тайлов
        this.tileTypes = {
            EMPTY: 0,
            SOLID: 1,
            CRUMBLING: 2,
            SPRING: 3,
            ICE: 4,
            CONVEYOR_LEFT: 5,
            CONVEYOR_RIGHT: 6,
            SWITCH: 7,
            TELEPORT_A: 8,
            TELEPORT_B: 9,
            SECRET_WALL: 10 // Скрытые стены, которые исчезают при приближении
        };
    }

    async load(levelUrl) {
        const response = await fetch(levelUrl);
        const data = await response.json();

        await this.loadFromData(data);
        return data; // Возвращаем весь объект данных уровня
    }

    async loadFromData(data) {
        // Проверяем основные данные уровня
        if (!data) {
            throw new Error('Level data is empty');
        }
        
        this.width = data.width || 10;
        this.height = data.height || 10;
        this.tileSize = data.tileSize || 32;
        this.tileData = data.tileData || [];
        
        // Проверяем валидность tileData
        if (!Array.isArray(this.tileData)) {
            console.warn('tileData is not an array, converting:', this.tileData);
            this.tileData = [];
        }
        
        if (this.tileData.length !== this.width * this.height) {
            console.warn(`tileData length mismatch: expected ${this.width * this.height}, got ${this.tileData.length}`);
            // Дополняем нулями если данных недостаточно
            while (this.tileData.length < this.width * this.height) {
                this.tileData.push(0);
            }
        }
        
        this.entities = data.entities || [];
        this.movingPlatforms = data.movingPlatforms || [];
        this.fallingBlocks = data.fallingBlocks || [];
        
        // Новые данные
        this.specialBlocksData = data.specialBlocks || [];
        this.secretAreasData = data.secretAreas || [];
        this.switchesData = data.switches || [];
        this.teleportsData = data.teleports || [];
        this.timeTrialTarget = data.timeTrialTarget || null;
        this.objectives = data.objectives || [];
        
        this.backgroundLayers = data.backgroundLayers || [
            { color: '#87CEEB', scrollFactor: 0.0 } // Дефолтный голубой фон
        ];

        this.buildLevel();
        return data; // Возвращаем весь объект данных уровня
    }

    buildLevel() {
        this.tiles = []; // Очищаем тайлы перед перестройкой
        this.specialBlocks = [];
        this.secretAreas = [];
        this.switches.clear();
        this.teleports.clear();
        
        // Строим основные тайлы
        this.buildBasicTiles();
        
        // Строим специальные блоки из тайлов
        this.buildSpecialBlocksFromTiles();
        
        // Строим специальные блоки из данных
        this.buildSpecialBlocksFromData();
        
        // Строим секретные области
        this.buildSecretAreas();
        
        // Настраиваем переключатели и телепорты
        this.setupSwitchesAndTeleports();
        
        Logger.info(`Level built with ${this.tiles.length} tiles, ${this.specialBlocks.length} special blocks, ${this.secretAreas.length} secret areas`);

        // Улучшенные фоны для параллакса
        if (!this.backgroundLayers || this.backgroundLayers.length === 0) {
            this.backgroundLayers = [
                { color: '#1a237e', scrollFactor: 0.1 }, // Дальний фон
                { color: '#283593', scrollFactor: 0.3 }, // Средний фон
                { color: '#3949ab', scrollFactor: 0.5 }, // Ближний фон
            ];
        }
    }
    
    /**
     * Строим основные тайлы
     */
    buildBasicTiles() {
        // Проверяем валидность данных перед обработкой
        if (!this.tileData || !Array.isArray(this.tileData)) {
            console.error('tileData is not defined or not an array:', this.tileData);
            return;
        }
        
        if (this.tileData.length !== this.width * this.height) {
            console.error(`tileData length mismatch: expected ${this.width * this.height}, got ${this.tileData.length}`);
            return;
        }

        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const index = row * this.width + col;
                const tileType = this.tileData[index];
                if (tileType === this.tileTypes.EMPTY) continue; // Пропускаем пустые тайлы

                const tile = {
                    x: col * this.tileSize,
                    y: row * this.tileSize,
                    width: this.tileSize,
                    height: this.tileSize,
                    type: tileType,
                    gridX: col,
                    gridY: row
                };
                
                // Специальные свойства для разных типов
                if (tileType === this.tileTypes.CRUMBLING) {
                    tile.state = 'idle'; // 'idle', 'crumbling', 'gone'
                    tile.crumbleTimer = 500; // 0.5 секунды до разрушения
                } else if (tileType === this.tileTypes.SECRET_WALL) {
                    tile.isVisible = true;
                    tile.fadeTimer = 0;
                    tile.proximityRadius = 64; // Радиус обнаружения игрока
                }

                this.tiles.push(tile);
            }
        }
    }
    
    /**
     * Строим специальные блоки из тайлов
     */
    buildSpecialBlocksFromTiles() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const tileType = this.tileData[row * this.width + col];
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                
                switch (tileType) {
                    case this.tileTypes.SPRING:
                        this.specialBlocks.push(new SpringBlock(x, y, 800));
                        break;
                        
                    case this.tileTypes.ICE:
                        this.specialBlocks.push(new IceBlock(x, y));
                        break;
                        
                    case this.tileTypes.CONVEYOR_LEFT:
                        this.specialBlocks.push(new ConveyorBlock(x, y, -1, 120));
                        break;
                        
                    case this.tileTypes.CONVEYOR_RIGHT:
                        this.specialBlocks.push(new ConveyorBlock(x, y, 1, 120));
                        break;
                        
                    case this.tileTypes.SWITCH:
                        const switchId = `switch_${col}_${row}`;
                        this.specialBlocks.push(new SwitchBlock(x, y, switchId));
                        break;
                        
                    case this.tileTypes.TELEPORT_A:
                        const teleportB = this.findTeleportPair(this.tileTypes.TELEPORT_B);
                        if (teleportB) {
                            this.specialBlocks.push(new TeleportBlock(x, y, 'teleport_a', 'teleport_b', teleportB.x, teleportB.y));
                        }
                        break;
                        
                    case this.tileTypes.TELEPORT_B:
                        const teleportA = this.findTeleportPair(this.tileTypes.TELEPORT_A);
                        if (teleportA) {
                            this.specialBlocks.push(new TeleportBlock(x, y, 'teleport_b', 'teleport_a', teleportA.x, teleportA.y));
                        }
                        break;
                }
            }
        }
    }
    
    /**
     * Найти парный телепорт
     */
    findTeleportPair(targetType) {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const tileType = this.tileData[row * this.width + col];
                if (tileType === targetType) {
                    return {
                        x: col * this.tileSize,
                        y: row * this.tileSize
                    };
                }
            }
        }
        return null;
    }
    
    /**
     * Строим специальные блоки из JSON данных
     */
    buildSpecialBlocksFromData() {
        for (const blockData of this.specialBlocksData) {
            switch (blockData.type) {
                case 'spring':
                    this.specialBlocks.push(new SpringBlock(
                        blockData.x, 
                        blockData.y, 
                        blockData.force || 800
                    ));
                    break;
                    
                case 'ice':
                    this.specialBlocks.push(new IceBlock(blockData.x, blockData.y));
                    break;
                    
                case 'conveyor':
                    this.specialBlocks.push(new ConveyorBlock(
                        blockData.x, 
                        blockData.y, 
                        blockData.direction || 1, 
                        blockData.speed || 120
                    ));
                    break;
                    
                case 'switch':
                    this.specialBlocks.push(new SwitchBlock(
                        blockData.x, 
                        blockData.y, 
                        blockData.id, 
                        blockData.targets || []
                    ));
                    break;
                    
                case 'teleport':
                    this.specialBlocks.push(new TeleportBlock(
                        blockData.x, 
                        blockData.y, 
                        blockData.id, 
                        blockData.targetId, 
                        blockData.targetX || 0, 
                        blockData.targetY || 0
                    ));
                    break;
            }
        }
    }
    
    /**
     * Строим секретные области
     */
    buildSecretAreas() {
        for (const areaData of this.secretAreasData) {
            const secretArea = new SecretArea(
                areaData.x,
                areaData.y,
                areaData.width,
                areaData.height,
                areaData.id,
                areaData.reward
            );
            this.secretAreas.push(secretArea);
        }
    }
    
    /**
     * Настройка переключателей и телепортов
     */
    setupSwitchesAndTeleports() {
        // Связываем переключатели с их целями
        for (const switchData of this.switchesData) {
            this.switches.set(switchData.id, {
                targets: switchData.targets || [],
                isActivated: false
            });
        }
        
        // Связываем телепорты
        for (const teleportData of this.teleportsData) {
            this.teleports.set(teleportData.id, teleportData);
        }
    }

    update(deltaTime) {
        this.updateCrumblingTiles(deltaTime);
        this.updateSecretWalls(deltaTime);
        this.updateSpecialBlocks(deltaTime);
        this.updateSecretAreas(deltaTime);
    }
    
    /**
     * Обновление разрушающихся тайлов
     */
    updateCrumblingTiles(deltaTime) {
        const tilesToRemove = [];
        for (const tile of this.tiles) {
            if (tile.type === this.tileTypes.CRUMBLING && tile.state === 'crumbling') {
                tile.crumbleTimer -= deltaTime;
                if (tile.crumbleTimer <= 0) {
                    tile.state = 'gone';
                    tilesToRemove.push(tile);
                }
            }
        }
        // Удаляем тайлы, которые полностью разрушились
        this.tiles = this.tiles.filter(tile => !tilesToRemove.includes(tile));
    }
    
    /**
     * Обновление секретных стен
     */
    updateSecretWalls(deltaTime) {
        // Будет обновлено при добавлении проверки позиции игрока
    }
    
    /**
     * Обновление специальных блоков
     */
    updateSpecialBlocks(deltaTime) {
        for (const block of this.specialBlocks) {
            block.update(deltaTime);
        }
    }
    
    /**
     * Обновление секретных областей
     */
    updateSecretAreas(deltaTime) {
        for (const area of this.secretAreas) {
            area.update(deltaTime);
        }
    }
    
    /**
     * Проверка взаимодействия игрока со специальными блоками
     */
    checkSpecialBlockInteractions(player) {
        for (const block of this.specialBlocks) {
            if (block.interact && block.interact(player)) {
                // Логика специфична для каждого типа блока
            }
        }
    }
    
    /**
     * Проверка секретных областей
     */
    checkSecretAreas(player) {
        const playerBounds = {
            x: player.position.x,
            y: player.position.y,
            width: player.width,
            height: player.height
        };
        
        for (const area of this.secretAreas) {
            area.checkDiscovery(playerBounds);
        }
    }
    
    /**
     * Активация переключателя
     */
    onSwitchActivated(switchId, targetIds, isActivated) {
        const switchInfo = this.switches.get(switchId);
        if (!switchInfo) return;
        
        switchInfo.isActivated = isActivated;
        
        // Активируем/деактивируем цели
        for (const targetId of targetIds) {
            if (isActivated) {
                this.activatedObjects.add(targetId);
            } else {
                this.activatedObjects.delete(targetId);
            }
            
            // Применяем эффекты к целям
            this.applyActivationToTarget(targetId, isActivated);
        }
    }
    
    /**
     * Применение активации к цели
     */
    applyActivationToTarget(targetId, isActivated) {
        // Находим цель среди различных объектов
        
        // Проверяем движущиеся платформы
        for (const platform of this.movingPlatforms) {
            if (platform.id === targetId) {
                platform.isActive = isActivated;
                break;
            }
        }
        
        // Проверяем падающие блоки
        for (const block of this.fallingBlocks) {
            if (block.id === targetId) {
                if (isActivated) {
                    block.startFalling();
                }
                break;
            }
        }
        
        // Проверяем специальные тайлы
        for (const tile of this.tiles) {
            if (tile.id === targetId) {
                if (tile.type === this.tileTypes.SECRET_WALL) {
                    tile.isVisible = !isActivated;
                }
                break;
            }
        }
    }

    // Добавляем метод для проверки тайла по координатам сетки
    getTileAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0; // За пределами уровня
        }
        const index = y * this.width + x;
        return this.tileData[index] || 0;
    }
    
    /**
     * Получение всех твердых тайлов (включая специальные блоки)
     */
    getSolidTiles() {
        return this.tiles.filter(tile => 
            tile.type === this.tileTypes.SOLID || 
            tile.type === this.tileTypes.CRUMBLING && tile.state === 'idle'
        );
    }
    
    /**
     * Получение специальных блоков определенного типа
     */
    getSpecialBlocksByType(type) {
        return this.specialBlocks.filter(block => block.type === type);
    }

    drawBackground(context, camera) {
        this.backgroundLayers.forEach((layer, index) => {
            const parallaxX = camera.position.x * layer.scrollFactor;
            const parallaxY = camera.position.y * layer.scrollFactor;
            
            context.fillStyle = layer.color;
            
            // Если есть изображение фона
            if (layer.image) {
                // Реализация для изображений фона с параллаксом
                const pattern = context.createPattern(layer.image, 'repeat');
                context.fillStyle = pattern;
                context.save();
                context.translate(-parallaxX, -parallaxY);
                context.fillRect(
                    camera.position.x, 
                    camera.position.y, 
                    camera.width, 
                    camera.height
                );
                context.restore();
            } else {
                // Простой цветной фон
                context.fillRect(0, 0, camera.width, camera.height);
            }
        });
    }

    drawWorld(context, camera) {
        // Оптимизация: рисуем только видимые элементы
        const margin = 64;
        const viewLeft = camera.position.x - margin;
        const viewRight = camera.position.x + camera.width + margin;
        const viewTop = camera.position.y - margin;
        const viewBottom = camera.position.y + camera.height + margin;
        
        // Рисуем основные тайлы
        this.drawBasicTiles(context, viewLeft, viewRight, viewTop, viewBottom);
        
        // Рисуем специальные блоки
        this.drawSpecialBlocks(context, camera, viewLeft, viewRight, viewTop, viewBottom);
        
        // Рисуем секретные области (только в debug режиме или если обнаружены)
        this.drawSecretAreas(context, camera);
    }
    
    /**
     * Отрисовка основных тайлов
     */
    drawBasicTiles(context, viewLeft, viewRight, viewTop, viewBottom) {
        this.tiles.forEach(tile => {
            // Проверяем видимость
            if (tile.x + tile.width < viewLeft || tile.x > viewRight ||
                tile.y + tile.height < viewTop || tile.y > viewBottom) {
                return;
            }
            
            // Пропускаем невидимые секретные стены
            if (tile.type === this.tileTypes.SECRET_WALL && !tile.isVisible) {
                return;
            }
            
            // Выбираем цвет в зависимости от типа
            switch (tile.type) {
                case this.tileTypes.SOLID:
                    context.fillStyle = '#808080';
                    break;
                    
                case this.tileTypes.CRUMBLING:
                    if (tile.state === 'idle') {
                        context.fillStyle = '#CD853F';
                    } else {
                        const alpha = Math.abs(Math.sin(tile.crumbleTimer * 0.01));
                        context.fillStyle = `rgba(205, 133, 63, ${alpha})`;
                    }
                    break;
                    
                case this.tileTypes.SECRET_WALL:
                    const opacity = tile.fadeTimer / 1000; // Плавное исчезновение
                    context.fillStyle = `rgba(139, 69, 19, ${opacity})`;
                    break;
                    
                default:
                    context.fillStyle = '#666666';
            }
            
            context.fillRect(tile.x, tile.y, tile.width, tile.height);
        });
    }
    
    /**
     * Отрисовка специальных блоков
     */
    drawSpecialBlocks(context, camera, viewLeft, viewRight, viewTop, viewBottom) {
        for (const block of this.specialBlocks) {
            // Проверяем видимость
            if (block.position.x + block.width < viewLeft || block.position.x > viewRight ||
                block.position.y + block.height < viewTop || block.position.y > viewBottom) {
                continue;
            }
            
            block.draw(context, camera);
        }
    }
    
    /**
     * Отрисовка секретных областей
     */
    drawSecretAreas(context, camera) {
        for (const area of this.secretAreas) {
            area.draw(context, camera);
        }
    }
    
    /**
     * Получение данных уровня для сериализации
     */
    serialize() {
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tileData: this.tileData,
            entities: this.entities,
            movingPlatforms: this.movingPlatforms,
            fallingBlocks: this.fallingBlocks,
            specialBlocks: this.specialBlocks.map(block => block.serialize()),
            secretAreas: this.secretAreas.map(area => area.serialize()),
            backgroundLayers: this.backgroundLayers,
            timeTrialTarget: this.timeTrialTarget,
            objectives: this.objectives
        };
    }
}
