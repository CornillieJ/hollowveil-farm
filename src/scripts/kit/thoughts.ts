import type { NarrationHandle } from './story';

//#region Thoughts

/**
 * Lines said once, the first time something happens: "That's the well.",
 * "Something moved in the trees." Each has an id, and an id is only ever
 * spoken once per game. The ids already spoken are saved.
 *
 * ```ts
 * const thoughts = addThoughts(game, { narration, lines: THOUGHTS, persist: 'thoughts' });
 * thoughts.think('well');                       // the lines in THOUGHTS.well
 * thoughts.think('late', ['Somebody else\'s line.']);
 * if (thoughts.has('note')) ...
 * ```
 *
 * `fill` puts values into `{name}` slots, for lines kept as plain text:
 * `fill(['{days} days gone.'], { days: 2 })`.
 */
export function fill(lines: readonly string[], values: Record<string, string | number>): string[] {
    return lines.map((line) => line.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot)));
}

export type AddThoughtsOptions = {
    narration: NarrationHandle;
    /** Lines by id. */
    lines?: Record<string, string[]>;
    /** Save key for the ids already spoken. Omit to save them yourself through `said`. */
    persist?: string;
    /** Only think while this is true. Default: while the game is playing. */
    when?: () => boolean;
    /** Applied to every line before it is spoken, for instance `addWording`. */
    word?: (line: string) => string;
};

export type ThoughtsHandle = {
    /** Speak the lines for `id`, unless it has been spoken before. Returns true if it was spoken now. */
    think: (id: string, lines?: readonly string[]) => boolean;
    has: (id: string) => boolean;
    /** Mark an id as spoken without saying it. */
    mark: (id: string) => void;
    /** Every id spoken so far. */
    readonly said: Set<string>;
};

export function addThoughts(game: Game, options: AddThoughtsOptions): ThoughtsHandle {
    const said = new Set<string>();
    const when = options.when ?? (() => game.state.is('playing'));
    if (options.persist) {
        game.save.register(options.persist, {
            save: () => [...said],
            load: (data) => {
                said.clear();
                for (const id of Array.isArray(data) ? data : []) if (typeof id === 'string') said.add(id);
            },
        });
    }
    return {
        think: (id, lines = options.lines?.[id]) => {
            if (!lines || said.has(id) || !when()) return false;
            said.add(id);
            void options.narration.speak(options.word ? lines.map(options.word) : [...lines]);
            return true;
        },
        has: (id) => said.has(id),
        mark: (id) => void said.add(id),
        said,
    };
}

//#endregion Thoughts
