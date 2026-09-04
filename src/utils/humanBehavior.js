/**
 * src/utils/humanBehavior.js
 * 
 * Lightweight, zero-CPU human behavior simulation using pre-calculated
 * realistic micro-movements and randomized interaction pauses.
 */

const OFFSETS = [
    { x: 2, y: -1, delay: 40 },
    { x: -2, y: 2, delay: 55 },
    { x: 3, y: 1, delay: 35 },
    { x: -1, y: -2, delay: 65 },
    { x: 1, y: 3, delay: 45 },
    { x: -3, y: 1, delay: 70 },
    { x: 2, y: 2, delay: 50 },
    { x: -2, y: -1, delay: 60 }
];

/**
 * Simulates a human-like cursor approach and click on a locator
 * @param {import('playwright').Page} page 
 * @param {import('playwright').Locator} locator 
 */
async function humanClick(page, locator) {
    try {
        const box = await locator.boundingBox();
        if (!box) {
            return await locator.click();
        }

        const offset = OFFSETS[Math.floor(Math.random() * OFFSETS.length)];
        const targetX = box.x + (box.width / 2) + offset.x;
        const targetY = box.y + (box.height / 2) + offset.y;

        // Micro-movement towards element
        await page.mouse.move(targetX, targetY, { steps: 5 });
        await new Promise(r => setTimeout(r, offset.delay));

        await locator.click();

        // Natural human reaction pause after clicking
        const postPause = Math.floor(Math.random() * 300) + 200;
        await new Promise(r => setTimeout(r, postPause));
    } catch (err) {
        // Fallback gracefully to direct click
        await locator.click();
    }
}

module.exports = { humanClick };
