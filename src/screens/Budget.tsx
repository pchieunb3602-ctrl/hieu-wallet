import { useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { budgetRows, budgetTotals, formatMoney, parseAmount, type Category } from '../model';
import { Card, MonthPicker, Progress, Sheet } from '../ui';

export function Budget({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const { data, upsertCategory, toast } = useStore();
  const rows = budgetRows(data.transactions, data.categories, month);
  const t = budgetTotals(rows);
  const [editing, setEditing] = useState<Category | null>(null);
  const [val, setVal] = useState('');
  const alerts = rows.filter((r) => r.level === 'warn' || r.level === 'over');

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="muted">Hạn mức hằng tháng, tính bằng tệ</p>
          <h1>Ngân sách</h1>
        </div>
      </header>
      <MonthPicker value={month} onChange={setMonth} />

      <Card className="budget-hero">
        <div className="budget-hero-top">
          <div>
            <span className="muted">Đã chi</span>
            <b>{formatMoney(t.spent, 'CNY')}</b>
          </div>
          <div className="right">
            <span className="muted">Còn lại</span>
            <b className={t.budget - t.spent < 0 ? 'neg' : 'pos'}>{formatMoney(t.budget - t.spent, 'CNY')}</b>
          </div>
        </div>
        <Progress ratio={t.ratio} level={t.ratio > 1 ? 'over' : t.ratio >= 0.8 ? 'warn' : 'ok'} />
        <small className="muted">{Math.round(t.ratio * 100)}% của tổng {formatMoney(t.budget, 'CNY')}</small>
      </Card>

      {alerts.length > 0 && (
        <Card className="alert-card">
          <AlertTriangle size={20} />
          <div>
            {alerts.map((a) => (
              <p key={a.category.id}>
                <b>{a.category.icon} {a.category.name}</b>{' '}
                {a.level === 'over' ? `đã vượt ${formatMoney(a.spent - a.budget, 'CNY')}` : `đã dùng ${Math.round(a.ratio * 100)}%`}
              </p>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="budget-list">
          {rows.map((r) => (
            <button key={r.category.id} className="budget-row" onClick={() => { setEditing(r.category); setVal(r.budget ? String(r.budget) : ''); }}>
              <span className="tx-icon" style={{ ['--c' as string]: r.category.color }}>{r.category.icon}</span>
              <div className="budget-main">
                <div className="budget-line">
                  <b>{r.category.name}</b>
                  <span className={'budget-pct lvl-' + r.level}>{r.budget ? Math.round(r.ratio * 100) + '%' : 'Chưa đặt'}</span>
                </div>
                <Progress ratio={r.ratio} level={r.level} color={r.category.color} />
                <small className="muted">
                  {formatMoney(r.spent, 'CNY')} / {r.budget ? formatMoney(r.budget, 'CNY') : '—'}
                  {r.budget > 0 && r.budget - r.spent >= 0 && <> · còn {formatMoney(r.budget - r.spent, 'CNY')}</>}
                </small>
              </div>
              <Pencil size={16} className="muted" />
            </button>
          ))}
        </div>
      </Card>
      <p className="footnote">Hạn mức tự áp dụng cho mọi tháng. Phần còn dư không cộng dồn sang tháng sau. App cảnh báo khi dùng đến 80%.</p>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `Ngân sách: ${editing.name}` : ''}>
        <label className="amount-field">
          <span className="amount-cur">¥</span>
          <input autoFocus inputMode="decimal" placeholder="0" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Hạn mức mỗi tháng (tệ)" />
        </label>
        <div className="amount-hint">Hạn mức mỗi tháng · để trống nếu không muốn đặt</div>
        <button className="btn btn-primary full" onClick={() => {
          if (!editing) return;
          const n = val.trim() ? parseAmount(val) : 0;
          if (Number.isNaN(n) || n < 0) return toast('Số tiền không hợp lệ');
          upsertCategory({ ...editing, budget: n || undefined });
          toast('Đã lưu ngân sách');
          setEditing(null);
        }}>Lưu</button>
      </Sheet>
    </div>
  );
}
