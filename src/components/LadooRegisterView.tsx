import React, { useMemo, useState } from 'react';
import { CalendarOff, Download, FileSpreadsheet, Printer, Settings } from 'lucide-react';
import type { LadooNorms, MDMState } from '../types/mdm';
import {
  DAYS,
  LADOO_INGREDIENTS,
  calcLadooRegister,
  fm,
  formatDisplayDate,
  formatMonthName,
  getAttributionLine,
  getMasterDay,
  nz,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface LadooRegisterViewProps {
  state: MDMState;
  monthKey: string;
  onChangeMonthKey: (key: string) => void;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
}

export const LadooRegisterView: React.FC<LadooRegisterViewProps> = ({
  state,
  monthKey,
  onChangeMonthKey,
  onUpdateState,
  onNotify,
}) => {
  const [showNorms, setShowNorms] = useState(false);

  const monthName = formatMonthName(monthKey);
  const summary = useMemo(() => calcLadooRegister(state, monthKey), [state, monthKey]);
  const monthOverrides = state.l.months[monthKey] || {};

  const updateNorm = (key: keyof LadooNorms, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      l: {
        ...prev.l,
        norms: {
          ...prev.l.norms,
          [key]: Number(val) || 0,
        },
      },
    }));
  };

  const toggleDay = (dow: number, checked: boolean) => {
    onUpdateState((prev) => ({
      ...prev,
      l: {
        ...prev.l,
        menu: prev.l.menu.map((v, i) => (i === dow ? checked : v)),
      },
    }));
  };

  const updateCell = (dt: string, field: 'sb' | 'ps' | 'ups', val: string) => {
    onUpdateState((prev) => {
      const prevMon = prev.l.months[monthKey] || {};
      return {
        ...prev,
        l: {
          ...prev.l,
          months: {
            ...prev.l.months,
            [monthKey]: {
              ...prevMon,
              [dt]: { ...(prevMon[dt] || {}), [field]: val },
            },
          },
        },
      };
    });
  };

  const handleExport = (type: 'xlsx' | 'pdf') => {
    const head = [
      [
        c('Date'),
        c('Day Name'),
        c('Sishubatika count'),
        c('PS count'),
        c('UPS count'),
        c('Total'),
        ...LADOO_INGREDIENTS.map((ing) => c(`${ing.label} (kg)`)),
        c('Cost (₹)'),
      ],
    ];

    const body = summary.rows.map((r) =>
      r.holiday
        ? [c(formatDisplayDate(r.date)), c(DAYS[r.dow]), c(`HOLIDAY — ${r.holiday}`, 12)]
        : [
            c(formatDisplayDate(r.date)),
            c(DAYS[r.dow]),
            c(r.sb || ''),
            c(r.ps || ''),
            c(r.ups || ''),
            c(fm(r.tot, 0)),
            ...LADOO_INGREDIENTS.map((ing) => c(fm(r[ing.key], 3))),
            c(fm(r.cost, 3)),
          ]
    );

    const foot = [
      [
        c('Total', 2),
        c(fm(summary.sb, 0)),
        c(fm(summary.ps, 0)),
        c(fm(summary.ups, 0)),
        c(fm(summary.tot, 0)),
        ...LADOO_INGREDIENTS.map((ing) => c(fm(summary[ing.key], 3))),
        c(fm(summary.cost, 3)),
      ],
    ];

    const meta = {
      school: state.school,
      title: `Millet Ladoo (Primary) Register — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };

    if (type === 'xlsx')
      exportToExcel(meta, { head, body, foot }, `Millet Ladoo Register ${monthName}`);
    else exportToPdf(meta, { head, body, foot }, `Millet Ladoo Register ${monthName}`);
    onNotify(`Exported Millet Laddoo Register (${type.toUpperCase()}).`);
  };

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`Millet Ladoo Register — ${monthName}`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Amber-Orange Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint">
        <div>
          <div className="text-xs font-bold text-amber-100">Millet Mission · Odisha MDM</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Sheet 3 · Laddoo Calculation
          </h1>
          <p className="text-sm text-amber-50/90 mt-1">
            Daily millet laddoo ingredient quantities (ragi, wheat, sesame, jaggery, ghee,
            groundnut, cardamom) and preparation cost.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && onChangeMonthKey(e.target.value)}
            className="rounded-xl border-2 border-white/35 bg-white/15 px-3 py-2 text-sm font-mono font-bold text-white"
          />
          <button
            type="button"
            onClick={() => setShowNorms((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors whitespace-nowrap ${
              showNorms
                ? 'bg-slate-950 text-amber-300'
                : 'bg-white text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Settings className="h-4 w-4" />
            Norms &amp; Menu
          </button>
        </div>
      </section>

      {/* Collapsible Norms & Weekday Menu */}
      {showNorms && (
        <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-amber-400/50 dark:border-amber-700/60 p-5 space-y-5 noprint">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Ingredient Norms &amp; Preparation Cost
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LADOO_INGREDIENTS.map((ing) => (
                <div key={ing.key}>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {ing.label} ({ing.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={state.l.norms[ing.key]}
                    onChange={(e) => updateNorm(ing.key, e.target.value)}
                    className="w-full rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold tabular-nums"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Preparation cost (₹/ladoo)
                </label>
                <input
                  type="number"
                  step="any"
                  value={state.l.norms.cost}
                  onChange={(e) => updateNorm('cost', e.target.value)}
                  className="w-full rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold tabular-nums"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Laddoo Serving Days
            </h2>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((dayName, dow) => (
                <label
                  key={dayName}
                  className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-bold cursor-pointer transition-colors ${
                    state.l.menu[dow]
                      ? 'border-amber-500 bg-amber-100/80 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(state.l.menu[dow])}
                    onChange={(e) => toggleDay(dow, e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  {dayName}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Colorful 4 Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 noprint">
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-50">Calendar Days</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.daysCount}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-sky-100">Total Attendance</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.tot.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-100">Laddoos Prepared</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.q.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-rose-100">Preparation Cost</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            ₹{summary.cost.toFixed(3)}
          </div>
        </div>
      </section>

      {/* Bold Amber Grid Register Table */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-amber-500/45 dark:border-amber-600/45 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Monthly Register — {monthName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 noprint">
              Shaded attendance cells are synced from Master Attendance. Ingredients calculate on
              active laddoo weekdays.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 noprint">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mdm-grid-table mdm-grid-amber min-w-[1260px] text-xs">
            <thead>
              <tr className="uppercase">
                <th className="py-3 px-3 text-left sticky left-0 z-10">Date</th>
                <th className="py-3 px-2 text-left">Day</th>
                <th className="py-3 px-2 text-center">SB</th>
                <th className="py-3 px-2 text-center">PS</th>
                <th className="py-3 px-2 text-center">UPS</th>
                <th className="py-3 px-2 text-right">Total</th>
                <th className="py-3 px-2 text-right">Ragi (kg)</th>
                <th className="py-3 px-2 text-right">Wheat (kg)</th>
                <th className="py-3 px-2 text-right">Sesame (kg)</th>
                <th className="py-3 px-2 text-right">Jaggery (kg)</th>
                <th className="py-3 px-2 text-right">Ghee (kg)</th>
                <th className="py-3 px-2 text-right">G.nut (kg)</th>
                <th className="py-3 px-2 text-right">Card. (kg)</th>
                <th className="py-3 px-3 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {summary.rows.map((r) => {
                const mv = getMasterDay(state, r.date);
                const ov = monthOverrides[r.date] || {};
                const isSun = r.dow === 0;
                const sbL = Boolean(mv && nz(mv.sb));
                const psL = Boolean(mv && nz(mv.ps));
                const upL = Boolean(mv && nz(mv.up));

                return (
                  <tr
                    key={r.date}
                    className={
                      r.holiday
                        ? 'row-hol'
                        : isSun
                        ? 'row-sun'
                        : state.l.menu[r.dow]
                        ? 'bg-amber-50/70 dark:bg-amber-950/20'
                        : ''
                    }
                  >
                    <td className="py-2 px-3 whitespace-nowrap sticky left-0 bg-inherit font-bold">
                      {formatDisplayDate(r.date)}
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
                        colSpan={12}
                        className="py-2 px-4 font-sans bg-rose-100/90 dark:bg-rose-950/40"
                      >
                        <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
                          <CalendarOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{r.holiday}</span>
                          <span className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
                            · From Master Attendance (No Laddoo served)
                          </span>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-1.5 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            readOnly={sbL}
                            value={sbL ? String(mv?.sb ?? '') : ov.sb ?? ''}
                            onChange={(e) => updateCell(r.date, 'sb', e.target.value)}
                            className={`w-14 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                              sbL
                                ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            readOnly={psL}
                            value={psL ? String(mv?.ps ?? '') : ov.ps ?? ''}
                            onChange={(e) => updateCell(r.date, 'ps', e.target.value)}
                            className={`w-14 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                              psL
                                ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            readOnly={upL}
                            value={upL ? String(mv?.up ?? '') : ov.ups ?? ''}
                            onChange={(e) => updateCell(r.date, 'ups', e.target.value)}
                            className={`w-14 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                              upL
                                ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-bold">{fm(r.tot, 0)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.ragi, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.wheat, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.sesame, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.jaggery, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.ghee, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.gnut, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.card, 3)}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-amber-800 dark:text-amber-300">
                          {fm(r.cost, 3)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-mono text-xs tabular-nums">
                <td colSpan={2} className="py-3 px-3 font-sans uppercase tracking-wider">
                  Total
                </td>
                <td className="py-3 px-2 text-center">{fm(summary.sb, 0)}</td>
                <td className="py-3 px-2 text-center">{fm(summary.ps, 0)}</td>
                <td className="py-3 px-2 text-center">{fm(summary.ups, 0)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.tot, 0)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.ragi, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.wheat, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.sesame, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.jaggery, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.ghee, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.gnut, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.card, 3)}</td>
                <td className="py-3 px-3 text-right">{fm(summary.cost, 3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
