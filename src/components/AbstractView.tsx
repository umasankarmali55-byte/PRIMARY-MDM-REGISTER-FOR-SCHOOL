import React, { useMemo, useState } from 'react';
import { CalendarOff, Download, FileSpreadsheet, Printer, Settings } from 'lucide-react';
import type { AbstractPrices, LadooNorms, LadooPrices, MDMState, MealNorms } from '../types/mdm';
import {
  DAYS,
  LADOO_INGREDIENTS,
  calcAbstractMonth,
  calcLadooUnitIngredientCost,
  f2,
  f3,
  formatDisplayDate,
  formatINR,
  formatMonthName,
  getAttributionLine,
} from '../utils/mdmEngine';
import { c, exportToExcel, exportToPdf } from '../utils/exportUtils';
import { PrintHeader } from './PrintHeader';

interface AbstractViewProps {
  state: MDMState;
  monthKey: string;
  onChangeMonthKey: (key: string) => void;
  onUpdateState: (updater: (prev: MDMState) => MDMState) => void;
  onNotify: (msg: string, tone?: 'info' | 'success') => void;
}

export const AbstractView: React.FC<AbstractViewProps> = ({
  state,
  monthKey,
  onChangeMonthKey,
  onUpdateState,
  onNotify,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const monthName = formatMonthName(monthKey);
  const abs = useMemo(() => calcAbstractMonth(state, monthKey), [state, monthKey]);
  const unitLadooIngCost = useMemo(() => calcLadooUnitIngredientCost(state), [state]);

  const updatePerMeal = (key: 'p' | 'u', val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      pm: { ...prev.pm, [key]: val === '' ? '' : Number(val) },
    }));
  };

  const updatePrice = (key: keyof AbstractPrices, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      pr: { ...prev.pr, [key]: Number(val) || 0 },
    }));
  };

  const updateSectionNorm = (section: 'p' | 'u', key: keyof MealNorms, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        norms: { ...prev[section].norms, [key]: Number(val) || 0 },
      },
    }));
  };

  const updateLadooNorm = (key: keyof LadooNorms, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      l: { ...prev.l, norms: { ...prev.l.norms, [key]: Number(val) || 0 } },
    }));
  };

  const updateLadooPrice = (key: keyof LadooPrices, val: string) => {
    onUpdateState((prev) => ({
      ...prev,
      lp: { ...prev.lp, [key]: Number(val) || 0 },
    }));
  };

  const exportAbstract = (type: 'xlsx' | 'pdf') => {
    const { P, U, L, R, aP, aU, totalAmount, ladooIngredientsTotalAmount } = abs;
    const head = [
      [
        c('Item'),
        c('Unit'),
        c('SB + Primary Qty'),
        c('SB + Primary Amount (₹)'),
        c('Upper Primary Qty'),
        c('Upper Primary Amount (₹)'),
        c('Total Qty'),
        c('Total Amount (₹)'),
      ],
    ];

    const row = (
      name: string,
      unit: string,
      pq: number | null,
      pa: number | null,
      uq: number | null,
      ua: number | null,
      d: number,
      free = false
    ) => [
      c(name),
      c(unit),
      c(pq == null ? '' : pq.toFixed(d)),
      c(pa == null ? '' : pa.toFixed(2)),
      c(uq == null ? '' : uq.toFixed(d)),
      c(ua == null ? '' : ua.toFixed(2)),
      c(pq == null ? '' : (pq + (uq || 0)).toFixed(d)),
      c(free ? 'Free' : pa == null ? '' : (pa + (ua || 0)).toFixed(2)),
    ];

    const one = (name: string, unit: string, q: number | null, a: number | null, d: number) => [
      c(name),
      c(unit),
      c(''),
      c(''),
      c(''),
      c(''),
      c(q == null ? '' : q.toFixed(d)),
      c(a == null ? '' : a.toFixed(2)),
    ];

    const body = [
      [c('A. Daily meal items (Sheet 1 and Sheet 2)', 8)],
      row('Meals served', 'nos', P.meals, null, U.meals, null, 0),
      row('Rice', 'kg', P.rice, 0, U.rice, 0, 3, true),
      row('Dal', 'kg', P.dal, aP.dal, U.dal, aU.dal, 3),
      row('Soya chunks', 'kg', P.soya, aP.soya, U.soya, aU.soya, 3),
      row('Oil', 'kg', P.oil, aP.oil, U.oil, aU.oil, 3),
      row('Vegetables (auto adjust)', 'kg', P.veg, aP.veg, U.veg, aU.veg, 3),
      row('Egg', 'pieces', P.egg, aP.egg, U.egg, aU.egg, 0),
      row('Laddoo', 'pieces', P.ladoo, aP.ladoo, U.ladoo, aU.ladoo, 0),
      row('Fuel', '₹', null, aP.fuel, null, aU.fuel, 0),
      row('Salt & condiment', '₹', null, aP.cond, null, aU.cond, 0),
      [
        c('TOTAL AMOUNT', 2),
        c(''),
        c(f2(aP.tot)),
        c(''),
        c(f2(aU.tot)),
        c(''),
        c(f2(totalAmount)),
      ],
      [c('B. Millet laddoo ingredients (Sheet 3)', 8)],
      one('Laddoos prepared', 'pieces', L.q, L.q * state.pr.ladoo, 0),
      ...LADOO_INGREDIENTS.map((ing) =>
        one(ing.label, 'kg', L[ing.key], L[ing.key] * state.lp[ing.key], 3)
      ),
      one('Preparation cost', '₹', null, L.cost, 0),
      one('Total laddoo cost (ingredients + preparation)', '₹', null, ladooIngredientsTotalAmount + L.cost, 0),
      [c('C. Rice stock (Sheet 4)', 8)],
      one('Opening stock', 'kg', R.opening, null, 3),
      one('Rice received', 'kg', R.received, null, 3),
      one('Rice consumed', 'kg', R.consumed, null, 3),
      one('Closing balance', 'kg', R.closing, null, 3),
    ];

    const meta = {
      school: state.school,
      title: `Abstract Consumption — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };

    if (type === 'xlsx') exportToExcel(meta, { head, body }, `Abstract Consumption ${monthName}`);
    else exportToPdf(meta, { head, body }, `Abstract Consumption ${monthName}`);
    onNotify(`Exported Abstract Consumption (${type.toUpperCase()}).`);
  };

  const exportEggs = (type: 'xlsx' | 'pdf') => {
    const head = [
      [
        c('Date'),
        c('Day'),
        c('SB + Primary (eggs)'),
        c('Upper Primary (eggs)'),
        c('Total eggs'),
        c('Amount (₹)'),
      ],
    ];
    const body = abs.eggRows.map((r) =>
      r.holiday
        ? [c(formatDisplayDate(r.date)), c(DAYS[r.dow]), c(`HOLIDAY — ${r.holiday}`, 4)]
        : [
            c(formatDisplayDate(r.date)),
            c(DAYS[r.dow]),
            c(Math.round(r.pEggs)),
            c(Math.round(r.uEggs)),
            c(Math.round(r.totalEggs)),
            c(f2(r.amount)),
          ]
    );
    const foot = [
      [
        c('TOTAL', 2),
        c(Math.round(abs.eggTotals.pEggs)),
        c(Math.round(abs.eggTotals.uEggs)),
        c(Math.round(abs.eggTotals.totalEggs)),
        c(f2(abs.eggTotals.amount)),
      ],
    ];
    const meta = {
      school: state.school,
      title: `Egg Consumption — ${monthName}`,
      by: getAttributionLine(state),
      sheet: monthName,
    };
    if (type === 'xlsx') exportToExcel(meta, { head, body, foot }, `Egg Consumption ${monthName}`);
    else exportToPdf(meta, { head, body, foot }, `Egg Consumption ${monthName}`);
    onNotify(`Exported Egg Consumption Statement (${type.toUpperCase()}).`);
  };

  const normMatrixRows: {
    label: string;
    key: keyof MealNorms;
    unit: string;
    priceKey?: keyof AbstractPrices;
    isPerPiece?: boolean;
    isFree?: boolean;
    isDirectCost?: boolean;
  }[] = [
    { label: 'Rice', key: 'rice', unit: 'gm', isFree: true },
    { label: 'Dal', key: 'dal', unit: 'gm', priceKey: 'dal' },
    { label: 'Soya', key: 'soya', unit: 'gm', priceKey: 'soya' },
    { label: 'Oil', key: 'oil', unit: 'ml', priceKey: 'oil' },
    { label: 'Egg', key: 'egg', unit: '', priceKey: 'egg', isPerPiece: true },
    { label: 'Laddoo', key: 'ladoo', unit: '', priceKey: 'ladoo', isPerPiece: true },
    { label: 'Fuel (₹/child)', key: 'fuel', unit: '', isDirectCost: true },
    { label: 'Salt & condiment (₹/child)', key: 'cond', unit: '', isDirectCost: true },
  ];

  const getRationCost = (section: 'p' | 'u', row: (typeof normMatrixRows)[number]) => {
    if (row.isFree) return 'FREE';
    const nVal = state[section].norms[row.key];
    if (row.isDirectCost) return f2(nVal);
    if (!row.priceKey) return '—';
    const price = state.pr[row.priceKey];
    return row.isPerPiece ? f2(nVal * price) : f2((nVal * price) / 1000);
  };

  return (
    <div className="space-y-5">
      <PrintHeader
        school={state.school}
        subtitle={`Abstract Consumption Sheet — ${monthName}`}
        attribution={getAttributionLine(state)}
      />

      {/* Vibrant Rose-Teal Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-rose-700 via-pink-700 to-indigo-700 text-white p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4 noprint">
        <div>
          <div className="text-xs font-bold text-amber-300">
            Monthly Financial &amp; Commodity Audit
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Sheet 6 · Abstract Consumption
          </h1>
          <p className="text-sm text-rose-100 mt-1">
            Item-wise monthly consumption and expenditure calculated from Sheets 1 to 4, with
            vegetables auto-adjusted.
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
            onClick={() => setShowSettings((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-colors whitespace-nowrap ${
              showSettings
                ? 'bg-slate-950 text-amber-300'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            <Settings className="h-4 w-4" />
            {showSettings ? 'Hide Norms & Prices' : 'Set Norms & Prices'}
          </button>
        </div>
      </section>

      {/* Collapsible Bold-Grid Norms & Prices Configurator */}
      {showSettings && (
        <div className="space-y-5 noprint">
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-sky-500/40 p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Per Meal Cost &amp; Laddoo Rate
            </h2>
            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-blue min-w-[440px] text-xs">
                <thead>
                  <tr className="uppercase">
                    <th className="py-2.5 px-4 text-left">Item</th>
                    <th className="py-2.5 px-4 text-center">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-4 font-bold bg-sky-600 text-white uppercase">
                      Per Meal Cost · SB + Primary (per child)
                    </td>
                    <td className="py-2 px-4 text-center">
                      <input
                        type="number"
                        step="any"
                        value={state.pm.p}
                        placeholder="Weekday rates"
                        onChange={(e) => updatePerMeal('p', e.target.value)}
                        className="w-28 rounded border-2 border-sky-400 bg-white dark:bg-[#0B1117] px-2.5 py-1 text-center font-mono font-bold"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold bg-sky-600 text-white uppercase">
                      Per Meal Cost · Upper Primary (per child)
                    </td>
                    <td className="py-2 px-4 text-center">
                      <input
                        type="number"
                        step="any"
                        value={state.pm.u}
                        placeholder="Weekday rates"
                        onChange={(e) => updatePerMeal('u', e.target.value)}
                        className="w-28 rounded border-2 border-sky-400 bg-white dark:bg-[#0B1117] px-2.5 py-1 text-center font-mono font-bold"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold bg-sky-600 text-white uppercase">
                      Per Laddoo Cost
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={state.pr.ladoo}
                          onChange={(e) => updatePrice('ladoo', e.target.value)}
                          className="w-24 rounded border-2 border-sky-400 bg-white dark:bg-[#0B1117] px-2.5 py-1 text-center font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updatePrice('ladoo', unitLadooIngCost.toFixed(2));
                            onNotify(`Per laddoo cost updated to ₹${unitLadooIngCost.toFixed(2)}.`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap"
                        >
                          Use ₹{f2(unitLadooIngCost)}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Iconic Color-Coded Norms & Price per kg Matrix */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-slate-700/40 p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Norms &amp; Market Price Per kg (₹)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] border-collapse border-[3px] border-slate-900 dark:border-emerald-400 text-xs">
                <thead>
                  <tr className="bg-slate-950 text-white uppercase">
                    <th className="py-2.5 px-3 text-left border-2 border-slate-900 dark:border-slate-700">
                      Item
                    </th>
                    <th className="py-2.5 px-2 text-center border-2 border-slate-900 dark:border-slate-700">
                      SB + Primary
                    </th>
                    <th className="py-2.5 px-2 text-center border-2 border-slate-900 dark:border-slate-700">
                      Ration PS (₹/child)
                    </th>
                    <th className="py-2.5 px-2 text-center border-2 border-slate-900 dark:border-slate-700">
                      Price / kg (₹)
                    </th>
                    <th className="py-2.5 px-2 text-center border-2 border-slate-900 dark:border-slate-700">
                      Upper Primary
                    </th>
                    <th className="py-2.5 px-2 text-center border-2 border-slate-900 dark:border-slate-700">
                      Ration UPS (₹/child)
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {normMatrixRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 px-3 font-sans font-bold bg-slate-900 text-white border-2 border-slate-800">
                        {row.label}
                      </td>
                      <td className="py-1.5 px-2 text-center bg-sky-200 text-slate-950 border-2 border-slate-900">
                        <input
                          type="number"
                          step="any"
                          value={state.p.norms[row.key]}
                          onChange={(e) => updateSectionNorm('p', row.key, e.target.value)}
                          className="w-20 rounded border border-slate-700 bg-white px-2 py-1 text-center font-bold text-slate-950"
                        />{' '}
                        <span className="font-sans text-[11px] font-bold">{row.unit}</span>
                      </td>
                      <td className="py-2 px-2 text-center font-extrabold bg-sky-200 text-slate-950 border-2 border-slate-900">
                        {getRationCost('p', row)}
                      </td>
                      <td className="py-1.5 px-2 text-center bg-amber-100 text-slate-950 border-2 border-slate-900">
                        {row.priceKey ? (
                          <input
                            type="number"
                            step="any"
                            value={state.pr[row.priceKey]}
                            onChange={(e) => updatePrice(row.priceKey!, e.target.value)}
                            className="w-20 rounded border border-slate-700 bg-white px-2 py-1 text-center font-extrabold text-slate-950"
                          />
                        ) : (
                          <span className="font-bold">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center bg-emerald-300 text-slate-950 border-2 border-slate-900">
                        <input
                          type="number"
                          step="any"
                          value={state.u.norms[row.key]}
                          onChange={(e) => updateSectionNorm('u', row.key, e.target.value)}
                          className="w-20 rounded border border-slate-700 bg-white px-2 py-1 text-center font-bold text-slate-950"
                        />{' '}
                        <span className="font-sans text-[11px] font-bold">{row.unit}</span>
                      </td>
                      <td className="py-2 px-2 text-center font-extrabold bg-emerald-300 text-slate-950 border-2 border-slate-900">
                        {getRationCost('u', row)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 px-3 font-sans font-bold bg-slate-900 text-white border-2 border-slate-800">
                      Vegetables
                    </td>
                    <td className="py-1.5 px-2 text-center bg-sky-200 text-slate-950 border-2 border-slate-900">
                      <input
                        type="number"
                        step="any"
                        value={state.p.norms.veg}
                        onChange={(e) => updateSectionNorm('p', 'veg', e.target.value)}
                        className="w-20 rounded border border-slate-700 bg-white px-2 py-1 text-center font-bold text-slate-950"
                      />{' '}
                      <span className="font-sans text-[11px] font-bold">gm</span>
                    </td>
                    <td className="py-2 px-2 text-center font-sans font-bold bg-sky-200 text-slate-950 border-2 border-slate-900">
                      auto adjust
                    </td>
                    <td className="py-2 px-2 text-center font-sans font-bold bg-amber-100 text-slate-950 border-2 border-slate-900">
                      auto adjust
                    </td>
                    <td className="py-1.5 px-2 text-center bg-emerald-300 text-slate-950 border-2 border-slate-900">
                      <input
                        type="number"
                        step="any"
                        value={state.u.norms.veg}
                        onChange={(e) => updateSectionNorm('u', 'veg', e.target.value)}
                        className="w-20 rounded border border-slate-700 bg-white px-2 py-1 text-center font-bold text-slate-950"
                      />{' '}
                      <span className="font-sans text-[11px] font-bold">gm</span>
                    </td>
                    <td className="py-2 px-2 text-center font-sans font-bold bg-emerald-300 text-slate-950 border-2 border-slate-900">
                      auto adjust
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Millet Laddoo Ingredient Pricing */}
          <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-sky-600/40 p-5 space-y-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Millet Laddoo Ingredient Pricing
            </h2>
            <div className="overflow-x-auto">
              <table className="mdm-grid-table mdm-grid-blue min-w-[540px] text-xs font-mono tabular-nums">
                <thead>
                  <tr className="font-sans uppercase">
                    <th className="py-2.5 px-3 text-left">Ingredient</th>
                    <th className="py-2.5 px-2 text-center">Grams / laddoo</th>
                    <th className="py-2.5 px-2 text-right">Cost / laddoo (₹)</th>
                    <th className="py-2.5 px-3 text-center">Price / kg (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {LADOO_INGREDIENTS.map((ing) => (
                    <tr key={ing.key}>
                      <td className="py-2 px-3 font-sans font-bold bg-sky-600 text-white uppercase">
                        {ing.label}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          step="any"
                          value={state.l.norms[ing.key]}
                          onChange={(e) => updateLadooNorm(ing.key, e.target.value)}
                          className="w-20 rounded border-2 border-sky-300 dark:border-sky-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-bold"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-bold">
                        {f2((state.l.norms[ing.key] * state.lp[ing.key]) / 1000)}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          value={state.lp[ing.key]}
                          onChange={(e) => updateLadooPrice(ing.key, e.target.value)}
                          className="w-24 rounded border-2 border-sky-300 dark:border-sky-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-center font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 px-3 font-sans font-bold bg-sky-600 text-white uppercase">
                      Preparation cost
                    </td>
                    <td className="py-2 px-2 text-center text-slate-400">—</td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={state.l.norms.cost}
                        onChange={(e) => updateLadooNorm('cost', e.target.value)}
                        className="w-20 rounded border-2 border-sky-300 dark:border-sky-700 bg-white dark:bg-[#0B1117] px-2 py-1 text-right font-bold"
                      />
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-sky-700 text-white text-center font-extrabold text-xs sm:text-sm py-3 px-4 tracking-wide uppercase">
              Per Laddoo Cost is ₹{f2(unitLadooIngCost)} Including Preparation Cost
            </div>
          </section>
        </div>
      )}

      {/* Colorful 4 Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 noprint">
        <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-sky-100">Meals · SB + Primary</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {abs.P.meals.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-indigo-100">Meals · Upper Primary</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {abs.U.meals.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-100">Total Meals</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {(abs.P.meals + abs.U.meals).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 text-white p-4 shadow-sm">
          <div className="text-xs font-bold text-rose-100">Total Expenditure</div>
          <div className="mt-2 font-mono text-2xl font-extrabold tabular-nums">
            {formatINR(abs.totalAmount, 2)}
          </div>
        </div>
      </section>

      {/* Bold Grid Main Abstract Consumption Table */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-700/45 dark:border-emerald-500/45 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
              {state.school}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {monthName} · Abstract Consumption · Item-wise monthly ledger
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 noprint">
            <button
              type="button"
              onClick={() => exportAbstract('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportAbstract('pdf')}
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
          <table className="mdm-grid-table min-w-[820px] text-xs font-mono tabular-nums">
            <thead>
              <tr className="font-sans uppercase">
                <th className="py-3 px-4 text-left">Item</th>
                <th className="py-3 px-2 text-center">Unit</th>
                <th className="py-3 px-3 text-right">SB + Primary Qty</th>
                <th className="py-3 px-3 text-right">SB + Primary Amt (₹)</th>
                <th className="py-3 px-3 text-right">Upper Pry Qty</th>
                <th className="py-3 px-3 text-right">Upper Pry Amt (₹)</th>
                <th className="py-3 px-3 text-right">Total Qty</th>
                <th className="py-3 px-4 text-right">Total Amt (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="!bg-sky-200 dark:!bg-sky-950 font-sans font-extrabold text-sky-950 dark:text-sky-200">
                <td colSpan={8} className="py-2.5 px-4 uppercase tracking-wide">
                  A. Daily Meal Items (Sheet 1 and Sheet 2)
                </td>
              </tr>
              {[
                { n: 'Meals served', u: 'nos', pq: abs.P.meals, pa: null, uq: abs.U.meals, ua: null, d: 0 },
                { n: 'Rice', u: 'kg', pq: abs.P.rice, pa: 0, uq: abs.U.rice, ua: 0, d: 3, free: true },
                { n: 'Dal', u: 'kg', pq: abs.P.dal, pa: abs.aP.dal, uq: abs.U.dal, ua: abs.aU.dal, d: 3 },
                { n: 'Soya chunks', u: 'kg', pq: abs.P.soya, pa: abs.aP.soya, uq: abs.U.soya, ua: abs.aU.soya, d: 3 },
                { n: 'Oil', u: 'kg', pq: abs.P.oil, pa: abs.aP.oil, uq: abs.U.oil, ua: abs.aU.oil, d: 3 },
                { n: 'Vegetables (auto adjust)', u: 'kg', pq: abs.P.veg, pa: abs.aP.veg, uq: abs.U.veg, ua: abs.aU.veg, d: 3 },
                { n: 'Egg', u: 'pieces', pq: abs.P.egg, pa: abs.aP.egg, uq: abs.U.egg, ua: abs.aU.egg, d: 0 },
                { n: 'Laddoo', u: 'pieces', pq: abs.P.ladoo, pa: abs.aP.ladoo, uq: abs.U.ladoo, ua: abs.aU.ladoo, d: 0 },
                { n: 'Fuel', u: '₹', pq: null, pa: abs.aP.fuel, uq: null, ua: abs.aU.fuel, d: 0 },
                { n: 'Salt & condiment', u: '₹', pq: null, pa: abs.aP.cond, uq: null, ua: abs.aU.cond, d: 0 },
              ].map((r) => (
                <tr key={r.n}>
                  <td className="py-2 px-4 font-sans font-bold text-slate-900 dark:text-slate-100">
                    {r.n}
                  </td>
                  <td className="py-2 px-2 text-center font-sans font-semibold">{r.u}</td>
                  <td className="py-2 px-3 text-right">{r.pq == null ? '' : r.pq.toFixed(r.d)}</td>
                  <td className="py-2 px-3 text-right">{r.pa == null ? '' : f2(r.pa)}</td>
                  <td className="py-2 px-3 text-right">{r.uq == null ? '' : r.uq.toFixed(r.d)}</td>
                  <td className="py-2 px-3 text-right">{r.ua == null ? '' : f2(r.ua)}</td>
                  <td className="py-2 px-3 text-right font-bold">
                    {r.pq == null ? '' : (r.pq + (r.uq || 0)).toFixed(r.d)}
                  </td>
                  <td className="py-2 px-4 text-right font-extrabold text-emerald-900 dark:text-emerald-300">
                    {r.free ? 'Free' : r.pa == null ? '' : f2(r.pa + (r.ua || 0))}
                  </td>
                </tr>
              ))}
              <tr className="!bg-emerald-200 dark:!bg-emerald-900 font-extrabold text-emerald-950 dark:text-emerald-100">
                <td colSpan={2} className="py-2.5 px-4 font-sans uppercase">
                  Total Amount
                </td>
                <td />
                <td className="py-2.5 px-3 text-right">{f2(abs.aP.tot)}</td>
                <td />
                <td className="py-2.5 px-3 text-right">{f2(abs.aU.tot)}</td>
                <td />
                <td className="py-2.5 px-4 text-right">{f2(abs.totalAmount)}</td>
              </tr>

              <tr className="!bg-amber-200 dark:!bg-amber-950 font-sans font-extrabold text-amber-950 dark:text-amber-200">
                <td colSpan={8} className="py-2.5 px-4 uppercase tracking-wide">
                  B. Millet Laddoo Ingredients (Sheet 3)
                </td>
              </tr>
              <tr>
                <td className="py-2 px-4 font-sans font-bold">Laddoos prepared</td>
                <td className="py-2 px-2 text-center font-sans">pieces</td>
                <td colSpan={4} />
                <td className="py-2 px-3 text-right font-bold">{Math.round(abs.L.q)}</td>
                <td className="py-2 px-4 text-right font-extrabold">
                  {f2(abs.L.q * state.pr.ladoo)}
                </td>
              </tr>
              {LADOO_INGREDIENTS.map((ing) => (
                <tr key={ing.key}>
                  <td className="py-2 px-4 font-sans font-bold">{ing.label}</td>
                  <td className="py-2 px-2 text-center font-sans">kg</td>
                  <td colSpan={4} />
                  <td className="py-2 px-3 text-right font-bold">{f3(abs.L[ing.key])}</td>
                  <td className="py-2 px-4 text-right font-extrabold">
                    {f2(abs.L[ing.key] * state.lp[ing.key])}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 px-4 font-sans font-bold">Preparation cost</td>
                <td className="py-2 px-2 text-center font-sans">₹</td>
                <td colSpan={5} />
                <td className="py-2 px-4 text-right font-extrabold">{f2(abs.L.cost)}</td>
              </tr>
              <tr className="!bg-amber-100 dark:!bg-amber-900/50 font-extrabold">
                <td className="py-2.5 px-4 font-sans">
                  Total laddoo cost (ingredients + preparation)
                </td>
                <td className="py-2.5 px-2 text-center font-sans">₹</td>
                <td colSpan={5} />
                <td className="py-2.5 px-4 text-right">
                  {f2(abs.ladooIngredientsTotalAmount + abs.L.cost)}
                </td>
              </tr>

              <tr className="!bg-teal-200 dark:!bg-teal-950 font-sans font-extrabold text-teal-950 dark:text-teal-200">
                <td colSpan={8} className="py-2.5 px-4 uppercase tracking-wide">
                  C. Rice Stock Summary (Sheet 4)
                </td>
              </tr>
              {[
                { label: 'Opening stock', val: abs.R.opening },
                { label: 'Rice received', val: abs.R.received },
                { label: 'Rice consumed', val: abs.R.consumed },
                { label: 'Closing balance', val: abs.R.closing },
              ].map((item) => (
                <tr key={item.label}>
                  <td className="py-2 px-4 font-sans font-bold">{item.label}</td>
                  <td className="py-2 px-2 text-center font-sans">kg</td>
                  <td colSpan={4} />
                  <td className="py-2 px-3 text-right font-extrabold">{f3(item.val)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bold Amber Grid Egg Consumption Statement */}
      <section className="rounded-2xl bg-white dark:bg-[#111B24] border-2 border-amber-500/45 dark:border-amber-600/45 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-amber-950 dark:text-amber-200">
              Egg Consumption Statement
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {monthName} · ₹{f2(state.pr.egg)} per egg
            </p>
          </div>
          <div className="flex flex-wrap gap-2 noprint">
            <button
              type="button"
              onClick={() => exportEggs('xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportEggs('pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mdm-grid-table mdm-grid-amber min-w-[600px] text-xs font-mono tabular-nums">
            <thead>
              <tr className="font-sans uppercase">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-3 text-left">Day</th>
                <th className="py-3 px-3 text-right">SB + Primary (eggs)</th>
                <th className="py-3 px-3 text-right">Upper Primary (eggs)</th>
                <th className="py-3 px-3 text-right">Total Eggs</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {abs.eggRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-sans text-slate-500">
                    No egg days with attendance recorded in {monthName}.
                  </td>
                </tr>
              ) : (
                abs.eggRows.map((r) => (
                  <tr key={r.date} className={r.holiday ? 'row-hol' : ''}>
                    <td className="py-2 px-4 font-bold whitespace-nowrap">
                      {formatDisplayDate(r.date)}
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{DAYS[r.dow]}</span>
                        {r.holiday && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                            Holiday
                          </span>
                        )}
                      </div>
                    </td>
                    {r.holiday ? (
                      <td
                        colSpan={4}
                        className="py-2 px-4 font-sans bg-rose-100/90 dark:bg-rose-950/40"
                      >
                        <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200">
                          <CalendarOff className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{r.holiday}</span>
                          <span className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
                            · From Master Attendance (0 eggs)
                          </span>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right">{Math.round(r.pEggs)}</td>
                        <td className="py-2 px-3 text-right">{Math.round(r.uEggs)}</td>
                        <td className="py-2 px-3 text-right font-extrabold">
                          {Math.round(r.totalEggs)}
                        </td>
                        <td className="py-2 px-4 text-right font-bold">{f2(r.amount)}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="py-3 px-4 font-sans uppercase">
                  Total
                </td>
                <td className="py-3 px-3 text-right">{Math.round(abs.eggTotals.pEggs)}</td>
                <td className="py-3 px-3 text-right">{Math.round(abs.eggTotals.uEggs)}</td>
                <td className="py-3 px-3 text-right">{Math.round(abs.eggTotals.totalEggs)}</td>
                <td className="py-3 px-4 text-right">{f2(abs.eggTotals.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
