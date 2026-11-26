// Lớp nối với điện thoại: lưu dữ liệu, chia sẻ file, khoá vân tay.
// Trên trình duyệt (bản demo) thì dùng localStorage và tải file thường.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import type { AppData } from './model';

export const isNative = Capacitor.isNativePlatform();
const KEY = 'hieu-wallet-data';
const BG_KEY = 'hieu-wallet-bg';

export async function loadData(): Promise<AppData | null> {
  try {
    const raw = isNative ? (await Preferences.get({ key: KEY })).value : localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

export async function saveData(data: AppData): Promise<void> {
  const raw = JSON.stringify(data);
  try {
    if (isNative) await Preferences.set({ key: KEY, value: raw });
    else localStorage.setItem(KEY, raw);
  } catch {
    /* bản demo trong chế độ ẩn danh có thể không lưu được: bỏ qua */
  }
}

/** Đưa file cho người dùng: trên điện thoại mở bảng Chia sẻ (WeChat, Zalo, Lưu vào Files…). */
export async function shareFile(filename: string, content: string, mime: string): Promise<'shared' | 'downloaded'> {
  if (isNative) {
    const res = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, files: [res.uri], dialogTitle: 'Lưu hoặc gửi file' });
    return 'shared';
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

export async function biometricAvailable(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable || r.deviceIsSecure;
  } catch {
    return false;
  }
}

/** Mở khoá bằng vân tay; nếu không được thì cho dùng mã PIN/hình vẽ của điện thoại. */
export async function unlock(): Promise<boolean> {
  if (!isNative) return true;
  try {
    await BiometricAuth.authenticate({
      reason: 'Mở khoá Hieu Wallet',
      cancelTitle: 'Huỷ',
      allowDeviceCredential: true,
      androidTitle: 'Hieu Wallet',
      androidSubtitle: 'Chạm vân tay để mở khoá',
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}

/** Ảnh nền riêng lưu tách khỏi dữ liệu chính cho nhẹ. */
export async function loadBg(): Promise<string | null> {
  try {
    return isNative ? (await Preferences.get({ key: BG_KEY })).value : localStorage.getItem(BG_KEY);
  } catch {
    return null;
  }
}

export async function saveBg(dataUrl: string | null): Promise<void> {
  try {
    if (isNative) {
      if (dataUrl) await Preferences.set({ key: BG_KEY, value: dataUrl });
      else await Preferences.remove({ key: BG_KEY });
    } else if (dataUrl) localStorage.setItem(BG_KEY, dataUrl);
    else localStorage.removeItem(BG_KEY);
  } catch {
    /* ảnh quá lớn hoặc không lưu được: vẫn dùng trong phiên này */
  }
}

/** Thu nhỏ ảnh chọn từ máy (tối đa 1440px, JPEG) để app nhẹ và mở nhanh. */
export function shrinkImage(file: File, max = 1440): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này.')); };
    img.src = url;
  });
}
