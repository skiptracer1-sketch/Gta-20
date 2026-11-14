import React, {useState} from 'react';
import {Check, Copy, Download, Smartphone, Vibrate} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import {audioEngine} from '../utils/audio';

const RN_APP_CODE = `import React, { useEffect, useRef } from 'react';
import { BackHandler, Platform, SafeAreaView, StatusBar, Vibration } from 'react-native';
import { WebView } from 'react-native-webview';

const GTA20_URL = 'https://YOUR_DEPLOYED_GTA20_APP_URL';

export default function App() {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090B10' }}>
      <StatusBar barStyle="light-content" backgroundColor="#090B10" />
      <WebView
        ref={webViewRef}
        source={{ uri: GTA20_URL }}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload.type === 'HAPTIC') {
              Vibration.vibrate(payload.durationMs || 15);
            }
          } catch {}
        }}
      />
    </SafeAreaView>
  );
}`;

const EXPO_CONFIG = `{
  "expo": {
    "name": "GTA 20",
    "slug": "gta-20-lumexus",
    "version": "1.0.0",
    "orientation": "default",
    "icon": "./assets/pwa-512x512.png",
    "android": {
      "package": "com.lumexusgaming.gta20",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/pwa-maskable-512x512.png",
        "backgroundColor": "#090B10"
      },
      "permissions": ["VIBRATE", "INTERNET"]
    }
  }
}`;

export const AndroidRNStudio: React.FC = () => {
  const {isInstallable, isInstalled, install} = usePWAInstall();
  const [copiedId, setCopiedId] = useState<'rn' | 'expo' | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    pwa: true,
    expo: false,
    eas: false,
    aab: false,
  });

  const copyText = async (id: 'rn' | 'expo', content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      audioEngine.playClick();
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-400">
            Cross-Platform Delivery · PWA + Google Play React Native Wrapper
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            Android &amp; React Native Release Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Install Android PWA Now
            </button>
          )}
          <button
            type="button"
            onClick={() => audioEngine.triggerHaptic(28)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/15 bg-[#171C28] px-4 py-2.5 text-xs font-semibold text-white hover:border-cyan-400 cursor-pointer"
          >
            <Vibrate className="h-4 w-4 text-cyan-400" />
            Test Haptic Bridge
          </button>
        </div>
      </div>

      {/* Checklist + How It Works */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-white/10 bg-[#10141D] p-6 lg:col-span-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Smartphone className="h-4 w-4 text-cyan-400" />
            <h2>Google Play Store AAB Checklist</h2>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            GTA 20 already dispatches native haptic events via{' '}
            <code className="font-mono-tabular text-cyan-300">
              window.ReactNativeWebView.postMessage
            </code>{' '}
            and caches assets offline via Workbox.
          </p>

          <div className="mt-5 space-y-3">
            {[
              {
                key: 'pwa',
                title: '1. Web App & Offline PWA Built',
                desc: 'Service worker, manifest, and 192/512/maskable PNG icons configured.',
              },
              {
                key: 'expo',
                title: '2. Create Expo React Native Shell',
                desc: 'npx create-expo-app gta20-android && npx expo install react-native-webview',
              },
              {
                key: 'eas',
                title: '3. Paste App.tsx & app.json Config',
                desc: 'Replace GTA20_URL with your live Cloud Run / web deployment URL.',
              },
              {
                key: 'aab',
                title: '4. Build Signed Android App Bundle',
                desc: 'Run eas build -p android --profile production and upload .aab to Play Console.',
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setChecklist((prev) => ({...prev, [item.key]: !prev[item.key]}))
                }
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#090B10]/70 p-3.5 text-left hover:border-cyan-400/40 cursor-pointer"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    checklist[item.key]
                      ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                      : 'border-white/25'
                  }`}
                >
                  {checklist[item.key] && <Check className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Code Blocks */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-white/10 bg-[#10141D] p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">
                React Native Wrapper · App.tsx
              </span>
              <button
                type="button"
                onClick={() => void copyText('rn', RN_APP_CODE)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer"
              >
                {copiedId === 'rn' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === 'rn' ? 'Copied' : 'Copy App.tsx'}
              </button>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[#090B10] p-4 font-mono-tabular text-xs leading-relaxed text-slate-200">
              <code>{RN_APP_CODE}</code>
            </pre>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#10141D] p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-white">
                Android Play Store Manifest · app.json
              </span>
              <button
                type="button"
                onClick={() => void copyText('expo', EXPO_CONFIG)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171C28] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer"
              >
                {copiedId === 'expo' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === 'expo' ? 'Copied' : 'Copy app.json'}
              </button>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-[#090B10] p-4 font-mono-tabular text-xs leading-relaxed text-slate-200">
              <code>{EXPO_CONFIG}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
