import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Cookie,
  FileSpreadsheet,
  GraduationCap,
  IndianRupee,
  Package,
  UserCheck,
  Utensils,
} from 'lucide-react';
import type { MDMState, ViewId } from '../types/mdm';
import {
  DAYS,
  MENU_KEYS,
  MENU_LABELS,
  calcAbstractMonth,
  calcRiceRegister,
  f3,
  formatINR,
  formatIsoDate,
  formatMonthName,
  getDayOfWeek,
} from '../utils/mdmEngine';

interface DashboardViewProps {
  state: MDMState;
  monthKey: string;
  onNavigate: (view: ViewId) => void;
}

const CHART_COLORS = [
  '#059669', // Vibrant Emerald
  '#F59E0B', // Vivid Amber
  '#0284C7', // Bright Sky Blue
  '#7C3AED', // Rich Violet
  '#E11D48', // Coral Rose
  '#0D9488', // Teal
  '#EA580C', // Warm Orange
];

export const DashboardView: React.FC<DashboardViewProps> = ({ state, monthKey, onNavigate }) => {
  const [chartTab, setChartTab] = useState<'attendance' | 'rice'>('attendance');

  const abstract = useMemo(() => calcAbstractMonth(state, monthKey), [state, monthKey]);
  const riceRows = useMemo(() => calcRiceRegister(state, monthKey), [state, monthKey]);

  const monthName = formatMonthName(monthKey);
  const totalMeals = abstract.P.meals + abstract.U.meals;
  const activeServingDays = useMemo(
    () => riceRows.filter((r) => r.sb + r.pr + r.up > 0 && !r.holiday).length,
    [riceRows]
  );
  const totalRoll = state.m.ratio.sb + state.m.ratio.ps + state.m.ratio.up;

  const dailyData = useMemo(
    () =>
      riceRows.map((r) => ({
        day: r.date.slice(8),
        fullDate: `${r.date.slice(8)} ${monthName.slice(0, 3)} (${DAYS[r.dow].slice(0, 3)})`,
        sb: r.sb,
        primary: r.pr,
        upper: r.up,
        total: r.sb + r.pr + r.up,
        opening: Number(r.opening.toFixed(2)),
        closing: Number(r.closing.toFixed(2)),
        consumed: Number(r.consumption.toFixed(2)),
        received: Number(r.rc.toFixed(2)),
      })),
    [riceRows, monthName]
  );

  const costBreakdown = useMemo(() => {
    return [
      { name: 'Vegetables', value: Math.max(0, abstract.aP.veg + abstract.aU.veg) },
      { name: 'Eggs', value: abstract.aP.egg + abstract.aU.egg },
      { name: 'Laddoo', value: abstract.aP.ladoo + abstract.aU.ladoo },
      { name: 'Dal', value: abstract.aP.dal + abstract.aU.dal },
      { name: 'Soya Chunks', value: abstract.aP.soya + abstract.aU.soya },
      { name: 'Cooking Oil', value: abstract.aP.oil + abstract.aU.oil },
      {
        name: 'Fuel & Condiments',
        value: abstract.aP.fuel + abstract.aU.fuel + abstract.aP.cond + abstract.aU.cond,
      },
    ].filter((x) => x.value > 0.01);
  }, [abstract]);

  const todayDow = getDayOfWeek(formatIsoDate(new Date()));
  const todayMenuItems = MENU_KEYS.filter((k) => state.p.menu[todayDow]?.[k]).map(
    (k) => MENU_LABELS[k]
  );

  const initials = state.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const quickSheets: {
    id: ViewId;
    title: string;
    subtitle: string;
    metric: string;
    iconBg: string;
    cardTint: string;
    metricColor: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'master',
      title: 'Master Attendance',
      subtitle: 'Single-entry attendance feeding Sheets 1–4',
      metric: `${activeServingDays} active days`,
      iconBg: 'bg-emerald-600 text-white',
      cardTint:
        'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/70 hover:border-emerald-500',
      metricColor: 'text-emerald-800 dark:text-emerald-300',
      icon: CalendarDays,
    },
    {
      id: 'primary',
      title: 'Sheet 1 · SB & Primary',
      subtitle: 'Shishu Batika & Classes I–V ration register',
      metric: `${abstract.P.meals.toLocaleString('en-IN')} meals`,
      iconBg: 'bg-sky-600 text-white',
      cardTint:
        'bg-sky-50/70 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800/70 hover:border-sky-500',
      metricColor: 'text-sky-800 dark:text-sky-300',
      icon: Utensils,
    },
    {
      id: 'upper',
      title: 'Sheet 2 · Upper Primary',
      subtitle: 'Classes VI–VIII ration & fuel register',
      metric: `${abstract.U.meals.toLocaleString('en-IN')} meals`,
      iconBg: 'bg-indigo-600 text-white',
      cardTint:
        'bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-800/70 hover:border-indigo-500',
      metricColor: 'text-indigo-800 dark:text-indigo-300',
      icon: GraduationCap,
    },
    {
      id: 'ladoo',
      title: 'Sheet 3 · Millet Laddoo',
      subtitle: 'Ragi, wheat, jaggery & ghee ingredient log',
      metric: `${abstract.L.q.toLocaleString('en-IN')} pcs`,
      iconBg: 'bg-amber-500 text-slate-950',
      cardTint:
        'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/70 hover:border-amber-500',
      metricColor: 'text-amber-800 dark:text-amber-300',
      icon: Cookie,
    },
    {
      id: 'rice',
      title: 'Sheet 4 · Rice Register',
      subtitle: state.rmode === 's' ? 'Separate group stock books' : 'Combined physical stock book',
      metric: `${f3(abstract.R.closing)} kg bal`,
      iconBg: 'bg-teal-600 text-white',
      cardTint:
        'bg-teal-50/70 dark:bg-teal-950/25 border-teal-200 dark:border-teal-800/70 hover:border-teal-500',
      metricColor: 'text-teal-800 dark:text-teal-300',
      icon: Package,
    },
    {
      id: 'abstract',
      title: 'Sheet 6 · Abstract Sheet',
      subtitle: 'Item-wise expenditure & Egg statement',
      metric: formatINR(abstract.totalAmount, 0),
      iconBg: 'bg-rose-600 text-white',
      cardTint:
        'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/70 hover:border-rose-500',
      metricColor: 'text-rose-800 dark:text-rose-300',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Vibrant Executive Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#0F766E] to-[#0369A1] text-white border-2 border-emerald-400/30 shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 90% 15%, rgba(251, 191, 36, 0.6), transparent 42%), radial-gradient(circle at 12% 90%, rgba(52, 211, 153, 0.45), transparent 48%)',
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-amber-300">
              <span>Mid-Day Meal · Odisha</span>
              <span aria-hidden="true">·</span>
              <span>{monthName}</span>
              <span aria-hidden="true">·</span>
              <span>Session {state.profile.academicSession}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white [text-wrap:balance]">
              {state.school}
            </h1>
            <p className="text-sm sm:text-base text-emerald-50/90 max-w-2xl leading-relaxed">
              Unified Mid-Day Meal stock ledger, automated attendance distribution, Millet Laddoo
              ingredient tracking, and audit-ready A4 PDF &amp; Excel reporting.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('master')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold text-sm shadow-md transition-all whitespace-nowrap"
              >
                <CalendarDays className="h-4 w-4" />
                Enter Attendance
              </button>
              <button
                type="button"
                onClick={() => onNavigate('calculator')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold text-sm transition-colors whitespace-nowrap"
              >
                <Calculator className="h-4 w-4" />
                Daily Meal Planner
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl bg-slate-950/30 backdrop-blur-xs border border-white/20 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-300">
              <span className="font-bold">Today&apos;s Scheduled Menu</span>
              <span className="font-mono font-bold">{DAYS[todayDow]}</span>
            </div>
            {todayMenuItems.length > 0 ? (
              <p className="text-sm font-semibold text-white leading-relaxed">
                {todayMenuItems.join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-emerald-100/85">Sunday — No regular meal scheduled.</p>
            )}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
              <span>Coordinator: {state.profile.name}</span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="text-amber-300 hover:text-amber-200 font-bold inline-flex items-center gap-1 whitespace-nowrap"
              >
                Profile
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Vibrant 4-Column Colorful KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100">Total Meals Served</span>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Utensils className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums">
            {totalMeals.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-100/90 tabular-nums">
            <span>Primary: {abstract.P.meals.toLocaleString('en-IN')}</span>
            <span aria-hidden="true">·</span>
            <span>Upper: {abstract.U.meals.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-100">Rice Closing Stock</span>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums">
            {f3(abstract.R.closing)} <span className="text-sm font-medium text-sky-100">kg</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-sky-100/90 tabular-nums">
            <span>Used: {f3(abstract.R.consumed)} kg</span>
            <span aria-hidden="true">·</span>
            <span>Recd: {f3(abstract.R.received)} kg</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-50">Monthly Expenditure</span>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums">
            {formatINR(abstract.totalAmount, 0)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-50/90 tabular-nums">
            <span>PS: {formatINR(abstract.aP.tot, 0)}</span>
            <span aria-hidden="true">·</span>
            <span>UPS: {formatINR(abstract.aU.tot, 0)}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-rose-600 text-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-100">Eggs &amp; Millet Laddoos</span>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Cookie className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums">
            {abstract.eggTotals.totalEggs.toLocaleString('en-IN')}{' '}
            <span className="text-sm font-normal text-white/70">/</span>{' '}
            {abstract.L.q.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-violet-100/90 tabular-nums">
            <span>Eggs: {formatINR(abstract.eggTotals.amount, 0)}</span>
            <span aria-hidden="true">·</span>
            <span>Laddoo prep: {formatINR(abstract.L.cost, 0)}</span>
          </div>
        </div>
      </section>

      {/* Main Analytics Canvas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Attendance & Rice Stock Trajectory Chart */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#111B24] border-2 border-emerald-600/25 dark:border-emerald-500/25 p-5 sm:p-6 flex flex-col shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {chartTab === 'attendance'
                  ? 'Daily Meal Attendance by Group'
                  : 'Monthly Rice Stock Balance Trajectory'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {chartTab === 'attendance'
                  ? `Shishu Batika, Primary (1–5) and Upper Primary (6–8) attendance for ${monthName}`
                  : `Running closing balance (kg) and daily consumption across ${monthName}`}
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-emerald-100/80 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setChartTab('attendance')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  chartTab === 'attendance'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => setChartTab('rice')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  chartTab === 'rice'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-emerald-900 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Rice Stock (kg)
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[290px] w-full">
            {totalMeals === 0 && abstract.R.opening === 0 && abstract.R.received === 0 ? (
              <div className="h-[290px] flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-emerald-200 dark:border-slate-700 rounded-xl">
                <ClipboardList className="h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No attendance or stock recorded for {monthName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Start entering daily attendance in Master Attendance to generate live charts and
                  automated registers.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('master')}
                  className="mt-4 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                >
                  Open Master Attendance
                </button>
              </div>
            ) : chartTab === 'attendance' ? (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(16, 185, 129, 0.22)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#064E3B',
                      border: '2px solid #34D399',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  />
                  <Bar dataKey="sb" name="Shishu Batika" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="primary" name="Primary (1–5)" stackId="a" fill="#0284C7" />
                  <Bar
                    dataKey="upper"
                    name="Upper Primary (6–8)"
                    stackId="a"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riceBalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(2, 132, 199, 0.22)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0C4A6E',
                      border: '2px solid #38BDF8',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="closing"
                    name="Closing Balance (kg)"
                    stroke="#0284C7"
                    strokeWidth={3}
                    fill="url(#riceBalGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="consumed"
                    name="Consumed (kg)"
                    stroke="#EA580C"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 pt-3 border-t-2 border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {chartTab === 'attendance' ? (
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-[#F59E0B]" /> Shishu Batika
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-[#0284C7]" /> Primary (1–5)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-[#059669]" /> Upper Primary (6–8)
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-[#0284C7]" /> Closing Balance (kg)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-[#EA580C]" /> Daily Consumption (kg)
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigate(chartTab === 'attendance' ? 'master' : 'rice')}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              View full register
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Monthly Expenditure Breakdown */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#111B24] border-2 border-amber-500/30 dark:border-amber-500/25 p-5 sm:p-6 flex flex-col shadow-xs">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Expenditure Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Vegetables auto-adjusted to per-child norm budget
            </p>
          </div>

          {costBreakdown.length > 0 ? (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {costBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatINR(Number(val) || 0, 2)}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '2px solid #F59E0B',
                        borderRadius: '10px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2 flex-1">
                {costBreakdown.map((item, idx) => {
                  const pct =
                    abstract.totalAmount > 0 ? (item.value / abstract.totalAmount) * 100 : 0;
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/70 last:border-0"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                        <span
                          className="h-3 w-3 rounded-xs shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 font-bold">
                        {formatINR(item.value, 0)}{' '}
                        <span className="text-slate-500 font-normal">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 py-10">
              Expenditure breakdown appears once attendance is entered.
            </div>
          )}
        </div>
      </section>

      {/* Bottom Operational Row: Colorful Register Suite + User Profile Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#111B24] border-2 border-teal-600/25 dark:border-teal-500/25 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Monthly Registers &amp; Sheets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All sheets synchronize automatically from Master Attendance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {quickSheets.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`group text-left rounded-xl border-2 p-4 transition-all flex items-start justify-between gap-3 ${item.cardTint}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${item.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                        {item.subtitle}
                      </p>
                      <div
                        className={`pt-1 font-mono text-xs font-extrabold tabular-nums ${item.metricColor}`}
                      >
                        {item.metric}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Colorful School & Coordinator Profile Card */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#111B24] border-2 border-indigo-500/25 dark:border-indigo-500/30 overflow-hidden flex flex-col justify-between shadow-xs">
          <div>
            <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-teal-700 p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold tracking-wide">School &amp; Coordinator Profile</h2>
                <UserCheck className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-display font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
                  {initials || 'UM'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-white truncate">
                    {state.profile.name}
                  </div>
                  <div className="text-xs text-indigo-100 truncate">
                    {state.profile.designation}
                  </div>
                  <div className="text-xs text-amber-300 font-semibold truncate">
                    {state.profile.schoolShort || state.school}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">UDISE Code</dt>
                  <dd className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {state.profile.udiseCode || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Block / State</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {state.profile.block}, {state.profile.state}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Total Roll Strength</dt>
                  <dd className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {totalRoll} students
                  </dd>
                </div>
              </dl>

              {totalRoll > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      style={{ width: `${(state.m.ratio.sb / totalRoll) * 100}%` }}
                      className="bg-amber-500"
                      title={`Shishu Batika: ${state.m.ratio.sb}`}
                    />
                    <div
                      style={{ width: `${(state.m.ratio.ps / totalRoll) * 100}%` }}
                      className="bg-sky-500"
                      title={`Primary: ${state.m.ratio.ps}`}
                    />
                    <div
                      style={{ width: `${(state.m.ratio.up / totalRoll) * 100}%` }}
                      className="bg-emerald-600"
                      title={`Upper Primary: ${state.m.ratio.up}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold font-mono tabular-nums">
                    <span className="text-amber-700 dark:text-amber-400">SB {state.m.ratio.sb}</span>
                    <span className="text-sky-700 dark:text-sky-400">PS {state.m.ratio.ps}</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      UPS {state.m.ratio.up}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              Manage Profile &amp; Backup Data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
