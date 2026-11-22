import type {
  CalcMenuDay,
  CalcMenuKey,
  LadooNorms,
  MDMState,
  MasterDayEntry,
  MealNorms,
  MenuDay,
  MenuKey,
  RiceMonthData,
  RiceSeparateData,
} from '../types/mdm';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MENU_KEYS: MenuKey[] = ['rice', 'veg', 'oil', 'fuel', 'egg', 'dal', 'soya', 'ladoo'];
export const MENU_LABELS: Record<MenuKey, string> = {
  rice: 'Rice',
  veg: 'Vegetable',
  oil: 'Oil',
  fuel: 'Fuel Cost',
  egg: 'Egg',
  dal: 'Dal',
  soya: 'Soya',
  ladoo: 'Laddoo',
};

export const CALC_MENU_KEYS: CalcMenuKey[] = [
  'rice',
  'veg',
  'oil',
  'fuel',
  'egg',
  'dal',
  'laddoo',
  'soya',
];
export const CALC_MENU_LABELS: Record<CalcMenuKey, string> = {
  rice: 'Rice',
  veg: 'Vegetable',
  oil: 'Oil',
  fuel: 'Fuel cost',
  egg: 'Egg',
  dal: 'Dal',
  laddoo: 'Laddoo',
  soya: 'Soya',
};

export const LADOO_INGREDIENTS = [
  { key: 'ragi', label: 'Ragi flour', unit: 'g/child' },
  { key: 'wheat', label: 'Wheat flour', unit: 'g/child' },
  { key: 'sesame', label: 'Sesame', unit: 'g/child' },
  { key: 'jaggery', label: 'Jaggery / raw sugar', unit: 'g/child' },
  { key: 'ghee', label: 'Ghee / refined oil', unit: 'g/child' },
  { key: 'gnut', label: 'Groundnut', unit: 'g/child' },
  { key: 'card', label: 'Cardamom powder', unit: 'g/child' },
] as const;

export function defaultMenu(): MenuDay[] {
  const on = (...active: MenuKey[]): MenuDay =>
    Object.fromEntries(MENU_KEYS.map((k) => [k, active.includes(k)])) as MenuDay;
  const base: MenuKey[] = ['rice', 'veg', 'oil', 'fuel'];
  return [
    on(),
    on(...base, 'egg'),
    on(...base, 'soya', 'ladoo'),
    on(...base, 'egg'),
    on(...base, 'dal', 'ladoo'),
    on(...base, 'egg'),
    on(...base, 'soya', 'ladoo'),
  ];
}

export function defaultCalcMenu(): CalcMenuDay[] {
  const on = (...active: CalcMenuKey[]): CalcMenuDay =>
    Object.fromEntries(CALC_MENU_KEYS.map((k) => [k, active.includes(k)])) as CalcMenuDay;
  const base: CalcMenuKey[] = ['rice', 'veg', 'oil', 'fuel'];
  return [
    on(),
    on(...base, 'egg'),
    on(...base, 'laddoo', 'soya'),
    on(...base, 'egg'),
    on(...base, 'dal', 'laddoo'),
    on(...base, 'egg'),
    on(...base, 'laddoo', 'soya'),
  ];
}

export function defaultPrimaryNorms(): MealNorms {
  return { rice: 100, veg: 60, oil: 5, fuel: 0.76, cond: 0, dal: 25, soya: 12, egg: 1, ladoo: 1 };
}

export function defaultUpperNorms(): MealNorms {
  return { rice: 150, veg: 100, oil: 7.5, fuel: 1, cond: 0, dal: 30, soya: 25, egg: 1, ladoo: 1 };
}

export function defaultLadooNorms(): LadooNorms {
  return {
    ragi: 12,
    wheat: 12,
    sesame: 1,
    jaggery: 6,
    ghee: 2,
    gnut: 1,
    card: 0.04,
    cost: 0.26,
  };
}

export function defaultWeekdayRates(): [number, number][] {
  return [
    [0, 0],
    [11.78, 14.58],
    [10.19, 15.08],
    [11.78, 14.58],
    [11.15, 14.53],
    [11.78, 14.58],
    [10.19, 15.08],
  ];
}

export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function formatDisplayDate(iso: string): string {
  return iso.split('-').reverse().join('-');
}

export function formatShortDate(iso: string): string {
  const day = iso.slice(8, 10);
  const mIdx = Number(iso.slice(5, 7)) - 1;
  return `${day} ${MONTHS_SHORT[mIdx] ?? ''}`;
}

export function formatMonthName(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

export function getDaysInMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`);
}

export function getDayOfWeek(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}

export function nz(v: unknown): boolean {
  return v !== '' && v != null && !Number.isNaN(Number(v));
}

export function f3(n: number): string {
  return Number(n || 0).toFixed(3);
}

export function f2(n: number): string {
  return Number(n || 0).toFixed(2);
}

export function fm(v: number, decimals: number): string {
  if (!v) return '';
  return decimals ? v.toFixed(decimals) : String(Math.round(v * 100) / 100);
}

export function formatINR(n: number, decimals = 0): string {
  return (
    '₹' +
    Number(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function splitTotal(total: number, weights: number[]): [number, number, number] {
  const sumWeights = weights.reduce((a, b) => a + (Number(b) || 0), 0);
  if (!sumWeights) {
    const q = Math.floor(total / 3);
    const r = total - q * 3;
    return [q + (r > 0 ? 1 : 0), q + (r > 1 ? 1 : 0), q];
  }
  const raw = weights.map((x) => (total * (Number(x) || 0)) / sumWeights);
  const fl = raw.map(Math.floor);
  let rem = total - fl.reduce((a, b) => a + b, 0);
  raw
    .map((x, i) => [x - fl[i], i] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rem > 0) {
        fl[i]++;
        rem--;
      }
    });
  return [fl[0], fl[1], fl[2]];
}

export const DEFAULT_ROLL_STRENGTH = { sb: 23, ps: 111, up: 91 } as const;

export function createSampleMonthEntries(monthKey: string): {
  master: Record<string, MasterDayEntry>;
  riceMonth: RiceMonthData;
} {
  const days = getDaysInMonth(monthKey);
  const master: Record<string, MasterDayEntry> = {};
  const entries: RiceMonthData['entries'] = [];
  const rcP: Record<string, number> = {};
  const rcU: Record<string, number> = {};

  // Realistic Odisha school attendance pattern (within SB:23, PS:111, UP:91)
  const sbPattern = [20, 21, 19, 22, 20, 18];
  const psPattern = [98, 102, 96, 104, 95, 91];
  const upPattern = [80, 84, 79, 85, 78, 74];

  let workingCount = 0;
  days.forEach((dt, idx) => {
    const dow = getDayOfWeek(dt);
    if (dow === 0) return; // Sunday

    // Mark 1 local festival holiday on the 2nd Friday/Saturday if available
    if (idx === 13) {
      master[dt] = { h: 'Local Holiday' };
      return;
    }

    // Populate first 18 working days so user sees rich charts & still has days left to edit
    if (workingCount < 18) {
      const pIdx = workingCount % 6;
      master[dt] = {
        sb: String(sbPattern[pIdx]),
        ps: String(psPattern[pIdx]),
        up: String(upPattern[pIdx]),
      };
      if (workingCount === 4) {
        entries.push({ date: dt, sb: 0, pr: 0, up: 0, rc: 200 });
        rcP[dt] = 100;
        rcU[dt] = 100;
      }
      if (workingCount === 12) {
        entries.push({ date: dt, sb: 0, pr: 0, up: 0, rc: 150 });
        rcP[dt] = 75;
        rcU[dt] = 75;
      }
      workingCount++;
    }
  });

  return {
    master,
    riceMonth: {
      opening: 285.5,
      entries,
      sep: {
        openP: 145.5,
        openU: 140.0,
        rcP,
        rcU,
      },
    },
  };
}

export function createDefaultState(seedCurrentMonth = true): MDMState {
  const now = new Date();
  const currentMonthKey = formatIsoDate(now).slice(0, 7);
  const sample = seedCurrentMonth ? createSampleMonthEntries(currentMonthKey) : null;

  return {
    school: 'Govt. U.G. High School Malda',
    profile: {
      name: 'UMA SANKAR MALI',
      designation: 'Assistant Teacher',
      schoolShort: 'Govt UGHS MALDA',
      udiseCode: '21270504201',
      block: 'Malda Block',
      district: 'Odisha',
      state: 'Odisha',
      academicSession: `${now.getFullYear()}-${String((now.getFullYear() + 1) % 100).padStart(2, '0')}`,
      email: 'umasankarmali55@gmail.com',
      phone: '',
    },
    rates: [0.1, 0.1, 0.15],
    rr: [null, null, null],
    rmode: 'c',
    months: sample ? { [currentMonthKey]: sample.riceMonth } : {},
    m: {
      ratio: { ...DEFAULT_ROLL_STRENGTH },
      months: sample ? { [currentMonthKey]: sample.master } : {},
    },
    p: {
      norms: defaultPrimaryNorms(),
      menu: defaultMenu(),
      months: {},
    },
    u: {
      norms: defaultUpperNorms(),
      menu: defaultMenu(),
      months: {},
    },
    l: {
      norms: defaultLadooNorms(),
      menu: [false, false, true, false, true, false, true],
      months: {},
    },
    c: {
      counts: ['100', '100', '100', '100'],
      rates: defaultWeekdayRates(),
      menus: [defaultCalcMenu(), defaultCalcMenu()],
    },
    sx: { rice: 200 },
    pr: { dal: 115, soya: 160, oil: 140, egg: 7, ladoo: 3.5 },
    pm: { p: 11.15, u: 14.74 },
    lp: {
      ragi: 150,
      wheat: 41.67,
      sesame: 140,
      jaggery: 45,
      ghee: 160,
      gnut: 150,
      card: 1500,
    },
  };
}

export function hydrateState(raw: unknown): MDMState {
  const base = createDefaultState(false);
  if (!raw || typeof raw !== 'object') {
    return createDefaultState(true);
  }
  const s = raw as Partial<MDMState>;
  return {
    ...base,
    ...s,
    school: s.school || base.school,
    profile: { ...base.profile, ...(s.profile || {}) },
    rates: s.rates || base.rates,
    rr: s.rr || base.rr,
    rmode: s.rmode === 's' ? 's' : 'c',
    months: s.months || {},
    m: {
      ratio:
        !s.m?.ratio ||
        (s.m.ratio.sb === 34 && s.m.ratio.ps === 95 && s.m.ratio.up === 88) ||
        (s.m.ratio.sb === 100 && s.m.ratio.ps === 100 && s.m.ratio.up === 100)
          ? { ...DEFAULT_ROLL_STRENGTH }
          : s.m.ratio,
      months: s.m?.months || {},
    },
    p: {
      norms: { ...base.p.norms, ...(s.p?.norms || {}) },
      menu: s.p?.menu?.length === 7 ? s.p.menu : base.p.menu,
      months: s.p?.months || {},
    },
    u: {
      norms: { ...base.u.norms, ...(s.u?.norms || {}) },
      menu: s.u?.menu?.length === 7 ? s.u.menu : base.u.menu,
      months: s.u?.months || {},
    },
    l: {
      norms: { ...base.l.norms, ...(s.l?.norms || {}) },
      menu: s.l?.menu?.length === 7 ? s.l.menu : base.l.menu,
      months: s.l?.months || {},
    },
    c: {
      counts: s.c?.counts?.length === 4 ? s.c.counts : base.c.counts,
      rates: s.c?.rates?.length === 7 ? s.c.rates : base.c.rates,
      menus: s.c?.menus?.length === 2 ? s.c.menus : base.c.menus,
    },
    sx: { rice: s.sx?.rice ?? base.sx.rice },
    pr: { ...base.pr, ...(s.pr || {}) },
    pm: { ...base.pm, ...(s.pm || {}) },
    lp: { ...base.lp, ...(s.lp || {}) },
  };
}

export function getMasterDay(
  state: MDMState,
  date: string
): { sb?: string | number; ps?: string | number; up?: string | number; h?: string } | null {
  const m = state.m.months[date.slice(0, 7)];
  const r = m && m[date];
  if (!r) return null;
  if (r.h) return { sb: 0, ps: 0, up: 0, h: r.h };
  return r;
}

export function getHolidayLabel(state: MDMState, date: string): string {
  const m = getMasterDay(state, date);
  return m?.h || '';
}

export function getEffectiveRiceRates(state: MDMState): [number, number, number] {
  const base: [number, number, number] = [
    state.p.norms.rice / 1000,
    state.p.norms.rice / 1000,
    state.u.norms.rice / 1000,
  ];
  const overrides = state.rr || [null, null, null];
  return [
    nz(overrides[0]) ? Number(overrides[0]) : base[0],
    nz(overrides[1]) ? Number(overrides[1]) : base[1],
    nz(overrides[2]) ? Number(overrides[2]) : base[2],
  ];
}

export function getLinkedAttendance(
  state: MDMState,
  date: string
): { sb: number; pr: number; up: number } | null {
  if (!date) return null;
  const k = date.slice(0, 7);
  const P = state.p.months[k]?.[date] || null;
  const U = state.u.months[k]?.[date] || null;
  const L = state.l.months[k]?.[date] || null;
  const M0 = getMasterDay(state, date);

  const pick = (...vals: unknown[]): number | null => {
    for (const x of vals) {
      if (nz(x)) return Number(x);
    }
    return null;
  };

  const sb = pick(M0?.sb, P?.sb, L?.sb);
  const pr = pick(M0?.ps, P?.ps, L?.ps);
  const up = pick(M0?.up, U?.up, L?.ups);

  if (sb == null && pr == null && up == null) return null;
  return { sb: sb || 0, pr: pr || 0, up: up || 0 };
}

export interface RiceCalculatedRow {
  date: string;
  dow: number;
  sb: number;
  pr: number;
  up: number;
  rc: number;
  opening: number;
  consumption: number;
  cp: number;
  cu: number;
  closing: number;
  linked: boolean;
  manual: boolean;
  holiday: string;
}

export function calcRiceRegister(state: MDMState, monthKey: string): RiceCalculatedRow[] {
  const m = state.months[monthKey] || { opening: 0, entries: [] };
  const days = getDaysInMonth(monthKey);
  const rt = getEffectiveRiceRates(state);
  let bal = Number(m.opening) || 0;

  return days.map((d) => {
    const e = (m.entries || []).find((x) => x.date === d);
    const holiday = getHolidayLabel(state, d);
    const L = holiday ? null : getLinkedAttendance(state, d);
    const dow = getDayOfWeek(d);
    const sb = holiday ? 0 : L ? L.sb : e ? Number(e.sb) || 0 : 0;
    const pr = holiday ? 0 : L ? L.pr : e ? Number(e.pr) || 0 : 0;
    const up = holiday ? 0 : L ? L.up : e ? Number(e.up) || 0 : 0;

    const esb = holiday || (L && !state.p.menu[dow].rice) ? 0 : sb;
    const epr = holiday || (L && !state.p.menu[dow].rice) ? 0 : pr;
    const eup = holiday || (L && !state.u.menu[dow].rice) ? 0 : up;

    const rc = e ? Number(e.rc) || 0 : 0;
    const opening = bal;
    const cp = esb * rt[0] + epr * rt[1];
    const cu = eup * rt[2];
    const consumption = cp + cu;
    const closing = opening + rc - consumption;
    bal = closing;

    return {
      date: d,
      dow,
      sb,
      pr,
      up,
      rc,
      opening,
      consumption,
      cp,
      cu,
      closing,
      linked: Boolean(L),
      manual: Boolean(e),
      holiday,
    };
  });
}

export interface RiceSeparateCalculated {
  openP: number;
  openU: number;
  rowsP: {
    date: string;
    dow: number;
    sb: number;
    pr: number;
    opening: number;
    rc: number;
    consumption: number;
    closing: number;
    holiday: string;
  }[];
  rowsU: {
    date: string;
    dow: number;
    up: number;
    opening: number;
    rc: number;
    consumption: number;
    closing: number;
    holiday: string;
  }[];
  totalsP: { sb: number; pr: number; open: number; rc: number; consumed: number; closing: number };
  totalsU: { up: number; open: number; rc: number; consumed: number; closing: number };
}

export function calcRiceSeparate(state: MDMState, monthKey: string): RiceSeparateCalculated {
  const baseRows = calcRiceRegister(state, monthKey);
  const sep: RiceSeparateData = state.months[monthKey]?.sep || {
    openP: 0,
    openU: 0,
    rcP: {},
    rcU: {},
  };

  let bp = Number(sep.openP) || 0;
  let bu = Number(sep.openU) || 0;
  const openP = bp;
  const openU = bu;
  let rp = 0;
  let ru = 0;
  let cp = 0;
  let cu = 0;
  let tsb = 0;
  let tpr = 0;
  let tup = 0;

  const rowsP: RiceSeparateCalculated['rowsP'] = [];
  const rowsU: RiceSeparateCalculated['rowsU'] = [];

  baseRows.forEach((e) => {
    const a = Number(sep.rcP?.[e.date]) || 0;
    const b = Number(sep.rcU?.[e.date]) || 0;
    const clp = bp + a - e.cp;
    const clu = bu + b - e.cu;

    rowsP.push({
      date: e.date,
      dow: e.dow,
      sb: e.sb,
      pr: e.pr,
      opening: bp,
      rc: a,
      consumption: e.cp,
      closing: clp,
      holiday: e.holiday,
    });
    rowsU.push({
      date: e.date,
      dow: e.dow,
      up: e.up,
      opening: bu,
      rc: b,
      consumption: e.cu,
      closing: clu,
      holiday: e.holiday,
    });

    bp = clp;
    bu = clu;
    rp += a;
    ru += b;
    cp += e.cp;
    cu += e.cu;
    tsb += e.sb;
    tpr += e.pr;
    tup += e.up;
  });

  return {
    openP,
    openU,
    rowsP,
    rowsU,
    totalsP: { sb: tsb, pr: tpr, open: openP, rc: rp, consumed: cp, closing: bp },
    totalsU: { up: tup, open: openU, rc: ru, consumed: cu, closing: bu },
  };
}

export function calcRiceMonthSummary(state: MDMState, monthKey: string) {
  const rows = calcRiceRegister(state, monthKey);
  const m = state.months[monthKey] || { opening: 0, entries: [] };
  const c = rows.reduce((a, r) => a + r.consumption, 0);
  let rcv = rows.reduce((a, r) => a + r.rc, 0);
  let o = Number(m.opening) || 0;

  if (state.rmode === 's' && m.sep) {
    o = (Number(m.sep.openP) || 0) + (Number(m.sep.openU) || 0);
    rcv = [
      ...Object.values(m.sep.rcP || {}),
      ...Object.values(m.sep.rcU || {}),
    ].reduce((a, v) => a + (Number(v) || 0), 0);
  }
  return { opening: o, received: rcv, consumed: c, closing: o + rcv - c };
}

export interface MealCalculatedRow {
  date: string;
  dow: number;
  holiday: string;
  sb: number;
  ps: number;
  up: number;
  totalCount: number;
  meals: number;
  rice: number;
  veg: number;
  oil: number;
  fuel: number;
  cond: number;
  dal: number;
  soya: number;
  egg: number;
  ladoo: number;
}

export interface MealMonthSummary {
  rows: MealCalculatedRow[];
  daysCount: number;
  sbTotal: number;
  psTotal: number;
  upTotal: number;
  totalCount: number;
  meals: number;
  rice: number;
  veg: number;
  oil: number;
  fuel: number;
  cond: number;
  dal: number;
  soya: number;
  egg: number;
  ladoo: number;
  budget: number;
}

export function calcMealRegister(
  state: MDMState,
  section: 'p' | 'u',
  monthKey: string
): MealMonthSummary {
  const st = state[section];
  const isUpper = section === 'u';
  const days = getDaysInMonth(monthKey);
  const pm = st.months[monthKey] || {};
  const n = st.norms;

  const totals: MealMonthSummary = {
    rows: [],
    daysCount: days.length,
    sbTotal: 0,
    psTotal: 0,
    upTotal: 0,
    totalCount: 0,
    meals: 0,
    rice: 0,
    veg: 0,
    oil: 0,
    fuel: 0,
    cond: 0,
    dal: 0,
    soya: 0,
    egg: 0,
    ladoo: 0,
    budget: 0,
  };

  days.forEach((dt) => {
    const dow = getDayOfWeek(dt);
    const e = pm[dt] || {};
    const mv = getMasterDay(state, dt);
    const holiday = getHolidayLabel(state, dt);

    const sb = holiday ? 0 : !isUpper ? Number(mv && nz(mv.sb) ? mv.sb : e.sb) || 0 : 0;
    const ps = holiday ? 0 : !isUpper ? Number(mv && nz(mv.ps) ? mv.ps : e.ps) || 0 : 0;
    const up = holiday ? 0 : isUpper ? Number(mv && nz(mv.up) ? mv.up : e.up) || 0 : 0;

    const totalCount = isUpper ? up : sb + ps;
    const meals = holiday
      ? 0
      : e.meals === '' || e.meals == null
      ? totalCount
      : Number(e.meals) || 0;
    const mn = st.menu[dow];
    const f = (k: MenuKey, v: number) => (mn[k] ? meals * v : 0);

    const row: MealCalculatedRow = {
      date: dt,
      dow,
      holiday,
      sb,
      ps,
      up,
      totalCount,
      meals,
      rice: f('rice', n.rice) / 1000,
      veg: f('veg', n.veg) / 1000,
      oil: f('oil', n.oil) / 1000,
      fuel: f('fuel', n.fuel),
      cond: f('veg', n.cond),
      dal: f('dal', n.dal) / 1000,
      soya: f('soya', n.soya) / 1000,
      egg: f('egg', n.egg),
      ladoo: f('ladoo', n.ladoo),
    };

    totals.rows.push(row);
    totals.sbTotal += sb;
    totals.psTotal += ps;
    totals.upTotal += up;
    totals.totalCount += totalCount;
    totals.meals += meals;
    totals.rice += row.rice;
    totals.veg += row.veg;
    totals.oil += row.oil;
    totals.fuel += row.fuel;
    totals.cond += row.cond;
    totals.dal += row.dal;
    totals.soya += row.soya;
    totals.egg += row.egg;
    totals.ladoo += row.ladoo;

    if (row.meals > 0 && mn.rice) {
      const perMealOverride = Number(state.pm[isUpper ? 'u' : 'p']) || 0;
      const weekdayRate = state.c.rates[dow]?.[isUpper ? 1 : 0] || 0;
      totals.budget += row.meals * (perMealOverride || weekdayRate);
    }
  });

  return totals;
}

export interface LadooCalculatedRow {
  date: string;
  dow: number;
  holiday: string;
  sb: number;
  ps: number;
  ups: number;
  tot: number;
  q: number;
  ragi: number;
  wheat: number;
  sesame: number;
  jaggery: number;
  ghee: number;
  gnut: number;
  card: number;
  cost: number;
}

export interface LadooMonthSummary {
  rows: LadooCalculatedRow[];
  daysCount: number;
  sb: number;
  ps: number;
  ups: number;
  tot: number;
  q: number;
  ragi: number;
  wheat: number;
  sesame: number;
  jaggery: number;
  ghee: number;
  gnut: number;
  card: number;
  cost: number;
}

export function calcLadooRegister(state: MDMState, monthKey: string): LadooMonthSummary {
  const st = state.l;
  const days = getDaysInMonth(monthKey);
  const pm = st.months[monthKey] || {};
  const n = st.norms;

  const summary: LadooMonthSummary = {
    rows: [],
    daysCount: days.length,
    sb: 0,
    ps: 0,
    ups: 0,
    tot: 0,
    q: 0,
    ragi: 0,
    wheat: 0,
    sesame: 0,
    jaggery: 0,
    ghee: 0,
    gnut: 0,
    card: 0,
    cost: 0,
  };

  days.forEach((dt) => {
    const dow = getDayOfWeek(dt);
    const e = pm[dt] || {};
    const mv = getMasterDay(state, dt);
    const holiday = getHolidayLabel(state, dt);

    const sb = holiday ? 0 : Number(mv && nz(mv.sb) ? mv.sb : e.sb) || 0;
    const ps = holiday ? 0 : Number(mv && nz(mv.ps) ? mv.ps : e.ps) || 0;
    const ups = holiday ? 0 : Number(mv && nz(mv.up) ? mv.up : e.ups) || 0;
    const tot = sb + ps + ups;
    const q = !holiday && st.menu[dow] ? tot : 0;

    const row: LadooCalculatedRow = {
      date: dt,
      dow,
      holiday,
      sb,
      ps,
      ups,
      tot,
      q,
      ragi: (q * n.ragi) / 1000,
      wheat: (q * n.wheat) / 1000,
      sesame: (q * n.sesame) / 1000,
      jaggery: (q * n.jaggery) / 1000,
      ghee: (q * n.ghee) / 1000,
      gnut: (q * n.gnut) / 1000,
      card: (q * n.card) / 1000,
      cost: q * n.cost,
    };

    summary.rows.push(row);
    summary.sb += sb;
    summary.ps += ps;
    summary.ups += ups;
    summary.tot += tot;
    summary.q += q;
    summary.ragi += row.ragi;
    summary.wheat += row.wheat;
    summary.sesame += row.sesame;
    summary.jaggery += row.jaggery;
    summary.ghee += row.ghee;
    summary.gnut += row.gnut;
    summary.card += row.card;
    summary.cost += row.cost;
  });

  return summary;
}

export function calcLadooUnitIngredientCost(state: MDMState): number {
  const ingSum = LADOO_INGREDIENTS.reduce(
    (acc, item) => acc + (state.l.norms[item.key] * state.lp[item.key]) / 1000,
    0
  );
  return ingSum + (Number(state.l.norms.cost) || 0);
}

export interface AbstractCalculation {
  P: MealMonthSummary;
  U: MealMonthSummary;
  L: LadooMonthSummary;
  R: ReturnType<typeof calcRiceMonthSummary>;
  aP: {
    dal: number;
    soya: number;
    oil: number;
    egg: number;
    ladoo: number;
    fuel: number;
    cond: number;
    veg: number;
    tot: number;
  };
  aU: {
    dal: number;
    soya: number;
    oil: number;
    egg: number;
    ladoo: number;
    fuel: number;
    cond: number;
    veg: number;
    tot: number;
  };
  totalAmount: number;
  ladooIngredientsTotalAmount: number;
  eggRows: {
    date: string;
    dow: number;
    holiday: string;
    pEggs: number;
    uEggs: number;
    totalEggs: number;
    amount: number;
  }[];
  eggTotals: {
    pEggs: number;
    uEggs: number;
    totalEggs: number;
    amount: number;
  };
}

export function calcAbstractMonth(state: MDMState, monthKey: string): AbstractCalculation {
  const P = calcMealRegister(state, 'p', monthKey);
  const U = calcMealRegister(state, 'u', monthKey);
  const L = calcLadooRegister(state, monthKey);
  const R = calcRiceMonthSummary(state, monthKey);
  const pr = state.pr;

  const calcAmounts = (T: MealMonthSummary) => {
    const dal = T.dal * pr.dal;
    const soya = T.soya * pr.soya;
    const oil = T.oil * pr.oil;
    const egg = T.egg * pr.egg;
    const ladoo = T.ladoo * pr.ladoo;
    const fuel = T.fuel;
    const cond = T.cond;
    const other = dal + soya + oil + egg + ladoo + fuel + cond;
    const veg = T.budget ? T.budget - other : 0;
    const tot = other + veg;
    return { dal, soya, oil, egg, ladoo, fuel, cond, veg, tot };
  };

  const aP = calcAmounts(P);
  const aU = calcAmounts(U);

  const ladooIngredientsTotalAmount = LADOO_INGREDIENTS.reduce(
    (acc, item) => acc + L[item.key] * state.lp[item.key],
    0
  );

  const eggRows: AbstractCalculation['eggRows'] = [];
  let tp = 0;
  let tu = 0;

  P.rows.forEach((pRow, idx) => {
    const uRow = U.rows[idx];
    const pEggs = pRow.egg;
    const uEggs = uRow ? uRow.egg : 0;
    const isEggWeekday = Boolean(state.p.menu[pRow.dow]?.egg || state.u.menu[pRow.dow]?.egg);
    if (pEggs + uEggs > 0 || (pRow.holiday && isEggWeekday)) {
      tp += pEggs;
      tu += uEggs;
      eggRows.push({
        date: pRow.date,
        dow: pRow.dow,
        holiday: pRow.holiday,
        pEggs,
        uEggs,
        totalEggs: pEggs + uEggs,
        amount: (pEggs + uEggs) * pr.egg,
      });
    }
  });

  return {
    P,
    U,
    L,
    R,
    aP,
    aU,
    totalAmount: aP.tot + aU.tot,
    ladooIngredientsTotalAmount,
    eggRows,
    eggTotals: {
      pEggs: tp,
      uEggs: tu,
      totalEggs: tp + tu,
      amount: (tp + tu) * pr.egg,
    },
  };
}

export function getAttributionLine(state: MDMState): string {
  const { name, designation, schoolShort } = state.profile;
  return `Created by ${name}, ${designation}, ${schoolShort || state.school}`;
}
