import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  LuckyNumberGameSettings,
  MinigameEntry,
  LuckyWinner,
} from '@/types/minigame';

export const GAME_SETTINGS_DOC = {
  collection: 'game_settings',
  id: 'lucky_number',
};

export const WINNERS_COLLECTION = 'winners';

const getGoogleScriptUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
  if (!url) {
    console.warn('Cảnh báo: NEXT_PUBLIC_GOOGLE_SCRIPT_URL chưa được cấu hình trong .env.local');
  }
  return url || '';
};

/**
 * 1. Lắng nghe cấu hình Game theo thời gian thực từ Firestore `game_settings/lucky_number`
 */
export function subscribeToLuckyGameSettings(
  onUpdate: (settings: LuckyNumberGameSettings) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db) {
    console.warn('Firestore db chưa sẵn sàng');
    return () => {};
  }

  const docRef = doc(db, GAME_SETTINGS_DOC.collection, GAME_SETTINGS_DOC.id);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          isOpen: data.isOpen ?? false,
          maxNumber: typeof data.maxNumber === 'number' ? data.maxNumber : 99,
          round: typeof data.round === 'number' ? data.round : 1,
          updatedAt: data.updatedAt,
          lastEntryAt: data.lastEntryAt,
        });
      } else {
        // Giá trị mặc định nếu document chưa được tạo
        onUpdate({
          isOpen: false,
          maxNumber: 99,
          round: 1,
        });
      }
    },
    (err) => {
      console.error('Lỗi khi lắng nghe game_settings/lucky_number:', err);
      onError?.(err);
    }
  );

  return unsubscribe;
}

/**
 * 1b. Bắn tín hiệu khi có khách vừa gửi số mới (để Admin tự động refresh chỉ khi có khách nhập)
 */
export async function notifyMinigameEntryAdded(): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, GAME_SETTINGS_DOC.collection, GAME_SETTINGS_DOC.id);
    await setDoc(
      docRef,
      {
        lastEntryAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Lỗi ghi nhận tín hiệu khách mới gửi số:', err);
  }
}


/**
 * 2. Cập nhật cấu hình Game (Admin)
 */
export async function updateLuckyGameSettings(
  settings: Partial<LuckyNumberGameSettings>
): Promise<void> {
  if (!db) {
    throw new Error('Firestore chưa được khởi tạo');
  }

  const docRef = doc(db, GAME_SETTINGS_DOC.collection, GAME_SETTINGS_DOC.id);
  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * 3. Gửi vé dự đoán vào Google Sheet qua Webhook Google Apps Script
 */
export async function submitLuckyNumberEntry(
  eventCode: string,
  tiktokId: string,
  predictedNumber: number
): Promise<{ success: boolean; duplicate?: boolean; message: string }> {
  const url = getGoogleScriptUrl();
  if (!url) {
    return {
      success: false,
      message: 'Chưa cấu hình NEXT_PUBLIC_GOOGLE_SCRIPT_URL trong file .env.local',
    };
  }

  try {
    const payload = {
      action: 'ADD_ENTRY',
      code: eventCode.trim().toUpperCase(),
      eventCode: eventCode.trim().toUpperCase(),
      tiktok: tiktokId.trim().replace(/^@+/, ''),
      tiktokId: tiktokId.trim().replace(/^@+/, ''),
      predictedNumber: Number(predictedNumber),
      number: Number(predictedNumber),
    };

    // Dùng text/plain để tránh preflight OPTIONS CORS trong trình duyệt với Google Apps Script
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google Sheet phản hồi lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: !!data.success,
      duplicate: !!data.duplicate,
      message: data.message || (data.success ? 'Đăng ký thành công!' : 'Đăng ký thất bại'),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Lỗi kết nối đến Google Sheet';
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Hàm tương thích ngược với code cũ
 */
export async function submitMinigameEntry(
  code: string,
  tiktok: string,
  predictedNumber: number = 0
): Promise<{ success: boolean; duplicate?: boolean; message: string }> {
  return submitLuckyNumberEntry(code, tiktok, predictedNumber);
}

// Bộ nhớ đệm tạm thời & Deduplication tránh spam liên tục lên Google Sheet
let inFlightEntriesPromise: Promise<MinigameEntry[]> | null = null;
let lastEntriesCache: { data: MinigameEntry[]; time: number } | null = null;
const CACHE_TTL_MS = 4000; // Cache 4 giây tránh spam request liên tục

/**
 * 4. Lấy danh sách các vé đang có trên Google Sheet (đã tối ưu tránh load quá tải)
 */
export async function fetchLuckyNumberEntries(forceRefresh = false): Promise<MinigameEntry[]> {
  const now = Date.now();
  if (!forceRefresh && lastEntriesCache && now - lastEntriesCache.time < CACHE_TTL_MS) {
    return lastEntriesCache.data;
  }

  if (inFlightEntriesPromise) {
    return inFlightEntriesPromise;
  }

  inFlightEntriesPromise = (async () => {
    const url = getGoogleScriptUrl();
    if (!url) {
      console.warn('NEXT_PUBLIC_GOOGLE_SCRIPT_URL is not set');
      return [];
    }

    try {
      const fetchUrl = url.includes('?')
        ? `${url}&_t=${Date.now()}`
        : `${url}?_t=${Date.now()}`;

      // Giới hạn timeout 8 giây tránh treo connection ngầm
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(fetchUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.entries)) {
        const result: MinigameEntry[] = data.entries.map((item: Record<string, unknown>) => {
          const rawNum = item.predictedNumber ?? item.number;
          const numVal = typeof rawNum === 'number' ? rawNum : Number(rawNum) || 0;
          const eCode = String(item.eventCode || item.code || '').trim().toUpperCase();
          const tId = String(item.tiktokId || item.tiktok || '').trim().replace(/^@+/, '');
          const cAt = item.createdAt ? String(item.createdAt) : '';

          return {
            eventCode: eCode,
            tiktokId: tId,
            predictedNumber: numVal,
            createdAt: cAt,
            code: eCode,
            tiktok: tId,
          };
        });

        lastEntriesCache = { data: result, time: Date.now() };
        return result;
      }
      return [];
    } catch (error) {
      console.error('Lỗi khi tải danh sách từ Google Sheet:', error);
      return lastEntriesCache ? lastEntriesCache.data : [];
    } finally {
      inFlightEntriesPromise = null;
    }
  })();

  return inFlightEntriesPromise;
}

export const fetchMinigameEntries = fetchLuckyNumberEntries;

/**
 * 5. Gửi lệnh xóa trắng dữ liệu tạm thời trên Google Sheet sau khi kết thúc đợt quay
 */
export async function clearGoogleSheetEntries(): Promise<{ success: boolean; message: string }> {
  lastEntriesCache = null; // Xóa cache
  const url = getGoogleScriptUrl();
  if (!url) {
    return {
      success: false,
      message: 'Chưa cấu hình NEXT_PUBLIC_GOOGLE_SCRIPT_URL',
    };
  }

  try {
    const payload = {
      action: 'CLEAR_SHEET',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    lastEntriesCache = { data: [], time: Date.now() };
    return {
      success: !!data.success,
      message: data.message || 'Đã làm mới dữ liệu Google Sheet',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Lỗi khi xóa dữ liệu Sheet';
    return {
      success: false,
      message: msg,
    };
  }
}

export const clearSheetEntries = clearGoogleSheetEntries;


/**
 * 6. Lưu thông tin người trúng giải vào Firestore collection `winners`
 */
export async function saveLuckyWinnerToFirestore(winner: {
  eventCode?: string;
  tiktokId?: string;
  predictedNumber?: number;
  luckyNumber?: number;
  difference?: number;
  round?: number;
  prize?: string;
  code?: string;
  tiktok?: string;
}): Promise<string> {
  if (!db) {
    throw new Error('Firestore chưa được khởi tạo');
  }

  const eCode = (winner.eventCode || winner.code || '').trim().toUpperCase();
  const tId = (winner.tiktokId || winner.tiktok || '').trim().replace(/^@+/, '');

  const docRef = await addDoc(collection(db, WINNERS_COLLECTION), {
    eventCode: eCode,
    tiktokId: tId,
    predictedNumber: Number(winner.predictedNumber ?? 0),
    luckyNumber: Number(winner.luckyNumber ?? 0),
    difference: Number(winner.difference ?? 0),
    round: Number(winner.round) || 1,
    prize: winner.prize || 'Mở Khoá Vali Thành Công',
    wonAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Tương thích ngược
 */
export async function saveWinnerToFirestore(winner: {
  code?: string;
  tiktok?: string;
  eventCode?: string;
  tiktokId?: string;
  predictedNumber?: number;
  luckyNumber?: number;
  difference?: number;
  prize?: string;
  round?: number;
}): Promise<string> {
  return saveLuckyWinnerToFirestore({
    eventCode: winner.eventCode || winner.code || '',
    tiktokId: winner.tiktokId || winner.tiktok || '',
    predictedNumber: winner.predictedNumber ?? 0,
    luckyNumber: winner.luckyNumber ?? 0,
    difference: winner.difference ?? 0,
    round: winner.round || 1,
    prize: winner.prize,
  });
}

/**
 * 7. Lắng nghe danh sách người trúng giải theo thời gian thực từ Firestore `winners` (giới hạn tối đa để tránh đọc quá tải)
 */
export function subscribeToWinners(
  onWinnersUpdate: (winners: LuckyWinner[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 40
): () => void {
  if (!db) {
    console.warn('Firestore db chưa sẵn sàng');
    return () => {};
  }

  const q = query(
    collection(db, WINNERS_COLLECTION),
    orderBy('wonAt', 'desc'),
    limit(limitCount)
  );


  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const winners: LuckyWinner[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          eventCode: d.eventCode || d.code || '',
          tiktokId: d.tiktokId || d.tiktok || '',
          predictedNumber: d.predictedNumber ?? 0,
          luckyNumber: d.luckyNumber ?? 0,
          difference: d.difference ?? 0,
          round: d.round || 1,
          wonAt: d.wonAt,
          prize: d.prize || 'Giải Độc Đắc',
        };
      });
      onWinnersUpdate(winners);
    },
    (err) => {
      console.error('Lỗi khi lắng nghe winners:', err);
      onError?.(err);
    }
  );

  return unsubscribe;
}

/**
 * 8. Xóa một người trúng giải khỏi Firestore (dành cho Admin quản lý)
 */
export async function deleteWinnerFromFirestore(id: string): Promise<void> {
  if (!db) throw new Error('Firestore chưa được khởi tạo');
  await deleteDoc(doc(db, WINNERS_COLLECTION, id));
}
