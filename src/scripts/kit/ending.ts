import { div } from '../helpers/dom';

//#region Ending

/**
 * An ending, told a card at a time.
 *
 * The screen closes over the game and the last of the story is read one card
 * per key press or tap: a large picture (an icon or a glyph) and a sentence.
 * A final card adds up what the player did. The game is held still underneath
 * until the last button is pressed.
 *
 * ```ts
 * const ending = addEnding(game);
 * await ending.play({ theme: 'dawn', title: 'You got out', slides: [{ picture: ':sun:', text: 'Morning.' }], tally: [{ label: 'Days', value: '12' }], button: 'Main menu' });
 * ```
 *
 * The base look is in `style.css` under `.ending`. A game colours each theme
 * with `.ending.is-<theme>.is-open { background; color }`.
 */
export type EndingSlide = {
    /** One or two glyphs or `:icon:` names, drawn large. */
    picture: string;
    text: string;
};

export type EndingPlayOptions = {
    /** Added to the overlay as `is-<theme>`, for colouring. */
    theme?: string;
    title: string;
    slides: EndingSlide[];
    /** Lines for the last card, e.g. days lived. */
    tally?: Array<{ label: string; value: string }>;
    /** The picture on the last card. Default: the first slide's. */
    closing?: string;
    /** What the button on the last card says. */
    button: string;
};

export type EndingHandle = {
    /** True while an ending is on the screen. */
    readonly playing: boolean;
    /** Show an ending. Resolves when the last button is pressed. */
    play: (options: EndingPlayOptions) => Promise<void>;
    /** Go to the next card, or press the last button. For tests. */
    next: () => void;
};

export function addEnding(game: Game): EndingHandle {
    const root = div('ending is-hidden');
    game.screens.layer('overlay').appendChild(root);
    const card = div('ending-card', undefined, root);
    const picture = div('ending-picture', '', card);
    const title = div('ending-title', '', card);
    const text = div('ending-text', '', card);
    const tally = div('ending-tally', undefined, card);
    const hint = div('ending-hint', '', card);
    const button = document.createElement('button');
    button.className = 'menu-button is-primary ending-button';
    card.appendChild(button);

    let advance: (() => void) | undefined;
    let theme = '';
    const press = (): void => advance?.();
    root.addEventListener('pointerdown', (event) => {
        if (event.target !== button) press();
    });
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        press();
    });
    // Capture phase: nothing typed during an ending reaches the game underneath.
    window.addEventListener(
        'keydown',
        (event) => {
            if (!advance) return;
            event.stopPropagation();
            event.preventDefault();
            if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') press();
        },
        true,
    );

    const play = (options: EndingPlayOptions): Promise<void> =>
        new Promise((resolve) => {
            game.time.setPaused(root, true);
            game.screens.show('overlay', root);
            root.classList.remove('is-hidden', 'is-open');
            if (theme) root.classList.remove(`is-${theme}`);
            theme = options.theme ?? '';
            if (theme) root.classList.add(`is-${theme}`);
            // The next frame, so the closing-over is a transition and not a cut.
            requestAnimationFrame(() => root.classList.add('is-open'));
            let index = -1;
            const show = (): void => {
                index += 1;
                const slide = options.slides[index];
                card.classList.remove('is-in');
                void card.offsetWidth;
                card.classList.add('is-in');
                if (slide) {
                    picture.textContent = slide.picture;
                    title.textContent = index === 0 ? options.title : '';
                    text.textContent = slide.text;
                    tally.replaceChildren();
                    hint.textContent = game.device.touch ? 'tap' : 'space';
                    button.classList.add('is-hidden');
                    return;
                }
                if (index === options.slides.length) {
                    picture.textContent = options.closing ?? options.slides[0]?.picture ?? '';
                    title.textContent = options.title;
                    text.textContent = '';
                    tally.replaceChildren();
                    for (const line of options.tally ?? []) {
                        const row = div('ending-tally-row', undefined, tally);
                        div('ending-tally-label', line.label, row);
                        div('ending-tally-value', line.value, row);
                    }
                    hint.textContent = '';
                    button.textContent = options.button;
                    button.classList.remove('is-hidden');
                    return;
                }
                advance = undefined;
                root.classList.remove('is-open');
                root.classList.add('is-hidden');
                game.screens.hide('overlay', root);
                game.time.setPaused(root, false);
                resolve();
            };
            advance = show;
            show();
        });

    return {
        get playing() {
            return advance !== undefined;
        },
        play,
        next: press,
    };
}

//#endregion Ending
