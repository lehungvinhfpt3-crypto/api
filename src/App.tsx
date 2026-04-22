import React, { useState, useEffect } from 'react';
import { Gate } from './components/Gate';
import { Admin } from './components/Admin';
import { Calculator } from './components/Calculator';
import { AppMode, AccessCode } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp } from 'firebase/firestore';
import { cleanupExpiredCodes } from './lib/firebase';

export default function App() {
  const [mode, setMode] = useState<AppMode>('gate');
  const [accessCode, setAccessCode] = useState<AccessCode | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Kiểm tra phiên truy cập khi khởi chạy
  useEffect(() => {
    // Chạy dọn dẹp mã hết hạn ngay khi mở app
    cleanupExpiredCodes();

    const checkSession = () => {
      try {
        // Kiểm tra phiên Admin
        const adminSession = localStorage.getItem('admin_access_session');
        if (adminSession) {
          setMode('admin');
          setIsInitializing(false);
          return;
        }

        // Kiểm tra phiên User
        const userSessionStr = localStorage.getItem('user_access_session');
        if (userSessionStr) {
          const sessionData = JSON.parse(userSessionStr);
          const expiresAtMillis = sessionData.expiresAtMillis;
          
          if (Date.now() < expiresAtMillis) {
            // Khôi phục AccessCode (cần chuyển đổi lại Timestamp từ số millis)
            const code: AccessCode = {
              ...sessionData.accessCode,
              createdAt: Timestamp.fromMillis(sessionData.accessCode.createdAtMillis),
              expiresAt: Timestamp.fromMillis(sessionData.accessCode.expiresAtMillis),
              activatedAt: sessionData.accessCode.activatedAtMillis ? Timestamp.fromMillis(sessionData.accessCode.activatedAtMillis) : null
            };
            setAccessCode(code);
            setMode('calculator');
          } else {
            localStorage.removeItem('user_access_session');
          }
        }
      } catch (e) {
        console.error("Lỗi khôi phục phiên:", e);
        localStorage.removeItem('user_access_session');
        localStorage.removeItem('admin_access_session');
      }
      setIsInitializing(false);
    };

    checkSession();
  }, []);

  const handleAdminAccess = () => {
    localStorage.setItem('admin_access_session', 'true');
    setMode('admin');
  };

  const handleUserAccess = (code: AccessCode) => {
    // Lưu phiên vào localStorage
    const sessionData = {
      expiresAtMillis: code.expiresAt.toMillis(),
      accessCode: {
        ...code,
        createdAtMillis: code.createdAt.toMillis(),
        expiresAtMillis: code.expiresAt.toMillis(),
        activatedAtMillis: code.activatedAt?.toMillis() || null
      }
    };
    localStorage.setItem('user_access_session', JSON.stringify(sessionData));
    
    setAccessCode(code);
    setMode('calculator');
  };

  const handleExpire = () => {
    localStorage.removeItem('user_access_session');
    setMode('gate');
    setAccessCode(null);
    setNotification('Phiên truy cập đã hết hạn, vui lòng nhập mã lại');
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_access_session');
    localStorage.removeItem('admin_access_session');
    setMode('gate');
    setAccessCode(null);
  };

  if (isInitializing) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-mono">Đang khởi tạo...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-bounce">
          {notification}
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === 'gate' && (
          <motion.div
            key="gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Gate onAdmin={handleAdminAccess} onSuccess={handleUserAccess} />
          </motion.div>
        )}

        {mode === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Admin onBack={handleLogout} />
          </motion.div>
        )}

        {mode === 'calculator' && accessCode && (
          <motion.div
            key="calculator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Calculator accessCode={accessCode} onExpire={handleExpire} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
