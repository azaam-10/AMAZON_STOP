
import React from 'react';
import { User, ClipboardList, History, Settings, ChevronRight } from 'lucide-react';

const menuItems = [
  { id: 'profile', label: 'Profile', icon: <User className="text-gray-400" size={22} /> },
  { id: 'deposit-records', label: 'Deposit records', icon: <ClipboardList className="text-gray-400" size={22} /> },
  { id: 'withdrawal-records', label: 'Withdrawal records', icon: <History className="text-gray-400" size={22} /> },
  { id: 'setting', label: 'Setting', icon: <Settings className="text-gray-400" size={22} /> },
];

const MenuList: React.FC = () => {
  return (
    <div className="px-4 mt-6">
      <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-50">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            className={`w-full flex items-center px-5 py-5 active:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <div className="mr-4">
              {item.icon}
            </div>
            <span className="flex-1 text-[15px] text-gray-700 font-medium text-left">
              {item.label}
            </span>
            <ChevronRight className="text-gray-300" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuList;
