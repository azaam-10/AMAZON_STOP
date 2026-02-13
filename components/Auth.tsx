
import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';
import { ShieldCheck, Mail, Lock, User, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        // إنشاء ملف الشخصي في جدول profiles
        if (data.user) {
          const customerCode = Math.floor(100000 + Math.random() * 900000).toString();
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, full_name: fullName, customer_code: customerCode }]);
          if (profileError) throw profileError;
        }
        alert('تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني (إذا تم تفعيل التأكيد).');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F7F9]">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#9B4A4E] to-[#7C4A50] rounded-3xl flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="text-white" size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-800">
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h2>
          <p className="text-gray-400 text-xs mt-2 font-medium">Amazon Recovery Pro | نظام الشكاوي</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="الاسم الكامل"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-4 text-sm focus:ring-2 focus:ring-[#9B4A4E] outline-none transition-all text-right"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-4 text-sm focus:ring-2 focus:ring-[#9B4A4E] outline-none transition-all text-right"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              placeholder="كلمة المرور"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-12 py-4 text-sm focus:ring-2 focus:ring-[#9B4A4E] outline-none transition-all text-right"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#9B4A4E]/20 hover:bg-[#7C4A50] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'إنشاء الحساب' : 'دخول النظام')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-[#9B4A4E] hover:underline"
          >
            {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ اشترك الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
