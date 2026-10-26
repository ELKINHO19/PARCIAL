import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvas = document.querySelector('#flight-canvas');
const overlay = document.querySelector('#flight-overlay');
const startButton = document.querySelector('#start-button');
const gameError = document.querySelector('#game-error');
const overlayBadge = document.querySelector('#overlay-badge');
const overlayTitle = document.querySelector('#overlay-title');
const overlayDescription = document.querySelector('#overlay-description');
const reticle = document.querySelector('.flight-reticle');
const healthCount = document.querySelector('#health-count');
const healthFill = document.querySelector('#health-fill');
const speedCount = document.querySelector('#speed-count');
const altitudeCount = document.querySelector('#altitude-count');
const enemyCount = document.querySelector('#enemy-count');
const killCount = document.querySelector('#kill-count');
const ammoDisplay = document.querySelector('#ammo-display');
const ammoCount = document.querySelector('#ammo-count');
const ammoFill = document.querySelector('#ammo-fill');
const ammoStatus = document.querySelector('#ammo-status');
const radarCanvas = document.querySelector('#flight-radar');
const radarContext = radarCanvas.getContext('2d');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x89939c);
scene.fog = new THREE.Fog(0x89939c, 850, 6100);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 16000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xdde9f1, 0x443d36, 2.1));
const sunlight = new THREE.DirectionalLight(0xffc987, 2.6);
sunlight.position.set(-300, 700, 250);
scene.add(sunlight);

const keys = new Set();
const enemies = [];
const wrecks = [];
const playerBullets = [];
const enemyBullets = [];
const explosions = [];
const clouds = [];
const sceneryTiles = [];
const turrets = [];
const clock = new THREE.Clock();
const localForward = new THREE.Vector3(0, 0, -1);
const cameraOffset = new THREE.Vector3();
const targetCameraPosition = new THREE.Vector3();
const forward = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
const aimRaycaster = new THREE.Raycaster();
const aimScreenPoint = new THREE.Vector2(0, 0.18);
const aimTarget = new THREE.Vector3();
const reticleWorldPoint = new THREE.Vector3();
const GROUND_LEVEL = -8;
const TURRET_ALTITUDE_LIMIT = 200;
const TURRET_RANGE = 1100;
const TURRET_DAMAGE = 35;
const TURRET_FIRE_INTERVAL = [0.25, 0.4];
const AMMO_CAPACITY = 100;
const RELOAD_DURATION = 5;
const RADAR_RANGE = 2200;
const projectileBodyGeometry = new THREE.CylinderGeometry(1.15, 1.15, 15, 8);
const projectileTipGeometry = new THREE.ConeGeometry(1.8, 6, 8);
const playerProjectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });
const enemyProjectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff593f });
const turretProjectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff7649 });
const projectileAxis = new THREE.Vector3(0, 1, 0);

const turretMaterials = {
    base: new THREE.MeshStandardMaterial({ color: 0x434747, roughness: 0.88, metalness: 0.35 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x63645a, roughness: 0.78, metalness: 0.42 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0x292d2e, roughness: 0.68, metalness: 0.58 })
};
const turretBaseGeometry = new THREE.CylinderGeometry(6, 8, 8, 10);
const turretArmorGeometry = new THREE.BoxGeometry(15, 7, 13);
const turretBarrelGeometry = new THREE.BoxGeometry(3.4, 3.4, 28);

const game = {
    active: false,
    health: 100,
    kills: 0,
    speed: 180,
    ammo: AMMO_CAPACITY,
    reloadTimer: 0,
    fireCooldown: 0,
    enemySpawnTimer: 2.5,
    elapsed: 0,
    cameraReady: false,
    pitchRate: 0,
    rollRate: 0,
    velocity: new THREE.Vector3()
};

function addBox(parent, size, material, position, rotation = null) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
}

function buildAircraft(color, trimColor) {
    // El modelo apunta hacia -Z para compartir el mismo eje de avance que la cámara.
    const plane = new THREE.Group();
    plane.rotation.order = 'YXZ';
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.24 });
    const trim = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.52, metalness: 0.22 });
    const glass = new THREE.MeshStandardMaterial({
        color: 0x183649,
        roughness: 0.18,
        metalness: 0.35,
        transparent: true,
        opacity: 0.9
    });
    const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0xd9e0e2, metalness: 0.45 });
    const engineMaterial = new THREE.MeshStandardMaterial({ color: 0x353a39, roughness: 0.58, metalness: 0.62 });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.64, 5.8, 12), body);
    fuselage.rotation.x = Math.PI / 2;
    plane.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.05, 12), trim);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -3.25;
    plane.add(nose);

    addBox(plane, [9.2, 0.16, 1.45], body, [0, -0.02, -0.15]);
    addBox(plane, [3.25, 0.12, 0.78], body, [0, 0.03, 2.28]);
    addBox(plane, [0.16, 1.05, 0.95], body, [0, 0.48, 2.2]);
    addBox(plane, [1.15, 0.1, 0.95], trim, [-3.55, 0.08, 0.55]);
    addBox(plane, [1.15, 0.1, 0.95], trim, [3.55, 0.08, 0.55]);
    addBox(plane, [0.16, 0.42, 0.65], trim, [-4.48, 0.18, -0.18]);
    addBox(plane, [0.16, 0.42, 0.65], trim, [4.48, 0.18, -0.18]);

    for (const side of [-1, 1]) {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 2.5, 10), engineMaterial);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(side * 1.8, -0.04, 0.65);
        plane.add(engine);
        addBox(plane, [0.15, 0.14, 2.25], trim, [side * 2.85, 0.13, -0.12]);
        addBox(plane, [0.22, 0.2, 1.2], engineMaterial, [side * 0.72, -0.32, -0.9]);
    }

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 10), glass);
    cockpit.scale.set(0.8, 0.58, 1.5);
    cockpit.position.set(0, 0.43, -0.65);
    plane.add(cockpit);

    const stripeLeft = addBox(plane, [0.11, 0.035, 1.35], trim, [-1.25, 0.1, -0.18]);
    const stripeRight = stripeLeft.clone();
    stripeRight.position.x = 1.25;
    plane.add(stripeRight);

    const propeller = new THREE.Group();
    propeller.position.z = -3.78;
    plane.add(propeller);
    addBox(propeller, [0.17, 2.45, 0.1], propellerMaterial, [0, 0, 0]);
    addBox(propeller, [2.45, 0.17, 0.1], propellerMaterial, [0, 0, 0]);
    plane.userData.propeller = propeller;
    return plane;
}

const player = buildAircraft(0x697748, 0xd6bc68);
player.scale.setScalar(3.2);
player.position.set(0, 240, 0);
scene.add(player);

function createSceneryTile(z) {
    const tile = new THREE.Group();
    tile.position.z = z;

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(5200, 2600),
        new THREE.MeshStandardMaterial({ color: 0x484847, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_LEVEL;
    tile.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x303436, roughness: 1 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(290, 2600), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, GROUND_LEVEL + 0.15, 0);
    tile.add(road);

    const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(95, 2600), roadMaterial);
    sideRoad.rotation.x = -Math.PI / 2;
    sideRoad.position.set(-700, GROUND_LEVEL + 0.16, 0);
    tile.add(sideRoad);
    const otherSideRoad = sideRoad.clone();
    otherSideRoad.position.x = 700;
    tile.add(otherSideRoad);

    const transform = new THREE.Object3D();
    const columns = [-2250, -1800, -1350, -900, -520, 520, 900, 1350, 1800, 2250];
    const rows = [-1050, -630, -210, 210, 630, 1050];
    const buildings = [];
    for (const localZ of rows) {
        for (const x of columns) {
            if (Math.random() < 0.12) continue;
            const height = THREE.MathUtils.randFloat(45, 150)
                + (Math.random() < 0.18 ? THREE.MathUtils.randFloat(60, 130) : 0);
            buildings.push({
                x: x + THREE.MathUtils.randFloatSpread(65),
                z: localZ + THREE.MathUtils.randFloatSpread(45),
                width: THREE.MathUtils.randFloat(180, 285),
                depth: THREE.MathUtils.randFloat(170, 320),
                height
            });
        }
    }

    const buildingColors = [0x77736c, 0x625f5b, 0x89847b, 0x55595a, 0x706b63];
    const buildingMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0.06 }),
        buildings.length
    );
    const windows = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x292f32, roughness: 0.96, metalness: 0.04 }),
        buildings.length * 20
    );
    const damage = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x343331, roughness: 1 }),
        buildings.length * 2
    );
    const rubble = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x5b5751, roughness: 1 }),
        buildings.length * 3
    );
    const smokeEmitters = [];
    let windowIndex = 0;
    let damageIndex = 0;
    let rubbleIndex = 0;

    for (let i = 0; i < buildings.length; i += 1) {
        const building = buildings[i];
        const { x, z, width, depth, height } = building;
        buildingMesh.setColorAt(i, new THREE.Color(
            buildingColors[Math.floor(Math.random() * buildingColors.length)]
        ));
        transform.position.set(x, GROUND_LEVEL + height / 2, z);
        transform.scale.set(width, height, depth);
        transform.rotation.set(0, 0, 0);
        transform.updateMatrix();
        buildingMesh.setMatrixAt(i, transform.matrix);

        const floors = Math.min(5, Math.max(2, Math.floor(height / 18)));
        for (const face of [-1, 1]) {
            for (let floor = 0; floor < floors; floor += 1) {
                for (const side of [-1, 1]) {
                    transform.position.set(
                        x + side * width * 0.22,
                        GROUND_LEVEL + (floor + 0.55) * height / floors,
                        z + face * (depth / 2 + 0.8)
                    );
                    transform.scale.set(width * 0.19, 3.2, 1.2);
                    transform.rotation.set(0, 0, 0);
                    transform.updateMatrix();
                    windows.setMatrixAt(windowIndex++, transform.matrix);
                }
            }
        }

        for (let piece = 0; piece < 2; piece += 1) {
            transform.position.set(
                x + THREE.MathUtils.randFloatSpread(width * 0.65),
                GROUND_LEVEL + THREE.MathUtils.randFloat(height * 0.32, height * 0.9),
                z + (Math.random() < 0.5 ? -1 : 1) * (depth / 2 + 1.4)
            );
            transform.scale.set(
                THREE.MathUtils.randFloat(18, 48),
                THREE.MathUtils.randFloat(8, 28),
                2
            );
            transform.rotation.set(THREE.MathUtils.randFloatSpread(0.18), 0, THREE.MathUtils.randFloatSpread(0.25));
            transform.updateMatrix();
            damage.setMatrixAt(damageIndex++, transform.matrix);
        }

        for (let piece = 0; piece < 3; piece += 1) {
            transform.position.set(
                x + THREE.MathUtils.randFloatSpread(width * 0.9),
                GROUND_LEVEL + 2,
                z + THREE.MathUtils.randFloatSpread(depth * 0.9)
            );
            transform.scale.set(
                THREE.MathUtils.randFloat(12, 35),
                THREE.MathUtils.randFloat(4, 14),
                THREE.MathUtils.randFloat(12, 35)
            );
            transform.rotation.set(0, THREE.MathUtils.randFloat(0, Math.PI), THREE.MathUtils.randFloatSpread(0.12));
            transform.updateMatrix();
            rubble.setMatrixAt(rubbleIndex++, transform.matrix);
        }
    }

    windows.count = windowIndex;
    damage.count = damageIndex;
    rubble.count = rubbleIndex;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    for (const mesh of [buildingMesh, windows, damage, rubble]) {
        mesh.instanceMatrix.needsUpdate = true;
        tile.add(mesh);
    }

    const laneMarkings = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(5, 34),
        new THREE.MeshBasicMaterial({ color: 0xc5a868 }),
        20
    );
    for (let i = 0; i < 20; i += 1) {
        transform.position.set(0, GROUND_LEVEL + 0.22, -1230 + i * 130);
        transform.rotation.set(-Math.PI / 2, 0, 0);
        transform.scale.setScalar(1);
        transform.updateMatrix();
        laneMarkings.setMatrixAt(i, transform.matrix);
    }
    laneMarkings.instanceMatrix.needsUpdate = true;
    tile.add(laneMarkings);

    const tileTurrets = [];
    for (const x of [-320, 320]) {
        for (const localZ of [-850, 0, 850]) {
            const turret = new THREE.Group();
            turret.position.set(x, 0, localZ + THREE.MathUtils.randFloatSpread(90));
            const base = new THREE.Mesh(turretBaseGeometry, turretMaterials.base);
            base.position.y = -4;
            turret.add(base);
            const head = new THREE.Group();
            head.rotation.order = 'YXZ';
            head.position.y = 1;
            head.add(new THREE.Mesh(turretArmorGeometry, turretMaterials.armor));
            const barrel = new THREE.Mesh(turretBarrelGeometry, turretMaterials.barrel);
            barrel.position.set(0, 1, -14);
            head.add(barrel);
            turret.add(head);
            tile.add(turret);
            const entry = { group: turret, head, cooldown: THREE.MathUtils.randFloat(0.2, 0.65) };
            tileTurrets.push(entry);
            turrets.push(entry);
        }
    }

    for (const building of buildings) {
        if (building.height < 58 || Math.random() > 0.35) continue;
        const emitter = new THREE.Group();
        emitter.position.set(building.x, GROUND_LEVEL + building.height, building.z);
        const particles = [];
        for (let i = 0; i < 5; i += 1) {
            const material = new THREE.MeshBasicMaterial({
                color: 0x33383a,
                transparent: true,
                opacity: 0.42,
                depthWrite: false
            });
            const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), material);
            emitter.add(puff);
            particles.push({
                mesh: puff,
                life: Math.random(),
                duration: THREE.MathUtils.randFloat(3.5, 6.5),
                size: THREE.MathUtils.randFloat(26, 36),
                drift: THREE.MathUtils.randFloatSpread(12)
            });
        }
        tile.add(emitter);
        smokeEmitters.push({ emitter, particles });
    }

    tile.userData.buildings = buildings;
    tile.userData.turrets = tileTurrets;
    tile.userData.smokeEmitters = smokeEmitters;
    tile.userData.initialZ = z;
    scene.add(tile);
    sceneryTiles.push(tile);
}

for (let i = 0; i < 5; i += 1) {
    createSceneryTile(1250 - i * 2500);
}

function createCloud() {
    const cloud = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0xf7fbff,
        roughness: 1,
        transparent: true,
        opacity: 0.86,
        depthWrite: false
    });
    const puffs = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < puffs; i += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material);
        const size = THREE.MathUtils.randFloat(20, 55);
        puff.scale.set(size * 1.5, size * 0.62, size);
        puff.position.set(
            (i - (puffs - 1) / 2) * size * 0.78,
            THREE.MathUtils.randFloat(-8, 12),
            THREE.MathUtils.randFloat(-size * 0.3, size * 0.3)
        );
        cloud.add(puff);
    }
    cloud.position.set(
        THREE.MathUtils.randFloatSpread(5200),
        THREE.MathUtils.randFloat(145, 650),
        THREE.MathUtils.randFloat(-9000, 1400)
    );
    cloud.userData.initialX = cloud.position.x;
    cloud.userData.initialZ = cloud.position.z;
    scene.add(cloud);
    clouds.push(cloud);
}

for (let i = 0; i < 28; i += 1) createCloud();

function resizeRenderer() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();

function setOverlay({ badge, title, description, button }) {
    overlayBadge.textContent = badge;
    overlayTitle.innerHTML = title;
    overlayDescription.textContent = description;
    startButton.textContent = button;
    overlay.hidden = false;
}

function updateHud() {
    healthCount.textContent = String(Math.ceil(game.health));
    healthFill.style.width = `${Math.max(0, game.health)}%`;
    healthFill.style.backgroundColor = game.health < 30 ? '#ff4d5e' : '#ffbd62';
    speedCount.textContent = String(Math.round(game.speed * 3.6));
    altitudeCount.textContent = String(Math.max(0, Math.round((player.position.y - GROUND_LEVEL) * 10)));
    enemyCount.textContent = String(enemies.length);
    killCount.textContent = String(game.kills);
    ammoCount.textContent = String(game.ammo);
    ammoFill.style.width = `${game.ammo / AMMO_CAPACITY * 100}%`;
    const reloading = game.reloadTimer > 0;
    ammoDisplay.classList.toggle('is-reloading', reloading);
    ammoStatus.textContent = reloading
        ? `RECARGANDO · ${game.reloadTimer.toFixed(1)} s`
        : game.ammo === 0
            ? 'RECARGA EN CURSO'
            : 'ESPACIO O CLIC PARA DISPARAR';
    drawRadar();
}

function drawRadar() {
    const { width, height } = radarCanvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.43;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
    const heading = localForward.clone().applyQuaternion(player.quaternion);

    radarContext.clearRect(0, 0, width, height);
    radarContext.strokeStyle = '#82c9b477';
    radarContext.lineWidth = 2;
    for (const fraction of [0.4, 0.7, 1]) {
        radarContext.beginPath();
        radarContext.arc(centerX, centerY, radius * fraction, 0, Math.PI * 2);
        radarContext.stroke();
    }
    radarContext.beginPath();
    radarContext.moveTo(centerX - radius, centerY);
    radarContext.lineTo(centerX + radius, centerY);
    radarContext.moveTo(centerX, centerY - radius);
    radarContext.lineTo(centerX, centerY + radius);
    radarContext.stroke();

    radarContext.save();
    radarContext.translate(centerX, centerY);
    radarContext.fillStyle = '#8dffbb';
    radarContext.beginPath();
    radarContext.moveTo(0, -11);
    radarContext.lineTo(7, 8);
    radarContext.lineTo(0, 5);
    radarContext.lineTo(-7, 8);
    radarContext.closePath();
    radarContext.fill();
    radarContext.restore();

    radarContext.fillStyle = '#ff665d';
    for (const enemy of enemies) {
        const relativePosition = enemy.position.clone().sub(player.position);
        const x = right.dot(relativePosition) / RADAR_RANGE * radius;
        const y = -heading.dot(relativePosition) / RADAR_RANGE * radius;
        if (x * x + y * y > radius * radius) continue;
        radarContext.beginPath();
        radarContext.arc(centerX + x, centerY + y, 7, 0, Math.PI * 2);
        radarContext.fill();
    }
}

function clearObjects(objects) {
    for (const object of objects) {
        scene.remove(object.mesh || object);
        object.mesh?.traverse((child) => {
            if (child.geometry && !child.userData.sharedGeometry) child.geometry.dispose();
        });
    }
    objects.length = 0;
}

function disposeAircraft(aircraft) {
    const materials = new Set();
    aircraft.traverse((child) => {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
            child.material.forEach((material) => materials.add(material));
        } else if (child.material) {
            materials.add(child.material);
        }
    });
    materials.forEach((material) => material.dispose());
}

function resetGame() {
    clearObjects(enemies);
    for (const wreck of wrecks) disposeAircraft(wreck.mesh);
    clearObjects(wrecks);
    clearObjects(playerBullets);
    clearObjects(enemyBullets);
    clearObjects(explosions);
    game.health = 100;
    game.kills = 0;
    game.speed = 180;
    game.ammo = AMMO_CAPACITY;
    game.reloadTimer = 0;
    game.fireCooldown = 0;
    game.enemySpawnTimer = 1.5;
    game.elapsed = 0;
    game.active = true;
    game.cameraReady = false;
    game.pitchRate = 0;
    game.rollRate = 0;
    player.visible = true;
    player.position.set(0, 240, 0);
    player.rotation.set(0, 0, 0);
    game.velocity.set(0, 0, -game.speed);
    for (const tile of sceneryTiles) {
        tile.position.z = tile.userData.initialZ;
        for (const turret of tile.userData.turrets) {
            turret.cooldown = THREE.MathUtils.randFloat(0.1, 0.3);
            turret.head.rotation.set(0, 0, 0);
        }
    }
    for (const cloud of clouds) {
        cloud.position.set(cloud.userData.initialX, cloud.position.y, cloud.userData.initialZ);
    }
    keys.clear();
    updateHud();
    overlay.hidden = true;
    clock.getDelta();
}

function spawnExplosion(position, scale = 1) {
    // El mismo efecto visual se usa para impactos pequeños y destrucción de aeronaves.
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xff9a38, transparent: true, opacity: 0.9 })
    );
    mesh.position.copy(position);
    mesh.scale.setScalar(1.5 * scale);
    scene.add(mesh);
    explosions.push({ mesh, life: 0.65, maxLife: 0.65, scale });
}

function endGame(collided) {
    if (!game.active) return;
    game.active = false;
    spawnExplosion(player.position, 2.2);
    player.visible = false;
    keys.clear();
    setOverlay({
        badge: collided ? 'Misión finalizada · Impacto' : 'Misión finalizada · Avión derribado',
        title: 'Avión <span class="text-accent">destruido</span>',
        description: `Derribaste ${game.kills} ${game.kills === 1 ? 'avión enemigo' : 'aviones enemigos'}. Vuelve a despegar para intentarlo de nuevo.`,
        button: 'Volver a volar'
    });
}

function damagePlayer(amount) {
    if (!game.active) return;
    game.health = Math.max(0, game.health - amount);
    updateHud();
    if (game.health <= 0) endGame(false);
}

function spawnEnemy() {
    // Aparece por delante para que el jugador pueda enfrentarlo y abrir fuego.
    const enemy = buildAircraft(0x9f3028, 0xf0b747);
    enemy.scale.setScalar(3.2);
    const forwardDirection = localForward.clone().applyQuaternion(player.quaternion);
    const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
    enemy.position.copy(player.position)
        .addScaledVector(forwardDirection, THREE.MathUtils.randFloat(380, 620))
        .addScaledVector(rightDirection, THREE.MathUtils.randFloatSpread(220));
    enemy.position.y += THREE.MathUtils.randFloat(-55, 55);
    const initialDirection = player.position.clone().sub(enemy.position).normalize();
    enemy.rotation.set(
        Math.atan2(initialDirection.y, Math.hypot(initialDirection.x, initialDirection.z)),
        Math.atan2(-initialDirection.x, -initialDirection.z),
        0,
        'YXZ'
    );
    enemy.userData.health = 3;
    enemy.userData.fireCooldown = THREE.MathUtils.randFloat(1.2, 2.8);
    enemy.userData.turn = Math.random() < 0.5 ? -1 : 1;
    enemy.userData.speed = THREE.MathUtils.randFloat(72, 112);
    scene.add(enemy);
    enemies.push(enemy);
}

function createProjectile(position, direction, material) {
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(projectileBodyGeometry, material);
    const tip = new THREE.Mesh(projectileTipGeometry, material);
    body.userData.sharedGeometry = true;
    tip.userData.sharedGeometry = true;
    tip.position.y = 9.5;
    mesh.add(body, tip);
    mesh.position.copy(position);
    mesh.quaternion.setFromUnitVectors(projectileAxis, direction);
    scene.add(mesh);
    return mesh;
}

function getPlayerAimDirection() {
    camera.updateMatrixWorld(true);
    aimRaycaster.setFromCamera(aimScreenPoint, camera);
    aimRaycaster.ray.at(1000, aimTarget);
    return aimTarget.sub(player.position).normalize();
}

function firePlayerBullet() {
    if (!game.active || game.ammo <= 0 || game.reloadTimer > 0) return;
    // Los proyectiles heredan la velocidad del avión para conservar su dirección de vuelo.
    forward.copy(getPlayerAimDirection());
    const muzzlePosition = player.position.clone().addScaledVector(forward, 14);
    const bullet = createProjectile(muzzlePosition, forward, playerProjectileMaterial);
    playerBullets.push({
        mesh: bullet,
        velocity: forward.clone().multiplyScalar(530).add(forward.clone().multiplyScalar(game.speed)),
        life: 2.4
    });
    game.ammo -= 1;
    if (game.ammo === 0) game.reloadTimer = RELOAD_DURATION;
    game.fireCooldown = 0.07;
}

function fireEnemyBullet(enemy) {
    // La IA apunta a la posición actual del jugador; el disparo no lo sigue después.
    const velocity = player.position.clone().sub(enemy.position).normalize().multiplyScalar(175);
    const muzzlePosition = enemy.position.clone().addScaledVector(velocity, 0.09);
    const bullet = createProjectile(muzzlePosition, velocity.clone().normalize(), enemyProjectileMaterial);
    enemyBullets.push({ mesh: bullet, velocity, life: 5, damage: 12 });
    enemy.userData.fireCooldown = THREE.MathUtils.randFloat(1.9, 3.3);
}

function startEnemyCrash(enemy) {
    const crashDirection = localForward.clone().applyQuaternion(enemy.quaternion).normalize();
    wrecks.push({
        mesh: enemy,
        velocity: crashDirection.multiplyScalar(enemy.userData.speed * 0.65)
            .add(new THREE.Vector3(0, -28, 0)),
        spin: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(1.8),
            THREE.MathUtils.randFloatSpread(1.8),
            THREE.MathUtils.randFloatSpread(1.8)
        ),
        crashed: false,
        cleanupTimer: 3.5
    });
}

function updateTurrets(delta) {
    const altitude = player.position.y - GROUND_LEVEL;
    if (altitude > TURRET_ALTITUDE_LIMIT) return;

    for (const turret of turrets) {
        turret.cooldown -= delta;
        turret.group.getWorldPosition(aimTarget);
        const dx = player.position.x - aimTarget.x;
        const dz = player.position.z - aimTarget.z;
        if (dx * dx + dz * dz > TURRET_RANGE * TURRET_RANGE) continue;

        const distance = player.position.distanceTo(aimTarget);
        const leadTime = distance / 520;
        const direction = player.position.clone()
            .addScaledVector(forward, game.speed * leadTime * 0.85)
            .sub(aimTarget)
            .normalize();
        turret.head.rotation.set(
            Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
            Math.atan2(-direction.x, -direction.z),
            0,
            'YXZ'
        );
        if (turret.cooldown > 0) continue;

        turret.head.updateMatrixWorld(true);
        const bulletPosition = turret.head.localToWorld(new THREE.Vector3(0, 1, -29));
        const shotDirection = direction.normalize();
        const bullet = createProjectile(bulletPosition, shotDirection, turretProjectileMaterial);
        enemyBullets.push({
            mesh: bullet,
            velocity: shotDirection.clone().multiplyScalar(650),
            life: 5,
            damage: TURRET_DAMAGE
        });
        turret.cooldown = THREE.MathUtils.randFloat(...TURRET_FIRE_INTERVAL);
    }
}

function updatePlayer(delta) {
    const pitchInput = Number(keys.has('ArrowUp') || keys.has('KeyW'))
        - Number(keys.has('ArrowDown') || keys.has('KeyS'));
    const turnInput = Number(keys.has('ArrowRight') || keys.has('KeyD'))
        - Number(keys.has('ArrowLeft') || keys.has('KeyA'));

    const desiredSpeed = keys.has('ShiftLeft') || keys.has('ShiftRight')
        ? 190
        : keys.has('ControlLeft') || keys.has('ControlRight')
            ? 145
            : 180;
    game.speed += (desiredSpeed - game.speed) * (1 - Math.exp(-delta * 1.4));

    game.pitchRate += (pitchInput * 0.72 - game.pitchRate) * (1 - Math.exp(-delta * 2.2));
    const nextPitch = player.rotation.x + game.pitchRate * delta;
    player.rotation.x = THREE.MathUtils.clamp(nextPitch, -0.62, 0.62);
    if (player.rotation.x !== nextPitch) game.pitchRate = 0;

    const desiredBank = -turnInput * 0.9;
    game.rollRate += ((desiredBank - player.rotation.z) * 6 - game.rollRate * 3.4) * delta;
    player.rotation.z = THREE.MathUtils.clamp(
        player.rotation.z + game.rollRate * delta,
        -0.82,
        0.82
    );
    if (Math.abs(player.rotation.z) === 0.82) game.rollRate = 0;
    player.rotation.y += player.rotation.z * delta * 1.05;

    forward.copy(localForward).applyQuaternion(player.quaternion).normalize();
    desiredVelocity.copy(forward).multiplyScalar(game.speed);
    game.velocity.lerp(desiredVelocity, 1 - Math.exp(-delta * 4));
    player.position.addScaledVector(game.velocity, delta);

    player.userData.propeller.rotation.z += delta * 44;
    if (player.position.y <= GROUND_LEVEL + 4) {
        endGame(true);
        return;
    }

    // Los tramos se reciclan delante del jugador para mantener la ciudad continua.
    for (const tile of sceneryTiles) {
        if (tile.position.z > player.position.z + 1450) {
            const farthest = Math.min(...sceneryTiles.map((item) => item.position.z));
            tile.position.z = farthest - 2600;
        }

        if (player.position.y - GROUND_LEVEL < 300) {
            for (const building of tile.userData.buildings) {
                const worldZ = tile.position.z + building.z;
                const dx = player.position.x - building.x;
                const dz = player.position.z - worldZ;
                if (
                    Math.abs(dx) < building.width / 2 + 24
                    && Math.abs(dz) < building.depth / 2 + 12
                    && player.position.y - 10 < GROUND_LEVEL + building.height
                ) {
                    endGame(true);
                    return;
                }
            }
        }
    }

    const bank = Math.abs(player.rotation.z);
    if (player.position.y - GROUND_LEVEL < 38 && Math.abs(player.rotation.x) > 0.45 && bank > 0.5) {
        damagePlayer(delta * 5);
    }

    cameraOffset.set(0, 16, 40).applyQuaternion(player.quaternion);
    targetCameraPosition.copy(player.position).add(cameraOffset);
    if (!game.cameraReady) {
        camera.position.copy(targetCameraPosition);
        game.cameraReady = true;
    } else {
        camera.position.lerp(targetCameraPosition, 1 - Math.exp(-delta * 2.4));
    }
    const lookTarget = player.position.clone().addScaledVector(forward, 70);
    lookTarget.y -= 2;
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld(true);

    reticleWorldPoint.copy(player.position)
        .addScaledVector(aimTarget.copy(game.velocity).normalize(), 700);
    reticleWorldPoint.project(camera);
    const screenX = THREE.MathUtils.clamp((reticleWorldPoint.x + 1) / 2, 0.04, 0.96);
    const screenY = THREE.MathUtils.clamp((1 - reticleWorldPoint.y) / 2, 0.08, 0.92);
    reticle.style.left = `${screenX * 100}%`;
    reticle.style.top = `${screenY * 100}%`;
    aimScreenPoint.set(screenX * 2 - 1, 1 - screenY * 2);
}

function updateEnemies(delta) {
    game.enemySpawnTimer -= delta;
    if (game.enemySpawnTimer <= 0 && enemies.length < 6) {
        spawnEnemy();
        game.enemySpawnTimer = Math.max(2.2, 6.2 - game.elapsed * 0.025);
    }

    for (let index = enemies.length - 1; index >= 0; index -= 1) {
        const enemy = enemies[index];
        const toPlayer = player.position.clone().sub(enemy.position);
        const distance = toPlayer.length();
        toPlayer.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.quaternion).normalize();
        const targetDirection = toPlayer.addScaledVector(right, enemy.userData.turn * 0.22).normalize();
        const desiredYaw = Math.atan2(-targetDirection.x, -targetDirection.z);
        let yawDifference = desiredYaw - enemy.rotation.y;
        yawDifference = Math.atan2(Math.sin(yawDifference), Math.cos(yawDifference));
        enemy.rotation.y += THREE.MathUtils.clamp(yawDifference, -delta * 0.38, delta * 0.38);
        enemy.rotation.x = THREE.MathUtils.clamp(
            Math.atan2(targetDirection.y, Math.hypot(targetDirection.x, targetDirection.z)),
            -0.5,
            0.5
        );
        enemy.rotation.z = THREE.MathUtils.clamp(-yawDifference * 0.8, -0.6, 0.6);
        const forwardEnemy = localForward.clone().applyQuaternion(enemy.quaternion).normalize();
        enemy.position.addScaledVector(forwardEnemy, enemy.userData.speed * delta);
        enemy.userData.propeller.rotation.z += delta * 40;
        enemy.userData.fireCooldown -= delta;
        if (enemy.userData.fireCooldown <= 0 && distance < 900) fireEnemyBullet(enemy);

        if (distance > 2400) {
            scene.remove(enemy);
            enemies.splice(index, 1);
        }
    }
}

function updateWrecks(delta) {
    for (let index = wrecks.length - 1; index >= 0; index -= 1) {
        const wreck = wrecks[index];
        if (wreck.crashed) {
            wreck.cleanupTimer -= delta;
            if (wreck.cleanupTimer <= 0) {
                scene.remove(wreck.mesh);
                disposeAircraft(wreck.mesh);
                wrecks.splice(index, 1);
            }
            continue;
        }

        wreck.velocity.y -= 42 * delta;
        wreck.mesh.position.addScaledVector(wreck.velocity, delta);
        wreck.mesh.rotation.x += wreck.spin.x * delta;
        wreck.mesh.rotation.y += wreck.spin.y * delta;
        wreck.mesh.rotation.z += wreck.spin.z * delta;

        let impactHeight = GROUND_LEVEL + 10;
        for (const tile of sceneryTiles) {
            for (const building of tile.userData.buildings) {
                const dx = wreck.mesh.position.x - building.x;
                const dz = wreck.mesh.position.z - (tile.position.z + building.z);
                if (
                    Math.abs(dx) < building.width / 2
                    && Math.abs(dz) < building.depth / 2
                ) {
                    impactHeight = Math.max(impactHeight, GROUND_LEVEL + building.height + 10);
                }
            }
        }

        if (wreck.mesh.position.y <= impactHeight) {
            wreck.mesh.position.y = impactHeight;
            wreck.velocity.set(0, 0, 0);
            wreck.spin.set(0, 0, 0);
            wreck.crashed = true;
            spawnExplosion(wreck.mesh.position, 1.25);
        }
    }
}

function updateBullets(delta) {
    for (let index = playerBullets.length - 1; index >= 0; index -= 1) {
        const bullet = playerBullets[index];
        bullet.mesh.position.addScaledVector(bullet.velocity, delta);
        bullet.life -= delta;
        let hit = false;

        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
            const enemy = enemies[enemyIndex];
            if (bullet.mesh.position.distanceToSquared(enemy.position) < 42 * 42) {
                enemy.userData.health -= 1;
                spawnExplosion(bullet.mesh.position, 0.45);
                hit = true;
                if (enemy.userData.health <= 0) {
                    startEnemyCrash(enemy);
                    enemies.splice(enemyIndex, 1);
                    game.kills += 1;
                }
                break;
            }
        }

        if (hit || bullet.life <= 0 || bullet.mesh.position.distanceToSquared(player.position) > 1800 * 1800) {
            scene.remove(bullet.mesh);
            playerBullets.splice(index, 1);
        }
    }

    for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
        const bullet = enemyBullets[index];
        bullet.mesh.position.addScaledVector(bullet.velocity, delta);
        bullet.life -= delta;
        if (bullet.mesh.position.distanceToSquared(player.position) < 28 * 28) {
            spawnExplosion(bullet.mesh.position, 0.55);
            damagePlayer(bullet.damage ?? 12);
            bullet.life = 0;
        }
        if (bullet.life <= 0) {
            scene.remove(bullet.mesh);
            enemyBullets.splice(index, 1);
        }
    }
}

function updateEffects(delta) {
    for (let index = explosions.length - 1; index >= 0; index -= 1) {
        const explosion = explosions[index];
        explosion.life -= delta;
        const progress = 1 - Math.max(0, explosion.life) / explosion.maxLife;
        explosion.mesh.scale.setScalar((1.5 + progress * 16) * explosion.scale);
        explosion.mesh.material.opacity = Math.max(0, 1 - progress);
        if (explosion.life <= 0) {
            scene.remove(explosion.mesh);
            explosion.mesh.geometry.dispose();
            explosion.mesh.material.dispose();
            explosions.splice(index, 1);
        }
    }

    for (const cloud of clouds) {
        if (cloud.position.z > player.position.z + 700) {
            cloud.position.z = player.position.z - THREE.MathUtils.randFloat(5500, 11000);
            cloud.position.x = THREE.MathUtils.randFloatSpread(5200);
        }
    }

    for (const tile of sceneryTiles) {
        for (const smoke of tile.userData.smokeEmitters) {
            for (const particle of smoke.particles) {
                particle.life += delta;
                if (particle.life >= particle.duration) {
                    particle.life = 0;
                    particle.duration = THREE.MathUtils.randFloat(3.5, 6.5);
                    particle.size = THREE.MathUtils.randFloat(26, 36);
                    particle.drift = THREE.MathUtils.randFloatSpread(12);
                }
                const progress = particle.life / particle.duration;
                particle.mesh.position.set(
                    particle.drift * progress,
                    progress * 50,
                    Math.sin(game.elapsed + particle.drift) * 3
                );
                particle.mesh.scale.set(
                    particle.size * (0.65 + progress * 1.4),
                    particle.size * (0.55 + progress),
                    particle.size * (0.65 + progress * 1.4)
                );
                particle.mesh.material.opacity = 0.42 * (1 - progress);
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);
    if (game.active) {
        game.elapsed += delta;
        game.fireCooldown = Math.max(0, game.fireCooldown - delta);
        if (game.reloadTimer > 0) {
            game.reloadTimer = Math.max(0, game.reloadTimer - delta);
            if (game.reloadTimer === 0) game.ammo = AMMO_CAPACITY;
        }
        updatePlayer(delta);
        if (game.active) {
            updateTurrets(delta);
            updateEnemies(delta);
            if (keys.has('Space') && game.fireCooldown <= 0 && game.ammo > 0) firePlayerBullet();
        }
        updateBullets(delta);
        updateHud();
    } else {
        player.userData.propeller.rotation.z += delta * 12;
    }
    updateWrecks(delta);
    updateEffects(delta);
    renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
    }
    keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0 && game.active) keys.add('Space');
});
window.addEventListener('pointerup', () => keys.delete('Space'));

startButton.addEventListener('click', resetGame);

try {
    renderer.setClearColor(0x89939c);
    updateHud();
    animate();
} catch (error) {
    console.error('No se pudo iniciar el simulador de vuelo:', error);
    gameError.hidden = false;
    gameError.textContent = 'No se pudo iniciar el juego en este navegador. Comprueba que WebGL esté habilitado.';
    startButton.disabled = true;
}
