import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, ArrowLeft, Clock, History, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { AccessCode } from '../types';
import { db, cleanupExpiredCodes } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, Timestamp, getDocs, where, writeBatch } from 'firebase/firestore';
import { differenceInSeconds } from 'date-fns';

interface AdminProps {
  onBack: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onBack }) => {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [count, setCount] = useState('1');
  const [duration, setDuration] = useState('1');
  const [unit, setUnit] = useState('minutes');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Dọn dẹp ngay khi vào admin
    cleanupExpiredCodes();

    const q = query(collection(db, 'access_codes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as AccessCode[];
      
      // Lọc các mã hết hạn (double check trên UI) và sắp xếp
      const validData = data.filter(c => c.expiresAt.toMillis() > Date.now());
      setCodes(validData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    });

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    // Chu kỳ dọn dẹp mỗi 30 giây
    const cleanupInterval = setInterval(() => {
      cleanupExpiredCodes();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(timer);
      clearInterval(cleanupInterval);
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const numToCreate = parseInt(count);
      let totalSeconds = parseInt(duration);
      if (unit === 'minutes') totalSeconds *= 60;
      else if (unit === 'hours') totalSeconds *= 3600;
      else if (unit === 'days') totalSeconds *= 86400;

      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      for (let i = 0; i < numToCreate; i++) {
        let code = '';
        for (let j = 0; j < 6; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const createdAt = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(createdAt.toMillis() + totalSeconds * 1000);

        await addDoc(collection(db, 'access_codes'), {
          code,
          createdAt,
          expiresAt,
          durationSeconds: totalSeconds,
          activated: false,
          activatedAt: null
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'access_codes', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteActivated = async () => {
    try {
      const q = query(collection(db, 'access_codes'), where('activated', '==', true));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const getRemainingTime = (expiresAt: Timestamp) => {
    const expDate = expiresAt.toDate();
    if (expDate <= now) return 'Hết hạn';
    const diff = differenceInSeconds(expDate, now);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
  };

  const totalCodes = codes.length;
  const unusedCodes = codes.filter(c => !c.activated).length;
  const activatedCodes = codes.filter(c => c.activated).length;

  return (
    <div className="min-h-screen bg-bg text-white p-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-grow flex flex-col">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Trang quản trị mã truy cập</h1>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
          >
            Quay về
          </button>
        </header>

        <div className="grid grid-cols-12 gap-6 flex-grow overflow-hidden">
          {/* Left Column: Generate & Stats */}
          <div className="col-span-4 space-y-6">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-4">Tạo mã mới</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-dim uppercase block mb-1">Số lượng mã</label>
                  <input 
                    type="number" 
                    value={count} 
                    onChange={e => setCount(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-text-dim uppercase block mb-1">Thời hạn</label>
                    <input 
                      type="number" 
                      value={duration} 
                      onChange={e => setDuration(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-dim uppercase block mb-1">Đơn vị</label>
                    <select 
                      value={unit} 
                      onChange={e => setUnit(e.target.value)}
                      className="input-field px-2"
                    >
                      <option value="seconds">Giây</option>
                      <option value="minutes">Phút</option>
                      <option value="hours">Giờ</option>
                      <option value="days">Ngày</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="btn btn-primary w-full mt-2"
                >
                  {loading ? 'Đang tạo...' : 'Tạo mã'}
                </button>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg font-semibold mb-2">Thống kê</h2>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-dim">Tổng mã:</span>
                <span className="font-mono">{totalCodes}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-dim">Chưa dùng:</span>
                <span className="font-mono text-success">{unusedCodes}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-text-dim">Đã kích hoạt:</span>
                <span className="font-mono text-warning">{activatedCodes}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Codes Table */}
          <div className="col-span-8 panel flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-semibold">Danh sách mã</h3>
              <button 
                onClick={handleDeleteActivated}
                className="btn btn-danger text-xs px-3 py-1"
              >
                Xóa tất cả mã đã kích hoạt
              </button>
            </div>
            
            <div className="overflow-auto flex-grow">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã</th>
                    <th>Thời hạn</th>
                    <th>Còn lại</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-text-dim">Chưa có mã nào được tạo</td>
                    </tr>
                  ) : (
                    codes.map((c, index) => (
                      <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="text-text-dim">{index + 1}</td>
                        <td className="font-mono font-bold text-accent tracking-wider">{c.code}</td>
                        <td className="text-text-dim text-xs font-medium">
                          {c.durationSeconds < 60 ? `${c.durationSeconds}s` : 
                           c.durationSeconds < 3600 ? `${Math.floor(c.durationSeconds/60)}p` : 
                           c.durationSeconds < 86400 ? `${Math.floor(c.durationSeconds/3600)}g` : 
                           `${Math.floor(c.durationSeconds/86400)}n`}
                        </td>
                        <td className={`text-xs font-bold ${getRemainingTime(c.expiresAt) === 'Hết hạn' ? 'text-danger' : 'text-warning'}`}>
                          {getRemainingTime(c.expiresAt)}
                        </td>
                        <td>
                          {!c.activated ? (
                            <span className="status-pill status-active">Chưa dùng</span>
                          ) : (
                            <span className="status-pill status-used">Đã kích hoạt</span>
                          )}
                        </td>
                        <td className="text-right">
                          <button 
                            onClick={() => handleDelete(c.id)}
                            className="text-text-dim hover:text-danger hover:bg-danger/10 transition-all p-2 rounded-lg"
                            title="Xóa mã"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
