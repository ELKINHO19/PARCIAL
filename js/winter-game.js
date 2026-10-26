import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const overlay = document.querySelector('#game-overlay');
const startButton = document.querySelector('#start-button');
const gameError = document.querySelector('#game-error');
const overlayBadge = document.querySelector('#overlay-badge');
const overlayTitle = document.querySelector('#overlay-title');
const overlayDescription = document.querySelector('#overlay-description');
const waveCountElement = document.querySelector('#wave-count');
const killCountElement = document.querySelector('#kill-count');
const healthCountElement = document.querySelector('#health-count');
const enemyCountElement = document.querySelector('#enemy-count');
const weaponNameElement = document.querySelector('#weapon-name');
const ammoDisplay = document.querySelector('#ammo-display');
const ammoCountElement = document.querySelector('#ammo-count');
const grenadeCountElement = document.querySelector('#grenade-count');
const grappleHud = document.querySelector('#grapple-hud');
const grappleProgress = document.querySelector('#grapple-progress');
const grappleCountElement = document.querySelector('#grapple-count');

const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc98968, roughness: 0.78 });
const furMaterial = new THREE.MeshStandardMaterial({ color: 0xf1f6f6, roughness: 0.92 });

function addMesh(parent, geometry, material, position, rotation = null) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
}

function makeCapsule(radius, length) {
    return new THREE.CapsuleGeometry(radius, length, 4, 8);
}

class PlayerController {
    constructor(camera) {
        this.camera = camera;
        this.position = new THREE.Vector3(0, 0, 8);
        this.keys = new Set();
        this.yaw = 0;
        this.pitch = 0;
        this.speed = 6.5;
        this.jumpVelocity = 0;
        this.jumpRequested = false;
        this.health = 20;
        this.maxHealth = 20;
        this.zoomRequested = false;
        this.zoomAmount = 0;
        this.weapon = 'gun';
        this.hasUzi = false;
        this.uziAmmo = 0;
        this.uziReserve = 0;
        this.reloadRemaining = 0;
        this.reloadDuration = 1.4;
        this.grenades = 0;
        this.fireHeld = false;
        this.fireCooldown = 0;
        this.grapple = null;
        this.alive = true;
        this.thirdPerson = false;
        this.inSuplex = false;
        this.danceRemaining = 0;
        this.danceTime = 0;
        this.danceWalkTime = 0;
        this.punches = { left: 0, right: 0 };
        this.gunRecoil = 0;
        this.fatigueRemaining = 0;
        this.fatigueDuration = 0;
        this.root = new THREE.Group();
        this.sceneModel = new THREE.Group();
        this.root.add(this.sceneModel);
        this.createModel();
        this.createFirstPersonHands();
        this.root.visible = false;
        this.camera.rotation.order = 'YXZ';
        this.camera.fov = 75;
        this.camera.position.set(this.position.x, 1.85, this.position.z - 0.2);
        this.camera.updateProjectionMatrix();

        window.addEventListener('keydown', (event) => {
            if (this.inGrapple) return;
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
                if (event.code === 'Space' && document.pointerLockElement === canvas) {
                    event.preventDefault();
                    if (!event.repeat) this.jumpRequested = true;
                }
                this.keys.add(event.code);
            }
        });
        window.addEventListener('keyup', (event) => this.keys.delete(event.code));
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement !== canvas || !this.alive || this.inSuplex) return;
            this.yaw -= event.movementX * 0.002;
            this.pitch = THREE.MathUtils.clamp(
                this.pitch - event.movementY * 0.0016,
                -0.45,
                0.65
            );
        });
    }

    createModel() {
        const coat = new THREE.MeshStandardMaterial({ color: 0x304c61, roughness: 0.95 });
        const trim = new THREE.MeshStandardMaterial({ color: 0xbad6df, roughness: 0.85 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x1c2a35, roughness: 1 });
        const boots = new THREE.MeshStandardMaterial({ color: 0x302c2b, roughness: 1 });

        addMesh(this.sceneModel, new THREE.BoxGeometry(0.82, 0.9, 0.48), coat, [0, 1.12, 0]);
        addMesh(this.sceneModel, new THREE.SphereGeometry(0.29, 14, 12), trim, [0, 1.65, 0.02]);
        addMesh(this.sceneModel, new THREE.SphereGeometry(0.23, 14, 12), skinMaterial, [0, 1.91, -0.015]);
        addMesh(this.sceneModel, new THREE.SphereGeometry(0.27, 12, 10), coat, [0, 1.97, 0.09]);
        addMesh(this.sceneModel, new THREE.BoxGeometry(0.07, 0.07, 0.04), dark, [-0.085, 1.94, -0.23]);
        addMesh(this.sceneModel, new THREE.BoxGeometry(0.07, 0.07, 0.04), dark, [0.085, 1.94, -0.23]);

        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.5, 1.42, -0.03);
        this.sceneModel.add(this.leftArm);
        this.leftArmSegment = addMesh(this.leftArm, makeCapsule(0.13, 0.5), coat, [0, -0.3, 0]);
        addMesh(this.leftArm, new THREE.SphereGeometry(0.14, 10, 8), skinMaterial, [0, -0.61, -0.02]);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.5, 1.42, -0.03);
        this.sceneModel.add(this.rightArm);
        this.rightArmSegment = addMesh(this.rightArm, makeCapsule(0.13, 0.5), coat, [0, -0.3, 0]);
        this.rightFist = addMesh(
            this.rightArm,
            new THREE.SphereGeometry(0.14, 10, 8),
            skinMaterial,
            [0, -0.61, -0.02]
        );
        this.rightFist.visible = false;

        this.gunHand = new THREE.Group();
        this.gunHand.position.set(0, -0.63, -0.03);
        this.rightArm.add(this.gunHand);
        this.gunHand.visible = true;

        const sleeve = new THREE.MeshStandardMaterial({ color: 0x243d52, roughness: 0.9 });
        addMesh(this.gunHand, new THREE.BoxGeometry(0.19, 0.16, 0.17), sleeve, [0, -0.08, 0.12]);
        addMesh(this.gunHand, new THREE.BoxGeometry(0.16, 0.13, 0.2), skinMaterial, [0, 0, 0]);
        addMesh(this.gunHand, new THREE.BoxGeometry(0.065, 0.065, 0.36), skinMaterial, [0.015, 0.035, -0.24]);
        addMesh(this.gunHand, new THREE.BoxGeometry(0.06, 0.055, 0.15), skinMaterial, [-0.045, -0.035, -0.13]);
        addMesh(this.gunHand, new THREE.BoxGeometry(0.06, 0.055, 0.14), skinMaterial, [0.025, -0.04, -0.12]);
        addMesh(
            this.gunHand,
            new THREE.BoxGeometry(0.07, 0.17, 0.09),
            skinMaterial,
            [0.12, 0.1, -0.015],
            [0, 0, -0.55]
        );

        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.21, 0.65, 0);
        this.sceneModel.add(this.leftLeg);
        addMesh(this.leftLeg, makeCapsule(0.15, 0.58), dark, [0, -0.28, 0]);
        addMesh(this.leftLeg, new THREE.BoxGeometry(0.28, 0.16, 0.38), boots, [0, -0.62, -0.07]);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.21, 0.65, 0);
        this.sceneModel.add(this.rightLeg);
        addMesh(this.rightLeg, makeCapsule(0.15, 0.58), dark, [0, -0.28, 0]);
        addMesh(this.rightLeg, new THREE.BoxGeometry(0.28, 0.16, 0.38), boots, [0, -0.62, -0.07]);
    }

    createFirstPersonHands() {
        const sleeve = new THREE.MeshStandardMaterial({ color: 0x243d52, roughness: 0.9 });
        this.fpHands = new THREE.Group();
        this.fpHands.position.set(0, -0.35, -0.35);
        this.camera.add(this.fpHands);

        this.fpGun = new THREE.Group();
        this.fpGun.position.set(0.37, -0.31, -0.72);
        this.fpHands.add(this.fpGun);
        addMesh(this.fpGun, new THREE.BoxGeometry(0.2, 0.18, 0.2), sleeve, [0, -0.09, 0.15]);
        addMesh(this.fpGun, new THREE.BoxGeometry(0.17, 0.14, 0.2), skinMaterial, [0, 0, 0]);
        addMesh(this.fpGun, new THREE.BoxGeometry(0.07, 0.07, 0.4), skinMaterial, [0.015, 0.04, -0.25]);
        addMesh(this.fpGun, new THREE.BoxGeometry(0.065, 0.055, 0.15), skinMaterial, [-0.05, -0.04, -0.14]);
        addMesh(this.fpGun, new THREE.BoxGeometry(0.065, 0.055, 0.15), skinMaterial, [0.03, -0.04, -0.14]);
        addMesh(
            this.fpGun,
            new THREE.BoxGeometry(0.075, 0.18, 0.09),
            skinMaterial,
            [0.13, 0.11, -0.01],
            [0, 0, -0.55]
        );

        this.fpUzi = new THREE.Group();
        this.fpUzi.position.set(0.37, -0.3, -0.75);
        this.fpHands.add(this.fpUzi);
        const uziMetal = new THREE.MeshStandardMaterial({ color: 0x34434d, metalness: 0.72, roughness: 0.38 });
        const uziGrip = new THREE.MeshStandardMaterial({ color: 0x202a2e, roughness: 0.84 });
        addMesh(this.fpUzi, new THREE.BoxGeometry(0.16, 0.2, 0.5), uziMetal, [0, 0.05, -0.12]);
        addMesh(this.fpUzi, new THREE.BoxGeometry(0.12, 0.24, 0.14), uziGrip, [0, -0.15, 0.07], [0.24, 0, 0]);
        addMesh(this.fpUzi, new THREE.CylinderGeometry(0.045, 0.045, 0.38, 8), uziMetal, [0, 0.05, -0.52], [Math.PI / 2, 0, 0]);
        this.fpUziMagazine = new THREE.Group();
        this.fpUziMagazine.position.set(0, -0.12, -0.18);
        this.fpUzi.add(this.fpUziMagazine);
        addMesh(this.fpUziMagazine, new THREE.BoxGeometry(0.12, 0.08, 0.22), uziGrip, [0, 0, 0]);
        addMesh(this.fpUzi, new THREE.BoxGeometry(0.035, 0.12, 0.09), uziMetal, [0, 0.18, -0.12]);
        this.fpUzi.visible = false;

        this.fpLeftFist = this.createFirstPersonFist(-0.38, -0.43, -0.7, sleeve);
        this.fpRightFist = this.createFirstPersonFist(0.34, -0.4, -0.67, sleeve);
        this.fpLeftFist.visible = false;
        this.fpRightFist.visible = false;

        this.fpRubHands = new THREE.Group();
        this.fpHands.add(this.fpRubHands);
        this.fpRubLeft = this.createFirstPersonFist(-0.24, -0.36, -0.72, sleeve);
        this.fpRubRight = this.createFirstPersonFist(0.24, -0.36, -0.72, sleeve);
        this.fpRubHands.add(this.fpRubLeft, this.fpRubRight);
        this.fpRubHands.visible = false;
    }

    createFirstPersonFist(x, y, z, sleeve) {
        const fist = new THREE.Group();
        fist.position.set(x, y, z);
        this.fpHands.add(fist);
        addMesh(fist, new THREE.BoxGeometry(0.2, 0.2, 0.27), sleeve, [0, -0.12, 0.13]);
        addMesh(fist, new THREE.SphereGeometry(0.14, 10, 8), skinMaterial, [0, 0, 0]);
        return fist;
    }

    punch(side) {
        if (!this.alive || this.weapon !== 'fists') return;
        this.punches[side] = 1;
    }

    startFatigue(duration) {
        this.fatigueRemaining = duration;
        this.fatigueDuration = duration;
    }

    update(delta, time, active = true) {
        let forward = this.alive && active ? Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) : 0;
        let sideways = this.alive && active ? Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) : 0;
        const hasMoveInput = forward !== 0 || sideways !== 0;
        if (active && hasMoveInput && this.danceRemaining > 0) {
            this.danceRemaining = 0;
            this.danceTime = 0;
            this.thirdPerson = false;
            this.root.visible = false;
            if (this.onDanceCancel) this.onDanceCancel();
        }

        const movement = new THREE.Vector3(sideways, 0, -forward);
        const isMoving = this.alive && active && movement.lengthSq() > 0;

        if (isMoving) {
            movement.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            this.position.addScaledVector(movement, this.speed * delta);
            if (this.position.length() > 58) this.position.setLength(58);
        }

        if (active && this.alive) {
            if (this.jumpRequested && this.position.y <= 0) this.jumpVelocity = 6.2;
            this.jumpRequested = false;
            this.jumpVelocity -= 16 * delta;
            this.position.y = Math.max(0, this.position.y + this.jumpVelocity * delta);
            if (this.position.y === 0) this.jumpVelocity = 0;
        } else {
            this.jumpRequested = false;
        }

        const wasDancing = this.danceRemaining > 0;
        if (this.alive && active && wasDancing) {
            this.danceRemaining = Math.max(0, this.danceRemaining - delta);
            this.danceTime += delta * 8;
        } else if (this.danceRemaining === 0) {
            this.danceTime = 0;
        }
        if (wasDancing && this.danceRemaining === 0 && !hasMoveInput) {
            this.thirdPerson = false;
        }

        this.root.position.set(this.position.x, this.position.y, this.position.z);
        this.root.rotation.y = this.yaw;
        const walk = isMoving ? Math.sin(time * 10) * 0.48 : 0;
        if (this.danceRemaining > 0) this.danceWalkTime += delta * 8;
        else this.danceWalkTime = 0;
        const dance = this.danceRemaining > 0 ? Math.sin(this.danceWalkTime) : 0;
        this.leftLeg.rotation.x = walk + dance * 0.7;
        this.rightLeg.rotation.x = -walk - dance * 0.7;
        this.leftArm.rotation.x = dance * 0.9;
        this.rightArm.rotation.x = -dance * 0.9;
        this.sceneModel.rotation.z = this.danceRemaining > 0 ? Math.sin(this.danceTime * 0.5) * 0.13 : 0;
        this.leftArmSegment.position.z = 0;
        this.rightArmSegment.position.z = 0;

        for (const side of ['left', 'right']) {
            this.punches[side] = Math.max(0, this.punches[side] - delta * 5.5);
            const arm = side === 'left' ? this.leftArm : this.rightArm;
            const armSegment = side === 'left' ? this.leftArmSegment : this.rightArmSegment;
            const extension = Math.sin((1 - this.punches[side]) * Math.PI);
            arm.rotation.x += extension * 1.25;
            armSegment.position.z = -extension * 0.22;
            const firstPersonFist = side === 'left' ? this.fpLeftFist : this.fpRightFist;
            const fistBaseZ = side === 'left' ? -0.7 : -0.67;
            firstPersonFist.position.z = fistBaseZ - extension * 0.38;
        }

        this.zoomAmount = THREE.MathUtils.damp(this.zoomAmount, this.zoomRequested && this.alive ? 1 : 0, 8, delta);
        this.fatigueRemaining = Math.max(0, this.fatigueRemaining - delta);
        const isFatigued = this.fatigueRemaining > 0;
        const handFatigued = isFatigued && this.weapon === 'gun';
        this.gunRecoil = Math.max(0, this.gunRecoil - delta * 8);
        this.fpGun.position.x = THREE.MathUtils.lerp(0.37, 0.26, this.zoomAmount);
        this.fpGun.position.y = THREE.MathUtils.lerp(-0.31, -0.24, this.zoomAmount);
        this.fpGun.position.z = -0.72 + this.zoomAmount * 0.2 + this.gunRecoil * 0.09;
        this.fpGun.rotation.x = -this.gunRecoil * 0.12;
        this.fpGun.scale.setScalar(1 + this.zoomAmount * 0.42);
        this.fpGun.visible = this.weapon === 'gun' && !handFatigued;
        const reloading = this.weapon === 'uzi' && this.reloadRemaining > 0;
        const reloadProgress = reloading ? 1 - this.reloadRemaining / this.reloadDuration : 0;
        const reloadDip = reloading ? Math.sin(reloadProgress * Math.PI) : 0;
        this.fpUzi.position.x = THREE.MathUtils.lerp(0.37, 0.26, this.zoomAmount);
        this.fpUzi.position.y = THREE.MathUtils.lerp(-0.3, -0.23, this.zoomAmount) - reloadDip * 0.2;
        this.fpUzi.position.z = -0.75 + this.zoomAmount * 0.19 + this.gunRecoil * 0.08 + reloadDip * 0.04;
        this.fpUzi.rotation.x = -this.gunRecoil * 0.1 + reloadDip * 0.12;
        this.fpUzi.rotation.z = -reloadDip * 0.2;
        if (!reloading) {
            this.fpUziMagazine.position.set(0, -0.12, -0.18);
            this.fpUziMagazine.visible = true;
        } else if (reloadProgress < 0.34) {
            const pull = THREE.MathUtils.smoothstep(reloadProgress, 0, 0.34);
            this.fpUziMagazine.position.set(0, -0.12 - pull * 0.42, -0.18);
            this.fpUziMagazine.visible = true;
        } else if (reloadProgress < 0.58) {
            this.fpUziMagazine.visible = false;
        } else if (reloadProgress < 0.86) {
            const insert = THREE.MathUtils.smoothstep(reloadProgress, 0.58, 0.86);
            this.fpUziMagazine.position.set(0, -0.54 + insert * 0.42, -0.18);
            this.fpUziMagazine.visible = true;
        } else {
            this.fpUziMagazine.position.set(0, -0.12, -0.18);
            this.fpUziMagazine.visible = true;
        }
        this.fpUzi.scale.setScalar(1 + this.zoomAmount * 0.38);
        this.fpUzi.visible = this.weapon === 'uzi';
        this.fpLeftFist.visible = this.weapon === 'fists';
        this.fpRightFist.visible = this.weapon === 'fists';
        this.fpRubHands.visible = handFatigued;
        if (handFatigued) {
            const rub = Math.sin((this.fatigueDuration - this.fatigueRemaining) * 18) * 0.1;
            this.fpRubLeft.position.x = -0.16 + rub;
            this.fpRubRight.position.x = 0.16 - rub;
            this.fpRubLeft.rotation.z = -0.2 + rub;
            this.fpRubRight.rotation.z = 0.2 - rub;
            this.fpRubLeft.rotation.x = -0.25;
            this.fpRubRight.rotation.x = -0.25;
        }

        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, THREE.MathUtils.lerp(75, 48, this.zoomAmount), 8, delta);
        this.root.visible = !this.alive || this.danceRemaining > 0 || this.inSuplex || this.inGrapple;
        this.fpHands.visible = this.alive && this.danceRemaining <= 0 && !this.inSuplex && !this.inGrapple;
        if (!this.thirdPerson) {
            this.root.visible = !this.alive;
            this.camera.position.set(this.position.x, this.position.y + 1.85, this.position.z - 0.2);
            this.camera.rotation.set(this.pitch, this.yaw, 0);
        } else {
            const aimDirection = new THREE.Vector3(
                -Math.sin(this.yaw) * Math.cos(this.pitch),
                Math.sin(this.pitch),
                -Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            const target = this.position.clone().addScaledVector(aimDirection, 9);
            target.y += 1.45;
            const cameraOffset = new THREE.Vector3(0.45, 2.35, 5.8)
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            const desiredPosition = this.position.clone().add(cameraOffset);
            this.camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 4));
            this.camera.lookAt(target);
        }
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
    }
}

class WinterForest {
    constructor(scene, player, game) {
        this.scene = scene;
        this.player = player;
        this.game = game;
        this.enemies = [];
        this.kills = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.transitioning = false;
        this.damageLabels = [];
        this.deadYetis = [];
        this.rocks = [];
        this.pickups = [];
        this.createGround();
        this.createTrees(105);
        this.createDetails();
        this.createBoundary();
        this.createSnowfall();
        this.createPickups();
        this.spawnWave();
    }

    createGround() {
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 128;
        textureCanvas.height = 128;
        const context = textureCanvas.getContext('2d');
        context.fillStyle = '#dce9ed';
        context.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 280; i += 1) {
            context.fillStyle = i % 2 ? '#c1d7df' : '#f4f8f8';
            context.globalAlpha = 0.4;
            context.beginPath();
            context.arc(Math.random() * 128, Math.random() * 128, Math.random() * 2 + 0.5, 0, Math.PI * 2);
            context.fill();
        }
        const snowTexture = new THREE.CanvasTexture(textureCanvas);
        snowTexture.wrapS = THREE.RepeatWrapping;
        snowTexture.wrapT = THREE.RepeatWrapping;
        snowTexture.repeat.set(24, 24);
        snowTexture.colorSpace = THREE.SRGBColorSpace;
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(140, 140),
            new THREE.MeshStandardMaterial({ map: snowTexture, roughness: 1 })
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }

    createTrees(count) {
        const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.24, 2.2, 7);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x624c3a, roughness: 1 });
        const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x483a31, roughness: 1 });
        const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f8f8, roughness: 1 });
        const foliageGeometry = [
            new THREE.ConeGeometry(1.18, 2.25, 8),
            new THREE.ConeGeometry(0.91, 1.95, 8),
            new THREE.ConeGeometry(0.63, 1.6, 8)
        ];

        for (let i = 0; i < count; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 8 + Math.random() * 48;
            const tree = new THREE.Group();
            addMesh(tree, trunkGeometry, trunkMaterial, [0, 1.1, 0]);
            for (let branch = 0; branch < 3; branch += 1) {
                const limb = addMesh(
                    tree,
                    new THREE.CylinderGeometry(0.045, 0.09, 0.75, 5),
                    barkMaterial,
                    [branch % 2 ? 0.2 : -0.2, 1.2 + branch * 0.2, 0],
                    [0, 0, branch % 2 ? -0.9 : 0.9]
                );
                limb.rotation.y = branch * 1.8;
            }
            foliageGeometry.forEach((geometry, layer) => {
                const foliage = addMesh(tree, geometry, snowMaterial, [0, 2.05 + layer * 0.72, 0]);
                foliage.rotation.y = Math.random() * Math.PI;
            });
            tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            tree.rotation.y = Math.random() * Math.PI;
            tree.scale.setScalar(0.75 + Math.random() * 0.8);
            this.scene.add(tree);
        }
    }

    createDetails() {
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x899ba2, roughness: 1 });
        const snowCap = new THREE.MeshStandardMaterial({ color: 0xf5f8f8, roughness: 1 });
        const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x66847f, roughness: 1 });
        const rockGeometry = new THREE.DodecahedronGeometry(0.55, 0);
        const snowGeometry = new THREE.SphereGeometry(0.48, 8, 6);
        const bushGeometry = new THREE.IcosahedronGeometry(0.4, 0);

        for (let i = 0; i < 85; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 7 + Math.random() * 48;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const detail = new THREE.Group();
            const rock = addMesh(detail, rockGeometry, rockMaterial, [0, 0.23, 0]);
            rock.scale.set(1 + Math.random(), 0.6 + Math.random() * 0.5, 0.8 + Math.random());
            addMesh(detail, snowGeometry, snowCap, [0.05, 0.53, -0.03]).scale.set(0.85, 0.28, 0.8);
            detail.position.set(x, 0, z);
            this.scene.add(detail);
        }

        for (let i = 0; i < 90; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 7 + Math.random() * 48;
            const bush = new THREE.Group();
            for (let leaf = 0; leaf < 3; leaf += 1) {
                const flake = addMesh(
                    bush,
                    bushGeometry,
                    leaf === 1 ? snowCap : bushMaterial,
                    [(leaf - 1) * 0.26, Math.random() * 0.12, (leaf % 2) * 0.2]
                );
                flake.scale.setScalar(0.65 + Math.random() * 0.4);
            }
            bush.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
            this.scene.add(bush);
        }

        const stumpGeometry = new THREE.CylinderGeometry(0.28, 0.34, 0.55, 8);
        const stumpMaterial = new THREE.MeshStandardMaterial({ color: 0x69513d, roughness: 1 });
        for (let i = 0; i < 12; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 14 + Math.random() * 40;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            addMesh(this.scene, stumpGeometry, stumpMaterial, [x, 0.27, z]);
            addMesh(this.scene, new THREE.CylinderGeometry(0.3, 0.3, 0.07, 8), snowCap, [x, 0.56, z]);
        }
    }

    createBoundary() {
        const ridgeMaterial = new THREE.MeshStandardMaterial({
            color: 0x9bb2bb,
            roughness: 1,
            side: THREE.DoubleSide
        });
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f6f7,
            roughness: 1,
            side: THREE.DoubleSide
        });
        const ridge = new THREE.Mesh(new THREE.CylinderGeometry(61, 68, 8, 64, 1, true), ridgeMaterial);
        ridge.position.y = 4;
        this.scene.add(ridge);
        const snowline = new THREE.Mesh(new THREE.CylinderGeometry(60.5, 63, 1.2, 64, 1, true), snowMaterial);
        snowline.position.y = 7.4;
        this.scene.add(snowline);

        const crestMaterial = new THREE.MeshStandardMaterial({ color: 0xc4d5db, roughness: 1 });
        const crestGeometry = new THREE.DodecahedronGeometry(1.7, 0);
        for (let i = 0; i < 48; i += 1) {
            const angle = (Math.PI * 2 * i) / 48;
            const crest = addMesh(
                this.scene,
                crestGeometry,
                crestMaterial,
                [Math.cos(angle) * 64, 5.3 + Math.random() * 1.4, Math.sin(angle) * 64]
            );
            crest.scale.set(1.1 + Math.random(), 1 + Math.random() * 1.5, 1.1 + Math.random());
        }
    }

    createSnowfall() {
        const positions = new Float32Array(1200 * 3);
        for (let i = 0; i < 1200; i += 1) {
            positions[i * 3] = (Math.random() - 0.5) * 64;
            positions[i * 3 + 1] = Math.random() * 26;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 64;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.snowfall = new THREE.Points(
            geometry,
            new THREE.PointsMaterial({ color: 0xf4fbff, size: 0.11, transparent: true, opacity: 0.82 })
        );
        this.scene.add(this.snowfall);
    }

    createPickups() {
        const createPickup = (kind, color, position) => {
            const pickup = new THREE.Group();
            const outerMaterial = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.45,
                metalness: 0.55,
                roughness: 0.3
            });
            const glowMaterial = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.22,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            if (kind === 'uzi') {
                addMesh(pickup, new THREE.BoxGeometry(0.75, 0.23, 0.25), outerMaterial, [0, 0.45, 0]);
                addMesh(pickup, new THREE.BoxGeometry(0.2, 0.35, 0.18), outerMaterial, [0.14, 0.2, 0.03], [0, 0, 0.22]);
                addMesh(pickup, new THREE.CylinderGeometry(0.07, 0.07, 0.48, 8), outerMaterial, [0, 0.44, -0.31], [Math.PI / 2, 0, 0]);
            } else {
                for (let i = 0; i < 5; i += 1) {
                    const angle = (Math.PI * 2 * i) / 5;
                    addMesh(
                        pickup,
                        new THREE.SphereGeometry(0.16, 10, 8),
                        outerMaterial,
                        [Math.cos(angle) * 0.28, 0.4 + Math.sin(angle) * 0.15, Math.sin(angle) * 0.28]
                    );
                }
                addMesh(pickup, new THREE.TorusGeometry(0.42, 0.035, 6, 18), outerMaterial, [0, 0.42, 0], [Math.PI / 2, 0, 0]);
            }

            const aura = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 6, 32), glowMaterial);
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.06;
            aura.userData.isAura = true;
            pickup.add(aura);
            pickup.position.copy(position);
            pickup.userData = { kind, baseY: position.y, phase: Math.random() * Math.PI * 2 };
            this.scene.add(pickup);
            this.pickups.push(pickup);
        };

        const place = (exclude = null) => {
            let position;
            let attempts = 0;
            do {
                const angle = Math.random() * Math.PI * 2;
                const radius = 14 + Math.random() * 36;
                position = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
                attempts += 1;
            } while (exclude && position.distanceTo(exclude) < 22 && attempts < 20);
            return position;
        };

        const uziPosition = place();
        createPickup('uzi', 0x64e7bd, uziPosition);
        createPickup('grenades', 0xffb94f, place(uziPosition));
    }

    createYeti(wave, boss = false) {
        const root = new THREE.Group();
        const fur = new THREE.MeshStandardMaterial({ color: boss ? 0x9db7c7 : 0xf1f6f6, roughness: 0.92 });
        const shade = new THREE.MeshStandardMaterial({ color: boss ? 0x526b7d : 0xc6d9df, roughness: 0.9 });
        const face = new THREE.MeshStandardMaterial({ color: boss ? 0x111b24 : 0x26333a, roughness: 0.9 });
        const eye = new THREE.MeshStandardMaterial({
            color: boss ? 0xff532e : 0x581f27,
            emissive: boss ? 0xff311c : 0x631721,
            emissiveIntensity: boss ? 1.2 : 0.35
        });
        const horn = new THREE.MeshStandardMaterial({ color: boss ? 0x75818a : 0xf3dfb7, roughness: 0.55 });

        const torso = addMesh(root, makeCapsule(boss ? 0.58 : 0.47, boss ? 1 : 0.75), fur, [0, boss ? 1.28 : 1.05, 0]);
        const head = addMesh(root, new THREE.SphereGeometry(boss ? 0.59 : 0.49, 16, 12), fur, [0, boss ? 2.32 : 1.93, -0.02]);
        const headY = boss ? 2.2 : 1.84;
        const headZ = boss ? -0.48 : -0.4;
        addMesh(root, new THREE.SphereGeometry(boss ? 0.29 : 0.24, 12, 10), shade, [0, headY, headZ]);
        addMesh(root, new THREE.SphereGeometry(boss ? 0.17 : 0.13, 10, 8), face, [0, headY + 0.04, headZ - 0.2]);
        addMesh(root, new THREE.SphereGeometry(boss ? 0.1 : 0.075, 8, 6), eye, [boss ? -0.24 : -0.2, boss ? 2.48 : 2.06, boss ? -0.5 : -0.42]);
        addMesh(root, new THREE.SphereGeometry(boss ? 0.1 : 0.075, 8, 6), eye, [boss ? 0.24 : 0.2, boss ? 2.48 : 2.06, boss ? -0.5 : -0.42]);
        addMesh(root, new THREE.ConeGeometry(boss ? 0.14 : 0.085, boss ? 0.48 : 0.32, 7), horn, [boss ? -0.43 : -0.31, boss ? 2.8 : 2.29, -0.12], [0, 0, 0.3]);
        addMesh(root, new THREE.ConeGeometry(boss ? 0.14 : 0.085, boss ? 0.48 : 0.32, 7), horn, [boss ? 0.43 : 0.31, boss ? 2.8 : 2.29, -0.12], [0, 0, -0.3]);
        addMesh(root, new THREE.ConeGeometry(0.12, 0.65, 7), horn, [0, boss ? 2.9 : 2.46, 0.12]);
        if (boss) {
            const armor = new THREE.MeshStandardMaterial({ color: 0x354655, metalness: 0.45, roughness: 0.6 });
            for (const side of [-1, 1]) {
                addMesh(root, new THREE.DodecahedronGeometry(0.52, 0), armor, [side * 0.72, 1.85, 0.02]);
                for (let spike = 0; spike < 3; spike += 1) {
                    addMesh(
                        root,
                        new THREE.ConeGeometry(0.16, 0.72, 6),
                        horn,
                        [side * (0.35 + spike * 0.27), 2.15, 0.22 + spike * 0.18],
                        [0.5, 0, side * 0.45]
                    );
                }
            }
        }

        const leftArm = new THREE.Group();
        leftArm.position.set(-0.58, 1.48, 0);
        root.add(leftArm);
        addMesh(leftArm, makeCapsule(0.2, 0.6), fur, [0, -0.38, 0], [0, 0, -0.25]);
        addMesh(leftArm, new THREE.SphereGeometry(0.23, 10, 8), shade, [0, -0.78, -0.03]);
        const rightArm = new THREE.Group();
        rightArm.position.set(0.58, 1.48, 0);
        root.add(rightArm);
        addMesh(rightArm, makeCapsule(0.2, 0.6), fur, [0, -0.38, 0], [0, 0, 0.25]);
        addMesh(rightArm, new THREE.SphereGeometry(0.23, 10, 8), shade, [0, -0.78, -0.03]);

        const leftLeg = new THREE.Group();
        leftLeg.position.set(-0.24, 0.56, 0);
        root.add(leftLeg);
        addMesh(leftLeg, makeCapsule(0.22, 0.48), fur, [0, -0.25, 0]);
        addMesh(leftLeg, new THREE.SphereGeometry(0.23, 10, 8), shade, [0, -0.52, -0.08]);
        const rightLeg = new THREE.Group();
        rightLeg.position.set(0.24, 0.56, 0);
        root.add(rightLeg);
        addMesh(rightLeg, makeCapsule(0.22, 0.48), fur, [0, -0.25, 0]);
        addMesh(rightLeg, new THREE.SphereGeometry(0.23, 10, 8), shade, [0, -0.52, -0.08]);

        const health = boss ? 70 + (wave - 6) * 12 : 2 + wave;
        const bar = new THREE.Group();
        const barBack = addMesh(
            bar,
            new THREE.BoxGeometry(1.1, 0.11, 0.045),
            new THREE.MeshBasicMaterial({ color: 0x263139 }),
            [0, 0, 0]
        );
        const barFill = addMesh(
            bar,
            new THREE.BoxGeometry(1.02, 0.065, 0.055),
            new THREE.MeshBasicMaterial({ color: 0x69e078 }),
            [0, 0, -0.035]
        );
        bar.position.set(0, boss ? 4.15 : 2.62, 0);
        root.add(bar);
        if (boss) root.scale.setScalar(1.65);

        root.userData.enemy = {
            health,
            maxHealth: health,
            speed: boss ? 2.55 : 3.3 + Math.min(wave * 0.12, 1.6),
            attackCooldown: boss ? 1.5 : 0,
            boss,
            flankSide: Math.random() < 0.5 ? -1 : 1,
            grappleCooldown: 0,
            torso,
            head,
            danceRemaining: 0,
            danceTime: 0,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            barFill,
            barBack
        };
        return root;
    }

    spawnWave() {
        this.transitioning = false;
        this.waveTimer = 0;
        const count = Math.min(4 + this.wave * 2, 30);
        for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
            const radius = 22 + Math.random() * 15;
            const yeti = this.createYeti(this.wave);
            yeti.position.set(
                this.player.position.x + Math.cos(angle) * radius,
                0,
                this.player.position.z + Math.sin(angle) * radius
            );
            if (yeti.position.length() > 56) yeti.position.setLength(56);
            this.scene.add(yeti);
            this.enemies.push(yeti);
        }
        if (this.wave === 6 || (this.wave > 6 && this.wave % 5 === 1)) {
            const angle = Math.random() * Math.PI * 2;
            const boss = this.createYeti(this.wave, true);
            boss.position.set(
                this.player.position.x + Math.cos(angle) * 34,
                0,
                this.player.position.z + Math.sin(angle) * 34
            );
            if (boss.position.length() > 56) boss.position.setLength(56);
            this.scene.add(boss);
            this.enemies.push(boss);
        }
        this.updateHud();
        this.game.showMessage(
            this.wave >= 6 && this.enemies.some((yeti) => yeti.userData.enemy.boss)
                ? `Oleada ${this.wave}: ¡un yeti colosal se acerca!`
                : `Oleada ${this.wave}: ${count} yetis`,
            3
        );
    }

    findYeti(object) {
        let current = object;
        while (current && !current.userData.enemy) current = current.parent;
        return current || null;
    }

    damage(yeti, amount) {
        if (!yeti || !this.enemies.includes(yeti) || !this.game.alive) return;
        const data = yeti.userData.enemy;
        if (data.suplex) return;
        data.health = Math.max(0, data.health - amount);
        const ratio = data.health / data.maxHealth;
        data.barFill.scale.x = Math.max(ratio, 0.001);
        data.barFill.position.x = -(1 - ratio) * 0.51;
        data.barFill.material.color.set(ratio < 0.3 ? 0xe84f55 : 0x69e078);
        this.showDamage(yeti.position.clone().add(new THREE.Vector3(0, 2.85, 0)), amount);

        if (data.health <= 0) {
            const direction = new THREE.Vector3(
                yeti.position.x - this.player.position.x,
                0,
                yeti.position.z - this.player.position.z
            ).normalize();
            this.killYeti(yeti, direction.multiplyScalar(2).add(new THREE.Vector3(0, 3, 0)));
        }
    }

    killYeti(yeti, impulse = new THREE.Vector3(0, 2, 1)) {
        const data = yeti.userData.enemy;
        if (data.dead) return;
        data.dead = true;
        data.danceRemaining = 0;
        data.barFill.visible = false;
        data.barBack.visible = false;
        data.death = {
            velocity: impulse.clone(),
            angular: new THREE.Vector3(
                (Math.random() - 0.5) * 7,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 7
            ),
            age: 0
        };
        this.deadYetis.push(yeti);
        this.enemies.splice(this.enemies.indexOf(yeti), 1);
        this.kills += 1;
        killCountElement.textContent = String(this.kills);
        this.updateHud();
        if (this.enemies.length === 0 && !this.transitioning) {
            this.transitioning = true;
            this.waveTimer = 3;
            this.game.showMessage(`Oleada ${this.wave} superada`, 3);
        }
    }

    beginSuplex(yeti) {
        const data = yeti.userData.enemy;
        if (data.boss) return false;
        data.danceRemaining = 0;
        data.suplex = { elapsed: 0, start: yeti.position.clone(), yaw: yeti.rotation.y };
        this.game.startSuplex(yeti);
        return true;
    }

    throwRock(yeti) {
        const data = yeti.userData.enemy;
        const origin = yeti.position.clone().add(new THREE.Vector3(0, 3.25, 0));
        const target = this.player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        const velocity = target.sub(origin).normalize().multiplyScalar(23);
        const rock = new THREE.Group();
        const stone = new THREE.MeshStandardMaterial({ color: 0x45515b, roughness: 0.94 });
        const ice = new THREE.MeshStandardMaterial({ color: 0xe7f1f3, roughness: 0.7 });
        addMesh(rock, new THREE.IcosahedronGeometry(0.62, 1), stone, [0, 0, 0]);
        addMesh(rock, new THREE.DodecahedronGeometry(0.38, 0), ice, [0.02, 0.37, -0.08]).scale.set(1, 0.38, 0.9);
        addMesh(rock, new THREE.DodecahedronGeometry(0.21, 0), ice, [-0.33, 0.05, 0.24]);
        rock.position.copy(origin);
        this.scene.add(rock);
        this.rocks.push({ mesh: rock, velocity, age: 0, damage: 2 });
        data.leftArm.rotation.x = -1.2;
        data.attackCooldown = 1.7;
        this.game.showMessage('¡El coloso lanza una roca!', 1.1);
    }

    showDamage(position, amount) {
        const label = document.createElement('canvas');
        label.width = 128;
        label.height = 64;
        const context = label.getContext('2d');
        context.font = 'bold 42px Rajdhani, sans-serif';
        context.textAlign = 'center';
        context.lineWidth = 5;
        context.strokeStyle = '#24303acc';
        context.strokeText(`-${amount}`, 64, 46);
        context.fillStyle = amount > 1 ? '#ffca6b' : '#ffffff';
        context.fillText(`-${amount}`, 64, 46);
        const texture = new THREE.CanvasTexture(label);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        }));
        sprite.position.copy(position);
        sprite.scale.set(0.9, 0.45, 1);
        this.scene.add(sprite);
        this.damageLabels.push({ sprite, texture, age: 0 });
    }

    updatePickups(delta, time) {
        for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = this.pickups[i];
            pickup.rotation.y += delta * 0.8;
            pickup.position.y = pickup.userData.baseY + 0.25 + Math.sin(time * 2.4 + pickup.userData.phase) * 0.14;
            const aura = pickup.children.find((child) => child.userData.isAura);
            if (aura) aura.rotation.z += delta * 0.55;
            if (pickup.position.distanceTo(this.player.position) > 2.2) continue;

            if (pickup.userData.kind === 'uzi' && !this.game.player.hasUzi) {
                this.game.player.hasUzi = true;
                this.game.player.uziAmmo = 30;
                this.game.player.uziReserve = 150;
                this.game.equipWeapon('uzi');
                this.game.showMessage('¡Uzi encontrada! 30 balas y 5 cargadores. Pulsa R para recargar.', 4);
            } else if (pickup.userData.kind === 'grenades') {
                this.game.player.grenades = 5;
                this.game.updateInventoryHud();
                this.game.showMessage('¡Encontraste 5 granadas de impacto! Pulsa G para lanzarlas.', 3);
            } else {
                continue;
            }

            this.scene.remove(pickup);
            pickup.traverse((part) => {
                if (part.geometry) part.geometry.dispose();
                if (part.material) {
                    const materials = Array.isArray(part.material) ? part.material : [part.material];
                    materials.forEach((material) => material.dispose());
                }
            });
            this.pickups.splice(i, 1);
        }
    }

    startDance() {
        if (!this.game.alive || this.transitioning || this.game.suplex) return;
        if (this.player.danceRemaining > 0) {
            this.player.danceRemaining = 0;
            this.player.danceTime = 0;
            this.player.thirdPerson = false;
            this.player.root.visible = false;
            this.game.showMessage('Baile cancelado', 1.5);
            return;
        }

        this.player.danceRemaining = 10;
        this.player.thirdPerson = true;
        this.player.root.visible = true;
        let joined = 0;
        for (const yeti of this.enemies) {
            const distance = yeti.position.distanceTo(this.player.position);
            if (distance <= 4) {
                yeti.userData.enemy.danceRemaining = 5;
                joined += 1;
            }
        }
        this.game.showMessage(
            joined ? `¡Baile! ${joined} yeti(s) aturdido(s) por 5 s` : '¡Baile! Ningún yeti está a 4 metros',
            3
        );
    }

    update(delta, time) {
        this.updatePickups(delta, time);
        const positions = this.snowfall.geometry.attributes.position;
        for (let i = 0; i < positions.count; i += 1) {
            let y = positions.getY(i) - delta * (1.2 + (i % 5) * 0.18);
            if (y < 0) {
                y = 26;
                positions.setX(i, this.player.position.x + (Math.random() - 0.5) * 64);
                positions.setZ(i, this.player.position.z + (Math.random() - 0.5) * 64);
            }
            positions.setY(i, y);
            positions.setX(i, positions.getX(i) + Math.sin(time + i) * delta * 0.12);
        }
        positions.needsUpdate = true;

        for (const yeti of this.enemies) {
            const data = yeti.userData.enemy;
            if (data.suplex || data.grappling) continue;
            data.attackCooldown = Math.max(0, data.attackCooldown - delta);
            data.grappleCooldown = Math.max(0, data.grappleCooldown - delta);
            const direction = new THREE.Vector3(
                this.player.position.x - yeti.position.x,
                0,
                this.player.position.z - yeti.position.z
            );
            const distance = direction.length();
            if (data.danceRemaining > 0) {
                data.danceRemaining = Math.max(0, data.danceRemaining - delta);
                data.danceTime += delta * 8;
                yeti.rotation.y += Math.sin(data.danceTime) * delta * 2;
                yeti.position.y = Math.abs(Math.sin(data.danceTime * 2)) * 0.12;
                data.leftArm.rotation.x = Math.sin(data.danceTime) * 1.2;
                data.rightArm.rotation.x = -Math.sin(data.danceTime) * 1.2;
                data.leftLeg.rotation.x = Math.sin(data.danceTime * 0.7) * 0.7;
                data.rightLeg.rotation.x = -Math.sin(data.danceTime * 0.7) * 0.7;
                continue;
            }

            if (data.boss && distance > 7 && distance < 48 && data.attackCooldown <= 0) {
                this.throwRock(yeti);
                continue;
            }

            yeti.position.y = Math.abs(Math.sin(time * 12 + yeti.id)) * 0.06;
            if (!data.boss && distance < 2.35 && data.grappleCooldown <= 0 && !this.game.grapple) {
                this.game.startGrapple(yeti);
                continue;
            }

            if (distance > 1.35) {
                direction.normalize();
                const flankTarget = this.player.position.clone()
                    .add(new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(data.flankSide * 2.1))
                    .addScaledVector(direction, -1.15);
                const chaseTarget = distance < 9 && !data.boss ? flankTarget : this.player.position;
                const chaseDirection = chaseTarget.clone().sub(yeti.position).setY(0);
                if (chaseDirection.lengthSq() > 0.3) {
                    chaseDirection.normalize();
                    yeti.position.addScaledVector(chaseDirection, data.speed * delta);
                }
                if (yeti.position.length() > 57) yeti.position.setLength(57);
                yeti.rotation.y = Math.atan2(-direction.x, -direction.z);
                data.leftArm.rotation.x = Math.sin(time * 12 + yeti.id) * 0.55;
                data.rightArm.rotation.x = -data.leftArm.rotation.x;
                data.leftLeg.rotation.x = -data.leftArm.rotation.x;
                data.rightLeg.rotation.x = data.leftArm.rotation.x;
            } else if (data.attackCooldown <= 0 && this.game.alive) {
                data.attackCooldown = 0.85;
                this.game.damagePlayer();
            }
        }

        this.updateRagdolls(delta);
        this.updateRocks(delta);
        for (let i = this.damageLabels.length - 1; i >= 0; i -= 1) {
            const label = this.damageLabels[i];
            label.age += delta;
            label.sprite.position.y += delta * 0.65;
            label.sprite.material.opacity = Math.max(0, 1 - label.age / 0.8);
            if (label.age >= 0.8) {
                this.scene.remove(label.sprite);
                label.sprite.material.dispose();
                label.texture.dispose();
                this.damageLabels.splice(i, 1);
            }
        }

        if (this.transitioning && this.game.alive) {
            this.waveTimer -= delta;
            if (this.waveTimer <= 0) {
                this.wave += 1;
                this.spawnWave();
            }
        }
    }

    updateHud() {
        waveCountElement.textContent = String(this.wave);
        enemyCountElement.textContent = String(this.enemies.length);
    }

    updateRagdolls(delta) {
        for (let i = this.deadYetis.length - 1; i >= 0; i -= 1) {
            const yeti = this.deadYetis[i];
            const data = yeti.userData.enemy;
            const death = data.death;
            death.age += delta;
            death.velocity.y -= 9.8 * delta;
            yeti.position.addScaledVector(death.velocity, delta);

            if (yeti.position.y < 0.12) {
                yeti.position.y = 0.12;
                if (death.velocity.y < -1) death.velocity.y *= -0.22;
                else death.velocity.y = 0;
                death.velocity.x *= Math.exp(-delta * 3);
                death.velocity.z *= Math.exp(-delta * 3);
            }

            death.angular.multiplyScalar(Math.exp(-delta * 1.25));
            yeti.rotation.x += death.angular.x * delta;
            yeti.rotation.z += death.angular.z * delta;
            yeti.rotation.y += death.angular.y * delta;
            data.leftArm.rotation.x += death.angular.z * delta * 1.5;
            data.rightArm.rotation.x -= death.angular.z * delta * 1.4;
            data.leftLeg.rotation.x -= death.angular.x * delta;
            data.rightLeg.rotation.x += death.angular.x * delta;

            if (death.age >= 5) {
                this.scene.remove(yeti);
                yeti.traverse((part) => {
                    if (part.geometry) part.geometry.dispose();
                    if (part.material) {
                        const materials = Array.isArray(part.material) ? part.material : [part.material];
                        materials.forEach((material) => material.dispose());
                    }
                });
                this.deadYetis.splice(i, 1);
            }
        }
    }

    updateRocks(delta) {
        for (let i = this.rocks.length - 1; i >= 0; i -= 1) {
            const rock = this.rocks[i];
            rock.age += delta;
            rock.velocity.y -= 1.7 * delta;
            rock.mesh.position.addScaledVector(rock.velocity, delta);
            rock.mesh.rotation.x += delta * 4;
            rock.mesh.rotation.z += delta * 3.5;
            const playerCenter = this.player.position.clone().add(new THREE.Vector3(0, 1, 0));
            const hitPlayer = rock.mesh.position.distanceTo(playerCenter) < 1.15;
            if (hitPlayer) this.game.damagePlayer(rock.damage);
            if (hitPlayer || rock.mesh.position.y < 0.45 || rock.age > 5) {
                this.scene.remove(rock.mesh);
                rock.mesh.traverse((part) => {
                    if (part.geometry) part.geometry.dispose();
                    if (part.material) part.material.dispose();
                });
                this.rocks.splice(i, 1);
            }
        }
    }
}

class WinterForestGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xb8cbd5);
        this.scene.fog = new THREE.Fog(0xb8cbd5, 35, 125);
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 240);
        this.scene.add(this.camera);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene.add(new THREE.HemisphereLight(0xe8f5ff, 0x596b78, 2.3));
        const sunlight = new THREE.DirectionalLight(0xe5f3ff, 2.6);
        sunlight.position.set(-30, 55, 20);
        sunlight.castShadow = true;
        sunlight.shadow.mapSize.set(1024, 1024);
        sunlight.shadow.camera.left = -60;
        sunlight.shadow.camera.right = 60;
        sunlight.shadow.camera.top = 60;
        sunlight.shadow.camera.bottom = -60;
        this.scene.add(sunlight);

        this.messageTimer = 0;
        this.shotTimes = [];
        this.suplex = null;
        this.grenadesInFlight = [];
        this.grenadeEffects = [];
        this.grenadeGeometry = new THREE.IcosahedronGeometry(0.23, 1);
        this.grenadeDirection = new THREE.Vector3();
        this.grapple = null;
        this.grappleClicksRequired = 10;
        this.message = document.createElement('div');
        this.message.className = 'hud-panel game-notice';
        this.message.style.cssText = 'position:absolute;z-index:1;left:50%;bottom:48px;transform:translateX(-50%);color:#fff;text-align:center;pointer-events:none;text-shadow:0 1px 4px #000;opacity:0;transition:opacity .2s';
        document.querySelector('.game-stage').appendChild(this.message);
        this.player = new PlayerController(this.camera);
        this.player.onDanceCancel = () => this.showMessage('Baile cancelado: volviste a primera persona', 1.5);
        this.scene.add(this.player.root);
        this.forest = new WinterForest(this.scene, this.player, this);
        this.updateInventoryHud();
        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();
        this.time = 0;
        this.alive = true;
        this.started = false;
        this.gameOver = false;
        this.explosionTimer = 0;
        this.particles = [];
        this.smokeParticles = [];
        this.explosionGeometry = new THREE.IcosahedronGeometry(0.11, 0);
        this.explosionMaterials = [0xff7048, 0xffc36c, 0xf4f7ff].map((color) =>
            new THREE.MeshBasicMaterial({ color })
        );

        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.bindControls();
        this.animate();
    }

    bindControls() {
        document.addEventListener('keydown', (event) => {
            if (event.repeat || !this.alive || this.suplex) return;
            if (this.grapple && event.code !== 'Escape') return;
            if (event.code === 'Digit1') this.equipWeapon('gun');
            if (event.code === 'Digit2' && this.player.hasUzi) this.equipWeapon('uzi');
            if (event.code === 'Digit3') this.equipWeapon('fists');
            if (event.code === 'KeyR') {
                if (this.player.weapon === 'uzi') this.reloadUzi();
                else this.toggleWeapon();
            }
            if (event.code === 'KeyG' && document.pointerLockElement === canvas) this.throwGrenade();
            if (event.code === 'KeyP' && document.pointerLockElement === canvas) this.forest.startDance();
        });

        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        canvas.addEventListener('mousedown', (event) => {
            if (document.pointerLockElement !== canvas || !this.alive || this.suplex) return;
            event.preventDefault();
            if (this.grapple) {
                if (event.button === 0) this.grappleClick();
                return;
            }
            if (event.button === 2) {
                if (this.player.weapon !== 'fists') this.player.zoomRequested = true;
                else this.punch('right');
            } else if (event.button === 0) {
                if (this.player.weapon !== 'fists') {
                    this.player.fireHeld = this.player.weapon === 'uzi';
                    this.shoot();
                    this.player.fireCooldown = 0.105;
                }
                else this.punch('left');
            }
        });
        window.addEventListener('mouseup', (event) => {
            if (event.button === 2) this.player.zoomRequested = false;
            if (event.button === 0) this.player.fireHeld = false;
        });

        document.addEventListener('pointerlockchange', () => {
            const locked = document.pointerLockElement === canvas;
            if (this.gameOver) {
                overlay.classList.remove('is-hidden');
                return;
            }
            overlay.classList.toggle('is-hidden', locked);
            if (!locked && this.started && this.alive) {
                overlayBadge.textContent = `Juego pausado · Oleada ${this.forest.wave}`;
                overlayTitle.textContent = 'Juego pausado';
                overlayDescription.textContent = 'Haz clic en Continuar para volver al bosque.';
                startButton.textContent = 'Continuar';
            }
        });
    }

    resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    toggleWeapon() {
        if (this.suplex) return;
        if (this.player.weapon === 'uzi') {
            this.equipWeapon('gun');
            return;
        }
        this.equipWeapon(this.player.weapon === 'gun' ? 'fists' : 'gun');
    }

    equipWeapon(weapon) {
        if (this.suplex || (weapon === 'uzi' && !this.player.hasUzi)) return;
        this.player.weapon = weapon;
        this.player.gunHand.visible = this.player.weapon === 'gun';
        this.player.rightFist.visible = this.player.weapon === 'fists';
        this.player.fpGun.visible = this.player.weapon === 'gun';
        this.player.fpUzi.visible = this.player.weapon === 'uzi';
        this.player.fpLeftFist.visible = this.player.weapon === 'fists';
        this.player.fpRightFist.visible = this.player.weapon === 'fists';
        this.player.zoomRequested = false;
        this.player.fireHeld = false;
        weaponNameElement.textContent = this.player.weapon === 'gun'
            ? 'Mano-pistola'
            : this.player.weapon === 'uzi' ? 'Uzi' : 'Puños';
        this.updateInventoryHud();
        this.showMessage(`${weaponNameElement.textContent} equipada`, 1.3);
    }

    updateInventoryHud() {
        if (ammoCountElement) {
            ammoCountElement.textContent = this.player.hasUzi
                ? `${this.player.uziAmmo} / ${this.player.uziReserve} (${Math.ceil(this.player.uziReserve / 30)} carg.)`
                : '--';
        }
        if (grenadeCountElement) grenadeCountElement.textContent = String(this.player.grenades);
        if (ammoDisplay) ammoDisplay.hidden = !this.player.hasUzi;
    }

    reloadUzi() {
        if (this.player.reloadRemaining > 0) return;
        if (!this.player.hasUzi || this.player.uziReserve <= 0 || this.player.uziAmmo >= 30) {
            this.showMessage(this.player.uziReserve <= 0 ? 'No quedan cargadores de Uzi' : 'La Uzi ya está cargada', 1.5);
            return;
        }
        this.player.fireHeld = false;
        this.player.reloadRemaining = this.player.reloadDuration;
        this.showMessage('Recargando Uzi...', this.player.reloadDuration);
    }

    updateReload(delta) {
        if (this.player.reloadRemaining <= 0) return;
        this.player.reloadRemaining = Math.max(0, this.player.reloadRemaining - delta);
        if (this.player.reloadRemaining > 0) return;
        const loaded = Math.min(30 - this.player.uziAmmo, this.player.uziReserve);
        this.player.uziAmmo += loaded;
        this.player.uziReserve -= loaded;
        this.updateInventoryHud();
        this.showMessage(`Uzi recargada: ${this.player.uziAmmo} balas · ${Math.ceil(this.player.uziReserve / 30)} cargadores`, 1.8);
    }

    punch(side) {
        this.player.punch(side);
        this.camera.updateMatrixWorld();
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        this.raycaster.far = 3.5;
        const hits = this.raycaster.intersectObjects(this.forest.enemies, true);
        if (!hits.length) return;
        const target = this.forest.findYeti(hits[0].object);
        if (!target) return;

        const data = target.userData.enemy;
        const onlyYetiLeft = this.forest.enemies.length === 1;
        const behindDirection = new THREE.Vector3(
            -Math.sin(target.rotation.y),
            0,
            -Math.cos(target.rotation.y)
        );
        const playerFromYeti = this.player.position.clone().sub(target.position).setY(0).normalize();
        const isBehind = behindDirection.dot(playerFromYeti) < -0.45;
        if (onlyYetiLeft && !data.boss && data.danceRemaining > 0 && isBehind && !data.suplex) {
            this.forest.beginSuplex(target);
            return;
        }

        this.forest.damage(target, 2);
    }

    shoot() {
        if ((this.player.weapon === 'gun' && this.player.fatigueRemaining > 0)
            || (this.player.weapon === 'uzi' && this.player.reloadRemaining > 0)
            || this.suplex || this.grapple || this.player.weapon === 'fists') {
            this.player.fireHeld = false;
            this.player.fireCooldown = 0;
            return;
        }
        if (this.player.weapon === 'uzi') {
            if (this.player.uziAmmo <= 0) {
                this.player.fireHeld = false;
                this.player.fireCooldown = 0;
                this.showMessage('Uzi vacía: pulsa R para recargar', 1.2);
                return;
            }
            this.player.uziAmmo -= 1;
            this.updateInventoryHud();
        }
        if (this.player.weapon === 'gun') {
            this.shotTimes = this.shotTimes.filter((shotTime) => this.time - shotTime < 1.15);
            this.shotTimes.push(this.time);
            if (this.shotTimes.length >= 7) {
                this.shotTimes = [];
                this.player.startFatigue(2.2);
                this.player.fireHeld = false;
                this.player.fireCooldown = 0;
                this.showMessage('¡Te cansaste! Frota las manos para recuperar el aliento', 2.2);
                return;
            }
        }

        this.player.gunRecoil = 1;
        this.spawnMuzzleSmoke();
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        this.raycaster.far = 120;
        const hits = this.raycaster.intersectObjects(this.forest.enemies, true);
        if (hits.length) {
            const target = this.forest.findYeti(hits[0].object);
            if (target) this.forest.damage(target, this.player.weapon === 'uzi' ? 1 : 2);
        }
        this.playShotSound();
    }

    startGrapple(yeti) {
        if (this.grapple || !this.alive || yeti.userData.enemy.boss) return;
        const data = yeti.userData.enemy;
        data.grappleCooldown = 5;
        data.grappling = true;
        this.player.inGrapple = true;
        this.player.thirdPerson = true;
        this.player.root.visible = true;
        this.player.fpHands.visible = false;
        this.player.fireHeld = false;
        this.player.keys.clear();
        this.grapple = {
            yeti,
            elapsed: 0,
            duration: 2.1,
            clicks: 0,
            startPosition: yeti.position.clone(),
            startRotation: yeti.rotation.clone()
        };
        grappleHud.classList.add('is-active');
        grappleProgress.style.width = '0%';
        grappleCountElement.textContent = `0 / ${this.grappleClicksRequired}`;
        this.showMessage('¡Un yeti se lanza sobre ti!', 1);
    }

    grappleClick() {
        if (!this.grapple) return;
        this.grapple.clicks = Math.min(this.grappleClicksRequired, this.grapple.clicks + 1);
        const ratio = this.grapple.clicks / this.grappleClicksRequired;
        grappleProgress.style.width = `${ratio * 100}%`;
        grappleCountElement.textContent = `${this.grapple.clicks} / ${this.grappleClicksRequired}`;
        if (ratio >= 1) this.finishGrapple(true);
    }

    finishGrapple(escaped) {
        if (!this.grapple) return;
        const { yeti } = this.grapple;
        const data = yeti.userData.enemy;
        data.grappling = false;
        data.danceRemaining = escaped ? 1.8 : 0;
        data.danceTime = 0;
        const away = yeti.position.clone().sub(this.player.position).setY(0).normalize();
        yeti.position.addScaledVector(away, escaped ? 3.4 : 1.4);
        data.attackCooldown = 1.1;
        this.grapple = null;
        this.player.inGrapple = false;
        this.player.thirdPerson = false;
        this.player.keys.clear();
        this.player.root.visible = false;
        this.player.fpHands.visible = true;
        grappleHud.classList.remove('is-active');
        if (escaped) {
            this.showMessage('¡Te liberaste! El yeti quedó aturdido', 1.8);
            return;
        }
        this.showMessage('El yeti te golpeó al soltarte', 1.2);
        this.damagePlayer(4);
    }

    updateGrapple(delta, time) {
        if (!this.grapple) return;
        const action = this.grapple;
        const yeti = action.yeti;
        if (!this.forest.enemies.includes(yeti)) {
            this.finishGrapple(true);
            return;
        }

        action.elapsed += delta;
        const pounce = THREE.MathUtils.smoothstep(action.elapsed, 0, 0.32);
        const landing = this.player.position.clone().add(new THREE.Vector3(0, 0.72, -0.42));
        yeti.position.lerpVectors(action.startPosition, landing, pounce);
        yeti.position.y += Math.sin(Math.min(action.elapsed / 0.32, 1) * Math.PI) * 1.05;
        yeti.rotation.y = this.player.yaw + Math.PI;
        const data = yeti.userData.enemy;
        data.leftArm.rotation.x = -1.2 + Math.sin(time * 25) * 0.18;
        data.rightArm.rotation.x = -1.2 - Math.sin(time * 25) * 0.18;
        this.camera.position.y += Math.sin(time * 34) * 0.012;
        if (action.elapsed >= action.duration) this.finishGrapple(false);
    }

    throwGrenade() {
        if (this.player.grenades <= 0 || this.grapple || this.suplex) {
            if (this.player.grenades <= 0) this.showMessage('No te quedan granadas', 1.2);
            return;
        }
        this.player.grenades -= 1;
        this.updateInventoryHud();
        const grenade = new THREE.Group();
        const body = new THREE.MeshStandardMaterial({ color: 0x78864a, metalness: 0.35, roughness: 0.62 });
        const band = new THREE.MeshStandardMaterial({ color: 0x26343a, metalness: 0.65, roughness: 0.35 });
        grenade.add(new THREE.Mesh(this.grenadeGeometry, body));
        addMesh(grenade, new THREE.TorusGeometry(0.19, 0.035, 6, 12), band, [0, 0.04, 0], [Math.PI / 2, 0, 0]);
        addMesh(grenade, new THREE.CylinderGeometry(0.055, 0.055, 0.13, 8), band, [0, 0.22, 0]);
        this.camera.getWorldDirection(this.grenadeDirection);
        const origin = this.camera.position.clone().addScaledVector(this.grenadeDirection, 0.8);
        grenade.position.copy(origin);
        this.scene.add(grenade);
        const velocity = this.grenadeDirection.clone().multiplyScalar(15);
        velocity.y += 4.5;
        this.grenadesInFlight.push({ mesh: grenade, velocity, age: 0 });
        this.showMessage(`Granada lanzada · ${this.player.grenades} restantes`, 1.2);
    }

    explodeGrenade(position) {
        const radius = 7;
        for (const yeti of [...this.forest.enemies]) {
            const distance = yeti.position.distanceTo(position);
            if (distance <= radius) {
                const damage = Math.max(2, Math.ceil(16 * (1 - distance / radius)));
                this.forest.damage(yeti, damage);
            }
        }
        const blastMaterial = new THREE.MeshBasicMaterial({
            color: 0xffad56,
            transparent: true,
            opacity: 0.55,
            wireframe: true,
            depthWrite: false
        });
        const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), blastMaterial);
        blast.position.copy(position);
        this.scene.add(blast);
        this.grenadeEffects.push({ mesh: blast, age: 0 });
        this.showMessage('¡Granada de impacto!', 1);
    }

    updateGrenades(delta) {
        for (let i = this.grenadesInFlight.length - 1; i >= 0; i -= 1) {
            const grenade = this.grenadesInFlight[i];
            grenade.age += delta;
            grenade.velocity.y -= 12 * delta;
            grenade.mesh.position.addScaledVector(grenade.velocity, delta);
            grenade.mesh.rotation.x += delta * 8;
            grenade.mesh.rotation.z += delta * 6;
            const hitYeti = this.forest.enemies.some(
                (yeti) => grenade.mesh.position.distanceTo(yeti.position.clone().add(new THREE.Vector3(0, 1.1, 0))) < 1.1
            );
            if (hitYeti || grenade.mesh.position.y <= 0.25 || grenade.age >= 3) {
                const impact = grenade.mesh.position.clone();
                this.scene.remove(grenade.mesh);
                grenade.mesh.traverse((part) => {
                    if (part.material) part.material.dispose();
                });
                this.grenadesInFlight.splice(i, 1);
                this.explodeGrenade(impact);
            }
        }

        for (let i = this.grenadeEffects.length - 1; i >= 0; i -= 1) {
            const effect = this.grenadeEffects[i];
            effect.age += delta;
            const scale = 0.6 + effect.age * 11;
            effect.mesh.scale.setScalar(scale);
            effect.mesh.material.opacity = Math.max(0, 0.55 * (1 - effect.age / 0.42));
            if (effect.age >= 0.42) {
                this.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                this.grenadeEffects.splice(i, 1);
            }
        }
    }

    spawnMuzzleSmoke() {
        if (this.player.weapon === 'fists') return;
        this.camera.updateMatrixWorld(true);
        const weapon = this.player.weapon === 'uzi' ? this.player.fpUzi : this.player.fpGun;
        weapon.updateMatrixWorld(true);
        const muzzlePosition = weapon.localToWorld(new THREE.Vector3(0.015, 0.04, -0.46));
        for (let i = 0; i < 5; i += 1) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 7, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xeaf3f5,
                    transparent: true,
                    opacity: 0.75,
                    depthWrite: false
                })
            );
            mesh.position.copy(muzzlePosition);
            mesh.position.x += (Math.random() - 0.5) * 0.07;
            mesh.position.y += (Math.random() - 0.5) * 0.07;
            this.scene.add(mesh);
            this.smokeParticles.push({ mesh, age: 0 });
        }
    }

    playShotSound() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(150, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(45, audio.currentTime + 0.09);
        gain.gain.setValueAtTime(0.13, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.1);
        oscillator.addEventListener('ended', () => audio.close(), { once: true });
    }

    damagePlayer(amount = 1) {
        if (!this.alive) return;
        this.player.health = Math.max(0, this.player.health - amount);
        healthCountElement.textContent = String(this.player.health);
        const stage = document.querySelector('.game-stage');
        stage.animate(
            [{ boxShadow: 'inset 0 0 0 0 rgba(255,40,40,0)' }, { boxShadow: 'inset 0 0 90px 35px rgba(255,40,40,.6)' }, { boxShadow: 'inset 0 0 0 0 rgba(255,40,40,0)' }],
            { duration: 260, easing: 'ease-out' }
        );
        this.showMessage(`¡Golpe recibido! ${this.player.health} / 20`, 0.8);
        if (this.player.health === 0) this.explode();
    }

    startSuplex(yeti) {
        const direction = yeti.position.clone().sub(this.player.position).setY(0).normalize();
        const targetYaw = Math.atan2(-direction.x, -direction.z);
        this.player.inSuplex = true;
        this.player.thirdPerson = true;
        this.player.danceRemaining = 0;
        this.player.root.visible = true;
        this.player.fpHands.visible = false;
        this.suplex = {
            yeti,
            elapsed: 0,
            duration: 2.8,
            startYetiPosition: yeti.position.clone(),
            startPlayerYaw: this.player.yaw,
            targetPlayerYaw: targetYaw,
            startYetiRotationX: yeti.rotation.x,
            startYetiRotationZ: yeti.rotation.z
        };
        this.showMessage('¡SUPLEX!', 2.8);
    }

    updateSuplex(delta) {
        if (!this.suplex) return;
        const action = this.suplex;
        const yeti = action.yeti;
        const data = yeti.userData.enemy;
        action.elapsed += delta;
        const progress = Math.min(action.elapsed / action.duration, 1);
        const smooth = (value) => value * value * (3 - 2 * value);
        const approach = smooth(Math.min(progress / 0.24, 1));
        const lift = smooth(THREE.MathUtils.clamp((progress - 0.2) / 0.36, 0, 1));
        const slam = smooth(THREE.MathUtils.clamp((progress - 0.54) / 0.25, 0, 1));
        const settle = smooth(THREE.MathUtils.clamp((progress - 0.78) / 0.22, 0, 1));

        let yawDelta = action.targetPlayerYaw - action.startPlayerYaw;
        yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
        this.player.yaw = action.startPlayerYaw + yawDelta * approach;
        this.player.root.rotation.y = this.player.yaw;
        this.player.sceneModel.rotation.x = -0.25 * approach + 0.85 * slam * (1 - settle);
        this.player.leftArm.rotation.x = -1.25 * approach + Math.sin(progress * Math.PI * 5) * 0.12;
        this.player.rightArm.rotation.x = -1.25 * approach - Math.sin(progress * Math.PI * 5) * 0.12;
        this.player.root.visible = true;
        this.player.fpHands.visible = false;

        const towardPlayer = this.player.position.clone().sub(action.startYetiPosition).setY(0).normalize();
        const throwBack = towardPlayer.multiplyScalar(1.7 * slam);
        yeti.position.x = action.startYetiPosition.x + throwBack.x;
        yeti.position.z = action.startYetiPosition.z + throwBack.z;
        yeti.position.y = 1.5 * lift * (1 - slam) + 0.28 * slam * (1 - settle);
        yeti.rotation.y = data.suplex.yaw;
        yeti.rotation.x = action.startYetiRotationX - 0.55 * lift - 1.15 * slam + 0.1 * settle;
        yeti.rotation.z = action.startYetiRotationZ + Math.sin(progress * Math.PI) * 0.22;
        data.leftArm.rotation.x = -1.4 * approach + 1.8 * slam;
        data.rightArm.rotation.x = -1.4 * approach - 1.8 * slam;
        data.leftLeg.rotation.x = -0.8 * lift + 1.1 * slam;
        data.rightLeg.rotation.x = 0.8 * lift - 1.1 * slam;

        if (progress < 1) return;

        this.suplex = null;
        this.player.inSuplex = false;
        this.player.thirdPerson = false;
        this.player.danceRemaining = 0;
        this.player.sceneModel.rotation.set(0, 0, 0);
        this.player.root.visible = false;
        this.player.fpHands.visible = true;
        this.forest.killYeti(
            yeti,
            towardPlayer.multiplyScalar(5).add(new THREE.Vector3(0, 4.5, 0))
        );
    }

    explode() {
        this.alive = false;
        this.player.alive = false;
        this.player.zoomRequested = false;
        this.player.keys.clear();
        this.player.root.visible = true;
        this.player.thirdPerson = true;
        this.player.fpHands.visible = false;
        this.explosionTimer = 1.7;
        const center = this.player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
        for (let i = 0; i < 95; i += 1) {
            const particle = new THREE.Mesh(
                this.explosionGeometry,
                this.explosionMaterials[i % this.explosionMaterials.length]
            );
            particle.position.copy(center);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 8 + 1.5,
                (Math.random() - 0.5) * 10
            );
            this.scene.add(particle);
            this.particles.push({ mesh: particle, velocity, age: 0 });
        }
        this.showMessage('¡EXPLOSIÓN!', 1.7);
    }

    showMessage(text, duration) {
        this.message.textContent = text;
        this.message.style.opacity = '1';
        this.messageTimer = duration;
    }

    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i -= 1) {
            const particle = this.particles[i];
            particle.age += delta;
            particle.velocity.y -= 9.8 * delta;
            particle.mesh.position.addScaledVector(particle.velocity, delta);
            particle.mesh.rotation.x += delta * 5;
            particle.mesh.rotation.z += delta * 3;
            particle.mesh.scale.multiplyScalar(1 - delta * 0.35);
            if (particle.age >= 1.6) {
                this.scene.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    updateSmoke(delta) {
        for (let i = this.smokeParticles.length - 1; i >= 0; i -= 1) {
            const particle = this.smokeParticles[i];
            particle.age += delta;
            particle.mesh.position.y += delta * 0.28;
            particle.mesh.scale.multiplyScalar(1 + delta * 1.8);
            particle.mesh.material.opacity = Math.max(0, 0.75 * (1 - particle.age / 0.55));
            if (particle.age >= 0.55) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.smokeParticles.splice(i, 1);
            }
        }
    }

    showGameOver() {
        this.gameOver = true;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        overlayBadge.textContent = `Llegaste a la oleada ${this.forest.wave}`;
        overlayTitle.textContent = 'Has muerto';
        overlayDescription.textContent = `Tu personaje explotó tras recibir 20 golpes. Eliminaste ${this.forest.kills} yetis.`;
        startButton.textContent = 'Jugar de nuevo';
        overlay.classList.remove('is-hidden');
    }

    async start() {
        if (this.gameOver) {
            window.location.reload();
            return;
        }
        if (typeof canvas.requestPointerLock !== 'function') {
            gameError.textContent = 'Para activar el control del ratón, abre esta página desde un servidor local (por ejemplo, Live Server).';
            gameError.hidden = false;
            return;
        }
        try {
            await canvas.requestPointerLock();
            gameError.hidden = true;
            this.started = true;
            overlayBadge.textContent = `Supervivencia · Oleada ${this.forest.wave}`;
            overlayTitle.textContent = 'Bosque invernal';
            overlayDescription.textContent = 'Sobrevive al frío y defiéndete de los yetis.';
            startButton.textContent = 'Entrar al bosque';
        } catch {
            gameError.textContent = 'El navegador no permitió bloquear el ratón. Haz clic de nuevo o abre el juego con Live Server.';
            gameError.hidden = false;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.time += delta;

        if (this.alive) {
            const active = this.started && document.pointerLockElement === canvas && !this.suplex;
            this.player.update(delta, this.time, active);
            if (active) this.updateReload(delta);
            if (active && !this.grapple) this.forest.update(delta, this.time);
            if (this.grapple) this.updateGrapple(delta, this.time);
            if (active && this.player.weapon === 'uzi' && this.player.fireHeld && !this.grapple) {
                this.player.fireCooldown -= delta;
                if (this.player.fireCooldown <= 0) {
                    this.shoot();
                    this.player.fireCooldown = 0.105;
                }
            }
            this.updateSuplex(delta);
        } else {
            this.player.update(delta, this.time);
            this.explosionTimer -= delta;
            if (this.explosionTimer <= 0 && !this.gameOver) this.showGameOver();
        }

        this.updateGrenades(delta);
        this.updateParticles(delta);
        this.updateSmoke(delta);
        this.messageTimer = Math.max(0, this.messageTimer - delta);
        if (this.messageTimer === 0) this.message.style.opacity = '0';
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new WinterForestGame();
startButton.addEventListener('click', () => game.start());
