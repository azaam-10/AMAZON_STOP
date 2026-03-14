
import React, { useState, useEffect, useCallback } from 'react';
import { XCircle } from 'lucide-react';

interface RestrictionOverlayProps {
  isRestricted: boolean;
  message?: string;
}

const RestrictionOverlay: React.FC<RestrictionOverlayProps> = ({ 
  isRestricted, 
  message = "عذراً، لا يمكن القيام بهذا الإجراء. الحساب مخصص حالياً للسحب فقط، وسيتم تجميد الحساب فور اكتمال سحب العملات." 
}) => {
  const [blockedClick, setBlockedClick] = useState<{ x: number; y: number } | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!isRestricted) return;

    const target = e.target as HTMLElement;
    const isAllowed = target.closest('[data-allow-withdrawal="true"]');
    const isInput = target.closest('input, textarea, select');
    const isWithdrawalPage = target.closest('.withdrawal-page');

    if (!isAllowed && !isInput && !isWithdrawalPage) {
      // Check if it's a button or interactive element
      const isInteractive = target.closest('button, a, [role="button"], .cursor-pointer');
      
      if (isInteractive) {
        e.preventDefault();
        e.stopPropagation();

        const rect = (isInteractive as HTMLElement).getBoundingClientRect();
        setBlockedClick({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
        
        setShowToast(true);
        
        // Clear the 🚫 after a short delay
        setTimeout(() => setBlockedClick(null), 1000);
      }
    }
  }, [isRestricted]);

  useEffect(() => {
    if (isRestricted) {
      window.addEventListener('click', handleClick, true);
      return () => window.removeEventListener('click', handleClick, true);
    }
  }, [isRestricted, handleClick]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!isRestricted) return null;

  return (
    <>
      {/* 🚫 Icon over clicked button */}
      {blockedClick && (
        <div 
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in duration-200"
          style={{ 
            left: blockedClick.x, 
            top: blockedClick.y, 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <span className="text-4xl filter drop-shadow-md">🚫</span>
        </div>
      )}

      {/* Notification Toast */}
      {showToast && (
        <div className="fixed top-10 left-4 right-4 z-[10000] animate-in slide-in-from-top duration-300">
          <div className="bg-white border-l-4 border-red-500 shadow-2xl rounded-2xl p-4 flex items-start gap-3 max-w-[400px] mx-auto" dir="rtl">
            <div className="bg-red-50 p-2 rounded-xl text-red-500 flex-shrink-0">
              <XCircle size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-gray-800 font-bold text-sm mb-1">تنبيه النظام</h4>
              <p className="text-gray-600 text-xs leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RestrictionOverlay;
