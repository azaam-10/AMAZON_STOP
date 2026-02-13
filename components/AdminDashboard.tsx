
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { MessageSquare, User, Clock, ChevronLeft, Send, Image as ImageIcon, CheckCheck, Loader2, Search, AlertCircle, RefreshCcw, ExternalLink, Paperclip } from 'lucide-react';

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

  // جلب البيانات مع الترتيب حسب الأحدث
  const fetchComplaints = async () => {
    try {
      // جلب الشكاوى مع البروفايلات
      const { data, error: fetchError } = await supabase
        .from('complaints')
        .select('*, profiles:user_id(full_name, customer_code)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Fallback في حال فشل العلاقة (Relationship Error)
        const { data: rawData } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
        if (rawData) {
          const userIds = [...new Set(rawData.map(c => c.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, customer_code').in('id', userIds);
          setComplaints(rawData.map(c => ({ ...c, profiles: profiles?.find(p => p.id === c.user_id) })));
        }
      } else {
        setComplaints(data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // الاشتراك في التغييرات: أي شكوى جديدة أو أي رسالة جديدة تعيد ترتيب القائمة
    const complaintsSub = supabase.channel('admin_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => fetchComplaints())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaint_messages' }, () => {
        // إذا جاءت رسالة جديدة، نحدث القائمة لتظهر الدردشة النشطة في الأعلى
        fetchComplaints();
      })
      .subscribe();

    return () => { complaintsSub.unsubscribe(); };
  }, []);

  // مراقبة الرسائل في الدردشة المفتوحة حالياً
  useEffect(() => {
    if (!selectedId) return;

    fetchMessages(selectedId);

    const msgSub = supabase.channel(`active_chat_${selectedId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'complaint_messages', 
        filter: `complaint_id=eq.${selectedId}` 
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => { msgSub.unsubscribe(); };
  }, [selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    const { error: sendError } = await supabase.from('complaint_messages').insert([{
      complaint_id: selectedId,
      user_id: user?.id,
      text: text,
      sender: 'support'
    }]);

    if (sendError) {
      alert("تعذر إرسال الرد: " + sendError.message);
      setInputValue(text);
    }
  };

  if (loading && complaints.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-[#9B4A4E]" size={32} />
      <p className="text-gray-400 text-[10px] font-bold">جاري تحديث السجلات...</p>
    </div>
  );

  // واجهة الدردشة المفتوحة
  if (selectedId) {
    const comp = complaints.find(c => c.id === selectedId);
    return (
      <div className="fixed inset-0 z-[110] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-left duration-300">
        {/* هيدر الدردشة */}
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-md">
          <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/10">
             <User size={20} />
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold truncate">{comp?.profiles?.full_name || 'عميل'}</h2>
            <p className="text-[9px] opacity-70">كود: {comp?.profiles?.customer_code || '---'}</p>
          </div>
        </div>
        
        {/* منطقة الرسائل */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F7F9] pb-24">
          {/* كارت بيانات الطلب (ثابت لا يختفي) */}
          <div className="bg-white p-4 rounded-3xl border border-[#9B4A4E]/10 shadow-sm text-[10px] text-gray-700 text-right mb-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-1 h-full bg-[#9B4A4E]"></div>
             <div className="flex items-center gap-2 mb-2 text-[#9B4A4E] font-bold border-b border-gray-50 pb-2">
                <Paperclip size={14} /> تفاصيل المهمة الأصلية
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div className="bg-gray-50 p-2 rounded-xl">
                 <p className="text-gray-400 text-[8px]">المبلغ المتنازع عليه</p>
                 <p className="text-red-600 font-black text-xs">{comp?.amount} USDT</p>
               </div>
               <div className="bg-gray-50 p-2 rounded-xl">
                 <p className="text-gray-400 text-[8px]">رقم المهمة</p>
                 <p className="text-gray-800 font-bold text-xs">#{comp?.mission_id}</p>
               </div>
             </div>
             <p className="mt-2 text-blue-600 underline truncate">{comp?.platform_link}</p>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] flex flex-col ${m.sender === 'support' ? 'self-end' : 'self-start'}`}>
               <div className={`rounded-2xl overflow-hidden shadow-sm ${m.sender === 'support' ? 'bg-[#9B4A4E] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                 {m.image_url && (
                   <div className="relative group">
                     <img src={m.image_url} className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95" onClick={() => window.open(m.image_url, '_blank')} />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                        <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100" />
                     </div>
                   </div>
                 )}
                 {m.text && <div className="p-3 text-[11px] text-right whitespace-pre-wrap leading-relaxed font-medium">{m.text}</div>}
                 <div className={`px-3 pb-1 flex items-center gap-1 text-[8px] ${m.sender === 'support' ? 'justify-start opacity-60' : 'justify-end opacity-40'}`}>
                   <span>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   {m.sender === 'support' && <CheckCheck size={10} />}
                 </div>
               </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* حقل الإدخال */}
        <div className="p-4 border-t flex items-center gap-2 bg-white pb-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="رد على العميل..."
            className="flex-1 bg-gray-50 rounded-full px-5 py-3.5 text-xs text-right border border-gray-100 outline-none focus:border-[#9B4A4E] focus:ring-1 focus:ring-[#9B4A4E]/10"
            dir="rtl"
          />
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-3.5 rounded-full shadow-lg active:scale-90 transition-transform flex items-center justify-center">
            <Send size={20} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // واجهة القائمة الرئيسية للمسؤول
  return (
    <div className="space-y-4 py-2 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6">
         <div className="flex items-center justify-between mb-6">
            <button onClick={fetchComplaints} className="p-2 text-gray-400 hover:text-[#9B4A4E] transition-colors">
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="text-right">
              <h2 className="font-black text-gray-800 text-lg">سجل الوارد</h2>
              <p className="text-[10px] text-[#9B4A4E] font-bold">يتم الترتيب حسب الأحدث تلقائياً</p>
            </div>
         </div>
         <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" placeholder="البحث برقم المهمة أو اسم العميل..." className="w-full bg-gray-50 rounded-2xl py-3.5 px-12 text-xs text-right border-none shadow-inner" dir="rtl" />
         </div>
      </div>

      <div className="space-y-3 px-1 pb-24">
        {complaints.length === 0 && !loading ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300"><MessageSquare size={32} /></div>
            <p className="text-gray-400 text-xs font-bold">لا توجد محادثات نشطة</p>
          </div>
        ) : (
          complaints.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedId(c.id)}
              className="w-full bg-white p-5 rounded-[28px] flex items-center gap-4 border border-gray-50 shadow-sm active:scale-[0.98] transition-all text-right hover:border-[#9B4A4E]/30 relative group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center text-[#9B4A4E] shadow-inner group-hover:bg-[#9B4A4E]/5">
                <User size={28} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[8px] font-bold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">
                    {new Date(c.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  <h4 className="font-bold text-gray-800 text-sm truncate ml-2">
                    {c.profiles?.full_name || 'عميل مجهول'}
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-[#9B4A4E]">{c.amount} USDT</span>
                  <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                    مهمة: #{c.mission_id}
                  </p>
                </div>
              </div>
              <ChevronLeft size={16} className="text-gray-300 group-hover:text-[#9B4A4E] transition-colors" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
