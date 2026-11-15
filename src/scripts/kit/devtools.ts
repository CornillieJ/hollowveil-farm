//#region Dev tools

/**
 * A hidden menu of shortcuts for trying things out. Typing the code (`devmode`
 * by default) into the settings code field turns it on: it is remembered on
 * this machine, and a "Dev tools" entry shows in the pause menu. `devmode off`
 * hides it again.
 *
 * ```ts
 * const dev = addDevTools(game, { namespace: 'my-game', actions: [{ label: 'Heal', run: () => game.player?.heal(999) }] });
 * const settings = addSettings(game, { namespace: 'my-game', console: dev.code, ... });
 * game.menus.register('pause', { title: 'Paused', buttons: [resume, settings.button, dev.button] });
 * ```
 */
export type DevAction = { label: string; run: () => void };

export type AddDevToolsOptions = {
    /** Storage prefix, usually the game's settings namespace. */
    namespace: string;
    actions: DevAction[];
    /** The word that turns it on. `<word> off` turns it off. Default `devmode`. */
    word?: string;
    title?: string;
    /** Say which shortcut ran. Default true. */
    announce?: boolean;
};

export type DevToolsHandle = {
    readonly on: boolean;
    /** Give this to `addSettings` as its `console`. */
    code: (text: string) => string;
    open: () => void;
    /** A menu entry, shown only while dev mode is on. */
    readonly button: { label: string; action: () => void; visible: () => boolean };
};

export function addDevTools(game: Game, options: AddDevToolsOptions): DevToolsHandle {
    const key = `${options.namespace}:devmode`;
    const word = (options.word ?? 'devmode').toLowerCase();
    const title = options.title ?? 'Dev tools';
    const menu = 'dev-tools';
    let on = false;
    try {
        on = window.localStorage.getItem(key) === '1';
    } catch {
        on = false;
    }
    let returnTo: string | undefined;
    const back = (): void => (returnTo ? game.menus.show(returnTo) : game.menus.hide(menu));
    game.menus.register(menu, {
        title,
        buttons: [
            ...options.actions.map((action) => ({
                label: action.label,
                action: () => {
                    action.run();
                    if (options.announce !== false) game.toasts.push(`Dev: ${action.label.toLowerCase()}`, { color: '#ffe14a' });
                },
            })),
            { label: 'Back', primary: true, action: back },
        ],
    });
    const open = (): void => {
        returnTo = game.menus.openMenu === menu ? returnTo : game.menus.openMenu;
        game.menus.show(menu);
    };
    const remember = (value: boolean): void => {
        on = value;
        try {
            window.localStorage.setItem(key, value ? '1' : '0');
        } catch {
            // A private window may refuse storage: it still works for this visit.
        }
    };
    return {
        get on() {
            return on;
        },
        code: (text) => {
            const code = text.trim().toLowerCase();
            if (code === word) {
                remember(true);
                open();
                return `Dev mode is on. "${title}" is in the pause menu.`;
            }
            if (code === `${word} off`) {
                remember(false);
                return 'Dev mode is off.';
            }
            return code ? 'Unknown code' : '';
        },
        open,
        button: { label: title, action: open, visible: () => on },
    };
}

//#endregion Dev tools
