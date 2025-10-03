// /src/game/Leaderboard.js
// ВАЖНО: Этот класс предназначен для работы с сервисом хранения JSON, таким как JSONBin.io.
// Вам нужно будет заменить 'YOUR_API_KEY' и 'YOUR_BIN_URL' на ваши реальные данные.

export class Leaderboard {
    constructor() {
        // --- ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ ---
        this.apiKey = 'YOUR_API_KEY'; // Ваш мастер-ключ от JSONBin.io
        this.binUrl = 'YOUR_BIN_URL';   // URL вашего "бина" (хранилища)
        // -----------------------------

        // Примечание: Простой паттерн "прочитать-изменить-записать" уязвим для состояний гонки,
        // если два игрока отправят результат одновременно. Для простого проекта это приемлемо,
        // но в продакшене потребовался бы полноценный бэкенд с атомарными операциями.
    }

    async fetchScores() {
        if (this.apiKey === 'YOUR_API_KEY' || this.binUrl === 'YOUR_BIN_URL') {
            return [{ name: 'Player1', score: 1000 }, { name: 'Player2', score: 800 }];
        }
        try {
            const response = await fetch(this.binUrl, {
                method: 'GET',
                headers: { 'X-Master-Key': this.apiKey }
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            // JSONBin возвращает данные в свойстве 'record'
            return Array.isArray(data.record) ? data.record : [];
        } catch (e) {
            return null;
        }
    }

    async submitScore(name, score) {
        if (this.apiKey === 'YOUR_API_KEY' || this.binUrl === 'YOUR_BIN_URL') {
            return;
        }
        try {
            let scores = await this.fetchScores();
            if (scores === null) return; // Не удалось загрузить, не перезаписываем

            scores.push({ name, score });
            scores.sort((a, b) => b.score - a.score); // Сортировка по убыванию
            scores = scores.slice(0, 10); // Оставляем топ-10

            const response = await fetch(this.binUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(scores)
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        } catch (e) {
            // Обработка ошибки отправки рекорда
        }
    }
}
