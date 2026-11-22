import React, { useCallback, useEffect, useState } from 'react';
import {
  Calculator,
  CalendarDays,
  Cookie,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Printer,
  Sun,
  UserCircle2,
  Utensils,
  X,
} from 'lucide-react';
import type { MDMState, ViewId } from './types/mdm';
import { formatIsoDate, formatMonthName, hydrateState } from './utils/mdmEngine';
import { DashboardView } from './components/DashboardView';
import { MasterAttendanceView } from './components/MasterAttendanceView';
import { MealRegisterView } from './components/MealRegisterView';
import { LadooRegisterView } from './components/LadooRegisterView';
import { RiceRegisterView } from './components/RiceRegisterView';
import { CalculatorView } from './components/CalculatorView';
import { AbstractView } from './components/AbstractView';
import { ProfileView } from './components/ProfileView';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const STORAGE_KEY = 'mdm-rice';
const THEME_KEY = 'mdm-theme';

interface NavItem {
  id: ViewId;
  label: string;
  shortLabel: string;
  group: 'overview' | 'registers' | 'tools';
  accentColor: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    group: 'overview',
    accentColor: 'text-amber-300',
    icon: LayoutDashboard,
  },
  {
    id: 'master',
    label: 'Master Attendance',
    shortLabel: 'Master Attendance',
    group: 'registers',
    accentColor: 'text-emerald-300',
    icon: CalendarDays,
  },
  {
    id: 'primary',
    label: 'Sheet 1 · SB & Primary',
    shortLabel: 'Primary MDM',
    group: 'registers',
    accentColor: 'text-sky-300',
    icon: Utensils,
  },
  {
    id: 'upper',
    label: 'Sheet 2 · Upper Primary',
    shortLabel: 'Upper Primary',
    group: 'registers',
    accentColor: 'text-indigo-300',
    icon: GraduationCap,
  },
  {
    id: 'ladoo',
    label: 'Sheet 3 · Laddoo Calc',
    shortLabel: 'Millet Laddoo',
    group: 'registers',
    accentColor: 'text-amber-300',
    icon: Cookie,
  },
  {
    id: 'rice',
    label: 'Sheet 4 · Rice Register',
    shortLabel: 'Rice Register',
    group: 'registers',
    accentColor: 'text-teal-300',
    icon: Package,
  },
  {
    id: 'calculator',
    label: 'Sheet 5 · MDM Calculator',
    shortLabel: 'Meal Planner',
    group: 'tools',
    accentColor: 'text-fuchsia-300',
    icon: Calculator,
  },
  {
    id: 'abstract',
    label: 'Sheet 6 · Abstract',
    shortLabel: 'Abstract Sheet',
    group: 'tools',
    accentColor: 'text-rose-300',
    icon: FileSpreadsheet,
  },
];

function loadInitialState(): MDMState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return hydrateState(JSON.parse(raw));
  } catch {
    // Fall back to default state
  }
  return hydrateState(null);
}

function loadInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

export default function App() {
  const [state, setState] = useState<MDMState>(loadInitialState);
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [monthKey, setMonthKey] = useState<string>(() => formatIsoDate(new Date()).slice(0, 7));
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'success' } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  useEffect(() => {
    const navMatch = NAV_ITEMS.find((n) => n.id === activeView);
    const label = activeView === 'profile' ? 'Profile & Settings' : navMatch?.shortLabel || 'MDM';
    document.title = `${state.school} – ${label}`;
  }, [state.school, activeView]);

  const notify = useCallback((message: string, tone: 'info' | 'success' = 'success') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateState = useCallback((updater: (prev: MDMState) => MDMState) => {
    setState((prev) => updater(prev));
  }, []);

  const requestConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
      onConfirm: () => void;
    }) => {
      setConfirmState({ open: true, ...opts });
    },
    []
  );

  const handleNavigate = (view: ViewId) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeView);
  const breadcrumbLabel =
    activeView === 'profile' ? 'School & Coordinator Profile' : activeNavItem?.label || 'Dashboard';

  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#064E3B] via-[#065F46] to-[#0F4C5C] text-white">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/15">
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center gap-3 text-left min-w-0"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 font-display font-extrabold text-sm tracking-tight shadow-md">
            MDM
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-white truncate">MDM Register</div>
            <div className="text-[11px] text-emerald-200 truncate">Odisha Stock Suite</div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-emerald-100 hover:bg-white/10"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'registers', label: 'Monthly Registers' },
            { key: 'tools', label: 'Planning & Audit' },
          ] as const
        ).map((grp) => (
          <div key={grp.key}>
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200/75">
              {grp.label}
            </div>
            <div className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === grp.key).map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold shadow-md'
                        : 'text-emerald-50/90 font-medium hover:bg-white/12 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-slate-950' : item.accentColor}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom PWA Install + User Profile Anchor */}
      <div className="p-3 border-t border-white/15 bg-black/15 space-y-2.5">
        <PWAInstallButton variant="sidebar" onInstalled={(msg) => notify(msg, 'success')} />
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
            activeView === 'profile'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'bg-white/10 hover:bg-white/18 text-white'
          }`}
        >
          <div
            className={`h-9 w-9 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${
              activeView === 'profile'
                ? 'bg-slate-950 text-amber-300'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
            }`}
          >
            {initials || 'UM'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate">{state.profile.name}</div>
            <div
              className={`text-[11px] truncate ${
                activeView === 'profile' ? 'text-slate-800' : 'text-emerald-200'
              }`}
            >
              {state.profile.designation}
            </div>
          </div>
          <UserCircle2 className="h-4 w-4 shrink-0 opacity-80" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EEF6F3] dark:bg-[#091015] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[268px] shrink-0 sticky top-0 h-screen shadow-xl noprint">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-950/60 backdrop-blur-[1px] noprint"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-[274px] max-w-[85vw] h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Vibrant Top Accent Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 via-50% to-amber-500 noprint" />

        {/* Top Bar */}
        <header className="app-topbar sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#0E171E]/95 backdrop-blur-xs border-b-2 border-emerald-600/25 dark:border-emerald-500/25 px-4 sm:px-6 flex items-center justify-between gap-4 noprint">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline font-medium text-emerald-700 dark:text-emerald-400 truncate max-w-[220px]">
                {state.school}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <label className="sr-only" htmlFor="global-month">
              Active Month
            </label>
            <input
              id="global-month"
              type="month"
              value={monthKey}
              onChange={(e) => e.target.value && setMonthKey(e.target.value)}
              className="hidden sm:block rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
              title={`Active month: ${formatMonthName(monthKey)}`}
            />

            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="rounded-lg p-2 border-2 border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              aria-label="Toggle color theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <PWAInstallButton variant="header" onInstalled={(msg) => notify(msg, 'success')} />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-800 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print View</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeView === 'dashboard' && (
            <DashboardView state={state} monthKey={monthKey} onNavigate={handleNavigate} />
          )}
          {activeView === 'master' && (
            <MasterAttendanceView
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNavigate={handleNavigate}
              onNotify={notify}
              onRequestConfirm={requestConfirm}
            />
          )}
          {activeView === 'primary' && (
            <MealRegisterView
              section="p"
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNotify={notify}
            />
          )}
          {activeView === 'upper' && (
            <MealRegisterView
              section="u"
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNotify={notify}
            />
          )}
          {activeView === 'ladoo' && (
            <LadooRegisterView
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNotify={notify}
            />
          )}
          {activeView === 'rice' && (
            <RiceRegisterView
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNotify={notify}
            />
          )}
          {activeView === 'calculator' && (
            <CalculatorView state={state} onUpdateState={updateState} onNotify={notify} />
          )}
          {activeView === 'abstract' && (
            <AbstractView
              state={state}
              monthKey={monthKey}
              onChangeMonthKey={setMonthKey}
              onUpdateState={updateState}
              onNotify={notify}
            />
          )}
          {activeView === 'profile' && (
            <ProfileView
              state={state}
              monthKey={monthKey}
              onUpdateState={updateState}
              onNotify={notify}
              onRequestConfirm={requestConfirm}
            />
          )}
        </main>

        {/* Colorful Footer */}
        <footer className="border-t-2 border-emerald-600/20 bg-white/80 dark:bg-[#0E171E]/80 px-6 py-4 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 noprint">
          <span className="font-semibold text-emerald-900 dark:text-emerald-300">
            Created by {state.profile.name}, {state.profile.designation},{' '}
            {state.profile.schoolShort || state.school}
          </span>
          <span>Data stored locally on this device · Mid-Day Meal Odisha</span>
        </footer>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState((prev) => ({ ...prev, open: false }));
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      {/* Toast Notification */}
      <Toast
        message={toast?.message || null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
