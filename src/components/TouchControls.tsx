import React, {useRef, useState} from 'react';
import {Zap} from 'lucide-react';

export interface TouchInputVector {
  x: number;
  y: number;
  primaryPressed: boolean;
  secondaryPressed: boolean;
}

interface TouchControlsProps {
  onInputChange: (input: TouchInputVector) => void;
  primaryLabel: string;
  secondaryLabel: string;
  visible: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange,
  primaryLabel,
  secondaryLabel,
  visible,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({x: 0, y: 0});
  const stateRef = useRef<TouchInputVector>({
    x: 0,
    y: 0,
    primaryPressed: false,
    secondaryPressed: false,
  });

  if (!visible) return null;

  const updateVectorFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({x: dx, y: dy});
    stateRef.current = {
      ...stateRef.current,
      x: Number((dx / maxRadius).toFixed(2)),
      y: Number((dy / maxRadius).toFixed(2)),
    };
    onInputChange({...stateRef.current});
  };

  const resetStick = () => {
    setKnobOffset({x: 0, y: 0});
    stateRef.current = {...stateRef.current, x: 0, y: 0};
    onInputChange({...stateRef.current});
  };

  const setPrimary = (pressed: boolean) => {
    stateRef.current = {...stateRef.current, primaryPressed: pressed};
    onInputChange({...stateRef.current});
  };

  const setSecondary = (pressed: boolean) => {
    stateRef.current = {...stateRef.current, secondaryPressed: pressed};
    onInputChange({...stateRef.current});
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex items-end justify-between px-5 pb-safe sm:px-8">
      {/* Left Thumb Virtual Joystick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          updateVectorFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return;
          if (e.pressure === 0 && e.pointerType !== 'mouse') return;
          updateVectorFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto touch-none-canvas relative flex h-32 w-32 items-center justify-center rounded-full border border-cyan-400/35 bg-[#090B10]/75 shadow-xl"
        aria-label="Virtual movement joystick"
      >
        <div className="h-20 w-20 rounded-full border border-white/10" />
        <div
          style={{transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`}}
          className="absolute h-12 w-12 rounded-full border border-cyan-300/80 bg-cyan-500/35 shadow-md"
        />
      </div>

      {/* Right Thumb Action Cluster (>= 48px targets) */}
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onPointerDown={() => setSecondary(true)}
          onPointerUp={() => setSecondary(false)}
          onPointerLeave={() => setSecondary(false)}
          onPointerCancel={() => setSecondary(false)}
          className="touch-none-canvas flex h-14 min-w-[68px] items-center justify-center rounded-xl border border-white/20 bg-[#10141D]/90 px-4 text-xs font-semibold text-slate-100 active:scale-95"
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          onPointerDown={() => setPrimary(true)}
          onPointerUp={() => setPrimary(false)}
          onPointerLeave={() => setPrimary(false)}
          onPointerCancel={() => setPrimary(false)}
          className="touch-none-canvas flex h-16 min-w-[78px] items-center justify-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-lg active:scale-95"
        >
          <Zap className="h-4 w-4" />
          {primaryLabel}
        </button>
      </div>
    </div>
  );
};
