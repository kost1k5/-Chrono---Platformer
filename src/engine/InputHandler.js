export class InputHandler {
    constructor(canvas, ui) {
        this.keys = new Set();
        this.activeTouches = new Map(); // Для отслеживания активных касаний
        this.canvas = canvas;
        this.ui = ui;

        // Предотвращение зума на мобильных устройствах
        this.preventZoom();

        // --- Клавиатура ---
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'ShiftLeft'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // --- Мышь ---
        this.canvas.addEventListener('click', (e) => {
            // Мышь используется только для UI в меню
            if (['mainMenu', 'settings', 'levelSelect'].includes(this.ui.game.gameState)) {
                const rect = this.canvas.getBoundingClientRect();
                
                // Просто используем offsetX/Y как экранные координаты
                const screenX = e.offsetX;
                const screenY = e.offsetY;
                
                this.ui.handleMouseClick(screenX, screenY);
            }
        });

        // Обработка прокрутки колесом мыши для экрана выбора уровней
        this.canvas.addEventListener('wheel', (e) => {
            if (this.ui.game.gameState === 'levelSelect') {
                e.preventDefault();
                const scrollSpeed = 50;
                if (e.deltaY > 0) {
                    // Прокрутка вниз
                    this.ui.levelSelectConfig.scrollOffset += scrollSpeed;
                } else {
                    // Прокрутка вверх
                    this.ui.levelSelectConfig.scrollOffset = Math.max(0, this.ui.levelSelectConfig.scrollOffset - scrollSpeed);
                }
            }
        });

        // --- Сенсорное управление ---
        if (this.ui.isTouchDevice) {
            this.canvas.addEventListener('touchstart', (e) => {
                const rect = this.canvas.getBoundingClientRect();

                // В меню, касания эмулируют клики по UI
                if (['mainMenu', 'settings', 'levelSelect'].includes(this.ui.game.gameState)) {
                    e.preventDefault(); // Предотвращаем генерацию click, чтобы не было двойного срабатывания
                    for (const touch of e.changedTouches) {
                        // Передаём экранные координаты относительно canvas
                        const screenX = touch.clientX - rect.left;
                        const screenY = touch.clientY - rect.top;
                        
                        this.ui.handleMouseClick(screenX, screenY);
                    }
                    return; // Завершаем, так как в меню не нужны игровые контролы
                }

                // В игре, касания управляют персонажем
                if (this.ui.game.gameState === 'playing') {
                    e.preventDefault();
                    for (const touch of e.changedTouches) {
                        // Преобразуем экранные координаты в координаты canvas для игровых элементов
                        const screenX = touch.clientX - rect.left;
                        const screenY = touch.clientY - rect.top;
                        const canvasCoords = this.ui.screenToCanvasCoords(screenX, screenY);
                        const x = canvasCoords.x;
                        const y = canvasCoords.y;

                        for (const buttonName in this.ui.touchControls) {
                            const btn = this.ui.touchControls[buttonName];
                            const dx = x - (btn.x + btn.width / 2);
                            const dy = y - (btn.y + btn.height / 2);
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const buttonRadius = btn.width / 2;
                            
                            if (distance < buttonRadius) {
                                if (btn.key === 'Space') {
                                    if (this.ui.game.player) this.ui.game.player.jump();
                                } else {
                                    this.keys.add(btn.key);
                                }
                                this.activeTouches.set(touch.identifier, btn.key);
                                break;
                            }
                        }
                    }
                }
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (this.activeTouches.has(touch.identifier)) {
                        const key = this.activeTouches.get(touch.identifier);
                        this.keys.delete(key);
                        this.activeTouches.delete(touch.identifier);
                    }
                }
            });
        }
    }

    preventZoom() {
        // Предотвращение зума жестами
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());

        // Предотвращение зума двойным касанием
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Предотвращение зума пинчем
        document.addEventListener('touchmove', (event) => {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, { passive: false });
    }
}
