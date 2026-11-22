import React, { useMemo, useState } from 'react';
import {
  CalendarOff,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { MDMState, ViewId } from '../types/mdm';
import {
  DAYS,
  DEFAULT_ROLL_STRENGTH,
  formatMonthName,
  formatShortDate,
  getAttributionLine,
  getDayOfWeek,
  getDaysInMonth,
  nz,
  splitTotal,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface MasterAttendanceViewProps {
  state: MDMState;
  monthKey: string;
  onChangeMonthKey: (key: string) => void;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNavigate: (view: ViewId) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
  onRequestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => void;
}

export const MasterAttendanceView: React.FC<MasterAttendanceViewProps> = ({
  state,
  monthKey,
  onChangeMonthKey,
  onUpdateState,
  onNavigate,
  onNotify,
  onRequestConfirm,
}) => {
  const [quickOpen, setQuickOpen] = useState(false);
  const [showRollStrength, setShowRollStrength] = useState(true);
  const [qTotal, setQTotal] = useState('');
  const [qs, setQs] = useState('');
  const [qp, setQp] = useState('');
  const [qu, setQu] = useState('');
  const [focusedTotalDate, setFocusedTotalDate] = useState<string | null>(null);
  const [focusedTotalVal, setFocusedTotalVal] = useState<string>('');
  const [editingHolidayDate, setEditingHolidayDate] = useState<string | null>(null);
  const [editingHolidayVal, setEditingHolidayVal] = useState<string>('');

  const days = useMemo(() => getDaysInMonth(monthKey), [monthKey]);
  const monthEntries = state.m.months[monthKey] || {};
  const monthName = formatMonthName(monthKey);
  const ratio = state.m.ratio;
  const totalRoll = ratio.sb + ratio.ps + ratio.up;

  const pct = (val: number) => (totalRoll ? Math.round((val * 1000) / totalRoll) / 10 : 0);
  const sampleBase = totalRoll > 0 ? Math.min(200, totalRoll) : 200;
  const exampleSplit = splitTotal(sampleBase, [ratio.sb, ratio.ps, ratio.up]);

  const totals = useMemo(() => {
    let sb = 0;
    let ps = 0;
    let up = 0;
    let holidays = 0;
    days.forEach((dt) => {
      const e = monthEntries[dt];
      if (!e) return;
      if (e.h) {
        holidays++;
        return;
      }
      if (nz(e.sb)) sb += Number(e.sb);
      if (nz(e.ps)) ps += Number(e.ps);
      if (nz(e.up)) up += Number(e.up);
    });
    return { sb, ps, up, all: sb + ps + up, holidays };
  }, [days, monthEntries]);

  const updateRoll = (key: 'sb' | 'ps' | 'up', val: string) => {
    const nextVal = Math.max(0, Math.floor(Number(val) || 0));
    onUpdateState((prev) => ({
      ...prev,
      m: {
        ...prev.m,
        ratio: {
          ...prev.m.ratio,
          [key]: nextVal,
        },
      },
    }));
  };

  const handleResetDefaultStrength = () => {
    onUpdateState((prev) => ({
      ...prev,
      m: {
        ...prev.m,
        ratio: { ...DEFAULT_ROLL_STRENGTH },
      },
    }));
    onNotify(
      `Roll strength set to Shishu Batika ${DEFAULT_ROLL_STRENGTH.sb}, Primary ${DEFAULT_ROLL_STRENGTH.ps}, Upper Primary ${DEFAULT_ROLL_STRENGTH.up} (Total ${DEFAULT_ROLL_STRENGTH.sb + DEFAULT_ROLL_STRENGTH.ps + DEFAULT_ROLL_STRENGTH.up}).`
    );
  };

  const handleRedistributeAllDays = () => {
    let updatedDays = 0;
    onUpdateState((prev) => {
      const prevMon = prev.m.months[monthKey] || {};
      const nextMon = { ...prevMon };
      const weights = [prev.m.ratio.sb, prev.m.ratio.ps, prev.m.ratio.up];

      days.forEach((dt) => {
        const row = nextMon[dt];
        if (!row || row.h) return;
        const any = nz(row.sb) || nz(row.ps) || nz(row.up);
        if (!any) return;
        const dayTotal =
          (nz(row.sb) ? Number(row.sb) : 0) +
          (nz(row.ps) ? Number(row.ps) : 0) +
          (nz(row.up) ? Number(row.up) : 0);
        const sp = splitTotal(Math.max(0, Math.round(dayTotal)), weights);
        nextMon[dt] = {
          ...row,
          sb: String(sp[0]),
          ps: String(sp[1]),
          up: String(sp[2]),
        };
        updatedDays++;
      });

      return {
        ...prev,
        m: {
          ...prev.m,
          months: {
            ...prev.m.months,
            [monthKey]: nextMon,
          },
        },
      };
    });

    if (updatedDays === 0) {
      onNotify('No filled working days to redistribute for this month.', 'info');
    } else {
      onNotify(
        `Proportionally redistributed ${updatedDays} working day${updatedDays > 1 ? 's' : ''} using ${ratio.sb} : ${ratio.ps} : ${ratio.up} roll strength.`
      );
    }
  };

  const handleQuickTotalChange = (val: string) => {
    setQTotal(val);
    if (val === '') {
      setQs('');
      setQp('');
      setQu('');
      return;
    }
    const num = Math.max(0, Math.floor(Number(val) || 0));
    const sp = splitTotal(num, [ratio.sb, ratio.ps, ratio.up]);
    setQs(String(sp[0]));
    setQp(String(sp[1]));
    setQu(String(sp[2]));
  };

  const updateDayField = (dt: string, field: 'sb' | 'ps' | 'up' | 'h', val: string) => {
    onUpdateState((prev) => {
      const prevMon = prev.m.months[monthKey] || {};
      const row = { ...(prevMon[dt] || {}) };
      if (field === 'h') {
        if (val.trim()) row.h = val;
        else delete row.h;
      } else {
        if (val === '') delete row[field];
        else row[field] = val;
      }
      const nextMon = { ...prevMon };
      if (Object.keys(row).length === 0) delete nextMon[dt];
      else nextMon[dt] = row;

      return {
        ...prev,
        m: {
          ...prev.m,
          months: {
            ...prev.m.months,
            [monthKey]: nextMon,
          },
        },
      };
    });
  };

  const handleStartHoliday = (dt: string) => {
    const existing = monthEntries[dt]?.h || 'Holiday';
    updateDayField(dt, 'h', existing);
    setEditingHolidayDate(dt);
    setEditingHolidayVal(existing);
  };

  const handleClearHoliday = (dt: string) => {
    updateDayField(dt, 'h', '');
    if (editingHolidayDate === dt) {
      setEditingHolidayDate(null);
      setEditingHolidayVal('');
    }
  };

  const handleTotalChange = (dt: string, val: string) => {
    setFocusedTotalVal(val);
    onUpdateState((prev) => {
      const prevMon = prev.m.months[monthKey] || {};
      const row = { ...(prevMon[dt] || {}) };
      if (val === '') {
        delete row.sb;
        delete row.ps;
        delete row.up;
      } else {
        const sp = splitTotal(Math.max(0, Math.floor(Number(val) || 0)), [
          prev.m.ratio.sb,
          prev.m.ratio.ps,
          prev.m.ratio.up,
        ]);
        row.sb = String(sp[0]);
        row.ps = String(sp[1]);
        row.up = String(sp[2]);
      }
      const nextMon = { ...prevMon };
      if (Object.keys(row).length === 0) delete nextMon[dt];
      else nextMon[dt] = row;

      return {
        ...prev,
        m: {
          ...prev.m,
          months: {
            ...prev.m.months,
            [monthKey]: nextMon,
          },
        },
      };
    });
  };

  const handleQuickFill = () => {
    if (qs === '' && qp === '' && qu === '') {
      onNotify(
        'Enter a Combined Total or individual values; only empty Mon–Sat cells are filled.',
        'info'
      );
      return;
    }
    let filledCount = 0;
    onUpdateState((prev) => {
      const prevMon = prev.m.months[monthKey] || {};
      const nextMon = { ...prevMon };
      days.forEach((dt) => {
        if (getDayOfWeek(dt) === 0) return;
        const row = { ...(nextMon[dt] || {}) };
        if (row.h) return;
        let touched = false;
        if (qs !== '' && !nz(row.sb)) {
          row.sb = qs;
          filledCount++;
          touched = true;
        }
        if (qp !== '' && !nz(row.ps)) {
          row.ps = qp;
          filledCount++;
          touched = true;
        }
        if (qu !== '' && !nz(row.up)) {
          row.up = qu;
          filledCount++;
          touched = true;
        }
        if (touched) nextMon[dt] = row;
      });
      return {
        ...prev,
        m: {
          ...prev.m,
          months: {
            ...prev.m.months,
            [monthKey]: nextMon,
          },
        },
      };
    });
    if (filledCount === 0) {
      onNotify('All empty Mon–Sat cells were already filled.', 'info');
    } else {
      onNotify(`Filled ${filledCount} blank Mon–Sat cells proportionally.`);
    }
  };

  const handleClearMonth = () => {
    onRequestConfirm({
      title: `Clear Master Attendance for ${monthName}?`,
      message: `Clear all master attendance entries and holidays for ${monthName}? This cannot be undone.`,
      confirmLabel: 'Yes, clear month',
      danger: true,
      onConfirm: () => {
        onUpdateState((prev) => {
          const nextMonths = { ...prev.m.months };
          delete nextMonths[monthKey];
          return { ...prev, m: { ...prev.m, months: nextMonths } };
        });
        onNotify(`Master attendance cleared for ${monthName}.`);
      },
    });
  };

  const buildExportData = () => {
    const head = [
      [
        c('Date'),
        c('Day'),
        c(`Shishu Batika (Roll: ${ratio.sb})`),
        c(`Primary 1-5 (Roll: ${ratio.ps})`),
        c(`Upper Primary 6-8 (Roll: ${ratio.up})`),
        c(`Total Attendance (Roll: ${totalRoll})`),
        c('Holiday / Remark'),
      ],
    ];
    const body = days.map((dt) => {
      const dow = getDayOfWeek(dt);
      const e = monthEntries[dt] || {};
      const isHol = Boolean(e.h);
      const any = !isHol && (nz(e.sb) || nz(e.ps) || nz(e.up));
      const rowTotal = any
        ? (nz(e.sb) ? Number(e.sb) : 0) +
          (nz(e.ps) ? Number(e.ps) : 0) +
          (nz(e.up) ? Number(e.up) : 0)
        : '';
      return [
        c(formatShortDate(dt)),
        c(DAYS[dow]),
        c(isHol ? '' : e.sb ?? ''),
        c(isHol ? '' : e.ps ?? ''),
        c(isHol ? '' : e.up ?? ''),
        c(isHol ? '' : rowTotal),
        c(e.h || ''),
      ];
    });
    const foot = [
      [
        c('MONTH TOTAL', 2),
        c(totals.sb),
        c(totals.ps),
        c(totals.up),
        c(totals.all),
        c(totals.holidays ? `${totals.holidays} holiday${totals.holidays > 1 ? 's' : ''}` : ''),
      ],
    ];
    return { head, body, foot };
  };

  const handleExport = (type: 'xlsx' | 'pdf') => {
    const meta = {
      school: state.school,
      title: `Master Attendance — ${monthName} (Strength: SB ${ratio.sb}, PS ${ratio.ps}, UP ${ratio.up}, Total ${totalRoll})`,
      by: getAttributionLine(state),
      sheet: monthName,
    };
    const data = buildExportData();
    if (type === 'xlsx') exportToExcel(meta, data, `Master Attendance ${monthName}`);
    else exportToPdf(meta, data, `Master Attendance ${monthName}`);
    onNotify(`Exported Master Attendance (${type.toUpperCase()}).`);
  };

  const isDefaultStrength =
    ratio.sb === DEFAULT_ROLL_STRENGTH.sb &&
    ratio.ps === DEFAULT_ROLL_STRENGTH.ps &&
    ratio.up === DEFAULT_ROLL_STRENGTH.up;

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`Master Attendance Register — ${monthName} (Roll Strength: SB ${ratio.sb} · Primary ${ratio.ps} · UP ${ratio.up} · Total ${totalRoll})`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Page Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint">
        <div>
          <div className="text-xs font-bold text-amber-300">
            Mid-Day Meal Record · Single Source of Truth
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Master Attendance Register
          </h1>
          <p className="text-sm text-emerald-50/90 mt-1">
            Enter daily attendance once here. Sheets 1, 2, 3, 4 and 6 update automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('calculator')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
        >
          <Settings className="h-4 w-4" />
          Edit Menu &amp; Norms
        </button>
      </section>

      {/* School, Month & Quick Fill Bar */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-600/25 dark:border-emerald-600/30 p-5 space-y-4 noprint">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              School Name
            </label>
            <input
              type="text"
              value={state.school}
              onChange={(e) => onUpdateState((prev) => ({ ...prev, school: e.target.value }))}
              className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
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
              className="w-full rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 px-3 py-2 text-sm font-mono font-bold text-emerald-950 dark:text-emerald-200"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {quickOpen ? 'Hide Quick Fill' : 'Quick Fill Mon–Sat'}
            </button>
          </div>
        </div>

        {/* Collapsible Quick Fill (supports Combined Total auto-split!) */}
        {quickOpen && (
          <div className="pt-4 border-t-2 border-amber-200 dark:border-amber-900/50 space-y-3 bg-amber-50/60 dark:bg-amber-950/15 -mx-5 -mb-5 p-5 rounded-b-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Quick Fill Blank Mon–Sat Days (Type Combined Total to Auto-Split by {ratio.sb}:
                {ratio.ps}:{ratio.up})
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  Combined Total (Auto-Split)
                </label>
                <input
                  type="number"
                  min={0}
                  value={qTotal}
                  onChange={(e) => handleQuickTotalChange(e.target.value)}
                  placeholder={`e.g. ${sampleBase}`}
                  className="w-full rounded-lg border-2 border-emerald-500 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2 text-sm font-mono font-extrabold text-emerald-950 dark:text-emerald-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                  Shishu Batika (Max {ratio.sb})
                </label>
                <input
                  type="number"
                  min={0}
                  value={qs}
                  onChange={(e) => setQs(e.target.value)}
                  placeholder={`e.g. ${exampleSplit[0]}`}
                  className="w-full rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                  Primary (Max {ratio.ps})
                </label>
                <input
                  type="number"
                  min={0}
                  value={qp}
                  onChange={(e) => setQp(e.target.value)}
                  placeholder={`e.g. ${exampleSplit[1]}`}
                  className="w-full rounded-lg border-2 border-sky-300 dark:border-sky-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                  Upper Primary (Max {ratio.up})
                </label>
                <input
                  type="number"
                  min={0}
                  value={qu}
                  onChange={(e) => setQu(e.target.value)}
                  placeholder={`e.g. ${exampleSplit[2]}`}
                  className="w-full rounded-lg border-2 border-indigo-300 dark:border-indigo-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4" />
                Fill Blank Days
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Colorful 4 Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 noprint">
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-50">Shishu Batika Total</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {totals.sb.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-amber-100">
            Roll Strength: {ratio.sb} ({pct(ratio.sb)}%)
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-sky-100">Primary Total (1–5)</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {totals.ps.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-sky-100">
            Roll Strength: {ratio.ps} ({pct(ratio.ps)}%)
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-indigo-100">Upper Primary (6–8)</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {totals.up.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-indigo-100">
            Roll Strength: {ratio.up} ({pct(ratio.up)}%)
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-100">Combined Total</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {totals.all.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-emerald-100">
            Total Roll Strength: {totalRoll} (100%)
          </div>
        </div>
      </section>

      {/* Bold Grid Master Attendance Table (Compact 6-Column Layout + Hideable Roll Strength) */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-700/40 dark:border-emerald-500/40 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
              {state.school}
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              {monthName} · Master Attendance · {totals.holidays} holiday
              {totals.holidays === 1 ? '' : 's'} marked · Click the{' '}
              <CalendarOff className="inline h-3.5 w-3.5 text-rose-600 dark:text-rose-400 -mt-0.5" />{' '}
              icon on any day to mark a holiday
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 noprint">
            <button
              type="button"
              onClick={() => setShowRollStrength((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                showRollStrength
                  ? 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 border border-amber-400/70'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
              }`}
              title={
                showRollStrength
                  ? 'Hide Total Roll Strength row and controls'
                  : `Show Total Roll Strength (${ratio.sb} / ${ratio.ps} / ${ratio.up})`
              }
            >
              {showRollStrength ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide Roll Strength
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Show Roll Strength ({totalRoll})
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClearMonth}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Month
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Hideable Top-of-Table Roll Strength & Auto-Distribute Control Strip */}
        {showRollStrength && (
          <div className="rounded-xl border-2 border-emerald-600/40 dark:border-emerald-500/40 bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 dark:from-amber-950/20 dark:via-sky-950/20 dark:to-emerald-950/25 p-3.5 sm:p-4 space-y-2.5 noprint">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    Total Roll Strength &amp; Proportional Auto-Distribute
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    Type any combined figure in the <strong>Total Attendance</strong> column below
                    to auto-split in proportion ({pct(ratio.sb)}% SB · {pct(ratio.ps)}% Primary ·{' '}
                    {pct(ratio.up)}% UP — e.g.{' '}
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {sampleBase} → {exampleSplit.join(' / ')}
                    </span>
                    ).
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isDefaultStrength && (
                  <button
                    type="button"
                    onClick={handleResetDefaultStrength}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    Reset 23 / 111 / 91
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRedistributeAllDays}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                  title="Re-distribute every filled day's Total Attendance using the current roll strength ratio"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Auto-Distribute Filled Days
                </button>
                <button
                  type="button"
                  onClick={() => setShowRollStrength(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors whitespace-nowrap"
                  title="Hide Total Roll Strength"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="mdm-grid-table min-w-[600px] text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="py-3 px-3 text-left sticky left-0 z-10 w-24">Date</th>
                <th className="py-3 px-3 text-left w-36">Day / Holiday</th>
                <th className="py-3 px-3 text-center">Shishu Batika</th>
                <th className="py-3 px-3 text-center">Primary (1–5)</th>
                <th className="py-3 px-3 text-center">Upper Primary (6–8)</th>
                <th className="py-3 px-3 text-center">Total Attendance</th>
              </tr>

              {/* Hideable Editable Total Strength Row right at the top of the Attendance Table */}
              {showRollStrength && (
                <tr className="text-xs">
                  <td
                    colSpan={2}
                    className="py-2.5 px-3 font-extrabold uppercase tracking-wide bg-slate-900 dark:bg-slate-950 text-amber-300 sticky left-0 z-10 whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>Total Roll Strength</span>
                      <button
                        type="button"
                        onClick={() => setShowRollStrength(false)}
                        className="noprint inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
                        title="Hide Roll Strength Row"
                      >
                        <EyeOff className="h-3 w-3" />
                        Hide
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center bg-amber-100 dark:bg-amber-950/60">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        aria-label="Shishu Batika Total Strength"
                        value={ratio.sb}
                        onChange={(e) => updateRoll('sb', e.target.value)}
                        className="w-20 sm:w-24 rounded-md border-2 border-amber-600 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono text-sm font-extrabold tabular-nums text-amber-950 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                      <span className="font-mono text-[11px] font-extrabold text-amber-900 dark:text-amber-300">
                        {pct(ratio.sb)}% share
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center bg-sky-100 dark:bg-sky-950/60">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        aria-label="Primary Total Strength"
                        value={ratio.ps}
                        onChange={(e) => updateRoll('ps', e.target.value)}
                        className="w-20 sm:w-24 rounded-md border-2 border-sky-600 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono text-sm font-extrabold tabular-nums text-sky-950 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      />
                      <span className="font-mono text-[11px] font-extrabold text-sky-900 dark:text-sky-300">
                        {pct(ratio.ps)}% share
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center bg-indigo-100 dark:bg-indigo-950/60">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        aria-label="Upper Primary Total Strength"
                        value={ratio.up}
                        onChange={(e) => updateRoll('up', e.target.value)}
                        className="w-20 sm:w-24 rounded-md border-2 border-indigo-600 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono text-sm font-extrabold tabular-nums text-indigo-950 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                      <span className="font-mono text-[11px] font-extrabold text-indigo-900 dark:text-indigo-300">
                        {pct(ratio.up)}% share
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center bg-emerald-200 dark:bg-emerald-950/70">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-base font-extrabold tabular-nums text-emerald-950 dark:text-emerald-200">
                        {totalRoll}
                      </span>
                      <span className="font-sans text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        Auto-Split Base
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </thead>
            <tbody>
              {days.map((dt) => {
                const dow = getDayOfWeek(dt);
                const isSun = dow === 0;
                const e = monthEntries[dt] || {};
                const isHol = Boolean(e.h) || editingHolidayDate === dt;
                const any = !isHol && (nz(e.sb) || nz(e.ps) || nz(e.up));
                const computedTotal = any
                  ? (nz(e.sb) ? Number(e.sb) : 0) +
                    (nz(e.ps) ? Number(e.ps) : 0) +
                    (nz(e.up) ? Number(e.up) : 0)
                  : '';

                const overSb = !isHol && nz(e.sb) && ratio.sb > 0 && Number(e.sb) > ratio.sb;
                const overPs = !isHol && nz(e.ps) && ratio.ps > 0 && Number(e.ps) > ratio.ps;
                const overUp = !isHol && nz(e.up) && ratio.up > 0 && Number(e.up) > ratio.up;

                const rowClass = isHol ? 'row-hol' : isSun ? 'row-sun' : '';

                return (
                  <tr key={dt} className={rowClass}>
                    <td className="py-2 px-3 font-mono text-xs font-bold whitespace-nowrap sticky left-0 bg-inherit">
                      {formatShortDate(dt)}
                    </td>
                    <td className="py-1.5 px-3 text-xs font-semibold whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1.5">
                        <span>{DAYS[dow]}</span>
                        {!isHol ? (
                          <button
                            type="button"
                            onClick={() => handleStartHoliday(dt)}
                            className="noprint inline-flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-100 dark:hover:text-rose-300 dark:hover:bg-rose-950/60 transition-colors shrink-0"
                            title="Mark this date as a Holiday"
                            aria-label={`Mark ${formatShortDate(dt)} as holiday`}
                          >
                            <CalendarOff className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                            Holiday
                          </span>
                        )}
                      </div>
                    </td>

                    {isHol ? (
                      <td
                        colSpan={4}
                        className="py-1.5 px-3 bg-rose-100/90 dark:bg-rose-950/40"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 noprint" />
                          <input
                            type="text"
                            autoFocus={editingHolidayDate === dt}
                            placeholder="Type holiday name (e.g. Rath Yatra, Independence Day)"
                            value={editingHolidayDate === dt ? editingHolidayVal : e.h ?? ''}
                            onFocus={(ev) => {
                              setEditingHolidayDate(dt);
                              setEditingHolidayVal(e.h ?? '');
                              if ((e.h ?? '') === 'Holiday') {
                                ev.currentTarget.select();
                              }
                            }}
                            onChange={(ev) => {
                              const next = ev.target.value;
                              setEditingHolidayVal(next);
                              if (next.trim()) {
                                updateDayField(dt, 'h', next);
                              }
                            }}
                            onBlur={() => {
                              const trimmed = editingHolidayVal.trim();
                              updateDayField(dt, 'h', trimmed);
                              setEditingHolidayDate(null);
                              setEditingHolidayVal('');
                            }}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') {
                                ev.currentTarget.blur();
                              } else if (ev.key === 'Escape') {
                                ev.currentTarget.blur();
                              }
                            }}
                            className="flex-1 min-w-0 rounded-md border-2 border-rose-400/80 dark:border-rose-700 bg-white/95 dark:bg-[#0B1117] px-3 py-1 text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 placeholder:font-normal placeholder:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                          />
                          <button
                            type="button"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => handleClearHoliday(dt)}
                            className="noprint inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors shrink-0"
                            title="Remove holiday and restore attendance inputs"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-1.5 px-2 text-center bg-amber-50/40 dark:bg-amber-950/10">
                          <input
                            type="number"
                            min={0}
                            placeholder="–"
                            value={e.sb ?? ''}
                            onChange={(ev) => updateDayField(dt, 'sb', ev.target.value)}
                            className={`w-20 sm:w-24 rounded-md border-2 px-2 py-1 text-center font-mono text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                              overSb
                                ? 'border-red-600 bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                                : 'border-amber-300/80 dark:border-amber-700/60 bg-white dark:bg-[#0B1117] text-slate-900 dark:text-slate-100'
                            }`}
                            title={overSb ? `Exceeds roll strength (${ratio.sb})` : undefined}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center bg-sky-50/40 dark:bg-sky-950/10">
                          <input
                            type="number"
                            min={0}
                            placeholder="–"
                            value={e.ps ?? ''}
                            onChange={(ev) => updateDayField(dt, 'ps', ev.target.value)}
                            className={`w-20 sm:w-24 rounded-md border-2 px-2 py-1 text-center font-mono text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${
                              overPs
                                ? 'border-red-600 bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                                : 'border-sky-300/80 dark:border-sky-700/60 bg-white dark:bg-[#0B1117] text-slate-900 dark:text-slate-100'
                            }`}
                            title={overPs ? `Exceeds roll strength (${ratio.ps})` : undefined}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center bg-indigo-50/40 dark:bg-indigo-950/10">
                          <input
                            type="number"
                            min={0}
                            placeholder="–"
                            value={e.up ?? ''}
                            onChange={(ev) => updateDayField(dt, 'up', ev.target.value)}
                            className={`w-20 sm:w-24 rounded-md border-2 px-2 py-1 text-center font-mono text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                              overUp
                                ? 'border-red-600 bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                                : 'border-indigo-300/80 dark:border-indigo-700/60 bg-white dark:bg-[#0B1117] text-slate-900 dark:text-slate-100'
                            }`}
                            title={overUp ? `Exceeds roll strength (${ratio.up})` : undefined}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center bg-emerald-50/60 dark:bg-emerald-950/20">
                          <input
                            type="number"
                            min={0}
                            placeholder="Type total"
                            value={focusedTotalDate === dt ? focusedTotalVal : computedTotal}
                            onFocus={() => {
                              setFocusedTotalDate(dt);
                              setFocusedTotalVal(String(computedTotal));
                            }}
                            onBlur={() => setFocusedTotalDate(null)}
                            onChange={(ev) => handleTotalChange(dt, ev.target.value)}
                            className="w-24 rounded-md border-2 border-emerald-500/70 dark:border-emerald-600 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-mono text-sm font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                          />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-mono text-sm tabular-nums">
                <td colSpan={2} className="py-3 px-3 font-sans text-xs uppercase tracking-wider">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Month Total</span>
                    {totals.holidays > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold normal-case tracking-normal">
                        {totals.holidays} holiday{totals.holidays > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-center">{totals.sb}</td>
                <td className="py-3 px-3 text-center">{totals.ps}</td>
                <td className="py-3 px-3 text-center">{totals.up}</td>
                <td className="py-3 px-3 text-center">{totals.all}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
