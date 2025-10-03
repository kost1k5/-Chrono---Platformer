// Функция для проверки столкновения двух осе-ориентированных прямоугольников (AABB)
// rect1 и rect2 - это объекты с полями { x, y, width, height }
export function checkAABBCollision(rect1, rect2) {
    // ИСПРАВЛЕНИЕ: Используем < и > для проверки ПЕРЕСЕЧЕНИЯ, а не касания.
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}
