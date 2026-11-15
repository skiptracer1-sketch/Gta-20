import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {TouchControls, TouchInputVector} from './TouchControls';
import {useGameProgress} from '../context/GameProgressContext';

const SAVE_KEY = 'gta20_big_red_3d_missions_v1';
const GOALS = [
  {title: 'Walk to Neon Gate', x: 14, z: -12, hint: 'Find the cyan checkpoint on foot'},
  {title: 'Get Behind the Wheel', x: 5, z: 5, hint: 'Find the red car and tap ENTER RIDE'},
  {title: 'Race to Strip Plaza', x: 42, z: -12, hint: 'Drive to the glowing checkpoint'},
  {title: 'Explore Night Market', x: -35, z: 35, hint: 'Navigate across the open city'},
  {title: 'Return to Big Red Tower', x: -5, z: 35, hint: 'Finish at the red-lit tower'},
] as const;

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
} {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({color: 0xc4152d, metalness: .46, roughness: .3});
  const dark = new THREE.MeshStandardMaterial({color: 0x101829, metalness: .55, roughness: .34});
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
  // Big Red: fully modeled procedural 3D hero, separate animated limbs.
  addBox(group, red, .95, 1.0, .55, 0, 1.65, 0);
  addBox(group, dark, .69, .2, .6, 0, 1.17, 0);
  addBox(group, trim, .7, .08, .05, 0, 1.9, -.295);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.17, .2, .22, 10), red);
  neck.position.y = 2.23;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 18, 12), red);
  head.position.set(0, 2.57, -.05);
  head.scale.set(1, 1.09, .95);
  head.castShadow = true;
  group.add(head);
  addBox(group, trim, .59, .11, .12, 0, 2.61, -.32);
  addBox(group, dark, .35, .1, .07, 0, 2.4, -.35);
  const leftArm = new THREE.Group(), rightArm = new THREE.Group();
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    arm.position.set(side * .66, 2.02, 0);
    addBox(arm, red, .35, .78, .41, 0, -.38, 0);
    addBox(arm, dark, .34, .26, .35, 0, -.87, 0);
    addBox(arm, trim, .37, .07, .08, 0, -.61, -.23);
    group.add(arm);
  }
  const leftLeg = new THREE.Group(), rightLeg = new THREE.Group();
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]] as const) {
    leg.position.set(side * .26, 1.13, 0);
    addBox(leg, dark, .41, 1.0, .45, 0, -.51, 0);
    addBox(leg, red, .47, .28, .65, 0, -1.0, -.12);
    group.add(leg);
  }
  return {group, leftArm, rightArm, leftLeg, rightLeg};
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

export function BigRed3DMode() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const touchRef = useRef<TouchInputVector>(neutral());
  const actionRef = useRef(false);
  const [restartSeed, restart] = useState(0);
  const [error, setError] = useState('');
  const [hud, setHud] = useState<Hud>({mission: 0, speed: 0, driving: false, distance: 0});
  const {addCredits, addRep} = useGameProgress();

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
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
    for (let x = -108; x <= 108; x += 18) {
      for (let z = -108; z <= 108; z += 18) {
        if (Math.abs(x) < 13 || Math.abs(z) < 13) continue;
        if (x === -36 && z === 36) continue;
        const height = 7 + Math.floor(random() * 25);
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(11 + random() * 2, height, 11 + random() * 2),
          buildingMats[Math.floor(random() * buildingMats.length)]
        );
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
      if (driving) {
        const targetSpeed = vertical * (boost ? 28 : 15);
        speed = THREE.MathUtils.damp(speed, targetSpeed, vertical ? 3 : 1.8, dt);
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
      }
      player.x = THREE.MathUtils.clamp(player.x, -115, 115);
      player.z = THREE.MathUtils.clamp(player.z, -115, 115);
      if (driving) car.position.set(player.x, .04, player.z);
      const goal = GOALS[mission];
      if (goal) {
        targetRing.visible = targetBeam.visible = true;
        targetRing.position.set(goal.x, .22 + Math.sin(timestamp * .003) * .08, goal.z);
        targetBeam.position.set(goal.x, 6.5, goal.z);
        const distance = Math.hypot(player.x - goal.x, player.z - goal.z);
        const permitted = mission === 0 ? !driving : mission === 1 ? driving : driving;
        if (distance < (mission === 1 ? 5 : 3.9) && permitted) {
          mission++;
          try { localStorage.setItem(SAVE_KEY, String(mission)); } catch {}
          addCredits(250); addRep(30);
        }
      } else {
        targetRing.visible = targetBeam.visible = false;
      }
      // Stable chase camera with optional drag-to-orbit inspection.
      const a = heading + orbit;
      const dist = driving ? 12 : 8.2;
      const focus = player.clone().add(new THREE.Vector3(0, driving ? 1.3 : 1.8, 0));
      desiredCamera.set(player.x + Math.sin(a) * dist,
        (driving ? 5.5 : 4.2) + cameraPitch * 6, player.z + Math.cos(a) * dist);
      camera.position.lerp(desiredCamera, Math.min(1, dt * 5));
      camera.lookAt(focus);
      targetRing.rotation.z = timestamp * .0003;
      renderer.render(scene, camera);
      if (++frame % 10 === 0) {
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
  return (
    <section className="relative isolate mx-auto h-[calc(100dvh-4rem)] min-h-[540px] w-full overflow-hidden bg-[#030715] text-white" aria-label="Playable Big Red 3D open world">
      <div ref={mountRef} className="absolute inset-0" />
      {error && <div role="alert" className="absolute inset-0 z-50 grid place-content-center bg-slate-950 p-8 text-center text-rose-300">{error}</div>}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2 sm:inset-x-6 sm:flex-row sm:justify-between">
        <div className="max-w-md rounded-2xl border border-white/20 bg-slate-950/75 p-3 backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">GTA 20 · Big Red 3D · Lumexus</p>
          <p className="mt-1 text-lg font-bold">{goal ? `Mission ${hud.mission + 1}/5: ${goal.title}` : 'All five missions cleared!'}</p>
          <p className="text-xs text-slate-200">{goal ? `${goal.hint} · ${hud.distance} m` : 'Neon Run complete. Explore freely or restart.'}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="rounded-xl border border-white/20 bg-slate-950/75 px-4 py-2 text-right text-sm backdrop-blur-md">
            <div className="font-semibold text-rose-300">{hud.driving ? '🚗 DRIVING' : '🏃 ON FOOT'}</div>
            <div className="text-cyan-300">{hud.speed} {hud.driving ? 'km/h' : 'm/s'}</div>
          </div>
          <button type="button" onClick={resetRun} className="pointer-events-auto rounded-xl border border-white/30 bg-slate-950/90 px-4 py-3 text-xs font-semibold hover:bg-slate-800" aria-label="Restart all Big Red missions">Restart</button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-4 z-20 flex justify-center sm:bottom-6">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 p-2 text-xs shadow-2xl backdrop-blur-md">
          <button type="button" onClick={() => {actionRef.current = true;}}
            className="min-h-11 rounded-xl bg-rose-600 px-4 font-bold text-white hover:bg-rose-500">
            {hud.driving ? 'EXIT RIDE (E)' : 'ENTER RIDE (E)'}
          </button>
          <span className="hidden max-w-64 text-slate-200 sm:inline">WASD / arrows to move · Space to sprint or boost · drag scene to orbit</span>
        </div>
      </div>
      <TouchControls visible={!error} primaryLabel="RUN / BOOST" secondaryLabel="BRAKE"
        onInputChange={v => {touchRef.current = v;}} />
    </section>
  );
}
