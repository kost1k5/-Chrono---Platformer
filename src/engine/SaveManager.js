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

/**
 * Менеджер сохранений через JSONBin API
 */
export class JSONBinSaveManager {
    constructor() {
        // ID бинов из предоставленных данных
        this.USERS_BIN_ID = '68dd9ef8d0ea881f40921b6e';
        this.LEADERBOARD_BIN_ID = '68dd9e47d0ea881f40921afa';
        this.MASTER_KEY = '$2a$10$l.lufdrfu9Ha0V9zyOC7su8cpk3eSvHZ5wtIVeSbozl6xWh7aq8nC';
        
        this.BASE_URL = 'https://api.jsonbin.io/v3/b';
        
        // Генерируем уникальный ID пользователя если его еще нет
        this.userId = this.getUserId();
    }

    /**
     * Получает или создает уникальный ID пользователя
     */
    getUserId() {
        let userId = localStorage.getItem('chronoPlatformerUserId');
        if (!userId) {
            // Генерируем уникальный ID
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('chronoPlatformerUserId', userId);
        }
        return userId;
    }

    /**
     * Выполняет запрос к JSONBin API
     */
    async apiRequest(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Master-Key': this.MASTER_KEY
        };

        const options = {
            method,
            headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.BASE_URL}/${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Загружает данные пользователей
     */
    async loadUsersData() {
        try {
            const response = await this.apiRequest(this.USERS_BIN_ID);
            return response.record;
        } catch (error) {
            // Возвращаем пустую структуру при ошибке
            return {
                users: [],
                metadata: {
                    version: "1.0.0",
                    created: Date.now(),
                    lastUpdate: Date.now(),
                    totalUsers: 0
                }
            };
        }
    }

    /**
     * Сохраняет данные пользователей
     */
    async saveUsersData(usersData) {
        try {
            // Обновляем метаданные
            usersData.metadata.lastUpdate = Date.now();
            usersData.metadata.totalUsers = usersData.users.length;
            
            await this.apiRequest(this.USERS_BIN_ID, 'PUT', usersData);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Находит или создает пользователя в данных
     */
    findOrCreateUser(usersData) {
        let user = usersData.users.find(u => u.userId === this.userId);
        
        if (!user) {
            // Создаем нового пользователя
            user = {
                userId: this.userId,
                unlockedLevels: [0], // Первый уровень открыт по умолчанию
                completedLevels: [],
                bestTimes: {},
                totalScore: 0,
                totalPlayTime: 0,
                achievements: [],
                settings: {
                    volume: 1,
                    controls: "default",
                    graphics: "medium"
                },
                statistics: {
                    totalJumps: 0,
                    totalDeaths: 0,
                    crystalsCollected: 0,
                    enemiesDefeated: 0
                },
                lastSaved: Date.now()
            };
            
            usersData.users.push(user);
        }
        
        return user;
    }

    /**
     * Сохраняет прогресс игрока
     */
    async saveProgress(progressData) {
        try {
            const usersData = await this.loadUsersData();
            const user = this.findOrCreateUser(usersData);
            
            // Обновляем данные пользователя
            if (progressData.unlockedLevels) {
                user.unlockedLevels = progressData.unlockedLevels;
            }
            if (progressData.completedLevels) {
                user.completedLevels = progressData.completedLevels;
            }
            if (progressData.bestTimes) {
                user.bestTimes = { ...user.bestTimes, ...progressData.bestTimes };
            }
            if (progressData.totalScore !== undefined) {
                user.totalScore = progressData.totalScore;
            }
            if (progressData.achievements) {
                user.achievements = progressData.achievements;
            }
            if (progressData.statistics) {
                user.statistics = { ...user.statistics, ...progressData.statistics };
            }
            if (progressData.settings) {
                user.settings = { ...user.settings, ...progressData.settings };
            }
            
            user.lastSaved = Date.now();
            
            // Сохраняем обновленные данные
            const success = await this.saveUsersData(usersData);
            
            return success;
        } catch (error) {
            return false;
        }
    }

    /**
     * Загружает прогресс игрока
     */
    async loadProgress() {
        try {
            const usersData = await this.loadUsersData();
            const user = this.findOrCreateUser(usersData);
            
            return {
                userId: user.userId,
                unlockedLevels: user.unlockedLevels || [0],
                completedLevels: user.completedLevels || [],
                bestTimes: user.bestTimes || {},
                totalScore: user.totalScore || 0,
                totalPlayTime: user.totalPlayTime || 0,
                achievements: user.achievements || [],
                settings: user.settings || {
                    volume: 1,
                    controls: "default",
                    graphics: "medium"
                },
                statistics: user.statistics || {
                    totalJumps: 0,
                    totalDeaths: 0,
                    crystalsCollected: 0,
                    enemiesDefeated: 0
                }
            };
        } catch (error) {
            // Возвращаем дефолтные данные при ошибке
            return {
                userId: this.userId,
                unlockedLevels: [0],
                completedLevels: [],
                bestTimes: {},
                totalScore: 0,
                totalPlayTime: 0,
                achievements: [],
                settings: {
                    volume: 1,
                    controls: "default",
                    graphics: "medium"
                },
                statistics: {
                    totalJumps: 0,
                    totalDeaths: 0,
                    crystalsCollected: 0,
                    enemiesDefeated: 0
                }
            };
        }
    }

    /**
     * Загружает данные таблицы лидеров
     */
    async loadLeaderboard() {
        try {
            const response = await this.apiRequest(this.LEADERBOARD_BIN_ID);
            return response.record || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Сохраняет результат в таблицу лидеров
     */
    async saveLeaderboardEntry(name, score, level, time) {
        try {
            const leaderboard = await this.loadLeaderboard();
            
            const entry = {
                id: 'score_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
                name: {
                    name: name,
                    score: score,
                    level: level,
                    time: time
                },
                level: level,
                time: time,
                timestamp: Date.now()
            };
            
            leaderboard.push(entry);
            
            // Сортируем по времени (лучшее время = меньшее значение)
            leaderboard.sort((a, b) => a.time - b.time);
            
            // Оставляем только топ 100 результатов
            if (leaderboard.length > 100) {
                leaderboard.splice(100);
            }
            
            await this.apiRequest(this.LEADERBOARD_BIN_ID, 'PUT', leaderboard);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Очищает локальный ID пользователя (для тестирования)
     */
    clearUserId() {
        localStorage.removeItem('chronoPlatformerUserId');
        this.userId = this.getUserId();
    }
}

