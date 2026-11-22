export type MenuKey = 'rice' | 'veg' | 'oil' | 'fuel' | 'egg' | 'dal' | 'soya' | 'ladoo';
export type CalcMenuKey = 'rice' | 'veg' | 'oil' | 'fuel' | 'egg' | 'dal' | 'laddoo' | 'soya';

export type MenuDay = Record<MenuKey, boolean>;
export type CalcMenuDay = Record<CalcMenuKey, boolean>;

export interface MealNorms {
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

export interface LadooNorms {
  ragi: number;
  wheat: number;
  sesame: number;
  jaggery: number;
  ghee: number;
  gnut: number;
  card: number;
  cost: number;
}

export interface LadooPrices {
  ragi: number;
  wheat: number;
  sesame: number;
  jaggery: number;
  ghee: number;
  gnut: number;
  card: number;
}

export interface AbstractPrices {
  dal: number;
  soya: number;
  oil: number;
  egg: number;
  ladoo: number;
}

export interface PerMealCost {
  p: number | '';
  u: number | '';
}

export interface RiceEntry {
  date: string;
  sb: number;
  pr: number;
  up: number;
  rc: number;
}

export interface RiceSeparateData {
  openP: number;
  openU: number;
  rcP: Record<string, number>;
  rcU: Record<string, number>;
}

export interface RiceMonthData {
  opening: number;
  entries: RiceEntry[];
  sep?: RiceSeparateData;
}

export interface MealDayOverride {
  sb?: string;
  ps?: string;
  up?: string;
  meals?: string;
}

export interface LadooDayOverride {
  sb?: string;
  ps?: string;
  ups?: string;
}

export interface MasterDayEntry {
  sb?: string;
  ps?: string;
  up?: string;
  h?: string; // Holiday remark
}

export interface RollStrength {
  sb: number;
  ps: number;
  up: number;
}

export interface UserProfile {
  name: string;
  designation: string;
  schoolShort: string;
  udiseCode: string;
  block: string;
  district: string;
  state: string;
  academicSession: string;
  email: string;
  phone: string;
}

export interface MDMState {
  school: string;
  profile: UserProfile;
  rates: [number, number, number];
  rr: [number | null, number | null, number | null];
  rmode: 'c' | 's';
  months: Record<string, RiceMonthData>;
  m: {
    ratio: RollStrength;
    months: Record<string, Record<string, MasterDayEntry>>;
  };
  p: {
    norms: MealNorms;
    menu: MenuDay[];
    months: Record<string, Record<string, MealDayOverride>>;
  };
  u: {
    norms: MealNorms;
    menu: MenuDay[];
    months: Record<string, Record<string, MealDayOverride>>;
  };
  l: {
    norms: LadooNorms;
    menu: boolean[];
    months: Record<string, Record<string, LadooDayOverride>>;
  };
  c: {
    counts: [string, string, string, string];
    rates: [number, number][];
    menus: [CalcMenuDay[], CalcMenuDay[]];
  };
  sx: {
    rice: number;
  };
  pr: AbstractPrices;
  pm: PerMealCost;
  lp: LadooPrices;
}

export type ViewId =
  | 'dashboard'
  | 'master'
  | 'primary'
  | 'upper'
  | 'ladoo'
  | 'rice'
  | 'calculator'
  | 'abstract'
  | 'profile';
