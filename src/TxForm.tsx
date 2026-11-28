import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from './store';
import { amountToInput, categoriesByUsage, convert, formatAmountInput, formatMoney, parseAmount, todayISO, type Transaction, type TxType } from './model';

export function TxForm({ initial, defaultType = 'expense', onDone }: { initial?: Transaction; defaultType?: TxType; onDone: () => void }) {
  const { data, addTx, updateTx, deleteTx, toast } = useStore();
  const [type, setType] = useState<TxType>(initial?.type ?? defaultType);
  const [amount, setAmount] = useState(initial ? amountToInput(initial.amount, initial.currency) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [rate, setRate] = useState(String(initial?.rate ?? data.settings.rate));
  const [error, setError] = useState('');

  const cats = useMemo(() => categoriesByUsage(data.categories, data.transactions, type), [data.categories, data.transactions, type]);
  const currency = type === 'expense' ? 'CNY' : 'VND';
  const value = parseAmount(amount);
  const rateNum = parseAmount(rate);
  const selected = categoryId && cats.some((c) => c.id === categoryId) ? categoryId : '';

  const preview = value > 0 && rateNum > 0 ? convert({ amount: value, currency, rate: rateNum }, currency === 'CNY' ? 'VND' : 'CNY') : 0;

  function save() {
    if (!(value > 0)) return setError('Nhập số tiền lớn hơn 0.');
    if (!selected) return setError('Chọn một danh mục.');
    if (!(rateNum > 0)) return setError('Tỷ giá không hợp lệ.');
    const tx = { type, amount: value, currency, rate: rateNum, categoryId: selected, note: note.trim(), date } as const;
    if (initial) updateTx({ ...initial, ...tx });
    else addTx(tx);
    toast(initial ? 'Đã lưu thay đổi' : `Đã ghi ${type === 'expense' ? 'khoản chi' : 'khoản thu'} ${formatMoney(value, currency)}`);
    onDone();
  }

  return (
    <div className="tx-form">
      {!initial && (
        <div className="seg seg-wide">
          <button className={type === 'expense' ? 'on expense' : ''} onClick={() => { setType('expense'); setCategoryId(''); setAmount(''); }}>Khoản chi</button>
          <button className={type === 'income' ? 'on income' : ''} onClick={() => { setType('income'); setCategoryId(''); setAmount(''); }}>Khoản thu</button>
        </div>
      )}

      <label className="amount-field">
        <span className="amount-cur">{currency === 'CNY' ? '¥' : '₫'}</span>
        <input
          autoFocus={!initial}
          inputMode={currency === 'VND' ? 'numeric' : 'decimal'}
          placeholder="0"
          value={amount}
          onChange={(e) => { setAmount(formatAmountInput(e.target.value, currency)); setError(''); }}
          aria-label={currency === 'CNY' ? 'Số tiền (tệ)' : 'Số tiền (VNĐ)'}
        />
        {currency === 'VND' && (
          <button type="button" className="zeros-btn" onClick={() => setAmount((a) => formatAmountInput((a || '0') + '000', 'VND'))}>000</button>
        )}
      </label>
      <div className="amount-hint">
        {preview > 0 ? <>≈ {formatMoney(preview, currency === 'CNY' ? 'VND' : 'CNY')}</> : type === 'expense' ? 'Nhập số tệ, ví dụ 35 hoặc 12,5' : 'Nhập số VNĐ, dấu chấm tự thêm. Bấm 000 để thêm ba số 0'}
      </div>

      <div className="field-label">Danh mục</div>
      <div className="cat-grid">
        {cats.map((c) => (
          <button key={c.id} className={'cat-chip' + (selected === c.id ? ' on' : '')} style={{ ['--c' as string]: c.color }}
            onClick={() => { setCategoryId(c.id); setError(''); }}>
            <span className="cat-emoji">{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      <div className="row-2">
        <label className="field">
          <span>Ngày</span>
          <input type="date" value={date} max="2100-12-31" onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Tỷ giá (1 ¥ = ? ₫)</span>
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Ghi chú (không bắt buộc)</span>
        <input value={note} placeholder={type === 'expense' ? 'Ví dụ: cơm trưa' : 'Ví dụ: lương tháng 11'} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        {initial && (
          <button className="btn btn-danger-ghost" onClick={() => {
            if (window.confirm('Xoá khoản này?')) { deleteTx(initial.id); toast('Đã xoá'); onDone(); }
          }}>
            <Trash2 size={18} /> Xoá
          </button>
        )}
        <button className="btn btn-primary grow" onClick={save}>{initial ? 'Lưu thay đổi' : 'Lưu'}</button>
      </div>
    </div>
  );
}

export function TxRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const { data } = useStore();
  const cat = data.categories.find((c) => c.id === tx.categoryId);
  const other = tx.currency === 'CNY' ? 'VND' : 'CNY';
  return (
    <button className="tx-row" onClick={onClick}>
      <span className="tx-icon" style={{ ['--c' as string]: cat?.color ?? '#94A3B8' }}>{cat?.icon ?? '❔'}</span>
      <span className="tx-main">
        <b>{tx.note || cat?.name || 'Không rõ'}</b>
        <small>{tx.note ? cat?.name ?? '(danh mục đã xoá)' : ''}</small>
      </span>
      <span className="tx-amt">
        <b className={tx.type === 'income' ? 'pos' : ''}>{formatMoney(tx.type === 'income' ? tx.amount : -tx.amount, tx.currency, { sign: true })}</b>
        <small>{formatMoney(convert(tx, other), other, { compact: true })}</small>
      </span>
    </button>
  );
}
