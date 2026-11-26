import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { emptyData, uid, type AppData, type Category, type Settings, type Transaction } from './model';
import { loadData, saveData, isNative } from './platform';
import { demoData } from './demo';

interface Store {
  data: AppData;
  addTx: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTx: (t: Transaction) => void;
  deleteTx: (id: string) => void;
  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (d: AppData) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore ngoài StoreProvider');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadData().then((d) => setData(d ?? (isNative ? emptyData() : demoData())));
  }, []);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => (d ? fn(d) : d)), []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2400);
  }, []);

  if (!data) return <div className="splash"><div className="splash-logo">₫¥</div></div>;

  const store: Store = {
    data,
    toastMsg,
    toast,
    addTx: (t) => update((d) => ({ ...d, transactions: [...d.transactions, { ...t, id: uid(), createdAt: Date.now() }] })),
    updateTx: (t) => update((d) => ({ ...d, transactions: d.transactions.map((x) => (x.id === t.id ? t : x)) })),
    deleteTx: (id) => update((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) })),
    upsertCategory: (c) =>
      update((d) => ({
        ...d,
        categories: d.categories.some((x) => x.id === c.id) ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c],
      })),
    deleteCategory: (id) => update((d) => ({ ...d, categories: d.categories.filter((x) => x.id !== id) })),
    updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    replaceAll: (nd) => setData(nd),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
