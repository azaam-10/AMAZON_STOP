
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase.ts';
import { MessageSquare, User, Clock, ChevronLeft, Send, Image as ImageIcon, CheckCheck, Loader2, Search, AlertCircle, RefreshCcw, ExternalLink, Paperclip, Pin, Sparkles, WifiOff } from 'lucide-react';

interface Complaint {
  id: string;
  created_at: string;
  amount: number;
  mission_id: string;
  platform_link: string;
  user_id: string;
  last_activity: string; 
  screenshot_url?: string;
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
  const selectedIdRef = useRef<string | null>(null);
  const messagesRef = useRef<any[]>([]);

  // مزامنة المراجع لضمان الوصول للقيم الأحدث داخل ردود فعل Realtime
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
      messagesRef.current = [];
    }
  }, [selectedId]);

  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadMessages = async (id: string) => {
    const { data } = await supabase
      .from('complaint_messages')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      messagesRef.current = data;
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data: rawComps, error: rawError } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (rawError) throw rawError;
      if (!rawComps) return;

      const userIds = [...new Set(rawComps.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, customer_code')
        .in('id', userIds);

      const { data: lastMsgs } = await supabase
        .from('complaint_messages')
        .select('complaint_id, created_at')
        .order('created_at', { ascending: false });

      const processed = rawComps.map(c => {
        const latestMsg = lastMsgs?.find(m => m.complaint_id === c.id);
        return {
          ...c,
          profiles: profiles?.find(p => p.id === c.user_id),
          last_activity: latestMsg ? latestMsg.created_at : c.created_at
        } as Complaint;
      });

      setComplaints(processed);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError("خطأ في جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  // المزامنة الفورية (Real-time) - واتساب بروتوكول
  useEffect(() => {
    fetchComplaints();

    const channel = supabase.channel('whatsapp_admin_v3')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'complaint_messages' 
      }, (payload) => {
        const newMsg = payload.new;
        
        // 1. تحديث ترتيب القائمة (تصدر المحادثة النشطة)
        setComplaints(prev => {
          const index = prev.findIndex(c => c.id === newMsg.complaint_id);
          if (index === -1) {
            // إذا كانت الشكوى غير موجودة، نقوم بجلب الكل مجدداً لضمان التحديث
            fetchComplaints();
            return prev;
          }
          
          const updated = [...prev];
          const item = { ...updated[index], last_activity: newMsg.created_at };
          updated.splice(index, 1);
          updated.unshift(item);
          return updated;
        });

        // 2. تحديث الرسائل في المحادثة المفتوحة (لحظياً)
        if (selectedIdRef.current === newMsg.complaint_id) {
          // التحقق من عدم التكرار باستخدام المعرف (ID)
          const exists = messagesRef.current.some(m => String(m.id) === String(newMsg.id));
          if (!exists) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'complaints' 
      }, () => {
        fetchComplaints();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('Admin Realtime: Connected');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedId) return;
    const text = inputValue;
    setInputValue('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // تحديث متفائل للواجهة (Optimistic UI) لضمان السرعة الفائقة
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        complaint_id: selectedId,
        user_id: user.id,
        text: text,
        sender: 'support',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMsg]);

      const { data: sentMsg, error: sendError } = await supabase.from('complaint_messages').insert([{
        complaint_id: selectedId,
        user_id: user.id,
        text: text,
        sender: 'support'
      }]).select().single();
      
      if (sendError) throw sendError;

      // استبدال الرسالة المؤقتة بالرسالة الحقيقية
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
      
    } catch (err: any) {
      console.error("Send Error:", err);
      setInputValue(text);
      setMessages(prev => prev.filter(m => !String(m.id).startsWith('temp-')));
      alert("فشل الإرسال، حاول مجدداً.");
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints
      .filter(c => 
        searchQuery === '' ||
        c.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mission_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.amount.toString().includes(searchQuery)
      )
      .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
  }, [complaints, searchQuery]);

  if (loading && complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-4">
        <Loader2 className="animate-spin text-[#9B4A4E]" size={40} />
        <p className="text-gray-400 text-[10px] font-black tracking-widest">تنشيط المزامنة المباشرة...</p>
      </div>
    );
  }

  if (selectedId) {
    const comp = complaints.find(c => c.id === selectedId);
    return (
      <div className="fixed inset-0 z-[110] bg-[#F8FAFC] flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-left duration-200">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-xl z-30">
          <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold truncate">{comp?.profiles?.full_name || 'عميل'}</h2>
            <p className="text-[9px] opacity-70">كود: {comp?.profiles?.customer_code || '---'}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
             <User size={20} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 bg-[#e5ddd5]">
          <div className="bg-white p-4 rounded-3xl border border-[#9B4A4E]/20 shadow-md text-right sticky top-0 z-20">
             <div className="flex items-center gap-2 mb-3 text-[#9B4A4E] font-bold text-[10px] border-b border-gray-50 pb-2">
                <Pin size={14} className="rotate-45" /> البيانات الأصلية للطلب
             </div>
             <div className="grid grid-cols-2 gap-3 mb-3 text-right">
               <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                 <p className="text-gray-400 text-[8px] mb-1 font-bold">المبلغ</p>
                 <p className="text-red-600 font-black text-xs">{comp?.amount} USDT</p>
               </div>
               <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                 <p className="text-gray-400 text-[8px] mb-1 font-bold">المهمة</p>
                 <p className="text-gray-800 font-bold text-xs">#{comp?.mission_id}</p>
               </div>
             </div>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] flex flex-col ${m.sender === 'support' ? 'self-end' : 'self-start'}`}>
               <div className={`rounded-2xl overflow-hidden shadow-sm ${m.sender === 'support' ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none border border-black/5' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}>
                 {m.image_url && (
                   <img src={m.image_url} className="w-full max-h-96 object-contain bg-black/5 cursor-pointer" onClick={() => window.open(m.image_url, '_blank')} />
                 )}
                 {m.text && <div className="p-3 text-[11px] text-right whitespace-pre-wrap leading-relaxed font-medium">{m.text}</div>}
                 <div className={`px-3 pb-1.5 flex items-center gap-1 text-[8px] ${m.sender === 'support' ? 'justify-start opacity-60' : 'justify-end opacity-40'}`}>
                   <span>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   {m.sender === 'support' && <CheckCheck size={10} />}
                 </div>
               </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t flex items-center gap-2 bg-white pb-10 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] z-30">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب رد المسؤول..."
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
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6 mx-1">
         <div className="flex items-center justify-between mb-6 text-right">
            <button onClick={fetchComplaints} className="p-2 text-gray-300 hover:text-[#9B4A4E]">
              <RefreshCcw size={18} className={loading ? 'animate-spin text-[#9B4A4E]' : ''} />
            </button>
            <div>
              <h2 className="font-black text-gray-800 text-lg">لوحة الرصد الفوري</h2>
              <div className="flex items-center gap-1 justify-end mt-1">
                 <span className="text-[10px] text-green-500 font-black">المزامنة نَشطة</span>
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_green]"></div>
              </div>
            </div>
         </div>
         <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المهمة..." 
              className="w-full bg-gray-50 rounded-2xl py-4 px-12 text-xs text-right border-none shadow-inner outline-none focus:ring-1 focus:ring-[#9B4A4E]/20" 
              dir="rtl" 
            />
         </div>
      </div>

      <div className="space-y-3 px-1 pb-32">
        {filteredComplaints.length === 0 && !loading ? (
          <div className="text-center py-24 flex flex-col items-center gap-4 text-gray-400">
            <MessageSquare size={40} />
            <p className="text-xs font-black">لا توجد محادثات نشطة</p>
          </div>
        ) : (
          filteredComplaints.map(c => {
            const isJustActive = (new Date().getTime() - new Date(c.last_activity).getTime()) < 30000;
            return (
              <button 
                key={c.id} 
                onClick={() => setSelectedId(c.id)}
                className={`w-full bg-white p-5 rounded-[28px] flex items-center gap-4 border shadow-sm active:scale-[0.98] transition-all text-right hover:border-[#9B4A4E]/30 relative overflow-hidden ${isJustActive ? 'border-[#9B4A4E]/30 ring-1 ring-[#9B4A4E]/5 shadow-md' : 'border-gray-50'}`}
              >
                {isJustActive && (
                  <div className="absolute top-0 right-0 p-1.5 bg-[#9B4A4E] text-white rounded-bl-xl shadow-md flex items-center gap-1">
                     <Sparkles size={10} />
                     <span className="text-[7px] font-black">جديد</span>
                  </div>
                )}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isJustActive ? 'bg-[#9B4A4E]/10 text-[#9B4A4E]' : 'bg-gray-50 text-gray-400'}`}>
                  <User size={28} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[8px] font-bold text-gray-400">
                      {new Date(c.last_activity).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                    <h4 className="font-bold text-gray-800 text-sm truncate ml-2">
                      {c.profiles?.full_name || 'عميل'}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#9B4A4E]">{c.amount} USDT</span>
                    <p className="text-[9px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-md">
                      #{c.mission_id}
                    </p>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-gray-200" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
