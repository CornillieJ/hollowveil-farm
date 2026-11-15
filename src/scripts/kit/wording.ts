//#region Wording

/**
 * The same instructions, said for thumbs.
 *
 * Write every line once, for a keyboard ("Press E at the door"). On a touch
 * screen the keys it names are swapped for the buttons on the screen. The
 * game gives the swaps; put longer phrases first so they win over the short
 * ones inside them.
 *
 * ```ts
 * const say = addWording(game, [[/\bPress E\b/g, 'Tap :hand:'], [/\bTab\b/g, ':bag:']]);
 * toasts.push(say('Press E to open'));
 * ```
 */
export type WordSwap = [from: RegExp, to: string];

/** Apply every swap, in order. */
export function swapWords(text: string, swaps: readonly WordSwap[]): string {
    return swaps.reduce((line, [from, to]) => line.replace(from, to), text);
}

/** A function that rewords a line on a touch screen and leaves it as written anywhere else. */
export function addWording(game: Game, swaps: readonly WordSwap[]): (text: string) => string {
    return game.device.touch ? (text) => swapWords(text, swaps) : (text) => text;
}

//#endregion Wording
