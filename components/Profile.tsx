
import React, { useEffect, useState, useCallback } from 'react';
import { 
  MessageCircleMore, 
  Users, 
  FileText, 
  Activity, 
  Mail, 
  Contact, 
  ClipboardList, 
  History, 
  Settings, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '../lib/supabase.ts';
import WithdrawalPage from './WithdrawalPage.tsx';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWithdrawal, setShowWithdrawal] = useState<boolean>(false);
  const [restrictedId, setRestrictedId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);

  const handleRestrictedClick = (id: string) => {
    setRestrictedId(id);
    setShowToast(true);
    setTimeout(() => {
      setRestrictedId(null);
    }, 2000);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const getProfileData = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      if (user) {
        // Admin always sees the profile
        if (user.email === 'amzon123@gmail.com') {
          setIsUnlocked(true);
        }

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          // If the profile has is_unlocked set to true, we are good
          if (profileData.is_unlocked) {
            setIsUnlocked(true);
          }
        }

        // Fallback: Check messages if not already unlocked
        if (!profileData?.is_unlocked) {
          const { data: userComplaints } = await supabase
            .from('complaints')
            .select('id')
            .eq('user_id', user.id);
          
          if (userComplaints && userComplaints.length > 0) {
            const complaintIds = userComplaints.map(c => c.id);
            const { data: messages } = await supabase
              .from('complaint_messages')
              .select('text')
              .in('complaint_id', complaintIds)
              .ilike('text', '%[WITHDRAW_ACTION]%')
              .limit(1);
            
            if (messages && messages.length > 0) {
              setIsUnlocked(true);
              // Update profile to be unlocked for next time
              await supabase.from('profiles').update({ is_unlocked: true }).eq('id', user.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getProfileData();

    const handleRefresh = (e: any) => {
      if (e.detail?.tab === 'Mine') {
        getProfileData();
      }
    };
    window.addEventListener('changeTab', handleRefresh);
    return () => window.removeEventListener('changeTab', handleRefresh);
  }, [getProfileData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F7F9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9B4A4E]"></div>
      </div>
    );
  }

  if (showWithdrawal) {
    return <WithdrawalPage onBack={() => setShowWithdrawal(false)} />;
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7F9] p-8 text-center" dir="rtl">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="text-5xl">🚫</span>
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">لا يمكن الآن</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-[280px]">
          عذراً، لم يتم تفعيل خيار السحب لحسابك بعد. يرجى التواصل مع الدعم الفني للمتابعة.
        </p>
        <div className="flex flex-col gap-3 mt-8 w-full max-w-[200px]">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'Recovery' } }))}
            className="bg-[#9B4A4E] text-white font-bold py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
          >
            الذهاب للدعم الفني
          </button>
          <button 
            onClick={() => {
              setLoading(true);
              getProfileData();
            }}
            className="bg-white text-gray-600 border border-gray-200 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
          >
            <Activity size={16} />
            تحديث الحالة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7F9] pb-20" dir="ltr">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] pt-12 pb-8 px-6 relative">
        {/* Top Right Icons */}
        <div className="absolute top-6 right-6 flex items-center gap-4 text-white">
          <button 
            onClick={handleSignOut} 
            className="opacity-90 hover:opacity-100 transition-opacity"
          >
            <LogOut size={24} />
          </button>
          <button 
            onClick={() => handleRestrictedClick('messages')}
            className="opacity-90 relative"
          >
            <MessageCircleMore size={28} />
            {restrictedId === 'messages' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                <span className="text-xl">🚫</span>
              </div>
            )}
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-white rounded-full flex-shrink-0 shadow-lg border-4 border-white/20"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl font-bold">{profile?.full_name || '____'}</span>
              <span className="bg-[#F5B400] text-white text-[10px] font-bold px-2 py-0.5 rounded-[8px]">
                VIP {profile?.vip_level ?? 0}
              </span>
            </div>
            <span className="text-white/80 text-sm mt-1">
              Invitation code: {profile?.customer_code || '000000'}
            </span>
          </div>
        </div>

        {/* Account Section */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg mb-2">My Account</span>
            <div className="flex items-baseline gap-2">
              <span className="text-white/90 text-sm">USDT</span>
              <span className="text-white text-2xl font-bold tracking-tight">
                {profile?.balance?.toFixed(4) || '0000.0000'}
              </span>
            </div>
            <div className="text-white/70 text-[11px] mt-1 flex items-center gap-1 font-medium">
              <span>{((profile?.balance || 0) * 0.7).toFixed(4)}</span>
              <span dir="rtl">= 30% خصم usdt</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div 
              onClick={() => handleRestrictedClick('deposit')}
              className="flex flex-col items-center gap-1 cursor-pointer relative"
            >
              <div className="w-14 h-14 bg-[#F5F5F5] rounded-[20px] flex items-center justify-center shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1F6AE1" />
                      <stop offset="100%" stopColor="#0B4DB8" />
                    </linearGradient>
                  </defs>
                  <path d="M20 12V8C20 6.89543 19.1046 6 18 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H18C19.1046 18 20 17.1046 20 16V14M20 12H17C15.8954 12 15 12.8954 15 14C15 15.1046 15.8954 16 17 16H20M20 12V14" stroke="url(#blueGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white text-xs font-bold">Deposit</span>
              {restrictedId === 'deposit' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-[20px] -top-1">
                  <span className="text-2xl">🚫</span>
                </div>
              )}
            </div>
            <div 
              onClick={() => setShowWithdrawal(true)}
              className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 bg-[#F5F5F5] rounded-[20px] flex items-center justify-center shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 10H21M7 15H8M11 15H13M3 6H21C22.1046 6 23 6.89543 23 8V18C23 19.1046 22.1046 20 21 20H3C1.89543 20 1 19.1046 1 18V8C1 6.89543 1.89543 6 3 6Z" stroke="url(#blueGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white text-xs font-bold">Withdrawal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="bg-white py-6 px-4 grid grid-cols-4 gap-2 shadow-sm">
        <div 
          onClick={() => handleRestrictedClick('teams')}
          className="flex flex-col items-center gap-2 relative cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Users className="text-[#F5B400]" size={32} />
          </div>
          <span className="text-gray-600 text-[11px] font-medium">Teams</span>
          {restrictedId === 'teams' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
              <span className="text-xl">🚫</span>
            </div>
          )}
        </div>
        <div 
          onClick={() => handleRestrictedClick('record')}
          className="flex flex-col items-center gap-2 relative cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <FileText className="text-[#4ADE80]" size={32} />
          </div>
          <span className="text-gray-600 text-[11px] font-medium">Record</span>
          {restrictedId === 'record' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
              <span className="text-xl">🚫</span>
            </div>
          )}
        </div>
        <div 
          onClick={() => handleRestrictedClick('wallet')}
          className="flex flex-col items-center gap-2 relative cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Activity className="text-[#F87171]" size={32} />
          </div>
          <span className="text-gray-600 text-[11px] font-medium text-center leading-tight">Wallet management</span>
          {restrictedId === 'wallet' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
              <span className="text-xl">🚫</span>
            </div>
          )}
        </div>
        <div 
          onClick={() => handleRestrictedClick('invite')}
          className="flex flex-col items-center gap-2 relative cursor-pointer"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Mail className="text-[#60A5FA]" size={32} />
          </div>
          <span className="text-gray-600 text-[11px] font-medium">Invite friends</span>
          {restrictedId === 'invite' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
              <span className="text-xl">🚫</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu List */}
      <div className="mt-4 px-4">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <MenuItem 
            onClick={() => handleRestrictedClick('menu-profile')}
            icon={<Contact className="text-gray-400" size={20} />} 
            label="Profile" 
            showRestricted={restrictedId === 'menu-profile'}
          />
          <MenuItem 
            onClick={() => handleRestrictedClick('menu-deposit')}
            icon={<ClipboardList className="text-gray-400" size={20} />} 
            label="Deposit records" 
            showRestricted={restrictedId === 'menu-deposit'}
          />
          <MenuItem 
            onClick={() => handleRestrictedClick('menu-withdrawal')}
            icon={<History className="text-gray-400" size={20} />} 
            label="Withdrawal records" 
            showRestricted={restrictedId === 'menu-withdrawal'}
          />
          <MenuItem 
            onClick={() => handleRestrictedClick('menu-setting')}
            icon={<Settings className="text-gray-400" size={20} />} 
            label="Setting" 
            isLast 
            showRestricted={restrictedId === 'menu-setting'}
          />
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-black/80 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <p className="text-sm font-medium leading-relaxed">
              You cannot perform this action. The account is now dedicated to withdrawal only and will be frozen immediately after coins are withdrawn.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  isLast?: boolean;
  onClick?: () => void;
  showRestricted?: boolean;
}> = ({ icon, label, isLast, onClick, showRestricted }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-4 ${!isLast ? 'border-b border-gray-50' : ''} active:bg-gray-50 transition-colors cursor-pointer relative`}
  >
    <div className="flex items-center gap-4">
      {icon}
      <span className="text-gray-700 font-medium text-sm">{label}</span>
    </div>
    <ChevronRight className="text-gray-300" size={20} />
    {showRestricted && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/5">
        <span className="text-xl">🚫</span>
      </div>
    )}
  </div>
);

export default Profile;
