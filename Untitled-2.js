import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js';
import { GUI } from "./lib/lil-gui.module.min.js";
import { RGBELoader } from './lib/RGBELoader.js';
import { AudioLoader, AudioListener, Audio as ThreeAudio } from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
// Importa e inizializza le utilità per le luci area
import { RectAreaLightUniformsLib } from './lib/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();

// ===========================
// VIDEO E PULSANTE STOP
// ===========================
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
scene.background = new THREE.Color(0x000000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;

new RGBELoader()
  .setDataType(THREE.FloatType)
  .load('textures/hdr/sky_space.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdrTexture;
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

// ===========================
// SOFFITTO DEL CORRIDOIO CON PARAMETRI COMPLETI (PNG, Roughness, Normal, AO)
// Inserisci questo blocco subito dopo la sezione "ALTRE PARETI DEL CORRIDOIO"
// e prima della sezione "MURO CON FINESTRA SUL LATO SINISTRO"

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

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0,
  transmission: 0.9,
  transparent: true,
  thickness: 0.1,
  ior: 1.45
});
const windowGeo = new THREE.PlaneGeometry(10, 4);
const glassMesh = new THREE.Mesh(windowGeo, glassMaterial);
glassMesh.position.set(0, 5, 0.01);
glassMesh.castShadow = false;
glassMesh.receiveShadow = false;
windowWall.add(glassMesh);

const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const frameDepth = 0.1;
const frameThickness = 0.2;

const topFrameGeo = new THREE.BoxGeometry(10, frameThickness, frameDepth);
const topFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
topFrame.position.set(0, 5 + 4/2 + frameThickness/2, 0.01);
topFrame.castShadow = true;
topFrame.receiveShadow = true;
windowWall.add(topFrame);

const botFrameGeo = new THREE.BoxGeometry(10, frameThickness, frameDepth);
const botFrame = new THREE.Mesh(botFrameGeo, frameMaterial);
botFrame.position.set(0, 5 - 4/2 - frameThickness/2, 0.01);
botFrame.castShadow = true;
botFrame.receiveShadow = true;
windowWall.add(botFrame);

const leftFrameGeo = new THREE.BoxGeometry(frameThickness, 4, frameDepth);
const leftFrame = new THREE.Mesh(leftFrameGeo, frameMaterial);
leftFrame.position.set(-10/2 - frameThickness/2, 5, 0.01);
leftFrame.castShadow = true;
leftFrame.receiveShadow = true;
windowWall.add(leftFrame);

const rightFrameGeo = new THREE.BoxGeometry(frameThickness, 4, frameDepth);
const rightFrame = new THREE.Mesh(rightFrameGeo, frameMaterial);
rightFrame.position.set(10/2 + frameThickness/2, 5, 0.01);
rightFrame.castShadow = true;
rightFrame.receiveShadow = true;
windowWall.add(rightFrame);

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
// ===========================
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
// Inserisci questo snippet subito dopo il caricamento del modello "natura"
// Il modello si trova nella cartella "Pianta3" (nome inventato, potrai cambiarlo)
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

// Caricamento del modello "roccia" (da 3D_Model/roccia/roccia_4k.gltf)
gltfLoader.load('3D_Model/roccia/namaqualand_boulder_02_2k.gltf', (gltf) => {
  const rockModel = gltf.scene;
  rockModel.scale.set(1, 1, 1);
  // Posiziona il modello "roccia" sopra la texture.
  // Regola le coordinate in modo che il modello non sporga dal muro.
  rockModel.position.set(-16, 0.2, -7);  // Modifica questi valori in base al tuo layout
  rockModel.rotation.y = Math.PI / 4;       // Ruota se necessario
  rockModel.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  corridor.add(rockModel);
});

// Duplica il modello "natura" 
gltfLoader.load('3D_Model/natura/othonna_cerarioides_4k.gltf', (gltf) => {
  // Duplichiamo il modello utilizzando clone()
  const naturaDuplicate = gltf.scene.clone();
  naturaDuplicate.scale.set(1, 1, 1);
  // Sposta il duplicato un po' più all'interno per evitare che esca dal muro
  naturaDuplicate.position.set(-16, 0.2, -20); // Regola in base alle tue esigenze
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

// Quadri sul lato destro
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

// Caricamento del primo divano
gltfLoader.load('3D_Model/Divano1/Ottoman_01_4k.gltf', (gltf) => {
  const sofa1 = gltf.scene;
  sofa1.scale.set(2.5, 2.5, 2.5);
  // Posiziona il primo divano di fronte ai quadri
  sofa1.position.set(14, 0, -10); // Regola x, y, z secondo le tue necessità
  sofa1.rotation.y = Math.PI;      // Ruota per farlo "guardare" verso i quadri
  sofa1.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  divani1Group.add(sofa1);
});

// Caricamento del secondo divano
gltfLoader.load('3D_Model/Divano1/Ottoman_01_4k.gltf', (gltf) => {
  const sofa2 = gltf.scene;
  sofa2.scale.set(2.5, 2.5, 2.5);
  // Posiziona il secondo divano (ad esempio, un po' dietro o più in basso rispetto al primo)
  sofa2.position.set(14, 0, -15); // Regola anche questi valori in base al layout
  sofa2.rotation.y = Math.PI;
  sofa2.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  divani1Group.add(sofa2);
});

// Posiziona il gruppo "divani1" (puoi regolare la posizione del gruppo se necessario)
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

// Funzione per creare una cornice attorno a un pannello video
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

// Crea i pannelli video
const apolloPanel = createVideoPanel(videoApollo, 8, 4.5);
apolloPanel.name = "apolloPanel";

const sputnikPanel = createVideoPanel(videoSputnik, 8, 4.5);
sputnikPanel.name = "sputnikPanel";

// Crea cornici per i pannelli con i parametri desiderati
const frameColor = 0x333333;
const frameThicknessValue = 0.2;
const frameDepthValue = 0.1;
const apolloFrame = createFrameForPanel(8, 4.5, frameThicknessValue, frameDepthValue, frameColor);
const sputnikFrame = createFrameForPanel(8, 4.5, frameThicknessValue, frameDepthValue, frameColor);

// Posiziona le cornici leggermente davanti ai pannelli (offset lungo z)
apolloFrame.position.set(0, 0, 0.05);
sputnikFrame.position.set(0, 0, 0.05);

// Raggruppa ciascun pannello con la sua cornice
const apolloGroup = new THREE.Group();
apolloGroup.add(apolloPanel);
apolloGroup.add(apolloFrame);
apolloGroup.position.set(-10, 4, -24.9);

const sputnikGroup = new THREE.Group();
sputnikGroup.add(sputnikPanel);
sputnikGroup.add(sputnikFrame);
sputnikGroup.position.set(10, 4, -24.9);

// Aggiungi i gruppi al gruppo "corridor"
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
// SECONDA STANZA: PLANETARIO
// ===========================
const planetarium = new THREE.Group();
planetarium.position.set(0, 0, -25);
scene.add(planetarium);

const planetFloorTex = corridorWallColorMap;
const planetFloorGeo = new THREE.PlaneGeometry(40, 30);
const planetFloorMat = new THREE.MeshStandardMaterial({ map: planetFloorTex });
const planetFloor = new THREE.Mesh(planetFloorGeo, planetFloorMat);
planetFloor.rotation.x = -Math.PI / 2;
planetFloor.position.z = -15;
planetFloor.receiveShadow = true;
planetarium.add(planetFloor);

const planetWallMat = corridorWallMat.clone();
const planetSideGeo = new THREE.PlaneGeometry(30, 10);
const planetBackGeo = new THREE.PlaneGeometry(40, 10);

const planetBackWall = new THREE.Mesh(planetBackGeo, planetWallMat);
planetBackWall.rotation.y = Math.PI;
planetBackWall.position.set(0, 5, -30);
planetBackWall.castShadow = true;
planetBackWall.receiveShadow = true;
planetarium.add(planetBackWall);

const planetLeftWall = new THREE.Mesh(planetSideGeo, planetWallMat);
planetLeftWall.rotation.y = Math.PI / 2;
planetLeftWall.position.set(-20, 5, -15);
planetLeftWall.castShadow = true;
planetLeftWall.receiveShadow = true;
planetarium.add(planetLeftWall);

const planetRightWall = new THREE.Mesh(planetSideGeo, planetWallMat);
planetRightWall.rotation.y = -Math.PI / 2;
planetRightWall.position.set(20, 5, -15);
planetRightWall.castShadow = true;
planetRightWall.receiveShadow = true;
planetarium.add(planetRightWall);

const domeRadius = 20;
const domeGeo = new THREE.SphereGeometry(domeRadius, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
const domeMatInside = new THREE.MeshBasicMaterial({
  map: scene.environment,
  side: THREE.BackSide
});
const domeInside = new THREE.Mesh(domeGeo, domeMatInside);
domeInside.position.set(0, 10, -15);
planetarium.add(domeInside);

const pointLight = new THREE.PointLight(0xffffff, guiParams.planetLightIntensity);
pointLight.position.set(0, 5, -15);
pointLight.castShadow = true;
planetarium.add(pointLight);

gui.add(guiParams, 'planetLightIntensity', 0, 2).name('Planet Light')
   .onChange(v => { pointLight.intensity = v; });

// ===========================
// SISTEMA SOLARE
// ===========================
const solarSystem = new THREE.Group();
solarSystem.position.set(0, 2, -15);
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
  planetMesh.position.x = data.distance;
  planetMesh.name = data.name;
  orbitGroup.add(planetMesh);

  orbitGroup.userData = {
    revolutionSpeed: data.revolutionSpeed,
    planetMesh: planetMesh,
    rotationSpeed: data.rotationSpeed
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
    moonOrbit.userData = { revolutionSpeed: 0.05 };
    moon.position.x = 1.2;
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
  const objectsToCheck = [doorPivot, ...clickablePlanets, apolloPanel, sputnikPanel];
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

  planetGroups.forEach(g => {
    g.rotation.y += g.userData.revolutionSpeed;
    g.userData.planetMesh.rotation.y += g.userData.rotationSpeed;
  });
  moonOrbits.forEach(m => {
    m.rotation.y += m.userData.revolutionSpeed;
  });

  animateDoor();
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ===========================
// RESIZE
// ===========================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});