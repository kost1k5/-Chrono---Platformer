// Улучшенный редактор уровней для Хроно-Платформера
class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('levelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.entityLayer = document.getElementById('entityLayer');
        
        this.level = this.createEmptyLevel();
        this.selectedTool = 'wall';
        this.selectedEntity = null;
        this.isDrawing = false;
        this.lastDrawPos = null;
        this.isPanning = false;
        this.lastPanPos = null;
        
        this.tileSize = 32;
        this.scale = 1;
        this.minScale = 0.25;
        this.maxScale = 3;
        this.camera = { x: 0, y: 0 };
        
        // Система отмены/повтора
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Настройки сетки и визуализации
        this.showGrid = true;
        this.showCoordinates = true;
        this.gridColor = 'rgba(255, 255, 255, 0.3)';
        
        // Улучшенная обработка ввода
        this.keys = new Set();
        
        this.initializeCanvas();
        this.bindEvents();
        this.bindKeyboardShortcuts();
        this.updateUI();
        this.saveState(); // Сохраняем начальное состояние
    }
    
    createEmptyLevel() {
        const width = 30;
        const height = 17;
        
        return {
            width: width,
            height: height,
            tileSize: 32,
            tileData: new Array(width * height).fill(0),
            entities: [],
            movingPlatforms: [],
            fallingBlocks: [],
            backgroundLayers: [
                { color: '#87CEEB', scrollFactor: 0.0 } // Дефолтный голубой фон
            ]
        };
    }
    
    initializeCanvas() {
        this.resizeCanvas();
        this.drawLevel();
    }
    
    resizeCanvas() {
        const containerWidth = window.innerWidth - 550;
        const containerHeight = window.innerHeight - 100;
        
        this.canvas.width = Math.max(800, containerWidth);
        this.canvas.height = Math.max(600, containerHeight);
        
        this.entityLayer.style.width = this.canvas.width + 'px';
        this.entityLayer.style.height = this.canvas.height + 'px';
        this.entityLayer.style.position = 'absolute';
        this.entityLayer.style.top = this.canvas.offsetTop + 'px';
        this.entityLayer.style.left = this.canvas.offsetLeft + 'px';
        
        this.ctx.imageSmoothingEnabled = false;
    }

    bindEvents() {
        // Выбор инструментов
        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelector('.tool-button.active')?.classList.remove('active');
                e.target.classList.add('active');
                this.selectedTool = e.target.dataset.tool;
                this.selectedEntity = null;
                this.updateEntityProperties();
            });
        });

        // События мыши на canvas
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Обновление размеров
        document.getElementById('levelWidth')?.addEventListener('change', this.updateLevelSize.bind(this));
        document.getElementById('levelHeight')?.addEventListener('change', this.updateLevelSize.bind(this));
        document.getElementById('tileSize')?.addEventListener('change', this.updateLevelSize.bind(this));

        // Загрузка файлов
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('fileDropZone');

        dropZone?.addEventListener('click', () => fileInput?.click());
        dropZone?.addEventListener('dragover', this.onDragOver.bind(this));
        dropZone?.addEventListener('dragleave', this.onDragLeave.bind(this));
        dropZone?.addEventListener('drop', this.onDrop.bind(this));

        fileInput?.addEventListener('change', this.onFileSelect.bind(this));
        
        // Дополнительные кнопки управления
        const gridToggle = document.getElementById('gridToggle');
        if (gridToggle) {
            gridToggle.addEventListener('change', (e) => {
                this.showGrid = e.target.checked;
                this.drawLevel();
            });
        }

        // Кнопки undo/redo
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());

        // Изменение размера окна
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawLevel();
        });
    }

    // Клавиатурные сокращения
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Предотвращаем обработку, если фокус на input элементах
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            this.keys.add(e.code);
            
            // Клавиатурные сокращения
            if (e.ctrlKey || e.metaKey) {
                switch (e.code) {
                    case 'KeyZ':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'KeyY':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'KeyS':
                        e.preventDefault();
                        this.saveLevel();
                        break;
                    case 'KeyO':
                        e.preventDefault();
                        this.loadLevel();
                        break;
                    case 'KeyN':
                        e.preventDefault();
                        this.newLevel();
                        break;
                }
            }
            
            // Инструменты по клавишам
            switch (e.code) {
                case 'KeyW':
                    this.selectTool('wall');
                    break;
                case 'KeyE':
                    this.selectTool('empty');
                    break;
                case 'KeyP':
                    this.selectTool('player');
                    break;
                case 'KeyG':
                    this.selectTool('goal');
                    break;
                case 'KeyR':
                    this.selectTool('enemy');
                    break;
                case 'KeyT':
                    this.selectTool('platform');
                    break;
                case 'KeyS':
                    if (!e.ctrlKey && !e.metaKey) {
                        this.selectTool('select');
                    }
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.selectedEntity) {
                        this.deleteEntity();
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
    }

    // Вспомогательный метод для выбора инструмента
    selectTool(toolName) {
        document.querySelector('.tool-button.active')?.classList.remove('active');
        const button = document.querySelector(`[data-tool="${toolName}"]`);
        if (button) {
            button.classList.add('active');
            this.selectedTool = toolName;
            this.selectedEntity = null;
            this.updateEntityProperties();
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / this.scale) + this.camera.x;
        const y = ((e.clientY - rect.top) / this.scale) + this.camera.y;
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        return { x, y, tileX, tileY };
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        
        // Правая кнопка мыши - панорамирование
        if (e.button === 2) {
            this.isPanning = true;
            this.lastPanPos = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        // Левая кнопка мыши
        if (e.button === 0) {
            this.isDrawing = true;
            this.lastDrawPos = pos;

            if (this.selectedTool === 'select') {
                this.selectEntity(pos);
            } else if (this.selectedTool === 'wall' || this.selectedTool === 'empty') {
                this.paintTile(pos);
            } else if (['player', 'enemy', 'goal'].includes(this.selectedTool)) {
                this.placeEntity(pos);
            } else if (this.selectedTool === 'platform') {
                this.placePlatform(pos);
            }

            this.updateUI();
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);

        // Панорамирование
        if (this.isPanning && this.lastPanPos) {
            const deltaX = (e.clientX - this.lastPanPos.x) / this.scale;
            const deltaY = (e.clientY - this.lastPanPos.y) / this.scale;
            
            this.camera.x -= deltaX;
            this.camera.y -= deltaY;
            
            this.lastPanPos = { x: e.clientX, y: e.clientY };
            this.drawLevel();
            return;
        }

        // Обновление координат
        if (this.showCoordinates) {
            const coordsElement = document.getElementById('coordinates');
            if (coordsElement) {
                coordsElement.textContent = 
                    `Мышь: (${Math.round(pos.x)}, ${Math.round(pos.y)}) | ` +
                    `Тайл: (${pos.tileX}, ${pos.tileY}) | ` +
                    `Пиксели: (${pos.tileX * this.tileSize}, ${pos.tileY * this.tileSize})`;
            }
        }

        // Рисование при зажатой кнопке
        if (this.isDrawing && (this.selectedTool === 'wall' || this.selectedTool === 'empty')) {
            this.paintTile(pos);
        }
    }

    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.lastPanPos = null;
            this.canvas.style.cursor = 'default';
        }
        
        this.isDrawing = false;
        this.lastDrawPos = null;
    }

    // Обработка колеса мыши для масштабирования
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Мировые координаты до масштабирования
        const worldX = (mouseX / this.scale) + this.camera.x;
        const worldY = (mouseY / this.scale) + this.camera.y;
        
        // Изменение масштаба
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * scaleFactor));
        
        if (newScale !== this.scale) {
            this.scale = newScale;
            
            // Корректировка камеры чтобы мышь оставалась на том же месте
            this.camera.x = worldX - (mouseX / this.scale);
            this.camera.y = worldY - (mouseY / this.scale);
            
            this.drawLevel();
        }
    }

    paintTile(pos) {
        if (pos.tileX >= 0 && pos.tileX < this.level.width && 
            pos.tileY >= 0 && pos.tileY < this.level.height) {
            
            const index = pos.tileY * this.level.width + pos.tileX;
            const value = this.selectedTool === 'wall' ? 1 : 0;
            
            if (this.level.tileData[index] !== value) {
                this.level.tileData[index] = value;
                this.drawLevel();
                this.updateStats();
                this.saveState(); // Сохраняем состояние для undo/redo
            }
        }
    }

    placeEntity(pos) {
        const pixelX = pos.tileX * this.tileSize;
        const pixelY = pos.tileY * this.tileSize;

        // Удаляем существующую сущность этого типа (для player и goal)
        if (this.selectedTool === 'player' || this.selectedTool === 'goal') {
            this.level.entities = this.level.entities.filter(e => e.type !== this.selectedTool);
        }

        const entity = {
            type: this.selectedTool,
            x: pixelX,
            y: pixelY
        };

        // Добавляем специфичные свойства для врагов
        if (this.selectedTool === 'enemy') {
            entity.moveRange = 80;
            entity.speed = 50;
        }

        this.level.entities.push(entity);
        this.drawEntities();
        this.updateStats();
        this.saveState(); // Сохраняем состояние для undo/redo
    }

    placePlatform(pos) {
        const pixelX = pos.tileX * this.tileSize;
        const pixelY = pos.tileY * this.tileSize;

        const platform = {
            x: pixelX,
            y: pixelY,
            width: 96,
            height: 16,
            endX: pixelX + 128,
            endY: pixelY,
            speed: 100
        };

        this.level.movingPlatforms.push(platform);
        this.drawEntities();
        this.updateStats();
        this.saveState(); // Сохраняем состояние для undo/redo
    }

    // Система undo/redo
    saveState() {
        // Удаляем все состояния после текущего индекса
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Добавляем новое состояние
        const state = JSON.parse(JSON.stringify(this.level));
        this.history.push(state);
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.level = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.drawLevel();
            this.updateStats();
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.level = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.drawLevel();
            this.updateStats();
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    selectEntity(pos) {
        // Поиск сущности под курсором
        const pixelX = pos.x;
        const pixelY = pos.y;

        for (let entity of this.level.entities) {
            const entityWidth = entity.type === 'player' ? 32 : 32;
            const entityHeight = entity.type === 'player' ? 50 : 32;

            if (pixelX >= entity.x && pixelX < entity.x + entityWidth &&
                pixelY >= entity.y && pixelY < entity.y + entityHeight) {
                this.selectedEntity = entity;
                this.updateEntityProperties();
                return;
            }
        }

        // Поиск платформы
        for (let platform of this.level.movingPlatforms) {
            if (pixelX >= platform.x && pixelX < platform.x + platform.width &&
                pixelY >= platform.y && pixelY < platform.y + platform.height) {
                this.selectedEntity = platform;
                this.updateEntityProperties();
                return;
            }
        }

        this.selectedEntity = null;
        this.updateEntityProperties();
    }

    drawLevel() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Применяем трансформацию камеры
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Фон
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(
            this.camera.x, 
            this.camera.y, 
            this.canvas.width / this.scale, 
            this.canvas.height / this.scale
        );

        // Сетка
        if (this.showGrid) {
            this.ctx.strokeStyle = this.gridColor;
            this.ctx.lineWidth = 1 / this.scale;

            const startX = Math.floor(this.camera.x / this.tileSize) * this.tileSize;
            const endX = this.camera.x + (this.canvas.width / this.scale);
            const startY = Math.floor(this.camera.y / this.tileSize) * this.tileSize;
            const endY = this.camera.y + (this.canvas.height / this.scale);

            for (let x = startX; x <= endX; x += this.tileSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, this.camera.y);
                this.ctx.lineTo(x, endY);
                this.ctx.stroke();
            }

            for (let y = startY; y <= endY; y += this.tileSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.camera.x, y);
                this.ctx.lineTo(endX, y);
                this.ctx.stroke();
            }
        }

        // Тайлы
        for (let y = 0; y < this.level.height; y++) {
            for (let x = 0; x < this.level.width; x++) {
                const index = y * this.level.width + x;
                const tile = this.level.tileData[index];

                if (tile === 1) {
                    const tileX = x * this.tileSize;
                    const tileY = y * this.tileSize;

                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);

                    this.ctx.strokeStyle = '#654321';
                    this.ctx.lineWidth = 1 / this.scale;
                    this.ctx.strokeRect(tileX, tileY, this.tileSize, this.tileSize);
                }
            }
        }

        this.ctx.restore();
        this.drawEntities();
    }

    drawEntities() {
        this.entityLayer.innerHTML = '';

        // Рисуем платформы
        this.level.movingPlatforms.forEach((platform, index) => {
            const div = document.createElement('div');
            div.className = 'platform-marker';
            div.style.left = ((platform.x - this.camera.x) * this.scale) + 'px';
            div.style.top = ((platform.y - this.camera.y) * this.scale) + 'px';
            div.style.width = (platform.width * this.scale) + 'px';
            div.style.height = (platform.height * this.scale) + 'px';
            div.style.backgroundColor = 'rgba(128, 128, 128, 0.8)';
            div.style.border = '2px solid #666';
            div.style.position = 'absolute';
            div.style.cursor = 'pointer';
            div.title = `Платформа ${index + 1}`;

            // Отображение линии движения
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.borderTop = '2px dashed #666';
            line.style.pointerEvents = 'none';

            const deltaX = platform.endX - platform.x;
            const deltaY = platform.endY - platform.y;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

            line.style.width = (length * this.scale) + 'px';
            line.style.left = ((platform.x - this.camera.x) * this.scale) + 'px';
            line.style.top = ((platform.y - this.camera.y + platform.height / 2) * this.scale) + 'px';
            line.style.transformOrigin = '0 0';
            line.style.transform = `rotate(${angle}deg)`;

            this.entityLayer.appendChild(line);
            this.entityLayer.appendChild(div);
        });

        // Рисуем сущности
        this.level.entities.forEach((entity, index) => {
            const div = document.createElement('div');
            div.className = 'entity-marker';
            div.style.left = ((entity.x - this.camera.x) * this.scale) + 'px';
            div.style.top = ((entity.y - this.camera.y) * this.scale) + 'px';
            div.style.position = 'absolute';
            div.style.cursor = 'pointer';
            div.title = `${entity.type} ${index + 1}`;

            switch (entity.type) {
                case 'player':
                    div.style.width = (32 * this.scale) + 'px';
                    div.style.height = (50 * this.scale) + 'px';
                    div.style.backgroundColor = 'rgba(0, 128, 255, 0.8)';
                    div.style.border = '2px solid #0060CC';
                    break;
                case 'enemy':
                    div.style.width = (32 * this.scale) + 'px';
                    div.style.height = (32 * this.scale) + 'px';
                    div.style.backgroundColor = 'rgba(255, 64, 64, 0.8)';
                    div.style.border = '2px solid #CC0000';
                    break;
                case 'goal':
                    div.style.width = (32 * this.scale) + 'px';
                    div.style.height = (32 * this.scale) + 'px';
                    div.style.backgroundColor = 'rgba(64, 255, 64, 0.8)';
                    div.style.border = '2px solid #00CC00';
                    break;
            }

            // Выделение выбранной сущности
            if (this.selectedEntity === entity) {
                div.style.boxShadow = '0 0 0 3px rgba(255, 255, 0, 0.8)';
            }

            this.entityLayer.appendChild(div);
        });
    }

    updateEntityProperties() {
        const panel = document.getElementById('entityProperties');
        if (!panel) return;

        if (!this.selectedEntity) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';

        // Определяем тип выбранной сущности
        if (this.selectedEntity.x !== undefined && this.selectedEntity.type) {
            // Это обычная сущность
            panel.innerHTML = `
                <h4>Свойства: ${this.selectedEntity.type}</h4>
                <div class="form-group">
                    <label>X:</label>
                    <input type="number" id="entityX" value="${this.selectedEntity.x}" step="32">
                </div>
                <div class="form-group">
                    <label>Y:</label>
                    <input type="number" id="entityY" value="${this.selectedEntity.y}" step="32">
                </div>
                ${this.selectedEntity.type === 'enemy' ? `
                    <div class="form-group">
                        <label>Скорость:</label>
                        <input type="number" id="entitySpeed" value="${this.selectedEntity.speed || 50}" min="10" max="300">
                    </div>
                    <div class="form-group">
                        <label>Дальность движения:</label>
                        <input type="number" id="entityMoveRange" value="${this.selectedEntity.moveRange || 80}" min="32" max="500" step="32">
                    </div>
                ` : ''}
                <button onclick="editor.updateEntityFromForm()">Применить</button>
                <button onclick="editor.deleteEntity()" class="danger">Удалить</button>
            `;
        } else if (this.selectedEntity.width !== undefined) {
            // Это платформа
            panel.innerHTML = `
                <h4>Свойства: Платформа</h4>
                <div class="form-group">
                    <label>Начальная X:</label>
                    <input type="number" id="platformX" value="${this.selectedEntity.x}" step="32">
                </div>
                <div class="form-group">
                    <label>Начальная Y:</label>
                    <input type="number" id="platformY" value="${this.selectedEntity.y}" step="16">
                </div>
                <div class="form-group">
                    <label>Конечная X:</label>
                    <input type="number" id="platformEndX" value="${this.selectedEntity.endX}" step="32">
                </div>
                <div class="form-group">
                    <label>Конечная Y:</label>
                    <input type="number" id="platformEndY" value="${this.selectedEntity.endY}" step="16">
                </div>
                <div class="form-group">
                    <label>Ширина:</label>
                    <input type="number" id="platformWidth" value="${this.selectedEntity.width}" min="32" max="256" step="16">
                </div>
                <div class="form-group">
                    <label>Высота:</label>
                    <input type="number" id="platformHeight" value="${this.selectedEntity.height}" min="8" max="64" step="8">
                </div>
                <div class="form-group">
                    <label>Скорость:</label>
                    <input type="number" id="platformSpeed" value="${this.selectedEntity.speed}" min="10" max="500">
                </div>
                <button onclick="editor.updateEntityFromForm()">Применить</button>
                <button onclick="editor.deleteEntity()" class="danger">Удалить</button>
            `;
        }
    }

    updateEntityFromForm() {
        if (!this.selectedEntity) return;

        if (this.selectedEntity.type) {
            // Обычная сущность
            this.selectedEntity.x = parseInt(document.getElementById('entityX').value);
            this.selectedEntity.y = parseInt(document.getElementById('entityY').value);

            if (this.selectedEntity.type === 'enemy') {
                this.selectedEntity.speed = parseInt(document.getElementById('entitySpeed').value);
                this.selectedEntity.moveRange = parseInt(document.getElementById('entityMoveRange').value);
            }
        } else if (this.selectedEntity.width !== undefined) {
            // Платформа
            this.selectedEntity.x = parseInt(document.getElementById('platformX').value);
            this.selectedEntity.y = parseInt(document.getElementById('platformY').value);
            this.selectedEntity.endX = parseInt(document.getElementById('platformEndX').value);
            this.selectedEntity.endY = parseInt(document.getElementById('platformEndY').value);
            this.selectedEntity.width = parseInt(document.getElementById('platformWidth').value);
            this.selectedEntity.height = parseInt(document.getElementById('platformHeight').value);
            this.selectedEntity.speed = parseInt(document.getElementById('platformSpeed').value);
        }

        this.drawLevel();
        this.saveState();
    }

    deleteEntity() {
        if (!this.selectedEntity) return;

        if (this.selectedEntity.type) {
            // Удаляем обычную сущность
            this.level.entities = this.level.entities.filter(e => e !== this.selectedEntity);
        } else if (this.selectedEntity.width !== undefined) {
            // Удаляем платформу
            this.level.movingPlatforms = this.level.movingPlatforms.filter(p => p !== this.selectedEntity);
        }

        this.selectedEntity = null;
        this.updateEntityProperties();
        this.drawLevel();
        this.updateStats();
        this.saveState();
    }

    updateLevelSize() {
        const newWidth = parseInt(document.getElementById('levelWidth').value);
        const newHeight = parseInt(document.getElementById('levelHeight').value);
        const newTileSize = parseInt(document.getElementById('tileSize').value);

        if (newWidth > 0 && newHeight > 0 && newTileSize > 0) {
            const oldWidth = this.level.width;
            const oldHeight = this.level.height;
            const newTileData = new Array(newWidth * newHeight).fill(0);

            // Копируем существующие данные
            for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
                for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
                    const oldIndex = y * oldWidth + x;
                    const newIndex = y * newWidth + x;
                    newTileData[newIndex] = this.level.tileData[oldIndex];
                }
            }

            this.level.width = newWidth;
            this.level.height = newHeight;
            this.level.tileSize = newTileSize;
            this.level.tileData = newTileData;
            this.tileSize = newTileSize;

            this.drawLevel();
            this.updateStats();
            this.saveState();
        }
    }

    updateStats() {
        const stats = document.getElementById('levelStats');
        if (stats) {
            const wallCount = this.level.tileData.filter(tile => tile === 1).length;
            const entityCount = this.level.entities.length;
            const platformCount = this.level.movingPlatforms.length;

            stats.innerHTML = `
                <div>Размер: ${this.level.width}×${this.level.height}</div>
                <div>Стены: ${wallCount}</div>
                <div>Сущности: ${entityCount}</div>
                <div>Платформы: ${platformCount}</div>
                <div>Масштаб: ${Math.round(this.scale * 100)}%</div>
            `;
        }
    }

    updateUI() {
        this.updateStats();
        this.updateEntityProperties();
        this.updateUndoRedoButtons();
    }

    // Файловые операции
    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    onDragLeave(e) {
        e.preventDefault();
    }

    onDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadFile(files[0]);
        }
    }

    onFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.loadFile(files[0]);
        }
    }

    loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const levelData = JSON.parse(e.target.result);
                
                // Обеспечиваем наличие фона если его нет
                if (!levelData.backgroundLayers) {
                    levelData.backgroundLayers = [
                        { color: '#87CEEB', scrollFactor: 0.0 }
                    ];
                }
                
                this.level = levelData;
                this.drawLevel();
                this.updateUI();
                this.saveState();
                console.log('Уровень успешно загружен');
            } catch (error) {
                alert('Ошибка при загрузке файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Методы для глобальных функций
    newLevel() {
        if (confirm('Создать новый уровень? Все несохраненные изменения будут потеряны.')) {
            this.level = this.createEmptyLevel();
            this.selectedEntity = null;
            this.history = [];
            this.historyIndex = -1;
            this.camera = { x: 0, y: 0 };
            this.scale = 1;
            this.drawLevel();
            this.updateUI();
            this.saveState();
        }
    }

    async saveLevel() {
        // Для GitHub Pages всегда используем скачивание файла
        const levelName = this.promptForLevelName();
        if (!levelName) return; // Пользователь отменил
        
        this.downloadLevelFile(levelName);
    }
    
    promptForLevelName() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d3142;
            color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 10000;
            min-width: 300px;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4cc9f0;">💾 Сохранить уровень</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #bfc0c0;">
                Введите имя файла уровня:
            </p>
            <input type="text" id="levelNameInput" placeholder="level1" 
                   style="width: 100%; padding: 8px; margin: 5px 0; 
                          border: 1px solid #4cc9f0; border-radius: 4px; 
                          background: #1a1d29; color: #ffffff; font-size: 14px;"
                   value="">
            <p style="margin: 5px 0 15px 0; font-size: 12px; color: #8d99ae;">
                .json будет добавлено автоматически
            </p>
            <div style="text-align: right;">
                <button id="cancelBtn" style="margin-right: 10px; padding: 6px 15px; 
                                             background: #ef476f; color: white; 
                                             border: none; border-radius: 4px; cursor: pointer;">
                    Отмена
                </button>
                <button id="saveBtn" style="padding: 6px 15px; background: #06d6a0; 
                                           color: white; border: none; border-radius: 4px; 
                                           cursor: pointer;">
                    💾 Сохранить
                </button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const input = dialog.querySelector('#levelNameInput');
        const saveBtn = dialog.querySelector('#saveBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        
        // Генерируем предложение имени уровня
        const suggestedName = this.generateLevelName();
        input.value = suggestedName;
        input.select();
        
        return new Promise((resolve) => {
            const cleanup = () => {
                document.body.removeChild(dialog);
            };
            
            saveBtn.onclick = () => {
                const name = input.value.trim();
                if (name) {
                    cleanup();
                    resolve(name);
                } else {
                    alert('Введите имя уровня!');
                    input.focus();
                }
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };
            
            input.onkeydown = (e) => {
                if (e.key === 'Enter') saveBtn.click();
                if (e.key === 'Escape') cancelBtn.click();
            };
            
            input.focus();
        });
    }
    
    generateLevelName() {
        // Пытаемся найти свободное имя уровня
        const baseName = 'level';
        for (let i = 1; i <= 100; i++) {
            const name = `${baseName}${i}`;
            // В будущем можно проверять существующие файлы через API
            return name; // Пока возвращаем первое найденное
        }
        return 'custom_level';
    }
    
    downloadLevelFile(levelName) {
        // Fallback функция для скачивания файла
        const dataStr = JSON.stringify(this.level, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = levelName.endsWith('.json') ? levelName : `${levelName}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    testLevel() {
        // Простая валидация
        const hasPlayer = this.level.entities.some(e => e.type === 'player');
        const hasGoal = this.level.entities.some(e => e.type === 'goal');

        if (!hasPlayer) {
            alert('Ошибка: На уровне должен быть игрок!');
            return;
        }

        if (!hasGoal) {
            alert('Ошибка: На уровне должна быть цель!');
            return;
        }

        // Сохраняем во временный файл и открываем игру
        const dataStr = JSON.stringify(this.level, null, 2);
        localStorage.setItem('testLevel', dataStr);

        // Открываем игру в новой вкладке с дополнительными параметрами
        const gameUrl = './index.html?testLevel=true&timestamp=' + Date.now();
        const newWindow = window.open(gameUrl, '_blank');
        
        if (!newWindow) {
            alert('Не удалось открыть окно с игрой. Проверьте настройки блокировки всплывающих окон.');
        }
    }

    exportLevel() {
        const dataStr = JSON.stringify(this.level, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        return url;
    }
}

// Глобальные функции для кнопок
let editor;

window.onload = function() {
    editor = new LevelEditor();
};

function newLevel() {
    editor?.newLevel();
}

async function loadLevel() {
    try {
        // Загружаем статический список уровней для GitHub Pages
        const response = await fetch('./assets/levels/levels_list.json');
        const result = await response.json();
        
        if (result.levels && result.levels.length > 0) {
            // Показываем диалог выбора уровня
            showLevelSelectDialog(result.levels);
        } else {
            // Fallback к загрузке файла с компьютера
            loadLevelFromFile();
        }
    } catch (error) {
        console.warn('Не удалось загрузить список уровней:', error);
        // Fallback к загрузке файла с компьютера
        loadLevelFromFile();
    }
}

function loadLevelFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            editor.loadFile(e.target.files[0]);
        }
    };
    input.click();
}

function showLevelSelectDialog(levels) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2d3142;
        color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        z-index: 10000;
        min-width: 400px;
        max-width: 600px;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    const levelsList = levels.map(level => 
        `<div style="padding: 8px; margin: 5px 0; background: #1a1d29; 
                     border-radius: 4px; cursor: pointer; border: 2px solid transparent;
                     transition: all 0.2s;" 
              onmouseover="this.style.borderColor='#4cc9f0'" 
              onmouseout="this.style.borderColor='transparent'"
              onclick="loadLevelFromServer('${level.name}'); closeDialog();">
            <strong>${level.title || level.name}</strong>
            <small style="color: #8d99ae; display: block;">
                ${level.description || 'Пользовательский уровень'}
            </small>
        </div>`
    ).join('');
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #4cc9f0;">📂 Загрузить уровень</h3>
        <div style="max-height: 300px; overflow-y: auto; margin: 10px 0;">
            ${levelsList}
        </div>
        <div style="text-align: right; margin-top: 15px; border-top: 1px solid #4cc9f0; padding-top: 15px;">
            <button onclick="loadLevelFromFile(); closeDialog();" 
                    style="margin-right: 10px; padding: 6px 15px; 
                           background: #8d99ae; color: white; 
                           border: none; border-radius: 4px; cursor: pointer;">
                📁 Из файла
            </button>
            <button onclick="closeDialog();" 
                    style="padding: 6px 15px; background: #ef476f; 
                           color: white; border: none; border-radius: 4px; 
                           cursor: pointer;">
                Отмена
            </button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Добавляем глобальные функции для обработки кликов
    window.closeDialog = () => {
        document.body.removeChild(dialog);
        delete window.closeDialog;
        delete window.loadLevelFromServer;
    };
    
    window.loadLevelFromServer = (filename) => {
        loadLevelFile(filename);
    };
}

function loadSelectedLevel() {
    const select = document.getElementById('levelSelect');
    const filename = select.value;
    if (filename) {
        loadLevelFile(filename);
    }
}

function loadLevelFile(filename) {
    fetch(`./assets/levels/${filename}`)
        .then(response => response.json())
        .then(data => {
            // Обеспечиваем наличие фона если его нет
            if (!data.backgroundLayers) {
                data.backgroundLayers = [
                    { color: '#87CEEB', scrollFactor: 0.0 }
                ];
            }
            
            editor.level = data;
            editor.drawLevel();
            editor.updateUI();
            editor.saveState();
        })
        .catch(error => {
            alert('Ошибка загрузки уровня: ' + error.message);
        });
}

function loadCustomLevel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            editor.loadFile(e.target.files[0]);
        }
    };
    input.click();
}

function saveLevel() {
    editor?.saveLevel();
}

function exportLevel() {
    return editor?.exportLevel();
}

function testLevel() {
    editor?.testLevel();
}

function resizeLevel() {
    editor?.updateLevelSize();
}

function clearLevel() {
    if (confirm('Очистить весь уровень?')) {
        editor.level.tileData.fill(0);
        editor.level.entities = [];
        editor.level.movingPlatforms = [];
        editor.level.fallingBlocks = [];
        editor.selectedEntity = null;
        editor.updateEntityProperties();
        editor.drawLevel();
        editor.updateStats();
        editor.saveState();
    }
}

function addBorders() {
    // Добавляем границы по краям
    for (let x = 0; x < editor.level.width; x++) {
        editor.level.tileData[0 * editor.level.width + x] = 1; // Верх
        editor.level.tileData[(editor.level.height - 1) * editor.level.width + x] = 1; // Низ
    }
    
    for (let y = 0; y < editor.level.height; y++) {
        editor.level.tileData[y * editor.level.width + 0] = 1; // Лево
        editor.level.tileData[y * editor.level.width + (editor.level.width - 1)] = 1; // Право
    }
    
    editor.drawLevel();
    editor.updateStats();
    editor.saveState();
}

function fillBottom() {
    // Заполняем нижние 2 строки
    for (let y = editor.level.height - 2; y < editor.level.height; y++) {
        for (let x = 0; x < editor.level.width; x++) {
            editor.level.tileData[y * editor.level.width + x] = 1;
        }
    }
    
    editor.drawLevel();
    editor.updateStats();
    editor.saveState();
}

function deleteSelected() {
    if (editor.selectedEntity) {
        editor.deleteEntity();
    } else {
        alert('Сначала выберите объект для удаления');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}