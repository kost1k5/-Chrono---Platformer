export class InputHandler {
    constructor(canvas, ui) {
        this.keys = new Set();
        this.activeTouches = new Map(); // Для отслеживания активных касаний
        this.canvas = canvas;
        this.ui = ui;

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
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                // Используем offsetX/Y, которые уже дают координаты относительно элемента,
                // и масштабируем их к внутреннему разрешению холста.
                const x = e.offsetX * scaleX;
                const y = e.offsetY * scaleY;
                this.ui.handleMouseClick(x, y);
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
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                // В меню, касания эмулируют клики по UI
                if (['mainMenu', 'settings', 'levelSelect'].includes(this.ui.game.gameState)) {
                    e.preventDefault(); // Предотвращаем генерацию click, чтобы не было двойного срабатывания
                    for (const touch of e.changedTouches) {
                        const x = (touch.clientX - rect.left) * scaleX;
                        const y = (touch.clientY - rect.top) * scaleY;
                        this.ui.handleMouseClick(x, y);
                    }
                    return; // Завершаем, так как в меню не нужны игровые контролы
                }

                // В игре, касания управляют персонажем
                if (this.ui.game.gameState === 'playing') {
                    e.preventDefault();
                    for (const touch of e.changedTouches) {
                        const x = (touch.clientX - rect.left) * scaleX;
                        const y = (touch.clientY - rect.top) * scaleY;

                        for (const buttonName in this.ui.touchControls) {
                            const btn = this.ui.touchControls[buttonName];
                            const dx = x - (btn.x + btn.width / 2);
                            const dy = y - (btn.y + btn.height / 2);
                            if (dx * dx + dy * dy < (btn.width / 2) * (btn.width / 2)) {
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
}
