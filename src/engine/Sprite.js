export class Sprite {
    constructor({
        frameWidth,
        frameHeight,
        animations = {}
    }) {
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animations = animations;

        this.currentState = Object.keys(animations)[0] || null;
        this.currentFrame = 0;
        this.frameTimer = 0;
    }

    setState(newState) {
        if (this.currentState !== newState && this.animations[newState]) {
            this.currentState = newState;
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
    }

    update(deltaTime) {
        if (!this.currentState) return;

        const animation = this.animations[this.currentState];
        if (!animation || !animation.frameInterval) return;

        this.frameTimer += deltaTime;

        while (this.frameTimer > animation.frameInterval) {
            this.frameTimer -= animation.frameInterval;
            this.currentFrame = (this.currentFrame + 1) % animation.frameCount;
        }
    }

    draw(context, x, y) {
        if (!this.currentState) return;

        const animation = this.animations[this.currentState];
        if (!animation || !animation.image) return;

        const sx = this.currentFrame * this.frameWidth;
        const sy = animation.row * this.frameHeight;

        // Убираем излишне строгую проверку. Мы доверяем AssetManager,
        // который должен был дождаться полной загрузки изображения.
        context.drawImage(
            animation.image,
            sx, sy, this.frameWidth, this.frameHeight,
            x, y, this.frameWidth, this.frameHeight
        );
    }
}
