
import React, { useState, useRef, useEffect } from 'react';
import { Gavel, Send, Headphones, ChevronRight, MoreVertical, CheckCheck, Loader2, MessageSquareText, Camera, Image as ImageIcon, X, Maximize2, Paperclip } from 'lucide-react';
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

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          
          const { data: dbMsgs, error: msgErr } = await supabase
            .from('complaint_messages')
            .select('*')
            .eq('complaint_id', complaint.id)
            .order('created_at', { ascending: true });

          if (dbMsgs && dbMsgs.length > 0) {
            setMessages(dbMsgs.map(m => ({
              id: m.id,
              text: m.text,
              imageUrl: m.image_url,
              sender: m.sender,
              time: formatTime(m.created_at)
            })));
          } else {
            // fallback: إذا لم تكن هناك رسائل في الجدول، نعرض بيانات الطلب من جدول الشكاوي
            setMessages([
              {
                id: 0,
                imageUrl: complaint.screenshot_url,
                sender: 'user',
                time: formatTime(complaint.created_at)
              },
              {
                id: 1,
                text: `📋 تفاصيل الطلب:\nالرابط: ${complaint.platform_link}\nالمهمة: #${complaint.mission_id}\nالمبلغ: ${complaint.amount} USDT`,
                sender: 'user',
                time: formatTime(complaint.created_at)
              }
            ]);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  useEffect(() => {
    if (isChatActive) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
      const fileName = `${user?.id}/${Date.now()}.jpg`;
      
      // الرفع لمخزن chat_images
      const { error: upErr } = await supabase.storage
        .from('chat_images')
        .upload(fileName, file, { upsert: true });

      if (upErr) throw new Error("فشل الرفع: " + upErr.message);

      const { data: { publicUrl } } = supabase.storage.from('chat_images').getPublicUrl(fileName);

      // حفظ في جدول الرسائل
      const { data: msgData, error: dbErr } = await supabase.from('complaint_messages').insert([{
        complaint_id: currentComplaintId,
        user_id: user?.id,
        image_url: publicUrl,
        sender: 'user'
      }]).select().single();

      if (dbErr) throw new Error("فشل الحفظ في القاعدة: " + dbErr.message);

      if (msgData) {
        setMessages(prev => [...prev, {
          id: msgData.id,
          imageUrl: publicUrl,
          sender: 'user',
          time: formatTime(msgData.created_at)
        }]);
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ غير متوقع عند رفع الصورة");
    } finally {
      setIsChatUploading(false);
      if (chatImageRef.current) chatImageRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return alert("يرجى إرفاق الصورة أولاً");
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `initial/${user?.id}-${Date.now()}.jpg`;
      
      // رفع الصورة الأساسية
      const { error: upErr } = await supabase.storage.from('complaints').upload(fileName, selectedImage);
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from('complaints').getPublicUrl(fileName);

      // إنشاء الشكوى
      const { data: comp, error: compErr } = await supabase.from('complaints').insert([{
        user_id: user?.id,
        platform_link: formData.link,
        mission_id: formData.missionId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        screenshot_url: publicUrl
      }]).select().single();

      if (compErr) throw compErr;

      // تحويل بيانات الشكوى لرسائل في جدول الدردشة فوراً لضمان ظهورها
      const reportText = `📋 *تفاصيل الطلب:*\nالرابط: ${formData.link}\nالمهمة: #${formData.missionId}\nالمبلغ: ${formData.amount} USDT\nالسبب: ${formData.reason}`;
      
      const { data: msgs, error: msgsErr } = await supabase.from('complaint_messages').insert([
        { complaint_id: comp.id, user_id: user?.id, image_url: publicUrl, sender: 'user' },
        { complaint_id: comp.id, user_id: user?.id, text: reportText, sender: 'user' }
      ]).select();

      if (msgsErr) throw msgsErr;

      setCurrentComplaintId(comp.id);
      setHasExistingComplaint(true);
      if (msgs) {
        setMessages(msgs.map(m => ({
          id: m.id,
          text: m.text,
          imageUrl: m.image_url,
          sender: m.sender,
          time: formatTime(m.created_at)
        })));
      }
      setIsChatActive(true);
    } catch (err: any) {
      alert("فشل تقديم الطلب: " + (err.message || "خطأ مجهول"));
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
          time: formatTime(msgData.created_at)
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="bg-white rounded-3xl p-12 shadow-xl flex items-center justify-center">
      <Loader2 className="animate-spin text-[#9B4A4E]" />
    </div>
  );

  if (isChatActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)} className="p-1"><ChevronRight size={28} /></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/20">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Naser" className="w-full h-full object-cover" />
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
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    className="w-full max-h-64 object-cover cursor-pointer" 
                    onClick={() => window.open(msg.imageUrl, '_blank')} 
                    onError={(e) => { e.currentTarget.src = "https://placehold.co/400x300?text=الصورة+غير+متوفرة"; }}
                  />
                )}
                {msg.text && <div className="p-3 text-xs text-right whitespace-pre-wrap leading-relaxed">{msg.text}</div>}
                <div className={`px-3 pb-1 flex items-center gap-1 text-[8px] opacity-60 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={10} />}
                </div>
              </div>
            </div>
          ))}
          {isChatUploading && (
            <div className="self-end bg-white/50 border border-gray-100 p-2 rounded-xl flex items-center gap-2">
              <Loader2 className="animate-spin text-[#9B4A4E]" size={12} />
              <span className="text-[9px] text-[#9B4A4E] font-bold">جاري إرسال الصورة...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 pb-8 border-t flex items-center gap-3">
          <button onClick={() => chatImageRef.current?.click()} className="p-2 text-gray-400 hover:text-[#9B4A4E]">
            <ImageIcon size={22} />
          </button>
          <input type="file" ref={chatImageRef} className="hidden" accept="image/*" onChange={handleSendChatImage} />
          <div className="flex-1">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب هنا..."
              className="w-full bg-gray-50 rounded-full px-4 py-2.5 text-xs text-right border border-gray-100 outline-none focus:ring-1 focus:ring-[#9B4A4E]/20"
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
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <MessageSquareText size={36} className="text-green-600" />
          </div>
          <h3 className="font-bold text-gray-800">طلبك مسجل ونحن بانتظارك</h3>
          <p className="text-[11px] text-gray-500 mt-2 mb-6 px-4">
            لقد تم توثيق الطلب. يمكنك الآن متابعة المحادثة مع الوكيل "ناصر" وإرسال المزيد من الصور التوضيحية.
          </p>
          <button onClick={() => setIsChatActive(true)} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform">
            <Paperclip size={20} /> عرض المحادثة والمرفقات
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-gray-400 block pr-2">رابط المنصة</label>
             <input type="text" required placeholder="أدخل رابط الموقع" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-gray-400 block pr-2">رقم المهمة</label>
               <input type="text" required placeholder="#" value={formData.missionId} onChange={e => setFormData({...formData, missionId: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-gray-400 block pr-2">المبلغ (USDT)</label>
               <input type="number" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs text-right border border-gray-100" />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-gray-400 block pr-2">إثبات الحساب (لقطة شاشة)</label>
             <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 cursor-pointer overflow-hidden relative group">
               {imagePreview ? (
                 <img src={imagePreview} className="w-full h-full object-cover" />
               ) : (
                 <div className="text-center group-hover:scale-110 transition-transform">
                   <Camera className="mx-auto text-gray-300 mb-2" />
                   <p className="text-[9px] text-gray-400 font-bold">اضغط هنا لرفع الصورة</p>
                 </div>
               )}
             </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          <button type="submit" disabled={isSubmitting || !selectedImage} className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Gavel size={20} />}
            {isSubmitting ? 'جاري الإرسال...' : 'بدء معالجة الشكوى'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RecoveryForm;
