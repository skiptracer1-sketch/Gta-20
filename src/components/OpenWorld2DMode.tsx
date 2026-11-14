import React, {useEffect, useRef, useState} from 'react';
import {Car, Compass, RotateCcw, Shield, Star} from 'lucide-react';
import {VEHICLE_TRIMS} from '../data/chapters';
import {useGameProgress} from '../context/GameProgressContext';
import {audioEngine} from '../utils/audio';
import {TouchControls, TouchInputVector} from './TouchControls';

interface BuildingBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  accent: string;
}

interface ParkedCar {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  accent: string;
}

interface PatrolUnit {
  x: number;
  y: number;
  angle: number;
  speed: number;
}

interface Hud2DState {
  hp: number;
  score: number;
  wantedStars: number;
  inVehicle: boolean;
  nearCar: boolean;
  missionTitle: string;
  missionReward: number;
  district: string;
  busted: boolean;
}

const WORLD_W = 2000;
const WORLD_H = 1400;

const BUILDINGS: BuildingBlock[] = [
  {x: 160, y: 140, w: 280, h: 190, label: 'Lumexus Engineering', color: '#141B2D', accent: '#06B6D4'},
  {x: 580, y: 140, w: 240, h: 190, label: 'North Dorms', color: '#171E30', accent: '#38BDF8'},
  {x: 1040, y: 140, w: 300, h: 210, label: "Dean's Server Vault", color: '#1B162C', accent: '#EC4899'},
  {x: 1520, y: 150, w: 260, h: 200, label: 'Stratosphere Tower', color: '#1D192B', accent: '#F59E0B'},
  {x: 180, y: 540, w: 260, h: 240, label: 'Quad Library', color: '#141B2D', accent: '#06B6D4'},
  {x: 620, y: 560, w: 220, h: 200, label: 'Student Union', color: '#161F33', accent: '#38BDF8'},
  {x: 1060, y: 560, w: 260, h: 220, label: 'Crazy E Arcade', color: '#1E162B', accent: '#EC4899'},
  {x: 1500, y: 550, w: 300, h: 240, label: 'Neo-Vegas Casino', color: '#1D1829', accent: '#F59E0B'},
  {x: 200, y: 980, w: 280, h: 210, label: 'South Quad Gate', color: '#141B2D', accent: '#06B6D4'},
  {x: 660, y: 1000, w: 260, h: 190, label: 'Robotics Garage', color: '#161F33', accent: '#38BDF8'},
  {x: 1120, y: 980, w: 280, h: 220, label: 'Lumexus Arena', color: '#1D172B', accent: '#EC4899'},
  {x: 1560, y: 980, w: 240, h: 210, label: 'Vegas Helipad', color: '#1C1B29', accent: '#F59E0B'},
];

const MISSIONS = [
  {title: 'Deliver Exam Key to North Dorms', x: 700, y: 400, reward: 220},
  {title: "Breach Dean's Server Vault Terminal", x: 1190, y: 420, reward: 300},
  {title: 'Drop Crypto Bag at Crazy E Arcade', x: 1190, y: 850, reward: 260},
  {title: 'Sweep Vegas Helipad Relay', x: 1680, y: 900, reward: 340},
  {title: 'Campus Quad Checkpoint Run', x: 320, y: 440, reward: 200},
];

function rectsOverlap(
  ax: number,
  ay: number,
  ar: number,
  b: BuildingBlock,
): boolean {
  const closestX = Math.max(b.x, Math.min(ax, b.x + b.w));
  const closestY = Math.max(b.y, Math.min(ay, b.y + b.h));
  const dx = ax - closestX;
  const dy = ay - closestY;
  return dx * dx + dy * dy < ar * ar;
}

export const OpenWorld2DMode: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {profile, addCredits, addRep, recordWantedStars, updateHighScore} = useGameProgress();
  const selectedTrim =
    VEHICLE_TRIMS.find((v) => v.id === profile.selectedVehicleId) ?? VEHICLE_TRIMS[0];

  const [hud, setHud] = useState<Hud2DState>({
    hp: 100,
    score: 0,
    wantedStars: 0,
    inVehicle: false,
    nearCar: false,
    missionTitle: MISSIONS[0].title,
    missionReward: MISSIONS[0].reward,
    district: 'Lumexus Tech Quad',
    busted: false,
  });
  const [runSeed, setRunSeed] = useState(0);

  const keysRef = useRef<Record<string, boolean>>({});
  const actionTriggerRef = useRef(false);
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
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'KeyF') {
        actionTriggerRef.current = true;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Simulation state
    let px = 490;
    let py = 470;
    let pAngle = 0;
    let hp = 100;
    let score = 0;
    let wantedStars = 0;
    let activeCarId: number | null = null;
    let missionIdx = 0;
    let busted = false;
    let prevTouchPrimary = false;
    let hitCooldown = 0;
    let lastHudSync = 0;

    const cars: ParkedCar[] = [
      {
        id: 1,
        x: 520,
        y: 420,
        angle: 0,
        speed: 0,
        color: selectedTrim.primaryColor,
        accent: selectedTrim.accentColor,
      },
      {id: 2, x: 960, y: 470, angle: Math.PI / 2, speed: 0, color: '#1E1B4B', accent: '#EC4899'},
      {id: 3, x: 1420, y: 880, angle: -Math.PI / 2, speed: 0, color: '#18181B', accent: '#F59E0B'},
      {id: 4, x: 540, y: 890, angle: 0, speed: 0, color: '#0F172A', accent: '#38BDF8'},
    ];

    const patrols: PatrolUnit[] = [
      {x: 960, y: 120, angle: 0, speed: 145},
      {x: 1440, y: 480, angle: Math.PI, speed: 155},
      {x: 490, y: 920, angle: 0, speed: 150},
    ];

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.06);
      lastTime = now;

      if (!busted) {
        const keys = keysRef.current;
        const touch = touchRef.current;

        // Edge-trigger vehicle enter/exit on touch secondary or E/F
        const enterPressed =
          actionTriggerRef.current || (touch.secondaryPressed && !prevTouchPrimary);
        prevTouchPrimary = touch.secondaryPressed;
        actionTriggerRef.current = false;

        const moveX =
          (keys['ArrowRight'] || keys['KeyD'] ? 1 : 0) -
          (keys['ArrowLeft'] || keys['KeyA'] ? 1 : 0) +
          touch.x;
        const moveY =
          (keys['ArrowDown'] || keys['KeyS'] ? 1 : 0) -
          (keys['ArrowUp'] || keys['KeyW'] ? 1 : 0) +
          touch.y;
        const sprintOrNitro = keys['Space'] || keys['ShiftLeft'] || touch.primaryPressed;

        const activeCar = cars.find((c) => c.id === activeCarId) ?? null;

        if (enterPressed) {
          if (activeCar) {
            activeCar.speed = 0;
            px = activeCar.x + Math.cos(activeCar.angle + Math.PI / 2) * 34;
            py = activeCar.y + Math.sin(activeCar.angle + Math.PI / 2) * 34;
            activeCarId = null;
            audioEngine.playClick();
          } else {
            const nearest = cars.find((c) => Math.hypot(c.x - px, c.y - py) < 58);
            if (nearest) {
              activeCarId = nearest.id;
              audioEngine.playNitro();
            }
          }
        }

        if (activeCar) {
          // Vehicle physics
          const steer = Math.max(-1, Math.min(1, moveX));
          const throttle = Math.max(-1, Math.min(1, -moveY));
          const maxSpd = (sprintOrNitro ? 460 : 340) + selectedTrim.topSpeedBonus * 2;
          if (Math.abs(throttle) > 0.1) {
            activeCar.speed += throttle * 520 * dt;
          } else {
            activeCar.speed *= Math.pow(0.15, dt);
          }
          activeCar.speed = Math.max(-160, Math.min(maxSpd, activeCar.speed));
          if (Math.abs(activeCar.speed) > 15) {
            activeCar.angle += steer * (activeCar.speed >= 0 ? 1 : -1) * 3.1 * dt;
          }

          const nx = Math.max(40, Math.min(WORLD_W - 40, activeCar.x + Math.cos(activeCar.angle) * activeCar.speed * dt));
          const ny = Math.max(40, Math.min(WORLD_H - 40, activeCar.y + Math.sin(activeCar.angle) * activeCar.speed * dt));

          const hitBuilding = BUILDINGS.some((b) => rectsOverlap(nx, ny, 22, b));
          if (!hitBuilding) {
            activeCar.x = nx;
            activeCar.y = ny;
          } else {
            activeCar.speed *= -0.35;
            audioEngine.playHit();
          }
          px = activeCar.x;
          py = activeCar.y;
          pAngle = activeCar.angle;
        } else {
          // On-foot movement
          const len = Math.hypot(moveX, moveY);
          if (len > 0.1) {
            const ux = moveX / Math.max(1, len);
            const uy = moveY / Math.max(1, len);
            const walkSpeed = sprintOrNitro ? 235 : 165;
            const nx = Math.max(30, Math.min(WORLD_W - 30, px + ux * walkSpeed * dt));
            const ny = Math.max(30, Math.min(WORLD_H - 30, py + uy * walkSpeed * dt));
            if (!BUILDINGS.some((b) => rectsOverlap(nx, py, 14, b))) px = nx;
            if (!BUILDINGS.some((b) => rectsOverlap(px, ny, 14, b))) py = ny;
            pAngle = Math.atan2(uy, ux);
          }
        }

        // Check Mission Beacon
        const mission = MISSIONS[missionIdx];
        if (Math.hypot(px - mission.x, py - mission.y) < 42) {
          audioEngine.playMissionWin();
          score += mission.reward;
          callbacksRef.current.addCredits(mission.reward);
          callbacksRef.current.addRep(90);
          wantedStars = Math.min(5, wantedStars + 1);
          callbacksRef.current.recordWantedStars(wantedStars);
          missionIdx = (missionIdx + 1) % MISSIONS.length;
        }

        // Patrol AI
        if (hitCooldown > 0) hitCooldown -= dt;
        patrols.forEach((patrol, idx) => {
          const chaseStrength = wantedStars > 0 ? 1 : 0.25;
          const targetX = wantedStars > 0 ? px : (idx * 550 + 350) % WORLD_W;
          const targetY = wantedStars > 0 ? py : (idx % 2 === 0 ? 450 : 890);
          const dx = targetX - patrol.x;
          const dy = targetY - patrol.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pSpd = patrol.speed + wantedStars * 28 * chaseStrength;
          const nx = patrol.x + (dx / dist) * pSpd * dt;
          const ny = patrol.y + (dy / dist) * pSpd * dt;
          if (!BUILDINGS.some((b) => rectsOverlap(nx, patrol.y, 18, b))) patrol.x = nx;
          if (!BUILDINGS.some((b) => rectsOverlap(patrol.x, ny, 18, b))) patrol.y = ny;
          patrol.angle = Math.atan2(dy, dx);

          if (hitCooldown <= 0 && Math.hypot(patrol.x - px, patrol.y - py) < 30) {
            hitCooldown = 1.0;
            hp -= 25;
            audioEngine.playHit();
            audioEngine.playSirenBlip();
            if (hp <= 0) {
              hp = 0;
              busted = true;
              callbacksRef.current.updateHighScore('campus2d', score);
            }
          }
        });

        // Camera follow
        const camX = Math.max(0, Math.min(WORLD_W - canvas.width, px - canvas.width / 2));
        const camY = Math.max(0, Math.min(WORLD_H - canvas.height, py - canvas.height / 2));

        // Render World
        ctx.fillStyle = '#090B10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(-camX, -camY);

        // Road Grid & Sidewalks
        ctx.fillStyle = '#111622';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
        ctx.lineWidth = 2;
        for (let gx = 0; gx <= WORLD_W; gx += 120) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, WORLD_H);
          ctx.stroke();
        }
        for (let gy = 0; gy <= WORLD_H; gy += 120) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(WORLD_W, gy);
          ctx.stroke();
        }

        // Major Boulevards
        ctx.fillStyle = '#0C1018';
        ctx.fillRect(0, 410, WORLD_W, 110);
        ctx.fillRect(0, 840, WORLD_W, 110);
        ctx.fillRect(460, 0, 100, WORLD_H);
        ctx.fillRect(920, 0, 100, WORLD_H);
        ctx.fillRect(1380, 0, 100, WORLD_H);

        // Road center dashes
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        ctx.setLineDash([22, 18]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 465);
        ctx.lineTo(WORLD_W, 465);
        ctx.moveTo(0, 895);
        ctx.lineTo(WORLD_W, 895);
        ctx.moveTo(510, 0);
        ctx.lineTo(510, WORLD_H);
        ctx.moveTo(970, 0);
        ctx.lineTo(970, WORLD_H);
        ctx.moveTo(1430, 0);
        ctx.lineTo(1430, WORLD_H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Buildings
        BUILDINGS.forEach((b) => {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = b.accent;
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);

          ctx.fillStyle = '#E2E8F0';
          ctx.font = '600 13px "Chakra Petch", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 4);
        });

        // Mission Beacon
        const pulseRadius = 24 + Math.sin(now * 0.006) * 5;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(mission.x, mission.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fill();

        // Parked / Active Vehicles
        cars.forEach((car) => {
          ctx.save();
          ctx.translate(car.x, car.y);
          ctx.rotate(car.angle);
          ctx.fillStyle = car.color;
          ctx.fillRect(-24, -14, 48, 28);
          ctx.strokeStyle = car.accent;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-24, -14, 48, 28);
          ctx.fillStyle = '#06B6D4';
          ctx.fillRect(6, -10, 12, 20);
          ctx.restore();
        });

        // Campus Security Patrols
        patrols.forEach((patrol) => {
          ctx.save();
          ctx.translate(patrol.x, patrol.y);
          ctx.rotate(patrol.angle);
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(-20, -12, 40, 24);
          ctx.strokeStyle = Math.floor(now / 180) % 2 === 0 ? '#EF4444' : '#3B82F6';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-20, -12, 40, 24);
          ctx.restore();
        });

        // Player Character (when on foot)
        if (!activeCar) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(pAngle);
          ctx.fillStyle = '#06B6D4';
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(4, -4, 9, 8);
          ctx.restore();
        }

        // Direction guide line toward mission if off-screen
        const mAngle = Math.atan2(mission.y - py, mission.x - px);
        ctx.save();
        ctx.translate(px + Math.cos(mAngle) * 46, py + Math.sin(mAngle) * 46);
        ctx.rotate(mAngle);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // Corner Radar Minimap (top-right inside canvas)
        const mapW = 140;
        const mapH = 98;
        const mx = canvas.width - mapW - 16;
        const my = 72;
        ctx.fillStyle = 'rgba(9, 11, 16, 0.88)';
        ctx.fillRect(mx, my, mapW, mapH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mapW, mapH);

        BUILDINGS.forEach((b) => {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.fillRect(
            mx + (b.x / WORLD_W) * mapW,
            my + (b.y / WORLD_H) * mapH,
            (b.w / WORLD_W) * mapW,
            (b.h / WORLD_H) * mapH,
          );
        });
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(mx + (mission.x / WORLD_W) * mapW, my + (mission.y / WORLD_H) * mapH, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#06B6D4';
        ctx.beginPath();
        ctx.arc(mx + (px / WORLD_W) * mapW, my + (py / WORLD_H) * mapH, 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (busted || now - lastHudSync > 90) {
          lastHudSync = now;
          const nearCar = !activeCar && cars.some((c) => Math.hypot(c.x - px, c.y - py) < 58);
          setHud({
            hp,
            score,
            wantedStars,
            inVehicle: !!activeCar,
            nearCar,
            missionTitle: mission.title,
            missionReward: mission.reward,
            district: px > 1000 ? 'Crazy E Vegas Strip' : 'Lumexus Tech Quad',
            busted,
          });
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [selectedTrim.accentColor, selectedTrim.primaryColor, selectedTrim.topSpeedBonus, runSeed]);

  const showTouchControls =
    profile.settings.touchControlsMode === 'always' ||
    (profile.settings.touchControlsMode === 'auto' &&
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-[#090B10]">
      <canvas ref={canvasRef} className="block h-full w-full touch-none-canvas" />

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#090B10]/90 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium text-amber-400">
            <Compass className="h-3.5 w-3.5" />
            <span>{hud.missionTitle} (+${hud.missionReward})</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            {hud.district} · {hud.inVehicle ? 'Driving Hover-Coupe' : hud.nearCar ? 'Press E to Board' : 'On Foot'}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#090B10]/90 px-4 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-white">
            <Shield className="h-4 w-4 text-cyan-400" />
            {hud.hp}%
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono-tabular font-semibold text-amber-400">
            ${hud.score}
          </span>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${
                  s <= hud.wantedStars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Controls Hint Bar */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 rounded-xl border border-white/10 bg-[#090B10]/90 px-4 py-2 text-xs text-slate-300 sm:flex">
        <span>WASD / Arrows Move &amp; Drive</span>
        <span className="text-slate-600">·</span>
        <span className="inline-flex items-center gap-1 text-cyan-300">
          <Car className="h-3.5 w-3.5" /> E / F Enter or Exit Car
        </span>
        <span className="text-slate-600">·</span>
        <span>Space Sprint / Nitro</span>
        <button
          type="button"
          onClick={() => setRunSeed((s) => s + 1)}
          className="pointer-events-auto ml-2 inline-flex items-center gap-1 rounded bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <TouchControls
        visible={showTouchControls && !hud.busted}
        primaryLabel="BOOST"
        secondaryLabel={hud.inVehicle ? 'EXIT' : 'RIDE'}
        onInputChange={(vec) => {
          touchRef.current = vec;
        }}
      />

      {hud.busted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#10141D] p-6 text-center">
            <p className="text-xs font-semibold text-red-400">Campus Security Intercept</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Busted in Sector 20</h2>
            <p className="mt-2 font-mono-tabular text-base text-amber-400">
              Heist Earnings Banked: ${hud.score}
            </p>
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setRunSeed((s) => s + 1);
                setHud((h) => ({...h, busted: false, hp: 100, score: 0, wantedStars: 0}));
              }}
              className="mt-6 w-full rounded-lg bg-cyan-500 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer"
            >
              Respawn on Quad
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
