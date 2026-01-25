
import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const LiveStatus: React.FC = () => {
  const [status, setStatus] = useState("جاري فحص شكوى العميل 492*** وإيقاف المهمة...");
  
  useEffect(() => {
    const statuses = [
      "تم قبول شكوى المستخدم 902*** وإيقاف سحب رصيده بنجاح",
      "جاري تعطيل المهمة الاحتيالية رقم #221 للمستخدم 112***",
      "نجاح استرداد 1200 USDT بعد تقديم شكوى رسمية",
      "تحذير: تم رصد موقع احتيالي جديد، جاري إضافته للقائمة السوداء"
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setStatus(statuses[i]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-red-50 border-r-4 border-[#9B4A4E] p-3 my-4 rounded-l-xl flex items-center justify-end gap-3 shadow-sm">
      <span className="text-[#7C4A50] text-[11px] font-bold truncate text-right">{status}</span>
      <ShieldAlert size={18} className="text-[#9B4A4E] animate-pulse flex-shrink-0" />
    </div>
  );
};

export default LiveStatus;
