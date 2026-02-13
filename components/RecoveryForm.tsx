
import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Gavel, Send, Headphones, ChevronRight, MoreVertical, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'support';
  time: string;
}

const RecoveryForm: React.FC = () => {
  const [isChatActive, setIsChatActive] = useState(false);
  const [loading, setLoading] = useState(true); // نجعله true في البداية لفحص الحالة
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    link: '',
    missionId: '',
    amount: '',
    reason: 'تجميد الرصيد'
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // فحص الحالة عند التحميل
  useEffect(() => {
    async function checkExistingStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // جلب الملف الشخصي
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

        // جلب آخر شكوى مقدمة
        const { data: complaint, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (complaint) {
          // بناء الرسالة الأولى من بيانات قاعدة البيانات
          const restoredMessage = `
🏛️ *بلاغ رسمي: طلب استرداد رصيد* 🏛️

👤 **كود العميل:** ${profile?.customer_code || '------'}
🌐 **رابط المنصة:** ${complaint.platform_link || 'غير محدد'}
🔢 **رقم المهمة:** #${complaint.mission_id || '00'}
💰 **المبلغ المحتجز:** ${complaint.amount || '0.00'} USDT
⚠️ **سبب الشكوى:** ${complaint.reason}

--------------------------
لقد تم تقديم هذا البلاغ سابقاً. جاري المتابعة من قبل قسم الشؤون القانونية والتقنية.
          `.trim();

          setMessages([
            {
              id: complaint.id,
              text: restoredMessage,
              sender: 'user',
              time: new Date(complaint.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            {
              id: Date.now(),
              text: `مرحباً بك مجدداً سيد/ة ${profile?.full_name || ''}. شكواك قيد المعالجة حالياً تحت الرقم المرجعي #${complaint.id}. يرجى عدم تكرار الطلب لتجنب التأخير. وكيلك الحالي هو "ناصر".`,
              sender: 'support',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setIsChatActive(true);
        }
      } catch (err) {
        console.error("Error checking status:", err);
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
    if (isChatActive) {
      scrollToBottom();
    }
  }, [messages, isChatActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      // 1. حفظ الشكوى في قاعدة البيانات
      const { data, error } = await supabase.from('complaints').insert([{
        user_id: user.id,
        platform_link: formData.link,
        mission_id: formData.missionId,
        amount: parseFloat(formData.amount),
        reason: formData.reason
      }]).select().single();

      if (error) throw error;

      // 2. تفعيل واجهة الدردشة
      const initialMessage = `
🏛️ *بلاغ رسمي: طلب استرداد رصيد* 🏛️

👤 **كود العميل:** ${userProfile?.customer_code || '------'}
🌐 **رابط المنصة:** ${formData.link || 'غير محدد'}
🔢 **رقم المهمة:** #${formData.missionId || '00'}
💰 **المبلغ المحتجز:** ${formData.amount || '0.00'} USDT
⚠️ **سبب الشكوى:** ${formData.reason}

--------------------------
لقد قمت بتقديم هذا البلاغ رسمياً لمكتب فض النزاعات. أطلب التدخل الفوري لإيقاف المهمة برمجياً وفك تجميد الرصيد وإعادته للمحفظة.
    `.trim();

      const newMsg: Message = {
        id: data.id,
        text: initialMessage,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([newMsg]);
      setIsChatActive(true);

      setTimeout(() => {
        const supportReply: Message = {
          id: Date.now() + 1,
          text: `تم استلام بلاغك بنجاح. رقم المعاملة: #${data.id}. جاري الآن فك تشفير المهمة ${formData.missionId} لاستعادة الرصيد.`,
          sender: 'support',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, supportReply]);
      }, 2000);

    } catch (err: any) {
      alert("خطأ أثناء إرسال الشكوى: " + err.message);
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
      <div className="fixed inset-0 z-[100] bg-[#F4F7F9] flex flex-col max-w-[430px] mx-auto">
        <div className="bg-[#9B4A4E] text-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-lg">
          <button onClick={() => setIsChatActive(false)} className="p-1">
            <ChevronRight size={28} />
          </button>
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
              <Headphones size={24} />
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#9B4A4E] rounded-full"></div>
          </div>
          <div className="flex-1 text-right">
            <h2 className="text-base font-bold">مركز فض النزاعات المباشر</h2>
            <p className="text-[10px] opacity-80">متصل الآن | وكيل المعالجة: ناصر</p>
          </div>
          <button className="p-1 opacity-60">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="bg-yellow-50 border-b border-yellow-100 p-2 text-center text-[10px] text-yellow-800 font-bold">
          ⚠️ يتم معالجة طلبك السابق بنجاح. لا يمكنك تقديم طلب جديد حالياً.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col bg-[#F4F7F9]">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`max-w-[85%] relative ${
                msg.sender === 'user' 
                  ? 'self-end' 
                  : 'self-start'
              }`}
            >
              <div 
                className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#9B4A4E] text-white rounded-tr-none text-right' 
                    : 'bg-white text-gray-800 rounded-tl-none text-right border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className={`flex items-center gap-1 mt-1 text-[9px] opacity-70 ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck size={12} className="text-blue-300" />}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 pb-8 border-t border-gray-100 flex items-center gap-3">
          <button className="p-2 text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتب رسالتك..."
              className="w-full bg-gray-100 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-[#9B4A4E] text-right"
              dir="rtl"
            />
          </div>
          <button 
            onClick={handleSendMessage}
            className="bg-[#9B4A4E] text-white p-3 rounded-full shadow-lg shadow-[#9B4A4E]/30 active:scale-90 transition-transform"
          >
            <Send size={20} className="rotate-180" />
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
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#9B4A4E] to-[#7C4A50] text-white font-bold py-4 rounded-2xl shadow-[#9B4A4E]/20 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Gavel size={20} />}
          {isSubmitting ? 'جاري إرسال البلاغ...' : 'إرسال شكوى رسمية وإيقاف المهمة'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1 text-[#9B4A4E]"><ShieldAlert size={14} /> قانوني 100%</span>
          <span className="flex items-center gap-1 text-[#9B4A4E]"><ShieldAlert size={14} /> إيقاف فوري</span>
          <span className="flex items-center gap-1 text-[#9B4A4E]"><ShieldAlert size={14} /> حماية الخصوصية</span>
        </div>
      </div>
    </div>
  );
};

export default RecoveryForm;
