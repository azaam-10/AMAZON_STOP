
import React from 'react';
import { Users, FileText, History, UserPlus } from 'lucide-react';

const features = [
  { id: 'teams', label: 'Teams', icon: <Users className="text-[#F5B400]" size={28} /> },
  { id: 'record', label: 'Record', icon: <FileText className="text-[#4ADE80]" size={28} /> },
  { id: 'wallet', label: 'Wallet management', icon: <History className="text-[#F87171]" size={28} /> },
  { id: 'invite', label: 'Invite friends', icon: <UserPlus className="text-[#60A5FA]" size={28} /> },
];

const FeatureGrid: React.FC = () => {
  return (
    <div className="bg-white py-6 px-4 flex justify-between shadow-sm border-b border-gray-50">
      {features.map((feature) => (
        <button key={feature.id} className="flex flex-col items-center gap-2 transition-transform active:scale-95">
          <div className="w-12 h-12 flex items-center justify-center mb-0.5">
            {feature.icon}
          </div>
          <span className="text-[11px] text-gray-600 font-medium text-center leading-tight max-w-[70px]">
            {feature.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default FeatureGrid;
