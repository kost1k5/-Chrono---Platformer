export class SaveManager {
    /**
     * Менеджер сохранений игры с использованием localStorage
     * @param {string} saveKey - Ключ для сохранения данных в localStorage
     */
    constructor(saveKey = 'chronoPlatformerSave') {
        this.saveKey = saveKey;
    }

    /**
     * Сохраняет состояние игры в localStorage
     * @param {Object} gameState - Объект состояния игры для сохранения
     */
    save(gameState) {
        try {
            const stateString = JSON.stringify(gameState);
            localStorage.setItem(this.saveKey, stateString);
        } catch (e) {
            // Молча игнорируем ошибки сохранения
        }
    }

    /**
     * Загружает состояние игры из localStorage
     * @returns {Object|null} Загруженное состояние игры или null если данных нет
     */
    load() {
        try {
            const stateString = localStorage.getItem(this.saveKey);
            if (stateString) {
                const gameState = JSON.parse(stateString);
                return gameState;
            }
        } catch (e) {
            // Молча игнорируем ошибки загрузки
        }
        return null;
    }

    /**
     * Удаляет сохраненные данные игры
     */
    clear() {
        localStorage.removeItem(this.saveKey);
    }
}

