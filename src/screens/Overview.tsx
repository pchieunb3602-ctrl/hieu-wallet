import { ArrowDownRight, ArrowUpRight, PiggyBank, Target, TrendingUp, PieChart, Clock, CloudUpload } from 'lucide-react';
import { useStore } from '../store';
import {
  budgetRows, budgetTotals, dailyExpense, formatMoney, monthKey, needsBackupReminder, shiftMonth, sortTx, summarize,
  todayISO, totalsByCategory, txInMonth, type Transaction,
} from '../model';
import { AreaChart, Card, CardTitle, CurrencyToggle, Donut, Empty, MonthPicker } from '../ui';
import { TxRow } from '../TxForm';

function pctChange(now: number, prev: number): number | null {
  if (!prev) return null;
  return ((now - prev) / prev) * 100;
}

export function Overview({ month, setMonth, onEdit, goTab }: {
  month: string; setMonth: (m: string) => void; onEdit: (t: Transaction) => void; goTab: (t: string) => void;
}) {
  const { data, updateSettings } = useStore();
  const cur = data.settings.displayCurrency;
  const s = summarize(data.transactions, month, cur);
  const prev = summarize(data.transactions, shiftMonth(month, -1), cur);
  const rows = budgetRows(data.transactions, data.categories, month);
  const bt = budgetTotals(rows);
  const cats = totalsByCategory(data.transactions, data.categories, month, 'expense', cur).filter((c) => c.total > 0);
  const daily = dailyExpense(data.transactions, month, cur);
  let run = 0;
  const cumulative = daily.map((v) => (run += v));
  const today = todayISO();
  const upto = monthKey(today) === month ? Number(today.slice(8, 10)) : month > monthKey(today) ? 0 : daily.length;
  const recent = sortTx(txInMonth(data.transactions, month)).slice(0, 5);
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const remind = needsBackupReminder(data.settings, data.transactions.length);

  const stats = [
    { key: 'in', label: 'Thu nhập', value: s.income, prev: prev.income, icon: <ArrowDownRight size={20} />, tone: 'indigo', good: 'up' },
    { key: 'out', label: 'Chi tiêu', value: s.expense, prev: prev.expense, icon: <ArrowUpRight size={20} />, tone: 'pink', good: 'down' },
    { key: 'bal', label: 'Còn dư', value: s.balance, prev: prev.balance, icon: <PiggyBank size={20} />, tone: 'cyan', good: 'up' },
  ] as const;

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="muted">{hello}, {data.settings.name} 👋</p>
          <h1>Tổng quan</h1>
        </div>
        <CurrencyToggle value={cur} onChange={(c) => updateSettings({ displayCurrency: c })} />
      </header>
      <MonthPicker value={month} onChange={setMonth} />

      {remind && (
        <Card className="banner" onClick={() => goTab('settings')}>
          <CloudUpload size={20} />
          <div><b>Đã lâu chưa sao lưu</b><small>Bấm để vào Cài đặt và xuất file sao lưu.</small></div>
        </Card>
      )}

      <div className="stats">
        {stats.map((st) => {
          const ch = pctChange(st.value, st.prev);
          const better = ch === null ? null : st.good === 'up' ? ch >= 0 : ch <= 0;
          return (
            <Card key={st.key} className={'stat ' + (st.key === 'bal' ? 'stat-wide' : '')}>
              <span className={'stat-icon tone-' + st.tone}>{st.icon}</span>
              <span className="stat-label">{st.label}</span>
              <b className={'stat-value' + (st.key === 'bal' && st.value < 0 ? ' neg' : '')}>{formatMoney(st.value, cur, { compact: cur === 'VND' && Math.abs(st.value) >= 100_000_000 })}</b>
              {ch !== null && (
                <span className={'stat-change ' + (better ? 'good' : 'bad')}>
                  {ch >= 0 ? '↑' : '↓'} {Math.abs(ch).toFixed(1)}% <em>so với tháng trước</em>
                </span>
              )}
            </Card>
          );
        })}
        <Card className="stat stat-wide" onClick={() => goTab('budget')}>
          <span className="stat-icon tone-violet"><Target size={20} /></span>
          <span className="stat-label">Ngân sách đã dùng</span>
          <b className={'stat-value' + (bt.ratio > 1 ? ' neg' : '')}>{bt.budget > 0 ? Math.round(bt.ratio * 100) + '%' : '—'}</b>
          <span className="stat-change muted">{formatMoney(bt.spent, 'CNY')} / {formatMoney(bt.budget, 'CNY')}</span>
        </Card>
      </div>

      <Card>
        <CardTitle icon={<TrendingUp size={18} />}>Chi tiêu cộng dồn</CardTitle>
        <div className="big-number">
          {formatMoney(s.expense, cur)}
          <small>tổng chi {month === monthKey(today) ? 'tháng này' : 'trong tháng'}</small>
        </div>
        <AreaChart values={cumulative} cur={cur} upto={upto} />
      </Card>

      <Card>
        <CardTitle icon={<PieChart size={18} />}>Chi theo danh mục</CardTitle>
        {cats.length === 0 ? (
          <Empty icon="🧾" title="Chưa có khoản chi nào" text="Bấm nút + ở dưới để ghi khoản chi đầu tiên." />
        ) : (
          <div className="donut-wrap">
            <Donut parts={cats.map((c) => ({ value: c.total, color: c.category.color }))} center={formatMoney(s.expense, cur, { compact: true })} sub={`${cats.reduce((a, c) => a + c.count, 0)} khoản`} />
            <ul className="legend">
              {cats.slice(0, 6).map((c) => (
                <li key={c.category.id}>
                  <i style={{ background: c.category.color }} />
                  <span>{c.category.name}<small>{s.expense ? ((c.total / s.expense) * 100).toFixed(1) : 0}%</small></span>
                  <b>{formatMoney(c.total, cur, { compact: true })}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle icon={<Clock size={18} />} right={recent.length > 0 && <button className="link" onClick={() => goTab('expense')}>Xem tất cả</button>}>Ghi gần đây</CardTitle>
        {recent.length === 0 ? (
          <Empty icon="✨" title="Tháng này chưa có gì" text="Các khoản bạn ghi sẽ hiện ở đây." />
        ) : (
          <div className="tx-list">{recent.map((t) => <TxRow key={t.id} tx={t} onClick={() => onEdit(t)} />)}</div>
        )}
      </Card>
    </div>
  );
}
