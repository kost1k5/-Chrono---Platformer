import { Vec2 } from '../utils/Vec2.js';

export class Camera {
    constructor(width, height) {
        this.position = new Vec2(0, 0);
        this.width = width;   // Ширина области просмотра (Canvas)
        this.height = height;
    }

    // Следование за целью (игроком) с учетом границ уровня
    follow(target, levelPixelWidth, levelPixelHeight) {
        // Центрируем камеру на игроке
        this.position.x = target.position.x + target.width / 2 - this.width / 2;
        this.position.y = target.position.y + target.height / 2 - this.height / 2;

        // Ограничиваем движение камеры границами уровня
        this.clamp(levelPixelWidth, levelPixelHeight);
    }

    clamp(levelWidth, levelHeight) {
        // Ограничиваем позицию камеры
        this.position.x = Math.max(0, Math.min(this.position.x, levelWidth - this.width));
        this.position.y = Math.max(0, Math.min(this.position.y, levelHeight - this.height));

        // Обработка случаев, если уровень меньше экрана
        if (levelWidth < this.width) this.position.x = -(this.width - levelWidth) / 2;
        if (levelHeight < this.height) this.position.y = -(this.height - levelHeight) / 2;
    }

    // Применение трансформации к контексту Canvas
    apply(context) {
        // Смещаем контекст в противоположном направлении.
        // Используем Math.round, чтобы избежать артефактов рендеринга (разрывов между тайлами).
        context.translate(-Math.round(this.position.x), -Math.round(this.position.y));
    }

    // Преобразование мировых координат в экранные
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.position.x,
            y: worldY - this.position.y
        };
    }
}
