import * as THREE from 'three';

import { registerIcons } from '../ui/icons';

//#region Portraits

/**
 * Faces for the talk box, taken from the models themselves.
 *
 * `takePortrait` stands a character alone in an empty, lit room for one frame,
 * photographs the head and registers the picture as the icon `face-<id>`. So a
 * portrait always matches what walks about, and a new character needs no
 * drawing. Call it again once a model has finished loading.
 *
 * ```ts
 * takePortrait(game, 'barnaby', { root: rig.root, head: rig.head });
 * dialogue.say([{ text: 'Hello.', portrait: ':face-barnaby:' }]);
 * ```
 */
export type PortraitOptions = {
    /** Pixels, square. Default 96. */
    size?: number;
    background?: number;
};

export function takePortrait(game: Game, id: string, rig: { root: THREE.Object3D; head: THREE.Object3D }, options: PortraitOptions = {}): void {
    const size = options.size ?? 96;
    const { root } = rig;
    const home = { parent: root.parent, position: root.position.clone(), rotation: root.rotation.clone(), visible: root.visible };
    const room = new THREE.Scene();
    room.background = new THREE.Color(options.background ?? 0x1c241d);
    room.add(new THREE.HemisphereLight(0xf2f2e8, 0x2a3028, 2.2));
    const key = new THREE.DirectionalLight(0xfff0d0, 2.4);
    key.position.set(1.5, 2, 3);
    room.add(key);

    room.add(root);
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.visible = true;
    root.updateMatrixWorld(true);

    const head = new THREE.Box3().setFromObject(rig.head);
    const centre = head.getCenter(new THREE.Vector3());
    const reach = Math.max(head.max.x - head.min.x, head.max.y - head.min.y) * 0.72;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    camera.position.copy(centre).add(new THREE.Vector3(0.28, 0.06, 1).normalize().multiplyScalar((reach * 0.86) / Math.tan((15 * Math.PI) / 180)));
    camera.lookAt(centre);

    const target = new THREE.WebGLRenderTarget(size, size);
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const before = game.renderer.getRenderTarget();
    game.renderer.setRenderTarget(target);
    game.renderer.render(room, camera);
    const pixels = new Uint8Array(size * size * 4);
    game.renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    game.renderer.setRenderTarget(before);
    target.dispose();

    // Back where they were, before anybody sees.
    if (home.parent) home.parent.add(root);
    else root.removeFromParent();
    root.position.copy(home.position);
    root.rotation.copy(home.rotation);
    root.visible = home.visible;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return;
    const image = context.createImageData(size, size);
    // The frame is read bottom row first.
    for (let row = 0; row < size; row += 1) image.data.set(pixels.subarray((size - 1 - row) * size * 4, (size - row) * size * 4), row * size * 4);
    context.putImageData(image, 0, 0);
    registerIcons({ [`face-${id}`]: { image: canvas.toDataURL() } });
}

//#endregion Portraits
