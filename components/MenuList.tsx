
import React from 'react';
import { User, ClipboardList, TrendingUp, Settings, ChevronRight } from 'lucide-react';

const menuItems = [
  { id: 'profile', label: 'Profile', icon: <User className="text-gray-400" size={20} /> },
  { id: 'deposit-records', label: 'Deposit records', icon: <ClipboardList className="text-gray-400" size={20} /> },
  { id: 'withdrawal-records', label: 'Withdrawal records', icon: <TrendingUp className="text-gray-400" size={20} /> },
  { id: 'setting', label: 'Setting', icon: <Settings className="text-gray-400" size={20} /> },
];

const MenuList: React.FC = () => {
  return (
    <div className="px-4 mt-2">
      <div className="bg-white rounded-[16px] overflow-hidden shadow-sm border border-gray-100">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            className={`w-full flex items-center px-4 py-4 active:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <div className="mr-3">
              {item.icon}
            </div>
            <span className="flex-1 text-sm text-gray-700 font-medium text-left">
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
