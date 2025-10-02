// Утилита для конвертации SVG в PNG и интеграции новых спрайтов
class SpriteUpgrader {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.spriteConfigs = {
            idle: { frames: 1, interval: 100 },
            run: { frames: 7, interval: 120 },
            jump: { frames: 1, interval: 100 },
            fall: { frames: 1, interval: 100 },
            doublejump: { frames: 7, interval:80 }
        };
    }

    async convertSVGtoPNG(svgPath, outputPath, width = 32, height = 50) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.canvas.width = width;
                this.canvas.height = height;
                
                // Очистка canvas
                this.ctx.clearRect(0, 0, width, height);
                
                // Отрисовка с антиалиасингом
                this.ctx.imageSmoothingEnabled = false; // Для пиксель-арта
                this.ctx.drawImage(img, 0, 0, width, height);
                
                // Конвертация в PNG
                this.canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = outputPath;
                    a.click();
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            };
            
            img.onerror = reject;
            img.src = svgPath;
        });
    }

    async convertRunSpriteSheet(svgPath, outputPath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Размеры для спрайт-листа бега (7 кадров)
                const frameWidth = 32;
                const frameHeight = 50;
                const totalFrames = 7;
                
                this.canvas.width = frameWidth * totalFrames;
                this.canvas.height = frameHeight;
                
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.imageSmoothingEnabled = false;
                this.ctx.drawImage(img, 0, 0);
                
                this.canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = outputPath;
                    a.click();
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/png');
            };
            
            img.onerror = reject;
            img.src = svgPath;
        });
    }

    async upgradeSprites() {
        console.log('🎨 Начинаю обновление спрайтов...');
        
        try {
            // Конвертация одиночных спрайтов
            await this.convertSVGtoPNG('assets/images/player_idle_new.svg', 'player_idle_upgraded.png');
            await this.convertSVGtoPNG('assets/images/player_jump_new.svg', 'player_jump_upgraded.png');
            await this.convertSVGtoPNG('assets/images/player_fall_new.svg', 'player_fall_upgraded.png');
            
            // Конвертация спрайт-листов
            await this.convertRunSpriteSheet('assets/images/player_run_new.svg', 'player_run_upgraded.png');
            await this.convertRunSpriteSheet('assets/images/player_doublejump_new.svg', 'player_doublejump_upgraded.png');
            
            console.log('✅ Спрайты успешно обновлены!');
            console.log('📝 Теперь обновите пути в Player.js');
            
        } catch (error) {
            console.error('❌ Ошибка при обновлении спрайтов:', error);
        }
    }

    // Генерация обновленного кода для Player.js
    generatePlayerCode() {
        return `
// Обновленная конфигурация спрайтов с улучшенной графикой
createSprites() {
    this.sprites = {
        idle: new Sprite(
            'assets/images/player_idle_upgraded.png',
            32, 50, 1, 100, true
        ),
        run: new Sprite(
            'assets/images/player_run_upgraded.png',
            32, 50, 7, 120, true
        ),
        jump: new Sprite(
            'assets/images/player_jump_upgraded.png',
            32, 50, 1, 100, true
        ),
        fall: new Sprite(
            'assets/images/player_fall_upgraded.png',
            32, 50, 1, 100, true
        ),
        doublejump: new Sprite(
            'assets/images/player_doublejump_upgraded.png',
            32, 50, 7, 80, true
        )
    };
    
    this.currentSprite = this.sprites.idle;
}`;
    }
}

// Инициализация обновления спрайтов
const spriteUpgrader = new SpriteUpgrader();

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpriteUpgrader;
}