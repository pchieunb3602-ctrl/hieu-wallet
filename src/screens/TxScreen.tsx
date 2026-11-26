import { useState } from 'react';
import { useStore } from '../store';
import { dateLabel, formatMoney, groupByDate, totalsByCategory, txInMonth, convert, type Transaction, type TxType } from '../model';
import { Card, Empty, MonthPicker, CurrencyToggle } from '../ui';
import { TxRow } from '../TxForm';

/** Màn hình danh sách dùng chung cho tab Chi tiêu và tab Thu nhập. */
export function TxScreen({ type, month, setMonth, onEdit }: {
  type: TxType; month: string; setMonth: (m: string) => void; onEdit: (t: Transaction) => void;
}) {
  const { data, updateSettings } = useStore();
  const cur = data.settings.displayCurrency;
  const [filter, setFilter] = useState<string>('all');
  const totals = totalsByCategory(data.transactions, data.categories, month, type, cur);
  const used = totals.filter((t) => t.count > 0);
  const list = txInMonth(data.transactions, month).filter((t) => t.type === type && (filter === 'all' || t.categoryId === filter));
  const sum = list.reduce((s, t) => s + convert(t, cur), 0);
  const groups = groupByDate(list);
  const isExp = type === 'expense';

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="muted">{isExp ? 'Ghi bằng tệ' : 'Ghi bằng VNĐ'}</p>
          <h1>{isExp ? 'Chi tiêu' : 'Thu nhập'}</h1>
        </div>
        <CurrencyToggle value={cur} onChange={(c) => updateSettings({ displayCurrency: c })} />
      </header>
      <MonthPicker value={month} onChange={setMonth} />

      <Card className={'total-card ' + (isExp ? 'tone-exp' : 'tone-inc')}>
        <span>{filter === 'all' ? (isExp ? 'Tổng chi' : 'Tổng thu') : data.categories.find((c) => c.id === filter)?.name}</span>
        <b>{formatMoney(sum, cur)}</b>
        <small>{list.length} khoản</small>
      </Card>

      {!isExp && used.length > 0 && filter === 'all' && (
        <div className="income-split">
          {used.map((t) => (
            <Card key={t.category.id} className="mini" onClick={() => setFilter(t.category.id)}>
              <span className="mini-icon">{t.category.icon}</span>
              <small>{t.category.name}</small>
              <b>{formatMoney(t.total, cur, { compact: true })}</b>
            </Card>
          ))}
        </div>
      )}

      <div className="chips" role="tablist" aria-label="Lọc theo danh mục">
        <button className={filter === 'all' ? 'chip on' : 'chip'} onClick={() => setFilter('all')}>Tất cả</button>
        {used.map((t) => (
          <button key={t.category.id} className={filter === t.category.id ? 'chip on' : 'chip'} onClick={() => setFilter(t.category.id)}>
            {t.category.icon} {t.category.name}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card><Empty icon={isExp ? '🧾' : '💰'} title={isExp ? 'Chưa có khoản chi' : 'Chưa có khoản thu'} text="Bấm nút + ở dưới để thêm." /></Card>
      ) : (
        groups.map((g) => {
          const daySum = g.items.reduce((s, t) => s + convert(t, cur), 0);
          return (
            <Card key={g.date} className="day-group">
              <div className="day-head">
                <span>{dateLabel(g.date)}</span>
                <b>{formatMoney(isExp ? -daySum : daySum, cur, { sign: true, compact: cur === 'VND' })}</b>
              </div>
              <div className="tx-list">{g.items.map((t) => <TxRow key={t.id} tx={t} onClick={() => onEdit(t)} />)}</div>
            </Card>
          );
        })
      )}
    </div>
  );
}
