import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, Receipt, Wallet, Target, Settings as Cog, Plus, Fingerprint } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { StoreProvider, useStore } from './store';
import { monthKey, todayISO, type Transaction } from './model';
import { isNative, unlock } from './platform';
import { Backdrop, Sheet } from './ui';
import { TxForm } from './TxForm';
import { Overview } from './screens/Overview';
import { TxScreen } from './screens/TxScreen';
import { Budget } from './screens/Budget';
import { SettingsScreen } from './screens/Settings';

type Tab = 'home' | 'expense' | 'income' | 'budget' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Receipt }[] = [
  { id: 'home', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'expense', label: 'Chi tiêu', icon: Receipt },
  { id: 'income', label: 'Thu nhập', icon: Wallet },
  { id: 'budget', label: 'Ngân sách', icon: Target },
  { id: 'settings', label: 'Cài đặt', icon: Cog },
];

const RELOCK_AFTER_MS = 60_000;

function Shell() {
  const { data, toastMsg, bgImage } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [month, setMonth] = useState(monthKey(todayISO()));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [locked, setLocked] = useState(isNative && data.settings.lockEnabled);

  const tryUnlock = useCallback(async () => {
    if (await unlock()) setLocked(false);
  }, []);

  useEffect(() => {
    if (locked) tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khoá lại khi app ở nền quá 1 phút.
  useEffect(() => {
    if (!isNative) return;
    let hiddenAt = 0;
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) hiddenAt = Date.now();
      else if (data.settings.lockEnabled && hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER_MS) {
        setLocked(true);
        unlock().then((ok) => ok && setLocked(false));
      }
    });
    return () => { sub.then((h) => h.remove()); };
  }, [data.settings.lockEnabled]);

  // Nút Back của Android: đóng bảng đang mở, hoặc quay về Tổng quan.
  useEffect(() => {
    if (!isNative) return;
    const sub = CapApp.addListener('backButton', () => {
      if (adding) setAdding(false);
      else if (editing) setEditing(null);
      else if (tab !== 'home') setTab('home');
      else CapApp.minimizeApp();
    });
    return () => { sub.then((h) => h.remove()); };
  }, [adding, editing, tab]);

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  if (locked) {
    return (
      <div className="lock">
        <div className="lock-logo">₫¥</div>
        <h1>Hieu Wallet</h1>
        <p className="muted">Đã khoá để bảo vệ dữ liệu của bạn</p>
        <button className="btn btn-primary" onClick={tryUnlock}><Fingerprint size={20} /> Mở khoá</button>
      </div>
    );
  }

  const goTab = (t: string) => setTab(t as Tab);
  const defaultType = tab === 'income' ? 'income' : 'expense';

  return (
    <div className="app">
      <Backdrop id={data.settings.background} image={bgImage} dim={data.settings.bgDim} />
      <main>
        {tab === 'home' && <Overview month={month} setMonth={setMonth} onEdit={setEditing} goTab={goTab} />}
        {tab === 'expense' && <TxScreen key="e" type="expense" month={month} setMonth={setMonth} onEdit={setEditing} />}
        {tab === 'income' && <TxScreen key="i" type="income" month={month} setMonth={setMonth} onEdit={setEditing} />}
        {tab === 'budget' && <Budget month={month} setMonth={setMonth} />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="tabbar" aria-label="Điều hướng">
        {TABS.slice(0, 2).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} onClick={() => setTab(t.id)} />)}
        <button className="fab" aria-label="Ghi khoản mới" onClick={() => setAdding(true)}><Plus size={28} strokeWidth={2.5} /></button>
        {TABS.slice(2, 3).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} onClick={() => setTab(t.id)} />)}
        {TABS.slice(3).map((t) => <TabBtn key={t.id} t={t} on={tab === t.id} onClick={() => setTab(t.id)} />)}
      </nav>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ghi khoản mới">
        <TxForm defaultType={defaultType} onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Sửa khoản">
        {editing && <TxForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

function TabBtn({ t, on, onClick }: { t: (typeof TABS)[number]; on: boolean; onClick: () => void }) {
  const Icon = t.icon;
  return (
    <button className={'tab' + (on ? ' on' : '')} onClick={onClick} aria-current={on ? 'page' : undefined}>
      <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
      <span>{t.label}</span>
    </button>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
