import React, {useEffect, useRef, useState} from 'react';
import {CheckCircle2, Cpu, Flag, Zap} from 'lucide-react';
import {STORY_CHAPTERS} from '../data/chapters';
import {useGameProgress} from '../context/GameProgressContext';
import {GameView} from '../types/game';
import {audioEngine} from '../utils/audio';

interface StoryArcadeModeProps {
  initialChapterId?: string;
  onNavigate: (view: GameView) => void;
}

const FirewallMinigame: React.FC<{onComplete: (score: number) => void; onCancel: () => void}> = ({
  onComplete,
  onCancel,
}) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userStep, setUserStep] = useState(0);
  const [round, setRound] = useState(1);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [status, setStatus] = useState('Memorize the glowing Quad nodes');

  useEffect(() => {
    const length = round + 2;
    const nextSeq = Array.from({length}, () => Math.floor(Math.random() * 9));
    setSequence(nextSeq);
    setUserStep(0);
    setShowing(true);
    setStatus(`Round ${round} of 3 · Syncing Firewall Pattern`);

    const timers: number[] = [];
    nextSeq.forEach((cell, idx) => {
      timers.push(
        window.setTimeout(() => {
          setHighlighted(cell);
          audioEngine.playClick();
        }, idx * 520 + 350),
      );
      timers.push(
        window.setTimeout(() => {
          setHighlighted(null);
        }, idx * 520 + 680),
      );
    });
    timers.push(
      window.setTimeout(() => {
        setShowing(false);
        setStatus('Tap the nodes in exact sequence');
      }, nextSeq.length * 520 + 450),
    );

    return () => timers.forEach(clearTimeout);
  }, [round]);

  const handleCellClick = (index: number) => {
    if (showing) return;
    audioEngine.playClick();
    if (sequence[userStep] === index) {
      const nextStep = userStep + 1;
      if (nextStep === sequence.length) {
        if (round >= 3) {
          audioEngine.playMissionWin();
          onComplete(450);
        } else {
          setRound((r) => r + 1);
        }
      } else {
        setUserStep(nextStep);
      }
    } else {
      audioEngine.playHit();
      setStatus('Mismatch! Re-syncing pattern...');
      setRound(1);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/40 bg-[#10141D] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-cyan-400">Arcade Breach · Campus Firewall</p>
          <h3 className="mt-1 font-display text-xl font-bold text-white">{status}</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
        >
          Skip Hack
        </button>
      </div>

      <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-3">
        {Array.from({length: 9}).map((_, idx) => {
          const isLit = highlighted === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={showing}
              onClick={() => handleCellClick(idx)}
              className={`flex h-20 items-center justify-center rounded-xl border font-mono-tabular text-sm font-bold transition-transform active:scale-95 cursor-pointer ${
                isLit
                  ? 'border-cyan-300 bg-cyan-400 text-slate-950 scale-105'
                  : 'border-white/15 bg-[#171C28] text-slate-300 hover:border-cyan-400/50'
              }`}
            >
              N{idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DriftMinigame: React.FC<{onComplete: (score: number) => void; onCancel: () => void}> = ({
  onComplete,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lane, setLane] = useState(1);
  const laneRef = useRef(1);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [timeLeft, setTimeLeft] = useState(12);
  const [score, setScore] = useState(0);

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let elapsed = 0;
    let pts = 0;
    let rafId = 0;
    let last = performance.now();

    const obstacles = [
      {lane: 0, y: -60},
      {lane: 2, y: -220},
      {lane: 1, y: -380},
    ];

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') setLane((l) => Math.max(0, l - 1));
      if (e.code === 'ArrowRight' || e.code === 'KeyD') setLane((l) => Math.min(2, l + 1));
    };
    window.addEventListener('keydown', onKey);

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      pts += dt * 45;

      const remaining = Math.max(0, Math.ceil(12 - elapsed));
      setTimeLeft(remaining);
      setScore(Math.floor(pts));

      if (elapsed >= 12) {
        audioEngine.playMissionWin();
        onCompleteRef.current(Math.floor(pts) + 200);
        return;
      }

      ctx.fillStyle = '#090B10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const laneW = canvas.width / 3;
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(laneW, 0);
      ctx.lineTo(laneW, canvas.height);
      ctx.moveTo(laneW * 2, 0);
      ctx.lineTo(laneW * 2, canvas.height);
      ctx.stroke();

      obstacles.forEach((ob) => {
        ob.y += 260 * dt;
        if (ob.y > canvas.height + 30) {
          ob.y = -50;
          ob.lane = Math.floor(Math.random() * 3);
        }
        const ox = ob.lane * laneW + laneW / 2;
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(ox - 22, ob.y - 24, 44, 48);

        if (ob.lane === laneRef.current && Math.abs(ob.y - (canvas.height - 56)) < 38) {
          audioEngine.playHit();
          pts = Math.max(0, pts - 80);
          ob.y = -60;
        }
      });

      const px = laneRef.current * laneW + laneW / 2;
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(px - 22, canvas.height - 80, 44, 48);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-pink-500/40 bg-[#10141D] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-pink-400">Arcade Sprint · Vegas Hover-Drift</p>
          <p className="mt-1 font-mono-tabular text-sm text-white">
            Survive {timeLeft}s · Score {score}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
        >
          Skip Drift
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={340}
        height={280}
        className="mx-auto mt-4 block rounded-xl border border-white/10 bg-[#090B10]"
      />

      <div className="mx-auto mt-4 flex max-w-xs gap-3">
        <button
          type="button"
          onClick={() => setLane((l) => Math.max(0, l - 1))}
          className="flex-1 rounded-xl border border-white/15 bg-[#171C28] py-3 text-sm font-bold text-white active:scale-95 cursor-pointer"
        >
          ← Left Lane
        </button>
        <button
          type="button"
          onClick={() => setLane((l) => Math.min(2, l + 1))}
          className="flex-1 rounded-xl border border-white/15 bg-[#171C28] py-3 text-sm font-bold text-white active:scale-95 cursor-pointer"
        >
          Right Lane →
        </button>
      </div>
    </div>
  );
};

export const StoryArcadeMode: React.FC<StoryArcadeModeProps> = ({
  initialChapterId = 'ch1',
  onNavigate,
}) => {
  const {profile, addCredits, addRep, completeChapter, updateHighScore} = useGameProgress();
  const [chapterId, setChapterId] = useState(initialChapterId);
  const chapter = STORY_CHAPTERS.find((c) => c.id === chapterId) ?? STORY_CHAPTERS[0];

  const [nodeId, setNodeId] = useState(chapter.startNodeId);
  const [activeMinigame, setActiveMinigame] = useState<'firewall' | 'drift' | null>(null);
  const [pendingNextNode, setPendingNextNode] = useState<string | null>(null);
  const [chapterAwarded, setChapterAwarded] = useState(false);

  useEffect(() => {
    const ch = STORY_CHAPTERS.find((c) => c.id === chapterId) ?? STORY_CHAPTERS[0];
    setNodeId(ch.startNodeId);
    setActiveMinigame(null);
    setPendingNextNode(null);
    setChapterAwarded(false);
  }, [chapterId]);

  const currentNode = chapter.nodes[nodeId] ?? chapter.nodes[chapter.startNodeId];
  const isChapterEnd = currentNode.choices.length === 0;

  useEffect(() => {
    if (isChapterEnd && !chapterAwarded) {
      setChapterAwarded(true);
      completeChapter(chapter.id, chapter.rewardCredits, chapter.rewardRep);
      audioEngine.playMissionWin();
    }
  }, [isChapterEnd, chapterAwarded, chapter.id, chapter.rewardCredits, chapter.rewardRep, completeChapter]);

  const handleChoice = (choice: (typeof currentNode.choices)[number]) => {
    audioEngine.playClick();
    if (choice.creditsDelta) addCredits(choice.creditsDelta);
    if (choice.repDelta) addRep(choice.repDelta);

    if (choice.launchMinigame) {
      setPendingNextNode(choice.nextNodeId);
      setActiveMinigame(choice.launchMinigame);
      return;
    }

    if (choice.launchMode) {
      onNavigate(choice.launchMode);
      return;
    }

    setNodeId(choice.nextNodeId);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Chapter Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-400">
            Interactive Story &amp; Arcade Hub · GTA 20
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            {chapter.number}: {chapter.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#10141D] p-1.5">
          {STORY_CHAPTERS.map((ch) => {
            const done = profile.completedChapters.includes(ch.id);
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChapterId(ch.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  ch.id === chapter.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                {ch.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Story Stage + Standalone Arcade Quick Launch */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10141D] lg:col-span-5">
          <img
            src={chapter.coverImage}
            alt={chapter.title}
            referrerPolicy="no-referrer"
            className="h-72 w-full object-cover object-top lg:h-full lg:min-h-[420px]"
          />
        </div>

        <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
          {activeMinigame === 'firewall' ? (
            <FirewallMinigame
              onComplete={(pts) => {
                addCredits(pts);
                updateHighScore('firewall', pts);
                setActiveMinigame(null);
                if (pendingNextNode) setNodeId(pendingNextNode);
              }}
              onCancel={() => {
                setActiveMinigame(null);
                if (pendingNextNode) setNodeId(pendingNextNode);
              }}
            />
          ) : activeMinigame === 'drift' ? (
            <DriftMinigame
              onComplete={(pts) => {
                addCredits(pts);
                updateHighScore('drift', pts);
                setActiveMinigame(null);
                if (pendingNextNode) setNodeId(pendingNextNode);
              }}
              onCancel={() => {
                setActiveMinigame(null);
                if (pendingNextNode) setNodeId(pendingNextNode);
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-[#10141D] p-6 sm:p-8">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-pink-400">
                    {currentNode.speaker} · {currentNode.role}
                  </span>
                  <span>{chapter.district}</span>
                </div>
                <p className="mt-4 text-lg leading-relaxed text-slate-100">
                  “{currentNode.line}”
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {!isChapterEnd ? (
                  currentNode.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChoice(choice)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-[#171C28] px-5 py-3.5 text-left text-sm font-semibold text-white hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                    >
                      <span>{choice.label}</span>
                      <span className="font-mono-tabular text-xs text-cyan-400">
                        {choice.launchMinigame
                          ? 'Minigame →'
                          : choice.launchMode
                            ? 'Open World →'
                            : 'Continue →'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                      <Flag className="h-4 w-4" />
                      <span>
                        {chapter.number} Complete · +${chapter.rewardCredits} Credits · +
                        {chapter.rewardRep} XP
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setNodeId(chapter.startNodeId)}
                        className="rounded-lg border border-white/15 bg-[#171C28] px-4 py-2 text-xs font-semibold text-white hover:border-white/30 cursor-pointer"
                      >
                        Replay Chapter
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('drive3d')}
                        className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer"
                      >
                        Free-Roam 3D Vegas
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Direct Arcade Minigame Launchers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPendingNextNode(null);
                setActiveMinigame('firewall');
              }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#10141D] p-4 text-left hover:border-cyan-400/50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-display text-sm font-bold text-white">Campus Firewall Breach</p>
                <p className="mt-0.5 font-mono-tabular text-xs text-slate-400">
                  Best: {profile.highScores.firewall}
                </p>
              </div>
              <Cpu className="h-5 w-5 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingNextNode(null);
                setActiveMinigame('drift');
              }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#10141D] p-4 text-left hover:border-pink-400/50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-display text-sm font-bold text-white">Neon Hover-Drift Sprint</p>
                <p className="mt-0.5 font-mono-tabular text-xs text-slate-400">
                  Best: {profile.highScores.drift}
                </p>
              </div>
              <Zap className="h-5 w-5 text-pink-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
