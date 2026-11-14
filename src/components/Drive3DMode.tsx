import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Shield,
  Star,
  Zap,
} from 'lucide-react';
import {VEHICLE_TRIMS} from '../data/chapters';
import {useGameProgress} from '../context/GameProgressContext';
import {audioEngine} from '../utils/audio';
import {TouchControls, TouchInputVector} from './TouchControls';

type CameraPreset = 'chase' | 'hood' | 'orbit';

interface HudSnapshot {
  speedKmh: number;
  score: number;
  shield: number;
  boost: number;
  wantedStars: number;
  sector: string;
  gameOver: boolean;
}

const _vecA = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function createRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0D111A';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  ctx.fillStyle = '#151B29';
  for (let i = 0; i < 600; i++) {
    const rx = (i * 73) % 512;
    const ry = (i * 137) % 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Cyan outer lane borders
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(14, 0, 8, 512);
  ctx.fillRect(490, 0, 8, 512);

  // Center dashed Vegas amber lines
  ctx.fillStyle = '#F59E0B';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(252, y + 10, 8, 36);
  }

  // Inner lane dividers
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(136, y + 16, 4, 28);
    ctx.fillRect(372, y + 16, 4, 28);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function buildHoverInterceptor(primaryHex: string, accentHex: string): {
  group: THREE.Group;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
} {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(primaryHex),
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 0.9,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2942,
    metalness: 0.1,
    roughness: 0.08,
    transparent: true,
    opacity: 0.78,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 1.6,
    metalness: 0.4,
    roughness: 0.3,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.48,
  });

  // 1. Primary sculpted fuselage (extruded wedge)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.05, -2.1);
  hullShape.lineTo(1.05, -2.1);
  hullShape.lineTo(0.85, 2.0);
  hullShape.lineTo(0.4, 2.35);
  hullShape.lineTo(-0.4, 2.35);
  hullShape.lineTo(-0.85, 2.0);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.46,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, 0.78, 0);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  group.add(hull);

  // 2. Cockpit canopy
  const canopyGeo = new THREE.BoxGeometry(1.12, 0.38, 1.85);
  const canopy = new THREE.Mesh(canopyGeo, glassMat);
  canopy.position.set(0, 0.96, 0.15);
  group.add(canopy);

  // 3. Front aero splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.45), darkTrimMat);
  splitter.position.set(0, 0.42, -2.18);
  group.add(splitter);

  // 4. Rear wing / stabilizer bar
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.42), darkTrimMat);
  spoiler.position.set(0, 1.15, 1.88);
  group.add(spoiler);

  // 5-6. Side hover pods
  const podGeo = new THREE.BoxGeometry(0.28, 0.28, 2.7);
  const leftPod = new THREE.Mesh(podGeo, darkTrimMat);
  leftPod.position.set(-1.12, 0.5, 0.1);
  const rightPod = new THREE.Mesh(podGeo, darkTrimMat);
  rightPod.position.set(1.12, 0.5, 0.1);
  group.add(leftPod, rightPod);

  // 7. Neon side underglow trim
  const stripGeo = new THREE.BoxGeometry(0.08, 0.08, 3.3);
  const leftStrip = new THREE.Mesh(stripGeo, accentMat);
  leftStrip.position.set(-1.26, 0.48, 0.05);
  const rightStrip = new THREE.Mesh(stripGeo, accentMat);
  rightStrip.position.set(1.26, 0.48, 0.05);
  group.add(leftStrip, rightStrip);

  // 8-9. Twin rear thruster cones
  const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.26, 0.4, 12);
  thrusterGeo.rotateX(Math.PI / 2);
  const thrusterLeft = new THREE.Mesh(thrusterGeo, accentMat);
  thrusterLeft.position.set(-0.55, 0.62, 2.22);
  const thrusterRight = new THREE.Mesh(thrusterGeo, accentMat);
  thrusterRight.position.set(0.55, 0.62, 2.22);
  group.add(thrusterLeft, thrusterRight);

  // 10. Headlight bar
  const headlightBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.09, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
    }),
  );
  headlightBar.position.set(0, 0.62, -2.32);
  group.add(headlightBar);

  return {group, thrusterLeft, thrusterRight};
}

export const Drive3DMode: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const {profile, addCredits, addRep, recordWantedStars, updateHighScore} = useGameProgress();

  const selectedTrim =
    VEHICLE_TRIMS.find((v) => v.id === profile.selectedVehicleId) ?? VEHICLE_TRIMS[0];

  const [hud, setHud] = useState<HudSnapshot>({
    speedKmh: 0,
    score: 0,
    shield: 100,
    boost: 100,
    wantedStars: 0,
    sector: 'Lumexus Tech Quad',
    gameOver: false,
  });
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('chase');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [runSeed, setRunSeed] = useState(0);

  const cameraPresetRef = useRef<CameraPreset>('chase');
  const keysRef = useRef<Record<string, boolean>>({});
  const touchRef = useRef<TouchInputVector>({
    x: 0,
    y: 0,
    primaryPressed: false,
    secondaryPressed: false,
  });

  const callbacksRef = useRef({
    addCredits,
    addRep,
    recordWantedStars,
    updateHighScore,
  });
  callbacksRef.current = {addCredits, addRep, recordWantedStars, updateHighScore};

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
      if (e.code === 'KeyC') {
        setCameraPreset((prev) =>
          prev === 'chase' ? 'hood' : prev === 'hood' ? 'orbit' : 'chase',
        );
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 500);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const handleContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070912);
    scene.fog = new THREE.FogExp2(0x070912, 0.0085);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || 800) / (container.clientHeight || 500),
      0.1,
      360,
    );

    // 3-point lighting rig
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.5);
    keyLight.position.set(18, 32, 16);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -35;
      keyLight.shadow.camera.right = 35;
      keyLight.shadow.camera.top = 35;
      keyLight.shadow.camera.bottom = -35;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xec4899, 0.9);
    rimLight.position.set(-20, 14, -28);
    scene.add(rimLight);

    // Ground & Road
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const roadTex = createRoadTexture(maxAniso);
    const roadGeo = new THREE.PlaneGeometry(24, 600);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.55,
      metalness: 0.25,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x06080f,
      roughness: 0.92,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(420, 600), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    scene.add(groundMesh);

    // Hero Vehicle
    const {
      group: playerCar,
      thrusterLeft,
      thrusterRight,
    } = buildHoverInterceptor(selectedTrim.primaryColor, selectedTrim.accentColor);
    playerCar.position.set(0, 0, 0);
    scene.add(playerCar);

    // Contact shadow grounding plane under player
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 24),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.02;
    playerCar.add(shadowDisc);

    // Scenery towers & Campus/Vegas neon arches (pooled along Z)
    const sceneryGroup = new THREE.Group();
    scene.add(sceneryGroup);

    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMats = [
      new THREE.MeshStandardMaterial({color: 0x0f172a, roughness: 0.4, metalness: 0.6}),
      new THREE.MeshStandardMaterial({color: 0x1e1b4b, roughness: 0.35, metalness: 0.65}),
    ];
    const neonMats = [
      new THREE.MeshStandardMaterial({color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.8}),
      new THREE.MeshStandardMaterial({color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 1.8}),
      new THREE.MeshStandardMaterial({color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.5}),
    ];

    const blocks: THREE.Group[] = [];
    for (let i = 0; i < 24; i++) {
      const z = -i * 22;
      const pair = new THREE.Group();
      [-1, 1].forEach((side) => {
        const bGroup = new THREE.Group();
        const h = 12 + ((i * 7 + (side > 0 ? 5 : 2)) % 22);
        const w = 6 + (i % 4);
        const d = 8 + (i % 3);
        const bMesh = new THREE.Mesh(buildingGeo, buildingMats[i % 2]);
        bMesh.scale.set(w, h, d);
        bMesh.position.y = h / 2;
        bGroup.add(bMesh);

        const trimMesh = new THREE.Mesh(buildingGeo, neonMats[(i + (side > 0 ? 1 : 0)) % 3]);
        trimMesh.scale.set(w + 0.15, 0.35, d + 0.15);
        trimMesh.position.y = h - 1.5;
        bGroup.add(trimMesh);

        bGroup.position.set(side * (16 + w * 0.5), 0, 0);
        pair.add(bGroup);
      });

      // Every 4th block add a glowing Campus / Vegas Arch
      if (i % 4 === 0) {
        const arch = new THREE.Group();
        const pillarGeo = new THREE.BoxGeometry(0.8, 10, 0.8);
        const pL = new THREE.Mesh(pillarGeo, buildingMats[0]);
        pL.position.set(-12.5, 5, 0);
        const pR = new THREE.Mesh(pillarGeo, buildingMats[0]);
        pR.position.set(12.5, 5, 0);
        const cross = new THREE.Mesh(
          new THREE.BoxGeometry(25.8, 0.7, 0.9),
          neonMats[i % 3],
        );
        cross.position.set(0, 10, 0);
        arch.add(pL, pR, cross);
        pair.add(arch);
      }

      pair.position.z = z;
      sceneryGroup.add(pair);
      blocks.push(pair);
    }

    // Collectible Tuition Shards
    const shardGeo = new THREE.OctahedronGeometry(0.68, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.2,
    });
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(shardGeo, shardMat);
      m.position.set(((i % 3) - 1) * 5.2, 1.15, -30 - i * 24);
      scene.add(m);
      shards.push(m);
    }

    // Traffic & Security Hover-Patrols (composite 3-part groups)
    interface TrafficUnit {
      group: THREE.Group;
      isPolice: boolean;
      speed: number;
      laneX: number;
    }
    const traffic: TrafficUnit[] = [];
    const trafficBodyGeo = new THREE.BoxGeometry(2.1, 0.65, 4.1);
    const trafficCabGeo = new THREE.BoxGeometry(1.4, 0.42, 1.9);
    const sirenGeo = new THREE.BoxGeometry(0.9, 0.2, 0.35);

    for (let i = 0; i < 9; i++) {
      const isPolice = i % 3 === 0;
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        trafficBodyGeo,
        new THREE.MeshStandardMaterial({
          color: isPolice ? 0x0f172a : 0x334155,
          metalness: 0.75,
          roughness: 0.3,
        }),
      );
      body.position.y = 0.65;
      const cab = new THREE.Mesh(
        trafficCabGeo,
        new THREE.MeshStandardMaterial({color: 0x090d16, roughness: 0.15, metalness: 0.3}),
      );
      cab.position.set(0, 1.1, 0.1);
      const bar = new THREE.Mesh(
        sirenGeo,
        new THREE.MeshStandardMaterial({
          color: isPolice ? 0xef4444 : 0xec4899,
          emissive: isPolice ? 0xef4444 : 0xec4899,
          emissiveIntensity: 1.8,
        }),
      );
      bar.position.set(0, 1.38, 0.1);
      g.add(body, cab, bar);

      const laneX = ((i % 3) - 1) * 5.4;
      g.position.set(laneX, 0, -45 - i * 32);
      scene.add(g);
      traffic.push({
        group: g,
        isPolice,
        speed: isPolice ? 22 : 16,
        laneX,
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Mutable simulation state (zero React state churn inside tight physics)
    let playerX = 0;
    let speed = 28;
    const baseMaxSpeed = 62 + selectedTrim.topSpeedBonus * 0.45;
    let boost = 100;
    let shield = 100;
    let score = 0;
    let distance = 0;
    let wantedStars = 0;
    let gameOver = false;
    let orbitAngle = 0;
    let lastHudSync = 0;
    let hitCooldown = 0;

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const syncHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudSync < 90) return;
      lastHudSync = now;
      const sector =
        Math.floor(distance / 320) % 2 === 0
          ? 'Lumexus Tech Quad'
          : 'Crazy E Vegas Strip';
      setHud({
        speedKmh: Math.round(speed * 3.4),
        score: Math.floor(score),
        shield: Math.max(0, Math.round(shield)),
        boost: Math.round(boost),
        wantedStars,
        sector,
        gameOver,
      });
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (!gameOver) {
        const keys = keysRef.current;
        const touch = touchRef.current;

        const steerInput =
          (keys['ArrowRight'] || keys['KeyD'] ? 1 : 0) -
          (keys['ArrowLeft'] || keys['KeyA'] ? 1 : 0) +
          touch.x;
        const clampedSteer = THREE.MathUtils.clamp(steerInput, -1, 1);

        const accelInput =
          keys['ArrowUp'] || keys['KeyW'] || touch.y < -0.2 ? 1 : 0;
        const brakeInput =
          keys['ArrowDown'] || keys['KeyS'] || touch.y > 0.35 || touch.secondaryPressed
            ? 1
            : 0;
        const boosting =
          (keys['Space'] || keys['ShiftLeft'] || touch.primaryPressed) && boost > 4;

        if (boosting) {
          boost = Math.max(0, boost - dt * 34);
          if (Math.random() < 0.08) audioEngine.playNitro();
        } else {
          boost = Math.min(100, boost + dt * 14);
        }

        const targetMax = boosting ? baseMaxSpeed * 1.38 : baseMaxSpeed;
        if (accelInput > 0 || boosting) {
          speed = THREE.MathUtils.damp(speed, targetMax, 2.8, dt);
        } else if (brakeInput > 0) {
          speed = THREE.MathUtils.damp(speed, 10, 4.5, dt);
        } else {
          speed = THREE.MathUtils.damp(speed, baseMaxSpeed * 0.56, 1.5, dt);
        }

        playerX += clampedSteer * dt * 16.5;
        playerX = THREE.MathUtils.clamp(playerX, -9.2, 9.2);

        // Hover bob + bank roll
        playerCar.position.x = playerX;
        playerCar.position.y = Math.sin(elapsed * 5) * 0.06;
        playerCar.rotation.z = THREE.MathUtils.damp(
          playerCar.rotation.z,
          -clampedSteer * 0.18,
          8,
          dt,
        );
        playerCar.rotation.y = THREE.MathUtils.damp(
          playerCar.rotation.y,
          -clampedSteer * 0.09,
          8,
          dt,
        );

        const thrusterScale = boosting ? 1.55 : 0.95 + (speed / baseMaxSpeed) * 0.3;
        thrusterLeft.scale.set(1, 1, thrusterScale);
        thrusterRight.scale.set(1, 1, thrusterScale);

        const travel = speed * dt;
        distance += travel;
        score += travel * (1 + wantedStars * 0.35);
        roadTex.offset.y -= travel * 0.04;

        // Scroll scenery blocks
        blocks.forEach((b) => {
          b.position.z += travel;
          if (b.position.z > 28) {
            b.position.z -= 24 * 22;
          }
        });

        // Collect shards
        shards.forEach((s) => {
          s.position.z += travel;
          s.rotation.y += dt * 2.5;
          if (
            Math.abs(s.position.z) < 2.2 &&
            Math.abs(s.position.x - playerX) < 2.1
          ) {
            audioEngine.playPickup();
            score += 120;
            callbacksRef.current.addCredits(45);
            callbacksRef.current.addRep(15);
            s.position.z -= 280;
            s.position.x = (Math.floor(Math.random() * 3) - 1) * 5.2;
          } else if (s.position.z > 16) {
            s.position.z -= 280;
          }
        });

        // Traffic collision & Wanted Stars
        if (hitCooldown > 0) hitCooldown -= dt;
        traffic.forEach((unit) => {
          unit.group.position.z += (travel - unit.speed) * (unit.isPolice ? 0.65 : 0.72);
          if (
            hitCooldown <= 0 &&
            Math.abs(unit.group.position.z) < 3.1 &&
            Math.abs(unit.group.position.x - playerX) < 2.15
          ) {
            hitCooldown = 0.8;
            shield -= unit.isPolice ? 28 : 20;
            speed *= 0.45;
            wantedStars = Math.min(5, wantedStars + 1);
            callbacksRef.current.recordWantedStars(wantedStars);
            audioEngine.playHit();
            if (wantedStars >= 2) audioEngine.playSirenBlip();
            unit.group.position.z -= 180;
            if (shield <= 0) {
              shield = 0;
              gameOver = true;
              const finalScore = Math.floor(score);
              callbacksRef.current.updateHighScore('drive3d', finalScore);
              callbacksRef.current.addCredits(Math.floor(finalScore / 15));
              syncHud(true);
            }
          }
          if (unit.group.position.z > 24) {
            unit.group.position.z -= 280;
            unit.group.position.x = (Math.floor(Math.random() * 3) - 1) * 5.4;
          }
        });

        // Camera choreography
        const preset = cameraPresetRef.current;
        const targetFov = boosting ? 79 : 66 + (speed / baseMaxSpeed) * 7;
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4, dt);
        camera.updateProjectionMatrix();

        if (preset === 'chase') {
          _vecA.set(playerX * 0.72, 3.6, 8.2);
          camera.position.lerp(_vecA, 1 - Math.exp(-7 * dt));
          _camTarget.set(playerX * 0.45, 1.1, -12);
          camera.lookAt(_camTarget);
        } else if (preset === 'hood') {
          _vecA.set(playerX, 1.38, -0.5);
          camera.position.lerp(_vecA, 1 - Math.exp(-14 * dt));
          _camTarget.set(playerX * 0.9, 1.0, -24);
          camera.lookAt(_camTarget);
        } else {
          orbitAngle += dt * 0.65;
          _vecA.set(
            playerX + Math.sin(orbitAngle) * 7.5,
            3.2,
            Math.cos(orbitAngle) * 7.5,
          );
          camera.position.lerp(_vecA, 1 - Math.exp(-5 * dt));
          _camTarget.set(playerX, 0.8, 0);
          camera.lookAt(_camTarget);
        }

        syncHud(false);
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
      roadTex.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, [selectedTrim.accentColor, selectedTrim.primaryColor, selectedTrim.topSpeedBonus, runSeed]);

  const showTouchControls =
    profile.settings.touchControlsMode === 'always' ||
    (profile.settings.touchControlsMode === 'auto' &&
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-[#070912]">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="h-full w-full" />

      {webglError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090B10] p-6 text-center">
          <p className="font-display text-xl font-bold text-white">
            3D WebGL Context Interrupted
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Your device suspended WebGL acceleration. Reload the 3D engine or switch to 2D Campus
            Open World.
          </p>
          <button
            type="button"
            onClick={() => {
              setWebglError(false);
              setRunSeed((s) => s + 1);
            }}
            className="mt-4 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 cursor-pointer"
          >
            Reload 3D Viewport
          </button>
        </div>
      )}

      {/* Minimal Top HUD (No backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#090B10]/85 px-4 py-2.5">
          <p className="text-[11px] font-medium text-cyan-400">
            {hud.sector} · {selectedTrim.name}
          </p>
          <div className="mt-1 flex items-center gap-4 text-xs text-slate-200">
            <span className="font-mono-tabular font-bold text-white">
              {hud.speedKmh} km/h
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-amber-400">
              Score {hud.score.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#090B10]/85 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="font-mono-tabular font-semibold text-white">
              {hud.shield}%
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="h-4 w-4 text-pink-400" />
            <span className="font-mono-tabular font-semibold text-white">
              {hud.boost}%
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <div className="flex items-center gap-0.5" aria-label={`Wanted level ${hud.wantedStars}`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${
                  star <= hud.wantedStars
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex flex-col items-center px-4">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#090B10]/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show Controls (H)
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Hide Controls (H)
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#090B10]/90 px-4 py-2.5 text-xs shadow-2xl">
            <span className="hidden text-slate-400 sm:inline">
              WASD / Arrows Steer · Space Nitro · C Camera
            </span>
            <span className="hidden text-slate-600 sm:inline">·</span>
            <div className="flex items-center gap-1">
              {(['chase', 'hood', 'orbit'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors cursor-pointer ${
                    cameraPreset === preset
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRunSeed((s) => s + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
          </div>
        )}
      </div>

      {/* Mobile Dual-Thumb Touch Controls */}
      <TouchControls
        visible={showTouchControls && !hud.gameOver}
        primaryLabel="NITRO"
        secondaryLabel="BRAKE"
        onInputChange={(vec) => {
          touchRef.current = vec;
        }}
      />

      {/* Wrecked / Run Summary Overlay */}
      {hud.gameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#10141D] p-6 text-center shadow-2xl">
            <p className="text-xs font-semibold text-pink-400">Interceptor Shield Depleted</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Run Complete</h2>
            <p className="mt-2 font-mono-tabular text-lg text-amber-400">
              Final Score: {hud.score.toLocaleString()} · +${Math.floor(hud.score / 15)} Credits
            </p>
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setRunSeed((s) => s + 1);
                setHud({
                  speedKmh: 0,
                  score: 0,
                  shield: 100,
                  boost: 100,
                  wantedStars: 0,
                  sector: 'Lumexus Tech Quad',
                  gameOver: false,
                });
              }}
              className="mt-6 w-full rounded-lg bg-cyan-500 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
