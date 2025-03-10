import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { GUI } from "./lib/lil-gui.module.min.js";
import { RGBELoader } from './lib/RGBELoader.js';
import { AudioLoader, AudioListener, Audio as ThreeAudio } from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { RectAreaLightUniformsLib } from './lib/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();

// ===========================
// VIDEO E PULSANTE STOP
// ===========================
// (il codice per video e pulsante stop è stato omesso per brevità)

// ===========================
// SCENA, CAMERA, RENDERER
// ===========================
const scene = new THREE.Scene();
scene.background = null; // lo imposteremo tramite HDR

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

// Carica l'HDR da usare come background (golden_gate_hills_2k.hdr)
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Hdr/golden_gate_hills_2k.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = hdrTexture;
  });

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
  musicVolume: 0.5
};

const mediaFolder = gui.addFolder("Media Controls");
mediaFolder.add({
  playVideos: () => {
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
gui.add({
  toggleMusic: () => {
    if (planetMusic.isPlaying) planetMusic.pause();
    else planetMusic.play();
  }
}, 'toggleMusic').name('Play/Pause Music');

// ===========================
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
corridorFloorMesh.position.z = -12.5; // Pavimento che va da z = -25 a 0
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

// --- Muro sinistro con finestra ---
function createWindowWall() {
  const wallWidth = 25;
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
windowWall.position.set(-20, 0, -12.5);
corridor.add(windowWall);

// --- Muro frontale con grande finestra ---
// Modifica: estrusione con depth negativo per farlo rimanere esattamente a z = 0
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
    depth: -0.5,  // Estrudiamo in direzione negativa in modo che la faccia rimanga a z=0
    bevelEnabled: false
  };

  const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
  const wallMesh = new THREE.Mesh(wallGeometry, corridorWallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  // Nessuna rotazione necessaria; la faccia definita dallo shape sarà quella visibile
  wallMesh.position.set(0, 0, 0);
  return wallMesh;
}

const frontWall = createFrontWallWithWindow();
corridor.add(frontWall);

// --- Soffitto ---
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
garden.rotation.x = -Math.PI / 2;
garden.position.set(-18.5, 0.2, -12.2);
garden.receiveShadow = true;
garden.material.polygonOffset = true;
garden.material.polygonOffsetFactor = -4;
garden.material.polygonOffsetUnits = -4;
garden.renderOrder = 999;
corridor.add(garden);

const frameMargin = 0.3;
const gardenFrameThickness = 0.2;
const gardenXMin = -18.5;
const gardenXMax = -15.5;
const gardenZMin = -25;
const gardenZMax = 0;
const shortenAmount = 0.5;

const outerXMin = gardenXMin - frameMargin;
const outerXMax = gardenXMax + frameMargin;
const outerZMin = gardenZMin - frameMargin;
const outerZMax = gardenZMax + frameMargin - shortenAmount;

const frameShape = new THREE.Shape();
frameShape.moveTo(outerXMin, outerZMin);
frameShape.lineTo(outerXMax, outerZMin);
frameShape.lineTo(outerXMax, outerZMax);
frameShape.lineTo(outerXMin, outerZMax);
frameShape.lineTo(outerXMin, outerZMin);

const hole = new THREE.Path();
hole.moveTo(gardenXMin, gardenZMin);
hole.lineTo(gardenXMax, gardenZMin);
hole.lineTo(gardenXMax, gardenZMax);
hole.lineTo(gardenXMin, gardenZMax);
hole.lineTo(gardenXMin, gardenZMin);
frameShape.holes.push(hole);

const extrudeSettingsFrame = {
  steps: 1,
  depth: gardenFrameThickness,
  bevelEnabled: false
};
const frameGeo = new THREE.ExtrudeGeometry(frameShape, extrudeSettingsFrame);
const frameMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
const frameMesh = new THREE.Mesh(frameGeo, frameMat);
frameMesh.rotation.x = -Math.PI / 2;
frameMesh.position.y = 0.1;
frameMesh.position.z = (gardenZMin + gardenZMax) / 2;
corridor.add(frameMesh);

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

function createFrameForPanel(panelWidth, panelHeight, frameThickness, frameDepth, color) {
  const frameGroup = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: color });
  
  const topFrameGeo = new THREE.BoxGeometry(panelWidth + 2 * frameThickness, frameThickness, frameDepth);
  const topFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
  topFrame.position.set(0, panelHeight / 2 + frameThickness / 2, 0);
  frameGroup.add(topFrame);
  
  const bottomFrame = topFrame.clone();
  bottomFrame.position.set(0, -panelHeight / 2 - frameThickness / 2, 0);
  frameGroup.add(bottomFrame);
  
  const sideFrameGeo = new THREE.BoxGeometry(frameThickness, panelHeight, frameDepth);
  const leftFrame = new THREE.Mesh(sideFrameGeo, frameMaterial);
  leftFrame.position.set(-panelWidth / 2 - frameThickness / 2, 0, 0);
  frameGroup.add(leftFrame);
  
  const rightFrame = leftFrame.clone();
  rightFrame.position.set(panelWidth / 2 + frameThickness / 2, 0, 0);
  frameGroup.add(rightFrame);
  
  return frameGroup;
}


// Crea il gruppo planetarium e aggiungilo alla scena
const planetarium = new THREE.Group();
scene.add(planetarium);

// MATERIALI
// Imposta il materiale in modo da renderizzare entrambi i lati per gli altri elementi
const commonWallMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const interiorHDRMat_floor = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

// CARICAMENTO DELLA TEXTURE HDR per commonWallMat e interiorHDRMat_floor
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Sky_space.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    // Assegna la texture al materiale comune per muri, soffitto/anelle e pavimento
    commonWallMat.map = hdrTexture;
    commonWallMat.needsUpdate = true;
    interiorHDRMat_floor.map = hdrTexture;
    interiorHDRMat_floor.needsUpdate = true;
  });

// --- PAVIMENTO ---
// Creazione del pavimento planetario (40 x 40)
const planetFloorGeo = new THREE.PlaneGeometry(40, 40);
const planetFloorMesh = new THREE.Mesh(planetFloorGeo, interiorHDRMat_floor);
planetFloorMesh.rotation.x = -Math.PI / 2;
planetFloorMesh.position.set(0, 0, -45);
planetFloorMesh.receiveShadow = true;
planetarium.add(planetFloorMesh);

// --- MURI ---
// Altezza delle pareti
const planetWallHeight = 10;

// Muro posteriore: utilizza un materiale specifico con unica texture "Space_sky"
// Viene creato un nuovo materiale con FrontSide
const spaceSkyMaterial = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
// Carica la texture e assegnala a spaceSkyMaterial
new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/Hdr/Sky_space.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    spaceSkyMaterial.map = hdrTexture;
    spaceSkyMaterial.needsUpdate = true;
  });
  
// Creazione del muro posteriore senza differenziazione tra interior ed exterior
const backWallGeo1 = new THREE.PlaneGeometry(40, planetWallHeight);
const backWall = new THREE.Mesh(backWallGeo1, spaceSkyMaterial);
backWall.position.set(0, planetWallHeight / 2, -65);
planetarium.add(backWall);

// Muro sinistro: posizionato a X = -20, Z = -45 (usa commonWallMat)
const leftWallGeo = new THREE.PlaneGeometry(40, planetWallHeight);
const leftWall = new THREE.Mesh(leftWallGeo, commonWallMat);
leftWall.position.set(-20, planetWallHeight / 2, -45);
leftWall.rotation.y = -Math.PI / 2;
leftWall.material.polygonOffset = true;
leftWall.material.polygonOffsetFactor = 1;
leftWall.material.polygonOffsetUnits = 1;
leftWall.renderOrder = 1;
planetarium.add(leftWall);

// Muro destro: posizionato a X = +20, Z = -45 (usa commonWallMat)
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
// Creazione della cupola (semisfera)
// Per vedere la texture dall’interno, usa BackSide
const domeRadius = 20;
const domeGeo = new THREE.SphereGeometry(domeRadius, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
const dome = new THREE.Mesh(domeGeo, commonWallMat);
dome.material.side = THREE.BackSide;
dome.position.set(0, 10, -45);
planetarium.add(dome);

// --- SOFFITTO / ANELLO ---
// Creazione dell'anello (soffitto con buco per la cupola)
const ceilingWidth = 40, ceilingDepth = 40;
const ceilingShape = new THREE.Shape();
ceilingShape.moveTo(-ceilingWidth / 2, -ceilingDepth / 2);
ceilingShape.lineTo(ceilingWidth / 2, -ceilingDepth / 2);
ceilingShape.lineTo(ceilingWidth / 2, ceilingDepth / 2);
ceilingShape.lineTo(-ceilingWidth / 2, ceilingDepth / 2);
ceilingShape.lineTo(-ceilingWidth / 2, -ceilingDepth / 2);

// Crea il buco circolare per la cupola
const domeCeilingRadius = domeRadius;
const domeCircle = new THREE.Path();
domeCircle.absarc(0, 0, domeCeilingRadius, 0, Math.PI * 2, false);
ceilingShape.holes.push(domeCircle);

// Estrusione della forma per ottenere la geometria del soffitto
const extrudeSettings = { steps: 1, depth: 0, bevelEnabled: false };
const ceilingGeometry = new THREE.ExtrudeGeometry(ceilingShape, extrudeSettings);
const ceilingMesh1 = new THREE.Mesh(ceilingGeometry, commonWallMat);
ceilingMesh1.rotation.x = -Math.PI / 2;
ceilingMesh1.position.set(0, 10, -45);
ceilingMesh1.material.polygonOffset = true;
ceilingMesh1.material.polygonOffsetFactor = 1;
ceilingMesh1.material.polygonOffsetUnits = 1;
ceilingMesh1.renderOrder = 1;
planetarium.add(ceilingMesh1);

// --- LUCE ---
// Aggiungi una luce interna, ad esempio una PointLight
const pointLight = new THREE.PointLight(0xffffff, guiParams.planetLightIntensity);
pointLight.position.set(0, 5, -45);
pointLight.castShadow = true;
planetarium.add(pointLight);
// ... resto del codice pianeti ...


// ===========================
// SISTEMA SOLARE CON ORBITE ELLITTICHE
// ===========================
const solarSystem = new THREE.Group();
solarSystem.position.set(0, 20, -50);
planetarium.add(solarSystem);

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

const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ map: texturesPlanets.sun });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
solarSystem.add(sunMesh);

const planetsData = [
  { name: "Mercurio", radius: 0.4, distance: 3,  revolutionSpeed: 0.02,  rotationSpeed: 0.01, texture: texturesPlanets.mercury },
  { name: "Venere",   radius: 0.5, distance: 4.5, revolutionSpeed: 0.015, rotationSpeed: 0.009, texture: texturesPlanets.venus },
  { name: "Terra",    radius: 0.5, distance: 6,   revolutionSpeed: 0.01,  rotationSpeed: 0.03,  texture: texturesPlanets.earth },
  { name: "Marte",    radius: 0.4, distance: 7.5, revolutionSpeed: 0.008, rotationSpeed: 0.03,  texture: texturesPlanets.mars },
  { name: "Giove",    radius: 0.9, distance: 10,  revolutionSpeed: 0.005, rotationSpeed: 0.05,  texture: texturesPlanets.jupiter },
  { name: "Saturno",  radius: 0.8, distance: 12,  revolutionSpeed: 0.004, rotationSpeed: 0.05,  texture: texturesPlanets.saturn, hasRing: true },
  { name: "Urano",    radius: 0.7, distance: 14,  revolutionSpeed: 0.003, rotationSpeed: 0.03,  texture: texturesPlanets.uranus },
  { name: "Nettuno",  radius: 0.6, distance: 16,  revolutionSpeed: 0.002, rotationSpeed: 0.03,  texture: texturesPlanets.neptune }
];

const planetGroups = [];
const moonOrbits = [];
const clickablePlanets = [];

planetsData.forEach(data => {
  const orbitGroup = new THREE.Group();
  solarSystem.add(orbitGroup);

  const planetGeo = new THREE.SphereGeometry(data.radius, 32, 32);
  const planetMat = new THREE.MeshStandardMaterial({ map: data.texture });
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);
  planetMesh.castShadow = true;
  planetMesh.name = data.name;
  planetMesh.position.set(data.distance, 0, 0);
  orbitGroup.add(planetMesh);

  orbitGroup.userData = {
    angle: 0,
    a: data.distance,
    b: data.distance * 0.8,
    revolutionSpeed: data.revolutionSpeed,
    rotationSpeed: data.rotationSpeed,
    planetMesh: planetMesh
  };

  planetGroups.push(orbitGroup);
  clickablePlanets.push(planetMesh);

  if (data.hasRing) {
    const ringGeo = new THREE.RingGeometry(data.radius * 1.2, data.radius * 1.8, 32);
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

  if (data.name === "Terra") {
    const moonGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: texturesPlanets.moon });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.castShadow = true;

    const moonOrbit = new THREE.Group();
    moonOrbit.userData = { revolutionSpeed: 0.05, angle: 0, radius: 1.2 };
    moon.position.set(1.2, 0, 0);
    moonOrbit.add(moon);
    planetMesh.add(moonOrbit);
    moonOrbits.push(moonOrbit);
  }
});

// ===========================
// RAYCASTER & CLICK
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
// FOCUS SU VIDEO
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

// ===========================
// FOCUS SU PIANETA
// ===========================
function focusOnPlanet(planetMesh) {
  transitioning = true;
  const planetPos = new THREE.Vector3();
  planetMesh.getWorldPosition(planetPos);
  controls.target.copy(planetPos);

  const startPos = camera.position.clone();
  const direction = planetPos.clone().sub(camera.position).normalize();
  const targetPos = planetPos.clone().sub(direction.multiplyScalar(3));

  const duration = 1500;
  let startTime = null;

  function animPlanet(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / duration, 1);

    camera.position.lerpVectors(startPos, targetPos, t);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(animPlanet);
    } else {
      transitioning = false;
    }
  }
  requestAnimationFrame(animPlanet);
}

// ===========================
// TRANSIZIONI TRA LE STANZE
// ===========================
function transitionToPlanetarium() {
  transitioning = true;
  planetMusic.play();

  const finalCamPos = new THREE.Vector3(0, 5, -35);
  const finalTarget = new THREE.Vector3(0, 5, -28);

  const startPos = camera.position.clone();
  const oldTarget = controls.target.clone();

  const duration = 1500;
  let startTime = null;

  function animTrans(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / duration, 1);

    camera.position.lerpVectors(startPos, finalCamPos, t);
    controls.target.lerpVectors(oldTarget, finalTarget, t);
    controls.update();

    if (t < 1) {
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
// ANIMAZIONE PORTA
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
// LOOP DI ANIMAZIONE
// ===========================
function animate() {
  requestAnimationFrame(animate);

  sunMesh.rotation.y += 0.005;

  planetGroups.forEach(g => {
    g.userData.angle += g.userData.revolutionSpeed;
    const a = g.userData.a;
    const b = g.userData.b;
    g.userData.planetMesh.position.set(
      a * Math.cos(g.userData.angle),
      0,
      b * Math.sin(g.userData.angle)
    );
    g.userData.planetMesh.rotation.y += g.userData.rotationSpeed;
  });
  moonOrbits.forEach(m => {
    m.userData.angle = (m.userData.angle || 0) + m.userData.revolutionSpeed;
    m.rotation.y = m.userData.angle;
  });

  animateDoor();
  controls.update();
  renderer.render(scene, camera);
}
animate();