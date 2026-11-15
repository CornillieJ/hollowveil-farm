import * as THREE from 'three';

import type { PickupManager } from '../game/pickups';

//#region Drops

/**
 * Things put down in the world stay where they lie until picked up again,
 * also after a reload. Pass `drop` to an inventory screen's `onDrop` and what
 * is dragged out of the window lands in front of the player.
 *
 * ```ts
 * const drops = addDrops(game, { pickups: world.pickups, name: (id) => registry.get(id)?.name, persist: 'drops' });
 * addPack(game, { ..., onDrop: drops.drop });
 * drops.lay({ itemId: 'key', amount: 1, x: 4, y: 0.4, z: -2 });
 * ```
 */
export type Drop = { itemId: string; amount: number; x: number; y: number; z: number };

export type AddDropsOptions = {
    pickups: PickupManager;
    /** The item's name for the prompt, or undefined for an item the game no longer knows (it is skipped on load). */
    name: (itemId: string) => string | undefined;
    /** Save key. Omit to keep drops for this visit only. */
    persist?: string;
    /** How far in front of the player a dropped thing lands. Default 1.3. */
    reach?: number;
    color?: number;
    size?: number;
};

export type DropsHandle = {
    /** Put something down in front of the player. */
    drop: (itemId: string, amount: number) => void;
    /** Put something down at a given spot. */
    lay: (drop: Drop) => void;
    /** Take everything off the ground. */
    clear: () => void;
    /** What lies about now. */
    readonly lying: Drop[];
};

export function addDrops(game: Game, options: AddDropsOptions): DropsHandle {
    const drops = new Map<THREE.Object3D, Drop>();
    const lay = (drop: Drop): void => {
        const name = options.name(drop.itemId);
        if (name === undefined) return;
        const pickup = options.pickups.spawn({
            position: new THREE.Vector3(drop.x, drop.y, drop.z),
            itemId: drop.itemId,
            amount: drop.amount,
            collect: 'interact',
            prompt: `Pick up ${drop.amount > 1 ? `${drop.amount} ` : ''}${name.toLowerCase()}`,
            color: options.color ?? 0xd8c8a0,
            size: options.size ?? 0.22,
            onCollect: (_game, object) => drops.delete(object),
        });
        drops.set(pickup, drop);
    };
    const clear = (): void => {
        for (const pickup of drops.keys()) options.pickups.remove(pickup);
        drops.clear();
    };
    if (options.persist) {
        game.save.register(options.persist, {
            save: (): Drop[] => [...drops.values()],
            load: (data) => {
                clear();
                for (const drop of Array.isArray(data) ? (data as Drop[]) : []) lay(drop);
            },
        });
    }
    return {
        drop: (itemId, amount) => {
            const player = game.player;
            if (!player) return;
            const yaw = player.root.rotation.y;
            const reach = options.reach ?? 1.3;
            // At the player's own height: the ground is not always what is underfoot.
            lay({ itemId, amount, x: player.position.x + Math.sin(yaw) * reach, y: player.position.y + 0.45, z: player.position.z + Math.cos(yaw) * reach });
        },
        lay,
        clear,
        get lying() {
            return [...drops.values()];
        },
    };
}

//#endregion Drops
