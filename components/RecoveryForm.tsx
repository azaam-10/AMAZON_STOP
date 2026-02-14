
import React, { useState, useRef, useEffect } from 'react';
import { Gavel, Send, ChevronRight, MoreVertical, CheckCheck, Loader2, MessageSquareText, Camera, Image as ImageIcon, Paperclip, Copy, X } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface Message {
  id: any;
  text?: string;
  imageUrl?: string;
  sender: 'user' | 'support';
  time: string;
}

const RecoveryForm: React.FC = () => {
  const [isChatActive, setIsChatActive] = useState(false);
  const [hasExistingComplaint, setHasExistingComplaint] = useState(false);
  const [currentComplaintId, setCurrentComplaintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatUploading, setIsChatUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ link: '', missionId: '', amount: '', reason: 'تجميد الرصيد' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  const formatTime = (date: string | Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    messagesRef.current = messages;
    if (isChatActive) {
      scrollToBottom();
    }
  }, [messages, isChatActive]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setActiveMenuId(null);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const loadMessages = async (id: string) => {
    try {
      const { data: dbMsgs } = await supabase
        .from('complaint_messages')
        .select('*')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true });
        
      if (dbMsgs && Array.isArray(dbMsgs)) {
        const mapped = dbMsgs.map(m => ({ 
          id: m.id, 
          text: m.text, 
          imageUrl: m.image_url, 
          sender: m.sender, 
          time: formatTime(m.created_at) 
        }));
        
        if (JSON.stringify(mapped) !== JSON.stringify(messagesRef.current)) {
          setMessages(mapped);
          messagesRef.current = mapped;
        }
      }
    } catch (e) {
      console.error("Polling error:", e);
    }
  };

  useEffect(() => {
    async function checkStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: complaint } = await supabase
          .from('complaints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (complaint) {
          setHasExistingComplaint(true);
          setCurrentComplaintId(complaint.id);
          await loadMessages(complaint.id);
        }
      } catch (e) {
        console.error(e);
      } finally { 
        setLoading(false); 
      }
    }
    checkStatus();
  }, []);

  useEffect(() => {
    if (!currentComplaintId) return;

    const channel = supabase.channel(`client_sync_v6_${currentComplaintId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'complaint_messages', 
        filter: `complaint_id=eq.${currentComplaintId}` 
      }, (payload) => {
        const newMsg = payload.new;
        const currentMsgs = Array.isArray(messagesRef.current) ? messagesRef.current : [];
        const exists = currentMsgs.some(m => String(m.id) === String(newMsg.id));
        if (!exists) {
          const mappedMsg: Message = {
            id: newMsg.id,
            text: newMsg.text,
            imageUrl: newMsg.image_url,
            sender: newMsg.sender,
            time: formatTime(newMsg.created_at)
          };
          setMessages(prev => [...prev, mappedMsg]);
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      loadMessages(currentComplaintId);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [currentComplaintId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentComplaintId) return;
    const text = inputValue;
    const now = new Date();
    setInputValue('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        text: text,
        sender: 'user',
        time: formatTime(now)
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const { data: sentMsg, error } = await supabase.from('complaint_messages').insert([{ 
        complaint_id: currentComplaintId, 
        user_id: user.id, 
        text: text, 
        sender: 'user' 
      }]).select().single();
      
      if (error) throw error;
      
      setMessages(prev => prev.map(m => m.id === tempId ? {
        id: sentMsg.id,
        text: sentMsg.text,
        imageUrl: sentMsg.image_url,
        sender: sentMsg.sender,
        time: formatTime(sentMsg.created_at)
      } : m));

    } catch (e) {
      console.error(e);
      setInputValue(text);
      setMessages(prev => prev.filter(m => !String(m.id).startsWith('temp-')));
    }
  };

  const handleChatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentComplaintId) return;
    setIsChatUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from('chat_images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(fileName);
      
      await supabase.from('complaint_messages').insert([{ 
        complaint_id: currentComplaintId, 
        user_id: user.id, 
        image_url: publicUrl, 
        sender: 'user' 
      }]);
    } catch (e) {
      console.error(e);
    } finally { 
      setIsChatUploading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `initial/${user.id}-${Date.now()}.jpg`;
      await supabase.storage.from('complaints').upload(fileName, selectedImage);
      const { data: { publicUrl } } = supabase.storage.from('complaints').getPublicUrl(fileName);
      
      const { data: comp, error: compErr } = await supabase.from('complaints').insert([{ 
        user_id: user.id, 
        platform_link: formData.link, 
        mission_id: formData.missionId, 
        amount: parseFloat(formData.amount), 
        reason: formData.reason, 
        screenshot_url: publicUrl 
      }]).select().single();

      if (compErr) throw compErr;

      if (comp) {
        const reportText = `📋 *تفاصيل الطلب:*\nالرابط: ${formData.link}\nالمهمة: #${formData.missionId}\nالمبلغ: ${formData.amount} USDT`;
        await supabase.from('complaint_messages').insert([
          { complaint_id: comp.id, user_id: user.id, image_url: publicUrl, sender: 'user' },
          { complaint_id: comp.id, user_id: user.id, text: reportText, sender: 'user' }
        ]);
        
        setCurrentComplaintId(comp.id);
        setHasExistingComplaint(true);
        setIsChatActive(true);
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ في تقديم الشكوى.");
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#9B4A4E]" /></div>;

  if (isChatActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto animate-in fade-in duration-200" onClick={() => setActiveMenuId(null)}>
        {copyToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-black/80 backdrop-blur-md text-white text-[10px] px-5 py-2.5 rounded-full font-bold animate-in fade-in zoom-in duration-300 flex items-center gap-2">
            <CheckCheck size={14} className="text-green-400" /> تم نسخ النص
          </div>
        )}

        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)}><ChevronRight size={28} /></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Naser" className="w-full h-full" />
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold">ناصر - مراجعة المرفقات</h2>
            <p className="text-[9px] opacity-70">متصل الآن للمراجعة</p>
          </div>
          <MoreVertical size={20} className="opacity-40" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col bg-[#e5ddd5] relative">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[85%] flex flex-col relative ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
              <div 
                className={`rounded-2xl overflow-hidden shadow-sm relative transition-all duration-200 ${activeMenuId === msg.id ? 'ring-2 ring-[#9B4A4E] ring-offset-2 scale-[1.02]' : ''} ${msg.sender === 'user' ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none border border-black/5' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                }}
              >
                {activeMenuId === msg.id && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCopyText(msg.text || ''); }}
                          className="bg-white text-gray-800 p-2 rounded-full px-4 text-[10px] font-bold shadow-xl flex items-center gap-2 active:scale-90 transition-transform"
                        >
                          <Copy size={12} className="text-[#9B4A4E]" /> نسخ
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} className="bg-black/60 text-white p-2 rounded-full">
                          <X size={12} />
                        </button>
                    </div>
                  </div>
                )}

                {msg.imageUrl && <img src={msg.imageUrl} className="w-full max-h-64 object-cover cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />}
                {msg.text && (
                   <div className="p-3 text-[11px] text-right whitespace-pre-wrap leading-relaxed font-medium">
                     {msg.text}
                   </div>
                )}
                <div className={`px-3 pb-1.5 flex items-center gap-1 text-[8px] opacity-60 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={10} />}
                </div>
              </div>
            </div>
          ))}
          {isChatUploading && <div className="self-end text-[9px] text-[#9B4A4E] animate-pulse">جاري إرسال المرفق...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 pb-8 border-t flex items-center gap-3 shadow-inner">
          <button onClick={() => chatImageRef.current?.click()} className="p-2 text-gray-400 hover:text-[#9B4A4E]"><ImageIcon size={22} /></button>
          <input type="file" ref={chatImageRef} className="hidden" accept="image/*" onChange={handleChatImage} />
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="اكتب رسالتك..." className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-xs text-right border-none outline-none focus:ring-1 focus:ring-[#9B4A4E]/20" dir="rtl" />
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-3 rounded-full shadow-lg active:scale-90 transition-all"><Send size={18} className="rotate-180" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
      {hasExistingComplaint ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4"><MessageSquareText size={36} className="text-green-600" /></div>
          <h3 className="font-bold text-gray-800">طلبك قيد المراجعة الفورية</h3>
          <p className="text-[11px] text-gray-500 mt-2 mb-6 px-4">تم تسجيل بياناتك. تواصل مع الوكيل ناصر لمتابعة الاسترداد.</p>
          <button onClick={() => setIsChatActive(true)} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform">
            <Paperclip size={20} /> عرض المرفقات والدردشة المباشرة
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required placeholder="رابط المنصة" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border-none shadow-inner" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" required placeholder="رقم المهمة" value={formData.missionId} onChange={e => setFormData({...formData, missionId: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border-none shadow-inner" />
            <input type="number" required placeholder="المبلغ USDT" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border-none shadow-inner" />
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 cursor-pointer overflow-hidden relative group">
            {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="text-center transition-transform group-hover:scale-110"><Camera className="mx-auto text-gray-300 mb-2" size={32} /><p className="text-[9px] text-gray-400 font-bold">أرفق لقطة شاشة للمهمة</p></div>}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); } }} />
          <button type="submit" disabled={isSubmitting || !selectedImage} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'تقديم الشكوى الآن'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RecoveryForm;
