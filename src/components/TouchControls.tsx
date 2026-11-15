import React, {useEffect, useRef, useState} from 'react';
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

type Action = 'primary' | 'secondary';
const neutralInput = (): TouchInputVector => ({
  x: 0, y: 0, primaryPressed: false, secondaryPressed: false,
});

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange, primaryLabel, secondaryLabel, visible,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<TouchInputVector>(neutralInput());
  const callbackRef = useRef(onInputChange);
  callbackRef.current = onInputChange;
  const stickPointerRef = useRef<number | null>(null);
  const capturedRef = useRef(new Map<number, HTMLElement>());
  const actionPointersRef = useRef({primary: new Set<number>(), secondary: new Set<number>()});
  const actionKeysRef = useRef({primary: new Set<string>(), secondary: new Set<string>()});
  const [knobOffset, setKnobOffset] = useState({x: 0, y: 0});
  const [pressed, setPressed] = useState({primary: false, secondary: false});

  const publish = (patch: Partial<TouchInputVector>) => {
    const next = {...stateRef.current, ...patch};
    const old = stateRef.current;
    stateRef.current = next;
    setPressed(previous => previous.primary === next.primaryPressed && previous.secondary === next.secondaryPressed
      ? previous : {primary: next.primaryPressed, secondary: next.secondaryPressed});
    if (old.x !== next.x || old.y !== next.y || old.primaryPressed !== next.primaryPressed || old.secondaryPressed !== next.secondaryPressed) {
      callbackRef.current({...next});
    }
  };

  const capture = (target: HTMLElement, id: number) => {
    try {
      target.setPointerCapture(id);
      capturedRef.current.set(id, target);
    } catch {
      // A pointer can be cancelled before capture. Global release listeners are a fallback.
    }
  };

  const releaseCapture = (id: number) => {
    const target = capturedRef.current.get(id);
    capturedRef.current.delete(id);
    try {
      if (target?.hasPointerCapture(id)) target.releasePointerCapture(id);
    } catch {
      // The browser may have already released this pointer during a lifecycle change.
    }
  };

  const syncActions = () => publish({
    primaryPressed: actionPointersRef.current.primary.size > 0 || actionKeysRef.current.primary.size > 0,
    secondaryPressed: actionPointersRef.current.secondary.size > 0 || actionKeysRef.current.secondary.size > 0,
  });

  const releasePointer = (id: number) => {
    const isStick = stickPointerRef.current === id;
    const primary = actionPointersRef.current.primary.delete(id);
    const secondary = actionPointersRef.current.secondary.delete(id);
    if (!isStick && !primary && !secondary) return;
    if (isStick) {
      stickPointerRef.current = null;
      setKnobOffset({x: 0, y: 0});
    }
    // Clear ownership before releasing capture; lostpointercapture may fire immediately.
    releaseCapture(id);
    publish({
      ...(isStick ? {x: 0, y: 0} : {}),
      primaryPressed: actionPointersRef.current.primary.size > 0 || actionKeysRef.current.primary.size > 0,
      secondaryPressed: actionPointersRef.current.secondary.size > 0 || actionKeysRef.current.secondary.size > 0,
    });
  };

  const clearAll = (updateUI = true) => {
    stickPointerRef.current = null;
    actionPointersRef.current.primary.clear();
    actionPointersRef.current.secondary.clear();
    actionKeysRef.current.primary.clear();
    actionKeysRef.current.secondary.clear();
    for (const id of [...capturedRef.current.keys()]) releaseCapture(id);
    stateRef.current = neutralInput();
    if (updateUI) {
      setKnobOffset({x: 0, y: 0});
      setPressed({primary: false, secondary: false});
    }
    callbackRef.current(neutralInput());
  };

  useEffect(() => {
    if (!visible) {
      clearAll();
      return;
    }
    const reset = () => clearAll();
    const onVisibility = () => { if (document.hidden) clearAll(); };
    const onRelease = (event: PointerEvent) => releasePointer(event.pointerId);
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      document.removeEventListener('visibilitychange', onVisibility);
      clearAll(false);
    };
    // Handlers use stable refs; changing the parent's callback must not release held input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const updateVectorFromPointer = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    const radius = Math.min(rect.width, rect.height) * 0.36;
    if (!Number.isFinite(radius) || radius <= 0) return;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) { dx *= radius / distance; dy *= radius / distance; }
    setKnobOffset({x: dx, y: dy});
    publish({x: Number((dx / radius).toFixed(2)), y: Number((dy / radius).toFixed(2))});
  };

  const actionHandlers = (action: Action) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      actionPointersRef.current[action].add(event.pointerId);
      capture(event.currentTarget, event.pointerId);
      syncActions();
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => releasePointer(event.pointerId),
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => releasePointer(event.pointerId),
    onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => releasePointer(event.pointerId),
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      actionKeysRef.current[action].add(event.key);
      syncActions();
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      actionKeysRef.current[action].delete(event.key);
      syncActions();
    },
    onBlur: () => {
      actionKeysRef.current[action].clear();
      syncActions();
    },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex items-end justify-between px-5 pb-safe sm:px-8">
      <div
        ref={padRef}
        onPointerDown={event => {
          if (event.button !== 0 || stickPointerRef.current !== null) return;
          event.preventDefault();
          stickPointerRef.current = event.pointerId;
          capture(event.currentTarget, event.pointerId);
          updateVectorFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={event => {
          if (stickPointerRef.current !== event.pointerId) return;
          if (event.pointerType === 'mouse' && event.buttons === 0) {
            releasePointer(event.pointerId);
            return;
          }
          updateVectorFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={event => releasePointer(event.pointerId)}
        onPointerCancel={event => releasePointer(event.pointerId)}
        onLostPointerCapture={event => releasePointer(event.pointerId)}
        onContextMenu={event => event.preventDefault()}
        style={{touchAction: 'none', userSelect: 'none'}}
        className="pointer-events-auto touch-none-canvas relative flex h-32 w-32 items-center justify-center rounded-full border border-cyan-400/35 bg-[#090B10]/75 shadow-xl"
        aria-label="Virtual movement joystick"
      >
        <div className="h-20 w-20 rounded-full border border-white/10" />
        <div
          style={{transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`}}
          className="absolute h-12 w-12 rounded-full border border-cyan-300/80 bg-cyan-500/35 shadow-md"
        />
      </div>
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          {...actionHandlers('secondary')}
          aria-pressed={pressed.secondary}
          style={{touchAction: 'none', userSelect: 'none'}}
          className="touch-none-canvas flex h-14 min-w-[68px] items-center justify-center rounded-xl border border-white/20 bg-[#10141D]/90 px-4 text-xs font-semibold text-slate-100 active:scale-95"
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          {...actionHandlers('primary')}
          aria-pressed={pressed.primary}
          style={{touchAction: 'none', userSelect: 'none'}}
          className="touch-none-canvas flex h-16 min-w-[78px] items-center justify-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-lg active:scale-95"
        >
          <Zap className="h-4 w-4" />
          {primaryLabel}
        </button>
      </div>
    </div>
  );
};
