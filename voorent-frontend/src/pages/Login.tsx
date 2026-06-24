import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../services/api';
import api from '../services/api';

type Step = 'phone' | 'otp' | 'profile';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address'); return;
    }
    setLoading(true); setError('');
    try {
      await sendOtp(phone, email.trim() || undefined);
      setStep('otp');
      startResendTimer();
    } catch {
      setError('Failed to send OTP — please try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await verifyOtp(phone, code);
      localStorage.setItem('token', res.data.token);
      if (res.data.isNewUser) {
        setStep('profile');
      } else {
        navigate('/');
      }
    } catch {
      setError('Incorrect OTP — try again.');
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    setLoading(true); setError('');
    try {
      await api.put('/users/profile', { name: name.trim(), email: email.trim() });
      navigate('/');
    } catch {
      setError('Could not save profile — please try again.');
    } finally { setLoading(false); }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((t) => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  const handleOtpInput = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[index] = digit; setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      {/* Top bar */}
      <header className="bg-white border-b border-[#E0E0E0]" style={{ height: 64 }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center h-full">
          <button onClick={() => navigate('/')} className="text-2xl font-bold" style={{ color: '#2D6A4F' }}>
            Voorent
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* LEFT — hero image desktop only */}
        <div className="hidden lg:block flex-1 relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&auto=format&fit=crop"
            alt="Furnished living room"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(27,67,50,0.85) 0%,rgba(27,67,50,0.4) 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-center px-16">
            <h2 className="text-5xl font-bold text-white leading-tight mb-4">Rent it now,<br/>own it later</h2>
            <p className="text-white/80 text-lg mb-8">Premium furniture & appliances with flexible monthly payments.</p>
            {[
              { icon: '🏠', text: 'Own after 24 monthly payments' },
              { icon: '🚚', text: 'Free doorstep delivery' },
              { icon: '🔒', text: 'Razorpay-secured checkout' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-white/90 mb-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="w-full lg:w-[480px] flex items-center justify-center px-8 py-12 bg-white">
          <div className="w-full max-w-sm">

            {/* ── STEP 1: Phone ── */}
            {step === 'phone' && (
              <>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Welcome to Voorent</h1>
                <p className="text-[#555] mb-8">Enter your mobile number to continue</p>

                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Mobile Number</label>
                <div className="flex items-center border-2 rounded-xl overflow-hidden mb-2 focus-within:border-[#2D6A4F] transition-colors"
                  style={{ borderColor: error ? '#D62828' : '#E0E0E0' }}>
                  <span className="px-4 text-sm font-semibold text-[#555] border-r border-[#E0E0E0] py-4 bg-[#F9F9F9]">+91</span>
                  <input
                    type="tel" inputMode="numeric" maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    className="flex-1 px-4 py-4 text-sm outline-none bg-transparent"
                  />
                </div>
                {error && !email.trim() && <p className="text-xs text-[#D62828] mb-2">{error}</p>}

                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2 mt-4">
                  Email Address <span className="text-[#D62828]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  className="w-full px-4 py-4 border-2 rounded-xl text-sm outline-none focus:border-[#2D6A4F] transition-colors mb-2"
                  style={{ borderColor: error && email.trim() ? '#D62828' : '#E0E0E0' }}
                />
                {error && <p className="text-xs text-[#D62828] mb-2">{error}</p>}

                <button onClick={handleSendOtp} disabled={loading}
                  className="w-full py-4 rounded-xl font-bold text-white text-base mt-4 disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ background: '#2D6A4F' }}>
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>

                <div className="flex justify-center gap-8 mt-8 pt-8 border-t border-[#F0F0F0]">
                  {[{ icon: '🔒', label: 'Secure' }, { icon: '✅', label: 'Verified' }, { icon: '🏠', label: 'Rent-to-Own' }].map((b) => (
                    <div key={b.label} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: '#F0F7F4' }}>{b.icon}</div>
                      <span className="text-xs font-semibold text-[#555]">{b.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center mt-6 text-[#999]">By continuing, you agree to our Terms & Privacy Policy</p>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'otp' && (
              <>
                <button onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); }}
                  className="flex items-center gap-1 text-sm mb-6 font-semibold" style={{ color: '#2D6A4F' }}>
                  ← Back
                </button>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Enter OTP</h1>
                <p className="text-[#555] mb-8">We sent a 6-digit code to +91-XXXXXX{phone.slice(-4)}{email.trim() ? ` and ${email.trim()}` : ''}</p>

                <div className="flex gap-3 justify-center mb-4">
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => { otpRefs.current[i] = el; }}
                      type="tel" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpInput(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: error ? '#D62828' : '#E0E0E0' }}
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-[#D62828] text-center mb-3">{error}</p>}

                <button onClick={handleVerifyOtp} disabled={loading || otp.join('').length !== 6}
                  className="w-full py-4 rounded-xl font-bold text-white text-base mt-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ background: '#2D6A4F' }}>
                  {loading ? 'Verifying…' : 'Verify & Continue →'}
                </button>

                <div className="flex justify-end mt-5">
                  <button onClick={() => { if (resendTimer === 0) handleSendOtp(); }} disabled={resendTimer > 0}
                    className="text-sm font-semibold"
                    style={{ color: resendTimer > 0 ? '#999' : '#2D6A4F' }}>
                    {resendTimer > 0 ? `Resend in 0:${String(resendTimer).padStart(2, '0')}` : 'Resend OTP'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Profile (new users only) ── */}
            {step === 'profile' && (
              <>
                {/* Progress dots */}
                <div className="flex items-center gap-2 mb-8">
                  {['Phone', 'OTP', 'Profile'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: i === 2 ? '#2D6A4F' : '#D1FAE5', color: i === 2 ? '#fff' : '#2D6A4F' }}>
                          {i < 2 ? '✓' : '3'}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: i === 2 ? '#2D6A4F' : '#999' }}>{s}</span>
                      </div>
                      {i < 2 && <div className="w-6 h-px bg-[#E0E0E0]" />}
                    </div>
                  ))}
                </div>

                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Almost done!</h1>
                <p className="text-[#555] mb-8">Tell us your name and email to complete your account.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Full Name <span className="text-[#D62828]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prasoon Sharma"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                      className="w-full px-4 py-4 border-2 rounded-xl text-sm outline-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: error && !name.trim() ? '#D62828' : '#E0E0E0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Email Address <span className="text-[#999] font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. prasoon@gmail.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                      className="w-full px-4 py-4 border-2 rounded-xl text-sm outline-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: '#E0E0E0' }}
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-[#D62828] mt-3">{error}</p>}

                <button onClick={handleSaveProfile} disabled={loading || !name.trim()}
                  className="w-full py-4 rounded-xl font-bold text-white text-base mt-6 disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ background: '#2D6A4F' }}>
                  {loading ? 'Saving…' : 'Start Exploring →'}
                </button>

                <button onClick={() => navigate('/')}
                  className="w-full text-center text-sm text-[#999] mt-4 hover:text-[#555] transition-colors">
                  Skip for now
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
