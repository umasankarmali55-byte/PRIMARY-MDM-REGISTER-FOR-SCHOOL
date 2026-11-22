import React, { useRef } from 'react';
import {
  Building2,
  Database,
  Download,
  RefreshCw,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import type { MDMState } from '../types/mdm';
import { createSampleMonthEntries, formatMonthName } from '../utils/mdmEngine';

interface ProfileViewProps {
  state: MDMState;
  monthKey: string;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
  onRequestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  state,
  monthKey,
  onUpdateState,
  onNotify,
  onRequestConfirm,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const updateProfileField = (field: keyof MDMState['profile'], value: string) => {
    onUpdateState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MDM_Backup_${monthKey}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 800);
    onNotify('Backup JSON downloaded successfully.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || !parsed.school) {
          onNotify('Invalid backup file format.', 'info');
          return;
        }
        onUpdateState(() => parsed);
        onNotify('Backup restored successfully.');
      } catch {
        onNotify('Could not parse the selected JSON file.', 'info');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleMonth = () => {
    const monthLabel = formatMonthName(monthKey);
    onRequestConfirm({
      title: `Load sample data for ${monthLabel}?`,
      message: `This will populate realistic attendance, a holiday, opening stock (285.5 kg), and two rice receipts for ${monthLabel} so you can test charts and exports.`,
      confirmLabel: 'Load sample month',
      danger: false,
      onConfirm: () => {
        const sample = createSampleMonthEntries(monthKey);
        onUpdateState((prev) => ({
          ...prev,
          months: {
            ...prev.months,
            [monthKey]: sample.riceMonth,
          },
          m: {
            ...prev.m,
            months: {
              ...prev.m.months,
              [monthKey]: sample.master,
            },
          },
        }));
        onNotify(`Sample data loaded for ${monthLabel}.`);
      },
    });
  };

  const handleClearMonthData = () => {
    const monthLabel = formatMonthName(monthKey);
    onRequestConfirm({
      title: `Clear all records for ${monthLabel}?`,
      message: `This removes Master Attendance, meal overrides, and rice stock entries for ${monthLabel}. Your school profile, norms, and other months remain intact.`,
      confirmLabel: 'Yes, clear month',
      danger: true,
      onConfirm: () => {
        onUpdateState((prev) => {
          const nextMonths = { ...prev.months };
          delete nextMonths[monthKey];
          const nextMaster = { ...prev.m.months };
          delete nextMaster[monthKey];
          const nextP = { ...prev.p.months };
          delete nextP[monthKey];
          const nextU = { ...prev.u.months };
          delete nextU[monthKey];
          const nextL = { ...prev.l.months };
          delete nextL[monthKey];
          return {
            ...prev,
            months: nextMonths,
            m: { ...prev.m, months: nextMaster },
            p: { ...prev.p, months: nextP },
            u: { ...prev.u, months: nextU },
            l: { ...prev.l, months: nextL },
          };
        });
        onNotify(`All records cleared for ${monthLabel}.`);
      },
    });
  };

  const totalRoll = state.m.ratio.sb + state.m.ratio.ps + state.m.ratio.up;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Vibrant Gradient Profile Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-violet-700 to-emerald-700 text-white p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-display font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md">
            {initials || 'UM'}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-white truncate">{state.profile.name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-indigo-100">
              <span>{state.profile.designation}</span>
              <span aria-hidden="true">·</span>
              <span className="font-bold text-amber-300">{state.school}</span>
            </div>
            <div className="text-xs text-white/80">
              Printed on PDF &amp; Excel reports: &ldquo;Created by {state.profile.name},{' '}
              {state.profile.designation}, {state.profile.schoolShort || state.school}&rdquo;
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coordinator Profile Details */}
        <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-indigo-200 dark:border-indigo-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b-2 border-indigo-100 dark:border-indigo-900/50">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Coordinator Profile
            </h2>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={state.profile.name}
                onChange={(e) => updateProfileField('name', e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Designation
              </label>
              <input
                type="text"
                value={state.profile.designation}
                onChange={(e) => updateProfileField('designation', e.target.value)}
                className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={state.profile.email}
                  onChange={(e) => updateProfileField('email', e.target.value)}
                  placeholder="teacher@school.edu.in"
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={state.profile.phone}
                  onChange={(e) => updateProfileField('phone', e.target.value)}
                  placeholder="+91"
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Institution Details */}
        <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-200 dark:border-emerald-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b-2 border-emerald-100 dark:border-emerald-900/50">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              School Information
            </h2>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Official School Name (Synced across all sheets)
              </label>
              <input
                type="text"
                value={state.school}
                onChange={(e) => onUpdateState((prev) => ({ ...prev, school: e.target.value }))}
                className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Short Name (footer credit)
                </label>
                <input
                  type="text"
                  value={state.profile.schoolShort}
                  onChange={(e) => updateProfileField('schoolShort', e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  UDISE+ Code
                </label>
                <input
                  type="text"
                  value={state.profile.udiseCode}
                  onChange={(e) => updateProfileField('udiseCode', e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Block
                </label>
                <input
                  type="text"
                  value={state.profile.block}
                  onChange={(e) => updateProfileField('block', e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={state.profile.state}
                  onChange={(e) => updateProfileField('state', e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Session
                </label>
                <input
                  type="text"
                  value={state.profile.academicSession}
                  onChange={(e) => updateProfileField('academicSession', e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Data Backup & Device Storage Management */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-amber-300/70 dark:border-amber-800/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Local Storage &amp; Data Backup
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            Roll Strength: {totalRoll} · Saved on this device
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          All registers save automatically in your browser. Export a JSON backup regularly before
          switching devices or clearing browser history.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Export JSON Backup
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-xs transition-colors whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            Restore JSON Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportJson}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleLoadSampleMonth}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-xs transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            Load Sample Month ({formatMonthName(monthKey)})
          </button>

          <button
            type="button"
            onClick={handleClearMonthData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-xs transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            Clear {formatMonthName(monthKey)}
          </button>
        </div>
      </section>
    </div>
  );
};
