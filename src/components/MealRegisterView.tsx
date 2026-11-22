import React, { useMemo, useState } from 'react';
import { CalendarOff, Download, FileSpreadsheet, Printer, Settings } from 'lucide-react';
import type { MDMState, MealNorms, MenuKey } from '../types/mdm';
import {
  DAYS,
  MENU_KEYS,
  MENU_LABELS,
  calcMealRegister,
  fm,
  formatDisplayDate,
  formatMonthName,
  getAttributionLine,
  getMasterDay,
  nz,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface MealRegisterViewProps {
  section: 'p' | 'u';
  state: MDMState;
  monthKey: string;
  onChangeMonthKey: (key: string) => void;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
}

const NORM_FIELDS: { key: keyof MealNorms; label: string }[] = [
  { key: 'rice', label: 'Rice (g/child)' },
  { key: 'veg', label: 'Vegetable (g/child)' },
  { key: 'oil', label: 'Oil (ml/child)' },
  { key: 'fuel', label: 'Fuel cost (₹/child)' },
  { key: 'cond', label: 'Condiment cost (₹/child)' },
  { key: 'dal', label: 'Dal (g/child)' },
  { key: 'soya', label: 'Soya (g/child)' },
  { key: 'egg', label: 'Egg (per child)' },
  { key: 'ladoo', label: 'Ladoo (per child)' },
];

export const MealRegisterView: React.FC<MealRegisterViewProps> = ({
  section,
  state,
  monthKey,
  onChangeMonthKey,
  onUpdateState,
  onNotify,
}) => {
  const [showNorms, setShowNorms] = useState(false);

  const isPrimary = section === 'p';
  const sectionData = state[section];
  const monthOverrides = sectionData.months[monthKey] || {};
  const monthName = formatMonthName(monthKey);
  const title = isPrimary ? 'Sheet 1 · Shishu Batika & Primary' : 'Sheet 2 · Upper Primary';
  const exportLabel = isPrimary ? 'Primary MDM Register' : 'Upper Primary MDM Register';
  const gridTheme = isPrimary ? 'mdm-grid-blue' : 'mdm-grid-indigo';

  const summary = useMemo(
    () => calcMealRegister(state, section, monthKey),
    [state, section, monthKey]
  );

  const updateNorm = (key: keyof MealNorms, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        norms: {
          ...prev[section].norms,
          [key]: Number(val) || 0,
        },
      },
    }));
  };

  const toggleMenu = (dow: number, key: MenuKey, checked: boolean) => {
    onUpdateState((prev) => {
      const nextMenu = prev[section].menu.map((dayObj, i) =>
        i === dow ? { ...dayObj, [key]: checked } : dayObj
      );
      return {
        ...prev,
        [section]: {
          ...prev[section],
          menu: nextMenu,
        },
      };
    });
  };

  const updateCell = (dt: string, field: 'sb' | 'ps' | 'up' | 'meals', val: string) => {
    onUpdateState((prev) => {
      const prevMon = prev[section].months[monthKey] || {};
      const row = { ...(prevMon[dt] || {}), [field]: val };
      return {
        ...prev,
        [section]: {
          ...prev[section],
          months: {
            ...prev[section].months,
            [monthKey]: {
              ...prevMon,
              [dt]: row,
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
        ...(isPrimary ? [c('SB count'), c('PS (1–5) count'), c('Total')] : [c('UP count')]),
        c('Consumed (meals)'),
        c('Rice (kg)'),
        c('Vegetable & Condiment (kg)'),
        c('Oil (kg)'),
        c('Fuel (₹)'),
        c('Condiment (₹)'),
        c('Dal (kg)'),
        c('Soya (kg)'),
        c('Egg (pieces)'),
        c('Laddoo (pieces)'),
      ],
    ];

    const body = summary.rows.map((r) =>
      r.holiday
        ? [
            c(formatDisplayDate(r.date)),
            c(DAYS[r.dow]),
            c(`HOLIDAY — ${r.holiday}`, isPrimary ? 13 : 11),
          ]
        : [
            c(formatDisplayDate(r.date)),
            c(DAYS[r.dow]),
            ...(isPrimary
              ? [c(r.sb || ''), c(r.ps || ''), c(fm(r.totalCount, 0))]
              : [c(r.up || '')]),
            c(fm(r.meals, 0)),
            c(fm(r.rice, 3)),
            c(fm(r.veg, 3)),
            c(fm(r.oil, 3)),
            c(fm(r.fuel, 2)),
            c(fm(r.cond, 2)),
            c(fm(r.dal, 3)),
            c(fm(r.soya, 3)),
            c(fm(r.egg, 0)),
            c(fm(r.ladoo, 0)),
          ]
    );

    const foot = [
      [
        c('Total', 2),
        ...(isPrimary
          ? [c(fm(summary.sbTotal, 0)), c(fm(summary.psTotal, 0)), c(fm(summary.totalCount, 0))]
          : [c(fm(summary.upTotal, 0))]),
        c(fm(summary.meals, 0)),
        c(fm(summary.rice, 3)),
        c(fm(summary.veg, 3)),
        c(fm(summary.oil, 3)),
        c(fm(summary.fuel, 2)),
        c(fm(summary.cond, 2)),
        c(fm(summary.dal, 3)),
        c(fm(summary.soya, 3)),
        c(fm(summary.egg, 0)),
        c(fm(summary.ladoo, 0)),
      ],
    ];

    const meta = {
      school: state.school,
      title: `${exportLabel} — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };

    if (type === 'xlsx') exportToExcel(meta, { head, body, foot }, `${exportLabel} ${monthName}`);
    else exportToPdf(meta, { head, body, foot }, `${exportLabel} ${monthName}`);
    onNotify(`Exported ${exportLabel} (${type.toUpperCase()}).`);
  };

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`${exportLabel} — ${monthName}`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Sheet Header Banner */}
      <section
        className={`rounded-2xl bg-gradient-to-r ${
          isPrimary
            ? 'from-sky-700 via-blue-700 to-cyan-700'
            : 'from-indigo-700 via-violet-700 to-purple-700'
        } text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint`}
      >
        <div>
          <div className="text-xs font-bold text-amber-300">
            {isPrimary ? 'Shishu Batika & Classes I–V' : 'Classes VI–VIII'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            {title}
          </h1>
          <p className="text-sm text-white/85 mt-1">
            Automated daily ration quantities calculated from Master Attendance and weekday menu
            norms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && onChangeMonthKey(e.target.value)}
            className="rounded-xl border-2 border-white/30 bg-white/15 px-3 py-2 text-sm font-mono font-bold text-white"
          />
          <button
            type="button"
            onClick={() => setShowNorms((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors whitespace-nowrap ${
              showNorms
                ? 'bg-slate-950 text-amber-300'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            <Settings className="h-4 w-4" />
            Norms &amp; Menu
          </button>
        </div>
      </section>

      {/* Collapsible Editable Norms & Weekly Menu */}
      {showNorms && (
        <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-sky-400/40 dark:border-sky-700/50 p-5 space-y-6 noprint">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Editable Per-Child Norms
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {NORM_FIELDS.map((nf) => (
                <div key={nf.key}>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {nf.label}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sectionData.norms[nf.key]}
                    onChange={(e) => updateNorm(nf.key, e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1117] px-3 py-2 text-sm font-mono font-bold tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Weekly Menu Configuration
            </h2>
            <div className="overflow-x-auto">
              <table className={`mdm-grid-table ${gridTheme} min-w-[600px] text-xs`}>
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 text-left">Day</th>
                    {MENU_KEYS.map((k) => (
                      <th key={k} className="py-2.5 px-2 text-center">
                        {MENU_LABELS[k]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((dayName, dow) => (
                    <tr key={dayName}>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {dayName}
                      </td>
                      {MENU_KEYS.map((k) => (
                        <td key={k} className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(sectionData.menu[dow]?.[k])}
                            onChange={(e) => toggleMenu(dow, k, e.target.checked)}
                            className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Colorful 4 Summary Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 noprint">
        <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-sky-100">Calendar Days</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.daysCount}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-indigo-100">Total Count</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.totalCount.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-100">Meals Served</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {summary.meals.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-50">Fuel &amp; Condiment Cost</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            ₹{(summary.fuel + summary.cond).toFixed(2)}
          </div>
        </div>
      </section>

      {/* Bold Grid Register Table */}
      <section
        className={`rounded-2xl bg-white dark:bg-[#111B24] border-2 ${
          isPrimary
            ? 'border-sky-600/40 dark:border-sky-500/40'
            : 'border-indigo-600/40 dark:border-indigo-500/40'
        } p-4 sm:p-5 shadow-sm`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Monthly Register — {monthName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 noprint">
              Shaded attendance cells are synced from Master Attendance. Override Consumed (meals)
              per row if needed.
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`mdm-grid-table ${gridTheme} min-w-[1160px] text-xs`}>
            <thead>
              <tr className="uppercase">
                <th className="py-3 px-3 text-left sticky left-0 z-10">Date</th>
                <th className="py-3 px-2 text-left">Day</th>
                {isPrimary ? (
                  <>
                    <th className="py-3 px-2 text-center">SB</th>
                    <th className="py-3 px-2 text-center">PS (1–5)</th>
                    <th className="py-3 px-2 text-right">Total</th>
                  </>
                ) : (
                  <th className="py-3 px-2 text-center">UP (6–8)</th>
                )}
                <th className="py-3 px-2 text-center">Meals</th>
                <th className="py-3 px-2 text-right">Rice (kg)</th>
                <th className="py-3 px-2 text-right">Veg (kg)</th>
                <th className="py-3 px-2 text-right">Oil (kg)</th>
                <th className="py-3 px-2 text-right">Fuel (₹)</th>
                <th className="py-3 px-2 text-right">Cond (₹)</th>
                <th className="py-3 px-2 text-right">Dal (kg)</th>
                <th className="py-3 px-2 text-right">Soya (kg)</th>
                <th className="py-3 px-2 text-right">Egg</th>
                <th className="py-3 px-3 text-right">Laddoo</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {summary.rows.map((r) => {
                const mv = getMasterDay(state, r.date);
                const ov = monthOverrides[r.date] || {};
                const isSun = r.dow === 0;
                const sbLinked = Boolean(mv && nz(mv.sb));
                const psLinked = Boolean(mv && nz(mv.ps));
                const upLinked = Boolean(mv && nz(mv.up));

                return (
                  <tr key={r.date} className={r.holiday ? 'row-hol' : isSun ? 'row-sun' : ''}>
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
                        colSpan={isPrimary ? 13 : 11}
                        className="py-2 px-4 font-sans bg-rose-100/90 dark:bg-rose-950/40"
                      >
                        <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
                          <CalendarOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{r.holiday}</span>
                          <span className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
                            · From Master Attendance (No MDM served)
                          </span>
                        </div>
                      </td>
                    ) : (
                      <>
                        {isPrimary ? (
                          <>
                            <td className="py-1.5 px-1.5 text-center">
                              <input
                                type="number"
                                min={0}
                                readOnly={sbLinked}
                                value={sbLinked ? String(mv?.sb ?? '') : ov.sb ?? ''}
                                onChange={(e) => updateCell(r.date, 'sb', e.target.value)}
                                className={`w-14 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                                  sbLinked
                                    ? 'border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 text-sky-950 dark:text-sky-200'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-1.5 text-center">
                              <input
                                type="number"
                                min={0}
                                readOnly={psLinked}
                                value={psLinked ? String(mv?.ps ?? '') : ov.ps ?? ''}
                                onChange={(e) => updateCell(r.date, 'ps', e.target.value)}
                                className={`w-14 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                                  psLinked
                                    ? 'border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 text-sky-950 dark:text-sky-200'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                                }`}
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-bold">
                              {fm(r.totalCount, 0)}
                            </td>
                          </>
                        ) : (
                          <td className="py-1.5 px-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              readOnly={upLinked}
                              value={upLinked ? String(mv?.up ?? '') : ov.up ?? ''}
                              onChange={(e) => updateCell(r.date, 'up', e.target.value)}
                              className={`w-16 rounded border-2 px-1 py-1 text-center text-xs font-bold ${
                                upLinked
                                  ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1117]'
                              }`}
                            />
                          </td>
                        )}

                        <td className="py-1.5 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            placeholder={r.totalCount ? String(r.totalCount) : ''}
                            value={ov.meals ?? ''}
                            onChange={(e) => updateCell(r.date, 'meals', e.target.value)}
                            className="w-16 rounded border-2 border-emerald-400/70 dark:border-emerald-700 bg-white dark:bg-[#0B1117] px-1 py-1 text-center text-xs font-bold placeholder:text-emerald-700/80 dark:placeholder:text-emerald-300/80"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-semibold">{fm(r.rice, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.veg, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.oil, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.fuel, 2)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.cond, 2)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.dal, 3)}</td>
                        <td className="py-2 px-2 text-right">{fm(r.soya, 3)}</td>
                        <td className="py-2 px-2 text-right font-bold text-amber-700 dark:text-amber-300">
                          {fm(r.egg, 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700 dark:text-rose-300">
                          {fm(r.ladoo, 0)}
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
                {isPrimary ? (
                  <>
                    <td className="py-3 px-2 text-center">{fm(summary.sbTotal, 0)}</td>
                    <td className="py-3 px-2 text-center">{fm(summary.psTotal, 0)}</td>
                    <td className="py-3 px-2 text-right">{fm(summary.totalCount, 0)}</td>
                  </>
                ) : (
                  <td className="py-3 px-2 text-center">{fm(summary.upTotal, 0)}</td>
                )}
                <td className="py-3 px-2 text-center">{fm(summary.meals, 0)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.rice, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.veg, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.oil, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.fuel, 2)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.cond, 2)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.dal, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.soya, 3)}</td>
                <td className="py-3 px-2 text-right">{fm(summary.egg, 0)}</td>
                <td className="py-3 px-3 text-right">{fm(summary.ladoo, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
