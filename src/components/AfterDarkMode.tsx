import {useEffect, useState} from 'react';
import {BigRed3DMode} from './BigRed3DMode';
import {AFTER_DARK_CAST, DEFAULT_CREW_MEMBER} from '../data/afterDarkCast';

type Choice = {
  label: string;
  result: string;
  heat: number;
  influence: number;
};

type NightOperation = {
  number: string;
  title: string;
  district: string;
  x: number;
  z: number;
  briefing: string;
  choices: [Choice, Choice];
};

const SAVE_KEY = 'gta20_after_dark_story_v1';
const CAST_SAVE_KEY = 'gta20_after_dark_cast_v1';

const OPERATIONS: NightOperation[] = [
  {
    number: '01',
    title: 'The Velvet Signal',
    district: 'Neon Gate',
    x: 14, z: -8,
    briefing: 'A club DJ has vanished with the only recording of a high-profile backroom deal. Big Red has one chance to get the evidence before the security crew catches on.',
    choices: [
      {label: 'Blend in and find the DJ', result: 'You secure the recording without drawing attention.', heat: 0, influence: 20},
      {label: 'Confront the security chief', result: 'The chief talks, but word of Big Red reaches the syndicate.', heat: 25, influence: 35},
    ],
  },
  {
    number: '02',
    title: 'Midnight Courier',
    district: 'Strip Plaza',
    x: 42, z: -7,
    briefing: 'An anonymous courier wants a midnight pickup. The package contains a route map that could expose who runs the city after dark.',
    choices: [
      {label: 'Protect the courier', result: 'The courier gives you a clean route through the city.', heat: 0, influence: 30},
      {label: 'Take the risky shortcut', result: 'You beat the deadline, but cameras catch the getaway car.', heat: 20, influence: 45},
    ],
  },
  {
    number: '03',
    title: 'Penthouse Frequency',
    district: 'Big Red Tower',
    x: -5, z: 35,
    briefing: 'At the top of the tower, Big Red discovers the signal controlling the nightclub surveillance network. Decide how the night ends.',
    choices: [
      {label: 'Release the evidence', result: 'The city sees the truth. Big Red earns underground respect.', heat: 15, influence: 60},
      {label: 'Cut the power and disappear', result: 'The network goes dark and Big Red escapes unseen.', heat: -15, influence: 35},
    ],
  },
];

type Progress = {stage: number; heat: number; influence: number; lastResult: string; arrived: boolean};

const initialProgress = (): Progress => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as Partial<Progress> | null;
    if (saved && Number.isInteger(saved.stage) && (saved.stage ?? -1) >= 0
      && (saved.stage ?? 99) <= OPERATIONS.length) {
      return {
        stage: saved.stage!,
        heat: typeof saved.heat === 'number' ? saved.heat : 0,
        influence: typeof saved.influence === 'number' ? saved.influence : 0,
        lastResult: typeof saved.lastResult === 'string' ? saved.lastResult : '',
        arrived: saved.arrived === true && saved.stage !== OPERATIONS.length,
      };
    }
  } catch {
    // Private browsing or malformed local data should not prevent play.
  }
  return {stage: 0, heat: 0, influence: 0, lastResult: '', arrived: false};
};

/**
 * Separate, opt-in mature nightlife story on top of the existing Big Red 3D free-roam game.
 * Contact choices unlock by reaching their actual 3D GPS waypoint, or opting into
 * clearly labeled story-only access when WebGL or movement is unavailable.
 * The age prompt is a self-declaration, not third-party age verification.
 */
export function AfterDarkMode() {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [castOpen, setCastOpen] = useState(false);
  const [characterId, setCharacterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CAST_SAVE_KEY);
      if (AFTER_DARK_CAST.some(member => member.id === saved)) return saved!;
    } catch { /* Private browsing can block localStorage */ }
    return DEFAULT_CREW_MEMBER.id;
  });
  const selectedCrew = AFTER_DARK_CAST.find(member => member.id === characterId) ?? DEFAULT_CREW_MEMBER;
  const chooseCrew = (id: string) => {
    setCharacterId(id);
    try { localStorage.setItem(CAST_SAVE_KEY, id); } catch {}
    setCastOpen(false);
    setBriefingOpen(false);
  };

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch {}
  }, [progress]);

  const operation = OPERATIONS[progress.stage];
  const onArrive = () => {
    setProgress(previous => previous.stage === progress.stage && !previous.arrived
      ? {...previous, arrived: true} : previous);
    setBriefingOpen(true);
  };
  const waypoint = operation && !progress.arrived ? {
    id: `after-dark-contact-${progress.stage}`,
    title: operation.title,
    x: operation.x,
    z: operation.z,
    onArrive,
  } : undefined;

  const choose = (choice: Choice) => {
    setProgress(previous => !previous.arrived || previous.stage >= OPERATIONS.length
      ? previous : ({
        stage: previous.stage + 1,
        heat: Math.max(0, Math.min(100, previous.heat + choice.heat)),
        influence: previous.influence + choice.influence,
        lastResult: choice.result,
        arrived: false,
      }));
  };

  const restartStory = () => {
    setProgress({stage: 0, heat: 0, influence: 0, lastResult: '', arrived: false});
    setBriefingOpen(true);
  };

  if (!ageConfirmed) {
    return (
      <section className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[radial-gradient(ellipse_at_top,#4d102c_0%,#09050e_55%,#030407_100%)] px-4 py-12 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/35 bg-black/75 p-6 shadow-[0_0_90px_rgba(244,63,94,.18)] sm:p-10">
          <p className="text-sm font-black tracking-[.35em] text-rose-300">LUMEXUS GAMING · 18+</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">GTA 20: AFTER DARK</h1>
          <p className="mt-4 text-lg text-rose-100">Big Red's midnight Vegas storyline</p>
          <p className="mt-5 leading-relaxed text-slate-300">
            A separate mature-themed game concept featuring criminal intrigue, club nightlife,
            dangerous deals and branching decisions. No explicit sexual scenes.
          </p>
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
            <strong>Adults only:</strong> By continuing, you declare you are 18 or older.
            This is a self-declaration, not independent age verification.
          </div>
          <button type="button" onClick={() => setAgeConfirmed(true)}
            className="mt-6 min-h-12 w-full rounded-xl bg-rose-600 px-5 py-3 font-black text-white transition hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-cyan-300">
            I AM 18+ · ENTER AFTER DARK
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="relative bg-black">
      <BigRed3DMode afterDark={{
        waypoint,
        paused: briefingOpen,
        characterId,
        status: operation ? (progress.arrived ? 'Contact unlocked · open dossier' : `Head to ${operation.district}`) : 'All three contacts cleared',
      }} />
      <div className="pointer-events-none absolute left-3 top-32 z-30 flex flex-col items-start gap-2 sm:left-6">
        <button type="button" onClick={() => setBriefingOpen(true)}
          className="pointer-events-auto min-h-11 rounded-xl border border-rose-400/60 bg-black/85 px-4 py-2 text-xs font-black tracking-wider text-rose-100 shadow-lg backdrop-blur-md hover:bg-rose-950 focus-visible:outline-2 focus-visible:outline-cyan-300">
          🌙 AFTER DARK · {progress.stage}/{OPERATIONS.length} CONTACTS
        </button>
        <button type="button" onClick={() => {setCastOpen(true); setBriefingOpen(true);}}
          className="pointer-events-auto min-h-11 rounded-xl border border-cyan-400/60 bg-black/85 px-4 py-2 text-xs font-black tracking-wider text-cyan-100 shadow-lg backdrop-blur-md hover:bg-cyan-950 focus-visible:outline-2 focus-visible:outline-cyan-300">
          👥 CREW · {selectedCrew.name}
        </button>
      </div>
      {briefingOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/90 p-3 backdrop-blur-lg sm:p-6">
          <section role="dialog" aria-modal="true" aria-label="After Dark mission briefing"
            className="my-auto w-full max-w-lg rounded-3xl border border-rose-400/40 bg-[#100b15] p-5 text-white shadow-[0_0_75px_rgba(244,63,94,.25)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[.28em] text-rose-300">18+ · MIDNIGHT DOSSIER</p>
                <h2 className="mt-2 text-2xl font-black">{castOpen ? 'AFTER DARK · THE CREW' : 'BIG RED: AFTER DARK'}</h2>
              </div>
              <button type="button" onClick={() => setBriefingOpen(false)}
                className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
                Return to 3D City
              </button>
            </div>
            {castOpen ? (
              <div className="mt-5">
                <p className="text-sm leading-relaxed text-slate-300">
                  Switch between original, stylized crew avatars inspired by the Dunar Wireless ensemble.
                  Big Red leads the story by default. Switching a character respawns at the 3D city start.
                  These are game stand-ins, not exact photo likenesses.
                </p>
                <div className="mt-4 grid max-h-[55dvh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                  {AFTER_DARK_CAST.map(member => (
                    <button key={member.id} type="button" onClick={() => chooseCrew(member.id)}
                      aria-pressed={characterId === member.id}
                      className={`min-h-36 rounded-2xl border p-3 text-left transition hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300 ${characterId === member.id ? 'border-cyan-300 bg-cyan-950/55' : 'border-white/15 bg-black/55'}`}>
                      <span aria-hidden="true" className="mb-2 block h-14 w-14 rounded-full border-4 border-white/15 shadow-lg"
                        style={{background: `linear-gradient(135deg, #${member.appearance.hair.toString(16).padStart(6, '0')}, #${member.appearance.accent.toString(16).padStart(6, '0')})`}} />
                      <span className="block text-sm font-black text-white">{member.name}</span>
                      <span className="mt-1 block text-xs text-slate-300">{member.role}</span>
                      {member.id === DEFAULT_CREW_MEMBER.id && <span className="mt-2 block text-[10px] font-black text-rose-300">LEAD CHARACTER</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-slate-400">Night influence</div>
                <strong className="mt-1 block text-xl text-cyan-300">{progress.influence}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-slate-400">Heat</div>
                <strong className="mt-1 block text-xl text-rose-300">{progress.heat}/100</strong>
              </div>
            </div>
            {progress.lastResult && (
              <p role="status" className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-900/20 p-3 text-sm text-cyan-100">
                {progress.lastResult}
              </p>
            )}
            {operation ? (
              <>
                <p className="mt-6 text-xs font-bold uppercase tracking-widest text-rose-300">Contact {operation.number} · {operation.district}</p>
                <h3 className="mt-2 text-2xl font-black">{operation.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-300">{operation.briefing}</p>
                {progress.arrived ? (
                  <>
                    <p role="status" className="mt-5 rounded-xl border border-cyan-400/35 bg-cyan-950/30 p-3 text-sm font-bold text-cyan-200">
                      ✓ Contact reached. Choose your next move.
                    </p>
                    <div className="mt-4 grid gap-3">
                      {operation.choices.map(choice => (
                        <button key={choice.label} type="button" onClick={() => choose(choice)}
                          className="min-h-12 rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-left text-sm font-bold text-white hover:border-rose-300 hover:bg-rose-900/70 focus-visible:outline-2 focus-visible:outline-cyan-300">
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm text-rose-100">Drive or walk to the glowing rose checkpoint at {operation.district}. Follow the GPS marker. Contact choices unlock on arrival.</p>
                    <button type="button" onClick={() => setBriefingOpen(false)}
                      className="min-h-12 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-cyan-300">
                      📍 TRACK CONTACT IN 3D
                    </button>
                    <button type="button" onClick={() => setProgress(previous => ({...previous, arrived: true}))}
                      className="min-h-11 w-full rounded-xl border border-white/20 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">
                      Skip travel · story-only accessibility option
                    </button>
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-400">This edition keeps its own progress and does not overwrite the original game's five missions.</p>
              </>
            ) : (
              <>
                <h3 className="mt-6 text-2xl font-black text-cyan-300">Midnight storyline complete</h3>
                <p className="mt-3 leading-relaxed text-slate-300">
                  You finished all three night contacts. Keep exploring the 3D Vegas city,
                  replay the storyline or return to the other game modes.
                </p>
                <button type="button" onClick={restartStory}
                  className="mt-5 min-h-12 w-full rounded-xl bg-rose-600 px-4 py-3 font-bold hover:bg-rose-500">
                  Replay After Dark Story
                </button>
              </>
            )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
