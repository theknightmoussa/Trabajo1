import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { GUI } from "./lib/lil-gui.module.min.js";
import { RGBELoader } from './lib/RGBELoader.js';
import { AudioLoader, AudioListener, Audio as ThreeAudio } from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { RectAreaLightUniformsLib } from './lib/RectAreaLightUniformsLib.js';
// Aggiunti per il post-processing
import { EffectComposer } from './lib/EffectComposer.js';
import { RenderPass } from './lib/RenderPass.js';
import { UnrealBloomPass } from './lib/UnrealBloomPass.js';

RectAreaLightUniformsLib.init();

// ===========================
// VIDEO E PULSANTE STOP
// ===========================
// (Inserisci qui il codice per video e pulsante stop se necessario)
const videoApollo = document.createElement('video');
videoApollo.src = 'Videos/Apollo11.mp4';
videoApollo.crossOrigin = 'anonymous';
videoApollo.playsInline = true;
videoApollo.preload = 'auto';
videoApollo.loop = true;
videoApollo.muted = false;
videoApollo.controls = true;

const videoSputnik = document.createElement('video');
videoSputnik.src = 'Videos/Sputnik.mp4';
videoSputnik.crossOrigin = 'anonymous';
videoSputnik.playsInline = true;
videoSputnik.preload = 'auto';
videoSputnik.loop = true;
videoSputnik.muted = false;
videoSputnik.controls = true;

const stopButton = document.createElement('button');
stopButton.innerText = 'Stop Music & Videos';
stopButton.style.position = 'absolute';
stopButton.style.top = '20px';
stopButton.style.right = '20px';
stopButton.style.padding = '10px 20px';
stopButton.style.fontSize = '16px';
document.body.appendChild(stopButton);

stopButton.addEventListener('click', () => {
  if (planetMusic && planetMusic.isPlaying) {
    planetMusic.pause();
  }
  if (!videoApollo.paused) videoApollo.pause();
  if (!videoSputnik.paused) videoSputnik.pause();
});

// ===========================
// SCENA, CAMERA, RENDERER
// ===========================
const scene = new THREE.Scene();
scene.background = null; // verrà impostato tramite HDR

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Miglioramento della fisica della luce
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// --- POSIZIONE INIZIALE DELLA CAMERA ---
const initialCameraPosition = new THREE.Vector3(0, 5, -5);
const initialCameraTarget    = new THREE.Vector3(0, 5, -12.5);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.copy(initialCameraPosition);
camera.lookAt(initialCameraTarget);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(initialCameraTarget);
controls.minDistance = 2;
controls.maxDistance = 60;
controls.update();

// Inizializzazione del composer per il post-processing
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
composer.addPass(bloomPass);

// Gestione del resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Carica l'HDR per il background
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Hdr/golden_gate_hills_2k.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdrTexture;
  });

// ===========================
// STELLE
// ===========================
{
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 800;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 400;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

// ===========================
// LUCI GLOBALI
// ===========================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 15, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.bias = -0.005;
scene.add(dirLight);

const windowLight = new THREE.RectAreaLight(0xffffff, 5, 10, 4);
windowLight.position.set(-20, 5, -12.5);
windowLight.lookAt(new THREE.Vector3(-15, 5, -12.5));
scene.add(windowLight);

// ===========================
// AUDIO
// ===========================
const listener = new AudioListener();
camera.add(listener);
const planetMusic = new ThreeAudio(listener);

const audioLoader = new AudioLoader();
audioLoader.load('Musica/Planetarium.mp3', (buffer) => {
  planetMusic.setBuffer(buffer);
  planetMusic.setLoop(true);
  planetMusic.setVolume(0.5);
});

// ===========================
// GUI
// ===========================
const gui = new GUI();

const guiParams = {
  ambientIntensity: ambientLight.intensity,
  dirLightIntensity: dirLight.intensity,
  planetLightIntensity: 1.2,
  musicVolume: 0.5,
  showOrbits: true,          // Controllo per mostrare/nascondere le orbite
  sunDynamicIntensity: 1.0,  // Fattore dinamico per il sole
  simulationSpeed: 1,        // Fattore moltiplicativo per le velocità di rivoluzione/rotazione
  bloomStrength: 0.5         // Intensità del bloom
};

const mediaFolder = gui.addFolder("Media Controls");
mediaFolder.add({
  playVideos: () => {
    // Assicurati di avere definito videoApollo e videoSputnik
    videoApollo.play();
    videoSputnik.play();
  }
}, 'playVideos').name("Play Videos");

mediaFolder.add({
  pauseVideos: () => {
    videoApollo.pause();
    videoSputnik.pause();
  }
}, 'pauseVideos').name("Pause Videos");

mediaFolder.add({
  toggleMusic: () => {
    if (planetMusic.isPlaying) {
      planetMusic.pause();
    } else {
      planetMusic.play();
    }
  }
}, 'toggleMusic').name("Toggle Music");

gui.add(guiParams, 'ambientIntensity', 0, 2).name('Ambient Light')
   .onChange(v => ambientLight.intensity = v);
gui.add(guiParams, 'dirLightIntensity', 0, 2).name('Dir Light')
   .onChange(v => dirLight.intensity = v);
gui.add(guiParams, 'musicVolume', 0, 1).name('Music Volume')
   .onChange(v => planetMusic.setVolume(v));
gui.add(guiParams, 'showOrbits').name('Mostra Orbite');
gui.add(guiParams, 'sunDynamicIntensity', 0.5, 2).name('Intensità Sole');
gui.add(guiParams, 'simulationSpeed', 0.1, 5).name('Simulation Speed');
gui.add(guiParams, 'bloomStrength', 0, 3).name('Bloom Strength')
   .onChange(v => bloomPass.strength = v);

// CORRIDOIO (pareti, pavimento, soffitto, ecc.)
// ===========================
const textureLoader = new THREE.TextureLoader();
const corridor = new THREE.Group();
scene.add(corridor);

// --- Pavimento ---
const corridorFloorColorMap       = textureLoader.load('Textures/Textures/Floor/WoodFloor041_2K-PNG_Color.png');
const corridorFloorNormalMap      = textureLoader.load('Textures/Textures/Floor/WoodFloor041_2K-PNG_NormalGL.png');
const corridorFloorRoughnessMap   = textureLoader.load('Textures/Textures/Floor/WoodFloor041_2K-PNG_Roughness.png');
const corridorFloorDisplacementMap= textureLoader.load('Textures/Textures/Floor/WoodFloor041_2K-PNG_Displacement.png');

[
  corridorFloorColorMap,
  corridorFloorNormalMap,
  corridorFloorRoughnessMap,
  corridorFloorDisplacementMap
].forEach((tex) => {
  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
  }
});

const corridorFloorMat = new THREE.MeshStandardMaterial({
  map: corridorFloorColorMap,
  normalMap: corridorFloorNormalMap,
  roughnessMap: corridorFloorRoughnessMap,
  displacementMap: corridorFloorDisplacementMap,
  displacementScale: 0.1,
  roughness: 1.0
});

const corridorFloorGeo = new THREE.PlaneGeometry(40, 25, 50, 50);
const corridorFloorMesh = new THREE.Mesh(corridorFloorGeo, corridorFloorMat);
corridorFloorMesh.rotation.x = -Math.PI / 2;
corridorFloorMesh.position.z = -12.5;
corridorFloorMesh.receiveShadow = true;
corridor.add(corridorFloorMesh);

// --- Altre pareti del corridoio ---
const corridorWallColorMap       = textureLoader.load('Textures/Textures/Wall/Travertine002_2K-PNG_Color.png');
const corridorWallNormalMap      = textureLoader.load('Textures/Textures/Wall/Travertine002_2K-PNG_NormalGL.png');
const corridorWallRoughnessMap   = textureLoader.load('Textures/Textures/Wall/Travertine002_2K-PNG_Roughness.png');
const corridorWallDisplacementMap= textureLoader.load('Textures/Textures/Wall/Travertine002_2K-PNG_Displacement.png');

[
  corridorWallColorMap,
  corridorWallNormalMap,
  corridorWallRoughnessMap,
  corridorWallDisplacementMap
].forEach((tex) => {
  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
  }
});

const corridorWallMat = new THREE.MeshStandardMaterial({
  map: corridorWallColorMap,
  normalMap: corridorWallNormalMap,
  roughnessMap: corridorWallRoughnessMap,
  displacementMap: corridorWallDisplacementMap,
  displacementScale: 0.05,
  roughness: 1.0,
  side: THREE.DoubleSide
});

const backWallGeo = new THREE.PlaneGeometry(17, 10);
const backWallLeft = new THREE.Mesh(backWallGeo, corridorWallMat);
backWallLeft.position.set(-11.5, 5, -25);
backWallLeft.castShadow = true;
backWallLeft.receiveShadow = true;
corridor.add(backWallLeft);

const backWallRight = new THREE.Mesh(backWallGeo, corridorWallMat);
backWallRight.position.set(11.5, 5, -25);
backWallRight.castShadow = true;
backWallRight.receiveShadow = true;
corridor.add(backWallRight);

const aboveDoorGeo = new THREE.PlaneGeometry(6, 2);
const aboveDoor = new THREE.Mesh(aboveDoorGeo, corridorWallMat);
aboveDoor.position.set(0, 9, -25);
aboveDoor.castShadow = true;
aboveDoor.receiveShadow = true;
corridor.add(aboveDoor);

const corridorSideGeo = new THREE.PlaneGeometry(25, 10);
const rightWallSide = new THREE.Mesh(corridorSideGeo, corridorWallMat);
rightWallSide.rotation.y = -Math.PI / 2;
rightWallSide.position.set(20, 5, -12.5);
rightWallSide.castShadow = true;
rightWallSide.receiveShadow = true;
corridor.add(rightWallSide);

const ceilingColorMap = textureLoader.load('Textures/Textures/soffitto/Tiles101_2K-PNG_Color.png');
const ceilingAOMap = textureLoader.load('Textures/Textures/soffitto/Tiles101_2K-PNG_AmbientOcclusion.png');
const ceilingRoughnessMap = textureLoader.load('Textures/Textures/soffitto/Tiles101_2K-PNG_Roughness.png');
const ceilingNormalMap = textureLoader.load('Textures/Textures/soffitto/Tiles101_2K-PNG_NormalGL.png');
const ceilingDisplacementMap = textureLoader.load('Textures/Textures/soffitto/Tiles101_2K-PNG_Displacement.png');

[
  ceilingColorMap,
  ceilingAOMap,
  ceilingRoughnessMap,
  ceilingNormalMap,
  ceilingDisplacementMap
].forEach(tex => {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
});

const ceilingMat = new THREE.MeshStandardMaterial({
  map: ceilingColorMap,
  aoMap: ceilingAOMap,
  roughnessMap: ceilingRoughnessMap,
  normalMap: ceilingNormalMap,
  displacementMap: ceilingDisplacementMap,
  displacementScale: 0.05,
  side: THREE.DoubleSide
});

const ceilingGeo = new THREE.PlaneGeometry(40, 25);
const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
ceilingMesh.rotation.x = Math.PI / 2;
ceilingMesh.position.set(0, 10, -12.5);
ceilingMesh.castShadow = true;
ceilingMesh.receiveShadow = true;

corridor.add(ceilingMesh);

// ===========================
// MURO CON FINESTRA SUL LATO SINISTRO
// ===========================
function createWindowWall() {
  const wallWidth = 40;
  const wallHeight = 10;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-wallWidth/2, 0);
  wallShape.lineTo(wallWidth/2, 0);
  wallShape.lineTo(wallWidth/2, wallHeight);
  wallShape.lineTo(-wallWidth/2, wallHeight);
  wallShape.lineTo(-wallWidth/2, 0);

  const windowWidth = 10;
  const windowHeight = 4;
  const windowX = 0;
  const windowY = wallHeight/2;

  const windowHole = new THREE.Path();
  windowHole.moveTo(windowX - windowWidth/2, windowY - windowHeight/2);
  windowHole.lineTo(windowX + windowWidth/2, windowY - windowHeight/2);
  windowHole.lineTo(windowX + windowWidth/2, windowY + windowHeight/2);
  windowHole.lineTo(windowX - windowWidth/2, windowY + windowHeight/2);
  windowHole.lineTo(windowX - windowWidth/2, windowY - windowHeight/2);
  wallShape.holes.push(windowHole);

  const extrudeSettings = {
    steps: 1,
    depth: 0.5,
    bevelEnabled: false
  };

  const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
  const wallMesh = new THREE.Mesh(wallGeometry, corridorWallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  wallMesh.position.set(0, 0, -extrudeSettings.depth);
  return wallMesh;
}

const windowWall = createWindowWall();
windowWall.rotation.y = Math.PI / 2;
windowWall.position.set(-20 + 0.5, 0, -12.5);
corridor.add(windowWall);

// ===========================
// NUOVO MURO FRONTAL CON GRANDE FINESTRA
// ===========================
function createFrontWallWithWindow() {
  const wallWidth = 40;
  const wallHeight = 10;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-wallWidth / 2, 0);
  wallShape.lineTo(wallWidth / 2, 0);
  wallShape.lineTo(wallWidth / 2, wallHeight);
  wallShape.lineTo(-wallWidth / 2, wallHeight);
  wallShape.lineTo(-wallWidth / 2, 0);

  const windowWidth = 20;
  const windowHeight = 6;
  const windowX = 0;
  const windowY = wallHeight / 2;

  const windowHole = new THREE.Path();
  windowHole.moveTo(windowX - windowWidth / 2, windowY - windowHeight / 2);
  windowHole.lineTo(windowX + windowWidth / 2, windowY - windowHeight / 2);
  windowHole.lineTo(windowX + windowWidth / 2, windowY + windowHeight / 2);
  windowHole.lineTo(windowX - windowWidth / 2, windowY + windowHeight / 2);
  windowHole.lineTo(windowX - windowWidth / 2, windowY - windowHeight / 2);
  wallShape.holes.push(windowHole);

  const extrudeSettings = {
    steps: 1,
    depth: 0.5,
    bevelEnabled: false
  };

  const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
  const wallMesh = new THREE.Mesh(wallGeometry, corridorWallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  // Ruota il muro in modo che l'interno sia rivolto verso il corridoio
  wallMesh.rotation.y = Math.PI;
  // Posiziona il muro frontale (il corridoio si estende da z = -25 a 0)
  wallMesh.position.set(0, 0, 0.5);
  return wallMesh;
}

const frontWall = createFrontWallWithWindow();
corridor.add(frontWall);

// ===========================
// CREAZIONE DEL GIARDINETTO (TEXTURE ERBA)
// ===========================
const grassColorMap          = textureLoader.load('Textures/Textures/Terrain/Grass007_2k-JPG_Color.jpg');
const grassAOMap             = textureLoader.load('Textures/Textures/Terrain/Grass007_2k-JPG_AmbientOcclusion.jpg');
const grassRoughnessMap      = textureLoader.load('Textures/Textures/Terrain/Grass007_2k-JPG_Roughness.jpg');
const grassNormalMap         = textureLoader.load('Textures/Textures/Terrain/Grass007_2k-JPG_NormalGL.jpg');
const grassDisplacementMap   = textureLoader.load('Textures/Textures/Terrain/Grass007_2k-JPG_Displacement.jpg');

[
  grassColorMap,
  grassAOMap,
  grassRoughnessMap,
  grassNormalMap,
  grassDisplacementMap
].forEach((tex) => {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 5);
});

// Creazione della geometria del giardinetto e traslazione per avere il pivot sul lato destro
const gardenGeo = new THREE.PlaneGeometry(3, 25, 50, 50);
gardenGeo.translate(1.5, 0, 0);

const gardenMat = new THREE.MeshStandardMaterial({
  map: grassColorMap,
  aoMap: grassAOMap,
  normalMap: grassNormalMap,
  roughnessMap: grassRoughnessMap,
  displacementMap: grassDisplacementMap,
  displacementScale: 0.05,
  side: THREE.DoubleSide
});
const garden = new THREE.Mesh(gardenGeo, gardenMat);

// Ruota il piano per posizionarlo orizzontalmente
garden.rotation.x = -Math.PI / 2;
// Posiziona il giardinetto; aumenta il valore di y (ad esempio a 0.1) per farlo apparire sopra il pavimento
garden.position.set(-18.5, 0.2, -12.2);
garden.receiveShadow = true;

// Forza il rendering del giardinetto sopra il pavimento
garden.material.polygonOffset = true;
garden.material.polygonOffsetFactor = -4;
garden.material.polygonOffsetUnits = -4;
garden.renderOrder = 999;

corridor.add(garden);
// ===========================
// CREAZIONE DELLA CORNICE PER IL GIARDINETTO BASATA SUI BOUNDING BOX
// Assumiamo che il giardinetto (mesh "garden") si estenda in X da -18.5 a -15.5
// e in Z da -25 a 0, ed è posizionato a y = 0.1.
// Questi valori potrebbero dover essere aggiustati in base al tuo layout.

// ===========================
// CREAZIONE DELLA CORNICE PER IL GIARDINETTO
const frameMargin = 0.3;           // Sporgenza della cornice attorno al giardinetto
const gardenFrameThickness = 0.2;    // Spessore (altezza) della cornice

// Coordinate del giardinetto in world (si suppone che il pivot sia nell'angolo inferiore sinistro)
const gardenXMin = -18.5;
const gardenXMax = -15.5;  // -18.5 + 3
const gardenZMin = -25;
const gardenZMax = 0;
const shortenAmount = 0.5; // ad esempio 2 unità in meno

// Calcola le coordinate esterne della cornice
const outerXMin = gardenXMin - frameMargin;
const outerXMax = gardenXMax + frameMargin;
// Per il lato opposto, invece di usare gardenZMax + frameMargin, sottrai shortenAmount:
const outerZMin = gardenZMin - frameMargin;
const outerZMax = gardenZMax + frameMargin - shortenAmount;

// Crea la forma della cornice nel piano XZ
const frameShape = new THREE.Shape();
frameShape.moveTo(outerXMin, outerZMin);
frameShape.lineTo(outerXMax, outerZMin);
frameShape.lineTo(outerXMax, outerZMax);
frameShape.lineTo(outerXMin, outerZMax);
frameShape.lineTo(outerXMin, outerZMin);

// Crea il foro interno corrispondente al giardinetto
const hole = new THREE.Path();
hole.moveTo(gardenXMin, gardenZMin);
hole.lineTo(gardenXMax, gardenZMin);
hole.lineTo(gardenXMax, gardenZMax);
hole.lineTo(gardenXMin, gardenZMax);
hole.lineTo(gardenXMin, gardenZMin);
frameShape.holes.push(hole);

// Estrai la geometria tramite estrusione
const extrudeSettings = {
  steps: 1,
  depth: gardenFrameThickness,
  bevelEnabled: false
};
const frameGeo = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
const frameMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
const frameMesh = new THREE.Mesh(frameGeo, frameMat);

// Ruota la cornice in modo che l'estrusione vada lungo l'asse Y
frameMesh.rotation.x = -Math.PI / 2;

// Posiziona la cornice in Y in modo che il bordo inferiore coincida con il giardinetto
frameMesh.position.y = 0.1;

// Calcola la lunghezza del giardinetto (25 unità) e sposta la cornice lungo Z
const gardenLength = gardenZMax + gardenZMin; // 0 - (-25) = 25

frameMesh.position.z += (gardenLength);

corridor.add(frameMesh);

// ===========================
// ALTRI ELEMENTI DEL CORRIDOIO
// ===========================
const gltfLoader = new GLTFLoader();

// Piante grandi sul lato destro
gltfLoader.load('3D_Model/Pianta/potted_plant_02_4k.gltf', (gltf) => {
  const plant1 = gltf.scene;
  plant1.scale.set(2, 2, 2);
  plant1.position.set(15, 0, -5);
  plant1.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(plant1);
});
gltfLoader.load('3D_Model/Pianta2/potted_plant_01_4k.gltf', (gltf) => {
  const plant2 = gltf.scene;
  plant2.scale.set(2, 2, 2);
  plant2.position.set(15, 0, -7);
  plant2.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(plant2);
});

// Piante piccole sul giardinetto (ruotate di 90°)
gltfLoader.load('3D_Model/natura/othonna_cerarioides_4k.gltf', (gltf) => {
  const plantShelf = gltf.scene;
  plantShelf.scale.set(1, 1, 1);
  // Spostato ulteriormente dentro: modifica la coordinata z (da -15 a -17, ad esempio)
  plantShelf.position.set(-16.5, 0, -18);
  // Ruota di 90° sull'asse Y (se necessario, altrimenti rimuovi questa linea)
  plantShelf.rotation.y = Math.PI / 2;
  plantShelf.traverse(obj => { 
    if (obj.isMesh) { 
      obj.castShadow = true; 
      obj.receiveShadow = true; 
    } 
  });
  corridor.add(plantShelf);
});

// ===========================
// AGGIUNTA DI UN NUOVO MODELLO 3D ("PIANTA3")
// ===========================
gltfLoader.load('3D_Model/Pianta3/tree_small_02_2k.gltf', (gltf) => {
  const plant3 = gltf.scene;
  plant3.scale.set(1, 1, 1);
  // Posiziona il nuovo modello sopra la texture; regola la posizione in base al layout
  plant3.position.set(-16.5, 0.2, -10);
  // Ruota di 90° sull'asse Y per orientarlo correttamente
  plant3.rotation.y = Math.PI / 2;
  plant3.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  corridor.add(plant3);
});
  gltfLoader.load('3D_Model/Pianta3/tree_small_02_2k.gltf', (gltf) => {
    const plant3Duplicate = gltf.scene;
    plant3Duplicate.scale.set(1, 1, 1);
    // Posiziona il nuovo modello sopra la texture; regola la posizione in base al layout
    plant3Duplicate.position.set(-16.5, 0.2, -13);
    // Ruota di 90° sull'asse Y per orientarlo correttamente
    plant3Duplicate.rotation.y = Math.PI / 2;
    plant3Duplicate.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    corridor.add(plant3Duplicate);
  });
  // AGGIUNTA DI UN NUOVO MODELLO "ROCCIA" E REGOLAZIONE DI "NATURA" E "PIANTA3"

gltfLoader.load('3D_Model/roccia/namaqualand_boulder_02_2k.gltf', (gltf) => {
  const rockModel = gltf.scene;
  rockModel.scale.set(1, 1, 1);
  // Posiziona il modello "roccia" sopra la texture.
  // Regola le coordinate in modo che il modello non sporga dal muro.
  rockModel.position.set(-16, 0.2, -7);
  rockModel.rotation.y = Math.PI / 4;
  rockModel.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  corridor.add(rockModel);
});

gltfLoader.load('3D_Model/natura/othonna_cerarioides_4k.gltf', (gltf) => {
  // Duplichiamo il modello utilizzando clone()
  const naturaDuplicate = gltf.scene.clone();
  naturaDuplicate.scale.set(1, 1, 1);
  // Sposta il duplicato un po' più all'interno per evitare che esca dal muro
  naturaDuplicate.position.set(-16, 0.2, -20);
  naturaDuplicate.rotation.y = Math.PI / 2;
  naturaDuplicate.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  corridor.add(naturaDuplicate);
});

gltfLoader.load('3D_Model/Fiori/dandelion_01_4k.gltf', (gltf) => {
  const plantShelf2 = gltf.scene;
  plantShelf2.scale.set(1, 1, 1);
  // Posizionata sopra il giardino e ruotata di 90° sull'asse Y
  plantShelf2.position.set(-16, 0, -5);
  plantShelf2.rotation.y = Math.PI / 2;
  plantShelf2.traverse(obj => { 
    if (obj.isMesh) { 
      obj.castShadow = true; 
      obj.receiveShadow = true; 
    } 
  });
  corridor.add(plantShelf2);
});

gltfLoader.load('3D_Model/Quadro/fancy_picture_frame_02_4k.gltf', (gltf) => {
  const picture1 = gltf.scene;
  picture1.scale.set(2, 2, 2);
  picture1.position.set(19.9, 5, -5);
  picture1.rotation.y = -Math.PI / 2;
  picture1.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(picture1);
});
gltfLoader.load('3D_Model/Quadro1/fancy_picture_frame_01_4k.gltf', (gltf) => {
  const picture2 = gltf.scene;
  picture2.scale.set(2, 2, 2);
  picture2.position.set(19.9, 5, -10);
  picture2.rotation.y = -Math.PI / 2;
  picture2.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(picture2);
});
gltfLoader.load('3D_Model/Quadro2/hanging_picture_frame_02_2k.gltf', (gltf) => {
  const picture3 = gltf.scene;
  picture3.scale.set(2, 2, 2);
  picture3.position.set(19.9, 5, -15);
  picture3.rotation.y = -Math.PI / 2;
  picture3.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(picture3);
});
gltfLoader.load('3D_Model/Quadro3/hanging_picture_frame_03_2k.gltf', (gltf) => {
  const picture4 = gltf.scene;
  picture4.scale.set(2, 2, 2);
  picture4.position.set(19.9, 5, -20);
  picture4.rotation.y = -Math.PI / 2;
  picture4.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(picture4);
});
const divani1Group = new THREE.Group();

gltfLoader.load('3D_Model/Divano1/Ottoman_01_4k.gltf', (gltf) => {
  const sofa1 = gltf.scene;
  sofa1.scale.set(2.5, 2.5, 2.5);
  // Posiziona il primo divano di fronte ai quadri
  sofa1.position.set(14, 0, -10);
  sofa1.rotation.y = Math.PI;
  sofa1.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  divani1Group.add(sofa1);
});

gltfLoader.load('3D_Model/Divano1/Ottoman_01_4k.gltf', (gltf) => {
  const sofa2 = gltf.scene;
  sofa2.scale.set(2.5, 2.5, 2.5);
  // Posiziona il secondo divano (ad esempio, un po' dietro o più in basso rispetto al primo)
  sofa2.position.set(14, 0, -15);
  sofa2.rotation.y = Math.PI;
  sofa2.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  divani1Group.add(sofa2);
});

divani1Group.position.set(0, 0, 0);
corridor.add(divani1Group)

let lamp1Light, lamp2Light;
const lampsIntensity = { lamp1: 7.0, lamp2: 7.0 };

gltfLoader.load('3D_Model/Lampada/Chandelier_03_4k.gltf', (gltf) => {
  const lamp1 = gltf.scene;
  lamp1.position.set(-5, 9.9, -10);
  lamp1.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(lamp1);
  const box1 = new THREE.Box3().setFromObject(lamp1);
  const size1 = new THREE.Vector3();
  box1.getSize(size1);
  lamp1Light = new THREE.PointLight(0xffffff, lampsIntensity.lamp1, 15);
  lamp1Light.castShadow = true;
  lamp1Light.position.set(0, -size1.y / 2, 0);
  lamp1.add(lamp1Light);
});

gltfLoader.load('3D_Model/Lampada/Chandelier_03_4k.gltf', (gltf) => {
  const lamp2 = gltf.scene;
  lamp2.position.set(5, 9.9, -10);
  lamp2.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(lamp2);
  const box2 = new THREE.Box3().setFromObject(lamp2);
  const size2 = new THREE.Vector3();
  box2.getSize(size2);
  lamp2Light = new THREE.PointLight(0xffffff, lampsIntensity.lamp2, 15);
  lamp2Light.castShadow = true;
  lamp2Light.position.set(0, -size2.y / 2, 0);
  lamp2.add(lamp2Light);
});

const lampFolder = gui.addFolder("Ceiling Lamps");
lampFolder.add(lampsIntensity, 'lamp1', 0, 2).name('Lamp 1').onChange(v => { if (lamp1Light) lamp1Light.intensity = v; });
lampFolder.add(lampsIntensity, 'lamp2', 0, 2).name('Lamp 2').onChange(v => { if (lamp2Light) lamp2Light.intensity = v; });

// ===========================
// PORTA con pivot
// ===========================
let doorOpening = false;
let doorRotation = 0;
const maxDoorRotation = Math.PI / 2;

function createDoorPivot() {
  const doorGeo = new THREE.BoxGeometry(6, 8, 0.1);
  const doorTex = textureLoader.load('Textures/Textures/Door/door.jpg');
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(3, 0, 0);
  doorMesh.castShadow = true;
  doorMesh.name = "doorMesh";

  const pivot = new THREE.Group();
  pivot.name = "doorPivot";
  pivot.position.set(-3, 4, -25);
  pivot.add(doorMesh);
  return pivot;
}

const doorPivot = createDoorPivot();
corridor.add(doorPivot);

function openDoor() {
  if (doorRotation < 1) {
    doorOpening = true;
  }
}

// ===========================
// PANNELLI VIDEO
// ===========================
function createVideoPanel(videoElement, w, h) {
  const videoTex = new THREE.VideoTexture(videoElement);
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: videoTex });
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// ===========================
// PANNELLI VIDEO CON CORNICE
// ===========================
function createFrameForPanel(panelWidth, panelHeight, frameThickness, frameDepth, color) {
  const frameGroup = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: color });
  
  // Cornice superiore
  const topFrameGeo = new THREE.BoxGeometry(panelWidth + 2 * frameThickness, frameThickness, frameDepth);
  const topFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
  topFrame.position.set(0, panelHeight / 2 + frameThickness / 2, 0);
  frameGroup.add(topFrame);
  
  // Cornice inferiore
  const bottomFrame = topFrame.clone();
  bottomFrame.position.set(0, -panelHeight / 2 - frameThickness / 2, 0);
  frameGroup.add(bottomFrame);
  
  // Cornice sinistra
  const sideFrameGeo = new THREE.BoxGeometry(frameThickness, panelHeight, frameDepth);
  const leftFrame = new THREE.Mesh(sideFrameGeo, frameMaterial);
  leftFrame.position.set(-panelWidth / 2 - frameThickness / 2, 0, 0);
  frameGroup.add(leftFrame);
  
  // Cornice destra
  const rightFrame = leftFrame.clone();
  rightFrame.position.set(panelWidth / 2 + frameThickness / 2, 0, 0);
  frameGroup.add(rightFrame);
  
  return frameGroup;
}

const apolloPanel = createVideoPanel(videoApollo, 8, 4.5);
apolloPanel.name = "apolloPanel";

const sputnikPanel = createVideoPanel(videoSputnik, 8, 4.5);
sputnikPanel.name = "sputnikPanel";

const frameColor = 0x333333;
const frameThicknessValue = 0.2;
const frameDepthValue = 0.1;
const apolloFrame = createFrameForPanel(8, 4.5, frameThicknessValue, frameDepthValue, frameColor);
const sputnikFrame = createFrameForPanel(8, 4.5, frameThicknessValue, frameDepthValue, frameColor);

apolloFrame.position.set(0, 0, 0.05);
sputnikFrame.position.set(0, 0, 0.05);

const apolloGroup = new THREE.Group();
apolloGroup.add(apolloPanel);
apolloGroup.add(apolloFrame);
apolloGroup.position.set(-10, 4, -24.9);

const sputnikGroup = new THREE.Group();
sputnikGroup.add(sputnikPanel);
sputnikGroup.add(sputnikFrame);
sputnikGroup.position.set(10, 4, -24.9);

corridor.add(apolloGroup);
corridor.add(sputnikGroup);

// ===========================
// DIVANI
// ===========================
gltfLoader.load('3D_Model/Divano/sofa_02_4k.gltf', (gltf) => {
  const couchApollo = gltf.scene;
  couchApollo.scale.set(2.5, 2.5, 2.5);
  couchApollo.position.set(-10, 0, -20);
  couchApollo.rotation.y = Math.PI;
  couchApollo.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(couchApollo);
});
gltfLoader.load('3D_Model/Divano/sofa_02_4k.gltf', (gltf) => {
  const couchSputnik = gltf.scene;
  couchSputnik.scale.set(2.5, 2.5, 2.5);
  couchSputnik.position.set(10, 0, -20);
  couchSputnik.rotation.y = Math.PI;
  couchSputnik.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  corridor.add(couchSputnik);
});

// ===========================
// SISTEMA SOLARE CON ORBITE, EFFETTI E INTERATTIVITÀ
// ===========================

// Creiamo il gruppo planetarium
const planetarium = new THREE.Group();
scene.add(planetarium);

// MATERIALI COMUNI PER IL PLANETARIUM
const commonWallMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const interiorHDRMat_floor = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Sky_space.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    commonWallMat.map = hdrTexture;
    commonWallMat.needsUpdate = true;
    interiorHDRMat_floor.map = hdrTexture;
    interiorHDRMat_floor.needsUpdate = true;
  });

// --- PAVIMENTO ---
const planetFloorGeo = new THREE.PlaneGeometry(40, 40);
const planetFloorMesh = new THREE.Mesh(planetFloorGeo, interiorHDRMat_floor);
planetFloorMesh.rotation.x = -Math.PI / 2;
planetFloorMesh.position.set(0, 0, -45);
planetFloorMesh.receiveShadow = true;
planetarium.add(planetFloorMesh);

// --- MURI ---
const planetWallHeight = 10;
const spaceSkyMaterial = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Sky_space.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    spaceSkyMaterial.map = hdrTexture;
    spaceSkyMaterial.needsUpdate = true;
  });
const backWallGeo1 = new THREE.PlaneGeometry(40, planetWallHeight);
const backWall = new THREE.Mesh(backWallGeo1, spaceSkyMaterial);
backWall.position.set(0, planetWallHeight / 2, -65);
planetarium.add(backWall);

const leftWallGeo = new THREE.PlaneGeometry(40, planetWallHeight);
const leftWall = new THREE.Mesh(leftWallGeo, commonWallMat);
leftWall.position.set(-20, planetWallHeight / 2, -45);
leftWall.rotation.y = -Math.PI / 2;
leftWall.material.polygonOffset = true;
leftWall.material.polygonOffsetFactor = 1;
leftWall.material.polygonOffsetUnits = 1;
leftWall.renderOrder = 1;
planetarium.add(leftWall);

const rightWallGeo = new THREE.PlaneGeometry(40, planetWallHeight);
const rightWall = new THREE.Mesh(rightWallGeo, commonWallMat);
rightWall.position.set(20, planetWallHeight / 2, -45);
rightWall.rotation.y = Math.PI / 2;
rightWall.material.polygonOffset = true;
rightWall.material.polygonOffsetFactor = 1;
rightWall.material.polygonOffsetUnits = 1;
rightWall.renderOrder = 1;
planetarium.add(rightWall);

// --- CUPOLA ---
const domeRadius = 20;
const domeGeo = new THREE.SphereGeometry(domeRadius, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
const dome = new THREE.Mesh(domeGeo, commonWallMat);
dome.material.side = THREE.BackSide;
dome.position.set(0, 10, -45);
planetarium.add(dome);

// --- SOFFITTO / ANELLO ---
const ceilingWidth = 40, ceilingDepth = 40;
const ceilingShape = new THREE.Shape();
ceilingShape.moveTo(-ceilingWidth / 2, -ceilingDepth / 2);
ceilingShape.lineTo(ceilingWidth / 2, -ceilingDepth / 2);
ceilingShape.lineTo(ceilingWidth / 2, ceilingDepth / 2);
ceilingShape.lineTo(-ceilingWidth / 2, ceilingDepth / 2);
ceilingShape.lineTo(-ceilingWidth / 2, -ceilingDepth / 2);

const domeCeilingRadius = domeRadius;
const domeCircle = new THREE.Path();
domeCircle.absarc(0, 0, domeCeilingRadius, 0, Math.PI * 2, false);
ceilingShape.holes.push(domeCircle);

const extrudeSetting1s = { steps: 1, depth: 0, bevelEnabled: false };
const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, extrudeSetting1s);
const ceilingMesh1 = new THREE.Mesh(ceilingGeometry, commonWallMat);
ceilingMesh1.rotation.x = -Math.PI / 2;
ceilingMesh1.position.set(0, 10, -45);
ceilingMesh1.material.polygonOffset = true;
ceilingMesh1.material.polygonOffsetFactor = 1;
ceilingMesh1.material.polygonOffsetUnits = 1;
ceilingMesh1.renderOrder = 1;
planetarium.add(ceilingMesh1);

// --- LUCE INTERNA ---
const pointLight = new THREE.PointLight(0xffffff, guiParams.planetLightIntensity);
pointLight.position.set(0, 5, -45);
pointLight.castShadow = true;
planetarium.add(pointLight);

// Array per salvare le orbite (linee) dei pianeti
const orbitLines = [];

// ===========================
// ===========================
// SISTEMA SOLARE: CREAZIONE MODULARE DEI PIANETI CON ORBITE VISIBILI
// ===========================
// ===========================
// ---------------------------
// Modalità Gioco: la modalità di gioco determina se la telecamera segue l'astronave in terza persona.
// In modalità gioco ( = true) l'utente controlla l'astronave; in modalità normale, la telecamera è libera.
// ===========================

// Variabile per gestire la modalità gioco e il game over
let gameMode = false;
let gameOver = false;

// Costante gravitazionale per il Sole
const G = 0.5;

// Velocità della paparella
const shipSpeed = 5;
const velocity = new THREE.Vector3();

// Velocità di rotazione (radians al secondo)
const turnSpeed = 2.0;

// Mappa dei tasti per il controllo (WASD, Q, E, SPACE e SHIFT)
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  q: false, // ruota a sinistra (yaw)
  e: false, // ruota a destra (yaw)
  space: false, // per salire
  shift: false  // per scendere
};

// Parametri per la camera follow (terza persona)
const cameraFollowDistance = 4;  // distanza dalla paparella
const cameraVerticalOffset = 2;    // altezza della camera sopra la paparella
const smoothFactorPos = 0.1;       // smoothing per la posizione

// Definizione della boundary a forma di cupola (dome)
const domeBoundary = {
  center: new THREE.Vector3(0, 20, -50),
  radius: 20
};

// Pulsante per attivare/disattivare la modalità gioco
const gameModeButton = document.createElement('button');
gameModeButton.innerText = 'Entra in Gioco';
gameModeButton.style.position = 'absolute';
gameModeButton.style.top = '10px';
gameModeButton.style.left = '10px';
gameModeButton.style.padding = '10px';
document.body.appendChild(gameModeButton);

// Overlay per il Game Over
const gameOverOverlay = document.createElement('div');
gameOverOverlay.style.position = 'absolute';
gameOverOverlay.style.top = '0';
gameOverOverlay.style.left = '0';
gameOverOverlay.style.width = '100%';
gameOverOverlay.style.height = '100%';
gameOverOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
gameOverOverlay.style.color = 'white';
gameOverOverlay.style.fontSize = '48px';
gameOverOverlay.style.display = 'flex';
gameOverOverlay.style.justifyContent = 'center';
gameOverOverlay.style.alignItems = 'center';
gameOverOverlay.style.zIndex = '10';
gameOverOverlay.style.display = 'none';
gameOverOverlay.innerText = 'GAME OVER';
document.body.appendChild(gameOverOverlay);

// Pulsante per il reset del gioco
const restartButton = document.createElement('button');
restartButton.innerText = 'Ricomincia';
restartButton.style.position = 'absolute';
restartButton.style.top = '120px';
restartButton.style.left = '10px';
restartButton.style.padding = '10px';
restartButton.style.fontSize = '16px';
restartButton.style.display = 'none';
document.body.appendChild(restartButton);

// ===========================
// FUNZIONE DI RESET DEL GIOCO
// ===========================
function resetGame() {
  gameOver = false;
  gameOverOverlay.style.display = 'none';
  restartButton.style.display = 'none';
  if (ship) {
    // Posiziona la paparella all'ingresso della cupola e "spawnala" al contrario
    ship.position.copy(domeBoundary.center);
    ship.position.y = 2; // imposta manualmente l'altezza iniziale
    // Sposta la paperella indietro lungo l'asse Z rispetto al centro della cupola
    ship.position.z -= domeBoundary.radius * 0.5;
    ship.rotation.y = Math.PI; // ruota di 180°
    velocity.set(0, 0, 0);
    ship.userData.boundingBox.setFromObject(ship);
  }
}

restartButton.addEventListener('click', resetGame);

// Gestione del click sul pulsante game mode
gameModeButton.addEventListener('click', () => {
  if (!gameOver) {
    if (!gameMode) {
      enterGameMode();
    } else {
      exitGameMode();
    }
  }
});

// ===========================
// SISTEMA SOLARE: CREAZIONE MODULARE DEI PIANETI CON ORBITE VISIBILI
// ===========================
const texturesPlanets = {
  sun:      textureLoader.load('textures/planets/sun.jpg'),
  mercury:  textureLoader.load('textures/planets/mercury.jpg'),
  venus:    textureLoader.load('textures/planets/venus.jpg'),
  earth:    textureLoader.load('textures/planets/earth.jpg'),
  mars:     textureLoader.load('textures/planets/mars.jpg'),
  jupiter:  textureLoader.load('textures/planets/jupiter.jpg'),
  saturn:   textureLoader.load('textures/planets/saturn.jpg'),
  uranus:   textureLoader.load('textures/planets/uranus.jpg'),
  neptune:  textureLoader.load('textures/planets/neptune.jpg'),
  moon:     textureLoader.load('textures/planets/moon.jpg')
};

// Creazione del Sole
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshStandardMaterial({ 
  map: texturesPlanets.sun, 
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.0
});
const sunMesh = new THREE.Mesh(sunGeo, sunMat);

// Effetto glow sul Sole
const sunGlowGeo = new THREE.SphereGeometry(1.6, 32, 32);
const sunGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.3
});
const sunGlowMesh = new THREE.Mesh(sunGlowGeo, sunGlowMat);
sunMesh.add(sunGlowMesh);

// Luce direzionale dal Sole
const sunDirectionalLight = new THREE.DirectionalLight(0xffffff, guiParams.sunDynamicIntensity);
sunDirectionalLight.castShadow = true;
sunDirectionalLight.position.set(0, 0, 0);
sunDirectionalLight.target.position.set(5, 0, -5);
sunMesh.add(sunDirectionalLight);

// ===========================
// ASTEROIDI: GENERAZIONE DELLA CINTURA
// ===========================
const asteroidTexture = textureLoader.load('Textures/Asteroidi/Asteroidi.jpg');

function createAsteroidSphere(size = 0.3, widthSegments = 32, heightSegments = 32) {
  const geometry = new THREE.SphereGeometry(size, widthSegments, heightSegments);
  const positionAttribute = geometry.attributes.position;
  
  for (let i = 0; i < positionAttribute.count; i++) {
    const offset = i * 3;
    const deformation = (Math.random() - 0.5) * size * 0.1;
    positionAttribute.array[offset]     += deformation;
    positionAttribute.array[offset + 1] += deformation;
    positionAttribute.array[offset + 2] += deformation;
  }
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({ 
    map: asteroidTexture,
    roughness: 1 
  });
  
  const asteroid = new THREE.Mesh(geometry, material);
  asteroid.userData.rotationSpeed = new THREE.Vector3(
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02
  );
  
  return asteroid;
}

function generateAsteroidBelt({
  count = 500,
  innerRadius = 8,
  outerRadius = 9,
  beltThickness = 1.5
} = {}) {
  const beltGroup = new THREE.Group();
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.random());
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (Math.random() - 0.5) * beltThickness;
    
    const size = THREE.MathUtils.lerp(0.07, 0.15, Math.random());
    const asteroid = createAsteroidSphere(size, 7, 7);
    
    asteroid.position.set(x, y, z);
    asteroid.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    beltGroup.add(asteroid);
  }
  
  return beltGroup;
}

const asteroidBelt = generateAsteroidBelt({
  count: 600,
  innerRadius: 8,
  outerRadius: 9,
  beltThickness: 1.5
});

// Seconda cintura di asteroidi (perpendicolare)
const perpendicularAsteroidBelt = generateAsteroidBelt({
  count: 300,
  innerRadius: 7,
  outerRadius: 8,
  beltThickness: 1.5
});
perpendicularAsteroidBelt.rotation.x = -Math.PI / 2;

// ===========================
// CREAZIONE DEI PIANETI
// ===========================
function createPlanet({
  name, radius, distance, revolutionSpeed, rotationSpeed, texture,
  tilt = 0, hasRing = false
}) {
  const orbitGroup = new THREE.Group();
  const planetGeo = new THREE.SphereGeometry(radius, 32, 32);
  const planetMat = new THREE.MeshStandardMaterial({ map: texture });
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);
  planetMesh.castShadow = true;
  planetMesh.name = name;
  planetMesh.rotation.z = THREE.MathUtils.degToRad(tilt);
  planetMesh.position.set(distance, 0, 0);
  orbitGroup.add(planetMesh);

  orbitGroup.userData = {
    angle: Math.random() * Math.PI * 2,
    a: distance,
    b: distance * 0.8,
    revolutionSpeed,
    rotationSpeed,
    planetMesh: planetMesh
  };

  // Orbita visibile (ellisse)
  const ellipseCurve = new THREE.EllipseCurve(
    0, 0,
    distance, distance * 0.8,
    0, 2 * Math.PI,
    false,
    0
  );
  const points = ellipseCurve.getPoints(100);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
  orbitLine.rotation.x = Math.PI / 2;
  orbitLines.push(orbitLine);
  solarSystem.add(orbitLine);

  if (hasRing) {
    const ringGeo = new THREE.RingGeometry(radius * 1.2, radius * 1.8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    planetMesh.add(ring);
  }

  if (name === "Terra") {
    // Aura
    const auraGeo = new THREE.SphereGeometry(radius * 1.05, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({ 
      color: 0x99ccff, 
      transparent: true, 
      opacity: 0.2 
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    planetMesh.add(auraMesh);
    
    // Nuvolosità
    const cloudGeo = new THREE.SphereGeometry(radius * 1.04, 32, 32);
    const cloudMat = new THREE.MeshLambertMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.3 
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    planetMesh.add(cloudMesh);

    // Luna
    const moonGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: texturesPlanets.moon });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = true;
    const moonOrbit = new THREE.Group();
    moonOrbit.userData = { revolutionSpeed: 0.05, angle: 0, radius: 1.2 };
    moonMesh.position.set(1.2, 0, 0);
    moonOrbit.add(moonMesh);
    planetMesh.add(moonOrbit);
    moonOrbit.name = "MoonOrbit";
  }

  return orbitGroup;
}

const solarSystem = new THREE.Group();
solarSystem.position.set(-3, 19, -45);
planetarium.add(solarSystem);

solarSystem.rotation.z = THREE.MathUtils.degToRad(20);
solarSystem.add(asteroidBelt);
solarSystem.add(sunMesh);
solarSystem.add(perpendicularAsteroidBelt);

const planetsData = [
  { name: "Mercurio", radius: 0.4, distance: 3,  revolutionSpeed: 0.02, rotationSpeed: 0.01, texture: texturesPlanets.mercury, tilt: 3 },
  { name: "Venere",   radius: 0.5, distance: 4.5, revolutionSpeed: 0.015, rotationSpeed: 0.009, texture: texturesPlanets.venus, tilt: 177 },
  { name: "Terra",    radius: 0.5, distance: 6,   revolutionSpeed: 0.01, rotationSpeed: 0.03, texture: texturesPlanets.earth, tilt: 23.5 },
  { name: "Marte",    radius: 0.4, distance: 7.5, revolutionSpeed: 0.008, rotationSpeed: 0.03, texture: texturesPlanets.mars, tilt: 25 },
  { name: "Giove",    radius: 0.9, distance: 10,  revolutionSpeed: 0.005, rotationSpeed: 0.05, texture: texturesPlanets.jupiter, tilt: 3 },
  { name: "Saturno",  radius: 0.8, distance: 12,  revolutionSpeed: 0.004, rotationSpeed: 0.05, texture: texturesPlanets.saturn, tilt: 26.7, hasRing: true },
  { name: "Urano",    radius: 0.7, distance: 14,  revolutionSpeed: 0.003, rotationSpeed: 0.03, texture: texturesPlanets.uranus, tilt: 97.8 },
  { name: "Nettuno",  radius: 0.6, distance: 16,  revolutionSpeed: 0.002, rotationSpeed: 0.03, texture: texturesPlanets.neptune, tilt: 28 }
];

const clickablePlanets = [];
planetsData.forEach(data => {
  const orbitGroup = createPlanet(data);
  solarSystem.add(orbitGroup);
  clickablePlanets.push(orbitGroup.userData.planetMesh);
});

// ===========================
// EFFECT: ESPLOSIONE PER COLLISIONI
// ===========================
function createExplosionEffect(position, size) {
  const explosionGeo = new THREE.SphereGeometry(size, 16, 16);
  const explosionMat = new THREE.MeshBasicMaterial({ 
    color: 0xff5500, 
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const explosion = new THREE.Mesh(explosionGeo, explosionMat);
  explosion.position.copy(position);
  scene.add(explosion);
  
  const duration = 1000; // durata in ms
  const startTime = performance.now();
  function animateExplosion() {
    const elapsed = performance.now() - startTime;
    const t = elapsed / duration;
    explosion.scale.setScalar(1 + 2 * t);
    explosion.material.opacity = Math.max(0, 0.8 * (1 - t));
    if (t < 1) {
      requestAnimationFrame(animateExplosion);
    } else {
      scene.remove(explosion);
    }
  }
  animateExplosion();
}

// ===========================
// CARICAMENTO DEL MODELLO DELL'ASTRONAVE (PAPARELLA)
// ===========================
let ship; // Variabile globale per l'astronave

const gltfLoader1 = new GLTFLoader();
gltfLoader1.load('3D_Model/Paparella/rubber_duck_toy_4k.gltf', function(gltf) {
  ship = gltf.scene;
  // Scala ridotta per la paperella (terza persona)
  ship.scale.set(0.2, 0.2, 0.2);
  // La posizione iniziale verrà impostata in enterGameMode() o in resetGame()
  ship.userData.boundingBox = new THREE.Box3().setFromObject(ship);
  scene.add(ship);
}, undefined, function(error) {
  console.error('Errore nel caricamento del modello paparella:', error);
});

// ===========================
// CONTROLLI DELL'ASTRONAVE IN GAME MODE (WASD, Q, E, SPACE, SHIFT)
// ===========================
window.addEventListener('keydown', (e) => {
  let key = e.key.toLowerCase();
  if(key === " ") key = "space"; // mappa lo spazio a "space"
  if(key in keys) {
    e.preventDefault();
    keys[key] = true;
  }
});

window.addEventListener('keyup', (e) => {
  let key = e.key.toLowerCase();
  if(key === " ") key = "space";
  if(key in keys) {
    e.preventDefault();
    keys[key] = false;
  }
});

// Funzione di aggiornamento della paparella in game mode
function updateShip(deltaTime) {
  if (!ship) return;
  
  // Gestione della rotazione con i tasti "q" (sinistra) ed "e" (destra)
  if (keys.q) ship.rotation.y += turnSpeed * deltaTime;
  if (keys.e) ship.rotation.y -= turnSpeed * deltaTime;
  
  // Calcola la direzione avanti in base alla rotazione attuale della paperella.
  // Utilizziamo (0, 0, -1) per far muovere la paperella nella direzione "frontale"
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);
  
  // Reset della velocità
  velocity.set(0, 0, 0);
  
  // Movimento orizzontale: WASD
  if (keys.w) velocity.add(forward);
  if (keys.s) velocity.sub(forward);
  if (keys.a) velocity.sub(right);
  if (keys.d) velocity.add(right);
  
  // Movimento verticale: SPACE per salire, SHIFT per scendere
  if (keys.space) velocity.y += 1;
  if (keys.shift) velocity.y -= 1;
  
  if (velocity.length() > 0) {
    velocity.normalize().multiplyScalar(shipSpeed * deltaTime);
    ship.position.add(velocity);
    ship.userData.boundingBox.setFromObject(ship);
  }
}

// Funzione per applicare la gravità del Sole alla paparella
function applyGravity(deltaTime) {
  if(!ship) return;
  
  const shipPos = ship.getWorldPosition(new THREE.Vector3());
  const sunPos = sunMesh.getWorldPosition(new THREE.Vector3());
  const gravityDir = new THREE.Vector3().subVectors(sunPos, shipPos).normalize();
  const distance = shipPos.distanceTo(sunPos);
  const accelerationMagnitude = G / (distance * distance);
  const acceleration = gravityDir.multiplyScalar(accelerationMagnitude);
  
  velocity.add(acceleration.multiplyScalar(deltaTime));
  ship.position.add(velocity.clone().multiplyScalar(deltaTime));
  ship.userData.boundingBox.setFromObject(ship);
}

// ===========================
// FUNZIONE PER CONTROLLARE LE COLLISIONI
// ===========================
function checkShipCollisions() {
  if(!ship) return;
  const shipBB = ship.userData.boundingBox;
  
  // Collisione con asteroidi della prima cintura
  asteroidBelt.children.slice().forEach(asteroid => {
    const asteroidBB = new THREE.Box3().setFromObject(asteroid);
    if(shipBB.intersectsBox(asteroidBB)) {
      triggerGameOver("Collisione con asteroide");
    }
  });
  
  // Collisione con asteroidi della seconda cintura (perpendicolare)
  perpendicularAsteroidBelt.children.slice().forEach(asteroid => {
    const asteroidBB = new THREE.Box3().setFromObject(asteroid);
    if(shipBB.intersectsBox(asteroidBB)) {
      triggerGameOver("Collisione con asteroide (seconda cintura)");
    }
  });
  
  // Collisione con pianeti (incluso il Sole)
  const allPlanets = [...clickablePlanets, sunMesh];
  allPlanets.forEach(planet => {
    const planetPos = planet.getWorldPosition(new THREE.Vector3());
    const shipPos = ship.getWorldPosition(new THREE.Vector3());
    const planetRadius = planet.geometry ? planet.geometry.parameters.radius : 1.5;
    const shipRadius = 0.5; // regola in base al modello
    if(planetPos.distanceTo(shipPos) < planetRadius + shipRadius) {
      triggerGameOver(`Collisione con ${planet.name || 'pianeta'}`);
    }
  });
}

function triggerGameOver(reason) {
  console.log("Game Over!", reason);
  gameOver = true;
  gameOverOverlay.style.display = 'flex';
  restartButton.style.display = 'block'; // mostra il pulsante di restart
  // Qui puoi eventualmente fermare ulteriori input o suoni
}

// ===========================
// FUNZIONE PER VINCOLARE LA POSIZIONE DELLA PAPARELLA ALL'INTERNO DELLA CUPOLA
// ===========================
function constrainShipToDome(boundary) {
  if (!ship) return;
  const pos = ship.position;
  const offset = new THREE.Vector3().subVectors(pos, boundary.center);
  if (offset.length() > boundary.radius) {
    offset.normalize().multiplyScalar(boundary.radius);
    pos.copy(boundary.center.clone().add(offset));
    ship.position.copy(pos);
    ship.userData.boundingBox.setFromObject(ship);
  }
}

function updateCamera() {
  if (!ship) return;
  
  // Calcola la direzione attuale della paparella
  const forward = new THREE.Vector3();
  ship.getWorldDirection(forward);
  
  // Calcola la posizione target per la telecamera (dietro e sopra la paparella)
  const desiredCamPos = ship.position.clone()
    .sub(forward.clone().multiplyScalar(cameraFollowDistance))
    .add(new THREE.Vector3(0, cameraVerticalOffset, 0));
  
  // Easing per uno spostamento fluido
  camera.position.lerp(desiredCamPos, smoothFactorPos);
  camera.lookAt(ship.position);
}

// ===========================
// RAYCASTER & INTERAZIONE CLICK (già presente nel codice)
// ===========================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let transitioning = false;

window.addEventListener('click', onMouseClick, false);
function onMouseClick(e) {
  if (transitioning) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const objectsToCheck = [doorPivot, ...clickablePlanets];
  const intersects = raycaster.intersectObjects(objectsToCheck, true);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.name === "doorMesh" || obj.name === "doorPivot") {
      openDoor();
    } else if (obj.name === "apolloPanel") {
      videoSputnik.pause();
      focusOnMedia(apolloPanel, videoApollo);
    } else if (obj.name === "sputnikPanel") {
      videoApollo.pause();
      focusOnMedia(sputnikPanel, videoSputnik);
    } else {
      focusOnPlanet(obj);
    }
  }
}

// ===========================
// FUNZIONI DI TRANSIZIONE E FOCUS (già presenti)
// ===========================
function focusOnMedia(panel, videoElement) {
  transitioning = true;
  const panelPos = new THREE.Vector3();
  panel.getWorldPosition(panelPos);
  controls.target.copy(panelPos);
  const currentDistance = camera.position.distanceTo(panelPos);
  const newDistance = Math.max(currentDistance - 5, 1);
  const direction = camera.position.clone().sub(panelPos).normalize();
  const targetPosition = panelPos.clone().add(direction.multiplyScalar(newDistance));
  const startPosition = camera.position.clone();
  const duration = 1500;
  let startTime = null;
  function animateFocus(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(startPosition, targetPosition, t);
    controls.update();
    if (t < 1) {
      requestAnimationFrame(animateFocus);
    } else {
      transitioning = false;
      videoElement.play();
    }
  }
  requestAnimationFrame(animateFocus);
}

function focusOnPlanet(planetMesh) {
  transitioning = true;
  const planetPos = new THREE.Vector3();
  planetMesh.getWorldPosition(planetPos);
  const startPos = camera.position.clone();
  const direction = planetPos.clone().sub(camera.position).normalize();
  const targetPos = planetPos.clone().sub(direction.multiplyScalar(3));
  controls.target.copy(planetPos);
  const duration = 1500;
  let startTime = null;
  function animPlanet(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    let t = Math.min(elapsed / duration, 1);
    t = t * t * (3 - 2 * t);
    if (t < 1) {
      camera.position.lerpVectors(startPos, targetPos, t);
      controls.update();
      requestAnimationFrame(animPlanet);
    } else {
      transitioning = false;
    }
  }
  requestAnimationFrame(animPlanet);
}

function transitionToPlanetarium() {
  transitioning = true;
  planetMusic.play();
  const finalCamPos = new THREE.Vector3(0, 7, -35);
  const finalTarget = new THREE.Vector3(0, 7, -35);
  camera.up.set(0, 1, 0);
  const startPos = camera.position.clone();
  controls.target.copy(finalTarget);
  const duration = 1500;
  let startTime = null;
  function animTrans(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    let t = Math.min(elapsed / duration, 1);
    t = t * t * (3 - 2 * t);
    if (t < 1) {
      camera.position.lerpVectors(startPos, finalCamPos, t);
      controls.update();
      requestAnimationFrame(animTrans);
    } else {
      transitioning = false;
    }
  }
  requestAnimationFrame(animTrans);
}

function returnToCorridor() {
  transitioning = true;
  planetMusic.pause();
  const startPos = camera.position.clone();
  const oldTarget = controls.target.clone();
  const targetPos = initialCameraPosition.clone();
  const targetLook = initialCameraTarget.clone();
  const duration = 1500;
  let startTime = null;
  function animBack(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(startPos, targetPos, t);
    controls.target.lerpVectors(oldTarget, targetLook, t);
    controls.update();
    if (t < 1) {
      requestAnimationFrame(animBack);
    } else {
      transitioning = false;
      doorPivot.rotation.y = 0;
      doorRotation = 0;
      doorOpening = false;
    }
  }
  requestAnimationFrame(animBack);
}

const backButton = document.createElement('button');
backButton.innerText = 'Torna al corridoio';
backButton.style.position = 'absolute';
backButton.style.top = '60px';
backButton.style.right = '20px';
backButton.style.padding = '10px 20px';
backButton.style.fontSize = '16px';
document.body.appendChild(backButton);
backButton.addEventListener('click', returnToCorridor);

// ===========================
// ANIMAZIONE DELLA PORTA
// ===========================
function animateDoor() {
  if (doorOpening && doorRotation < 1) {
    doorRotation += 0.02;
    if (doorRotation >= 1) {
      doorRotation = 1;
      doorOpening = false;
      transitionToPlanetarium();
    }
    doorPivot.rotation.y = doorRotation * maxDoorRotation;
  }
}

// ===========================
// FUNZIONI PER MODALITÀ GIOCO (CAMBIO CAMERA E CONTROLLI)
// ===========================
/* 
  Nuovo approccio per la camera follow:
  - Usa ship.getWorldDirection() per determinare il verso in cui la paparella sta andando.
  - La posizione target della camera viene calcolata come:
      ship.position - (forward * cameraFollowDistance) + (0, cameraVerticalOffset, 0)
  - Questo assicura che la camera rimanga dietro la paparella e segua le sue inversioni in maniera coerente.
  - Inoltre, per "spawnare" la paparella al contrario, si imposta la sua rotazione iniziale a Math.PI.
*/
function enterGameMode() {
  if (!ship) {
    console.warn("Il modello della paparella non è ancora caricato.");
    return;
  }
  
  // Posiziona la paparella all'ingresso della cupola e "spawnala" al contrario
  ship.position.copy(domeBoundary.center);
  ship.position.set(0, 2, -40);
  ship.rotation.y = Math.PI; // Ruota la paperella di 180° per farla spawnare al contrario
  
  // Posiziona subito la telecamera dietro la paperella
  const forward = new THREE.Vector3();
  ship.getWorldDirection(forward);
  const desiredCamPos = ship.position.clone()
    .sub(forward.clone().multiplyScalar(cameraFollowDistance))
    .add(new THREE.Vector3(0, cameraVerticalOffset, 0));
  camera.position.copy(desiredCamPos);
  camera.lookAt(ship.position);
  
  ship.userData.boundingBox.setFromObject(ship);

  gameMode = true;
  controls.enabled = false;
  
  gameModeButton.innerText = 'Esci dal Gioco';
}

function exitGameMode() {
  gameMode = false;
  controls.enabled = true;
  
  // Ripristina la camera nella scena con posizione iniziale
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialCameraTarget);
  
  gameModeButton.innerText = 'Entra in Gioco';
}

// ===========================
// LOOP DI ANIMAZIONE
// ===========================
let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) * 0.001;
  lastTime = currentTime;

  if (gameMode && !gameOver) {
    updateShip(deltaTime);
    applyGravity(deltaTime);
    checkShipCollisions();
    
    // Vincola la paparella all'interno della cupola
    constrainShipToDome(domeBoundary);

    // Aggiorna la camera in maniera fluida
    updateCamera();
  }

  // Rotazione della cintura di asteroidi attorno al Sole
  asteroidBelt.rotation.y += 0.001 * guiParams.simulationSpeed;
  perpendicularAsteroidBelt.rotation.y += 0.001 * guiParams.simulationSpeed;

  // Aggiornamento dei pianeti (rotazione e rivoluzione)
  solarSystem.children.forEach(child => {
    if (child.userData && child.userData.angle !== undefined) {
      child.userData.angle += child.userData.revolutionSpeed * guiParams.simulationSpeed;
      const a = child.userData.a;
      const b = child.userData.b;
      child.userData.planetMesh.position.set(
        a * Math.cos(child.userData.angle),
        0,
        b * Math.sin(child.userData.angle)
      );
      child.userData.planetMesh.rotation.y += child.userData.rotationSpeed * guiParams.simulationSpeed;
    }
  });

  // Aggiornamento orbita della Luna
  solarSystem.traverse(obj => {
    if (obj.name === "MoonOrbit" && obj.userData) {
      obj.userData.angle = (obj.userData.angle || 0) + (obj.userData.revolutionSpeed * guiParams.simulationSpeed);
      obj.rotation.y = obj.userData.angle;
    }
  });

  // Aggiornamento degli asteroidi: rotazione interna e controllo collisioni per perdere orbita
  const updateAsteroidGroup = (group) => {
    group.children.slice().forEach(asteroid => {
      asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
      asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
      asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
      
      clickablePlanets.forEach(planet => {
        const planetRadius = planet.geometry.parameters.radius;
        const asteroidRadius = asteroid.geometry.parameters.radius;
        const collisionThreshold = planetRadius + asteroidRadius;
        const distance = asteroid.getWorldPosition(new THREE.Vector3()).distanceTo(planet.getWorldPosition(new THREE.Vector3()));
        if (distance < collisionThreshold) {
          createExplosionEffect(asteroid.getWorldPosition(new THREE.Vector3()), asteroidRadius * 2);
          group.remove(asteroid);
        }
      });
    });
  };
  updateAsteroidGroup(asteroidBelt);
  updateAsteroidGroup(perpendicularAsteroidBelt);

  orbitLines.forEach(line => {
    line.visible = guiParams.showOrbits;
  });

  animateDoor();
  controls.update();
  composer.render();
}
animate();
