import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Sử dụng firestoreDatabaseId từ config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

// Hàm tự động dọn dẹp mã hết hạn khỏi Firestore
export async function cleanupExpiredCodes() {
  try {
    const now = Timestamp.now();
    const q = query(collection(db, 'access_codes'), where('expiresAt', '<', now));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`Đã dọn dẹp ${snapshot.size} mã hết hạn.`);
    }
  } catch (error) {
    console.error("Lỗi khi dọn dẹp mã hết hạn:", error);
  }
}
