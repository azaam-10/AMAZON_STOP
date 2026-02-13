
import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Gavel, Send, Headphones, ChevronRight, MoreVertical, CheckCheck, Loader2, MessageSquareText, Clock, Camera, Image as ImageIcon, X, Maximize2, Paperclip } from 'lucide-react';
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
  const [currentComplaintId, setCurrentComplaintId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatUploading, setIsChatUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    link: '',
    missionId: '',
    amount: '',
    reason: 'تجميد الرصيد'
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkExistingStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

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
          
          // جلب الرسائل السابقة من جدول complaint_messages إذا وجد
          const { data: dbMessages } = await supabase
            .from('complaint_messages')
            .select('*')
            .eq('complaint_id', complaint.id)
            .order('created_at', { ascending: true });

          if (dbMessages && dbMessages.length > 0) {
            setMessages(dbMessages.map(m => ({
              id: m.id,
              text: m.text,
              imageUrl: m.image_url,
              sender: m.sender,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })));
          } else {
            // رسائل افتراضية في حال عدم وجود سجل
            const time = new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages([
              { id: 1, imageUrl: complaint.screenshot_url, sender: 'user', time },
              { id: 2, text: `طلب استرداد للمهمة #${complaint.mission_id}`, sender: 'user', time },
              { id: 3, text: "مرحباً، جاري مراجعة الصور المرسلة...", sender: 'support', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
          }
        }
      } catch (err) {
        console.error("Error fetching status:", err);
      } finally {
        setLoading(false);
      }
    }
    checkExistingStatus();
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatActive) scrollToBottom();
  }, [messages, isChatActive]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendChatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentComplaintId) return;

    setIsChatUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('chat_images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(fileName);

      // حفظ في جدول الرسائل
      const { data: msgData, error: msgError } = await supabase.from('complaint_messages').insert([{
        complaint_id: currentComplaintId,
        user_id: user?.id,
        image_url: publicUrl,
        sender: 'user'
      }]).select().single();

      if (msgError) throw msgError;

      setMessages(prev => [...prev, {
        id: msgData.id,
        imageUrl: publicUrl,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err: any) {
      alert("فشل رفع الصورة: " + err.message);
    } finally {
      setIsChatUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return alert("يرجى إرفاق صورة الإثبات.");
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      await supabase.storage.from('complaints').upload(fileName, selectedImage);
      const { data: { publicUrl } } = supabase.storage.from('complaints').getPublicUrl(fileName);

      const { data: complaint, error } = await supabase.from('complaints').insert([{
        user_id: user?.id,
        platform_link: formData.link,
        mission_id: formData.missionId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        screenshot_url: publicUrl
      }]).select().single();

      if (error) throw error;

      // حفظ الرسائل الأولية في الجدول
      await supabase.from('complaint_messages').insert([
        { complaint_id: complaint.id, user_id: user?.id, image_url: publicUrl, sender: 'user' },
        { complaint_id: complaint.id, user_id: user?.id, text: `بلاغ استرداد رصيد بقيمة ${formData.amount} USDT`, sender: 'user' }
      ]);

      setHasExistingComplaint(true);
      setCurrentComplaintId(complaint.id);
      setIsChatActive(true);
      
      // تحديث الرسائل محلياً
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([
        { id: Date.now(), imageUrl: publicUrl, sender: 'user', time },
        { id: Date.now()+1, text: `طلب استرداد للمهمة #${formData.missionId}`, sender: 'user', time }
      ]);

    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentComplaintId) return;
    const text = inputValue;
    setInputValue('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: msgData } = await supabase.from('complaint_messages').insert([{
        complaint_id: currentComplaintId,
        user_id: user?.id,
        text: text,
        sender: 'user'
      }]).select().single();

      if (msgData) {
        setMessages(prev => [...prev, {
          id: msgData.id,
          text: text,
          sender: 'user',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="bg-white rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-[#9B4A4E]" size={32} />
    </div>
  );

  if (isChatActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)} className="p-1"><ChevronRight size={28} /></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Naser" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-sm font-bold">ناصر - معالجة الشكاوي</h2>
            <p className="text-[9px] opacity-70">متصل الآن لمراجعة صورك</p>
          </div>
          <MoreVertical size={20} className="opacity-40" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[80%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
              <div className={`rounded-2xl overflow-hidden shadow-sm ${msg.sender === 'user' ? 'bg-[#9B4A4E] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} className="w-full max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />
                )}
                {msg.text && <div className="p-3 text-xs text-right whitespace-pre-wrap">{msg.text}</div>}
                <div className={`px-3 pb-1 flex items-center gap-1 text-[8px] opacity-60 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={10} />}
                </div>
              </div>
            </div>
          ))}
          {isChatUploading && (
            <div className="self-end bg-[#9B4A4E]/20 p-3 rounded-2xl flex items-center gap-2">
              <Loader2 className="animate-spin text-[#9B4A4E]" size={14} />
              <span className="text-[10px] text-[#9B4A4E] font-bold">جاري رفع الصورة...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 pb-8 border-t flex items-center gap-3">
          <button onClick={() => chatImageRef.current?.click()} className="p-2 text-gray-400 hover:text-[#9B4A4E] transition-colors">
            <ImageIcon size={22} />
          </button>
          <input type="file" ref={chatImageRef} className="hidden" accept="image/*" onChange={handleSendChatImage} />
          <div className="flex-1">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب رسالة..."
              className="w-full bg-gray-50 rounded-full px-4 py-2.5 text-xs text-right outline-none border border-gray-100 focus:border-[#9B4A4E]/30"
              dir="rtl"
            />
          </div>
          <button onClick={handleSendMessage} className="bg-[#9B4A4E] text-white p-2.5 rounded-full shadow-lg shadow-[#9B4A4E]/20">
            <Send size={18} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
      {hasExistingComplaint ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4"><MessageSquareText size={36} className="text-green-600" /></div>
          <h3 className="font-bold text-gray-800">طلبك مسجل ونحن نراجع الصور</h3>
          <p className="text-[11px] text-gray-500 mt-2 mb-6">لقد قمت بإرفاق إثبات الحساب. يمكنك إرسال المزيد من الصور التوضيحية داخل الدردشة.</p>
          <button onClick={() => setIsChatActive(true)} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg">
            <Paperclip size={20} /> متابعة الصور والدردشة
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required placeholder="رابط المنصة" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" required placeholder="رقم المهمة" value={formData.missionId} onChange={e => setFormData({...formData, missionId: e.target.value})} className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
            <input type="number" required placeholder="المبلغ USDT" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 cursor-pointer overflow-hidden relative">
            {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="text-center"><Camera className="mx-auto text-gray-300 mb-2" /><p className="text-[9px] text-gray-400">ارفق صورة إثبات الحساب (إجباري)</p></div>}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          <button type="submit" disabled={isSubmitting || !selectedImage} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Gavel size={20} />}
            {isSubmitting ? 'جاري الحفظ...' : 'إرسال الشكوى وبدء المحادثة'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RecoveryForm;
