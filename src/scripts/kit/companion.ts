import * as THREE from 'three';

//#region Companion

/**
 * An animal that follows the player: a dog, a cat, a crow on foot.
 *
 * It keeps a step behind and to one side, catches up at a run, and is simply
 * there again when left far behind (a fall, a door, a fast vehicle). It can be
 * petted, and the first petting each day can be a gift. Give it a `threat`
 * and it is also a warning: it stands stiff facing the nearest danger,
 * flashes a mark over its head and calls `onAlert` every few seconds.
 *
 * ```ts
 * const dog = addCompanion(game, {
 *     ground: (x, z) => terrain.height(x, z),
 *     threat: (at, within) => world.enemies.nearest(at, within)?.root.position,
 *     here: () => day >= 2,
 *     onPet: (at, { first, gift }) => { if (gift) give('stick', 1); },
 *     persist: 'dog',
 * });
 * ```
 *
 * Without an `object` it builds a plain box dog (`buildDog`). A model of your
 * own animates too if you hand over its `legs`, `tail` and `head`.
 */
export type CompanionParts = {
    root: THREE.Object3D;
    /** Swung front-left with back-right, like a trot. */
    legs?: THREE.Object3D[];
    tail?: THREE.Object3D;
    head?: THREE.Object3D;
    /** Shown, blinking, while it senses a threat. */
    mark?: THREE.Object3D;
};

export type AddCompanionOptions = {
    parts?: CompanionParts;
    ground: (x: number, z: number) => number;
    /** Where the nearest danger is, if any is within `within` of it. */
    threat?: (position: THREE.Vector3, within: number) => THREE.Vector3 | undefined;
    /** How far it senses a threat. Default 24. */
    nose?: number;
    /** False while the player is somewhere nothing can come: it stops watching. */
    wary?: () => boolean;
    /** False until it has turned up. Default: always there. */
    here?: () => boolean;
    onArrive?: () => void;
    /** Called while alert, every `alertEvery` seconds (default 3.5). A growl, a bark. */
    onAlert?: () => void;
    alertEvery?: number;
    /** Omit to make it unpettable. */
    pet?: { prompt?: string; range?: number };
    /** `first` is the first petting ever; `gift` the first on this day. */
    onPet?: (position: THREE.Vector3, info: { first: boolean; gift: boolean }) => void;
    /** The current day, for the daily gift. */
    day?: () => number;
    /** Save key for how often it was petted. */
    persist?: string;
    /** Where it walks, relative to the player's facing: `back` behind, `side` to the right. */
    offset?: { back: number; side: number };
    /** Top speed when catching up. Default 13. */
    speed?: number;
};

export type CompanionHandle = {
    readonly object: THREE.Object3D;
    readonly alert: boolean;
    readonly pets: number;
};

/** A small box dog with legs, tail, head and an alert mark. */
export function buildDog(colors: { coat?: number; dark?: number; mark?: number } = {}): Required<CompanionParts> {
    const coat = new THREE.MeshStandardMaterial({ color: colors.coat ?? 0x8a7a66, roughness: 1, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: colors.dark ?? 0x3a3028, roughness: 1, flatShading: true });
    const root = new THREE.Group();
    root.name = 'companion';
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.72), coat);
    body.position.y = 0.46;
    const head = new THREE.Group();
    head.position.set(0, 0.66, 0.4);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.28), coat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.2), dark);
    snout.position.set(0, -0.05, 0.2);
    head.add(skull, snout);
    for (const x of [-0.1, 0.1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), dark);
        ear.position.set(x, 0.19, -0.04);
        head.add(ear);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x0a0806 }));
        eye.position.set(x * 0.8, 0.03, 0.145);
        head.add(eye);
    }
    const legs = [
        [-0.1, 0.26],
        [0.1, 0.26],
        [-0.1, -0.26],
        [0.1, -0.26],
    ].map(([x, z]) => {
        const hip = new THREE.Group();
        hip.position.set(x as number, 0.34, z as number);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.09), dark);
        leg.position.y = -0.17;
        hip.add(leg);
        return hip;
    });
    const tail = new THREE.Group();
    tail.position.set(0, 0.58, -0.36);
    const bone = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), coat);
    bone.position.set(0, 0.08, -0.12);
    bone.rotation.x = 0.7;
    tail.add(bone);
    const mark = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 4), new THREE.MeshBasicMaterial({ color: colors.mark ?? 0xff5a48 }));
    mark.rotation.x = Math.PI;
    mark.position.y = 1.25;
    mark.visible = false;
    root.add(body, head, tail, mark, ...legs);
    return { root, legs, tail, head, mark };
}

export function addCompanion(game: Game, options: AddCompanionOptions): CompanionHandle {
    const parts = options.parts ?? buildDog();
    const root = parts.root;
    const here = options.here ?? (() => true);
    const nose = options.nose ?? 24;
    const offset = options.offset ?? { back: 1.5, side: 1.1 };
    const top = options.speed ?? 13;
    root.visible = false;
    game.scene.add(root);
    let arrived = false;
    let pets = 0;
    let giftDay = -1;
    let alert = false;
    let stride = 0;
    let alertIn = 0;
    const to = new THREE.Vector3();
    const want = new THREE.Vector3();

    if (options.pet) {
        game.interactions.add(root, {
            prompt: options.pet.prompt ?? 'Pet',
            range: options.pet.range ?? 1.8,
            enabled: false,
            onInteract: () => {
                pets += 1;
                const today = options.day?.() ?? 0;
                const gift = giftDay !== today;
                giftDay = today;
                options.onPet?.(root.position.clone().setY(root.position.y + 0.9), { first: pets === 1, gift });
            },
        });
    }

    game.systems.add({
        name: 'companion',
        update: (delta) => {
            const player = game.player;
            if (!player) return;
            if (!here()) {
                // A new game on the same page: it has not turned up yet.
                arrived = false;
                root.visible = false;
                if (options.pet) game.interactions.setEnabled(root, false);
                return;
            }
            const position = root.position;
            if (!arrived) {
                arrived = true;
                root.visible = true;
                position.set(player.position.x + 1.6, player.position.y, player.position.z + 1.2);
                if (options.pet) game.interactions.setEnabled(root, true);
                if (pets === 0) options.onArrive?.();
            }
            const facing = player.root.rotation.y;
            want.set(player.position.x - Math.sin(facing) * offset.back + Math.cos(facing) * offset.side, 0, player.position.z - Math.cos(facing) * offset.back - Math.sin(facing) * offset.side);
            to.set(want.x - position.x, 0, want.z - position.z);
            const gap = to.length();
            if (gap > 22 || Math.abs(player.position.y - position.y) > 6) {
                position.set(want.x, player.position.y, want.z);
                return;
            }
            const foe = options.threat && (options.wary?.() ?? true) ? options.threat(position, nose) : undefined;
            alert = foe !== undefined;
            if (parts.mark) parts.mark.visible = alert && Math.floor(performance.now() / 350) % 2 === 0;
            let speed = 0;
            if (gap > (alert ? 3.2 : 0.7)) {
                speed = Math.min(top, 2 + gap * 2.2);
                position.addScaledVector(to.normalize(), Math.min(gap, speed * delta));
            }
            const floor = options.ground(position.x, position.z);
            // Indoors the ground under the map is not the floor: stay level with the player.
            position.y = Math.abs(floor - player.position.y) > 3 ? player.position.y : floor;
            const look = foe ? Math.atan2(foe.x - position.x, foe.z - position.z) : speed > 0.2 ? Math.atan2(to.x, to.z) : Math.atan2(player.position.x - position.x, player.position.z - position.z);
            let turn = look - root.rotation.y;
            turn = Math.atan2(Math.sin(turn), Math.cos(turn));
            root.rotation.y += turn * Math.min(1, delta * 9);
            stride += delta * (4 + speed * 2.4);
            const swing = speed > 0.2 ? Math.sin(stride) * Math.min(0.9, 0.3 + speed * 0.08) : 0;
            parts.legs?.forEach((leg, index) => (leg.rotation.x = index % 3 === 0 ? swing : -swing));
            // Stiff when alert; otherwise the tail says how it feels about you.
            if (parts.tail) parts.tail.rotation.y = alert ? 0 : Math.sin(performance.now() / (speed > 0.2 ? 90 : 160)) * 0.7;
            if (parts.head) parts.head.rotation.x = alert ? 0.2 : speed > 0.2 ? 0 : -0.15;
            alertIn -= delta;
            if (alert && alertIn <= 0) {
                alertIn = options.alertEvery ?? 3.5;
                options.onAlert?.();
            }
        },
    });

    if (options.persist) {
        game.save.register(options.persist, {
            save: () => ({ pets, giftDay }),
            load: (data) => {
                const saved = (typeof data === 'object' && data ? data : {}) as { pets?: number; giftDay?: number };
                pets = saved.pets ?? 0;
                giftDay = saved.giftDay ?? -1;
            },
        });
    }

    return {
        object: root,
        get alert() {
            return alert;
        },
        get pets() {
            return pets;
        },
    };
}

//#endregion Companion
