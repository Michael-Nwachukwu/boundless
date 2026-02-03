// Basic Blockies generator adapted for TypeScript
// Generates a data URI for a blocky based on the address

function randseed(seed: number[]) {
    let n = 0xefc8ce08;
    for (let i = 0; i < seed.length; i++) {
        n = (n ^ seed[i]) | 0; // standard 32 bit xor
        n = Math.imul(n, 0xee53a45a); // basic 32 bit multiply
        n = (n ^ (n >>> 13)) | 0;
        n = Math.imul(n, 0x22f2df34);
        n = (n ^ (n >>> 1)) | 0;
    }
    return ((n >>> 0) / 4294967296);
}

function createColor(seed: number[]) {
    const h = Math.floor(randseed(seed) * 360);
    const s = ((randseed(seed) * 60) + 40) + '%';
    const l = ((randseed(seed) * 40) + 40) + '%';
    return 'hsl(' + h + ',' + s + ',' + l + ')';
}

function createImageData(size: number) {
    const width = size;
    const height = size;

    const dataWidth = Math.ceil(width / 2);
    const mirrorWidth = width - dataWidth;

    const data = [];
    for (let y = 0; y < height; y++) {
        let row = [];
        for (let x = 0; x < dataWidth; x++) {
            row[x] = Math.floor(randseed([x, y]) * 2.3);
        }
        let r = row.slice(0, mirrorWidth);
        r.reverse();
        row = row.concat(r);
        for (let i = 0; i < row.length; i++) {
            data.push(row[i]);
        }
    }
    return data;
}

export function createBlockies(address: string) {
    const seed = address.toLowerCase().split('').map(x => x.charCodeAt(0));

    // Random function context
    let seedIdx = 0;
    const rand = () => {
        seedIdx++;
        return randseed(seed.concat([seedIdx]));
    };

    const color = createColor(seed.concat([88]));
    const bgColor = createColor(seed.concat([11]));
    const spotColor = createColor(seed.concat([99]));

    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 8, 8);

    ctx.fillStyle = color;

    // Generate data
    // We need to re-implement randseed based usage for image data
    // tailored to this specific instance to simulate the original blockies
    // strictly speaking, the original blockies library logic is slightly more complex stateful rand
    // but for our purpose, a simple deterministic hash-to-grid is sufficient if consistent.
    // Let's use a simplified approach for the grid that looks good.

    for (let i = 0; i < 64; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;

        // Mirror logic
        const dataCol = col < 4 ? col : 7 - col;

        // Deterministic random based on address + position
        const isColored = randseed(seed.concat([row, dataCol])) < 0.5;

        if (isColored) {
            ctx.fillStyle = (randseed(seed.concat([row, dataCol, 1])) < 0.3) ? spotColor : color;
            ctx.fillRect(col, row, 1, 1);
        }
    }

    return canvas.toDataURL();
}
