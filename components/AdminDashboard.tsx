
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { MessageSquare, User, Clock, ChevronLeft, Send, Image as ImageIcon, CheckCheck, Loader2, Search, AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react';

interface Complaint {
  id: string;
  created_at: string;
  amount: number;
  mission_id: string;
  platform_link: string;
  user_id: string;
  profiles?: {
    full_name: string;
    customer_code: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComplaints();
    
    const subscription = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => fetchComplaints())
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      const sub = supabase
        .channel(`chat_${selectedId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'complaint_messages', 
          filter: `complaint_id=eq.${selectedId}` 
        }, (payload) => {
           setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      // محاولة الجلب باستخدام الربط (Join)
      const { data, error: fetchError } = await supabase
        .from('complaints')
        .select('*, profiles:user_id(full_name, customer_code)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // إذا فشل الربط، نقوم بجلب البيانات بشكل منفصل (طريقة احتياطية)
        console.warn("Relationship not found, falling back to manual join");
        const { data: rawComplaints, error: rawError } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (rawError) throw rawError;

        // جلب بروفايلات المستخدمين
        const userIds = [...new Set(rawComplaints.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, customer_code')
          .in('id', userIds);

        const joinedData = rawComplaints.map(c => ({
          ...c,
          profiles: profiles?.find(p => p.id === c.user_id)
        }));
        
        setComplaints(joinedData);
      } else {
        setComplaints(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    const { data } = await supabase
      .from('complaint_messages')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedId) return;
    const text = inputValue;
    setInputValue('');

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('complaint_messages').insert([{
      complaint_id: selectedId,
      user_id: user?.id,
      text: text,
      sender: 'support'
    }]);
  };

  if (loading && complaints.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-[#9B4A4E]" size={40} />
      <p className="text-gray-400 text-[10px] font-bold">جاري تحميل السجلات...</p>
    </div>
  );

  if (selectedId) {
    const comp = complaints.find(c => c.id === selectedId);
    return (
      <div className="fixed inset-0 z-[110] bg-white flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={24} /></button>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold">{comp?.profiles?.full_name || 'عميل'}</h2>
            <p className="text-[9px] opacity-70">كود العميل: {comp?.profiles?.customer_code || '---'}</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F7F9]">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 text-[10px] text-gray-700 text-right leading-relaxed mb-4 shadow-sm">
             <div className="font-bold text-[#9B4A4E] mb-2 border-b pb-1">📄 بيانات الشكوى</div>
             <p>المنصة: <span className="font-bold">{comp?.platform_link}</span></p>
             <p>رقم المهمة: <span className="font-bold">#{comp?.mission_id}</span></p>
             <p>المبلغ: <span className="text-red-600 font-bold">{comp?.amount} USDT</span></p>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] ${m.sender === 'support' ? 'self-end' : 'self-start'}`}>
               <div className={`rounded-2xl overflow-hidden shadow-sm ${m.sender === 'support' ? 'bg-[#9B4A4E] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                 {m.image_url && <img src={m.image_url} className="w-full max-h-60 object-cover" />}
                 {m.text && <div className="p-3 text-[11px] text-right whitespace-pre-wrap">{m.text}</div>}
                 <div className="px-3 pb-1 flex items-center gap-1 text-[8px] opacity-50">
                   {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                 </div>
               </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t flex items-center gap-2 bg-white pb-8">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب ردك هنا..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-xs text-right outline-none focus:ring-1 focus:ring-[#9B4A4E]"
            dir="rtl"
          />
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-3 rounded-full shadow-lg">
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
         <div className="flex items-center justify-between mb-4">
            <button onClick={fetchComplaints} className="text-gray-400 p-2"><RefreshCcw size={18} className={loading ? 'animate-spin' : ''}/></button>
            <h2 className="font-black text-gray-800 text-lg">سجل الوارد</h2>
         </div>
         <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" placeholder="البحث عن عميل أو مبلغ..." className="w-full bg-gray-50 rounded-2xl py-3 px-12 text-[11px] text-right border-none shadow-inner" dir="rtl" />
         </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-[10px] text-center font-bold">
           ⚠️ خطأ في الربط: {error}
           <br/> يرجى التأكد من تشغيل كود SQL لتفعيل العلاقة بين الجداول.
        </div>
      )}

      <div className="space-y-3 px-1">
        {complaints.length === 0 && !loading ? (
          <div className="text-center py-20 text-gray-400 text-xs font-bold">لا توجد سجلات حالياً</div>
        ) : (
          complaints.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedId(c.id)}
              className="w-full bg-white p-4 rounded-3xl flex items-center gap-4 border border-gray-50 shadow-sm active:scale-95 transition-all text-right"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-[#9B4A4E]">
                <User size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] text-gray-300 font-bold">{new Date(c.created_at).toLocaleDateString('ar-EG')}</span>
                  <h4 className="font-bold text-gray-800 text-sm">{c.profiles?.full_name || 'عميل غير معروف'}</h4>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[#9B4A4E] font-black text-xs">{c.amount} USDT</span>
                   <p className="text-[10px] text-gray-400">مهمة: #{c.mission_id}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
