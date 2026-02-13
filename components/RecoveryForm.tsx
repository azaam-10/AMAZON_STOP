
import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Gavel, Send, Headphones, ChevronRight, MoreVertical, CheckCheck, Loader2, MessageSquareText, Clock, Camera, Image as ImageIcon, X, Maximize2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          
          const time = new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const restoredMessages: Message[] = [];
          
          // 1. إضافة صورة الإثبات كرسالة أولى
          if (complaint.screenshot_url) {
            restoredMessages.push({
              id: Date.now() - 100,
              imageUrl: complaint.screenshot_url,
              sender: 'user',
              time: time
            });
          }

          // 2. إضافة نص البلاغ
          const reportText = `
🏛️ *بلاغ رسمي: استرداد رصيد* 🏛️

👤 **العميل:** ${profile?.full_name || '------'}
🔢 **المهمة:** #${complaint.mission_id || '00'}
💰 **المبلغ:** ${complaint.amount || '0.00'} USDT
⚠️ **السبب:** ${complaint.reason}
          `.trim();

          restoredMessages.push({
            id: complaint.id,
            text: reportText,
            sender: 'user',
            time: time
          });

          // 3. إضافة رد الدعم
          restoredMessages.push({
            id: Date.now(),
            text: `مرحباً بك مجدداً سيد/ة ${profile?.full_name || ''}. ملفك المرفق قيد المراجعة الفنية الآن من قبل الوكيل "ناصر". الرقم المرجعي: #${complaint.id}.`,
            sender: 'support',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          setMessages(restoredMessages);
        }
      } catch (err) {
        console.error("Error checking status:", err);
      } finally {
        setLoading(false);
      }
    }
    checkExistingStatus();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      alert("يرجى إرفاق صورة لإثبات الحساب أو لقطة شاشة للمهمة المتعثرة.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // 1. رفع الصورة
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('complaints')
        .upload(fileName, selectedImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('complaints')
        .getPublicUrl(fileName);

      // 2. حفظ البيانات
      const { data, error } = await supabase.from('complaints').insert([{
        user_id: user.id,
        platform_link: formData.link,
        mission_id: formData.missionId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        screenshot_url: publicUrl
      }]).select().single();

      if (error) throw error;

      setHasExistingComplaint(true);
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // بناء قائمة الرسائل الجديدة مع الصورة
      const newMessages: Message[] = [
        {
          id: Date.now() - 50,
          imageUrl: publicUrl,
          sender: 'user',
          time: time
        },
        {
          id: data.id,
          text: `تم تقديم بلاغ استرداد بقيمة ${formData.amount} USDT للمهمة #${formData.missionId}.`,
          sender: 'user',
          time: time
        }
      ];

      setMessages(newMessages);
      setIsChatActive(true);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: `تم استلام الصورة والبيانات بنجاح. الوكيل "ناصر" متصل الآن ويقوم بمراجعة المرفقات الخاصة بك.`,
          sender: 'support',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 2000);

    } catch (err: any) {
      alert("خطأ أثناء الإرسال: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#9B4A4E] mb-4" size={32} />
        <p className="text-gray-400 text-xs font-bold">جاري التحقق من حالة الطلبات...</p>
      </div>
    );
  }

  if (isChatActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)} className="p-1 active:scale-90 transition-transform">
            <ChevronRight size={28} />
          </button>
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/30 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Naser" alt="Support" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#9B4A4E] rounded-full"></div>
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-base font-bold">مركز فض النزاعات المباشر</h2>
            <p className="text-[10px] opacity-80">متصل الآن | الوكيل: ناصر</p>
          </div>
          <button className="p-1 opacity-60">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="bg-yellow-50 border-b border-yellow-100 p-2 text-center text-[10px] text-yellow-800 font-bold">
          ⚠️ يتم مراجعة الصورة المرفقة حالياً للتأكد من صحة المهمة.
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col bg-[#F4F7F9]">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`max-w-[85%] relative ${
                msg.sender === 'user' ? 'self-end' : 'self-start'
              }`}
            >
              <div 
                className={`rounded-2xl shadow-sm overflow-hidden ${
                  msg.sender === 'user' 
                    ? 'bg-[#9B4A4E] text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                }`}
              >
                {/* عرض الصورة إذا كانت موجودة */}
                {msg.imageUrl && (
                  <div className="relative group cursor-pointer">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attached Screenshot" 
                      className="w-full max-h-60 object-cover border-b border-white/10"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Maximize2 size={24} className="text-white" />
                    </div>
                  </div>
                )}

                {/* عرض النص إذا كان موجوداً */}
                {msg.text && (
                  <div className="p-3 text-sm leading-relaxed text-right whitespace-pre-wrap">
                    {msg.text}
                  </div>
                )}

                <div className={`flex items-center gap-1 p-1 px-3 text-[9px] opacity-70 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={12} className="text-blue-300" />}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Footer */}
        <div className="bg-white p-4 pb-8 border-t border-gray-100 flex items-center gap-3">
          <button className="p-2 text-gray-400">
            <ImageIcon size={24} />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب استفسارك للوكيل..."
              className="w-full bg-gray-100 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-[#9B4A4E] text-right"
              dir="rtl"
            />
          </div>
          <button 
            onClick={handleSendMessage}
            className="bg-[#9B4A4E] text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform"
          >
            <Send size={20} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  if (hasExistingComplaint) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#9B4A4E]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 relative">
            <MessageSquareText size={40} className="text-green-600" />
            <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full animate-pulse"></div>
          </div>
          <h3 className="text-lg font-black text-gray-800 mb-2">طلبك قيد المعالجة</h3>
          <p className="text-xs text-gray-500 mb-6 px-4 leading-relaxed">
            لقد قمت بإرفاق إثبات الحساب مسبقاً. يمكنك الدخول للمحادثة لمتابعة عملية فك تجميد الرصيد مع الوكيل المختص.
          </p>
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
               <Clock className="mx-auto text-[#9B4A4E] mb-1" size={16} />
               <span className="text-[10px] text-gray-400 block">حالة الطلب</span>
               <span className="text-[11px] font-bold text-gray-700">مراجعة الصور</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
               <ImageIcon className="mx-auto text-[#9B4A4E] mb-1" size={16} />
               <span className="text-[10px] text-gray-400 block">المرفقات</span>
               <span className="text-[11px] font-bold text-gray-700">تم الرفع</span>
            </div>
          </div>
          <button 
            onClick={() => setIsChatActive(true)}
            className="w-full bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#9B4A4E]/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <Headphones size={20} />
            دخول المحادثة والمتابعة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block text-right">رابط المنصة محل الشكوى</label>
          <input 
            type="text" 
            required
            value={formData.link}
            onChange={(e) => setFormData({...formData, link: e.target.value})}
            placeholder="مثال: https://amazon-task-vip.com" 
            dir="ltr"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B4A4E] transition-all text-right"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block text-right">رقم المهمة</label>
            <input 
              type="text" 
              required
              value={formData.missionId}
              onChange={(e) => setFormData({...formData, missionId: e.target.value})}
              placeholder="مثال: 17" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B4A4E] transition-all text-right"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block text-right">المبلغ المحتجز</label>
            <input 
              type="number" 
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="0.00 USDT" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B4A4E] transition-all text-right"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block text-right">صورة إثبات الحساب / المهمة (إجباري)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
              imagePreview ? 'border-[#9B4A4E] bg-gray-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Camera size={32} className="mb-2" />
                <p className="text-[10px] font-bold">اضغط هنا لإرفاق لقطة الشاشة</p>
                <p className="text-[8px] mt-1">يجب أن تظهر المهمة المتعثرة بوضوح</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block text-right">سبب الشكوى</label>
          <select 
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B4A4E] transition-all text-right"
          >
            <option>تجميد الرصيد</option>
            <option>طلب إيداع إضافي تعجيزي</option>
            <option>خلل في النظام</option>
            <option>أخرى</option>
          </select>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !selectedImage}
          className="w-full bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] text-white font-bold py-4 rounded-2xl shadow-[#9B4A4E]/20 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:grayscale disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Gavel size={20} />}
          {isSubmitting ? 'جاري رفع الملفات...' : 'إرسال شكوى رسمية ومتابعة الوكيل'}
        </button>
      </form>
    </div>
  );
};

export default RecoveryForm;
