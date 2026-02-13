
import React, { useState, useRef, useEffect } from 'react';
import { Gavel, Send, ChevronRight, MoreVertical, CheckCheck, Loader2, MessageSquareText, Camera, Image as ImageIcon, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface Message {
  id: number;
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
  
  const [formData, setFormData] = useState({ link: '', missionId: '', amount: '', reason: 'تجميد الرصيد' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  const formatTime = (date: string | Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // جلب البيانات الأولية والاشتراك في التحديثات الفورية
  useEffect(() => {
    let channel: any;

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
          
          const { data: dbMsgs } = await supabase
            .from('complaint_messages')
            .select('*')
            .eq('complaint_id', complaint.id)
            .order('created_at', { ascending: true });
            
          if (dbMsgs) {
            setMessages(dbMsgs.map(m => ({ 
              id: m.id, 
              text: m.text, 
              imageUrl: m.image_url, 
              sender: m.sender, 
              time: formatTime(m.created_at) 
            })));
          }

          // الاشتراك في الرسائل الجديدة لهذا العميل فوراً
          channel = supabase.channel(`chat_user_${complaint.id}`)
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'complaint_messages', 
              filter: `complaint_id=eq.${complaint.id}` 
            }, (payload) => {
              const newMsg = payload.new;
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.text,
                  imageUrl: newMsg.image_url,
                  sender: newMsg.sender,
                  time: formatTime(newMsg.created_at)
                }];
              });
            })
            .subscribe();
        }
      } finally { setLoading(false); }
    }
    checkStatus();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isChatActive) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatActive]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentComplaintId) return;
    const text = inputValue;
    setInputValue('');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('complaint_messages').insert([{ 
      complaint_id: currentComplaintId, 
      user_id: user?.id, 
      text: text, 
      sender: 'user' 
    }]);
    // التحديث سيتم تلقائياً عبر Real-time channel
  };

  const handleChatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentComplaintId) return;
    setIsChatUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      await supabase.storage.from('chat_images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(fileName);
      await supabase.from('complaint_messages').insert([{ 
        complaint_id: currentComplaintId, 
        user_id: user?.id, 
        image_url: publicUrl, 
        sender: 'user' 
      }]);
    } finally { setIsChatUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `initial/${user?.id}-${Date.now()}.jpg`;
      await supabase.storage.from('complaints').upload(fileName, selectedImage);
      const { data: { publicUrl } } = supabase.storage.from('complaints').getPublicUrl(fileName);
      
      const { data: comp } = await supabase.from('complaints').insert([{ 
        user_id: user?.id, 
        platform_link: formData.link, 
        mission_id: formData.missionId, 
        amount: parseFloat(formData.amount), 
        reason: formData.reason, 
        screenshot_url: publicUrl 
      }]).select().single();

      if (comp) {
        const reportText = `📋 *تفاصيل الطلب:*\nالرابط: ${formData.link}\nالمهمة: #${formData.missionId}\nالمبلغ: ${formData.amount} USDT`;
        await supabase.from('complaint_messages').insert([
          { complaint_id: comp.id, user_id: user?.id, image_url: publicUrl, sender: 'user' },
          { complaint_id: comp.id, user_id: user?.id, text: reportText, sender: 'user' }
        ]);
        
        // إعادة تحميل الصفحة لتنشيط قناة الـ Real-time للشكوى الجديدة
        window.location.reload();
      }
    } finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#9B4A4E]" /></div>;

  if (isChatActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)}><ChevronRight size={28} /></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Naser" className="w-full h-full" />
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold">ناصر - مراجعة المرفقات</h2>
            <p className="text-[9px] opacity-70">متصل الآن لمراجعة طلبك</p>
          </div>
          <MoreVertical size={20} className="opacity-40" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
              <div className={`rounded-2xl overflow-hidden shadow-sm ${msg.sender === 'user' ? 'bg-[#9B4A4E] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                {msg.imageUrl && <img src={msg.imageUrl} className="w-full max-h-64 object-cover" />}
                {msg.text && <div className="p-3 text-[11px] text-right whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</div>}
                <div className={`px-3 pb-1.5 flex items-center gap-1 text-[8px] opacity-60 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={10} />}
                </div>
              </div>
            </div>
          ))}
          {isChatUploading && <div className="self-end text-[9px] text-[#9B4A4E] animate-pulse">جاري إرسال الصورة...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 pb-8 border-t flex items-center gap-3 shadow-inner">
          <button onClick={() => chatImageRef.current?.click()} className="p-2 text-gray-400 hover:text-[#9B4A4E]"><ImageIcon size={22} /></button>
          <input type="file" ref={chatImageRef} className="hidden" accept="image/*" onChange={handleChatImage} />
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="اكتب رسالتك..." className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-xs text-right border-none outline-none focus:ring-1 focus:ring-[#9B4A4E]/20 transition-all" dir="rtl" />
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
          <p className="text-[11px] text-gray-500 mt-2 mb-6 px-4">تم تسجيل بياناتك بنجاح. تواصل مع الوكيل ناصر لمتابعة استرداد أموالك.</p>
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
