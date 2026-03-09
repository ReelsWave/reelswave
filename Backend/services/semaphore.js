let running = 0;
const MAX = 5;

export async function acquire() {
    while (running >= MAX) {
        await new Promise(r => setTimeout(r, 500));
    }
    running++;
}

export function release() {
    running--;
}

export function getRunning() {
    return running;
}
