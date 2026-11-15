import {useState} from 'react';
import {AndroidRNStudio} from './components/AndroidRNStudio';
import {Drive3DMode} from './components/Drive3DMode';
import {OfflineIndicator} from './components/OfflineIndicator';
import {OpenWorld2DMode} from './components/OpenWorld2DMode';
import {PWAInstallButton} from './components/PWAInstallButton';
import {StoryArcadeMode} from './components/StoryArcadeMode';
import {TitleHub} from './components/TitleHub';
import {VideoVault} from './components/VideoVault';
import {GameProgressProvider} from './context/GameProgressContext';
import {GameView} from './types/game';
import {audioEngine} from './utils/audio';

const NAV_ITEMS: {id: GameView; label: string}[] = [
  {id: 'hub', label: 'Hub'},
  {id: 'drive3d', label: '3D Drive'},
  {id: 'campus2d', label: '2D Campus'},
  {id: 'story', label: 'Story'},
  {id: 'android', label: 'Android'},
  {id: 'media', label: 'Video Vault'},
];

export default function App() {
  const [view, setView] = useState<GameView>('hub');
  const [storyChapterId, setStoryChapterId] = useState<string>('ch1');

  const handleNavigate = (nextView: GameView, chapterId?: string) => {
    audioEngine.playClick();
    if (chapterId) setStoryChapterId(chapterId);
    setView(nextView);
  };

  return (
    <GameProgressProvider>
      <div className="min-h-screen bg-[#090B10] text-slate-100">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#090B10]/95 px-4 sm:gap-8 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('hub')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            GTA 20
          </button>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="flex items-center gap-3 overflow-x-auto text-xs font-medium sm:gap-6 sm:text-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors cursor-pointer ${
                  view === item.id
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Big Red playable mode: existing standalone build under public/big-red/ */}
          <a
            href="/big-red/"
            className="shrink-0 rounded-xl border border-fuchsia-400/60 bg-fuchsia-500/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-fuchsia-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            aria-label="Play Big Red Neon Run"
          >
            🔥 Big Red
          </a>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <PWAInstallButton onOpenAndroidGuide={() => handleNavigate('android')} />
          </div>
        </header>

        <main>
          {view === 'hub' && <TitleHub onNavigate={handleNavigate} />}
          {view === 'drive3d' && <Drive3DMode />}
          {view === 'campus2d' && <OpenWorld2DMode />}
          {view === 'story' && (
            <StoryArcadeMode
              initialChapterId={storyChapterId}
              onNavigate={(next) => handleNavigate(next)}
            />
          )}
          {view === 'android' && <AndroidRNStudio />}
          {view === 'media' && <VideoVault />}
        </main>

        <OfflineIndicator />
      </div>
    </GameProgressProvider>
  );
}
