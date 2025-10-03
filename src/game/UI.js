export class UI {
    constructor(game) {
        this.game = game;
        this.fontSize = 24;
        this.fontFamily = '"Source Sans Pro", sans-serif';
        
        // Улучшенное определение сенсорного устройства
        this.isTouchDevice = 'ontouchstart' in window || 
                            navigator.maxTouchPoints > 0 || 
                            navigator.msMaxTouchPoints > 0;

        // Простые кнопки с адаптивными координатами - будут обновляться динамически
        this.menuButtons = {};
        this.updateMenuButtons(); // Первоначальная инициализация
        
        this.settingsElements = {
            volumeSlider: { x: this.game.width / 2 - 100, y: this.game.height / 2, width: 200, height: 20 },
            backButton: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 70, width: 200, height: 50, text: 'Назад', action: () => { this.game.gameState = 'mainMenu'; } }
        };

        this.touchControls = {
            left: { x: 30, y: this.game.height - 120, width: 100, height: 100, key: 'ArrowLeft' },
            right: { x: 150, y: this.game.height - 120, width: 100, height: 100, key: 'ArrowRight' },
            slow: { x: this.game.width - 260, y: this.game.height - 120, width: 100, height: 100, key: 'ShiftLeft' },
            jump: { x: this.game.width - 140, y: this.game.height - 120, width: 100, height: 100, key: 'Space' }
        };

        // Настройки экрана выбора уровней (адаптивно)
        this.levelSelectConfig = {
            levelsPerRow: this.isTouchDevice ? 6 : 8,  // Меньше уровней на мобильных
            levelCardWidth: this.isTouchDevice ? 140 : 120,  // Больше карточки на мобильных
            levelCardHeight: this.isTouchDevice ? 100 : 80,
            cardSpacing: 20,
            startX: this.isTouchDevice ? 80 : 140,
            startY: 120,
            scrollOffset: 0
        };

        this.levelSelectButtons = {
            back: { x: 50, y: 50, width: 100, height: 40, text: '⬅ Назад', action: () => { this.game.gameState = 'mainMenu'; } }
        };

        // Кнопки меню паузы
        this.pauseButtons = {
            resume: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 20, width: 200, height: 40, text: 'Продолжить', action: () => { this.game.gameState = 'playing'; } },
            levelSelect: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 70, width: 200, height: 40, text: 'Выбор уровня', action: () => { this.game.gameState = 'levelSelect'; } },
            mainMenu: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 120, width: 200, height: 40, text: 'Главное меню', action: () => { this.game.gameState = 'mainMenu'; } }
        };
    }

    updateMenuButtons() {
        // Пересчитываем координаты кнопок меню
        const buttonWidth = this.isTouchDevice ? 250 : 200;  // Шире на мобильных
        const buttonHeight = this.isTouchDevice ? 45 : 35;   // Выше на мобильных
        const startY = this.isTouchDevice ? 280 : 300;       // Чуть выше на мобильных
        const spacing = this.isTouchDevice ? 50 : 40;        // Больше отступ на мобильных
        
        this.menuButtons = {
            levelSelect: { 
                x: this.game.width / 2 - buttonWidth / 2, y: startY, 
                width: buttonWidth, height: buttonHeight, 
                text: '🎯 Выбрать уровень'
            },
            quickStart: { 
                x: this.game.width / 2 - buttonWidth / 2, y: startY + spacing, 
                width: buttonWidth, height: buttonHeight, 
                text: '⚡ Быстрый старт'
            },
            levelEditor: { 
                x: this.game.width / 2 - buttonWidth / 2, y: startY + spacing * 2, 
                width: buttonWidth, height: buttonHeight, 
                text: '🎮 Редактор v2.0'
            },
            saveProgress: { 
                x: this.game.width / 2 - buttonWidth / 2, y: startY + spacing * 3, 
                width: buttonWidth, height: buttonHeight, 
                text: '💾 Сохранить прогресс'
            },
            settings: { 
                x: this.game.width / 2 - buttonWidth / 2, y: startY + spacing * 4, 
                width: buttonWidth, height: buttonHeight, 
                text: '⚙️ Настройки'
            }
        };
    }

    // Преобразует внутренние координаты canvas в экранные координаты
    canvasToScreenCoords(canvasX, canvasY) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        // Простое линейное преобразование
        const screenX = (canvasX / this.game.width) * rect.width;
        const screenY = (canvasY / this.game.height) * rect.height;
        
        return { x: screenX, y: screenY };
    }

    // Преобразует экранные координаты в координаты canvas
    screenToCanvasCoords(screenX, screenY) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        // Простое обратное преобразование
        const canvasX = (screenX / rect.width) * this.game.width;
        const canvasY = (screenY / rect.height) * this.game.height;
        
        return { x: canvasX, y: canvasY };
    }

    isReady() {
        return true;
    }

    handleMouseClick(x, y) {
        // x, y - это экранные координаты касания, преобразуем их в координаты canvas
        const canvasCoords = this.screenToCanvasCoords(x, y);
        const canvasX = canvasCoords.x;
        const canvasY = canvasCoords.y;
        
        if (this.game.gameState === 'mainMenu') {
            // Теперь сравниваем с координатами кнопок в canvas
            for (const key in this.menuButtons) {
                const button = this.menuButtons[key];
                
                if (canvasX >= button.x && canvasX <= button.x + button.width && 
                    canvasY >= button.y && canvasY <= button.y + button.height) {
                    
                    switch(key) {
                        case 'levelSelect':
                            this.game.gameState = 'levelSelect';
                            break;
                        case 'quickStart':
                            this.game.startNewGame();
                            break;
                        case 'levelEditor':
                            window.open('./level_editor.html', '_blank');
                            break;
                        case 'saveProgress':
                            this.saveProgressAction();
                            break;
                        case 'settings':
                            this.game.gameState = 'settings';
                            break;
                    }
                    return;
                }
            }
        } else if (this.game.gameState === 'levelSelect') {
            // Кнопка "Назад" в выборе уровней - используем координаты canvas
            if (canvasX >= 50 && canvasX <= 150 && canvasY >= 50 && canvasY <= 90) {
                this.game.gameState = 'mainMenu';
                return;
            }

            this.handleLevelCardClick(canvasX, canvasY);
        } else if (this.game.gameState === 'paused') {
           
            for (const key in this.pauseButtons) {
                const button = this.pauseButtons[key];
                if (canvasX >= button.x && canvasX <= button.x + button.width && canvasY >= button.y && canvasY <= button.y + button.height) {
                    button.action();
                    return;
                }
            }
        } else if (this.game.gameState === 'settings') {
            // Кнопка "Назад" в настройках - используем координаты canvas
            if (canvasX >= 540 && canvasX <= 740 && canvasY >= 430 && canvasY <= 480) {
                this.game.gameState = 'mainMenu';
                return;
            }

            const slider = this.settingsElements.volumeSlider;
            if (canvasX >= slider.x && canvasX <= slider.x + slider.width && canvasY >= slider.y && canvasY <= slider.y + slider.height) {
                const newVolume = (canvasX - slider.x) / slider.width;
                this.game.audioManager.setVolume(Math.max(0, Math.min(1, newVolume)));
                return;
            }
        }
    }

    async saveProgressAction() {
        try {
            this.showNotification('Сохранение...', 'info');
            const success = await this.game.saveProgress();
            
            if (success) {
                const saveLocation = this.game.saveManager ? 'в облако' : 'локально';
                this.showNotification(`Прогресс сохранен ${saveLocation}!`, 'success');
            } else {
                this.showNotification('Ошибка сохранения!', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка сохранения!', 'error');
        }
    }

    draw(context) {
        context.save();

        if (this.game.gameState === 'mainMenu') {
            this.drawMainMenu(context);
        } else if (this.game.gameState === 'levelSelect') {
            this.drawLevelSelect(context);
        } else if (this.game.gameState === 'settings') {
            this.drawSettingsMenu(context);
        } else if (this.game.gameState === 'paused') {
            this.drawPauseMenu(context);
        } else if (this.game.gameState === 'gameOver') {
            this.drawGameOver(context);
        } else if (this.game.gameState === 'enteringName') {
            this.drawNameInput(context);
        } else if (this.game.gameState === 'gameWon') {
            this.drawGameWon(context);
        }

        if (this.game.gameState === 'playing') {
            this.drawHUD(context);
            if (this.isTouchDevice) this.drawMobileControls(context);
        }

        if (this.game.showLeaderboard) {
            this.drawLeaderboard(context);
        }

        // Отрисовка уведомлений поверх всего
        this.drawNotification(context);

        context.restore();
    }

    drawHUD(context) {
        // Фон для счета
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(10, 5, 150, 30);
        
        // Счет - более крупный и заметный
        context.fillStyle = 'white';
        context.font = `${this.fontSize + 4}px ${this.fontFamily}`;
        context.textAlign = 'left';
        context.fillText(`Счет: ${this.game.score}`, 20, 30);
        
        // Рекорд
        context.font = `${this.fontSize}px ${this.fontFamily}`;
        context.textAlign = 'right';
        context.fillText(`Рекорд: ${this.game.highScore}`, this.game.width - 20, 30);

        // Отображение статуса звука (Mute)
        context.textAlign = 'center';
        const soundStatus = this.game.audioManager.isMuted ? 'Выкл' : 'Вкл';
        context.fillText(`Звук (M): ${soundStatus}`, this.game.width / 2, 30);

        // Индикатор замедления времени
        if (this.game.timeManager.isSlowed) {
            context.fillStyle = 'cyan';
            context.fillText('Slow Motion', this.game.width / 2, 60);
        }
        // Индикатор ключа
        if (this.game.player && this.game.player.hasKey) {
            context.fillStyle = 'gold';
            context.textAlign = 'left';
            context.fillText('🗝️ Ключ', 20, 60);
        }
    }

    drawMainMenu(context) {
        // Обновляем координаты кнопок перед отрисовкой
        this.updateMenuButtons();
        
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);

        context.font = `50px ${this.fontFamily}`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('Хроно-Платформер', this.game.width / 2, this.game.height / 2 - 100);

        // Отображение прогресса игрока (сокращенно)
        if (this.game.playerProgress) {
            context.fillStyle = 'rgba(255, 255, 255, 0.6)';
            context.font = `14px ${this.fontFamily}`;
            context.textAlign = 'right';
            
            const progressX = this.game.width - 20;
            const progressY = 30;
            
            context.fillText(`Уровней: ${this.game.playerProgress.unlockedLevels?.length || 0}/${this.game.levelsList?.length || 0}`, progressX, progressY);
            context.fillText(`Счет: ${this.game.playerProgress.totalScore || 0}`, progressX, progressY + 20);
        }

        context.font = `20px ${this.fontFamily}`;
        context.textAlign = 'center';
        for (const key in this.menuButtons) {
            const button = this.menuButtons[key];
            this.drawButton(context, button);
        }

        // Инструкции по управлению
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = `18px ${this.fontFamily}`;
        context.textAlign = 'center';
        context.fillText('Управление: ← → (движение), Пробел (прыжок), Shift (время), M (звук)', this.game.width / 2, this.game.height - 50);
    }

    drawLevelSelect(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, this.game.width, this.game.height);

        // Заголовок
        context.fillStyle = 'white';
        context.font = `36px ${this.fontFamily}`;
        context.textAlign = 'center';
        context.fillText('Выбор уровня', this.game.width / 2, 60);

        // Кнопка "Назад"
        this.drawButton(context, this.levelSelectButtons.back);

        // Информация о прогрессе
        if (this.game.playerProgress) {
            context.fillStyle = 'rgba(255, 255, 255, 0.8)';
            context.font = `16px ${this.fontFamily}`;
            context.textAlign = 'right';
            context.fillText(`Открыто: ${this.game.playerProgress.unlockedLevels?.length || 0} | Пройдено: ${this.game.playerProgress.completedLevels?.length || 0}`, this.game.width - 50, 70);
        }

        // Отрисовка карточек уровней
        this.drawLevelCards(context);

        // Инструкции по управлению
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = `14px ${this.fontFamily}`;
        context.textAlign = 'center';
        context.fillText('Используйте колесо мыши или стрелки ↑↓ для прокрутки. Escape - назад.', this.game.width / 2, this.game.height - 30);
    }

    drawLevelCards(context) {
        if (!this.game.levelsList) {
            // Отладочная информация если список уровней не загружен
            context.fillStyle = 'white';
            context.font = `20px ${this.fontFamily}`;
            context.textAlign = 'center';
            context.fillText('Загрузка списка уровней...', this.game.width / 2, this.game.height / 2);
            return;
        }

        const config = this.levelSelectConfig;
        const totalLevels = this.game.levelsList.length;

        if (totalLevels === 0) {
            context.fillStyle = 'white';
            context.font = `20px ${this.fontFamily}`;
            context.textAlign = 'center';
            context.fillText('Нет доступных уровней', this.game.width / 2, this.game.height / 2);
            return;
        }

        for (let i = 0; i < totalLevels; i++) {
            const levelInfo = this.game.levelsList[i];
            const isUnlocked = this.game.isLevelUnlocked(i);
            const isCompleted = this.game.playerProgress?.completedLevels?.includes(i) || false;
            const isCurrent = this.game.currentLevelIndex === i;
            const bestTime = this.game.playerProgress?.bestTimes?.[i];

            // Вычисляем позицию карточки
            const row = Math.floor(i / config.levelsPerRow);
            const col = i % config.levelsPerRow;
            
            const x = config.startX + col * (config.levelCardWidth + config.cardSpacing);
            const y = config.startY + row * (config.levelCardHeight + config.cardSpacing) - config.scrollOffset;

            // Пропускаем карточки, которые не видны
            if (y + config.levelCardHeight < 0 || y > this.game.height) continue;

            this.drawLevelCard(context, i, x, y, isUnlocked, isCompleted, isCurrent, bestTime, levelInfo);
        }
    }

    drawLevelCard(context, levelIndex, x, y, isUnlocked, isCompleted, isCurrent, bestTime, levelInfo) {
        const config = this.levelSelectConfig;
        
        // Фон карточки
        if (isUnlocked) {
            if (isCurrent) {
                context.fillStyle = 'rgba(255, 193, 7, 0.8)'; // Желтый для текущего уровня
            } else if (isCompleted) {
                context.fillStyle = 'rgba(76, 175, 80, 0.8)'; // Зеленый для пройденных
            } else {
                context.fillStyle = 'rgba(33, 150, 243, 0.8)'; // Синий для доступных
            }
        } else {
            context.fillStyle = 'rgba(100, 100, 100, 0.6)'; // Серый для заблокированных
        }
        
        context.fillRect(x, y, config.levelCardWidth, config.levelCardHeight);

        // Рамка (толще для текущего уровня)
        context.strokeStyle = isUnlocked ? 'white' : 'rgba(255, 255, 255, 0.3)';
        context.lineWidth = isCurrent ? 4 : 2;
        context.strokeRect(x, y, config.levelCardWidth, config.levelCardHeight);

        // Номер уровня
        context.fillStyle = isUnlocked ? 'white' : 'rgba(255, 255, 255, 0.5)';
        context.font = `24px ${this.fontFamily}`;
        context.textAlign = 'center';
        context.fillText(`${levelIndex + 1}`, x + config.levelCardWidth / 2, y + 30);

        // Название уровня (если есть)
        if (levelInfo && levelInfo.name) {
            context.font = `12px ${this.fontFamily}`;
            context.fillText(levelInfo.name.substring(0, 12), x + config.levelCardWidth / 2, y + 45);
        } else {
            // Показываем номер уровня как название
            context.font = `12px ${this.fontFamily}`;
            context.fillText(`Уровень ${levelIndex + 1}`, x + config.levelCardWidth / 2, y + 45);
        }

        // Статус прохождения
        if (isUnlocked) {
            context.font = `10px ${this.fontFamily}`;
            if (isCompleted) {
                context.fillStyle = 'rgba(255, 255, 255, 0.9)';
                context.fillText('✓ ПРОЙДЕН', x + config.levelCardWidth / 2, y + 60);
                
                // Лучшее время
                if (bestTime) {
                    const timeStr = this.formatTime(bestTime);
                    context.fillText(timeStr, x + config.levelCardWidth / 2, y + 72);
                }
            } else {
                context.fillStyle = 'rgba(255, 255, 255, 0.7)';
                context.fillText('ДОСТУПЕН', x + config.levelCardWidth / 2, y + 60);
            }
        } else {
            context.fillStyle = 'rgba(255, 255, 255, 0.5)';
            context.font = `12px ${this.fontFamily}`;
            context.fillText('🔒', x + config.levelCardWidth / 2, y + 60);
        }
    }

    handleLevelCardClick(x, y) {
        if (!this.game.levelsList) return;

        const config = this.levelSelectConfig;
        const totalLevels = this.game.levelsList.length;

        for (let i = 0; i < totalLevels; i++) {
            const row = Math.floor(i / config.levelsPerRow);
            const col = i % config.levelsPerRow;
            
            const cardX = config.startX + col * (config.levelCardWidth + config.cardSpacing);
            const cardY = config.startY + row * (config.levelCardHeight + config.cardSpacing) - config.scrollOffset;

            // Проверяем клик по карточке
            if (x >= cardX && x <= cardX + config.levelCardWidth && 
                y >= cardY && y <= cardY + config.levelCardHeight) {
                
                const isUnlocked = this.game.isLevelUnlocked(i);
                if (isUnlocked) {
                    // Запускаем выбранный уровень
                    this.game.currentLevelIndex = i;
                    this.game.loadLevel(i);
                    return;
                } else {
                    // Показываем уведомление о заблокированном уровне
                    this.showNotification('Уровень заблокирован! Пройдите предыдущие уровни.', 'error');
                }
                return;
            }
        }
    }

    formatTime(timestamp) {
        // Преобразуем timestamp в читаемый формат времени
        if (typeof timestamp === 'number' && timestamp > 1000000000000) {
            // Это timestamp, преобразуем в время с начала
            return 'Рекорд';
        } else {
            // Это время в миллисекундах
            const minutes = Math.floor(timestamp / 60000);
            const seconds = Math.floor((timestamp % 60000) / 1000);
            const ms = Math.floor((timestamp % 1000) / 10);
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }
    }

    drawSettingsMenu(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);

        context.font = `50px ${this.fontFamily}`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('Настройки', this.game.width / 2, this.game.height / 2 - 100);

        // Volume slider
        context.font = `20px ${this.fontFamily}`;
        context.fillText('Громкость', this.game.width / 2, this.game.height / 2 - 20);
        const slider = this.settingsElements.volumeSlider;
        context.fillStyle = '#555';
        context.fillRect(slider.x, slider.y, slider.width, slider.height);
        context.fillStyle = 'white';
        context.fillRect(slider.x, slider.y, slider.width * this.game.audioManager.volume, slider.height);

        // Back button
        this.drawButton(context, this.settingsElements.backButton);
    }

    drawPauseMenu(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);
        
        context.font = `50px ${this.fontFamily}`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('Пауза', this.game.width / 2, this.game.height / 2 - 50);

        // Отрисовываем кнопки паузы
        for (const key in this.pauseButtons) {
            const button = this.pauseButtons[key];
            this.drawButton(context, button);
        }

        // Инструкция
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = `16px ${this.fontFamily}`;
        context.fillText('Нажмите Escape для продолжения', this.game.width / 2, this.game.height / 2 + 180);
    }

    drawButton(context, button) {
        // Фон кнопки
        context.fillStyle = 'white';
        context.fillRect(button.x, button.y, button.width, button.height);
        
        // Тень кнопки для лучшего вида
        context.fillStyle = 'rgba(0, 0, 0, 0.1)';
        context.fillRect(button.x + 2, button.y + 2, button.width, button.height);
        
        // Фон кнопки поверх тени
        context.fillStyle = 'white';
        context.fillRect(button.x, button.y, button.width, button.height);
        
        // Границы кнопки
        context.strokeStyle = '#ddd';
        context.lineWidth = 1;
        context.strokeRect(button.x, button.y, button.width, button.height);
        
        // Текст кнопки
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.font = `18px ${this.fontFamily}`;
        context.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2 + 6);
    }

    drawMobileControls(context) {
        for (const buttonName in this.touchControls) {
            const btn = this.touchControls[buttonName];
            
            // Фон кнопки
            context.fillStyle = 'rgba(255, 255, 255, 0.2)';
            context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            context.lineWidth = 2;
            
            // Рисуем круглую кнопку
            context.beginPath();
            context.arc(btn.x + btn.width / 2, btn.y + btn.height / 2, btn.width / 2 - 5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            
            // Текст на кнопке
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.font = '16px ' + this.fontFamily;
            
            let buttonText = '';
            switch(buttonName) {
                case 'left': buttonText = '←'; break;
                case 'right': buttonText = '→'; break;
                case 'jump': buttonText = '↑'; break;
                case 'slow': buttonText = '⏱'; break;
            }
            
            context.fillText(buttonText, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
        }
    }

    drawGameOver(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.font = '40px ' + this.fontFamily;
        context.fillText('ИГРА ОКОНЧЕНА', this.game.width / 2, this.game.height / 2 - 80);
        context.font = '20px ' + this.fontFamily;
        context.fillText(`Ваш счет: ${this.game.score}`, this.game.width / 2, this.game.height / 2 - 20);
        context.fillText(`Рекорд: ${this.game.highScore}`, this.game.width / 2, this.game.height / 2 + 10);

        let yPos = this.game.height / 2 + 50;
        if (this.game.score > 0) {
            context.fillText('Нажмите "S" для отправки рекорда', this.game.width / 2, yPos);
            yPos += 30;
        }
        context.fillText('Нажмите "Enter" для перезапуска', this.game.width / 2, yPos);
        yPos += 30;
        context.fillText('Нажмите "L" для таблицы лидеров', this.game.width / 2, yPos);
    }

    drawGameWon(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);
        context.fillStyle = 'gold';
        context.textAlign = 'center';
        context.font = '40px ' + this.fontFamily;
        context.fillText('ВЫ ПОБЕДИЛИ!', this.game.width / 2, this.game.height / 2 - 60);
        context.font = '20px ' + this.fontFamily;
        context.fillText(`Финальный счет: ${this.game.score}`, this.game.width / 2, this.game.height / 2 - 20);
        
        // Проверяем, есть ли пользовательский уровень
        const customLevel = localStorage.getItem('customLevel');
        if (customLevel && this.game.currentLevelIndex >= 7) {
            context.fillStyle = 'lightgreen';
            context.fillText('Вы прошли все уровни включая пользовательский!', this.game.width / 2, this.game.height / 2 + 20);
        } else if (this.game.currentLevelIndex >= 7) {
            context.fillStyle = 'lightblue';
            context.fillText('Создайте свой уровень в редакторе!', this.game.width / 2, this.game.height / 2 + 20);
            context.fillText('Меню → Редактор уровней', this.game.width / 2, this.game.height / 2 + 50);
        }
        
        context.fillStyle = 'white';
        context.fillText('Нажмите "Enter" чтобы начать заново', this.game.width / 2, this.game.height / 2 + 80);
    }

    drawNameInput(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, this.game.width, this.game.height);
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.font = '30px ' + this.fontFamily;
        context.fillText('Введите ваше имя:', this.game.width / 2, this.game.height / 2 - 60);

        const boxX = this.game.width / 2 - 150;
        const boxY = this.game.height / 2 - 25;
        const boxWidth = 300;
        const boxHeight = 50;
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(boxX, boxY, boxWidth, boxHeight);

        context.font = '30px ' + this.fontFamily;
        context.textAlign = 'left';
        const cursor = (Math.floor(Date.now() / 500) % 2 === 0) ? '|' : '';
        context.fillText(this.game.playerName + cursor, boxX + 10, boxY + 35);

        context.font = '16px ' + this.fontFamily;
        context.textAlign = 'center';
        context.fillText('Нажмите Enter для подтверждения', this.game.width / 2, this.game.height / 2 + 60);
    }

    drawLeaderboard(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, this.game.width, this.game.height);

        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.font = '30px ' + this.fontFamily;
        context.fillText('Таблица Лидеров', this.game.width / 2, 80);

        if (!this.game.leaderboardData) {
            context.font = '20px ' + this.fontFamily;
            context.fillText('Загрузка...', this.game.width / 2, this.game.height / 2);
            return;
        }

        context.font = '20px ' + this.fontFamily;
        context.textAlign = 'left';
        let yPos = 140;
        this.game.leaderboardData.forEach((entry, index) => {
            context.fillText(`${index + 1}. ${entry.name}`, this.game.width / 2 - 150, yPos);
            context.textAlign = 'right';
            context.fillText(`${entry.score}`, this.game.width / 2 + 150, yPos);
            context.textAlign = 'left';
            yPos += 30;
        });

        context.textAlign = 'center';
        context.font = '16px ' + this.fontFamily;
        context.fillText('Нажмите "L", чтобы закрыть', this.game.width / 2, this.game.height - 40);
    }

    openLevelEditor() {
        // Открываем улучшенный редактор уровней v2.0 в новом окне
        window.open('./level_editor.html', '_blank', 'width=1600,height=1000,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes');
    }

    async saveProgress() {
        try {
            const success = await this.game.saveProgress();
            
            // Показываем уведомление пользователю
            if (success) {
                this.showNotification('Прогресс сохранен!', 'success');
            } else {
                this.showNotification('Ошибка сохранения!', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка сохранения!', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Создаем временное уведомление
        this.notification = {
            message: message,
            type: type,
            timestamp: Date.now()
        };
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
            if (this.notification && Date.now() - this.notification.timestamp >= 3000) {
                this.notification = null;
            }
        }, 3000);
    }

    drawNotification(context) {
        if (!this.notification) return;
        
        const age = Date.now() - this.notification.timestamp;
        if (age > 3000) {
            this.notification = null;
            return;
        }
        
        // Анимация появления/исчезновения
        let alpha = 1;
        if (age < 300) {
            alpha = age / 300;
        } else if (age > 2700) {
            alpha = (3000 - age) / 300;
        }
        
        context.save();
        context.globalAlpha = alpha;
        
        // Фон уведомления
        const bgColor = this.notification.type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 
                       this.notification.type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                       'rgba(33, 150, 243, 0.9)';
        
        context.fillStyle = bgColor;
        context.fillRect(this.game.width / 2 - 150, 50, 300, 50);
        
        // Текст уведомления
        context.fillStyle = 'white';
        context.font = '18px ' + this.fontFamily;
        context.textAlign = 'center';
        context.fillText(this.notification.message, this.game.width / 2, 80);
        
        context.restore();
    }
}
