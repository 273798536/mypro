class UI {
    constructor() {
        this.animationFrame = null;
        this.init();
    }

    init() {
        this.startAnimationLoop();
    }

    startAnimationLoop() {
        const animate = () => {
            if (typeof game !== 'undefined' && game.isPlaying) {
                game.renderStage();
            }
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    static showMessage(text, type = 'info') {
        const indicator = document.getElementById('problem-indicator');
        indicator.textContent = text;
        indicator.className = `problem-indicator ${type}`;
        indicator.classList.remove('hidden');

        setTimeout(() => {
            indicator.classList.add('hidden');
        }, 3000);
    }

    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    static getLevelById(id) {
        return LEVELS.find(l => l.id === id);
    }

    static validateMicPosition(x, y, obstacles) {
        for (const obs of obstacles) {
            if (x >= obs.x && x <= obs.x + obs.width &&
                y >= obs.y && y <= obs.y + obs.height) {
                return false;
            }
        }
        return true;
    }
}

const ui = new UI();
