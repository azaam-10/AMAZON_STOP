
import React from 'react';
import { Home, Headset, ShoppingBag, ClipboardList, User, LayoutDashboard } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isAdmin }) => {
  const navItems = [
    { id: 'Home', icon: Home, label: 'Home' },
    { id: 'Service', icon: Headset, label: 'Service' },
    { id: 'Mine', icon: User, label: 'Mine' },
  ];

  if (isAdmin) {
    navItems.splice(1, 0, { id: 'Admin', icon: LayoutDashboard, label: 'المسؤول' });
  }

  const blockedTabs = ['History', 'Support'];

  const handleTabClick = (id: string) => {
    onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-100 flex justify-around py-2 px-1 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            data-allow-withdrawal={item.id === 'Mine' ? "true" : undefined}
            className="flex flex-col items-center gap-1 flex-1 transition-all relative outline-none"
          >
            <div className={`
              p-1 transition-all duration-300
              ${isActive ? "text-gray-800" : "text-gray-400"}
            `}>
              <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
            </div>

            <span className={`text-[11px] font-medium transition-colors ${isActive ? "text-gray-800" : "text-gray-400"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
