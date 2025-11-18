// VR-ready Red Ball Shooter (PC + SteamVR)
// Reemplaza todo tu script por este

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// -----------------------------
// UTIL: detectar móvil simple
// -----------------------------
function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

// -----------------------------
// ESTADO DEL JUEGO (igual que antes)
// -----------------------------
let score = 0;
let bestScore = parseInt(localStorage.getItem("bestScore") || 0, 10);
let timeLeft = 45;
let timerActive = false;
let gameStarted = false;

// -----------------------------
// DOM BACKUPS (no los mostraremos en VR, sirven para desktop fallback)
// -----------------------------
const scoreDiv = document.createElement("div");
scoreDiv.style.position = "absolute";
scoreDiv.style.top = "20px";
scoreDiv.style.left = "20px";
scoreDiv.style.color = "white";
scoreDiv.style.fontSize = "22px";
scoreDiv.style.fontFamily = "Arial";
scoreDiv.style.fontWeight = "bold";
scoreDiv.textContent = `Puntaje: 0 | Mejor: ${bestScore}`;
document.body.appendChild(scoreDiv);

const timerDiv = document.createElement("div");
timerDiv.style.position = "absolute";
timerDiv.style.top = "20px";
timerDiv.style.right = "20px";
timerDiv.style.color = "yellow";
timerDiv.style.fontSize = "28px";
timerDiv.style.fontFamily = "Arial";
timerDiv.style.fontWeight = "bold";
timerDiv.textContent = `Tiempo: ${timeLeft}`;
document.body.appendChild(timerDiv);

const crosshairDOM = document.createElement("div");
crosshairDOM.style.position = "absolute";
crosshairDOM.style.top = "50%";
crosshairDOM.style.left = "50%";
crosshairDOM.style.transform = "translate(-50%, -50%)";
crosshairDOM.style.width = "2px";
crosshairDOM.style.height = "2px";
crosshairDOM.style.zIndex = "999";
crosshairDOM.style.pointerEvents = "none";
crosshairDOM.innerHTML = `
    <div style="position:absolute; width:2px; height:20px; background:white; top:-20px; left:0;"></div>
    <div style="position:absolute; width:2px; height:20px; background:white; top:2px; left:0;"></div>
    <div style="position:absolute; width:20px; height:2px; background:white; top:0; left:-20px;"></div>
    <div style="position:absolute; width:20px; height:2px; background:white; top:0; left:2px;"></div>
`;
document.body.appendChild(crosshairDOM);

// Start / End DOM backups
const startScreenDOM = document.createElement("div");
startScreenDOM.style.position = "fixed";
startScreenDOM.style.top = "0";
startScreenDOM.style.left = "0";
startScreenDOM.style.width = "100%";
startScreenDOM.style.height = "100%";
startScreenDOM.style.display = "flex";
startScreenDOM.style.flexDirection = "column";
startScreenDOM.style.alignItems = "center";
startScreenDOM.style.justifyContent = "center";
startScreenDOM.style.background = "rgba(0,0,0,0.85)";
startScreenDOM.style.color = "white";
startScreenDOM.style.fontFamily = "Arial";
startScreenDOM.style.zIndex = "9999";
startScreenDOM.style.textAlign = "center";
startScreenDOM.innerHTML = `
    <div style="font-size:48px; font-weight:bold; margin-bottom:20px; color:#ff4444;">
        🔴💣   RED BALL SHOOTER   💣🔴
    </div>
    <div style="font-size:28px; font-weight:bold; margin-bottom:20px; color:#ffff00;">
        Objetivo: Acierta al mayor número de esferas en 45 segundos
        ¿Estás list@?
    </div>
    <div style="font-size:20px; opacity:0.8;">
        Presiona <strong>A</strong> en el control
    </div>
`;
document.body.appendChild(startScreenDOM);

const endScreenDOM = document.createElement("div");
endScreenDOM.style.position = "fixed";
endScreenDOM.style.top = "0";
endScreenDOM.style.left = "0";
endScreenDOM.style.width = "100%";
endScreenDOM.style.height = "100%";
endScreenDOM.style.display = "none";
endScreenDOM.style.flexDirection = "column";
endScreenDOM.style.alignItems = "center";
endScreenDOM.style.justifyContent = "center";
endScreenDOM.style.background = "rgba(0,0,0,0.85)";
endScreenDOM.style.color = "white";
endScreenDOM.style.fontFamily = "Arial";
endScreenDOM.style.zIndex = "9999";
endScreenDOM.style.textAlign = "center";
endScreenDOM.innerHTML = `
    <div style="font-size:48px; font-weight:bold; margin-bottom:20px; color:#ff4444;">
        ¡TIEMPO AGOTADO!
    </div>
    <div id="finalScoreText" style="font-size:26px; margin-bottom:25px;"></div>
    <div style="font-size:20px; opacity:0.8;">
        Presiona <strong>B</strong> en el control
    </div>
`;
document.body.appendChild(endScreenDOM);

// allow Enter to start (non-gamepad)
window.addEventListener("keydown", (e) => {
    if (!gameStarted && e.key === "Enter") startGame();
});

// -----------------------------
// GAMEPAD SUPPORT (igual que antes)
// -----------------------------
let gamepad = null;
let prevButtons = [];
let lastShootTime = 0;
const shootCooldown = 150;

window.addEventListener("gamepadconnected", (e) => {
    gamepad = navigator.getGamepads()[e.gamepad.index];
    console.log("Gamepad conectado:", e.gamepad.id);
});

// -----------------------------
// RENDERER / SCENE / CAMERA
// -----------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // enable XR
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// VRButton (UPR) integrado y forzado adelante
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// Style the VR button so it always appears above UI
vrButton.style.position = "fixed";
vrButton.style.zIndex = "999999";
vrButton.style.left = "50%";
vrButton.style.transform = "translateX(-50%)";
vrButton.style.bottom = "30px";
vrButton.style.pointerEvents = "auto"; // clickable
vrButton.style.marginBottom = "80px"; // to avoid overlapping near-bottom UI
vrButton.style.background = "rgba(0,0,0,0.75)";
vrButton.style.color = "white";
vrButton.style.padding = "12px 20px";
vrButton.style.borderRadius = "12px";
vrButton.style.fontSize = "16px";
vrButton.style.fontFamily = "Arial, sans-serif";
vrButton.style.border = "1px solid rgba(255,255,255,0.6)";
vrButton.style.cursor = "pointer";

// Scene & player
const scene = new THREE.Scene();
const player = new THREE.Group();
scene.add(player);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);
player.add(camera);

// -----------------------------
// ORBIT CONTROLS (kept as original non-VR behaviour)
// -----------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;
controls.target.set(0, 1, 0);

// --- camera rotation from right joystick (non-VR) -----------------
let camRotX = 0;
let camRotY = 0;
const camSensitivity = 0.04;

function updateGamepadCamera() {
    if (!gamepad) return;
    const gp = navigator.getGamepads()[gamepad.index];
    if (!gp) return;

    const rx = gp.axes[2] ?? 0;
    const ry = gp.axes[3] ?? 0;
    const deadZone = 0.05;

    if (!renderer.xr.isPresenting) {
        if (Math.abs(rx) > deadZone) camRotY -= rx * camSensitivity;
        if (Math.abs(ry) > deadZone) {
            camRotX -= ry * camSensitivity;
            camRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camRotX));
        }
        camera.rotation.x = camRotX;
        camera.rotation.y = camRotY;
    } else {
        // VR: headset controls rotation - do nothing
    }
}

// -----------------------------
// SKYBOX / LIGHTS / SCENE (mantengo tu configuración)
// -----------------------------

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(0, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4488ff, 1.5, 30);
fillLight.position.set(-5, 3, 5);
scene.add(fillLight);

scene.fog = new THREE.Fog(0x111111, 2, 35);

// -----------------------------
// PISO y paredes (exacto a tu código)
// -----------------------------
const piso_1 = new THREE.TextureLoader().load('assets/marco-completo-de-fondo-grunge-degradado.jpg');
piso_1.wrapS = piso_1.wrapT = THREE.RepeatWrapping;
piso_1.repeat.set(8, 8);

const PISO = new THREE.MeshPhongMaterial({ map: piso_1 });

const geometry = new THREE.BoxGeometry(40, 0.1, 80);
const cube = new THREE.Mesh(geometry, PISO);
cube.position.z = -30;
cube.receiveShadow = true;
scene.add(cube);

const cube2 = cube.clone();
cube2.position.y = 10;
scene.add(cube2);

const wallTexture = piso_1.clone();
wallTexture.needsUpdate = true;
wallTexture.wrapS = THREE.RepeatWrapping;
wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(2, 1);

const wallMaterial = new THREE.MeshPhongMaterial({ map: wallTexture });

function createWall(w, h, x, y, z, rotY = 0) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMaterial);
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    wall.receiveShadow = true;
    scene.add(wall);
}

createWall(40, 10, 0, 5, -50);
createWall(80, 10, 20, 5, -30, -Math.PI / 2);
createWall(80, 10, -20, 5, -30, Math.PI / 2);
createWall(40, 10, 0, 5, 10, Math.PI);

// -----------------------------
// ENEMIGOS (mantengo tu lógica)
// -----------------------------
let enemies = [];

function createEnemy() {
    if (!timerActive) return;
    if (Math.random() > 0.7) return;

    const size = Math.random() * 0.25 + 0.5;

    const enemy = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 16),
        new THREE.MeshStandardMaterial({
            color: new THREE.Color(Math.random(), Math.random(), 0)
        })
    );
    enemy.castShadow = true;

    const x = (Math.random() - 0.5) * 16;
    const y = Math.random() * 3 + 0.5;
    const z = -30;

    enemy.position.set(x, y, z);
    enemy.userData.speed = Math.random() * 0.04 + 0.01;

    enemies.push(enemy);
    scene.add(enemy);
}

for (let i = 0; i < 2; i++) createEnemy();
setInterval(() => createEnemy(), 1500);

// -----------------------------
// BALAS (mantengo tu lógica)
// -----------------------------
let bullets = [];

function shoot() {
    if (!timerActive) return;

    // dirección global de la cámara (hacia donde mira la cabeza)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);  // apunta donde mira el usuario

    // posición global de la cámara
    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);

    // offset para que la bala salga delante de la cabeza
    const offset = direction.clone().multiplyScalar(0.3);
    origin.add(offset);

    shootBullet(origin, direction);
}

function shootBullet(origin, direction) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000 })
    );
    bullet.castShadow = true;

    bullet.position.copy(origin);
    bullet.userData.direction = direction.clone().normalize();
    bullet.userData.speed = 1.5;

    bullets.push(bullet);
    scene.add(bullet);
}


// -----------------------------
// TIMER (mantengo tu setInterval pero actualizo HUD 3D)
// -----------------------------
setInterval(() => {
    if (!timerActive) return;

    timeLeft--;
    // Update DOM backup (desktop)
    timerDiv.textContent = `Tiempo: ${timeLeft}`;
    // Update 3D HUD
    updateTimeHUD();

    if (timeLeft <= 0) {
        timerActive = false;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem("bestScore", bestScore);
        }

        scoreDiv.textContent = `Puntaje: ${score} | Mejor: ${bestScore}`;

        const finalScoreText = document.getElementById("finalScoreText");
        if (finalScoreText) {
            finalScoreText.innerHTML = `
                Puntaje obtenido: <strong>${score}</strong><br>
                Mejor puntaje: <strong>${bestScore}</strong>
            `;
        }

        // Show 3D end plane
        showEndPlane();
    }
}, 1000);

// -----------------------------
// VR CROSSHAIR (3D) + DOM toggle
// -----------------------------
const vrCrosshair = new THREE.Mesh(
    new THREE.RingGeometry(0.02, 0.03, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);
vrCrosshair.position.set(0, 0, -1);
vrCrosshair.rotation.x = Math.PI;
vrCrosshair.visible = false;
camera.add(vrCrosshair);

// When entering XR: hide DOM backups and show VR crosshair
renderer.xr.addEventListener('sessionstart', () => {
    // hide DOM overlay when entering XR (mobile VR will hide DOM anyway)
    crosshairDOM.style.display = 'none';
    scoreDiv.style.display = 'none';
    timerDiv.style.display = 'none';
    startScreenDOM.style.display = 'none';
    endScreenDOM.style.display = 'none';
    vrCrosshair.visible = true;
});
// when leaving XR: restore DOM backups for desktop fallback
renderer.xr.addEventListener('sessionend', () => {
    crosshairDOM.style.display = '';
    vrCrosshair.visible = false;
    if (!isMobile()) {
        scoreDiv.style.display = '';
        timerDiv.style.display = '';
        startScreenDOM.style.display = '';
    }
});

// -----------------------------
// HUD 3D: helper to create canvas texture (lightweight)
// -----------------------------
function createCanvasTexture(width = 512, height = 128, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // clear
    ctx.clearRect(0, 0, width, height);
    // call draw function
    drawFn(ctx, width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return { tex, canvas, ctx };
}

// Score HUD (attached to camera)
let scoreHUDMatObj = createCanvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Puntaje: ${score}`, 12, h/2 + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '20px Arial';
    ctx.fillText(`Mejor: ${bestScore}`, 12, h - 12);
});
const scoreHUDMat = new THREE.MeshBasicMaterial({ map: scoreHUDMatObj.tex, transparent: true });
const scoreHUD = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), scoreHUDMat);
scoreHUD.position.set(-0.9, 0.7, -1.5);
camera.add(scoreHUD);

// Timer HUD
let timeHUDMatObj = createCanvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'yellow';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Tiempo: ${timeLeft}`, w/2, h/2 + 10);
});
const timeHUDMat = new THREE.MeshBasicMaterial({ map: timeHUDMatObj.tex, transparent: true });
const timeHUD = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), timeHUDMat);
timeHUD.position.set(0.9, 0.7, -1.5);
camera.add(timeHUD);

// Crosshair 3D (small) attached to camera
const crosshair3D = new THREE.Mesh(
    new THREE.RingGeometry(0.015, 0.02, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);
crosshair3D.position.set(0, 0, -1);
camera.add(crosshair3D);

// -----------------------------
// START/END PLANES (Flotantes en el mundo) - 3D panels
// -----------------------------
const startPlaneObj = createCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#ff4444';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💣   RED BALL SHOOTER   💣', w/2, 120);
    ctx.fillStyle = '#ffff00';
    ctx.font = '36px Arial';
    ctx.fillText('Objetivo: Acierta al mayor número de esferas en 45 segundos', w/2, 220);
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.fillText('Presiona A en el control o toca la pantalla para iniciar', w/2, 320);
});
const startPlaneMat = new THREE.MeshBasicMaterial({ map: startPlaneObj.tex, transparent: true });
const startPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), startPlaneMat);
startPlane.userData.isStart = true;
startPlane.visible = true;
scene.add(startPlane);

// End plane
const endPlaneObj = createCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#ff4444';
    ctx.font = '56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('¡TIEMPO AGOTADO!', w/2, 120);
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.fillText('Puntaje obtenido: 0', w/2, 220);
    ctx.font = '28px Arial';
    ctx.fillText('Presiona B para reiniciar', w/2, 320);
});
const endPlaneMat = new THREE.MeshBasicMaterial({ map: endPlaneObj.tex, transparent: true });
const endPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), endPlaneMat);
endPlane.userData.isEnd = true;
endPlane.visible = false;
scene.add(endPlane);

// Helper to position floating planes in front of camera at distance d
function placePlaneInFrontOfCamera(plane, d = 1.8) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const targetPos = camPos.clone().add(dir.multiplyScalar(d));
    plane.position.copy(targetPos);
    // face the camera
    plane.quaternion.copy(camera.quaternion);
}

// Show end plane function (updates text)
function showEndPlane() {
    // update text content
    endPlaneObj.ctx.clearRect(0,0,endPlaneObj.canvas.width,endPlaneObj.canvas.height);
    // redraw updated content
    endPlaneObj.ctx.fillStyle = 'rgba(0,0,0,0.85)';
    endPlaneObj.ctx.fillRect(0,0,endPlaneObj.canvas.width,endPlaneObj.canvas.height);
    endPlaneObj.ctx.fillStyle = '#ff4444';
    endPlaneObj.ctx.font = '56px Arial';
    endPlaneObj.ctx.textAlign = 'center';
    endPlaneObj.ctx.fillText('¡TIEMPO AGOTADO!', endPlaneObj.canvas.width/2, 120);
    endPlaneObj.ctx.fillStyle = 'white';
    endPlaneObj.ctx.font = '36px Arial';
    endPlaneObj.ctx.fillText(`Puntaje obtenido: ${score}`, endPlaneObj.canvas.width/2, 220);
    endPlaneObj.ctx.font = '28px Arial';
    endPlaneObj.ctx.fillText('Presiona B para reiniciar', endPlaneObj.canvas.width/2, 320);
    endPlaneObj.tex.needsUpdate = true;

    endPlane.visible = true;
    startPlane.visible = false;
    // also show DOM end backup for desktop fallback
    endScreenDOM.style.display = 'flex';
}

// -----------------------------
// START / RESET functions
// -----------------------------
function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    // hide DOM start screen backup
    startScreenDOM.style.display = 'none';
    // hide 3D start plane
    startPlane.visible = false;
    timerActive = true;
    timeLeft = 45;
    score = 0;
    updateScoreHUD();
    updateTimeHUD();
}

function resetGame() {
    window.location.reload();
}

function isButtonPressed(gp, idxs) {
    if (!gp || !gp.buttons) return false;
    for (let i of idxs) {
        if (gp.buttons[i] && gp.buttons[i].pressed) return true;
    }
    return false;
}

// -----------------------------
// Gamepad input handling (keeps A/B/trigger)
// -----------------------------
function handleGamepadInput() {
    const gpl = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepad) gamepad = gpl[gamepad.index] || gamepad;
    else {
        for (let gp of gpl) {
            if (gp && gp.id && gp.connected) {
                gamepad = gp;
                break;
            }
        }
    }

    if (!gamepad) return;

    const gp = gamepad;

    // Botón A = inicio
    if (isButtonPressed(gp, [0]) && !gp._wasA) {
        startGame();
    }
    gp._wasA = isButtonPressed(gp, [0]);

    // Botón B = reinicio (solo si el juego terminó)
    if (isButtonPressed(gp, [1]) && !gp._wasB) {
        if (!timerActive) resetGame();
    }
    gp._wasB = isButtonPressed(gp, [1]);

    // Trigger / RT / LT = disparar
    const now = performance.now();
    const rtPressed = isButtonPressed(gp, [7, 6, 2]);
    if (rtPressed && (now - lastShootTime >= shootCooldown)) {
        shoot();
        lastShootTime = now;
    }

    prevButtons = gp.buttons.map(b => b.pressed);
}

// -----------------------------
// Touch / Click handlers (start or shoot)
// -----------------------------
window.addEventListener('touchstart', (ev) => {
    // If not started, start
    if (!gameStarted) {
        startGame();
        return;
    }
    if (timerActive) shoot();
});
window.addEventListener('click', (ev) => {
    if (!gameStarted) {
        startGame();
        return;
    }
    if (timerActive) shoot();
});

// -----------------------------
// HUD update helpers
// -----------------------------
function updateScoreHUD() {
    scoreHUDMatObj.ctx.clearRect(0,0,scoreHUDMatObj.canvas.width, scoreHUDMatObj.canvas.height);
    scoreHUDMatObj.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    scoreHUDMatObj.ctx.fillRect(0,0,scoreHUDMatObj.canvas.width, scoreHUDMatObj.canvas.height);
    scoreHUDMatObj.ctx.fillStyle = 'white';
    scoreHUDMatObj.ctx.font = '28px Arial';
    scoreHUDMatObj.ctx.textAlign = 'left';
    scoreHUDMatObj.ctx.fillText(`Puntaje: ${score}`, 12, scoreHUDMatObj.canvas.height/2 + 10);
    scoreHUDMatObj.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    scoreHUDMatObj.ctx.font = '20px Arial';
    scoreHUDMatObj.ctx.fillText(`Mejor: ${bestScore}`, 12, scoreHUDMatObj.canvas.height - 12);
    scoreHUDMatObj.tex.needsUpdate = true;

    // update DOM backup if visible
    scoreDiv.textContent = `Puntaje: ${score} | Mejor: ${bestScore}`;
}

function updateTimeHUD() {
    timeHUDMatObj.ctx.clearRect(0,0,timeHUDMatObj.canvas.width,timeHUDMatObj.canvas.height);
    timeHUDMatObj.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    timeHUDMatObj.ctx.fillRect(0,0,timeHUDMatObj.canvas.width,timeHUDMatObj.canvas.height);
    timeHUDMatObj.ctx.fillStyle = 'yellow';
    timeHUDMatObj.ctx.font = '36px Arial';
    timeHUDMatObj.ctx.textAlign = 'center';
    timeHUDMatObj.ctx.fillText(`Tiempo: ${timeLeft}`, timeHUDMatObj.canvas.width/2, timeHUDMatObj.canvas.height/2 + 10);
    timeHUDMatObj.tex.needsUpdate = true;

    // update DOM backup
    timerDiv.textContent = `Tiempo: ${timeLeft}`;
}

// -----------------------------
// ANIMACIÓN (principal) - XR-aware
// -----------------------------
function animate() {
    // controls damping (non-VR)
    controls.update();

    // update camera/player based on gamepad (non-VR)
    updateGamepadCamera();

    // gamepad handling
    handleGamepadInput();

    // update bullets & collisions
    if (timerActive) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.position.add(b.userData.direction.clone().multiplyScalar(b.userData.speed));

            if (b.position.length() > 100) {
                scene.remove(b);
                bullets.splice(i, 1);
                continue;
            }

            for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
                const e = enemies[eIndex];

                if (b.position.distanceTo(e.position) < 0.8) {
                    scene.remove(e);
                    enemies.splice(eIndex, 1);

                    scene.remove(b);
                    bullets.splice(i, 1);

                    score++;
                    if (score > bestScore) bestScore = score;

                    updateScoreHUD();

                    createEnemy();
                    break;
                }
            }
        }

        enemies.forEach(enemy => {
            enemy.position.z += enemy.userData.speed;
        });
    }

    // position start/end planes always in front of camera (if visible)
    if (startPlane.visible) placePlaneInFrontOfCamera(startPlane, 1.8);
    if (endPlane.visible) placePlaneInFrontOfCamera(endPlane, 1.8);

    // render for VR and non-VR
    renderer.render(scene, camera);
}

// Start the XR animation loop
renderer.setAnimationLoop(animate);

// -----------------------------
// REINICIO (R)
// -----------------------------
window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") resetGame();
});

// -----------------------------
// RESIZE
// -----------------------------
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------
// INIT: place start plane in front so user sees it at load
// -----------------------------
placePlaneInFrontOfCamera(startPlane, 1.8);

// Hide DOM backups on mobile/XR; keep them in desktop non-VR for debugging
if (isMobile() || navigator.xr) {
    scoreDiv.style.display = 'none';
    timerDiv.style.display = 'none';
    startScreenDOM.style.display = 'none';
    endScreenDOM.style.display = 'none';
} else {
    // desktop non-VR: show DOM backup (for debugging)
    scoreDiv.style.display = '';
    timerDiv.style.display = '';
    startScreenDOM.style.display = '';
    endScreenDOM.style.display = 'none';
}
