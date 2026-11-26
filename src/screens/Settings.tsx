import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, FileSpreadsheet, Fingerprint, Plus, RefreshCw, Upload, User, Wallet, Trash2, Image as ImageIcon, Target } from 'lucide-react';
import { useStore } from '../store';
import { emptyData, formatMoney, parseAmount, parseBackup, serializeBackup, toCSV, todayISO, uid, type Category, type TxType } from '../model';
import { biometricAvailable, isNative, shareFile, shrinkImage } from '../platform';
import { BG_PRESETS, Card, CardTitle, Sheet } from '../ui';

const COLORS = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#22C55E', '#06B6D4', '#38BDF8', '#4F46E5', '#94A3B8'];

export function SettingsScreen() {
  const { data, updateSettings, replaceAll, toast, bgImage, setBgImage } = useStore();
  const bgRef = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const [rate, setRate] = useState(String(s.rate));
  const [name, setName] = useState(s.name);
  const [budget, setBudget] = useState(s.monthlyBudget ? String(s.monthlyBudget) : '');
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
      setBudget(d.settings.monthlyBudget ? String(d.settings.monthlyBudget) : '');
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
        <CardTitle icon={<Target size={18} />}>Ngân sách tháng</CardTitle>
        <label className="field inline">
          <span>¥</span>
          <input inputMode="decimal" value={budget} placeholder="Chưa đặt" onChange={(e) => setBudget(e.target.value)}
            onBlur={() => {
              const n = budget.trim() ? parseAmount(budget) : 0;
              if (Number.isNaN(n) || n < 0) { setBudget(s.monthlyBudget ? String(s.monthlyBudget) : ''); return toast('Số tiền không hợp lệ'); }
              updateSettings({ monthlyBudget: n });
              toast(n ? 'Đã lưu ngân sách tháng' : 'Đã bỏ ngân sách tháng');
            }} />
          <span>/ tháng</span>
        </label>
        <p className="footnote">Tổng chi mỗi tháng (tính bằng tệ). App cảnh báo khi dùng đến 80% và báo đỏ khi vượt. Để trống nếu không muốn đặt.</p>
      </Card>

      <Card>
        <CardTitle icon={<ImageIcon size={18} />}>Hình nền</CardTitle>
        <div className="bg-grid">
          {BG_PRESETS.map((b) => (
            <button key={b.id} className={'bg-tile' + (s.background === b.id ? ' on' : '')}
              style={{ backgroundImage: b.css || 'var(--bg)' }} onClick={() => updateSettings({ background: b.id })}>
              <span>{b.name}</span>
            </button>
          ))}
          {bgImage && (
            <button className={'bg-tile' + (s.background === 'custom' ? ' on' : '')} style={{ backgroundImage: `url(${bgImage})` }}
              onClick={() => updateSettings({ background: 'custom' })}>
              <span>Ảnh của bạn</span>
            </button>
          )}
          <button className="bg-tile pick" onClick={() => bgRef.current?.click()}>
            <ImageIcon size={22} />
            {bgImage ? 'Đổi ảnh' : 'Chọn ảnh'}
          </button>
        </div>
        <input ref={bgRef} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setBgImage(await shrinkImage(f));
            updateSettings({ background: 'custom' });
            toast('Đã đặt ảnh nền');
          } catch (err) {
            toast((err as Error).message);
          }
        }} />
        {s.background === 'custom' && bgImage && (
          <>
            <label className="field" style={{ marginTop: 12 }}>
              <span>Làm mờ ảnh cho dễ đọc chữ: {Math.round(s.bgDim * 100)}%</span>
              <input className="range" type="range" min="0" max="0.8" step="0.05" value={s.bgDim}
                onChange={(e) => updateSettings({ bgDim: Number(e.target.value) })} />
            </label>
            <button className="btn btn-danger-ghost full" onClick={() => { setBgImage(null); updateSettings({ background: 'default' }); toast('Đã bỏ ảnh nền'); }}>
              <Trash2 size={18} /> Bỏ ảnh nền
            </button>
          </>
        )}
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
  useEffect(() => { setDraft(cat); }, [cat]);
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
      <div className="form-actions">
        {!isNew && (
          <button className="btn btn-danger-ghost" onClick={() => {
            if (used > 0) return toast(`Danh mục đang có ${used} khoản nên không xoá được. Bạn có thể đổi tên.`);
            if (window.confirm(`Xoá danh mục "${draft.name}"?`)) { deleteCategory(draft.id); toast('Đã xoá danh mục'); onClose(); }
          }}><Trash2 size={18} /> Xoá</button>
        )}
        <button className="btn btn-primary grow" onClick={() => {
          if (!draft.name.trim()) return toast('Nhập tên danh mục');
          upsertCategory({ ...draft, id: draft.id || uid(), name: draft.name.trim(), icon: draft.icon.trim() || '⭐' });
          toast(isNew ? 'Đã thêm danh mục' : 'Đã lưu danh mục');
          onClose();
        }}>Lưu</button>
      </div>
    </Sheet>
  );
}
