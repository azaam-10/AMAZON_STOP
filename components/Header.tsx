
import React, { useEffect, useState } from 'react';
import { MessageSquare, Wallet, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

const Header: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        
        if (user) {
          const { data } = await supabase
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

  return (
    <header className="bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] px-5 pt-8 pb-6 text-white relative">
      {/* Top Right Icons */}
      <div className="absolute top-6 right-5 flex items-center gap-4">
        <button onClick={handleSignOut} className="text-white opacity-90 hover:opacity-100 transition-opacity">
          <LogOut size={24} />
        </button>
        <MessageSquare size={24} className="text-white opacity-90" />
      </div>

      {/* Profile Info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-white flex-shrink-0"></div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">{profile?.full_name || '____'}</span>
            <span className="bg-[#F5B400] text-white text-[10px] font-bold px-2 py-0.5 rounded-[8px] shadow-sm">
              VIP {profile?.vip_level ?? 3}
            </span>
          </div>
          <span className="text-sm text-white/80 mt-1">
            Invitation code: {profile?.customer_code || '000000'}
          </span>
        </div>
      </div>

      {/* Account Section */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/90 mb-2">My Account</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-white/80">USDT</span>
            <span className="text-2xl font-bold tracking-tight">
              {profile?.balance?.toFixed(4) || '0000.0000'}
            </span>
          </div>
          <div className="text-white/70 text-[10px] mt-1 flex items-center gap-1 font-medium">
            <span>{((profile?.balance || 0) * 0.7).toFixed(4)}</span>
            <span dir="rtl">= 30% خصم usdt</span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1">
            <button className="w-14 h-14 bg-[#F5F5F5] rounded-[20px] flex items-center justify-center shadow-sm active:scale-95 transition-all">
              <Wallet className="w-8 h-8 text-[#1F6AE1]" />
            </button>
            <span className="text-[10px] font-medium text-white/90">Deposit</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button className="w-14 h-14 bg-[#F5F5F5] rounded-[20px] flex items-center justify-center shadow-sm active:scale-95 transition-all">
              <CreditCard className="w-8 h-8 text-[#1F6AE1]" />
            </button>
            <span className="text-[10px] font-medium text-white/90">Withdrawal</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
