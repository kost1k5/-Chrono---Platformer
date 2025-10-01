export class Key {
    constructor(x, y) {
        this.position = { x, y };
        this.width = 16;
        this.height = 32;
        this.isActive = true;
    }

    draw(context) {
        if (!this.isActive) return;

        context.fillStyle = 'gold';
        // Key body
        context.fillRect(this.position.x, this.position.y + 10, this.width, this.height - 10);
        // Key head
        context.beginPath();
        context.arc(this.position.x + this.width / 2, this.position.y + 5, 8, 0, Math.PI * 2);
        context.fill();
        // Key hole
        context.fillStyle = 'black';
        context.beginPath();
        context.arc(this.position.x + this.width / 2, this.position.y + 5, 3, 0, Math.PI * 2);
        context.fill();
    }
}
