import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {VEHICLE_TRIMS} from '../data/chapters';
import {PlayerProfile, TouchControlsMode} from '../types/game';
import {audioEngine} from '../utils/audio';

const STORAGE_KEY = 'gta20_lumexus_save_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  credits: 750,
  rep: 120,
  wantedRecord: 0,
  completedChapters: [],
  unlockedVehicles: ['spectre-2046'],
  selectedVehicleId: 'spectre-2046',
  highScores: {
    drive3d: 0,
    campus2d: 0,
    firewall: 0,
    drift: 0,
  },
  settings: {
    soundEnabled: true,
    touchControlsMode: 'auto',
  },
};

interface GameProgressContextValue {
  profile: PlayerProfile;
  addCredits: (amount: number) => void;
  addRep: (amount: number) => void;
  recordWantedStars: (stars: number) => void;
  completeChapter: (chapterId: string, rewardCredits: number, rewardRep: number) => void;
  updateHighScore: (mode: keyof PlayerProfile['highScores'], score: number) => void;
  unlockOrSelectVehicle: (vehicleId: string) => boolean;
  toggleSound: () => void;
  setTouchControlsMode: (mode: TouchControlsMode) => void;
  resetProgress: () => void;
}

const GameProgressContext = createContext<GameProgressContextValue | null>(null);

export const GameProgressProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PROFILE;
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        highScores: {
          ...DEFAULT_PROFILE.highScores,
          ...(parsed.highScores ?? {}),
        },
        settings: {
          ...DEFAULT_PROFILE.settings,
          ...(parsed.settings ?? {}),
        },
      };
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  useEffect(() => {
    audioEngine.setEnabled(profile.settings.soundEnabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  const addCredits = useCallback((amount: number) => {
    setProfile((prev) => ({
      ...prev,
      credits: Math.max(0, prev.credits + amount),
    }));
  }, []);

  const addRep = useCallback((amount: number) => {
    setProfile((prev) => ({
      ...prev,
      rep: Math.max(0, prev.rep + amount),
    }));
  }, []);

  const recordWantedStars = useCallback((stars: number) => {
    setProfile((prev) =>
      stars > prev.wantedRecord ? {...prev, wantedRecord: stars} : prev,
    );
  }, []);

  const completeChapter = useCallback(
    (chapterId: string, rewardCredits: number, rewardRep: number) => {
      setProfile((prev) => {
        const alreadyDone = prev.completedChapters.includes(chapterId);
        return {
          ...prev,
          credits: prev.credits + (alreadyDone ? Math.round(rewardCredits * 0.25) : rewardCredits),
          rep: prev.rep + (alreadyDone ? Math.round(rewardRep * 0.25) : rewardRep),
          completedChapters: alreadyDone
            ? prev.completedChapters
            : [...prev.completedChapters, chapterId],
        };
      });
    },
    [],
  );

  const updateHighScore = useCallback(
    (mode: keyof PlayerProfile['highScores'], score: number) => {
      setProfile((prev) => {
        if (score <= prev.highScores[mode]) return prev;
        return {
          ...prev,
          highScores: {
            ...prev.highScores,
            [mode]: score,
          },
        };
      });
    },
    [],
  );

  const unlockOrSelectVehicle = useCallback((vehicleId: string) => {
    const trim = VEHICLE_TRIMS.find((v) => v.id === vehicleId);
    if (!trim) return false;
    let success = false;
    setProfile((prev) => {
      if (prev.unlockedVehicles.includes(vehicleId)) {
        success = true;
        return {...prev, selectedVehicleId: vehicleId};
      }
      if (prev.credits >= trim.cost) {
        success = true;
        return {
          ...prev,
          credits: prev.credits - trim.cost,
          unlockedVehicles: [...prev.unlockedVehicles, vehicleId],
          selectedVehicleId: vehicleId,
        };
      }
      return prev;
    });
    return success;
  }, []);

  const toggleSound = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  const setTouchControlsMode = useCallback((mode: TouchControlsMode) => {
    setProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        touchControlsMode: mode,
      },
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
  }, []);

  return (
    <GameProgressContext.Provider
      value={{
        profile,
        addCredits,
        addRep,
        recordWantedStars,
        completeChapter,
        updateHighScore,
        unlockOrSelectVehicle,
        toggleSound,
        setTouchControlsMode,
        resetProgress,
      }}
    >
      {children}
    </GameProgressContext.Provider>
  );
};

export function useGameProgress() {
  const ctx = useContext(GameProgressContext);
  if (!ctx) throw new Error('useGameProgress must be used within GameProgressProvider');
  return ctx;
}
