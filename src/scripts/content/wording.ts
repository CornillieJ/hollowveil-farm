import { swapWords, type WordSwap } from '../kit';

/**
 * What a line written for a keyboard says on a phone instead. Longest phrase
 * first, so it wins over the short ones inside it. Used through `addWording`.
 */
export const THUMB_SWAPS: WordSwap[] = [
    [/Walk with WASD, look with the mouse[,.] [Hh]old Shift to run\./g, 'Walk with the stick on the left, drag the screen to look, hold :run: to run.'],
    [/WASD to walk, E to interact, F to use what you hold, 1 to 8 to pick it, Tab for the bag, J for the notebook/g, 'Stick to walk, :hand: to interact, :use: to use what you hold, :bag: for the bag, :notebook: for the notebook'],
    [/W pedals, A and D steer, E gets off/g, 'the stick pedals and steers, :hand: gets off'],
    [/W pedals, A and D steer/g, 'The stick pedals and steers'],
    [/pick one with 1 to 8 or the wheel, press F to use it\. Tab opens the backpack: drag things between it and the pockets, drag them out of the window to drop them, click one for more\./g, 'tap the round button with what you hold on it to open them, tap one to hold it, tap :use: to use it. :bag: opens the backpack: tap a thing there for what can be done with it.'],
    [/Press J for the list/g, ':notebook: opens the list'],
    [/Tab opens/g, ':bag: opens'],
    [/\bHold E\b/g, 'Hold :hand:'],
    [/\bhold E\b/g, 'hold :hand:'],
    [/\bPress E\b/g, 'Tap :hand:'],
    [/\bpress E\b/g, 'tap :hand:'],
    [/\bPress F\b/g, 'Tap :use:'],
    [/\bpress F\b/g, 'tap :use:'],
    [/\bwith F\b/g, 'with :use:'],
];

/** A line as a phone shows it. */
export const forThumbs = (text: string): string => swapWords(text, THUMB_SWAPS);
