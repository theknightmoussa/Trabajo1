import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { GUI } from "./lib/lil-gui.module.min.js";
import { RGBELoader } from './lib/RGBELoader.js';

// Definizione della funzione createLabel
function createLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.font = '24px Arial';
  context.fillStyle = 'white';
  context.fillText(text, 10, 40);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(3, 1.5, 1);
  return sprite;
}

// SETUP: Scena, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Carica il file HDR come sfondo e environment
new RGBELoader()
  .setDataType(THREE.FloatType) // prova con FloatType per risolvere l'errore di tipo
  .load('textures/hdr/sky_space.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);


// STARFIELD: campo di stelle per ulteriore profondità
const starGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starPositions[i] = (Math.random() - 0.5) * 400;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);



// -------------------------
// LUCI
// -------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(0, 0, 0); // Il punto luce simula il Sole nel planetario
pointLight.castShadow = true;
scene.add(pointLight);

// -------------------------
// Struttura delle Stanze (Showroom)
// -------------------------
const showroom = new THREE.Group();
scene.add(showroom);

// -- Corridoio --
const corridor = new THREE.Group();
corridor.position.set(0, 0, 0); // posizione iniziale
showroom.add(corridor);

// Crea il pavimento del corridoio
const corridorFloorGeo = new THREE.PlaneGeometry(40, 20);
const corridorFloorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const corridorFloor = new THREE.Mesh(corridorFloorGeo, corridorFloorMat);
corridorFloor.rotation.x = -Math.PI / 2;
corridorFloor.receiveShadow = true;
corridor.add(corridorFloor);

// Crea le pareti del corridoio
const wallGeo = new THREE.PlaneGeometry(40, 10);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const backWall = new THREE.Mesh(wallGeo, wallMat);
backWall.position.set(0, 5, -10);
corridor.add(backWall);

const leftWall = new THREE.Mesh(wallGeo, wallMat);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-20, 5, -5);
corridor.add(leftWall);

const rightWall = new THREE.Mesh(wallGeo, wallMat);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(20, 5, -5);
corridor.add(rightWall);

// Aggiungi alcuni pannelli espositivi (placeholder per i grandi traguardi dello spazio)
function createPanel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '48px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(text, 20, 100);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
  const geometry = new THREE.PlaneGeometry(8, 4);
  return new THREE.Mesh(geometry, material);
}

// Esempi di pannelli
const panelApollo = createPanel("Apollo 11");
panelApollo.position.set(-10, 4, -9.9);
corridor.add(panelApollo);

const panelSputnik = createPanel("Sputnik");
panelSputnik.position.set(10, 4, -9.9);
corridor.add(panelSputnik);

// Crea una "porta" interattiva che conduce al planetario
function createDoor() {
  const doorGeo = new THREE.PlaneGeometry(6, 8);
  // Crea una texture con un messaggio
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '48px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText("Entra nel\nPlanetario", 20, 200);
  const texture = new THREE.CanvasTexture(canvas);
  const doorMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.name = "door";
  doorMesh.position.set(0, 4, -9.8);
  doorMesh.castShadow = true;
  return doorMesh;
}


// -- Planetario --
const planetarium = new THREE.Group();
// Posiziona il planetario dietro il corridoio, ad esempio a z = -80
planetarium.position.set(0, 0, -80);
showroom.add(planetarium);

// -------------------------
// SISTEMA SOLARE (all'interno del Planetario)
// -------------------------

// Caricatore di texture per i pianeti
const textureLoader = new THREE.TextureLoader();
const textures = {
  sun: textureLoader.load('textures/planets/sun.jpg'),
  mercury: textureLoader.load('textures/planets/mercury.jpg'),
  venus:   textureLoader.load('textures/planets/venus.jpg'),
  earth:   textureLoader.load('textures/planets/earth.jpg'),
  mars:    textureLoader.load('textures/planets/mars.jpg'),
  jupiter: textureLoader.load('textures/planets/jupiter.jpg'),
  saturn:  textureLoader.load('textures/planets/saturn.jpg'),
  uranus:  textureLoader.load('textures/planets/uranus.jpg'),
  neptune: textureLoader.load('textures/planets/neptune.jpg'),
  moon:    textureLoader.load('textures/planets/moon.jpg')
};

// Crea il gruppo del sistema solare all'interno del planetario
const solarSystem = new THREE.Group();
planetarium.add(solarSystem);

// Crea il Sole con texture
const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ map: textures.sun });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);

// Dati dei pianeti
const planetsData = [
  { name: "Mercurio", radius: 0.5, distance: 4, revolutionSpeed: 0.02, texture: textures.mercury },
  { name: "Venere",   radius: 0.7, distance: 6, revolutionSpeed: 0.015, texture: textures.venus },
  { name: "Terra",    radius: 0.75, distance: 8, revolutionSpeed: 0.01, texture: textures.earth },
  { name: "Marte",    radius: 0.6, distance: 10, revolutionSpeed: 0.008, texture: textures.mars },
  { name: "Giove",    radius: 1.2, distance: 13, revolutionSpeed: 0.005, texture: textures.jupiter },
  { name: "Saturno",  radius: 1.1, distance: 16, revolutionSpeed: 0.004, texture: textures.saturn, hasRing: true },
  { name: "Urano",    radius: 0.9, distance: 19, revolutionSpeed: 0.003, texture: textures.uranus },
  { name: "Nettuno",  radius: 0.85, distance: 22, revolutionSpeed: 0.002, texture: textures.neptune }
];

const planetGroups = [];
const moonOrbits = [];  // Per la Luna

planetsData.forEach(data => {
  // Gruppo per l'orbita del pianeta
  const orbitGroup = new THREE.Group();
  solarSystem.add(orbitGroup);

  // Crea il pianeta
  const planetGeo = new THREE.SphereGeometry(data.radius, 32, 32);
  const planetMat = new THREE.MeshStandardMaterial({ map: data.texture });
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);
  planetMesh.castShadow = true;
  planetMesh.position.x = data.distance;
  orbitGroup.add(planetMesh);

  // Aggiungi una label sopra il pianeta
  const label = createLabel(data.name);
  label.position.set(0, data.radius + 0.5, 0);
  planetMesh.add(label);

  // Salva la velocità di rivoluzione per l'animazione
  orbitGroup.userData = { revolutionSpeed: data.revolutionSpeed };
  planetGroups.push(orbitGroup);

  // Se Saturno, aggiungi gli anelli
  if (data.hasRing) {
    const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 1.8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xcccccc, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.7 
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    planetMesh.add(ring);
  }

  // Se Terra, aggiungi la Luna
  if (data.name === "Terra") {
    const moonGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({ map: textures.moon });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.castShadow = true;
    const moonOrbit = new THREE.Group();
    moonOrbit.userData = { revolutionSpeed: 0.05 };
    moon.position.x = 1.5;
    moonOrbit.add(moon);
    planetMesh.add(moonOrbit);
    moonOrbits.push(moonOrbit);
  }
});

// -------------------------
// Interattività: Raycaster per la porta
// -------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let transitioning = false; // per evitare click multipli

function onMouseClick(event) {
  if (transitioning) return;

  // Calcola la posizione del mouse in coordinate normalizzate (-1 a 1)
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([door]);
  if (intersects.length > 0) {
    // Avvia la transizione verso il planetario
    transitionToPlanetarium();
  }
}
window.addEventListener('click', onMouseClick, false);

// Funzione di transizione: sposta la camera dal corridoio al planetario
function transitionToPlanetarium() {
  transitioning = true;
  // Destinazione: posizionata in planetario (ad esempio, davanti al sistema solare)
  const targetPosition = new THREE.Vector3(0, 5, planetarium.position.z + 20);
  const startPosition = camera.position.clone();
  const duration = 2000; // 2 secondi
  let startTime = null;
  
  function animateTransition(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(startPosition, targetPosition, t);
    controls.update();
    if (t < 1) {
      requestAnimationFrame(animateTransition);
    } else {
      transitioning = false;
    }
  }
  requestAnimationFrame(animateTransition);
}

// -------------------------
// GUI: Controlli per alcuni parametri
// -------------------------
const gui = new GUI();
const params = {
  ambientIntensity: ambientLight.intensity,
  pointLightIntensity: pointLight.intensity,
  terraRevolutionSpeed: planetsData.find(p => p.name === "Terra").revolutionSpeed
};
gui.add(params, 'ambientIntensity', 0, 1).onChange(value => ambientLight.intensity = value);
gui.add(params, 'pointLightIntensity', 0, 2).onChange(value => pointLight.intensity = value);
const terraGroup = planetGroups.find((group, idx) => planetsData[idx].name === "Terra");
gui.add(params, 'terraRevolutionSpeed', 0.001, 0.05).onChange(value => {
  if (terraGroup) terraGroup.userData.revolutionSpeed = value;
});

// -------------------------
// Ciclo di Animazione
// -------------------------
function animate() {
  requestAnimationFrame(animate);
  
  // Aggiorna le orbite dei pianeti
  planetGroups.forEach(group => {
    group.rotation.y += group.userData.revolutionSpeed;
  });
  
  // Aggiorna l'orbita della Luna
  moonOrbits.forEach(moonOrbit => {
    moonOrbit.rotation.y += moonOrbit.userData.revolutionSpeed;
  });
  
  controls.update();
  composer.render(scene, camera);
}
animate();

// Gestione del resize della finestra
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});