export class UI {
    constructor(game) {
        this.game = game;
        this.fontSize = 24;
        this.fontFamily = '"Source Sans Pro", sans-serif';
        this.isTouchDevice = 'ontouchstart' in window;

        this.menuButtons = {
            levelSelect: { x: this.game.width / 2 - 100, y: this.game.height / 2 - 50, width: 200, height: 40, text: '🎯 Выбрать уровень', action: () => { this.game.gameState = 'levelSelect'; } },
            quickStart: { x: this.game.width / 2 - 100, y: this.game.height / 2 - 5, width: 200, height: 40, text: '⚡ Быстрый старт', action: () => this.game.startNewGame() },
            levelEditor: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 40, width: 200, height: 40, text: '🎮 Редактор v2.0', action: () => this.openLevelEditor() },
            saveProgress: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 85, width: 200, height: 40, text: '💾 Сохранить прогресс', action: () => this.saveProgress() },
            settings: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 130, width: 200, height: 40, text: 'Настройки', action: () => { this.game.gameState = 'settings'; } }
        };

        this.settingsElements = {
            volumeSlider: { x: this.game.width / 2 - 100, y: this.game.height / 2, width: 200, height: 20 },
            backButton: { x: this.game.width / 2 - 100, y: this.game.height / 2 + 70, width: 200, height: 50, text: 'Назад', action: () => { this.game.gameState = 'mainMenu'; } }
        };

        this.touchControls = {
            left: { x: 50, y: this.game.height - 90, width: 80, height: 80, key: 'ArrowLeft' },
            right: { x: 150, y: this.game.height - 90, width: 80, height: 80, key: 'ArrowRight' },
            slow: { x: this.game.width - 230, y: this.game.height - 90, width: 80, height: 80, key: 'ShiftLeft' },
            jump: { x: this.game.width - 130, y: this.game.height - 90, width: 80, height: 80, key: 'Space' }
        };

        // Настройки экрана выбора уровней
        this.levelSelectConfig = {
            levelsPerRow: 6,
            levelCardWidth: 120,
            levelCardHeight: 80,
            cardSpacing: 20,
            startX: 100,
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

    isReady() {
        return true;
    }

    handleMouseClick(x, y) {
        if (this.game.gameState === 'mainMenu') {
            // Check main menu buttons
            for (const key in this.menuButtons) {
                const button = this.menuButtons[key];
                if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
                    this.game.audioManager.init(); // Unlock audio on first user interaction
                    button.action();
                    return; // Exit after one action
                }
            }
        } else if (this.game.gameState === 'levelSelect') {
            // Check level select buttons
            for (const key in this.levelSelectButtons) {
                const button = this.levelSelectButtons[key];
                if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
                    console.log(`🖱️ Level select button clicked: ${key}`);
                    button.action();
                    return;
                }
            }

            // Check level cards
            this.handleLevelCardClick(x, y);
        } else if (this.game.gameState === 'paused') {
            // Check pause menu buttons
            for (const key in this.pauseButtons) {
                const button = this.pauseButtons[key];
                if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
                    button.action();
                    return;
                }
            }
        } else if (this.game.gameState === 'settings') {
            // Check settings screen elements
            const backButton = this.settingsElements.backButton;
            if (x >= backButton.x && x <= backButton.x + backButton.width && y >= backButton.y && y <= backButton.y + backButton.height) {
                backButton.action();
                return; // Exit
            }

            const slider = this.settingsElements.volumeSlider;
            if (x >= slider.x && x <= slider.x + slider.width && y >= slider.y && y <= slider.y + slider.height) {
                // Calculate the new volume as a ratio of the click position on the slider
                let newVolume = (x - slider.x) / slider.width;
                // Clamp the value between 0 and 1 to be safe
                newVolume = Math.max(0, Math.min(1, newVolume));
                this.game.audioManager.setVolume(newVolume);
                return; // Exit
            }
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

        context.restore();
    }

    drawHUD(context) {
        context.fillStyle = 'white';
        context.font = `${this.fontSize}px ${this.fontFamily}`;
        context.textAlign = 'left';
        context.fillText(`Счет: ${this.game.score}`, 20, 30);
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

        // Отладочная информация о платформах
        context.fillStyle = 'yellow';
        context.font = `16px ${this.fontFamily}`;
        context.textAlign = 'left';
        context.fillText(`Платформ: ${this.game.platforms ? this.game.platforms.length : 0}`, 20, 80);
        context.fillText(`Врагов: ${this.game.enemies ? this.game.enemies.length : 0}`, 20, 100);

        // Индикатор ключа
        if (this.game.player && this.game.player.hasKey) {
            context.fillStyle = 'gold';
            context.textAlign = 'left';
            context.fillText('🗝️ Ключ', 20, 60);
        }
    }

    drawMainMenu(context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, this.game.width, this.game.height);

        context.font = `50px ${this.fontFamily}`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('Хроно-Платформер', this.game.width / 2, this.game.height / 2 - 100);

        // Отображение прогресса игрока
        if (this.game.playerProgress) {
            context.fillStyle = 'rgba(255, 255, 255, 0.8)';
            context.font = `16px ${this.fontFamily}`;
            context.textAlign = 'left';
            
            const progressX = 20;
            const progressY = 50;
            
            context.fillText(`Игрок: ${this.game.cloudSaveManager?.userId || 'Локальный'}`, progressX, progressY);
            context.fillText(`Открыто уровней: ${this.game.playerProgress.unlockedLevels?.length || 0}`, progressX, progressY + 20);
            context.fillText(`Пройдено уровней: ${this.game.playerProgress.completedLevels?.length || 0}`, progressX, progressY + 40);
            context.fillText(`Лучший счет: ${this.game.playerProgress.totalScore || 0}`, progressX, progressY + 60);
            
            if (this.game.playerProgress.statistics) {
                context.fillText(`Прыжков: ${this.game.playerProgress.statistics.totalJumps || 0}`, progressX, progressY + 80);
                context.fillText(`Кристаллов: ${this.game.playerProgress.statistics.crystalsCollected || 0}`, progressX, progressY + 100);
            }
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
            console.warn('⚠️ levelsList not loaded in drawLevelCards');
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
        context.fillStyle = 'white';
        context.fillRect(button.x, button.y, button.width, button.height);
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.font = `20px ${this.fontFamily}`;
        context.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2 + 8);
    }

    drawMobileControls(context) {
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (const buttonName in this.touchControls) {
            const btn = this.touchControls[buttonName];
            context.beginPath();
            context.arc(btn.x + btn.width / 2, btn.y + btn.height / 2, btn.width / 2, 0, Math.PI * 2);
            context.fill();
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
            console.log('Manual save progress requested...');
            const success = await this.game.saveProgress();
            
            // Показываем уведомление пользователю
            if (success) {
                this.showNotification('Прогресс сохранен!', 'success');
            } else {
                this.showNotification('Ошибка сохранения!', 'error');
            }
        } catch (error) {
            console.error('Error in manual save:', error);
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
