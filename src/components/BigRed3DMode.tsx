import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {TouchControls, TouchInputVector} from './TouchControls';
import {useGameProgress} from '../context/GameProgressContext';

const SAVE_KEY = 'gta20_big_red_3d_missions_v1';
const GOALS = [
  {title: 'Walk to Neon Gate', x: 14, z: -8, hint: 'Find the cyan checkpoint on foot'},
  {title: 'Get Behind the Wheel', x: 5, z: 5, hint: 'Find the red car and tap ENTER RIDE'},
  {title: 'Race to Strip Plaza', x: 42, z: -7, hint: 'Drive to the glowing checkpoint'},
  {title: 'Explore Night Market', x: -35, z: 35, hint: 'Navigate across the open city'},
  {title: 'Return to Big Red Tower', x: -5, z: 35, hint: 'Finish at the red-lit tower'},
] as const;

export interface AfterDarkWaypoint {
  id: string;
  title: string;
  x: number;
  z: number;
  onArrive: () => void;
}

interface Hud {
  mission: number;
  speed: number;
  driving: boolean;
  distance: number;
}

const neutral = (): TouchInputVector => ({
  x: 0, y: 0, primaryPressed: false, secondaryPressed: false,
});

function signSprite(text: string, tint = '#ff485e'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(2, 6, 20, .87)';
  ctx.fillRect(8, 8, 496, 112);
  ctx.strokeStyle = tint;
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.font = '900 64px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 65);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
  }));
  sprite.scale.set(13, 3.25, 1);
  return sprite;
}

function makeBigRed(): {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  hairLocks: THREE.Group[];
} {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({color: 0xc4152d, metalness: .46, roughness: .3});
  const leather = new THREE.MeshPhysicalMaterial({color: 0x0b0e18, metalness: .3,
    roughness: .21, clearcoat: .86, clearcoatRoughness: .15});
  const dark = new THREE.MeshStandardMaterial({color: 0x101829, metalness: .55, roughness: .34});
  const skin = new THREE.MeshStandardMaterial({color: 0xe8ae91, roughness: .86, metalness: 0});
  const copperHair = new THREE.MeshStandardMaterial({color: 0xe63e19, roughness: .38, metalness: .12});
  const hairShadow = new THREE.MeshStandardMaterial({color: 0x9c210d, roughness: .52});
  const eyes = new THREE.MeshStandardMaterial({color: 0x11243c, roughness: .3});
  const trim = new THREE.MeshStandardMaterial({
    color: 0x45eaff, emissive: 0x06a8ca, emissiveIntensity: .95, metalness: .45,
  });
  const addBox = (parent: THREE.Object3D, color: THREE.Material, w: number, h: number, d: number,
    x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Inspired by the supplied Dunar Wireless redhead: black leather, copper hair, athletic silhouette.
  // This is a stylized procedural character, not a photogrammetry scan.
  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(.47, .31, .96, 16), leather);
  jacket.position.y = 1.7;
  jacket.castShadow = true;
  group.add(jacket);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), dark);
  hips.scale.set(1.05, .45, .8);
  hips.position.y = 1.15;
  group.add(hips);
  addBox(group, dark, .75, .16, .57, 0, 1.19, 0);
  addBox(group, red, .075, .79, .075, -.15, 1.73, -.405);
  addBox(group, red, .075, .79, .075, .15, 1.73, -.405);
  addBox(group, trim, .24, .065, .08, 0, 1.85, -.441);
  // Leather lapels have contrasting angled edges.
  for (const side of [-1, 1]) {
    const lapel = addBox(group, leather, .24, .56, .09, side * .23, 1.97, -.42);
    lapel.rotation.z = side * .27;
    addBox(group, red, .035, .35, .07, side * .29, 1.98, -.47);
  }
  const belt = addBox(group, leather, .83, .17, .62, 0, 1.12, 0);
  belt.castShadow = true;
  addBox(group, trim, .23, .13, .07, 0, 1.13, -.36);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.17, .2, .22, 10), skin);
  neck.position.y = 2.23;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 18, 12), skin);
  head.position.set(0, 2.57, -.05);
  head.scale.set(1, 1.09, .95);
  head.castShadow = true;
  group.add(head);
  // Big Red has human facial features and thick copper hair, not a red metal helmet.
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.375, 20, 12), copperHair);
  crown.position.set(0, 2.78, -.028);
  crown.scale.set(1.06, .71, 1.04);
  crown.castShadow = true;
  group.add(crown);
  const part = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 8), hairShadow);
  part.position.set(.08, 2.97, -.27);
  part.scale.set(1.55, .35, .5);
  group.add(part);
  for (const side of [-1, 1]) {
    const sweep = new THREE.Mesh(new THREE.CapsuleGeometry(.105, .56, 4, 8), copperHair);
    sweep.position.set(side * .31, 2.38, -.10);
    sweep.rotation.z = side * .15;
    sweep.castShadow = true;
    group.add(sweep);
    for (let strand = 0; strand < 3; strand++) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(.064, .48 + strand * .14, 4, 7),
        strand === 1 ? hairShadow : copperHair);
      lock.position.set(side * (.37 + strand * .04), 2.18 - strand * .08, .02 + strand * .115);
      lock.rotation.z = side * (.1 + strand * .045);
      group.add(lock);
    }
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .035), hairShadow);
    brow.position.set(side * .14, 2.675, -.361);
    group.add(brow);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.047, 8, 8), eyes);
    eye.position.set(side * .14, 2.59, -.372);
    group.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.047, 8, 8), skin);
  nose.position.set(0, 2.50, -.395);
  group.add(nose);
  const lips = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .025),
    new THREE.MeshStandardMaterial({color: 0x9a4855, roughness: .8}));
  lips.position.set(0, 2.40, -.369);
  group.add(lips);
  addBox(group, trim, .59, .09, .07, 0, 1.88, -.313);
  // Twelve independent corkscrew hair strands trail over the shoulders.
  const hairLocks: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const curlRoot = new THREE.Group();
      curlRoot.position.set(side * (.22 + i * .032), 2.82 - i * .017, -.02 + i * .052);
      const length = .68 + (i % 3) * .17;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 13; j++) {
        const t = j / 13;
        const spiral = Math.sin(t * Math.PI * (2.6 + i * .12) + i * .7);
        points.push(new THREE.Vector3(side * (.075 + t * .12) + spiral * .042,
          -t * length, Math.cos(t * Math.PI * 4 + i) * .055 + t * .025));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const lock = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .055 + i * .003, 6, false),
        i % 3 === 0 ? hairShadow : copperHair);
      lock.castShadow = true;
      curlRoot.add(lock);
      group.add(curlRoot);
      hairLocks.push(curlRoot);
    }
  }
  const leftArm = new THREE.Group(), rightArm = new THREE.Group();
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    arm.position.set(side * .66, 2.02, 0);
    addBox(arm, leather, .35, .78, .41, 0, -.38, 0);
    addBox(arm, dark, .34, .26, .35, 0, -.87, 0);
    addBox(arm, red, .06, .62, .08, side * .16, -.35, -.23);
    addBox(arm, trim, .37, .07, .08, 0, -.61, -.23);
    group.add(arm);
  }
  const leftLeg = new THREE.Group(), rightLeg = new THREE.Group();
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]] as const) {
    leg.position.set(side * .26, 1.13, 0);
    addBox(leg, dark, .41, 1.0, .45, 0, -.51, 0);
    addBox(leg, leather, .47, .28, .65, 0, -1.0, -.12);
    addBox(leg, red, .08, .22, .1, side * .16, -1.0, -.45);
    group.add(leg);
  }
  return {group, leftArm, rightArm, leftLeg, rightLeg, hairLocks};
}

function makeCar(): THREE.Group {
  const car = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({
    color: 0xd31437, metalness: .82, roughness: .18,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0b2638, metalness: .54, roughness: .14, transparent: true, opacity: .86,
  });
  const black = new THREE.MeshStandardMaterial({color: 0x0a0c12, roughness: .67});
  const light = new THREE.MeshStandardMaterial({
    color: 0xc5ffff, emissive: 0x37dcff, emissiveIntensity: 2,
  });
  const box = (w: number, h: number, d: number, material: THREE.Material,
    x: number, y: number, z: number) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    o.position.set(x, y, z);
    o.castShadow = true;
    car.add(o);
  };
  box(2.5, .55, 4.3, red, 0, .72, 0);
  box(1.8, .53, 2.25, glass, 0, 1.25, .14);
  box(2.43, .11, .22, light, 0, .76, -2.13);
  box(2.25, .1, .15, red, 0, 1.08, 1.98);
  for (const x of [-1.15, 1.15]) {
    for (const z of [-1.36, 1.36]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.53, .53, .29, 14), black);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, .53, z);
      car.add(wheel);
    }
  }
  return car;
}

export function BigRed3DMode({afterDark}: {
  afterDark?: {waypoint?: AfterDarkWaypoint; paused: boolean; status: string};
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const touchRef = useRef<TouchInputVector>(neutral());
  const actionRef = useRef(false);
  const photoRef = useRef<(() => void) | null>(null);
  const frontViewRef = useRef(false);
  const [frontView, setFrontView] = useState(false);
  const toggleView = () => {frontViewRef.current = !frontViewRef.current; setFrontView(frontViewRef.current);};
  const [restartSeed, restart] = useState(0);
  const [error, setError] = useState('');
  const [hud, setHud] = useState<Hud>({mission: 0, speed: 0, driving: false, distance: 0});
  const {addCredits, addRep} = useGameProgress();
  const afterDarkRef = useRef(afterDark);
  const [nightDistance, setNightDistance] = useState<number | null>(null);
  // Keep scene state intact as narrative contacts or briefing visibility change.
  useEffect(() => { afterDarkRef.current = afterDark; }, [afterDark]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
    } catch {
      setError('3D graphics are unavailable in this browser. Enable hardware acceleration or use Android Chrome.');
      return;
    }
    setError('');
    const mobile = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.6));
    renderer.setSize(host.clientWidth || 320, host.clientHeight || 550);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    host.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030715);
    scene.fog = new THREE.FogExp2(0x030715, .008);
    const camera = new THREE.PerspectiveCamera(65, 1, .1, 380);
    photoRef.current = () => {
      // Render the actual 3D world in 9:16, rather than enlarging a screenshot.
      // A dedicated render target avoids relying on preserveDrawingBuffer.
      const width = 1080, height = 1920;
      const oldTarget = renderer.getRenderTarget();
      const oldAspect = camera.aspect;
      const target = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
        depthBuffer: true, stencilBuffer: false,
      });
      try {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        const bottomUp = new Uint8Array(width * height * 4);
        renderer.readRenderTargetPixels(target, 0, 0, width, height, bottomUp);
        const output = document.createElement('canvas');
        output.width = width;
        output.height = height;
        const ctx = output.getContext('2d');
        if (!ctx) throw new Error('2D canvas unavailable for PNG encoding');
        const frame = ctx.createImageData(width, height);
        const stride = width * 4;
        for (let y = 0; y < height; y++) {
          const from = (height - 1 - y) * stride;
          frame.data.set(bottomUp.subarray(from, from + stride), y * stride);
        }
        ctx.putImageData(frame, 0, 0);
        const link = document.createElement('a');
        link.href = output.toDataURL('image/png');
        link.download = 'GTA20_BigRed3D_1080x1920_' + Date.now() + '.png';
        link.click();
      } catch (err) {
        console.error('Big Red 1080x1920 capture failed', err);
      } finally {
        renderer.setRenderTarget(oldTarget);
        camera.aspect = oldAspect;
        camera.updateProjectionMatrix();
        target.dispose();
      }
    };
    scene.add(new THREE.HemisphereLight(0x95cbff, 0x1b0f20, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-30, 70, -40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -85;
    sun.shadow.camera.right = 85;
    sun.shadow.camera.top = 85;
    sun.shadow.camera.bottom = -85;
    scene.add(sun);
    const neon1 = new THREE.PointLight(0x19e1ff, 130, 65);
    neon1.position.set(13, 9, -13);
    scene.add(neon1);
    const neon2 = new THREE.PointLight(0xff275c, 180, 70);
    neon2.position.set(-5, 18, 35);
    scene.add(neon2);

    const asphalt = new THREE.MeshStandardMaterial({color: 0x141926, roughness: .95});
    const sidewalk = new THREE.MeshStandardMaterial({color: 0x222b38, roughness: .89});
    const lane = new THREE.MeshBasicMaterial({color: 0x37dfff});
    const pink = new THREE.MeshStandardMaterial({
      color: 0x5b1435, emissive: 0xff174f, emissiveIntensity: .85,
    });
    const cyan = new THREE.MeshStandardMaterial({
      color: 0x0c4560, emissive: 0x06ceff, emissiveIntensity: .65,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), asphalt);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const roadA = new THREE.Mesh(new THREE.PlaneGeometry(16, 280), sidewalk);
    roadA.rotation.x = -Math.PI / 2; roadA.position.y = .012;
    scene.add(roadA);
    const roadB = new THREE.Mesh(new THREE.PlaneGeometry(280, 16), sidewalk);
    roadB.rotation.x = -Math.PI / 2; roadB.position.y = .016;
    scene.add(roadB);
    for (let i = -125; i < 130; i += 10) {
      for (const vertical of [true, false]) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? .18 : 3.2, vertical ? 3.2 : .18), lane);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(vertical ? 0 : i, .033, vertical ? i : 0);
        scene.add(stripe);
      }
    }
    // Seeded geometry creates the same city on repeat plays and on mobile.
    let seed = 2046;
    const random = () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};
    const buildingMats = [
      new THREE.MeshStandardMaterial({color: 0x10192b, metalness: .45, roughness: .65}),
      new THREE.MeshStandardMaterial({color: 0x1c1230, metalness: .47, roughness: .63}),
      new THREE.MeshStandardMaterial({color: 0x142432, metalness: .5, roughness: .58}),
    ];
    const obstacles: {x: number; z: number; rx: number; rz: number}[] = [];
    for (let x = -108; x <= 108; x += 18) {
      for (let z = -108; z <= 108; z += 18) {
        if (Math.abs(x) < 13 || Math.abs(z) < 13) continue;
        if (x === -36 && z === 36) continue;
        const height = 7 + Math.floor(random() * 25);
        const footprintW = 11 + random() * 2;
        const footprintD = 11 + random() * 2;
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(footprintW, height, footprintD),
          buildingMats[Math.floor(random() * buildingMats.length)]
        );
        obstacles.push({x, z, rx: footprintW / 2 + .15, rz: footprintD / 2 + .15});
        building.position.set(x, height / 2, z);
        building.receiveShadow = true;
        building.castShadow = true;
        scene.add(building);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(12.2, .18, 12.2), random() > .5 ? cyan : pink);
        glow.position.set(x, height - .4, z);
        scene.add(glow);
        for (let floor = 3; floor < height - 2; floor += 4) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(11.4, .12, .09), random() > .6 ? pink : cyan);
          strip.position.set(x, floor, z - 6.1);
          scene.add(strip);
        }
      }
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 7.5, 52, 10),
      new THREE.MeshStandardMaterial({color: 0x310d28, metalness: .67, roughness: .24}));
    tower.position.set(-5, 26, 49);
    scene.add(tower);
    obstacles.push({x: -5, z: 49, rx: 7.2, rz: 7.2});
    const isBlocked = (x: number, z: number, radius: number) =>
      obstacles.some(b => Math.abs(x - b.x) < b.rx + radius && Math.abs(z - b.z) < b.rz + radius);
    for (let h = 5; h < 53; h += 4) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.55 - h * .014, .12, 6, 24), pink);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-5, h, 49);
      scene.add(ring);
    }
    const sign = signSprite('BIG RED');
    sign.position.set(-5, 36, 42.5);
    scene.add(sign);
    const welcome = signSprite('LUMEXUS 2046', '#2eeaff');
    welcome.position.set(13, 12, -22);
    scene.add(welcome);

    // Procedural pedestrians use no additional downloads. Fewer draw calls on mobile.
    const crowd: {group: THREE.Group; axis: 'x' | 'z'; origin: number; speed: number; direction: number}[] = [];
    const coats = [
      new THREE.MeshStandardMaterial({color: 0x217ca6, roughness: .78}),
      new THREE.MeshStandardMaterial({color: 0x885aab, roughness: .78}),
      new THREE.MeshStandardMaterial({color: 0xb5a36d, roughness: .78}),
      new THREE.MeshStandardMaterial({color: 0x3b876f, roughness: .78}),
    ];
    const citizenSkin = new THREE.MeshStandardMaterial({color: 0xe4ae8c, roughness: .9});
    for (let i = 0; i < (mobile ? 12 : 26); i++) {
      const citizen = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .82, 4, 8), coats[i % coats.length]);
      torso.position.y = 1.05;
      citizen.add(torso);
      const face = new THREE.Mesh(new THREE.SphereGeometry(.245, 10, 8), citizenSkin);
      face.position.y = 1.91;
      citizen.add(face);
      const alongX = i % 2 === 0;
      const lane = i % 4 < 2 ? -10 : 10;
      citizen.position.set(alongX ? 0 : lane, 0, alongX ? lane : 0);
      scene.add(citizen);
      crowd.push({group: citizen, axis: alongX ? 'x' : 'z',
        origin: -97 + random() * 194, speed: 1.1 + random() * 2.3,
        direction: i % 3 === 0 ? -1 : 1});
    }

    const hero = makeBigRed();
    hero.group.position.set(-10, 0, -10);
    scene.add(hero.group);
    const car = makeCar();
    car.position.set(5, 0, 5);
    scene.add(car);
    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, .18, 10, 44),
      new THREE.MeshBasicMaterial({color: 0x32edff})
    );
    targetRing.rotation.x = Math.PI / 2;
    scene.add(targetRing);
    const targetBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(.7, .7, 13, 12, 1, true),
      new THREE.MeshBasicMaterial({color: 0x32edff, transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false})
    );
    scene.add(targetBeam);

    let mission = 0;
    try { mission = Math.max(0, Math.min(GOALS.length, Number(localStorage.getItem(SAVE_KEY)) || 0)); } catch {}
    let driving = false, speed = 0, heading = 0, walkTime = 0;
    const keys = new Set<string>();
    const player = new THREE.Vector3(-10, 0, -10);
    const desiredCamera = new THREE.Vector3();
    let orbit = 0, cameraPitch = .1;
    let pointer: number | null = null, lastX = 0, lastY = 0;
    let frame = 0, active = true, raf = 0, prior = performance.now();
    let lastNightWaypointId: string | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^(Key[WASDE]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight)$/.test(e.code)) e.preventDefault();
      keys.add(e.code);
      if (e.code === 'KeyE' && !e.repeat) actionRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => {keys.clear(); touchRef.current = neutral();};
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || pointer !== null) return;
      pointer = e.pointerId; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      orbit = Math.max(-2.3, Math.min(2.3, orbit - (e.clientX - lastX) * .006));
      cameraPitch = Math.max(-.2, Math.min(.7, cameraPitch + (e.clientY - lastY) * .003));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onRelease = (e: PointerEvent) => {if (e.pointerId === pointer) pointer = null;};
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onRelease);
    canvas.addEventListener('pointercancel', onRelease);
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const update = (timestamp: number) => {
      if (!active) return;
      raf = requestAnimationFrame(update);
      const dt = Math.min((timestamp - prior) / 1000, .04);
      prior = timestamp;
      if (afterDarkRef.current?.paused) {
        // Freeze controls under the modal, including keyboard presses.
        keys.clear();
        touchRef.current = neutral();
        return;
      }
      const t = touchRef.current;
      const vertical = Math.max(-1, Math.min(1,
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - t.y));
      const horizontal = Math.max(-1, Math.min(1,
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + t.x));
      const boost = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight') || t.primaryPressed;
      if (actionRef.current) {
        if (driving) {
          driving = false;
          player.copy(car.position).add(new THREE.Vector3(3.2, 0, 0));
          speed = 0;
        } else if (player.distanceTo(car.position) < 5) {
          driving = true; speed = 0;
          player.copy(car.position);
          heading = car.rotation.y;
        }
        actionRef.current = false;
      }
      const previousX = player.x, previousZ = player.z;
      if (driving) {
        const braking = t.secondaryPressed || keys.has('KeyB');
        const targetSpeed = braking ? 0 : vertical * (boost ? 28 : 15);
        speed = THREE.MathUtils.damp(speed, targetSpeed, braking ? 12 : vertical ? 3 : 1.8, dt);
        heading -= horizontal * dt * 1.75 * Math.max(.3, Math.min(1, Math.abs(speed) / 7));
        player.x -= Math.sin(heading) * speed * dt;
        player.z -= Math.cos(heading) * speed * dt;
        car.position.set(player.x, .04, player.z);
        car.rotation.y = heading;
        hero.group.visible = false;
      } else {
        speed = THREE.MathUtils.damp(speed, 0, 5, dt);
        heading -= horizontal * dt * 2.7;
        const pace = boost ? 9.5 : 5.3;
        player.x -= Math.sin(heading) * vertical * pace * dt;
        player.z -= Math.cos(heading) * vertical * pace * dt;
        hero.group.visible = true;
        hero.group.position.copy(player);
        hero.group.rotation.y = heading;
        const moving = Math.abs(vertical) > .05;
        walkTime += moving ? dt * (boost ? 15 : 10) : dt * 2;
        const wave = moving ? Math.sin(walkTime) * .42 : 0;
        hero.leftArm.rotation.x = wave;
        hero.rightArm.rotation.x = -wave;
        hero.leftLeg.rotation.x = -wave;
        hero.rightLeg.rotation.x = wave;
        hero.hairLocks.forEach((lock, i) => {
          lock.rotation.z = Math.sin(timestamp * .0035 + i * .8) * .045 + (moving ? Math.sin(walkTime + i) * .035 : 0);
          lock.rotation.x = Math.sin(timestamp * .0028 + i * .6) * .035;
        });
      }
      player.x = THREE.MathUtils.clamp(player.x, -115, 115);
      player.z = THREE.MathUtils.clamp(player.z, -115, 115);
      // Resolve each axis independently so the player can slide along walls.
      const attemptedX = player.x, attemptedZ = player.z;
      const clearance = driving ? 1.35 : .42;
      const xIsOpen = !isBlocked(attemptedX, previousZ, clearance);
      player.x = xIsOpen ? attemptedX : previousX;
      const zIsOpen = !isBlocked(player.x, attemptedZ, clearance);
      player.z = zIsOpen ? attemptedZ : previousZ;
      if (driving && !xIsOpen && !zIsOpen) speed *= -.15;
      if (driving) car.position.set(player.x, .04, player.z);
      else hero.group.position.copy(player);
      for (let i = 0; i < crowd.length; i++) {
        const p = crowd[i];
        const position = ((p.origin + timestamp * .001 * p.speed * p.direction + 105) % 210 + 210) % 210 - 105;
        p.group.position[p.axis] = position;
        p.group.position.y = Math.sin(timestamp * .008 + i) * .025;
        p.group.rotation.y = p.axis === 'x' ? (p.direction > 0 ? -Math.PI / 2 : Math.PI / 2)
          : (p.direction > 0 ? Math.PI : 0);
      }
      const nightMode = afterDarkRef.current;
      const nightWaypoint = nightMode?.waypoint;
      // After Dark has its own checkpoints, separate from the five standard missions.
      const goal = nightMode ? nightWaypoint : GOALS[mission];
      if (goal) {
        targetRing.visible = targetBeam.visible = true;
        (targetRing.material as THREE.MeshBasicMaterial).color.setHex(nightMode ? 0xfb7185 : 0x32edff);
        (targetBeam.material as THREE.MeshBasicMaterial).color.setHex(nightMode ? 0xfb7185 : 0x32edff);
        targetRing.position.set(goal.x, .22 + Math.sin(timestamp * .003) * .08, goal.z);
        targetBeam.position.set(goal.x, 6.5, goal.z);
        const distance = Math.hypot(player.x - goal.x, player.z - goal.z);
        if (nightWaypoint) {
          if (distance < 4.5 && lastNightWaypointId !== nightWaypoint.id) {
            lastNightWaypointId = nightWaypoint.id;
            nightWaypoint.onArrive();
          }
        } else if (!nightMode) {
          const permitted = mission === 0 ? !driving : mission === 1 ? driving : driving;
          if (distance < (mission === 1 ? 5 : 3.9) && permitted) {
            mission++;
            try { localStorage.setItem(SAVE_KEY, String(mission)); } catch {}
            addCredits(250); addRep(30);
          }
        }
      } else {
        targetRing.visible = targetBeam.visible = false;
      }
      // Stable chase camera with optional drag-to-orbit inspection.
      const a = heading + orbit;
      const front = frontViewRef.current;
      const sign = front ? -1 : 1;
      const dist = front ? (driving ? 8 : 5.2) : (driving ? 12 : 8.2);
      const focus = player.clone().add(new THREE.Vector3(0, driving ? 1.3 : 1.8, 0));
      desiredCamera.set(player.x + Math.sin(a) * dist * sign,
        (front ? 3 : (driving ? 5.5 : 4.2)) + cameraPitch * 6,
        player.z + Math.cos(a) * dist * sign);
      camera.position.lerp(desiredCamera, Math.min(1, dt * 5));
      camera.lookAt(focus);
      targetRing.rotation.z = timestamp * .0003;
      renderer.render(scene, camera);
      if (++frame % 10 === 0) {
        const map = minimapRef.current;
        const ctx = map?.getContext('2d');
        if (ctx) {
          const side = map!.width;
          const toMap = (coord: number) => (coord + 120) * side / 240;
          ctx.clearRect(0, 0, side, side);
          ctx.fillStyle = '#071426';
          ctx.fillRect(0, 0, side, side);
          ctx.fillStyle = '#193349';
          ctx.fillRect(toMap(-8), 0, toMap(8) - toMap(-8), side);
          ctx.fillRect(0, toMap(-8), side, toMap(8) - toMap(-8));
          ctx.fillStyle = '#406078';
          for (const building of obstacles) {
            ctx.fillRect(toMap(building.x - building.rx), toMap(building.z - building.rz),
              building.rx * 2 * side / 240, building.rz * 2 * side / 240);
          }
          const nextGoal = afterDarkRef.current ? afterDarkRef.current.waypoint : GOALS[mission];
          if (nextGoal) {
            ctx.strokeStyle = afterDarkRef.current ? '#fb7185' : '#2eeaff';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toMap(player.x), toMap(player.z));
            ctx.lineTo(toMap(nextGoal.x), toMap(nextGoal.z));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = afterDarkRef.current ? '#fb7185' : '#37e9ff';
            ctx.beginPath();
            ctx.arc(toMap(nextGoal.x), toMap(nextGoal.z), 5, 0, Math.PI * 2);
            ctx.fill();
          }
          if (!driving) {
            ctx.fillStyle = '#ff4d70';
            ctx.fillRect(toMap(car.position.x) - 3, toMap(car.position.z) - 4, 6, 8);
          }
          ctx.save();
          ctx.translate(toMap(player.x), toMap(player.z));
          ctx.rotate(-heading);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#f5225a';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(6, 8);
          ctx.lineTo(0, 5);
          ctx.lineTo(-6, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = 'rgba(55, 233, 255, .45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, side - 2, side - 2);
        }
        setNightDistance(nightWaypoint ? Math.round(Math.hypot(player.x - nightWaypoint.x, player.z - nightWaypoint.z)) : null);
        setHud({
          mission,
          speed: driving ? Math.round(Math.abs(speed) * 3.6) : Math.round(Math.abs(vertical) * (boost ? 9.5 : 5.3)),
          driving,
          distance: GOALS[mission] ? Math.round(Math.hypot(player.x - GOALS[mission].x, player.z - GOALS[mission].z)) : 0,
        });
      }
    };
    raf = requestAnimationFrame(update);
    return () => {
      active = false;
      photoRef.current = null;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onRelease);
      canvas.removeEventListener('pointercancel', onRelease);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite)) return;
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
        for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
          materials.add(material);
          const m = material as THREE.SpriteMaterial;
          if (m.map) textures.add(m.map);
        }
      });
      geometries.forEach(g => g.dispose());
      textures.forEach(t => t.dispose());
      materials.forEach(m => m.dispose());
      renderer.dispose();
      if (canvas.parentElement === host) host.removeChild(canvas);
    };
  }, [restartSeed, addCredits, addRep]);

  const resetRun = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    touchRef.current = neutral();
    actionRef.current = false;
    setHud({mission: 0, speed: 0, driving: false, distance: 0});
    restart(n => n + 1);
  };
  const goal = GOALS[hud.mission];
  const nightGoal = afterDark?.waypoint;
  return (
    <section className="relative isolate mx-auto h-[calc(100dvh-4rem)] min-h-[540px] w-full overflow-hidden bg-[#030715] text-white" aria-label="Playable Big Red 3D open world">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute right-3 top-44 z-10 overflow-hidden rounded-2xl border border-cyan-400/45 bg-[#071426]/90 p-1 shadow-lg sm:right-6 sm:top-24"
        aria-label="Live minimap showing player, streets, buildings and next mission">
        <canvas ref={minimapRef} width={160} height={160} className="block h-28 w-28 sm:h-36 sm:w-36" />
        <p className="px-1 pb-0.5 pt-1 text-center text-[10px] font-bold tracking-widest text-cyan-200">NEON CITY · GPS</p>
      </div>
      {error && <div role="alert" className="absolute inset-0 z-50 grid place-content-center bg-slate-950 p-8 text-center text-rose-300">{error}</div>}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2 sm:inset-x-6 sm:flex-row sm:justify-between">
        <div className="max-w-md rounded-2xl border border-white/20 bg-slate-950/75 p-3 backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">GTA 20 · Big Red 3D · Lumexus</p>
          <p className="mt-1 text-lg font-bold">{afterDark ? (nightGoal ? `After Dark: ${nightGoal.title}` : afterDark.status) : (goal ? `Mission ${hud.mission + 1}/5: ${goal.title}` : 'All five missions cleared!')}</p>
          <p className="text-xs text-slate-200">{afterDark ? (nightGoal ? `Follow the rose GPS marker · ${nightDistance ?? '...'} m` : 'Explore the city or open your midnight dossier.') : (goal ? `${goal.hint} · ${hud.distance} m` : 'Neon Run complete. Explore freely or restart.')}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="rounded-xl border border-white/20 bg-slate-950/75 px-4 py-2 text-right text-sm backdrop-blur-md">
            <div className="font-semibold text-rose-300">{hud.driving ? '🚗 DRIVING' : '🏃 ON FOOT'}</div>
            <div className="text-cyan-300">{hud.speed} {hud.driving ? 'km/h' : 'm/s'}</div>
          </div>
          <button type="button" onClick={resetRun} className="pointer-events-auto rounded-xl border border-white/30 bg-slate-950/90 px-4 py-3 text-xs font-semibold hover:bg-slate-800" aria-label="Restart all Big Red missions">Restart</button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-36 z-20 flex justify-center sm:bottom-6">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 p-2 text-xs shadow-2xl backdrop-blur-md">
          <button type="button" onClick={() => {actionRef.current = true;}}
            className="min-h-11 rounded-xl bg-rose-600 px-4 font-bold text-white hover:bg-rose-500">
            {hud.driving ? 'EXIT RIDE (E)' : 'ENTER RIDE (E)'}
          </button>
          <button type="button" onClick={toggleView}
            className="min-h-11 rounded-xl border border-rose-400/60 bg-rose-950/80 px-3 font-bold text-white hover:bg-rose-800"
            aria-pressed={frontView} aria-label="Toggle front-facing character camera">
            {frontView ? '🎥 CHASE' : '🎥 FRONT'}
          </button>
          <button type="button" onClick={() => photoRef.current?.()}
            className="min-h-11 rounded-xl border border-cyan-400/60 bg-cyan-900/70 px-3 font-bold text-white hover:bg-cyan-700"
            aria-label="Save a clean 3D gameplay screenshot">
            📸 PHOTO 9:16
          </button>
          <span className="hidden max-w-64 text-slate-200 sm:inline">WASD / arrows to move · Space to sprint or boost · drag scene to orbit</span>
        </div>
      </div>
      <TouchControls visible={!error} primaryLabel="RUN / BOOST" secondaryLabel="BRAKE"
        onInputChange={v => {touchRef.current = v;}} />
    </section>
  );
}
