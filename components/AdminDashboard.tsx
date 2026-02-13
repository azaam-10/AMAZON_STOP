
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { MessageSquare, User, Clock, ChevronLeft, Send, Image as ImageIcon, CheckCheck, Loader2, Search } from 'lucide-react';

interface Complaint {
  id: string;
  created_at: string;
  amount: number;
  mission_id: string;
  platform_link: string;
  profiles: {
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComplaints();
    const subscription = supabase
      .channel('public:complaints')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints' }, fetchComplaints)
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      const sub = supabase
        .channel(`chat:${selectedId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaint_messages', filter: `complaint_id=eq.${selectedId}` }, (payload) => {
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
    const { data } = await supabase
      .from('complaints')
      .select('*, profiles(full_name, customer_code)')
      .order('created_at', { ascending: false });
    if (data) setComplaints(data);
    setLoading(false);
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

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#9B4A4E]" /></div>;

  if (selectedId) {
    const comp = complaints.find(c => c.id === selectedId);
    return (
      <div className="fixed inset-0 z-[110] bg-white flex flex-col max-w-[430px] mx-auto">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => setSelectedId(null)}><ChevronLeft size={28} /></button>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold">{comp?.profiles?.full_name}</h2>
            <p className="text-[9px] opacity-70">كود العميل: {comp?.profiles?.customer_code}</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F7F9]">
          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-[10px] text-blue-800 text-right leading-relaxed mb-4">
             ⚠️ مراجعة الطلب:<br/>
             المنصة: {comp?.platform_link}<br/>
             المهمة: #{comp?.mission_id}<br/>
             المبلغ: {comp?.amount} USDT
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

        <div className="p-4 border-t flex items-center gap-2 bg-white">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="رد على العميل..."
            className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-xs text-right border outline-none focus:border-[#9B4A4E]"
            dir="rtl"
          />
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-2.5 rounded-full">
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
         <div className="flex items-center justify-between mb-4">
            <span className="bg-[#9B4A4E]/10 text-[#9B4A4E] text-[10px] px-2 py-1 rounded-lg font-bold">لوحة التحكم</span>
            <h2 className="font-black text-gray-800">سجل الطلبات الواردة</h2>
         </div>
         <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="البحث عن عميل..." className="w-full bg-gray-50 rounded-xl py-2 px-10 text-[11px] text-right border-none" dir="rtl" />
         </div>
      </div>

      <div className="space-y-3">
        {complaints.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">لا توجد طلبات جديدة حالياً</div>
        ) : (
          complaints.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedId(c.id)}
              className="w-full bg-white p-4 rounded-3xl flex items-center gap-3 border border-gray-50 shadow-sm active:scale-95 transition-all text-right"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[#9B4A4E]">
                <User size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  <h4 className="font-bold text-gray-800 text-sm">{c.profiles?.full_name}</h4>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">كود: {c.profiles?.customer_code} • مبلغ: {c.amount} USDT</p>
                <div className="flex items-center gap-1 mt-2 text-[#9B4A4E] font-bold text-[9px]">
                   <MessageSquare size={10} />
                   عرض الدردشة والمرفقات
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
