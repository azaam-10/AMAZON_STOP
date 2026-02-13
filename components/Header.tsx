
import React, { useEffect, useState } from 'react';
import { Scale, Bell, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

const Header: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, customer_code, balance, vip_level')
            .eq('id', user.id)
            .single();
          
          if (data) setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    }
    getProfile();
  }, []);

  const handleSignOut = () => supabase.auth.signOut();

  return (
    <header className="relative bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] px-5 pt-10 pb-12 text-white rounded-b-[40px] shadow-xl" dir="rtl">
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Scale className="text-yellow-400" size={24} />
          <span className="font-bold tracking-wider text-[10px]">AMAZON RECOVERY PRO</span>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSignOut} className="text-white/60 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
          <div className="relative">
            <Bell size={20} className="text-white/80" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-[#9B4A4E]"></span>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="flex items-center justify-end gap-4 mb-6">
        <div className="flex flex-col text-left">
          <h1 className="text-xl font-bold tracking-tight">{profile?.full_name || 'جارِ التحميل...'}</h1>
          <div className="flex items-center mt-1 gap-2 justify-end">
             <span className="text-[10px] text-white/80 font-medium bg-black/10 px-2 py-0.5 rounded-full border border-white/5">
               كود العميل: {profile?.customer_code || '------'}
             </span>
             <span className="bg-[#F5B400] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
               VIP{profile?.vip_level ?? 0}
             </span>
          </div>
        </div>

        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/40 shadow-lg bg-white flex-shrink-0 flex items-center justify-center">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#e54d42] clip-pentagon"></div>
            <div className="absolute top-[28%] -right-0.5 w-6 h-6 bg-[#f1c40f] clip-pentagon rotate-[72deg]"></div>
            <div className="absolute bottom-0 right-1 w-6 h-6 bg-[#9b59b6] clip-pentagon rotate-[144deg]"></div>
            <div className="absolute bottom-0 left-1 w-6 h-6 bg-[#2980b9] clip-pentagon rotate-[216deg]"></div>
            <div className="absolute top-[28%] -left-0.5 w-6 h-6 bg-[#27ae60] clip-pentagon rotate-[288deg]"></div>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
        <div className="flex justify-between items-center">
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">إجمالي المبالغ المتنازع عليها</p>
            <p className="text-2xl font-black mt-1">{profile?.balance?.toFixed(2) || '0.00'} <span className="text-sm font-normal opacity-80">USDT</span></p>
          </div>
          <button className="bg-white text-[#9B4A4E] font-bold px-5 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all text-sm hover:bg-gray-50">
            رفع شكوى جديدة
          </button>
        </div>
      </div>

      <style>{`
        .clip-pentagon {
          clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
        }
      `}</style>
    </header>
  );
};

export default Header;
