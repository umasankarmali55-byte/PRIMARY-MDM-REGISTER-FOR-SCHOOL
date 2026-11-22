import React, { useMemo, useState } from 'react';
import { CalendarOff, ChevronDown, ChevronUp, Download, FileSpreadsheet, Printer } from 'lucide-react';
import type { MDMState, RiceMonthData } from '../types/mdm';
import {
  DAYS,
  calcRiceRegister,
  calcRiceSeparate,
  f3,
  formatIsoDate,
  formatMonthName,
  formatShortDate,
  getAttributionLine,
  getDayOfWeek,
  getEffectiveRiceRates,
  getLinkedAttendance,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface RiceRegisterViewProps {
  state: MDMState;
  monthKey: string;
  onChangeMonthKey: (key: string) => void;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
}

export const RiceRegisterView: React.FC<RiceRegisterViewProps> = ({
  state,
  monthKey,
  onChangeMonthKey,
  onUpdateState,
  onNotify,
}) => {
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [formDate, setFormDate] = useState(() => {
    const today = formatIsoDate(new Date());
    return today.startsWith(monthKey) ? today : `${monthKey}-01`;
  });
  const [formSb, setFormSb] = useState('');
  const [formPr, setFormPr] = useState('');
  const [formUp, setFormUp] = useState('');
  const [formRc, setFormRc] = useState('');

  const monthName = formatMonthName(monthKey);
  const isSeparate = state.rmode === 's';
  const monthData: RiceMonthData = state.months[monthKey] || { opening: 0, entries: [] };
  const effectiveRates = getEffectiveRiceRates(state);

  const combinedRows = useMemo(() => calcRiceRegister(state, monthKey), [state, monthKey]);
  const separateData = useMemo(() => calcRiceSeparate(state, monthKey), [state, monthKey]);

  const combinedTotals = useMemo(() => {
    const sb = combinedRows.reduce((a, r) => a + r.sb, 0);
    const pr = combinedRows.reduce((a, r) => a + r.pr, 0);
    const up = combinedRows.reduce((a, r) => a + r.up, 0);
    const rc = combinedRows.reduce((a, r) => a + r.rc, 0);
    const consumed = combinedRows.reduce((a, r) => a + r.consumption, 0);
    const opening = Number(monthData.opening) || 0;
    return { sb, pr, up, opening, rc, consumed, closing: opening + rc - consumed };
  }, [combinedRows, monthData.opening]);

  const activeFormDate = formDate.startsWith(monthKey) ? formDate : `${monthKey}-01`;
  const linkedForForm = getLinkedAttendance(state, activeFormDate);
  const formPreview = useMemo(() => {
    const prevRows = combinedRows.filter((r) => r.date < activeFormDate);
    const prev = prevRows[prevRows.length - 1];
    const opening = prev ? prev.closing : Number(monthData.opening) || 0;
    let consumption = 0;
    if (linkedForForm) {
      const match = combinedRows.find((r) => r.date === activeFormDate);
      consumption = match ? match.consumption : 0;
    } else {
      consumption =
        (Number(formSb) || 0) * effectiveRates[0] +
        (Number(formPr) || 0) * effectiveRates[1] +
        (Number(formUp) || 0) * effectiveRates[2];
    }
    const rc = Number(formRc) || 0;
    return { opening, consumption, closing: opening + rc - consumption };
  }, [
    combinedRows,
    activeFormDate,
    monthData.opening,
    linkedForForm,
    formSb,
    formPr,
    formUp,
    formRc,
    effectiveRates,
  ]);

  const setOpening = (val: string) => {
    onUpdateState((prev) => {
      const existing = prev.months[monthKey] || { opening: 0, entries: [] };
      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: { ...existing, opening: Number(val) || 0 },
        },
      };
    });
  };

  const setRateOverride = (idx: 0 | 1 | 2, val: string) => {
    onUpdateState((prev) => {
      const nextRr: [number | null, number | null, number | null] = [
        ...(prev.rr || [null, null, null]),
      ] as [number | null, number | null, number | null];
      nextRr[idx] = val === '' ? null : Number(val);
      return { ...prev, rr: nextRr };
    });
  };

  const updateInlineRiceReceived = (dt: string, val: string) => {
    onUpdateState((prev) => {
      const existing = prev.months[monthKey] || { opening: 0, entries: [] };
      const entries = [...(existing.entries || [])];
      const idx = entries.findIndex((e) => e.date === dt);
      const rcNum = Number(val) || 0;

      if (idx === -1) {
        if (val !== '') entries.push({ date: dt, sb: 0, pr: 0, up: 0, rc: rcNum });
      } else {
        const cur = { ...entries[idx], rc: rcNum };
        if (val === '' && !cur.sb && !cur.pr && !cur.up) {
          entries.splice(idx, 1);
        } else {
          entries[idx] = cur;
        }
      }

      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: { ...existing, entries },
        },
      };
    });
  };

  const handleSaveDailyForm = () => {
    const newEntry = {
      date: activeFormDate,
      sb: linkedForForm ? linkedForForm.sb : Number(formSb) || 0,
      pr: linkedForForm ? linkedForForm.pr : Number(formPr) || 0,
      up: linkedForForm ? linkedForForm.up : Number(formUp) || 0,
      rc: Number(formRc) || 0,
    };
    onUpdateState((prev) => {
      const existing = prev.months[monthKey] || { opening: 0, entries: [] };
      const filtered = (existing.entries || []).filter((e) => e.date !== activeFormDate);
      filtered.push(newEntry);
      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: { ...existing, entries: filtered },
        },
      };
    });
    setFormSb('');
    setFormPr('');
    setFormUp('');
    setFormRc('');
    onNotify(`Saved rice entry for ${formatShortDate(activeFormDate)}.`);
  };

  const updateSeparateOpening = (group: 'openP' | 'openU', val: string) => {
    onUpdateState((prev) => {
      const existing = prev.months[monthKey] || { opening: 0, entries: [] };
      const sep = existing.sep || { openP: 0, openU: 0, rcP: {}, rcU: {} };
      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: {
            ...existing,
            sep: { ...sep, [group]: Number(val) || 0 },
          },
        },
      };
    });
  };

  const updateSeparateReceipt = (group: 'P' | 'U', dt: string, val: string) => {
    onUpdateState((prev) => {
      const existing = prev.months[monthKey] || { opening: 0, entries: [] };
      const sep = existing.sep || { openP: 0, openU: 0, rcP: {}, rcU: {} };
      const mapKey = group === 'P' ? 'rcP' : 'rcU';
      const nextMap = { ...(sep[mapKey] || {}) };
      if (val === '') delete nextMap[dt];
      else nextMap[dt] = Number(val) || 0;
      return {
        ...prev,
        months: {
          ...prev.months,
          [monthKey]: {
            ...existing,
            sep: { ...sep, [mapKey]: nextMap },
          },
        },
      };
    });
  };

  const exportCombined = (type: 'xlsx' | 'pdf') => {
    const head = [
      [
        c('Date'),
        c('Day'),
        c('SB'),
        c('Primary'),
        c('Upper Pry'),
        c('Opening (kg)'),
        c('Rice received (kg)'),
        c('Consumption (kg)'),
        c('Closing (kg)'),
      ],
    ];
    const body = combinedRows.map((r) =>
      r.holiday
        ? [
            c(formatShortDate(r.date)),
            c(DAYS[r.dow]),
            c(`HOLIDAY — ${r.holiday}`, 3),
            c(f3(r.opening)),
            c(r.rc ? f3(r.rc) : ''),
            c('–'),
            c(f3(r.closing)),
          ]
        : [
            c(formatShortDate(r.date)),
            c(DAYS[r.dow]),
            c(r.sb || ''),
            c(r.pr || ''),
            c(r.up || ''),
            c(f3(r.opening)),
            c(r.rc ? f3(r.rc) : ''),
            c(r.consumption ? f3(r.consumption) : ''),
            c(f3(r.closing)),
          ]
    );
    const foot = [
      [
        c('MONTH TOTAL', 2),
        c(combinedTotals.sb),
        c(combinedTotals.pr),
        c(combinedTotals.up),
        c(f3(combinedTotals.opening)),
        c(f3(combinedTotals.rc)),
        c(f3(combinedTotals.consumed)),
        c(f3(combinedTotals.closing)),
      ],
    ];
    const meta = {
      school: state.school,
      title: `Rice Stock Register — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };
    if (type === 'xlsx') exportToExcel(meta, { head, body, foot }, `Rice Stock Register ${monthName}`);
    else exportToPdf(meta, { head, body, foot }, `Rice Stock Register ${monthName}`);
    onNotify(`Exported Rice Stock Register (${type.toUpperCase()}).`);
  };

  const exportSeparate = (target: 'summary' | 'P' | 'U', type: 'xlsx' | 'pdf') => {
    let label = 'Rice Register Summary';
    let head = [[] as ReturnType<typeof c>[]];
    let body = [[] as ReturnType<typeof c>[]];
    let foot: ReturnType<typeof c>[][] = [];

    if (target === 'summary') {
      const { totalsP, totalsU } = separateData;
      head = [[c('Group'), c('Opening (kg)'), c('Rice received (kg)'), c('Consumed (kg)'), c('Closing balance (kg)')]];
      body = [
        [c('SB + Primary'), c(f3(totalsP.open)), c(f3(totalsP.rc)), c(f3(totalsP.consumed)), c(f3(totalsP.closing))],
        [c('Upper Primary'), c(f3(totalsU.open)), c(f3(totalsU.rc)), c(f3(totalsU.consumed)), c(f3(totalsU.closing))],
        [
          c('BOTH TOGETHER'),
          c(f3(totalsP.open + totalsU.open)),
          c(f3(totalsP.rc + totalsU.rc)),
          c(f3(totalsP.consumed + totalsU.consumed)),
          c(f3(totalsP.closing + totalsU.closing)),
        ],
      ];
    } else if (target === 'P') {
      label = 'Rice Register SB + Primary';
      head = [[c('Date'), c('Day'), c('SB'), c('Primary'), c('Opening (kg)'), c('Rice received (kg)'), c('Consumption (kg)'), c('Closing (kg)')]];
      body = separateData.rowsP.map((r) =>
        r.holiday
          ? [
              c(formatShortDate(r.date)),
              c(DAYS[r.dow]),
              c(`HOLIDAY — ${r.holiday}`, 2),
              c(f3(r.opening)),
              c(r.rc ? f3(r.rc) : ''),
              c('–'),
              c(f3(r.closing)),
            ]
          : [
              c(formatShortDate(r.date)),
              c(DAYS[r.dow]),
              c(r.sb || ''),
              c(r.pr || ''),
              c(f3(r.opening)),
              c(r.rc ? f3(r.rc) : ''),
              c(r.consumption ? f3(r.consumption) : ''),
              c(f3(r.closing)),
            ]
      );
      const t = separateData.totalsP;
      foot = [[c('MONTH TOTAL', 2), c(t.sb), c(t.pr), c(f3(t.open)), c(f3(t.rc)), c(f3(t.consumed)), c(f3(t.closing))]];
    } else {
      label = 'Rice Register Upper Primary';
      head = [[c('Date'), c('Day'), c('Upper Pry'), c('Opening (kg)'), c('Rice received (kg)'), c('Consumption (kg)'), c('Closing (kg)')]];
      body = separateData.rowsU.map((r) =>
        r.holiday
          ? [
              c(formatShortDate(r.date)),
              c(DAYS[r.dow]),
              c(`HOLIDAY — ${r.holiday}`),
              c(f3(r.opening)),
              c(r.rc ? f3(r.rc) : ''),
              c('–'),
              c(f3(r.closing)),
            ]
          : [
              c(formatShortDate(r.date)),
              c(DAYS[r.dow]),
              c(r.up || ''),
              c(f3(r.opening)),
              c(r.rc ? f3(r.rc) : ''),
              c(r.consumption ? f3(r.consumption) : ''),
              c(f3(r.closing)),
            ]
      );
      const t = separateData.totalsU;
      foot = [[c('MONTH TOTAL', 2), c(t.up), c(f3(t.open)), c(f3(t.rc)), c(f3(t.consumed)), c(f3(t.closing))]];
    }

    const meta = {
      school: state.school,
      title: `${label} — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };
    if (type === 'xlsx') exportToExcel(meta, { head, body, foot }, `${label} ${monthName}`);
    else exportToPdf(meta, { head, body, foot }, `${label} ${monthName}`);
    onNotify(`Exported ${label} (${type.toUpperCase()}).`);
  };

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`MDM Rice Stock Register — ${monthName}`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Teal-Emerald Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-teal-700 via-emerald-700 to-green-700 text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint">
        <div>
          <div className="text-xs font-bold text-amber-300">
            Physical Grain Ledger · Auto-Chained Closing Balance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Sheet 4 · Rice Stock Register
          </h1>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/25 border border-white/20">
          <button
            type="button"
            onClick={() => onUpdateState((prev) => ({ ...prev, rmode: 'c' }))}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              !isSeparate
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-white/85 hover:text-white'
            }`}
          >
            Option 1 · Combined Register
          </button>
          <button
            type="button"
            onClick={() => onUpdateState((prev) => ({ ...prev, rmode: 's' }))}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              isSeparate
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-white/85 hover:text-white'
            }`}
          >
            Option 2 · Separate SB+P &amp; UP
          </button>
        </div>
      </section>

      {/* Controls Card */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-600/30 p-5 space-y-4 noprint">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
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
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              Month
            </label>
            <input
              type="month"
              value={monthKey}
              onChange={(e) => e.target.value && onChangeMonthKey(e.target.value)}
              className="w-full rounded-lg border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 px-3 py-2 text-sm font-mono font-bold"
            />
          </div>
          {!isSeparate && (
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                Opening Balance on 1st (kg) — actual physical counted stock
              </label>
              <input
                type="number"
                step="0.001"
                value={monthData.opening}
                onChange={(e) => setOpening(e.target.value)}
                className="w-full rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-sm font-mono font-extrabold tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="pt-3 border-t-2 border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Rice Per Child Rate (kg)
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Clear a box to follow the norms on Sheets 1 and 2 automatically
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Shishu Batika', 'Primary (1–5)', 'Upper Pry (6–8)'] as const).map((label, idx) => (
              <div key={label}>
                <label className="block text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={state.rr?.[idx] ?? ''}
                  placeholder={String(effectiveRates[idx])}
                  onChange={(e) => setRateOverride(idx as 0 | 1 | 2, e.target.value)}
                  className="w-full rounded-lg border-2 border-teal-200 dark:border-teal-800 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPTION 1: COMBINED REGISTER */}
      {!isSeparate && (
        <>
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-500/30 overflow-hidden noprint">
            <button
              type="button"
              onClick={() => setShowDailyForm((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left text-sm font-bold text-teal-900 dark:text-teal-200 bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100/70 dark:hover:bg-teal-950/50 transition-colors"
            >
              <span>Daily Entry Form (Optional manual entry / receipt logger)</span>
              {showDailyForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDailyForm && (
              <div className="p-5 border-t-2 border-teal-100 dark:border-teal-900/50 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={activeFormDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Day
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={DAYS[getDayOfWeek(activeFormDate)]}
                      className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-2 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Shishu Batika
                    </label>
                    <input
                      type="number"
                      min={0}
                      readOnly={Boolean(linkedForForm)}
                      value={linkedForForm ? linkedForForm.sb : formSb}
                      onChange={(e) => setFormSb(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-2.5 py-2 text-xs font-mono read-only:bg-slate-100 dark:read-only:bg-slate-800/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Primary (1–5)
                    </label>
                    <input
                      type="number"
                      min={0}
                      readOnly={Boolean(linkedForForm)}
                      value={linkedForForm ? linkedForForm.pr : formPr}
                      onChange={(e) => setFormPr(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-2.5 py-2 text-xs font-mono read-only:bg-slate-100 dark:read-only:bg-slate-800/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Upper Pry (6–8)
                    </label>
                    <input
                      type="number"
                      min={0}
                      readOnly={Boolean(linkedForForm)}
                      value={linkedForForm ? linkedForForm.up : formUp}
                      onChange={(e) => setFormUp(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-2.5 py-2 text-xs font-mono read-only:bg-slate-100 dark:read-only:bg-slate-800/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                      Rice Received (kg)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={formRc}
                      onChange={(e) => setFormRc(e.target.value)}
                      placeholder="0.000"
                      className="w-full rounded-lg border-2 border-emerald-400 dark:border-emerald-700 bg-white dark:bg-[#0B1117] px-2.5 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-3 text-center font-mono tabular-nums">
                  <div>
                    <div className="font-sans text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Opening
                    </div>
                    <div className="text-sm font-extrabold">{f3(formPreview.opening)} kg</div>
                  </div>
                  <div>
                    <div className="font-sans text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Consumption
                    </div>
                    <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400">
                      {f3(formPreview.consumption)} kg
                    </div>
                  </div>
                  <div>
                    <div className="font-sans text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Closing
                    </div>
                    <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                      {f3(formPreview.closing)} kg
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {linkedForForm
                      ? 'Attendance for this date is linked from Master Attendance. Enter only Rice Received if any.'
                      : 'Enter attendance and rice received for this date.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveDailyForm}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Colorful 4 KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 noprint">
            <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 shadow-sm">
              <div className="text-xs font-bold text-sky-100">Opening Stock</div>
              <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
                {f3(combinedTotals.opening)} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-sm">
              <div className="text-xs font-bold text-emerald-100">Total Received</div>
              <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
                {f3(combinedTotals.rc)} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-sm">
              <div className="text-xs font-bold text-amber-50">Total Consumed</div>
              <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
                {f3(combinedTotals.consumed)} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
            <div
              className={`rounded-xl bg-gradient-to-br ${
                combinedTotals.closing < 0
                  ? 'from-rose-600 to-red-700'
                  : 'from-indigo-600 to-violet-700'
              } text-white p-4 shadow-sm`}
            >
              <div className="text-xs font-bold text-white/90">Closing Balance</div>
              <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
                {f3(combinedTotals.closing)} <span className="text-xs font-normal">kg</span>
              </div>
            </div>
          </section>

          {/* Bold Grid Combined Rice Stock Table */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-600/40 dark:border-teal-500/40 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Monthly Register — {monthName}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 noprint">
                  Type rice received (kg) directly on the arrival date; opening, consumption and
                  closing recalculate instantly.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 noprint">
                <button
                  type="button"
                  onClick={() => exportCombined('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportCombined('pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-teal min-w-[820px] text-xs">
                <thead>
                  <tr className="uppercase">
                    <th className="py-3 px-4 text-left sticky left-0 z-10">Date</th>
                    <th className="py-3 px-2 text-left">Day</th>
                    <th className="py-3 px-2 text-right">SB</th>
                    <th className="py-3 px-2 text-right">Primary</th>
                    <th className="py-3 px-2 text-right">Upper Pry</th>
                    <th className="py-3 px-3 text-right">Opening (kg)</th>
                    <th className="py-3 px-3 text-center">Rice Received (kg)</th>
                    <th className="py-3 px-3 text-right">Consumption (kg)</th>
                    <th className="py-3 px-4 text-right">Closing (kg)</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {combinedRows.map((r) => (
                    <tr
                      key={r.date}
                      className={r.holiday ? 'row-hol' : r.dow === 0 ? 'row-sun' : ''}
                    >
                      <td className="py-2 px-4 whitespace-nowrap sticky left-0 bg-inherit font-bold">
                        {formatShortDate(r.date)}
                      </td>
                      <td className="py-2 px-2 font-sans font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{DAYS[r.dow].slice(0, 3)}</span>
                          {r.holiday && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Holiday
                            </span>
                          )}
                        </div>
                      </td>
                      {r.holiday ? (
                        <td
                          colSpan={3}
                          className="py-2 px-3 font-sans bg-rose-100/90 dark:bg-rose-950/40"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                            <CalendarOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="truncate">{r.holiday}</span>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-2 text-right">{r.sb || '–'}</td>
                          <td className="py-2 px-2 text-right">{r.pr || '–'}</td>
                          <td className="py-2 px-2 text-right">{r.up || '–'}</td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-semibold">{f3(r.opening)}</td>
                      <td className="py-1.5 px-2 text-center bg-emerald-50/50 dark:bg-emerald-950/20">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder="–"
                          value={r.rc || ''}
                          onChange={(e) => updateInlineRiceReceived(r.date, e.target.value)}
                          className="w-24 rounded border-2 border-emerald-400/80 dark:border-emerald-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-center text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-800 dark:text-amber-300">
                        {r.consumption ? f3(r.consumption) : '–'}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-extrabold ${
                          r.closing < 0
                            ? 'text-red-700 dark:text-red-400 bg-red-50/70 dark:bg-red-950/30'
                            : 'text-teal-950 dark:text-teal-200 bg-teal-50/50 dark:bg-teal-950/20'
                        }`}
                      >
                        {f3(r.closing)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-mono text-xs tabular-nums">
                    <td colSpan={2} className="py-3 px-4 font-sans uppercase tracking-wider">
                      Month Total
                    </td>
                    <td className="py-3 px-2 text-right">{combinedTotals.sb}</td>
                    <td className="py-3 px-2 text-right">{combinedTotals.pr}</td>
                    <td className="py-3 px-2 text-right">{combinedTotals.up}</td>
                    <td className="py-3 px-3 text-right">{f3(combinedTotals.opening)}</td>
                    <td className="py-3 px-3 text-center">{f3(combinedTotals.rc)}</td>
                    <td className="py-3 px-3 text-right">{f3(combinedTotals.consumed)}</td>
                    <td className="py-3 px-4 text-right">{f3(combinedTotals.closing)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {/* OPTION 2: SEPARATE REGISTERS */}
      {isSeparate && (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-500/35 p-5 noprint">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Opening Balances — Separate Registers (1st of {monthName})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-sky-700 dark:text-sky-300 mb-1">
                  SB + Primary Opening Balance (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={separateData.openP}
                  onChange={(e) => updateSeparateOpening('openP', e.target.value)}
                  className="w-full rounded-lg border-2 border-sky-300 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/20 px-3 py-2 text-sm font-mono font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                  Upper Primary Opening Balance (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={separateData.openU}
                  onChange={(e) => updateSeparateOpening('openU', e.target.value)}
                  className="w-full rounded-lg border-2 border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 px-3 py-2 text-sm font-mono font-bold tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Bold Grid Summary Table */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-600/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Rice Register Summary — {monthName}
              </h2>
              <div className="flex flex-wrap gap-2 noprint">
                <button
                  type="button"
                  onClick={() => exportSeparate('summary', 'xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportSeparate('summary', 'pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-teal min-w-[600px] text-xs font-mono tabular-nums">
                <thead>
                  <tr className="font-sans uppercase">
                    <th className="py-3 px-4 text-left">Group</th>
                    <th className="py-3 px-3 text-right">Opening (kg)</th>
                    <th className="py-3 px-3 text-right">Rice Received (kg)</th>
                    <th className="py-3 px-3 text-right">Consumed (kg)</th>
                    <th className="py-3 px-4 text-right">Closing Balance (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-sky-900 dark:text-sky-200">
                      SB + Primary
                    </td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsP.open)}</td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsP.rc)}</td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsP.consumed)}</td>
                    <td className="py-2.5 px-4 text-right font-extrabold">
                      {f3(separateData.totalsP.closing)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-indigo-900 dark:text-indigo-200">
                      Upper Primary
                    </td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsU.open)}</td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsU.rc)}</td>
                    <td className="py-2.5 px-3 text-right">{f3(separateData.totalsU.consumed)}</td>
                    <td className="py-2.5 px-4 text-right font-extrabold">
                      {f3(separateData.totalsU.closing)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-3 px-4 font-sans uppercase">Both Together</td>
                    <td className="py-3 px-3 text-right">
                      {f3(separateData.totalsP.open + separateData.totalsU.open)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f3(separateData.totalsP.rc + separateData.totalsU.rc)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f3(separateData.totalsP.consumed + separateData.totalsU.consumed)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {f3(separateData.totalsP.closing + separateData.totalsU.closing)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Bold Blue Grid SB + Primary Separate Table */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-sky-600/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-extrabold text-sky-900 dark:text-sky-200">
                SB + Primary Rice Register — {monthName}
              </h2>
              <div className="flex flex-wrap gap-2 noprint">
                <button
                  type="button"
                  onClick={() => exportSeparate('P', 'xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportSeparate('P', 'pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-blue min-w-[740px] text-xs font-mono tabular-nums">
                <thead>
                  <tr className="font-sans uppercase">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-2 text-left">Day</th>
                    <th className="py-3 px-2 text-right">SB</th>
                    <th className="py-3 px-2 text-right">Primary</th>
                    <th className="py-3 px-3 text-right">Opening (kg)</th>
                    <th className="py-3 px-3 text-center">Rice Received (kg)</th>
                    <th className="py-3 px-3 text-right">Consumption (kg)</th>
                    <th className="py-3 px-4 text-right">Closing (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {separateData.rowsP.map((r) => (
                    <tr
                      key={r.date}
                      className={r.holiday ? 'row-hol' : r.dow === 0 ? 'row-sun' : ''}
                    >
                      <td className="py-2 px-4 font-bold whitespace-nowrap">
                        {formatShortDate(r.date)}
                      </td>
                      <td className="py-2 px-2 font-sans font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{DAYS[r.dow].slice(0, 3)}</span>
                          {r.holiday && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Holiday
                            </span>
                          )}
                        </div>
                      </td>
                      {r.holiday ? (
                        <td
                          colSpan={2}
                          className="py-2 px-3 font-sans bg-rose-100/90 dark:bg-rose-950/40"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                            <CalendarOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="truncate">{r.holiday}</span>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-2 text-right">{r.sb || '–'}</td>
                          <td className="py-2 px-2 text-right">{r.pr || '–'}</td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right">{f3(r.opening)}</td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder="–"
                          value={r.rc || ''}
                          onChange={(e) => updateSeparateReceipt('P', r.date, e.target.value)}
                          className="w-24 rounded border-2 border-sky-400/80 dark:border-sky-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-center text-xs font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        {r.consumption ? f3(r.consumption) : '–'}
                      </td>
                      <td className="py-2 px-4 text-right font-extrabold">{f3(r.closing)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-sans uppercase">
                      Month Total
                    </td>
                    <td className="py-3 px-2 text-right">{separateData.totalsP.sb}</td>
                    <td className="py-3 px-2 text-right">{separateData.totalsP.pr}</td>
                    <td className="py-3 px-3 text-right">{f3(separateData.totalsP.open)}</td>
                    <td className="py-3 px-3 text-center">{f3(separateData.totalsP.rc)}</td>
                    <td className="py-3 px-3 text-right">{f3(separateData.totalsP.consumed)}</td>
                    <td className="py-3 px-4 text-right">{f3(separateData.totalsP.closing)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Bold Indigo Grid Upper Primary Separate Table */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-indigo-600/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                Upper Primary Rice Register — {monthName}
              </h2>
              <div className="flex flex-wrap gap-2 noprint">
                <button
                  type="button"
                  onClick={() => exportSeparate('U', 'xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportSeparate('U', 'pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-indigo min-w-[680px] text-xs font-mono tabular-nums">
                <thead>
                  <tr className="font-sans uppercase">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-2 text-left">Day</th>
                    <th className="py-3 px-2 text-right">Upper Pry</th>
                    <th className="py-3 px-3 text-right">Opening (kg)</th>
                    <th className="py-3 px-3 text-center">Rice Received (kg)</th>
                    <th className="py-3 px-3 text-right">Consumption (kg)</th>
                    <th className="py-3 px-4 text-right">Closing (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {separateData.rowsU.map((r) => (
                    <tr
                      key={r.date}
                      className={r.holiday ? 'row-hol' : r.dow === 0 ? 'row-sun' : ''}
                    >
                      <td className="py-2 px-4 font-bold whitespace-nowrap">
                        {formatShortDate(r.date)}
                      </td>
                      <td className="py-2 px-2 font-sans font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{DAYS[r.dow].slice(0, 3)}</span>
                          {r.holiday && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Holiday
                            </span>
                          )}
                        </div>
                      </td>
                      {r.holiday ? (
                        <td className="py-2 px-3 font-sans bg-rose-100/90 dark:bg-rose-950/40">
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                            <CalendarOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="truncate">{r.holiday}</span>
                          </div>
                        </td>
                      ) : (
                        <td className="py-2 px-2 text-right">{r.up || '–'}</td>
                      )}
                      <td className="py-2 px-3 text-right">{f3(r.opening)}</td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder="–"
                          value={r.rc || ''}
                          onChange={(e) => updateSeparateReceipt('U', r.date, e.target.value)}
                          className="w-24 rounded border-2 border-indigo-400/80 dark:border-indigo-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-center text-xs font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        {r.consumption ? f3(r.consumption) : '–'}
                      </td>
                      <td className="py-2 px-4 text-right font-extrabold">{f3(r.closing)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-sans uppercase">
                      Month Total
                    </td>
                    <td className="py-3 px-2 text-right">{separateData.totalsU.up}</td>
                    <td className="py-3 px-3 text-right">{f3(separateData.totalsU.open)}</td>
                    <td className="py-3 px-3 text-center">{f3(separateData.totalsU.rc)}</td>
                    <td className="py-3 px-3 text-right">{f3(separateData.totalsU.consumed)}</td>
                    <td className="py-3 px-4 text-right">{f3(separateData.totalsU.closing)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
