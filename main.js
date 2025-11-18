// ------------------------------------------------------------
//  BLOQUE 1/3 — ESCENA + RENDER + VR + HUD + CONTROLES VRBOX
// ------------------------------------------------------------

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// ------------------------------------------------------------
//  ESCENA
// ------------------------------------------------------------
const scene = new THREE.Scene();

// Fondo
scene.background = new THREE.Color(0x000000);

// CÁMARA
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 1.6, 3);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// VR BUTTON
const vrButton = VRButton.createButton(renderer);
vrButton.style.position = "absolute";
vrButton.style.zIndex = "9999";
vrButton.style.left = "50%";
vrButton.style.transform = "translateX(-50%)";
vrButton.style.bottom = "40px";
document.body.appendChild(vrButton);

// ------------------------------------------------------------
//  ILUMINACIÓN
// ------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 7);
scene.add(dir);

// ------------------------------------------------------------
//  HUD 3D — CROSSHAIR + PANTALLAS (cerca del jugador)
// ------------------------------------------------------------

// CROSSHAIR
const crosshairGeo = new THREE.RingGeometry(0.002, 0.005, 16);
const crosshairMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const crosshair = new THREE.Mesh(crosshairGeo, crosshairMat);
crosshair.position.set(0, 0, -0.9);       // más cerca
crosshair.lookAt(0, 0, 1);
camera.add(crosshair);
scene.add(camera);

// PANTALLA DE INICIO
const startPlaneGeo = new THREE.PlaneGeometry(0.7, 0.4);
const startPlaneMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
const startPlane = new THREE.Mesh(startPlaneGeo, startPlaneMat);
startPlane.position.set(0, 0, -1.2);   // más cerca
camera.add(startPlane);

// Texto Start (simple)
const startText = document.createElement('div');
startText.style.position = "absolute";
startText.style.top = "50%";
startText.style.left = "50%";
startText.style.transform = "translate(-50%, -50%)";
startText.style.color = "white";
startText.style.fontSize = "22px";
startText.style.fontFamily = "Arial";
startText.innerText = "Presiona A para iniciar";
startText.style.display = "block";
document.body.appendChild(startText);

// PANTALLA FINAL
const endPlaneGeo = new THREE.PlaneGeometry(0.7, 0.4);
const endPlaneMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
const endPlane = new THREE.Mesh(endPlaneGeo, endPlaneMat);
endPlane.visible = false;
endPlane.position.set(0, 0, -1.2);
camera.add(endPlane);

// ------------------------------------------------------------
//  VARIABLES DEL JUEGO
// ------------------------------------------------------------
let gameStarted = false;
let timerActive = false;
let score = 0;
let timeLeft = 30;
let shootCooldown = false;

// ------------------------------------------------------------
//  CONTROLES VRBOX — SOLO EL MANDO (gatillo, A, B)
// ------------------------------------------------------------

// LISTA DE ACCIONES DEL MANDO
const VRBOX = {
    trigger: ["Space", "Enter"], // gatillo
    buttonA: ["KeyZ", "KeyX", "Enter"], // iniciar
    buttonB: ["Escape", "Backspace", "KeyC"] // reiniciar
};

window.addEventListener("keydown", (e) => {

    // ---- DISPARAR (gatillo) ----
    if (VRBOX.trigger.includes(e.code)) {
        if (gameStarted && timerActive && !shootCooldown) {
            shoot();
        }
    }

    // ---- INICIAR (A) ----
    if (!gameStarted) {
        if (VRBOX.buttonA.includes(e.code)) {
            startGame();
        }
    }

    // ---- REINICIAR (B) ----
    if (gameStarted && !timerActive) {
        if (VRBOX.buttonB.includes(e.code)) {
            resetGame();
        }
    }
});

// ------------------------------------------------------------
//  BLOQUE 2/3 — ENEMIGOS, DISPARO, RAYCAST, TIMER
// ------------------------------------------------------------

// GRUPO DE ENEMIGOS
const enemies = new THREE.Group();
scene.add(enemies);

const enemyGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 });

// ------------------------------------------------------------
//  CREAR ENEMIGO
// ------------------------------------------------------------
function spawnEnemy() {
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial.clone());
    enemy.position.set(
        (Math.random() - 0.5) * 4,
        1.2 + Math.random() * 1.0,
        -4 - Math.random() * 2
    );
    enemy.userData.hit = false;
    enemies.add(enemy);
}

// ------------------------------------------------------------
//  RAYCASTER PARA DISPAROS
// ------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// ------------------------------------------------------------
//  DISPARAR
// ------------------------------------------------------------
function shoot() {

    shootCooldown = true;
    setTimeout(() => shootCooldown = false, 300);

    // Configurar raycast desde el centro de la cámara
    tempMatrix.identity().extractRotation(camera.matrixWorld);
    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = raycaster.intersectObjects(enemies.children);

    if (hits.length > 0) {
        const enemy = hits[0].object;

        if (!enemy.userData.hit) {
            enemy.userData.hit = true;
            score++;

            // Animación de impacto (se desvanece)
            const mat = enemy.material;
            mat.transparent = true;

            const fade = { opacity: 1 };
            const fadeInterval = setInterval(() => {
                fade.opacity -= 0.1;
                mat.opacity = fade.opacity;

                if (fade.opacity <= 0) {
                    clearInterval(fadeInterval);
                    enemies.remove(enemy);
                }
            }, 30);
        }
    }
}

// ------------------------------------------------------------
//  TIMER
// ------------------------------------------------------------
function startTimer() {
    timerActive = true;
    timeLeft = 30;

    const interval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(interval);
            timerActive = false;
            endGame();
        }
    }, 1000);
}

// ------------------------------------------------------------
//  INICIAR JUEGO
// ------------------------------------------------------------
function startGame() {
    if (gameStarted) return;
    gameStarted = true;

    score = 0;
    enemies.clear();

    startPlane.visible = false;
    startText.style.display = "none";

    // Spawnear enemigos regularmente
    spawnEnemy();
    spawnEnemy();
    spawnEnemy();

    enemySpawnLoop = setInterval(() => {
        spawnEnemy();
    }, 1500);

    startTimer();
}

// ------------------------------------------------------------
//  TERMINAR JUEGO
// ------------------------------------------------------------
let enemySpawnLoop = null;

function endGame() {
    clearInterval(enemySpawnLoop);

    endPlane.visible = true;

    // Mostrar puntaje final
    finalScoreDiv.innerText = "Puntaje: " + score;
    finalScoreDiv.style.display = "block";
}

// ------------------------------------------------------------
//  REINICIAR JUEGO
// ------------------------------------------------------------
function resetGame() {
    score = 0;
    enemies.clear();

    endPlane.visible = false;
    finalScoreDiv.style.display = "none";

    gameStarted = false;
    timerActive = false;

    startPlane.visible = true;
    startText.style.display = "block";
}

// ------------------------------------------------------------
//  BLOQUE 3/3 — PANTALLA FINAL, LOOP, ANIMACIÓN, RESIZE
// ------------------------------------------------------------

// TEXTO DEL PUNTAJE FINAL (HTML)
const finalScoreDiv = document.createElement("div");
finalScoreDiv.style.position = "absolute";
finalScoreDiv.style.top = "50%";
finalScoreDiv.style.left = "50%";
finalScoreDiv.style.transform = "translate(-50%, -50%)";
finalScoreDiv.style.color = "white";
finalScoreDiv.style.fontSize = "24px";
finalScoreDiv.style.fontFamily = "Arial";
finalScoreDiv.style.display = "none";
finalScoreDiv.style.zIndex = "10000";
document.body.appendChild(finalScoreDiv);

// ------------------------------------------------------------
//  ANIMACIÓN DE ENEMIGOS
// ------------------------------------------------------------
function updateEnemies(delta) {
    enemies.children.forEach(enemy => {
        enemy.position.z += delta * 0.8; // enemigos avanzan hacia el jugador

        // Si pasan demasiado cerca del jugador, desaparecer
        if (enemy.position.z > 0.5) {
            enemies.remove(enemy);
        }
    });
}

// ------------------------------------------------------------
//  LOOP PRINCIPAL (VR + 3D)
// ------------------------------------------------------------
let lastTime = 0;

renderer.setAnimationLoop((time) => {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (gameStarted && timerActive) {
        updateEnemies(delta);
    }

    renderer.render(scene, camera);
});

// ------------------------------------------------------------
//  RESIZE
// ------------------------------------------------------------
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
