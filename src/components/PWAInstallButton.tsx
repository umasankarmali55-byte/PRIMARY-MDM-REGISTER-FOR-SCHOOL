import React, { useState } from 'react';
import { CheckCircle2, Download, Monitor, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar';
  onInstalled?: (message: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Suppress button when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'accepted') {
        onInstalled?.('MDM Register installed! You can now launch it from your home screen.');
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-md transition-all whitespace-nowrap"
          title="Install MDM Register as an offline-ready app"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>{isIOS ? 'Install on iPhone / iPad' : 'Install App (PWA)'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all whitespace-nowrap shrink-0"
          title="Install MDM Register on your device"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>Install App</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 noprint"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-600/40 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-5 py-4 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-display font-extrabold text-xs flex items-center justify-center shadow-sm">
                  MDM
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">Install MDM Register</h3>
                  <p className="text-xs text-emerald-100">
                    Works offline · Fast home-screen launch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/15"
                aria-label="Close install instructions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {isIOS ? (
                <div className="rounded-xl bg-sky-50 dark:bg-sky-950/35 border-2 border-sky-300/70 dark:border-sky-800 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-sky-900 dark:text-sky-200">
                    <Smartphone className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    Install on iPhone / iPad (Safari)
                  </div>
                  <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
                    <li>
                      Tap the <Share className="inline h-3.5 w-3.5 text-sky-600 -mt-0.5 mx-0.5" />
                      <strong>Share</strong> button in Safari&apos;s toolbar.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner to install the app icon.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border-2 border-emerald-300/70 dark:border-emerald-800 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                      <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Android (Chrome / Edge)
                    </div>
                    <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
                      <li>Open the app directly in Chrome (outside embedded preview).</li>
                      <li>
                        Tap the <strong>⋮ Menu</strong> button at the top-right corner.
                      </li>
                      <li>
                        Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/35 border-2 border-indigo-300/70 dark:border-indigo-800 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-900 dark:text-indigo-200">
                      <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Desktop (Chrome / Edge)
                    </div>
                    <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
                      <li>Open the shared app URL in its own browser tab.</li>
                      <li>
                        Click the <strong>Install</strong> icon on the right side of the address
                        bar, or click <strong>Install App</strong> here once prompted.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-800 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Offline service worker &amp; local register storage are enabled automatically.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 text-sm font-bold text-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
