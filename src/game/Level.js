import { Logger } from '../utils/Logger.js';

export class Level {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.tileSize = 0;
        this.tileData = [];
        this.entities = [];
        this.tiles = []; // Массив для хранения ОБЪЕКТОВ тайлов
        this.backgroundLayers = [];
    }

    async load(levelUrl) {
        const response = await fetch(levelUrl);
        const data = await response.json();

        this.width = data.width;
        this.height = data.height;
        this.tileSize = data.tileSize;
        this.tileData = data.tileData;
        this.entities = data.entities || [];
        this.movingPlatforms = data.movingPlatforms || [];
        this.fallingBlocks = data.fallingBlocks || [];
        this.backgroundLayers = data.backgroundLayers || [
            { color: '#87CEEB', scrollFactor: 0.0 } // Дефолтный голубой фон
        ];

        this.buildLevel();
        return data; // Возвращаем весь объект данных уровня
    }

    async loadFromData(data) {
        this.width = data.width;
        this.height = data.height;
        this.tileSize = data.tileSize;
        this.tileData = data.tileData;
        this.entities = data.entities || [];
        this.movingPlatforms = data.movingPlatforms || [];
        this.fallingBlocks = data.fallingBlocks || [];
        this.backgroundLayers = data.backgroundLayers || [
            { color: '#87CEEB', scrollFactor: 0.0 } // Дефолтный голубой фон
        ];

        this.buildLevel();
        return data; // Возвращаем весь объект данных уровня
    }

    buildLevel() {
        this.tiles = []; // Очищаем тайлы перед перестройкой
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const tileType = this.tileData[row * this.width + col];
                if (tileType === 0) continue; // Пропускаем пустые тайлы

                const tile = {
                    x: col * this.tileSize,
                    y: row * this.tileSize,
                    width: this.tileSize,
                    height: this.tileSize,
                    type: tileType
                };
                
                // Отладка для блоков в области спавна персонажа
                if (col >= 2 && col <= 4 && row >= 11 && row <= 13) {
                    console.log(`Блок [${col},${row}]: x=${tile.x}, y=${tile.y}, тип=${tileType}, размер=${this.tileSize}x${this.tileSize}`);
                }

                if (tileType === 2) { // 2 = разрушающийся блок
                    tile.state = 'idle'; // 'idle', 'crumbling', 'gone'
                    tile.crumbleTimer = 500; // 0.5 секунды до разрушения
                }

                this.tiles.push(tile);
            }
        }
        Logger.info(`Level built with ${this.tiles.length} solid tiles.`);

        // Создаем процедурные фоны для параллакса
        this.backgroundLayers = [
            { color: '#2c3e50', scrollFactor: 0.2 },
            { color: '#34495e', scrollFactor: 0.4 },
        ];
    }

    update(deltaTime) {
        const tilesToRemove = [];
        for (const tile of this.tiles) {
            if (tile.type === 2 && tile.state === 'crumbling') {
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

    // Добавляем метод для проверки тайла по координатам сетки
    getTileAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0; // За пределами уровня
        }
        const index = y * this.width + x;
        return this.tileData[index] || 0;
    }

    drawBackground(context, camera) {
        this.backgroundLayers.forEach(layer => {
            context.fillStyle = layer.color;
            // Фон должен заполнять весь экран в экранных координатах
            // Поскольку этот метод вызывается ДО применения трансформации камеры,
            // мы рисуем на весь размер canvas
            context.fillRect(0, 0, camera.width, camera.height);
        });
    }

    drawWorld(context, camera) {
        // Оптимизация: рисуем только видимые тайлы
        const margin = 64; // Небольшой отступ для плавности
        const viewLeft = camera ? camera.position.x - margin : -margin;
        const viewRight = camera ? camera.position.x + camera.width + margin : this.pixelWidth + margin;
        const viewTop = camera ? camera.position.y - margin : -margin;
        const viewBottom = camera ? camera.position.y + camera.height + margin : this.pixelHeight + margin;
        
        this.tiles.forEach(tile => {
            // Проверяем, находится ли тайл в видимой области
            if (tile.x + tile.width < viewLeft || tile.x > viewRight ||
                tile.y + tile.height < viewTop || tile.y > viewBottom) {
                return; // Пропускаем невидимые тайлы
            }
            
            if (tile.type === 1) {
                context.fillStyle = '#808080'; // Сплошной блок
            } else if (tile.type === 2) {
                if (tile.state === 'idle') {
                    context.fillStyle = '#CD853F'; // Перуанский
                } else {
                    // Делаем блок "мерцающим" при разрушении
                    const alpha = Math.abs(Math.sin(tile.crumbleTimer * 0.1));
                    context.fillStyle = `rgba(205, 133, 63, ${alpha})`;
                }
            }
            context.fillRect(tile.x, tile.y, tile.width, tile.height);
        });
    }
}
