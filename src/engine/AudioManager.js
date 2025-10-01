export class AudioManager {
    /**
     * Менеджер аудио-системы для управления звуками и музыкой
     * Обеспечивает загрузку, воспроизведение и управление аудио ресурсами
     */
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.audioCache = {};
        this.isUnlocked = false;
        this.volume = 1.0;
        this.isMuted = false;
        this.volumeBeforeMute = 1.0;
        
        // Для фоновой музыки
        this.backgroundMusic = null;
        this.backgroundMusicSource = null;
        this.isMusicPlaying = false;
    }

    /**
     * Переключает состояние звука между включенным и выключенным
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.volumeBeforeMute = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.volumeBeforeMute);
        }
    }

    /**
     * Инициализация аудио-контекста после первого пользовательского действия
     * Необходимо для обхода ограничений браузера на автозапуск аудио
     */
    init() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isUnlocked = true;
    }

    /**
     * Устанавливает общую громкость аудио
     * @param {number} volume - Уровень громкости от 0 до 1
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    /**
     * Загружает аудио файл и сохраняет его в кеше
     * @param {string} name - Имя звука для идентификации
     * @param {string} path - Путь к аудио файлу
     * @returns {Promise<AudioBuffer|null>} Загруженный аудио буфер или null при ошибке
     */
    async loadSound(name, path) {
        if (this.audioCache[name]) {
            return this.audioCache[name];
        }
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for path ${path}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioCache[name] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            return null;
        }
    }

    /**
     * Загружает несколько аудио файлов параллельно
     * @param {Array} sounds - Массив объектов с полями name и path
     */
    async loadSounds(sounds) {
        const promises = sounds.map(sound => this.loadSound(sound.name, sound.path));
        await Promise.allSettled(promises);
    }

    /**
     * Воспроизводит звуковой эффект
     * @param {string} name - Имя звука для воспроизведения
     * @param {number} playbackRate - Скорость воспроизведения (по умолчанию 1.0)
     * @param {number} volume - Громкость звука от 0 до 1 (по умолчанию 1.0)
     */
    playSound(name, playbackRate = 1.0, volume = 1.0) {
        if (!this.isUnlocked) {
            return;
        }

        const audioBuffer = this.audioCache[name];
        if (!audioBuffer) {
            return;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(this.gainNode);
        source.start(0);
    }

    /**
     * Запускает фоновую музыку с зацикливанием
     * @param {string} name - Имя музыкального трека
     */
    playBackgroundMusic(name) {
        if (!this.isUnlocked) return;

        this.stopBackgroundMusic();
        
        setTimeout(() => {
            const audioBuffer = this.audioCache[name];
            if (!audioBuffer) {
                return;
            }

            this.backgroundMusic = audioBuffer;
            this.startBackgroundMusic();
        }, 50);
    }

    /**
     * Внутренний метод для запуска фоновой музыки
     */
    startBackgroundMusic() {
        if (!this.backgroundMusic || this.isMusicPlaying) return;

        this.backgroundMusicSource = this.audioContext.createBufferSource();
        this.backgroundMusicSource.buffer = this.backgroundMusic;
        this.backgroundMusicSource.loop = true;
        this.backgroundMusicSource.connect(this.gainNode);
        
        this.backgroundMusicSource.start(0);
        this.isMusicPlaying = true;

        this.backgroundMusicSource.onended = () => {
            this.isMusicPlaying = false;
            this.backgroundMusicSource = null;
        };
    }

    /**
     * Останавливает воспроизведение фоновой музыки
     */
    stopBackgroundMusic() {
        if (this.backgroundMusicSource) {
            try {
                this.backgroundMusicSource.stop();
                this.backgroundMusicSource.disconnect();
            } catch (e) {
                // Игнорируем ошибки, если источник уже остановлен
            }
            this.backgroundMusicSource = null;
        }
        this.isMusicPlaying = false;
    }

    /**
     * Приостанавливает воспроизведение фоновой музыки
     */
    pauseBackgroundMusic() {
        if (this.isMusicPlaying) {
            this.stopBackgroundMusic();
        }
    }

    /**
     * Возобновляет воспроизведение фоновой музыки
     */
    resumeBackgroundMusic() {
        if (this.backgroundMusic && !this.isMusicPlaying) {
            this.startBackgroundMusic();
        }
    }
}

