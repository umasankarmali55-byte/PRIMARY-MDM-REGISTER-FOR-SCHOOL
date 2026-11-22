import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Settings,
} from 'lucide-react';
import type { CalcMenuKey, MDMState, MealNorms } from '../types/mdm';
import {
  CALC_MENU_KEYS,
  CALC_MENU_LABELS,
  DAYS,
  defaultCalcMenu,
  defaultPrimaryNorms,
  defaultUpperNorms,
  defaultWeekdayRates,
  formatDisplayDate,
  formatINR,
  formatIsoDate,
  getAttributionLine,
  getDayOfWeek,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface CalculatorViewProps {
  state: MDMState;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
}

const GROUPS = [
  {
    stage: 'Primary',
    title: 'Shishu Batika – Class V',
    sub: 'Shishu Batika and Classes I–V',
    menuIdx: 0,
    normIdx: 0,
    cardBorder: 'border-sky-400/70 dark:border-sky-700',
    badgeColor: 'text-sky-700 dark:text-sky-400',
    inputBg: 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700',
  },
  {
    stage: 'Upper Primary',
    title: 'Classes VI–VIII',
    sub: 'Upper primary stage',
    menuIdx: 1,
    normIdx: 1,
    cardBorder: 'border-emerald-400/70 dark:border-emerald-700',
    badgeColor: 'text-emerald-700 dark:text-emerald-400',
    inputBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
  },
  {
    stage: 'Secondary',
    title: 'Class IX',
    sub: 'Same as upper primary · Rice 200 g',
    menuIdx: 1,
    normIdx: 2,
    cardBorder: 'border-indigo-400/70 dark:border-indigo-700',
    badgeColor: 'text-indigo-700 dark:text-indigo-400',
    inputBg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700',
  },
  {
    stage: 'Secondary',
    title: 'Class X',
    sub: 'Same as upper primary · Rice 200 g',
    menuIdx: 1,
    normIdx: 2,
    cardBorder: 'border-violet-400/70 dark:border-violet-700',
    badgeColor: 'text-violet-700 dark:text-violet-400',
    inputBg: 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700',
  },
] as const;

const NORM_COLS: { key: keyof MealNorms; calcKey: CalcMenuKey; label: string }[] = [
  { key: 'rice', calcKey: 'rice', label: 'Rice (g)' },
  { key: 'veg', calcKey: 'veg', label: 'Veg (g)' },
  { key: 'egg', calcKey: 'egg', label: 'Eggs' },
  { key: 'soya', calcKey: 'soya', label: 'Soya (g)' },
  { key: 'dal', calcKey: 'dal', label: 'Dal (g)' },
  { key: 'oil', calcKey: 'oil', label: 'Oil (ml)' },
  { key: 'ladoo', calcKey: 'laddoo', label: 'Laddoo' },
];

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  state,
  onUpdateState,
  onNotify,
}) => {
  const [mealDate, setMealDate] = useState(() => formatIsoDate(new Date()));
  const [showSettings, setShowSettings] = useState(false);
  const [openSec, setOpenSec] = useState({ n: true, r: true, m: false });

  const dow = getDayOfWeek(mealDate || formatIsoDate(new Date()));
  const dayName = DAYS[dow];

  const getNormForStage = (normIdx: number): MealNorms => {
    if (normIdx === 0) return state.p.norms;
    if (normIdx === 1) return state.u.norms;
    return { ...state.u.norms, rice: Number(state.sx.rice) || 0 };
  };

  const results = useMemo(() => {
    const r = { rice: 0, veg: 0, oil: 0, egg: 0, soya: 0, dal: 0, laddoo: 0 };
    let cost = 0;
    let totalChildren = 0;

    GROUPS.forEach((g, i) => {
      const count = Number(state.c.counts[i]) || 0;
      const menuDay = state.c.menus[g.menuIdx][dow];
      const norm = getNormForStage(g.normIdx);
      totalChildren += count;

      if (menuDay.rice) r.rice += count * norm.rice;
      if (menuDay.veg) r.veg += count * norm.veg;
      if (menuDay.oil) r.oil += count * norm.oil;
      if (menuDay.egg) r.egg += count * norm.egg;
      if (menuDay.soya) r.soya += count * norm.soya;
      if (menuDay.dal) r.dal += count * norm.dal;
      if (menuDay.laddoo) r.laddoo += count * norm.ladoo;
      if (menuDay.fuel) cost += count * (state.c.rates[dow]?.[g.menuIdx] || 0);
    });

    return { r, cost, totalChildren };
  }, [state, dow]);

  const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
  const kgPair = (grams: number): [string, string] =>
    grams > 0 ? [`${fmt(grams / 1000)} kg`, `${Math.round(grams).toLocaleString('en-IN')} grams`] : ['', ''];

  const requirementCards = [
    {
      code: 'R',
      title: 'Rice required',
      value: kgPair(results.r.rice)[0],
      sub: kgPair(results.r.rice)[1],
      bg: 'bg-emerald-600 text-white',
      border: 'border-emerald-400/60 dark:border-emerald-700',
    },
    {
      code: 'V',
      title: 'Vegetables',
      value: kgPair(results.r.veg)[0],
      sub: kgPair(results.r.veg)[1],
      bg: 'bg-green-600 text-white',
      border: 'border-green-400/60 dark:border-green-700',
    },
    {
      code: 'E',
      title: 'Eggs',
      value: results.r.egg ? `${fmt(results.r.egg)} pieces` : '',
      sub: results.r.egg ? 'Active on menu today' : '',
      bg: 'bg-amber-500 text-slate-950',
      border: 'border-amber-400/60 dark:border-amber-700',
    },
    {
      code: 'S',
      title: 'Soya chunks',
      value: kgPair(results.r.soya)[0],
      sub: kgPair(results.r.soya)[1],
      bg: 'bg-orange-600 text-white',
      border: 'border-orange-400/60 dark:border-orange-700',
    },
    {
      code: 'D',
      title: 'Dal required',
      value: kgPair(results.r.dal)[0],
      sub: kgPair(results.r.dal)[1],
      bg: 'bg-sky-600 text-white',
      border: 'border-sky-400/60 dark:border-sky-700',
    },
    {
      code: 'O',
      title: 'Oil required',
      value: results.r.oil ? `${fmt(results.r.oil)} ml` : '',
      sub: results.r.oil ? `${fmt(results.r.oil / 1000)} litres` : '',
      bg: 'bg-indigo-600 text-white',
      border: 'border-indigo-400/60 dark:border-indigo-700',
    },
    {
      code: 'L',
      title: 'Laddoo required',
      value: results.r.laddoo ? `${fmt(results.r.laddoo)} pieces` : '',
      sub: results.r.laddoo ? 'One per student by default' : '',
      bg: 'bg-rose-600 text-white',
      border: 'border-rose-400/60 dark:border-rose-700',
    },
  ];

  const updateCount = (idx: number, val: string) => {
    onUpdateState((prev) => {
      const counts = [...prev.c.counts] as [string, string, string, string];
      counts[idx] = val;
      return { ...prev, c: { ...prev.c, counts } };
    });
  };

  const updateNorm = (stageIdx: number, key: keyof MealNorms, val: string) => {
    const num = Number(val) || 0;
    onUpdateState((prev) => {
      if (stageIdx === 2) {
        return { ...prev, sx: { ...prev.sx, rice: num } };
      }
      const target = stageIdx === 0 ? 'p' : 'u';
      return {
        ...prev,
        [target]: {
          ...prev[target],
          norms: { ...prev[target].norms, [key]: num },
        },
      };
    });
  };

  const updateRate = (w: number, groupIdx: 0 | 1, val: string) => {
    onUpdateState((prev) => {
      const rates = prev.c.rates.map((pair, i) =>
        i === w
          ? ([groupIdx === 0 ? Number(val) || 0 : pair[0], groupIdx === 1 ? Number(val) || 0 : pair[1]] as [
              number,
              number,
            ])
          : pair
      );
      return { ...prev, c: { ...prev.c, rates } };
    });
  };

  const toggleCalcMenu = (menuIdx: 0 | 1, w: number, key: CalcMenuKey, checked: boolean) => {
    onUpdateState((prev) => {
      const menus = prev.c.menus.map((mList, mi) =>
        mi === menuIdx
          ? mList.map((dObj, di) => (di === w ? { ...dObj, [key]: checked } : dObj))
          : mList
      ) as [typeof prev.c.menus[0], typeof prev.c.menus[1]];
      return { ...prev, c: { ...prev.c, menus } };
    });
  };

  const handleExport = (type: 'xlsx' | 'pdf') => {
    const body = [
      [c('Meal date'), c(formatDisplayDate(mealDate)), c('')],
      [c('Day'), c(dayName), c('')],
      ...GROUPS.map((g, i) => [c(`${g.stage} – ${g.title}`), c(state.c.counts[i] || '0'), c('children')]),
      [c('Total children'), c(results.totalChildren), c('')],
      ...requirementCards.map((rc) => [c(rc.title), c(rc.value || '—'), c(rc.sub || '')]),
      [c('Estimated cooking cost (₹)'), c(formatINR(results.cost, 0)), c(`Rates for ${dayName}`)],
    ];

    const meta = {
      school: state.school,
      title: `MDM Calculator — Daily report ${formatDisplayDate(mealDate)}`,
      by: getAttributionLine(state),
      sheet: 'Daily report',
      left: true,
    };

    const tableData = { head: [[c('Item'), c('Quantity'), c('Details')]], body, foot: [] };
    if (type === 'xlsx') exportToExcel(meta, tableData, `MDM Daily Report ${formatDisplayDate(mealDate)}`);
    else exportToPdf(meta, tableData, `MDM Daily Report ${formatDisplayDate(mealDate)}`);
    onNotify(`Exported Daily Report (${type.toUpperCase()}).`);
  };

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`MDM Daily Meal Report — ${formatDisplayDate(mealDate)} (${dayName})`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Violet-Fuchsia Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint">
        <div>
          <div className="text-xs font-bold text-amber-300">
            Instant Kitchen Estimator · Classes SB to X
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Sheet 5 · Daily Meal Planner
          </h1>
          <p className="text-sm text-purple-100 mt-1">
            Enter children taking meals for any date to compute exact raw food quantities and
            estimated cooking cost.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors whitespace-nowrap ${
            showSettings
              ? 'bg-slate-950 text-amber-300'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
          }`}
        >
          <Settings className="h-4 w-4" />
          {showSettings ? 'Hide Norms & Costs' : 'Show Norms & Costs'}
        </button>
      </section>

      {/* School & Meal Date */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-violet-500/30 p-5 noprint">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              School Name
            </label>
            <input
              type="text"
              value={state.school}
              onChange={(e) => onUpdateState((prev) => ({ ...prev, school: e.target.value }))}
              className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-violet-700 dark:text-violet-300 mb-1.5">
              Meal Date ({dayName})
            </label>
            <input
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="w-full rounded-lg border-2 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/30 px-3 py-2 text-sm font-mono font-bold"
            />
          </div>
        </div>
      </section>

      {/* 4 Colorful Stage Count Inputs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {GROUPS.map((g, idx) => (
          <div
            key={g.title}
            className={`rounded-2xl bg-white dark:bg-[#111B24] border-2 ${g.cardBorder} p-5 shadow-xs`}
          >
            <div className={`text-xs font-extrabold uppercase tracking-wide ${g.badgeColor}`}>
              {g.stage}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              {g.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">{g.sub}</p>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Number of children
            </label>
            <input
              type="number"
              min={0}
              value={state.c.counts[idx]}
              onChange={(e) => updateCount(idx, e.target.value)}
              placeholder="0"
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-2xl font-mono font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none ${g.inputBg}`}
            />
          </div>
        ))}
      </section>

      {/* Collapsible Bold-Grid Settings Tables */}
      {showSettings && (
        <div className="space-y-4 noprint">
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-indigo-400/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSec((s) => ({ ...s, n: !s.n }))}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left font-bold text-sm bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
            >
              <span>Per-Child Food Norms</span>
              {openSec.n ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {openSec.n && (
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Class IX &amp; X use the same norms as VI–VIII, except rice (200 g default).
                </p>
                <div className="overflow-x-auto">
                  <table className="mdm-grid-table mdm-grid-indigo min-w-[640px] text-xs">
                    <thead>
                      <tr>
                        <th className="py-2.5 px-3 text-left">Group</th>
                        {NORM_COLS.map((nc) => (
                          <th key={nc.key} className="py-2.5 px-2 text-center">
                            {nc.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Shishu Batika–V', 'VI–VIII', 'IX–X (Secondary)'].map((label, sIdx) => {
                        const n = getNormForStage(sIdx);
                        return (
                          <tr key={label}>
                            <td className="py-2 px-3 font-bold">{label}</td>
                            {NORM_COLS.map((nc) => (
                              <td key={nc.key} className="py-1.5 px-1.5 text-center">
                                <input
                                  type="number"
                                  step="any"
                                  readOnly={sIdx === 2 && nc.key !== 'rice'}
                                  value={n[nc.key]}
                                  onChange={(e) => updateNorm(sIdx, nc.key, e.target.value)}
                                  className="w-16 rounded border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-[#0B1117] px-1.5 py-1 text-center font-mono font-bold tabular-nums read-only:opacity-50"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      p: { ...prev.p, norms: { ...prev.p.norms, ...defaultPrimaryNorms() } },
                      u: { ...prev.u, norms: { ...prev.u.norms, ...defaultUpperNorms() } },
                      sx: { rice: 200 },
                    }));
                    onNotify('Restored default food norms.');
                  }}
                  className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  Restore default food norms
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-sky-400/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSec((s) => ({ ...s, r: !s.r }))}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left font-bold text-sm bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200"
            >
              <span>Weekday-Wise Cooking Cost Rates (₹ / student)</span>
              {openSec.r ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {openSec.r && (
              <div className="p-5 space-y-3">
                <div className="overflow-x-auto">
                  <table className="mdm-grid-table mdm-grid-blue min-w-[420px] text-xs">
                    <thead>
                      <tr>
                        <th className="py-2.5 px-3 text-left">Day</th>
                        <th className="py-2.5 px-2 text-center">Primary (₹/student)</th>
                        <th className="py-2.5 px-2 text-center">Upper Primary / VI–X (₹/student)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 0].map((w) => (
                        <tr key={w}>
                          <td className="py-2 px-3 font-bold">{DAYS[w]}</td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={state.c.rates[w][0]}
                              onChange={(e) => updateRate(w, 0, e.target.value)}
                              className="w-24 rounded border-2 border-sky-200 dark:border-sky-800 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono font-bold tabular-nums"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={state.c.rates[w][1]}
                              onChange={(e) => updateRate(w, 1, e.target.value)}
                              className="w-24 rounded border-2 border-sky-200 dark:border-sky-800 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono font-bold tabular-nums"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      c: { ...prev.c, rates: defaultWeekdayRates() },
                    }));
                    onNotify('Restored default weekday cost rates.');
                  }}
                  className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline"
                >
                  Restore default weekday cost rates
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-400/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSec((s) => ({ ...s, m: !s.m }))}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left font-bold text-sm bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200"
            >
              <span>Weekly MDM Menu (Primary &amp; Upper Stage)</span>
              {openSec.m ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {openSec.m && (
              <div className="p-5 space-y-5">
                {[
                  { title: 'Shishu Batika + Primary (Class I–V)', idx: 0 as const },
                  { title: 'Upper Primary + Secondary (Classes VI–X)', idx: 1 as const },
                ].map((mCfg) => (
                  <div key={mCfg.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold">{mCfg.title}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateState((prev) => {
                            const menus = [...prev.c.menus] as [
                              typeof prev.c.menus[0],
                              typeof prev.c.menus[1],
                            ];
                            menus[mCfg.idx] = defaultCalcMenu();
                            return { ...prev, c: { ...prev.c, menus } };
                          });
                          onNotify(`Restored default menu for ${mCfg.title}.`);
                        }}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Restore default
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="mdm-grid-table min-w-[560px] text-xs">
                        <thead>
                          <tr>
                            <th className="py-2.5 px-3 text-left">Day</th>
                            {CALC_MENU_KEYS.map((k) => (
                              <th key={k} className="py-2.5 px-2 text-center">
                                {CALC_MENU_LABELS[k]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.map((dName, w) => (
                            <tr key={dName}>
                              <td className="py-2 px-3 font-bold">{dName}</td>
                              {CALC_MENU_KEYS.map((k) => (
                                <td key={k} className="py-2 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(state.c.menus[mCfg.idx][w]?.[k])}
                                    onChange={(e) => toggleCalcMenu(mCfg.idx, w, k, e.target.checked)}
                                    className="h-4 w-4 accent-emerald-700 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Vibrant Total Children + Estimated Cooking Cost Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 flex items-center justify-between gap-4 shadow-md">
          <div>
            <div className="text-xs font-bold text-emerald-100">Total Children Taking Meals</div>
            <div className="mt-1 font-mono text-4xl font-extrabold tabular-nums">
              {results.totalChildren.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-xs text-emerald-100/90">
              Across SB–V, VI–VIII, Class IX &amp; Class X
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-amber-300">Schedule</div>
            <div className="text-lg font-extrabold">{dayName}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 flex items-center justify-between gap-4 shadow-md">
          <div>
            <div className="text-xs font-bold text-amber-50">Estimated Cooking Cost</div>
            <div className="mt-1 font-mono text-4xl font-extrabold tabular-nums">
              {formatINR(results.cost, 0)}
            </div>
            <div className="mt-1 text-xs text-amber-50/90">
              Rates for {dayName}, based on your configured schedule
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 noprint">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Daily Requirement — {dayName}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Only items enabled in {dayName}&apos;s weekly menu are counted; inactive items remain
            blank.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({ ...prev, c: { ...prev.c, counts: ['', '', '', ''] } }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Counts
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Daily Report
          </button>
        </div>
      </div>

      {/* Colorful Requirement Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {requirementCards.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${
              item.value
                ? `bg-white dark:bg-[#111B24] ${item.border} shadow-xs`
                : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center font-display font-extrabold text-base shrink-0 shadow-xs ${
                item.value ? item.bg : 'bg-slate-300 dark:bg-slate-800 text-slate-600'
              }`}
            >
              {item.code}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {item.title}
              </div>
              <div className="font-mono text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5 truncate">
                {item.value || '—'}
              </div>
              {item.sub && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {item.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
