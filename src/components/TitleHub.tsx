import React, {useState} from 'react';
import {
  Car,
  Compass,
  Gamepad2,
  Map as MapIcon,
  Play,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {POSTER_ASSETS, STORY_CHAPTERS, VEHICLE_TRIMS, getCampusRank} from '../data/chapters';
import {useGameProgress} from '../context/GameProgressContext';
import {GameView, TouchControlsMode} from '../types/game';
import {audioEngine} from '../utils/audio';

interface TitleHubProps {
  onNavigate: (view: GameView, chapterId?: string) => void;
}

const SafePosterImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({src, alt, className = ''}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#10141D] via-[#171C28] to-[#090B10] p-6 text-center ${className}`}
      >
        <Gamepad2 className="h-10 w-10 text-cyan-400" />
        <p className="mt-3 font-display text-lg font-bold text-white">GTA 20 · 2046</p>
        <p className="mt-1 text-xs text-slate-400">{alt}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const TitleHub: React.FC<TitleHubProps> = ({onNavigate}) => {
  const {
    profile,
    unlockOrSelectVehicle,
    toggleSound,
    setTouchControlsMode,
    resetProgress,
  } = useGameProgress();
  const [confirmReset, setConfirmReset] = useState(false);

  const selectedVehicle =
    VEHICLE_TRIMS.find((v) => v.id === profile.selectedVehicleId) ?? VEHICLE_TRIMS[0];
  const rank = getCampusRank(profile.rep);

  const handleLaunch = (view: GameView, chapterId?: string) => {
    audioEngine.playClick();
    onNavigate(view, chapterId);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Split Showcase */}
      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#10141D] p-6 sm:p-10 lg:col-span-7">
          <div>
            <p className="text-xs font-medium tracking-wide text-cyan-400">
              Lumexus Gaming · Crazy E · 2046 Future Concept
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              GTA 20: Neo-Campus &amp; Vegas Strip
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              Navigate finals week across Lumexus Tech Quad and the neon Las Vegas boulevard of
              2046. Switch seamlessly between 3D hover-driving, top-down campus heists, branching
              story chapters, and arcade firewall runs.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleLaunch('drive3d')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Launch 3D Vegas Drive
              </button>
              <button
                type="button"
                onClick={() => handleLaunch('bigred3d')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-rose-400/50 bg-rose-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500 cursor-pointer"
              >
                <Gamepad2 className="h-4 w-4" />
                Play Big Red 3D
              </button>
              <button
                type="button"
                onClick={() => handleLaunch('campus2d')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-[#171C28] px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MapIcon className="h-4 w-4 text-cyan-400" />
                2D Campus Open World
              </button>
              <button
                type="button"
                onClick={() => handleLaunch('story', 'ch1')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-[#171C28] px-5 py-3 text-sm font-semibold text-white hover:border-pink-400/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="h-4 w-4 text-pink-400" />
                Play Story Chapters
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 text-xs text-slate-400">
              <span>Active Trim: {selectedVehicle.name}</span>
              <span aria-hidden="true">·</span>
              <span>Rank: {rank}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => {
                  toggleSound();
                  audioEngine.playClick();
                }}
                className="inline-flex items-center gap-1.5 font-medium text-slate-200 hover:text-cyan-400 cursor-pointer"
              >
                {profile.settings.soundEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                    Audio On
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                    Audio Muted
                  </>
                )}
              </button>
              <span aria-hidden="true">·</span>
              <label className="inline-flex items-center gap-2">
                <span>Touch Pad:</span>
                <select
                  value={profile.settings.touchControlsMode}
                  onChange={(e) => setTouchControlsMode(e.target.value as TouchControlsMode)}
                  className="rounded border border-white/15 bg-[#090B10] px-2 py-1 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="auto">Auto (Mobile)</option>
                  <option value="always">Always Show</option>
                  <option value="off">Off</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Hero Key Artwork */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#10141D] lg:col-span-5">
          <SafePosterImage
            src={POSTER_ASSETS.gta20Duo}
            alt="GTA 20 Lumexus Gaming 2046 Future Concept by Crazy E"
            className="h-full min-h-[340px] w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090B10] via-[#090B10]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs font-medium text-cyan-300">Official 2046 Concept Key Art</p>
            <p className="mt-1 font-display text-lg font-bold text-white">
              Vex &amp; Kira · Sector 20 Boulevard
            </p>
          </div>
        </div>
      </section>

      {/* 4-Column Telemetry Strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#10141D] p-5">
          <p className="text-xs text-slate-400">Tuition Credits</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-amber-400">
            ${profile.credits.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#10141D] p-5">
          <p className="text-xs text-slate-400">Campus Rep · {rank}</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-cyan-400">
            {profile.rep.toLocaleString()} XP
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#10141D] p-5">
          <p className="text-xs text-slate-400">Story Chapters Cleared</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-white">
            {profile.completedChapters.length} / {STORY_CHAPTERS.length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#10141D] p-5">
          <p className="text-xs text-slate-400">Best 3D / 2D Run</p>
          <p className="mt-2 font-mono-tabular text-2xl font-bold text-pink-400">
            {Math.max(profile.highScores.drive3d, profile.highScores.campus2d).toLocaleString()}
          </p>
        </div>
      </section>

      {/* Story Chapters */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              College &amp; Vegas Story Chapters
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Branching missions connecting Lumexus Tech Quad to Crazy E’s Neo-Vegas Strip.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleLaunch('story', 'ch1')}
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            Open Story &amp; Arcade Hub →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STORY_CHAPTERS.map((chapter) => {
            const cleared = profile.completedChapters.includes(chapter.id);
            return (
              <article
                key={chapter.id}
                className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10141D]"
              >
                <div className="relative h-56 overflow-hidden bg-[#090B10]">
                  <SafePosterImage
                    src={chapter.coverImage}
                    alt={chapter.title}
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10141D] via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-cyan-400">{chapter.number}</span>
                      <span aria-hidden="true">·</span>
                      <span>{chapter.district}</span>
                      {cleared && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-400">Cleared</span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-bold text-white">
                      {chapter.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {chapter.summary}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="font-mono-tabular text-xs text-amber-400">
                      +${chapter.rewardCredits} · +{chapter.rewardRep} XP
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLaunch('story', chapter.id)}
                      className="rounded-lg bg-[#171C28] px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {cleared ? 'Replay Chapter' : 'Start Chapter'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Hover-Interceptor Garage + Android Cross-Platform Bridge */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-2xl border border-white/10 bg-[#10141D] p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                2046 Hover-Interceptor Garage
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select or unlock trims using Tuition Credits earned in any mode.
              </p>
            </div>
            <Car className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {VEHICLE_TRIMS.map((trim) => {
              const unlocked = profile.unlockedVehicles.includes(trim.id);
              const active = profile.selectedVehicleId === trim.id;
              const canAfford = profile.credits >= trim.cost;
              return (
                <button
                  key={trim.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    unlockOrSelectVehicle(trim.id);
                  }}
                  disabled={!unlocked && !canAfford}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'border-cyan-400 bg-[#171C28]'
                      : 'border-white/10 bg-[#090B10]/60 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-bold text-white">
                        {trim.name}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{backgroundColor: trim.accentColor}}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{trim.subtitle}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-slate-300">+{trim.topSpeedBonus} km/h</span>
                    <span
                      className={
                        active
                          ? 'font-bold text-cyan-400'
                          : unlocked
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                      }
                    >
                      {active ? 'Equipped' : unlocked ? 'Select' : `Unlock $${trim.cost}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cross-Platform Android & React Native Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#10141D] p-6 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
              <Smartphone className="h-4 w-4" />
              <span>PWA &amp; Google Play React Native Bridge</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-white">
              Ship GTA 20 to Android
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Install directly as an offline-ready Android &amp; iOS Progressive Web App right now,
              or open the built-in React Native Studio to grab the Expo WebView wrapper, haptic
              bridge, and Play Store AAB checklist.
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Offline Service Worker Active
              </span>
              <span className="font-mono-tabular">Touch Ready</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleLaunch('android')}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#171C28] border border-cyan-500/40 px-4 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/15 transition-colors whitespace-nowrap cursor-pointer"
              >
                Open React Native Guide
              </button>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-[44px] rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Reset Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetProgress();
                    setConfirmReset(false);
                  }}
                  className="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 cursor-pointer"
                >
                  Confirm Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
