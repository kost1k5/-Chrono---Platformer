export class Door {
    constructor(x, y) {
        this.position = { x, y };
        this.width = 32;
        this.height = 64;
        this.isLocked = true;
        console.log(`Door создана на позиции: x=${x}, y=${y}, size=${this.width}x${this.height}, locked=${this.isLocked}`);
    }

    draw(context) {
        if (!this.isLocked) return;

        context.fillStyle = '#A0522D'; // Brown color for the door
        context.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Door knob
        context.fillStyle = 'gold';
        context.beginPath();
        context.arc(this.position.x + this.width - 8, this.position.y + this.height / 2, 4, 0, Math.PI * 2);
        context.fill();
    }
}
