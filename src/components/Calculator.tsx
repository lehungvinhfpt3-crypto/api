import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RotateCw, Delete, Clock, Lock, Key } from 'lucide-react';
import { AccessCode } from '../types';
import { parseISO, differenceInSeconds, isAfter } from 'date-fns';

interface CalculatorProps {
  accessCode: AccessCode;
  onExpire: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ accessCode, onExpire }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const expDate = accessCode.expiresAt.toDate();
      const now = new Date();
      if (expDate <= now) {
        onExpire();
        return;
      }
      setRemaining(differenceInSeconds(expDate, now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [accessCode, onExpire]);

  const handleInput = (val: string) => {
    if (display === '0' && val !== '.') {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const buttons = [
    { label: 'AC', action: () => { setDisplay('0'); setEquation(''); }, color: 'bg-red-500/20 text-red-500' },
    { label: 'C', action: () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0'), color: 'bg-gray-800' },
    { label: '%', action: () => setDisplay(String(parseFloat(display) / 100)), color: 'bg-gray-800' },
    { label: '/', action: () => handleOperator('/'), color: 'bg-blue-600' },
    { label: '7', action: () => handleInput('7'), color: 'bg-[#1a1a1a]' },
    { label: '8', action: () => handleInput('8'), color: 'bg-[#1a1a1a]' },
    { label: '9', action: () => handleInput('9'), color: 'bg-[#1a1a1a]' },
    { label: '*', action: () => handleOperator('*'), color: 'bg-blue-600' },
    { label: '4', action: () => handleInput('4'), color: 'bg-[#1a1a1a]' },
    { label: '5', action: () => handleInput('5'), color: 'bg-[#1a1a1a]' },
    { label: '6', action: () => handleInput('6'), color: 'bg-[#1a1a1a]' },
    { label: '-', action: () => handleOperator('-'), color: 'bg-blue-600' },
    { label: '1', action: () => handleInput('1'), color: 'bg-[#1a1a1a]' },
    { label: '2', action: () => handleInput('2'), color: 'bg-[#1a1a1a]' },
    { label: '3', action: () => handleInput('3'), color: 'bg-[#1a1a1a]' },
    { label: '+', action: () => handleOperator('+'), color: 'bg-blue-600' },
    { label: '0', action: () => handleInput('0'), color: 'bg-[#1a1a1a]', span: 'col-span-2' },
    { label: '.', action: () => handleInput('.'), color: 'bg-[#1a1a1a]' },
    { label: '=', action: () => calculate(), color: 'bg-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-bg text-white flex flex-col items-center justify-center p-4">
      <div className="w-[400px] flex flex-col items-center">
        {/* Header Info */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full flex justify-between items-center mb-4 px-2"
        >
          <div className="text-sm text-text-dim">
            Mã: <span className="text-white font-mono font-bold tracking-widest">{accessCode.code}</span>
          </div>
          <div className="text-sm text-text-dim">
            Còn lại: <span className={`font-mono font-bold ${remaining < 60 ? 'text-danger animate-pulse' : 'text-accent'}`}>
              {formatTime(remaining)}
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="panel w-full"
        >
          <div className="p-6">
            {/* Display */}
            <div className="bg-bg border border-border p-6 rounded-xl text-right mb-4 min-h-[100px] flex flex-col justify-end">
              <div className="text-text-dim text-sm h-6 font-mono overflow-hidden truncate">{equation}</div>
              <div className="text-4xl font-bold font-mono tracking-tighter truncate">{display}</div>
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-4 gap-3">
              {buttons.map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  className={`btn ${btn.color.includes('blue') ? 'btn-primary' : 'btn-secondary'} 
                    ${btn.span || ''} aspect-square text-lg font-bold
                    ${btn.label === 'AC' || btn.label === 'C' ? 'text-danger' : 
                      ['/', '*', '-', '+', '='].includes(btn.label) ? 'text-accent' : ''}
                  `}
                  style={btn.span ? { aspectRatio: 'auto' } : {}}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <button 
          onClick={onExpire}
          className="mt-8 text-text-dim text-sm hover:underline hover:text-white transition-colors"
        >
          Thoát phiên làm việc
        </button>
      </div>
    </div>
  );
};
