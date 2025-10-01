export class AssetManager {
    constructor() {
        this.images = {};
        this.queue = [];
    }

    queueImage(name, path) {
        this.queue.push({ name, path });
    }

    loadAll(callback) {
        if (this.queue.length === 0) {
            callback();
            return;
        }
        const total = this.queue.length;
        let loaded = 0;

        for (const item of this.queue) {
            const img = new Image();
            img.addEventListener('load', () => {
                this.images[item.name] = img;
                loaded++;
                if (loaded === total) callback();
            });
            img.addEventListener('error', () => {
                console.error(`Не удалось загрузить ресурс: ${item.path}`);
                loaded++;
                if (loaded === total) callback();
            });
            img.src = item.path;
        }
    }

    getImage(name) {
        return this.images[name];
    }
}
