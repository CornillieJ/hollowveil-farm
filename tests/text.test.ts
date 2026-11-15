import assert from 'node:assert/strict';

import { fill } from '../src/scripts/kit/thoughts';
import { swapWords } from '../src/scripts/kit/wording';

{
    // Slots are filled by name; unknown slots stay as written.
    assert.deepEqual(fill(['{days} days gone, {who}.', 'No slots.'], { days: 2 }), ['2 days gone, {who}.', 'No slots.']);
}

{
    // Swaps apply in order, so a longer phrase listed first wins over a shorter one inside it.
    const swaps: Array<[RegExp, string]> = [
        [/\bHold E\b/g, 'Hold :hand:'],
        [/\bPress E\b/g, 'Tap :hand:'],
        [/\bE\b/g, ':hand:'],
    ];
    assert.equal(swapWords('Press E, or Hold E.', swaps), 'Tap :hand:, or Hold :hand:.');
    assert.equal(swapWords('Nothing to press.', swaps), 'Nothing to press.');
}
