// Các thành phần giao diện dùng chung.
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatMoney, monthLabel, shiftMonth, type Currency, type BudgetLevel } from './model';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={'card ' + className} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-title">
      {icon && <span className="card-title-icon">{icon}</span>}
      <h3>{children}</h3>
      {right && <div className="card-title-right">{right}</div>}
    </div>
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="month-picker">
      <button aria-label="Tháng trước" onClick={() => onChange(shiftMonth(value, -1))}><ChevronLeft size={18} /></button>
      <span>{monthLabel(value)}</span>
      <button aria-label="Tháng sau" onClick={() => onChange(shiftMonth(value, 1))}><ChevronRight size={18} /></button>
    </div>
  );
}

export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Đơn vị tiền">
      {(['VND', 'CNY'] as Currency[]).map((c) => (
        <button key={c} role="radio" aria-checked={value === c} className={value === c ? 'on' : ''} onClick={() => onChange(c)}>
          {c === 'VND' ? '₫ VNĐ' : '¥ Tệ'}
        </button>
      ))}
    </div>
  );
}

export function Money({ value, cur, compact, sign, className = '' }: { value: number; cur: Currency; compact?: boolean; sign?: boolean; className?: string }) {
  return <span className={'money ' + className}>{formatMoney(value, cur, { compact, sign })}</span>;
}

export function Progress({ ratio, level, color }: { ratio: number; level: BudgetLevel; color?: string }) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const bg = level === 'over' ? 'var(--danger)' : level === 'warn' ? 'var(--warn)' : color ?? 'var(--primary)';
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: pct + '%', background: bg }} />
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

// ---------- Biểu đồ ----------

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({ values, cur, upto }: { values: number[]; cur: Currency; upto: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 320;
  const H = 140;
  const pad = { l: 4, r: 4, t: 14, b: 20 };
  const shown = values.slice(0, Math.max(1, upto));
  const max = Math.max(1, ...shown) * 1.15;
  const x = (i: number) => pad.l + (i / Math.max(1, values.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = shown.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smoothPath(pts);
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z` : '';
  const ticks = [1, 8, 15, 22, values.length];
  const active = sel ?? null;

  return (
    <div className="area-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Chi tiêu cộng dồn theo ngày"
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (values.length - 1));
          setSel(Math.max(0, Math.min(shown.length - 1, i)));
        }}
        onPointerLeave={() => setSel(null)}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} className="grid" />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {active !== null && pts[active] && (
          <g>
            <line x1={pts[active][0]} x2={pts[active][0]} y1={pad.t} y2={H - pad.b} className="cursor" />
            <circle cx={pts[active][0]} cy={pts[active][1]} r="4" fill="var(--primary)" stroke="var(--surface-solid)" strokeWidth="2" />
          </g>
        )}
        {ticks.map((t) => (
          <text key={t} x={x(t - 1)} y={H - 4} textAnchor={t === 1 ? 'start' : t === values.length ? 'end' : 'middle'} className="tick">
            {t}
          </text>
        ))}
      </svg>
      {active !== null && pts[active] && (
        <div className="chart-tip" style={{ left: `${(pts[active][0] / W) * 100}%` }}>
          <small>Ngày {active + 1}</small>
          <b>{formatMoney(shown[active], cur, { compact: true })}</b>
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, center, sub }: { parts: { value: number; color: string }[]; center: string; sub: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Tỷ lệ chi theo danh mục">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--track)" strokeWidth="18" />
        {total > 0 &&
          parts.filter((p) => p.value > 0).map((p, i) => {
            const len = (p.value / total) * C;
            const gap = parts.length > 1 ? Math.min(2, len / 2) : 0;
            const el = (
              <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="18"
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="donut-center">
        <b>{center}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}

export const BG_PRESETS: { id: string; name: string; css: string }[] = [
  { id: 'default', name: 'Mặc định', css: '' },
  { id: 'sunset', name: 'Hoàng hôn', css: 'linear-gradient(160deg, #ffd6e0 0%, #ffe3c7 45%, #e9d5ff 100%)' },
  { id: 'ocean', name: 'Biển', css: 'linear-gradient(160deg, #cdeffd 0%, #d6e4ff 50%, #c7f5ec 100%)' },
  { id: 'mint', name: 'Bạc hà', css: 'linear-gradient(160deg, #d9fbe8 0%, #e6f7ff 55%, #eef0ff 100%)' },
  { id: 'peach', name: 'Đào', css: 'linear-gradient(160deg, #ffe4d6 0%, #fff1e0 50%, #ffd9ec 100%)' },
];

/** Lớp nền cố định phía sau app: gradient có sẵn hoặc ảnh người dùng chọn. */
export function Backdrop({ id, image, dim }: { id: string; image: string | null; dim: number }) {
  if (id === 'custom' && image) {
    return (
      <div className="backdrop" aria-hidden="true" style={{ backgroundImage: `url(${image})` }}>
        <div className="backdrop-dim" style={{ opacity: dim }} />
      </div>
    );
  }
  const p = BG_PRESETS.find((b) => b.id === id);
  if (!p || !p.css) return null;
  return <div className="backdrop" aria-hidden="true" style={{ backgroundImage: p.css }} />;
}
