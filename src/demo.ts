// Dữ liệu mẫu chỉ dùng cho bản demo trên trình duyệt. App trên điện thoại bắt đầu trống.
import { emptyData, todayISO, uid, type AppData, type Transaction } from './model';

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function demoData(now = new Date()): AppData {
  const d = emptyData();
  const r = rnd(42);
  const rate = d.settings.rate;
  const txs: Transaction[] = [];
  const add = (type: Transaction['type'], categoryId: string, amount: number, date: Date, note = '') =>
    txs.push({
      id: uid(),
      type,
      categoryId,
      amount,
      currency: type === 'expense' ? 'CNY' : 'VND',
      rate: rate - 20 + Math.round(r() * 40),
      note,
      date: todayISO(date),
      createdAt: date.getTime() + Math.round(r() * 1000),
    });

  for (let m = 1; m >= 0; m--) {
    const first = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const lastDay = m === 0 ? now.getDate() : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    add('income', 'salary', 32_000_000, new Date(first.getFullYear(), first.getMonth(), 1), 'Lương tháng');
    add('income', 'fx', 850_000, new Date(first.getFullYear(), first.getMonth(), Math.min(10, lastDay)), 'Đổi USD');
    if (m === 1) add('income', 'stock', 1_200_000, new Date(first.getFullYear(), first.getMonth(), 18), 'Bán FPT');
    add('expense', 'housing', 2300, new Date(first.getFullYear(), first.getMonth(), 1), 'Tiền nhà');
    add('expense', 'phone', 99, new Date(first.getFullYear(), first.getMonth(), Math.min(3, lastDay)), 'Gói cước');
    for (let day = 1; day <= lastDay; day++) {
      const dt = new Date(first.getFullYear(), first.getMonth(), day, 12);
      add('expense', 'food', Math.round(25 + r() * 45), dt, ['Bữa trưa', 'Mì bò', 'Cơm tối', 'Trà sữa'][Math.floor(r() * 4)]);
      if (r() < 0.6) add('expense', 'transport', Math.round(4 + r() * 20), dt, r() < 0.5 ? 'Tàu điện' : 'Didi');
      if (r() < 0.3) add('expense', 'grocery', Math.round(40 + r() * 120), dt, 'Siêu thị');
      if (r() < 0.12) add('expense', 'shopping', Math.round(60 + r() * 220), dt, 'Taobao');
      if (r() < 0.1) add('expense', 'fun', Math.round(40 + r() * 100), dt, 'Xem phim');
      if (r() < 0.05) add('expense', 'health', Math.round(30 + r() * 80), dt, 'Hiệu thuốc');
    }
  }
  d.transactions = txs;
  d.settings.lastBackupAt = Date.now() - 9 * 86_400_000;
  return d;
}
