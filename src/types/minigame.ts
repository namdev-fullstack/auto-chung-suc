import { Timestamp } from 'firebase/firestore';

export interface LuckyNumberGameSettings {
  isOpen: boolean;
  maxNumber: number;
  round: number;
  updatedAt?: Timestamp | string;
  lastEntryAt?: Timestamp | string;
}


export interface MinigameEntry {
  eventCode: string;
  tiktokId: string;
  predictedNumber: number;
  createdAt?: string;
  // Tương thích ngược với các component cũ
  code: string;
  tiktok: string;
}

export interface LuckyWinner {
  id: string;
  eventCode: string;
  tiktokId: string;
  predictedNumber: number;
  luckyNumber: number;
  difference: number;
  round: number;
  wonAt: Timestamp | string;
  prize?: string;
  // Tương thích ngược
  code?: string;
  tiktok?: string;
}

export interface CurrentWinnerDisplay {
  id?: string;
  eventCode?: string;
  tiktokId?: string;
  predictedNumber?: number;
  luckyNumber?: number;
  difference?: number;
  round?: number;
  prize?: string;
  code?: string;
  tiktok?: string;
}

// Giữ lại EventWinner alias để tương thích ngược nếu cần
export type EventWinner = LuckyWinner;
