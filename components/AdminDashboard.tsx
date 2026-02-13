
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase.ts';
import { MessageSquare, User, Clock, ChevronLeft, Send, Image as ImageIcon, CheckCheck, Loader2, Search, AlertCircle, RefreshCcw, ExternalLink, Paperclip, Pin } from 'lucide-react';

interface Complaint {
  id: string;
  created_at: string;
  amount: number;
  mission_id: string;
  platform_link: string;
  user_id: string;
  last_activity?: string; // لترتيب القائمة حسب آخر رسالة
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
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // جلب البيانات الأولية
  const fetchComplaints = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('complaints')
        .select('*, profiles:user_id(full_name, customer_code)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Fallback في حال فشل العلاقة
        const { data: rawData } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
        if (rawData) {
          const userIds = [...new Set(rawData.map(c => c.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, customer_code').in('id', userIds);
          const mapped = rawData.map(c => ({ 
            ...c, 
            last_activity: c.created_at,
            profiles: profiles?.find(p => p.id === c.user_id) 
          }));
          setComplaints(mapped);
        }
      } else {
        const mapped = (data || []).map(c => ({ ...c, last_activity: c.created_at }));
        setComplaints(mapped);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();

    // الاشتراك في الرسائل الجديدة لإعادة الترتيب فوراً
    const globalMsgSub = supabase.channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaint_messages' }, (payload) => {
        const newMsg = payload.new;
        setComplaints(prev => {
          const index = prev.findIndex(c => c.id === newMsg.complaint_id);
          if (index === -1) return prev; // إذا لم تكن الشكوى في القائمة بعد
          
          const updatedComplaints = [...prev];
          const item = { ...updatedComplaints[index], last_activity: newMsg.created_at };
          updatedComplaints.splice(index, 1);
          updatedComplaints.unshift(item); // نقلها للأعلى
          return updatedComplaints;
        });
      })
      .subscribe();

    const complaintsSub = supabase.channel('admin_complaints')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints' }, () => fetchComplaints())
      .subscribe();

    return () => {
      globalMsgSub.unsubscribe();
      complaintsSub.unsubscribe();
    };
  }, []);

  // جلب الرسائل عند اختيار دردشة
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('complaint_messages')
        .select('*')
        .eq('complaint_id', selectedId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const activeChatSub = supabase.channel(`chat_active_${selectedId}`)
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

    return () => { activeChatSub.unsubscribe(); };
  }, [selectedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // تصفية القائمة بناءً على البحث والترتيب حسب النشاط
  const sortedComplaints = useMemo(() => {
    return complaints
      .filter(c => 
        c.profiles?.full_name?.includes(searchQuery) || 
        c.mission_id?.includes(searchQuery) || 
        c.amount.toString().includes(searchQuery)
      )
      .sort((a, b) => new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime());
  }, [complaints, searchQuery]);

  if (loading && complaints.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-[#9B4A4E]" size={32} />
      <p className="text-gray-400 text-[10px] font-bold">جاري تحديث النظام...</p>
    </div>
  );

  if (selectedId) {
    const comp = complaints.find(c => c.id === selectedId);
    return (
      <div className="fixed inset-0 z-[110] bg-white flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-left duration-300">
        {/* الهيدر */}
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg z-20">
          <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold truncate">{comp?.profiles?.full_name || 'عميل'}</h2>
            <p className="text-[9px] opacity-70">كود: {comp?.profiles?.customer_code || '---'}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/10">
             <User size={20} />
          </div>
        </div>
        
        {/* منطقة المحتوى */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {/* كارت البيانات الثابت - لا يختفي أبداً */}
          <div className="bg-white p-4 rounded-3xl border border-[#9B4A4E]/20 shadow-sm text-right sticky top-0 z-10">
             <div className="flex items-center gap-2 mb-3 text-[#9B4A4E] font-bold text-[11px] border-b border-gray-50 pb-2">
                <Pin size={14} className="rotate-45" /> بيانات الشكوى الأصلية
             </div>
             <div className="grid grid-cols-2 gap-3 mb-3">
               <div className="bg-gray-50 p-2.5 rounded-2xl">
                 <p className="text-gray-400 text-[8px] mb-1">المبلغ المطلوب</p>
                 <p className="text-red-600 font-black text-xs">{comp?.amount} USDT</p>
               </div>
               <div className="bg-gray-50 p-2.5 rounded-2xl">
                 <p className="text-gray-400 text-[8px] mb-1">رقم المهمة</p>
                 <p className="text-gray-800 font-bold text-xs">#{comp?.mission_id}</p>
               </div>
             </div>
             <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                <p className="text-[9px] text-blue-600 truncate underline">{comp?.platform_link}</p>
             </div>
          </div>

          {/* الرسائل */}
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] flex flex-col ${m.sender === 'support' ? 'self-end' : 'self-start'}`}>
               <div className={`rounded-2xl overflow-hidden shadow-sm ${m.sender === 'support' ? 'bg-[#9B4A4E] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                 {m.image_url && (
                   <div className="relative group">
                     <img src={m.image_url} className="w-full max-h-80 object-cover cursor-pointer" onClick={() => window.open(m.image_url, '_blank')} />
                     <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <ExternalLink size={20} className="text-white" />
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
            placeholder="اكتب ردك هنا..."
            className="flex-1 bg-gray-50 rounded-full px-5 py-4 text-xs text-right border border-gray-100 outline-none focus:border-[#9B4A4E] transition-all"
            dir="rtl"
          />
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-4 rounded-full shadow-lg active:scale-90 transition-transform">
            <Send size={20} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6">
         <div className="flex items-center justify-between mb-6">
            <button onClick={fetchComplaints} className="p-2 text-gray-400 hover:text-[#9B4A4E] transition-colors">
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="text-right">
              <h2 className="font-black text-gray-800 text-lg">سجل الوارد</h2>
              <p className="text-[10px] text-[#9B4A4E] font-bold">المحادثات النشطة تظهر في الأعلى</p>
            </div>
         </div>
         <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث برقم المهمة أو اسم العميل..." 
              className="w-full bg-gray-50 rounded-2xl py-4 px-12 text-xs text-right border-none shadow-inner" 
              dir="rtl" 
            />
         </div>
      </div>

      <div className="space-y-3 px-1 pb-24">
        {sortedComplaints.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200"><MessageSquare size={32} /></div>
            <p className="text-gray-400 text-xs font-bold">لا توجد محادثات مطابقة</p>
          </div>
        ) : (
          sortedComplaints.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedId(c.id)}
              className="w-full bg-white p-5 rounded-[28px] flex items-center gap-4 border border-gray-50 shadow-sm active:scale-[0.98] transition-all text-right hover:border-[#9B4A4E]/30 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center text-[#9B4A4E] shadow-inner group-hover:from-[#9B4A4E]/5">
                <User size={28} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[8px] font-bold text-gray-300">
                    {new Date(c.last_activity || c.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
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
              <div className="flex flex-col items-center">
                <ChevronLeft size={16} className="text-gray-300 group-hover:text-[#9B4A4E]" />
                {new Date(c.last_activity || 0).getTime() > new Date().getTime() - 60000 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse"></div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
