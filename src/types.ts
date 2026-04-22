import { addSeconds, isAfter, differenceInSeconds } from 'date-fns';

import { Timestamp } from 'firebase/firestore';

export type CodeStatus = 'unused' | 'activated';

export interface AccessCode {
  id: string;
  code: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  durationSeconds: number;
  activated: boolean;
  activatedAt?: Timestamp | null;
}

export type AppMode = 'gate' | 'admin' | 'calculator';

export interface VerifyResponse {
  success: boolean;
  message: string;
  accessCode?: AccessCode;
}
