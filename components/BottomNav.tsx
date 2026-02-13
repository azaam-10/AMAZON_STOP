
import React, { useState } from 'react';
import { Home, ShieldAlert, LifeBuoy, FileClock, User, Lock, LayoutDashboard } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isAdmin }) => {
  const [blockedId, setBlockedId] = useState<string | null>(null);

  const navItems = [
    { id: 'Home', icon: Home, label: 'الرئيسية' },
    { id: 'Recovery', icon: ShieldAlert, label: 'استرداد' },
    { id: 'Support', icon: LifeBuoy, label: 'المساعدة' },
    { id: 'Profile', icon: User, label: 'حسابي' },
  ];

  if (isAdmin) {
    navItems.splice(1, 0, { id: 'Admin', icon: LayoutDashboard, label: 'المسؤول' });
  }

  const blockedTabs = ['History', 'Support'];

  const handleTabClick = (id: string) => {
    if (blockedTabs.includes(id)) {
      setBlockedId(id);
      setTimeout(() => setBlockedId(null), 1500);
      return;
    }
    onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/80 backdrop-blur-xl border-t border-white/20 flex justify-around py-3 px-1 z-50 rounded-t-[32px] shadow-[0_-15px_35px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isBlocked = blockedId === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className="flex flex-col items-center gap-1 flex-1 transition-all relative outline-none"
          >
            {isBlocked && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 animate-[bounce_1s_infinite]">
                <div className="bg-red-500/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-400/50 whitespace-nowrap">
                  <Lock size={12} fill="currentColor" /> الميزة مقفلة
                </div>
                <div className="w-2 h-2 bg-red-50 rotate-45 mx-auto -mt-1 shadow-sm"></div>
              </div>
            )}
            
            <div className={`
              p-2 rounded-2xl transition-all duration-300 relative
              ${isActive ? "bg-[#9B4A4E] text-white shadow-xl scale-110" : "text-gray-400"}
              ${isBlocked ? "animate-[shake_0.4s_ease-in-out] text-red-500 bg-red-50" : ""}
            `}>
              {isBlocked && <div className="absolute inset-0 bg-red-400/20 rounded-2xl animate-ping"></div>}
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>

            <span className={`text-[10px] font-bold mt-0.5 transition-colors ${isActive ? "text-[#9B4A4E]" : "text-gray-400"} ${isBlocked ? "text-red-500" : ""}`}>
              {item.label}
            </span>
          </button>
        );
      })}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-5deg); }
          75% { transform: translateX(4px) rotate(5deg); }
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
