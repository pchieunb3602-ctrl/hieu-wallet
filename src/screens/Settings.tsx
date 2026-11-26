import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, FileSpreadsheet, Fingerprint, Plus, RefreshCw, Upload, User, Wallet, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { emptyData, formatMoney, parseAmount, parseBackup, serializeBackup, toCSV, todayISO, uid, type Category, type TxType } from '../model';
import { biometricAvailable, isNative, shareFile } from '../platform';
import { Card, CardTitle, Sheet } from '../ui';

const COLORS = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#22C55E', '#06B6D4', '#38BDF8', '#4F46E5', '#94A3B8'];

export function SettingsScreen() {
  const { data, updateSettings, replaceAll, toast } = useStore();
  const s = data.settings;
  const [rate, setRate] = useState(String(s.rate));
  const [name, setName] = useState(s.name);
  const [bioOK, setBioOK] = useState<boolean | null>(null);
  const [catType, setCatType] = useState<TxType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { biometricAvailable().then(setBioOK); }, []);

  async function exportBackup() {
    try {
      await shareFile(`hieu-wallet-saoluu-${todayISO()}.json`, serializeBackup(data), 'application/json');
      updateSettings({ lastBackupAt: Date.now() });
      toast('Đã tạo file sao lưu');
    } catch {
      toast('Chưa sao lưu được, thử lại nhé');
    }
  }

  async function exportCSV() {
    try {
      await shareFile(`hieu-wallet-${todayISO()}.csv`, toCSV(data), 'text/csv');
      toast('Đã xuất file Excel (CSV)');
    } catch {
      toast('Chưa xuất được, thử lại nhé');
    }
  }

  async function importFile(f: File) {
    try {
      const d = parseBackup(await f.text());
      if (!window.confirm(`Khôi phục ${d.transactions.length} khoản từ file này? Dữ liệu hiện tại trên máy sẽ bị thay thế.`)) return;
      replaceAll({ ...d, settings: { ...d.settings, lastBackupAt: Date.now() } });
      setRate(String(d.settings.rate));
      setName(d.settings.name);
      toast('Đã khôi phục dữ liệu');
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const lastBackup = s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleDateString('vi-VN') : 'chưa bao giờ';

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <p className="muted">Hieu Wallet</p>
          <h1>Cài đặt</h1>
        </div>
      </header>

      <Card>
        <CardTitle icon={<RefreshCw size={18} />}>Tỷ giá</CardTitle>
        <label className="field inline">
          <span>1 ¥ =</span>
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)}
            onBlur={() => {
              const n = parseAmount(rate);
              if (n > 0) { updateSettings({ rate: n }); toast('Đã lưu tỷ giá'); } else setRate(String(s.rate));
            }} />
          <span>₫</span>
        </label>
        <p className="footnote">Tỷ giá này điền sẵn khi bạn ghi khoản mới. Các khoản đã ghi giữ nguyên tỷ giá lúc ghi. Ví dụ ¥100 ≈ {formatMoney(100 * s.rate, 'VND')}.</p>
      </Card>

      <Card>
        <CardTitle icon={<Wallet size={18} />}>Danh mục</CardTitle>
        <div className="seg seg-wide">
          <button className={catType === 'expense' ? 'on' : ''} onClick={() => setCatType('expense')}>Chi</button>
          <button className={catType === 'income' ? 'on' : ''} onClick={() => setCatType('income')}>Thu</button>
        </div>
        <div className="settings-list">
          {data.categories.filter((c) => c.type === catType).map((c) => (
            <button key={c.id} className="settings-row" onClick={() => setEditing(c)}>
              <span className="tx-icon" style={{ ['--c' as string]: c.color }}>{c.icon}</span>
              <span className="grow">{c.name}</span>
              {c.type === 'expense' && <small className="muted">{c.budget ? formatMoney(c.budget, 'CNY') + '/tháng' : ''}</small>}
              <ChevronRight size={16} className="muted" />
            </button>
          ))}
          <button className="settings-row add" onClick={() => setEditing({ id: '', type: catType, name: '', icon: '⭐', color: COLORS[0] })}>
            <span className="tx-icon add"><Plus size={18} /></span>
            <span className="grow">Thêm danh mục</span>
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle icon={<Download size={18} />}>Sao lưu</CardTitle>
        <p className="footnote">Lần sao lưu gần nhất: <b>{lastBackup}</b>. Dữ liệu chỉ nằm trong máy, nên hãy sao lưu đều đặn (app nhắc mỗi 7 ngày) và gửi file cho chính mình qua WeChat, Zalo hoặc lưu lên Samsung Cloud.</p>
        <div className="btn-stack">
          <button className="btn btn-primary" onClick={exportBackup}><Download size={18} /> Xuất file sao lưu</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={18} /> Khôi phục từ file</button>
          <button className="btn btn-ghost" onClick={exportCSV}><FileSpreadsheet size={18} /> Xuất Excel (CSV)</button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
      </Card>

      <Card>
        <CardTitle icon={<Fingerprint size={18} />}>Bảo mật</CardTitle>
        <label className="switch-row">
          <span>
            <b>Khoá bằng vân tay</b>
            <small className="muted">
              {!isNative ? 'Chỉ hoạt động trong app trên điện thoại.' : bioOK === false ? 'Máy chưa cài vân tay hoặc mã khoá màn hình.' : 'Mỗi lần mở app. Có thể dùng mã PIN của máy nếu vân tay không nhận.'}
            </small>
          </span>
          <input type="checkbox" className="switch" checked={s.lockEnabled} onChange={(e) => updateSettings({ lockEnabled: e.target.checked })} />
        </label>
      </Card>

      <Card>
        <CardTitle icon={<User size={18} />}>Cá nhân</CardTitle>
        <label className="field">
          <span>Tên hiển thị</span>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && updateSettings({ name: name.trim() })} />
        </label>
        <button className="btn btn-danger-ghost full" onClick={() => {
          if (window.confirm('Xoá TOÀN BỘ dữ liệu trên máy? Không hoàn tác được. Nên xuất file sao lưu trước.')) {
            replaceAll({ ...emptyData(), settings: { ...emptyData().settings, name: s.name, rate: s.rate } });
            toast('Đã xoá toàn bộ dữ liệu');
          }
        }}><Trash2 size={18} /> Xoá toàn bộ dữ liệu</button>
      </Card>

      <p className="footnote center">Hieu Wallet 1.0 · chạy hoàn toàn offline</p>

      <CategoryEditor cat={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategoryEditor({ cat, onClose }: { cat: Category | null; onClose: () => void }) {
  const { data, upsertCategory, deleteCategory, toast } = useStore();
  const [draft, setDraft] = useState<Category | null>(cat);
  const [budget, setBudget] = useState('');
  useEffect(() => { setDraft(cat); setBudget(cat?.budget ? String(cat.budget) : ''); }, [cat]);
  if (!draft) return null;
  const isNew = !draft.id;
  const used = data.transactions.filter((t) => t.categoryId === draft.id).length;

  return (
    <Sheet open={!!cat} onClose={onClose} title={isNew ? 'Thêm danh mục' : 'Sửa danh mục'}>
      <div className="row-2 cat-edit-top">
        <label className="field emoji-field">
          <span>Biểu tượng</span>
          <input value={draft.icon} maxLength={4} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        </label>
        <label className="field grow">
          <span>Tên</span>
          <input autoFocus={isNew} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ví dụ: Gửi tiền về nhà" />
        </label>
      </div>
      <div className="field-label">Màu</div>
      <div className="colors">
        {COLORS.map((c) => (
          <button key={c} aria-label={c} className={draft.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} />
        ))}
      </div>
      {draft.type === 'expense' && (
        <label className="field">
          <span>Ngân sách mỗi tháng (tệ, không bắt buộc)</span>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ví dụ: 500" />
        </label>
      )}
      <div className="form-actions">
        {!isNew && (
          <button className="btn btn-danger-ghost" onClick={() => {
            if (used > 0) return toast(`Danh mục đang có ${used} khoản nên không xoá được. Bạn có thể đổi tên.`);
            if (window.confirm(`Xoá danh mục "${draft.name}"?`)) { deleteCategory(draft.id); toast('Đã xoá danh mục'); onClose(); }
          }}><Trash2 size={18} /> Xoá</button>
        )}
        <button className="btn btn-primary grow" onClick={() => {
          if (!draft.name.trim()) return toast('Nhập tên danh mục');
          const b = budget.trim() ? parseAmount(budget) : 0;
          if (Number.isNaN(b) || b < 0) return toast('Ngân sách không hợp lệ');
          upsertCategory({ ...draft, id: draft.id || uid(), name: draft.name.trim(), icon: draft.icon.trim() || '⭐', budget: draft.type === 'expense' && b > 0 ? b : undefined });
          toast(isNew ? 'Đã thêm danh mục' : 'Đã lưu danh mục');
          onClose();
        }}>Lưu</button>
      </div>
    </Sheet>
  );
}
