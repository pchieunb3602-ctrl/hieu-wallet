// Kiểu dữ liệu và các hàm tính toán thuần (không phụ thuộc giao diện) của Hieu Wallet.

export type TxType = 'expense' | 'income';
export type Currency = 'CNY' | 'VND';

export interface Category {
  id: string;
  type: TxType;
  name: string;
  icon: string; // emoji
  color: string; // màu nhấn của danh mục
  budget?: number; // hạn mức hằng tháng, tính bằng tệ (chỉ dùng cho danh mục chi)
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number; // số tiền theo đơn vị gốc: chi = tệ, thu = VNĐ
  currency: Currency;
  rate: number; // tỷ giá lúc ghi: 1 tệ = bao nhiêu VNĐ
  categoryId: string;
  note: string;
  date: string; // yyyy-mm-dd
  createdAt: number;
}

export interface Settings {
  rate: number; // tỷ giá hiện tại: 1 tệ = ? VNĐ
  displayCurrency: Currency; // đơn vị xem báo cáo
  lockEnabled: boolean;
  lastBackupAt: number | null;
  name: string;
}

export interface AppData {
  version: 1;
  categories: Category[];
  transactions: Transaction[];
  settings: Settings;
}

export const BUDGET_WARN = 0.8;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', type: 'expense', name: 'Ăn uống', icon: '🍜', color: '#F59E0B', budget: 1500 },
  { id: 'grocery', type: 'expense', name: 'Đi chợ / siêu thị', icon: '🛒', color: '#10B981', budget: 800 },
  { id: 'transport', type: 'expense', name: 'Đi lại', icon: '🚇', color: '#38BDF8', budget: 300 },
  { id: 'housing', type: 'expense', name: 'Nhà ở', icon: '🏠', color: '#6366F1', budget: 2500 },
  { id: 'phone', type: 'expense', name: 'Điện thoại / internet', icon: '📱', color: '#8B5CF6', budget: 150 },
  { id: 'shopping', type: 'expense', name: 'Mua sắm', icon: '🛍️', color: '#EC4899', budget: 600 },
  { id: 'health', type: 'expense', name: 'Sức khoẻ', icon: '💊', color: '#EF4444', budget: 300 },
  { id: 'fun', type: 'expense', name: 'Giải trí', icon: '🎉', color: '#A855F7', budget: 400 },
  { id: 'other', type: 'expense', name: 'Khác', icon: '📦', color: '#94A3B8', budget: 300 },
  { id: 'salary', type: 'income', name: 'Lương', icon: '💼', color: '#4F46E5' },
  { id: 'fx', type: 'income', name: 'Lãi đổi tệ', icon: '💱', color: '#06B6D4' },
  { id: 'stock', type: 'income', name: 'Lãi chứng khoán', icon: '📈', color: '#22C55E' },
  { id: 'income-other', type: 'income', name: 'Thu khác', icon: '➕', color: '#A78BFA' },
];

export const DEFAULT_SETTINGS: Settings = {
  rate: 3550,
  displayCurrency: 'VND',
  lockEnabled: true,
  lastBackupAt: null,
  name: 'Hiếu',
};

export function emptyData(): AppData {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Ngày tháng ----------

export function todayISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `Tháng ${m}/${y}`;
}

export function dateLabel(iso: string, today = todayISO()): string {
  if (iso === today) return 'Hôm nay';
  const t = new Date(today + 'T00:00:00');
  t.setDate(t.getDate() - 1);
  if (iso === todayISO(t)) return 'Hôm qua';
  const [y, m, d] = iso.split('-').map(Number);
  const wd = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(y, m - 1, d).getDay()];
  return `${wd}, ${d}/${m}`;
}

// ---------- Tiền tệ ----------

/** Đổi một khoản sang đơn vị cần xem, dùng tỷ giá đã lưu cùng khoản đó. */
export function convert(tx: Pick<Transaction, 'amount' | 'currency' | 'rate'>, to: Currency): number {
  if (tx.currency === to) return tx.amount;
  if (!tx.rate || tx.rate <= 0) return 0;
  return to === 'VND' ? tx.amount * tx.rate : tx.amount / tx.rate;
}

export function formatMoney(value: number, currency: Currency, opts: { compact?: boolean; sign?: boolean } = {}): string {
  const neg = value < 0;
  const abs = Math.abs(value);
  let body: string;
  if (currency === 'VND') {
    if (opts.compact && abs >= 1_000_000) {
      body = (abs / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr ₫';
    } else if (opts.compact && abs >= 10_000) {
      body = Math.round(abs / 1000).toLocaleString('vi-VN') + 'k ₫';
    } else {
      body = Math.round(abs).toLocaleString('vi-VN') + ' ₫';
    }
  } else {
    body = '¥' + abs.toLocaleString('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: abs % 1 ? 2 : 0 });
  }
  const sign = neg ? '−' : opts.sign && value > 0 ? '+' : '';
  return sign + body;
}

/** Đọc số người dùng gõ: chấp nhận "1.500.000", "25,5", "25.5", "1500k". */
export function parseAmount(input: string): number {
  let s = input.trim().toLowerCase().replace(/\s/g, '');
  if (!s) return NaN;
  let mult = 1;
  if (s.endsWith('k')) { mult = 1000; s = s.slice(0, -1); }
  else if (s.endsWith('tr')) { mult = 1_000_000; s = s.slice(0, -2); }
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 1.500.000 kiểu Việt
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, ''); // 1,500,000
  else s = s.replace(',', '.'); // 25,5 -> 25.5
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s) * mult;
}

// ---------- Tổng hợp ----------

export function txInMonth(txs: Transaction[], key: string): Transaction[] {
  return txs.filter((t) => monthKey(t.date) === key);
}

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
}

export function summarize(txs: Transaction[], key: string, cur: Currency): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of txInMonth(txs, key)) {
    const v = convert(t, cur);
    if (t.type === 'income') income += v;
    else expense += v;
  }
  return { income, expense, balance: income - expense };
}

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
}

export function totalsByCategory(txs: Transaction[], cats: Category[], key: string, type: TxType, cur: Currency): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const c of cats) if (c.type === type) map.set(c.id, { category: c, total: 0, count: 0 });
  for (const t of txInMonth(txs, key)) {
    if (t.type !== type) continue;
    const row = map.get(t.categoryId);
    if (!row) continue;
    row.total += convert(t, cur);
    row.count += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Chi theo từng ngày trong tháng (mảng dài bằng số ngày). */
export function dailyExpense(txs: Transaction[], key: string, cur: Currency): number[] {
  const out = new Array(daysInMonth(key)).fill(0);
  for (const t of txInMonth(txs, key)) {
    if (t.type !== 'expense') continue;
    out[Number(t.date.slice(8, 10)) - 1] += convert(t, cur);
  }
  return out;
}

export type BudgetLevel = 'ok' | 'warn' | 'over' | 'none';

export interface BudgetRow {
  category: Category;
  spent: number; // tệ
  budget: number; // tệ
  ratio: number;
  level: BudgetLevel;
}

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (!budget || budget <= 0) return 'none';
  const r = spent / budget;
  if (r > 1) return 'over';
  if (r >= BUDGET_WARN) return 'warn';
  return 'ok';
}

/** Ngân sách luôn tính bằng tệ vì chi tiêu ghi bằng tệ. */
export function budgetRows(txs: Transaction[], cats: Category[], key: string): BudgetRow[] {
  return totalsByCategory(txs, cats, key, 'expense', 'CNY').map(({ category, total }) => {
    const budget = category.budget ?? 0;
    return { category, spent: total, budget, ratio: budget > 0 ? total / budget : 0, level: budgetLevel(total, budget) };
  });
}

export function budgetTotals(rows: BudgetRow[]): { spent: number; budget: number; ratio: number } {
  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const spent = rows.filter((r) => r.budget > 0).reduce((s, r) => s + r.spent, 0);
  return { spent, budget, ratio: budget > 0 ? spent / budget : 0 };
}

/** Danh mục sắp theo số lần dùng gần đây, để danh mục hay dùng nằm đầu. */
export function categoriesByUsage(cats: Category[], txs: Transaction[], type: TxType): Category[] {
  const recent = [...txs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  const count = new Map<string, number>();
  for (const t of recent) if (t.type === type) count.set(t.categoryId, (count.get(t.categoryId) ?? 0) + 1);
  const list = cats.filter((c) => c.type === type);
  return list
    .map((c, i) => ({ c, i, n: count.get(c.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c);
}

export function sortTx(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export function groupByDate(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const out: { date: string; items: Transaction[] }[] = [];
  for (const t of sortTx(txs)) {
    const last = out[out.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else out.push({ date: t.date, items: [t] });
  }
  return out;
}

// ---------- Sao lưu ----------

export const BACKUP_REMIND_DAYS = 7;

export function needsBackupReminder(s: Settings, txCount: number, now = Date.now()): boolean {
  if (txCount === 0) return false;
  if (!s.lastBackupAt) return true;
  return now - s.lastBackupAt > BACKUP_REMIND_DAYS * 86_400_000;
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ app: 'hieu-wallet', exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Đọc file sao lưu; ném lỗi tiếng Việt nếu file không hợp lệ. */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('File không đọc được. Hãy chọn đúng file sao lưu của Hieu Wallet (.json).');
  }
  const obj = raw as { app?: string; data?: AppData };
  const d = obj?.data;
  if (obj?.app !== 'hieu-wallet' || !d || !Array.isArray(d.transactions) || !Array.isArray(d.categories) || !d.settings) {
    throw new Error('Đây không phải file sao lưu của Hieu Wallet.');
  }
  for (const t of d.transactions) {
    if (typeof t.id !== 'string' || typeof t.amount !== 'number' || typeof t.date !== 'string' || (t.type !== 'expense' && t.type !== 'income')) {
      throw new Error('File sao lưu bị hỏng (có khoản ghi không hợp lệ).');
    }
  }
  return {
    version: 1,
    categories: d.categories,
    transactions: d.transactions,
    settings: { ...DEFAULT_SETTINGS, ...d.settings },
  };
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Xuất CSV mở được bằng Excel (có BOM để hiện đúng tiếng Việt). */
export function toCSV(data: AppData): string {
  const cat = new Map(data.categories.map((c) => [c.id, c]));
  const header = ['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Đơn vị', 'Tỷ giá (VNĐ/tệ)', 'Quy ra VNĐ', 'Quy ra tệ', 'Ghi chú'];
  const rows = sortTx(data.transactions).map((t) => [
    t.date,
    t.type === 'expense' ? 'Chi' : 'Thu',
    cat.get(t.categoryId)?.name ?? '(đã xoá)',
    t.amount,
    t.currency === 'CNY' ? 'tệ' : 'VNĐ',
    t.rate,
    Math.round(convert(t, 'VND')),
    Math.round(convert(t, 'CNY') * 100) / 100,
    t.note,
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
