
import React from 'react';
import { Headphones } from 'lucide-react';

const features = [
  { id: 'support', label: 'الدعم المباشر', icon: <Headphones className="text-pink-500" size={28} /> },
];

const FeatureGrid: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl py-6 px-2 flex justify-center shadow-sm border border-gray-100 my-4">
      {features.map((feature) => (
        <button key={feature.id} className="flex flex-col items-center gap-2 transition-transform active:scale-95 px-8">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-1 shadow-inner">
            {feature.icon}
          </div>
          <span className="text-[10px] text-gray-700 font-bold text-center leading-tight">
            {feature.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default FeatureGrid;
