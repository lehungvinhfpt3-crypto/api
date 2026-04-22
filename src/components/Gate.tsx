import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { db, cleanupExpiredCodes } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { AccessCode } from '../types';

interface GateProps {
  onAdmin: () => void;
  onSuccess: (data: AccessCode) => void;
}

export const Gate: React.FC<GateProps> = ({ onAdmin, onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Vui lòng nhập mã');
      return;
    }

    // Logic: Kiểm tra mã quản trị trước, không gửi lên Firestore
    if (trimmed === 'admin123456') {
      onAdmin();
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Tìm mã trong Firestore
      const q = query(collection(db, 'access_codes'), where('code', '==', trimmed));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Mã không tồn tại hoặc đã hết hạn');
        setLoading(false);
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data() as AccessCode;
      
      // Kiểm tra hết hạn ngay lập tức
      const now = Timestamp.now();
      if (data.expiresAt.toMillis() < now.toMillis()) {
        // Xóa mã hết hạn khỏi Firestore ngay lập tức
        await deleteDoc(doc(db, 'access_codes', docSnap.id));
        setError('Mã không tồn tại hoặc đã hết hạn');
        setLoading(false);
        return;
      }

      // Kiểm tra trạng thái kích hoạt
      if (data.activated) {
        setError('Mã này đã được sử dụng');
        setLoading(false);
        return;
      }

      // Kích hoạt mã thành công
      const codeRef = doc(db, 'access_codes', docSnap.id);
      const activatedAt = Timestamp.now();
      await updateDoc(codeRef, {
        activated: true,
        activatedAt: activatedAt
      });

      onSuccess({
        ...data,
        id: docSnap.id,
        activated: true,
        activatedAt: activatedAt
      });

    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ Firebase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel p-10 w-full max-w-[450px]"
      >
        <h1 className="text-2xl font-bold text-center mb-2">Xác minh để vào công cụ</h1>
        <p className="text-text-dim text-center mb-8 text-sm">
          Nhập mã quản trị hoặc mã truy cập để tiếp tục
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="••••••"
            className="input-field text-center text-lg tracking-widest font-mono"
            autoFocus
          />

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center text-danger text-sm font-medium h-5"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn btn-primary w-full py-4 text-lg uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tiếp tục'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
