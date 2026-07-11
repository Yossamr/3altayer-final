import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { useApp } from '../services/AppContext';
import { useLanguage } from '../services/LanguageContext';
import { Button } from './ui/Button';
import { Mail, Lock, Phone, User, MapPin, Eye, EyeOff, Check, ChevronRight, Globe, ArrowRight, Loader2, CheckSquare, Apple, Sparkles, Shield, Zap, TrendingUp, Star, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { firebaseAuth, googleProvider, appleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
const sanitizePhoneInput = (val: string) => {
  let cleanVal = val.replace(/[٠-٩]/g, d => '0123456789'["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
  return cleanVal.replace(/\D/g, '');
};
const SwipeButton = ({
  onSwipe,
  isLoading,
  label,
  isAr
}: {
  onSwipe: () => void;
  isLoading: boolean;
  label: string;
  isAr: boolean;
}) => {
  const { t } = useLanguage();
  const [isSwiped, setIsSwiped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const x = useMotionValue(0);

  // Map x to opacity of text and background color of the track
  const textOpacity = useTransform(x, [0, 100], [1, 0.1]);
  const handleDragEnd = async (event: any, info: any) => {
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const threshold = containerWidth - 80;
    if (!isAr && info.offset.x > threshold || isAr && info.offset.x < -threshold) {
      setIsSwiped(true);
      controls.start({
        x: isAr ? -threshold : threshold
      });
      onSwipe();
      setTimeout(() => {
        setIsSwiped(false);
        controls.start({
          x: 0
        });
      }, 2000);
    } else {
      controls.start({
        x: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      });
    }
  };
  return <div ref={containerRef} className="relative w-full h-14 bg-gradient-to-r from-primary to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl overflow-hidden flex items-center shadow-lg shadow-orange-500/25">
            {/* Shimmer background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),rgba(255,255,255,0.15),rgba(255,255,255,0))] bg-[length:200%_100%] animate-[shimmer_2s_infinite] pointer-events-none" />

            {/* The Text */}
            <motion.div style={{
      opacity: textOpacity
    }} className="absolute inset-0 flex items-center justify-center font-black text-white z-0 pointer-events-none text-sm tracking-wide">
                {isLoading ? <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin text-white w-5 h-5" />
                        <span>{isAr ? t("ar_all_1158") : 'Loading...'}</span>
                    </div> : label}
            </motion.div>

            {/* The Draggable Thumb */}
            {!isLoading && <motion.div drag="x" dragConstraints={isAr ? {
      left: -300,
      right: 0
    } : {
      left: 0,
      right: 300
    }} dragElastic={0.05} dragMomentum={false} onDragEnd={handleDragEnd} animate={controls} style={{
      x
    }} whileHover={{
      scale: 1.05
    }} whileTap={{
      scale: 0.95
    }} className={`absolute ${isAr ? 'right-1' : 'left-1'} top-1 bottom-1 w-12 bg-white rounded-xl shadow-lg flex items-center justify-center z-10 cursor-grab active:cursor-grabbing transition-transform`}>
                    <div className="flex -space-x-1 items-center">
                        <ChevronRight className={`text-primary w-4 h-4 opacity-50 ${isAr ? 'rotate-180' : ''}`} />
                        <ChevronRight className={`text-primary w-4 h-4 opacity-75 ${isAr ? 'rotate-180' : ''}`} />
                        <ChevronRight className={`text-primary w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                    </div>
                </motion.div>}
        </div>;
};
const LoginScreen: React.FC = () => {
  const {
    login,
    loginWithGoogle,
    linkGoogleAccount,
    completeGoogleRegistration,
    register,
    zones
  } = useApp();
  const {
    language,
    dir,
    t,
    setLanguage
  } = useLanguage();
  const isAr = language === 'ar';
  const [isRegister, setIsRegister] = useState(false);
  const [isDriverRegistration, setIsDriverRegistration] = useState(false);
  const [driverRegForm, setDriverRegForm] = useState({ name: '', phone: '', address: '', vehicleType: 'motorcycle', idCardFront: '', idCardBack: '', licenseImage: '' });
  const [isDriverSubmitting, setIsDriverSubmitting] = useState(false);

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRegForm.name || !driverRegForm.phone || !driverRegForm.address || !driverRegForm.idCardFront || !driverRegForm.idCardBack) {
      setError(isAr ? 'يرجى ملء جميع الحقول المطلوبة وصور البطاقة (الوجه والخلف).' : 'Please fill all required fields and ID card images (front & back).');
      return;
    }
    if (driverRegForm.vehicleType === 'motorcycle' && !driverRegForm.licenseImage) {
      setError(isAr ? 'صورة الرخصة مطلوبة للموتوسيكل.' : 'License image is required for motorcycle.');
      return;
    }
    try {
      setIsDriverSubmitting(true);
      setError('');
      const res = await fetch('/api/driver-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverRegForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? 'تم إرسال طلبك بنجاح للفرز.' : 'Application sent successfully.');
        setIsDriverRegistration(false);
        setDriverRegForm({ name: '', phone: '', address: '', vehicleType: 'motorcycle', idCardFront: '', idCardBack: '', licenseImage: '' });
      } else {
        setError(data.message);
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred');
    } finally {
      setIsDriverSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCardFront' | 'idCardBack' | 'licenseImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverRegForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };


  // Login State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regZoneId, setRegZoneId] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const selectedZoneObj = zones.find(z => z.id === regZoneId);
  const isComingSoon = !!(selectedZoneObj && selectedZoneObj.status === 'coming_soon');

  // Google Sign-In Complete/Link State
  const [step, setStep] = useState<'login' | 'complete-google' | 'link-google'>('login');
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleZoneId, setGoogleZoneId] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Active feature slider for Left Pane
  const [activeFeature, setActiveFeature] = useState(0);
  const features = [{
    icon: <Zap className="w-8 h-8 text-orange-500" />,
    title: isAr ? t("ar_all_1159") : 'Fastest Delivery in Damanhour',
    desc: isAr ? t("ar_all_1160") : 'Smart dispatching system and professional drivers at your service 24/7 to deliver in minutes.'
  }, {
    icon: <MapPin className="w-8 h-8 text-cyan-500" />,
    title: isAr ? t("ar_all_1161") : 'Real-time Live Tracking',
    desc: isAr ? t("ar_all_1162") : 'Watch your captain step by step from the moment they start until they reach your doorstep.'
  }, {
    icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
    title: isAr ? t("ar_all_1163") : 'Complete Delivery Shield',
    desc: isAr ? t("ar_all_1164") : 'Advanced security protocols and instant verification codes to ensure your packages are delivered safely.'
  }];
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);
  const handleLoginSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await login(phoneNumber, password, rememberMe);
      if (!result.success) {
        setError(result.message || t("ar_all_1165"));
      }
    } catch (e) {
      setError(t("ar_all_1166"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await signInWithPopup(firebaseAuth, appleProvider);
      const idToken = await result.user.getIdToken();
      const loginRes = await loginWithGoogle(idToken); // we can reuse the same endpoint for OAuth verification
      
      if (loginRes.needsPhone) {
        setGoogleIdToken(idToken);
        setGoogleEmail(loginRes.email || '');
        setGooglePhone(loginRes.phone || '');
        setStep('link-google');
      } else if (loginRes.needsPhone) {
        setGoogleIdToken(idToken);
        setGoogleEmail(loginRes.email || '');
        setStep('complete-google');
      } else if (loginRes.success) {
        toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isAr ? 'فشل تسجيل الدخول بواسطة آبل' : 'Apple sign in failed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      const loginRes = await loginWithGoogle(idToken);
      if (!loginRes.success) {
        setError(loginRes.message || t("ar_all_1167"));
      } else if (loginRes.needsLinking) {
        setGoogleIdToken(idToken);
        setGoogleEmail(loginRes.email || '');
        setGooglePhone(loginRes.phone || '');
        setStep('link-google');
      } else if (loginRes.needsPhone) {
        setGoogleIdToken(idToken);
        setRegName(loginRes.name || '');
        setGoogleEmail(loginRes.email || '');
        setStep('complete-google');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError(t("ar_all_1168"));
      } else {
        setError(err.message || t("ar_all_1169"));
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleDemoLogin = (role: 'ADMIN' | 'DRIVER' | 'CUSTOMER' | 'EMPLOYEE') => {
    let ph = '';
    let pw = '';
    if (role === 'ADMIN') {
      ph = '00000000000';
      pw = '5276';
    } else if (role === 'EMPLOYEE') {
      ph = '02222222222';
      pw = '1234';
    } else if (role === 'DRIVER') {
      ph = '01111111111';
      pw = '1234';
    } else if (role === 'CUSTOMER') {
      ph = '01222222222';
      pw = '1234';
    }
    setPhoneNumber(ph);
    setPassword(pw);
    setTimeout(handleLoginSubmit, 100);
  };
  const handleRegister = async () => {
    setError('');

    const selectedZoneObj = zones.find(z => z.id === regZoneId);
    const isComingSoon = selectedZoneObj && selectedZoneObj.status === 'coming_soon';

    if (isComingSoon) {
      if (!regName.trim() || !regPhone.trim()) {
        setError(isAr ? "يرجى كتابة الاسم ورقم الهاتف بالكامل." : "Please fill in your name and phone number.");
        return;
      }
      setIsLoading(true);
      try {
        const { registerZoneWaitlistInDB } = await import("../services/db");
        const res = await registerZoneWaitlistInDB(regZoneId, regPhone, regEmail, regName);
        if (res.success) {
          toast.success(isAr 
            ? "تم تسجيل اهتمامك بنجاح! سنقوم بتبليغك فور تفعيل المنطقة. 🎉" 
            : "Successfully registered on the waitlist! We will notify you when active. 🎉", 
            { duration: 8000 }
          );
          // Reset form or switch back to login
          setRegName('');
          setRegPhone('');
          setRegEmail('');
          setRegZoneId('');
          setIsRegister(false);
        } else {
          setError(res.message || (isAr ? "فشل تسجيل الاهتمام." : "Failed to register."));
        }
      } catch (e) {
        setError(isAr ? "حدث خطأ غير متوقع." : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (regPassword.length < 4) {
      setError(t("ar_all_1170"));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError(t("ar_all_1171"));
      return;
    }
    setIsLoading(true);
    try {
      const result = await register(regName, regPhone, regPassword, regAddress, regZoneId);
      if (!result.success) {
        setError(result.message || t("ar_all_1172"));
      }
    } catch (e) {
      setError(t("ar_all_1173"));
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // ----------------------------------------------------
  // STEP: Link Google profile
  // ----------------------------------------------------
  if (step === 'link-google') {
    return (
      <div dir={dir} className="bg-[#FAFBFD] dark:bg-zinc-950 min-h-screen flex items-center justify-center font-body p-4 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl rounded-[2.5rem] p-8 relative border border-slate-100 dark:border-zinc-800">
          <button onClick={() => setStep('login')} className="absolute top-8 left-8 p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-full text-slate-400 hover:text-primary dark:hover:text-primary hover:scale-105 active:scale-95 transition-all">
            <ArrowRight size={18} className="rotate-180" />
          </button>
          
          <div className="mb-8 mt-4">
            <div className="inline-flex p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-500 mb-3">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-zinc-100 mb-2 tracking-tight">
              {isAr ? "تأكيد الحساب" : "Confirm Account"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              {isAr ? "وجدنا حساباً مسجلاً بهذا البريد الإلكتروني. يرجى إدخال كلمة المرور الخاصة بحسابك للربط مع جوجل." : "We found an existing account with this email. Please enter your password to link it with Google."}
            </p>
          </div>

          <div className="mb-6 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700/50">
             <div className="text-xs text-slate-500 mb-1">{isAr ? "الحساب المرتبط" : "Linked Account"}</div>
             <div className="font-bold text-slate-700 dark:text-zinc-300">{googleEmail}</div>
             <div className="text-sm text-slate-500">{googlePhone}</div>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-2xl font-medium border border-red-100 dark:border-red-500/20 flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>}

          <form onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setIsLoading(true);
            try {
              const result = await linkGoogleAccount(googleIdToken, linkPassword);
              if (!result.success) {
                setError(result.message || "Failed to link account");
              }
            } catch (err) {
              setError("An unexpected error occurred");
            } finally {
              setIsLoading(false);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider px-1">
                {isAr ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative group">
                <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                  <Lock size={18} />
                </div>
                <input required type={showPassword ? "text" : "password"} value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} className={`w-full py-3.5 ${isAr ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'} bg-[#F6F8FA] dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/80 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold text-gray-700 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-all duration-300`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1`}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-6 py-4 rounded-2xl text-base font-black tracking-wide shadow-xl shadow-primary/20 hover:shadow-primary/30 group">
              <span className="flex items-center justify-center gap-2">
                {isAr ? "تأكيد وربط" : "Confirm & Link"}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP: Complete Google profile
  // ----------------------------------------------------
  if (step === 'complete-google') {
    return <div dir={dir} className="bg-[#FAFBFD] dark:bg-zinc-950 min-h-screen flex items-center justify-center font-body p-4 relative overflow-hidden">
             {/* Glowing ambient light balls */}
             <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
             <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

             <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }} className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl rounded-[2.5rem] p-8 relative border border-slate-100 dark:border-zinc-800">
                 <button onClick={() => setStep('login')} className="absolute top-8 left-8 p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-full text-slate-400 hover:text-primary dark:hover:text-primary hover:scale-105 active:scale-95 transition-all">
                     <ArrowRight size={18} className="rotate-180" />
                 </button>
                 
                 <div className="mb-8 mt-4">
                    <div className="inline-flex p-3 bg-orange-50 dark:bg-orange-500/10 rounded-2xl text-primary mb-3">
                       <User size={24} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-zinc-100 mb-1.5">{isAr ? t("ar_all_1174") : 'Complete your Profile'} 👋</h2>
                    <p className="text-slate-400 dark:text-zinc-400 text-xs font-bold">{isAr ? t("ar_all_1175") : 'One last quick step to activate your smart account'}</p>
                 </div>
                 
                 <form onSubmit={async e => {
          e.preventDefault();
          setError('');
          setIsLoading(true);
          try {
            const result = await completeGoogleRegistration(googleIdToken, regName, regPhone, regAddress, googleZoneId);
            if (!result.success) {
              setError(result.message || t("ar_all_1176"));
            }
          } catch (e) {
            setError(t("ar_all_1177"));
          } finally {
            setIsLoading(false);
          }
        }} className="space-y-4">
                     <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider px-1">{t('fullNameLabel')}</label>
                          <div className="relative group">
                              <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                  <User size={18} />
                              </div>
                              <input required value={regName} onChange={e => setRegName(e.target.value)} className={`w-full py-3.5 ${isAr ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10 text-left'} bg-[#F6F8FA] dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/80 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300 text-sm font-bold text-gray-800 dark:text-zinc-100`} placeholder={isAr ? t("ar_all_1178") : 'Full Name'} />
                              {regName.trim().length >= 3 && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                  <Check size={18} strokeWidth={3} />
                                </div>}
                          </div>
                     </div>
                     <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider px-1">{t('phoneLabel')}</label>
                          <div className="relative group">
                              <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                  <Phone size={18} />
                              </div>
                              <input required type="tel" maxLength={11} value={regPhone} onChange={e => setRegPhone(sanitizePhoneInput(e.target.value))} className="w-full py-3.5 pl-12 pr-10 text-left bg-[#F6F8FA] dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/80 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none text-sm font-sans font-bold text-gray-800 dark:text-zinc-100" placeholder="01xxxxxxxxx" dir="ltr" />
                              {regPhone.length === 11 && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                  <Check size={18} strokeWidth={3} />
                                </div>}
                          </div>
                     </div>
                     <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider px-1">{isAr ? t("ar_all_1179") : 'Zone'}</label>
                          <div className="relative group">
                              <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                  <MapPin size={18} />
                              </div>
                              <select required value={googleZoneId} onChange={e => setGoogleZoneId(e.target.value)} className={`w-full py-3.5 ${isAr ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10 text-left'} bg-[#F6F8FA] dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/80 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold text-gray-700 dark:text-zinc-200 appearance-none`}>
                                 <option value="">{isAr ? t("ar_all_1180") : 'Select Zone'}</option>
                                 {[...zones].filter(z => z.status === 'active' && !z.id.startsWith('gov-')).sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                              </select>
                              {googleZoneId && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                  <Check size={18} strokeWidth={3} />
                                </div>}
                          </div>
                     </div>
                     <div>
                          <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider px-1">{t('addressLabel')}</label>
                          <div className="relative group">
                              <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                  <MapPin size={18} />
                              </div>
                              <input required value={regAddress} onChange={e => setRegAddress(e.target.value)} className={`w-full py-3.5 ${isAr ? 'pr-12 pl-10 text-right' : 'pl-12 pr-10 text-left'} bg-[#F6F8FA] dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/80 focus:border-primary focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold text-gray-800 dark:text-zinc-100`} placeholder={isAr ? t("ar_all_1181") : 'Street, building number...'} />
                              {regAddress.trim().length >= 5 && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                  <Check size={18} strokeWidth={3} />
                                </div>}
                          </div>
                     </div>

                     {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-500 text-[11px] font-black p-3.5 rounded-2xl border border-red-100 dark:border-red-500/20 text-center">
                            {error}
                        </div>}

                     <Button fullWidth size="lg" type="submit" disabled={isLoading} className="mt-4 h-13 rounded-2xl shadow-xl bg-primary hover:bg-orange-600 text-white border-none text-sm font-black transition-all">
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : isAr ? t("ar_all_1182") : 'Complete Registration 🚀'}
                     </Button>
                 </form>
             </motion.div>
        </div>;
  }
  return <div dir={dir} className="bg-[#FAFBFD] dark:bg-zinc-950 min-h-screen flex items-center justify-center font-body p-0 sm:p-4 md:p-6 lg:p-8 relative overflow-x-hidden">
      
      {/* ----------------------------------------------------
          MAIN WRAPPER WITH ROUNDED CORNERS (BENTO SPLIT CARD)
          ---------------------------------------------------- */}
      <div className="w-full max-w-6xl bg-white dark:bg-zinc-900 sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-orange-500/5 border-0 sm:border border-slate-100 dark:border-zinc-850 flex flex-col lg:flex-row overflow-hidden min-h-screen sm:min-h-[85vh] lg:min-h-[720px] self-center">
        
        {/* ----------------------------------------------------
            LEFT COLUMN: Elegant Floating Orange Design Card 
            ---------------------------------------------------- */}
        <div className="hidden lg:flex w-[48%] bg-gradient-to-br from-[#FF7E36] to-[#FD5900] m-4 rounded-[2rem] p-10 flex-col justify-between text-white relative overflow-hidden shadow-2xl shadow-orange-500/10 select-none">
            
            {/* Soft decorative elements inside orange card */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Dynamic Micro dots overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

            {/* Header Area inside Orange Card */}
            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <img src="https://lh3.googleusercontent.com/d/1xWGm1mzXPy9y33jFux2Lqz3lJhVRgXUx" alt="AlTayyar Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                    <div>
                        <h1 className="text-lg font-black tracking-wider text-white">
                            {isAr ? t("ar_all_1183") : 'AlTayyar'}
                        </h1>
                        <p className="text-[9px] font-bold tracking-widest uppercase text-orange-100 opacity-90">
                            {isAr ? t("ar_all_1184") : 'Damanhour Smart Logistics Engine'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Slogan and Text area with hand-drawn underline */}
            <div className="relative z-10 my-6">
                <div className="inline-block">
                    <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-snug tracking-tight">
                        {isAr ? <>{t("ar_all_1185")}<br />{t("ar_all_1186")}<span className="relative inline-block">{t("ar_all_1187")}<svg className="absolute left-0 right-0 -bottom-2 w-full h-3 text-white fill-current opacity-90" viewBox="0 0 200 15" preserveAspectRatio="none">
                                  <path d="M5 10 C 50 15, 150 15, 195 5 C 150 12, 50 12, 5 10 Z" fill="currentColor" />
                                </svg>
                              </span>
                            </> : <>
                              Simplify deliveries <br />
                              with <span className="relative inline-block">our dashboard.
                                <svg className="absolute left-0 right-0 -bottom-2 w-full h-3 text-white fill-current opacity-90" viewBox="0 0 200 15" preserveAspectRatio="none">
                                  <path d="M5 10 C 50 15, 150 15, 195 5 C 150 12, 50 12, 5 10 Z" fill="currentColor" />
                                </svg>
                              </span>
                            </>}
                    </h2>
                </div>
                
                <p className="text-sm text-orange-50 font-medium leading-relaxed mt-6 max-w-sm opacity-95">
                    {isAr ? t("ar_all_1188") : 'The fastest delivery and smart dispatching platform in Damanhour, connecting stores and captains in a live map interface.'}
                </p>
            </div>

            {/* LIVE PREVIEW DASHBOARD MOCKUP REMOVED */}
            <div className="relative z-10 flex flex-col items-center w-full">

                {/* Lower features indicators */}
                <div className="flex gap-4 mt-6">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                        <ShieldCheck size={14} className="text-white" />
                        <span>{isAr ? t("ar_all_1189") : 'Secure'}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                        <Zap size={14} className="text-white" />
                        <span>{isAr ? t("ar_all_1190") : 'Real-time'}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                        <Star size={14} className="text-white" />
                        <span>{isAr ? t("ar_all_1191") : '4.9 Rating'}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* ----------------------------------------------------
            RIGHT COLUMN: Pristine, Elegant Form Section (Desktop + Mobile)
            ---------------------------------------------------- */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 md:p-16 relative bg-white dark:bg-zinc-900 min-h-screen sm:min-h-0">
            
            {/* Top Toolbar Area (Language Switcher Only for an ultra-clean layout) */}
            <div className={`flex ${isAr ? 'justify-start' : 'justify-end'} w-full z-10 shrink-0 mb-6 sm:mb-0`}>
                {/* Floating Language Switcher Pill */}
                <button type="button" onClick={() => setLanguage(isAr ? 'en' : 'ar')} className="bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 shadow-sm px-4 py-2 rounded-full flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-200 hover:scale-105 active:scale-95 transition-all">
                    <Globe size={13} className="text-primary" />
                    <span>{isAr ? 'English' : t("ar_all_1192")}</span>
                </button>
            </div>

            {/* Central Form Card content */}
            <div className="w-full max-w-[360px] mx-auto my-auto py-2">
                
                {/* Custom Brand Logo - Centered above Welcome Message with perfect premium standalone branding */}
                <motion.div initial={{
            opacity: 0,
            scale: 0.92
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            duration: 0.4,
            ease: "easeOut"
          }} className="flex flex-col items-center justify-center mb-4 select-none">
                    <img src="https://lh3.googleusercontent.com/d/1xWGm1mzXPy9y33jFux2Lqz3lJhVRgXUx" alt="AlTayyar Logo" className="w-52 h-auto md:w-60 object-contain hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                </motion.div>

                {/* Welcome message Area */}
                <div className="mb-5 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div key={isRegister ? 'reg-header' : 'log-header'} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} exit={{
                opacity: 0,
                y: -10
              }} transition={{
                duration: 0.2
              }}>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                                {isRegister ? isAr ? t("ar_all_1193") : 'Create Account' : isAr ? t("ar_all_1194") : 'Welcome Back'}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 dark:text-zinc-400 mt-1">
                                {isRegister ? isAr ? t("ar_all_1195") : 'Please sign up to create your account' : isAr ? t("ar_all_1196") : 'Please login to your account'}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Form Inputs and Interactive States */}
                <div className="space-y-4">
                    
                    {/* Error Alerts */}
                    <AnimatePresence>
                        {error && <motion.div initial={{
                opacity: 0,
                scale: 0.95
              }} animate={{
                opacity: 1,
                scale: 1
              }} exit={{
                opacity: 0,
                scale: 0.95
              }} className="bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-bold p-3.5 rounded-2xl border border-red-100 dark:border-red-500/20 text-center mb-2">
                                {error}
                            </motion.div>}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {!isRegister ?
              // ----------------------------------------------------
              // Tab 1: LOGIN FORM
              // ----------------------------------------------------
              <motion.div key="login-form" initial={{
                opacity: 0,
                x: isAr ? 15 : -15
              }} animate={{
                opacity: 1,
                x: 0
              }} exit={{
                opacity: 0,
                x: isAr ? -15 : 15
              }} transition={{
                duration: 0.2
              }} className="space-y-4">
                                {/* Phone input field */}
                                <div>
                                    <div className="relative group transition-all duration-300">
                                        <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                            <Phone size={16} />
                                        </div>
                                        <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1057") : 'Phone number'} type="tel" dir="ltr" value={phoneNumber} onChange={e => setPhoneNumber(sanitizePhoneInput(e.target.value))} />
                                        {phoneNumber.length === 11 && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                            <Check size={16} strokeWidth={3} />
                                          </div>}
                                    </div>
                                </div>

                                {/* Password input field */}
                                <div>
                                    <div className="relative group transition-all duration-300">
                                        <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                            <Lock size={16} />
                                        </div>
                                        <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-11 text-right' : 'pl-11 pr-11 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1197") : 'Password'} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200`}>
                                            {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                        {password.length >= 4 && <div className={`absolute ${isAr ? 'left-11' : 'right-11'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                            <Check size={16} strokeWidth={3} />
                                          </div>}
                                    </div>
                                </div>

                                {/* Remember me & Forgot Password */}
                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-200 ${rememberMe ? 'bg-primary border-primary' : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'}`}>
                                            {rememberMe && <Check size={11} strokeWidth={4} className="text-white" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                                        <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-colors">{t('rememberMe')}</span>
                                    </label>
                                    <button type="button" className="text-xs font-bold text-slate-400 hover:text-primary dark:text-zinc-500 dark:hover:text-primary transition-colors hover:underline">
                                        {isAr ? t("ar_all_1198") : 'Forgot password?'}
                                    </button>
                                </div>

                                {/* Solid Brand Orange Button - EXACTLY LIKE screenshot */}
                                <div className="pt-2">
                                    <motion.button type="button" onClick={handleLoginSubmit} disabled={isLoading} whileHover={{
                    scale: 1.01
                  }} whileTap={{
                    scale: 0.99
                  }} className="w-full py-3.5 bg-primary hover:bg-orange-600 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-orange-500/10 flex items-center justify-center gap-2 transition-all">
                                        {isLoading ? <Loader2 className="animate-spin w-4 h-4 text-white" /> : isAr ? t("ar_all_1199") : 'Login'}
                                    </motion.button>
                                </div>
                            </motion.div> :
              // ----------------------------------------------------
              // Tab 2: REGISTER FORM
              // ----------------------------------------------------
              <motion.div key="register-form" initial={{
                opacity: 0,
                x: isAr ? -15 : 15
              }} animate={{
                opacity: 1,
                x: 0
              }} exit={{
                opacity: 0,
                x: isAr ? 15 : -15
              }} transition={{
                duration: 0.2
              }} className="space-y-4">
                                {/* Full Name field */}
                                <div>
                                    <div className="relative group transition-all duration-300">
                                        <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                            <User size={16} />
                                        </div>
                                        <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1200") : 'Full name'} value={regName} onChange={e => setRegName(e.target.value)} />
                                        {regName.trim().length >= 3 && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                            <Check size={16} strokeWidth={3} />
                                          </div>}
                                    </div>
                                </div>

                                {/* Register phone field */}
                                <div>
                                    <div className="relative group transition-all duration-300">
                                        <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                            <Phone size={16} />
                                        </div>
                                        <input className="block w-full py-3.5 pl-11 pr-10 text-left bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-sans font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold" placeholder="01xxxxxxxxx" type="tel" dir="ltr" value={regPhone} onChange={e => setRegPhone(sanitizePhoneInput(e.target.value))} />
                                        {regPhone.length === 11 && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-scale-in">
                                                <Check size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Register Zone selector */}
                                <div>
                                    <div className="relative group transition-all duration-300">
                                        <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                            <MapPin size={16} />
                                        </div>
                                        <select value={regZoneId} onChange={e => setRegZoneId(e.target.value)} className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold appearance-none`}>
                                            <option value="">{isAr ? t("ar_all_1180") : 'Select Zone'}</option>
                                            {[...zones].filter(z => z.status === 'active' && !z.id.startsWith('gov-')).sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                            {[...zones].filter(z => z.status === 'coming_soon' && !z.id.startsWith('gov-')).sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name} ({isAr ? 'قريباً ⏳' : 'Coming Soon ⏳'})</option>)}
                                        </select>
                                        {regZoneId && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                            <Check size={16} strokeWidth={3} />
                                          </div>}
                                    </div>
                                </div>

                                {isComingSoon && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl text-xs font-semibold text-orange-600 dark:text-orange-400 text-center leading-relaxed space-y-1">
                                        <div className="font-bold text-sm">⏳ {isAr ? 'منطقة قريباً' : 'Coming Soon Zone'}</div>
                                        <div>
                                            {isAr 
                                                ? "هذه المنطقة غير مفعلة حالياً وسيتم إطلاقها قريباً! سجل اهتمامك لتصلك رسالة فور تفعيل المنطقة." 
                                                : "This zone is not active yet and will launch soon! Register your interest to get notified as soon as it is activated."}
                                        </div>
                                    </motion.div>
                                )}

                                {isComingSoon && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className="relative group transition-all duration-300">
                                            <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                                <Mail size={16} />
                                            </div>
                                            <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'} value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                                            {regEmail.trim().length >= 5 && regEmail.includes('@') && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                                <Check size={16} strokeWidth={3} />
                                              </div>}
                                        </div>
                                    </motion.div>
                                )}

                                {!isComingSoon && (
                                    <>
                                        {/* Register address details */}
                                        <div>
                                            <div className="relative group transition-all duration-300">
                                                <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1201") : 'Detailed address'} value={regAddress} onChange={e => setRegAddress(e.target.value)} />
                                                {regAddress.trim().length >= 5 && <div className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                                    <Check size={16} strokeWidth={3} />
                                                  </div>}
                                            </div>
                                        </div>

                                        {/* Register Password */}
                                        <div>
                                            <div className="relative group transition-all duration-300">
                                                <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                                    <Lock size={16} />
                                                </div>
                                                <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-11 text-right' : 'pl-11 pr-11 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1202") : 'Password (4 chars)'} type={showPassword ? "text" : "password"} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200`}>
                                                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                {regPassword.length >= 4 && <div className={`absolute ${isAr ? 'left-11' : 'right-11'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                                    <Check size={16} strokeWidth={3} />
                                                  </div>}
                                            </div>
                                        </div>
                                        
                                        {/* Confirm Password */}
                                        <div>
                                            <div className="relative group transition-all duration-300">
                                                <div className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300`}>
                                                    <Lock size={16} />
                                                </div>
                                                <input className={`block w-full py-3.5 ${isAr ? 'pr-11 pl-11 text-right' : 'pl-11 pr-11 text-left'} bg-[#F6F8FA] hover:bg-[#EFF1F4] dark:bg-zinc-800/50 dark:hover:bg-zinc-800 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-sm font-bold text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 placeholder:font-bold`} placeholder={isAr ? t("ar_all_1203") : 'Confirm Password'} type={showPassword ? "text" : "password"} value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200`}>
                                                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                {regPassword.length >= 4 && regPassword === regConfirmPassword && <div className={`absolute ${isAr ? 'left-11' : 'right-11'} top-1/2 -translate-y-1/2 text-emerald-500`}>
                                                    <Check size={16} strokeWidth={3} />
                                                  </div>}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Orange Button */}
                                <div className="pt-2">
                                    <motion.button type="button" onClick={handleRegister} disabled={isLoading} whileHover={{
                     scale: 1.01
                   }} whileTap={{
                     scale: 0.99
                   }} className="w-full py-3.5 bg-primary hover:bg-orange-600 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-orange-500/10 flex items-center justify-center gap-2 transition-all">
                                        {isLoading ? <Loader2 className="animate-spin w-4 h-4 text-white" /> : isComingSoon ? (isAr ? 'سجل اهتمامك ⏳' : 'Register Interest ⏳') : isAr ? t("ar_all_1204") : 'Sign Up'}
                                    </motion.button>
                                </div>
                            </motion.div>}
                    </AnimatePresence>
                </div>

                {/* ----------------------------------------------------
                    Divider and Social Sign-In buttons
                    ---------------------------------------------------- */}
                <div className="mt-4">
                    
                    {/* Centered line divider */}
                    <div className="relative flex items-center mb-4">
                        <div className="flex-grow border-t border-slate-100 dark:border-zinc-800/80"></div>
                        <span className="flex-shrink-0 mx-3 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                            {isAr ? t("ar_all_1205") : 'Or Speed-Login with'}
                        </span>
                        <div className="flex-grow border-t border-slate-100 dark:border-zinc-800/80"></div>
                    </div>
 
                    {/* Google button (highly premium, centered, aligned with Google Brand Guidelines) */}
                    <div className="w-full">
                        <button type="button" onClick={handleGoogleSignIn} className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-zinc-850 rounded-2xl flex items-center justify-center gap-3 px-4 transition-all duration-200 border border-slate-200/80 dark:border-zinc-700/80 active:scale-[0.98] shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] select-none cursor-pointer">
                            {/* Standard colorful Google G icon */}
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                                {isAr ? t("ar_all_1206") : 'Sign in with Google'}
                            </span>
                        </button>

                        {/* Apple button (Required by Apple Review if Google is present) */}
                        <button type="button" onClick={handleAppleSignIn} className="w-full mt-3 py-3.5 bg-black hover:bg-gray-900 text-white rounded-2xl flex items-center justify-center gap-3 px-4 transition-all duration-200 border border-black active:scale-[0.98] shadow-sm select-none cursor-pointer">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16.636 12.122c-.021-2.969 2.422-4.398 2.534-4.469-1.378-2.016-3.518-2.289-4.283-2.316-1.815-.184-3.541 1.068-4.467 1.068-.925 0-2.348-1.042-3.854-1.016-1.956.026-3.76 1.137-4.757 2.868-2.025 3.51-.518 8.706 1.455 11.554.966 1.396 2.106 2.963 3.613 2.909 1.455-.055 2.016-.938 3.774-.938 1.756 0 2.268.938 3.799.911 1.583-.027 2.56-1.439 3.504-2.825 1.096-1.602 1.547-3.155 1.57-3.237-.034-.014-3.033-1.164-3.056-4.249zm-2.585-6.666c.801-.97 1.341-2.318 1.194-3.662-1.157.047-2.553.77-3.376 1.737-.655.77-1.258 2.138-1.088 3.46 1.291.1 2.564-.632 3.27-1.535z" />
                            </svg>
                            <span className="text-sm font-bold tracking-wide">
                                {isAr ? "تسجيل الدخول بواسطة Apple" : 'Sign in with Apple'}
                            </span>
                        </button>

                    </div>
 
                    {/* Redirection / Signup link trigger */}
                    <div className="text-center mt-4">
                        <p className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                            {!isRegister ? <>
                                    {isAr ? t("ar_all_1207") : "Don't have an account? "}
                                    <button onClick={() => setIsRegister(true)} className="text-primary font-bold hover:underline transition-all">
                                        {isAr ? t("ar_all_1208") : 'Signup'}
                                    </button>
                                </> : <>
                                    {isAr ? t("ar_all_1209") : "Already have an account? "}
                                    <button onClick={() => setIsRegister(false)} className="text-primary font-bold hover:underline transition-all">
                                        {isAr ? t("ar_all_1210") : 'Login'}
                                    </button>
                                </>}
                        </p>
                    </div>
                
                    <div className="text-center mt-3">
                        <button onClick={() => setIsDriverRegistration(true)} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl px-4 py-2">
                            {isAr ? 'انضم كطيار 🛵' : 'Join as Driver 🛵'}
                        </button>
                    </div>
</div>
            </div>
 
            {/* Sandbox Quick Dev Triggers - Clean footer capsule */}
            <div className="pt-3 border-t border-slate-100/60 dark:border-zinc-800/60 flex flex-col items-center gap-2 mt-4 sm:mt-0">
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-zinc-500">
                    {isAr ? "التسجيل السريع لتجربة المنصة 🧪" : 'Developer Sandbox: Quick Entry'}
                </span>
                <div className="flex gap-2 justify-center flex-wrap">
                    <button onClick={() => handleDemoLogin('ADMIN')} className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex flex-col items-center">
                       <span>{isAr ? 'المدير 👑' : 'Admin 👑'}</span>
                       <span className="text-[8px] font-normal text-slate-400 mt-0.5">00000000000 (5276)</span>
                    </button>
                    <button onClick={() => handleDemoLogin('EMPLOYEE')} className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex flex-col items-center">
                       <span>{isAr ? 'موظف لوحة التحكم 💼' : 'Employee 💼'}</span>
                       <span className="text-[8px] font-normal text-slate-400 mt-0.5">02222222222 (1234)</span>
                    </button>
                    <button onClick={() => handleDemoLogin('DRIVER')} className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex flex-col items-center">
                       <span>{isAr ? 'طيار/مندوب 🛵' : 'Driver 🛵'}</span>
                       <span className="text-[8px] font-normal text-slate-400 mt-0.5">01111111111 (1234)</span>
                    </button>
                    <button onClick={() => handleDemoLogin('CUSTOMER')} className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-50 hover:bg-primary/10 hover:text-primary border border-slate-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex flex-col items-center">
                       <span>{isAr ? 'عميل/مستفيد 👤' : 'Customer 👤'}</span>
                       <span className="text-[8px] font-normal text-slate-400 mt-0.5">01222222222 (1234)</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Driver Registration Overlay */}
      <AnimatePresence>
          {isDriverRegistration && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl my-8">
                      <h2 className="text-xl font-black mb-4 text-center text-gray-950 dark:text-white">{isAr ? 'انضم لفريق الطيارين' : 'Join the Drivers Team'}</h2>
                      {error && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center border border-red-100">{error}</div>}
                      <form onSubmit={handleDriverSubmit} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                              <input required type="text" value={driverRegForm.name} onChange={e => setDriverRegForm(p => ({...p, name: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm text-gray-950 dark:text-white" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                              <input required type="tel" value={driverRegForm.phone} onChange={e => setDriverRegForm(p => ({...p, phone: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm text-gray-950 dark:text-white" dir="ltr" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'العنوان' : 'Address'}</label>
                              <input required type="text" value={driverRegForm.address} onChange={e => setDriverRegForm(p => ({...p, address: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm text-gray-950 dark:text-white" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'نوع المركبة' : 'Vehicle Type'}</label>
                              <div className="flex gap-2">
                                  <button type="button" onClick={() => setDriverRegForm(p => ({...p, vehicleType: 'motorcycle'}))} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${driverRegForm.vehicleType === 'motorcycle' ? 'border-primary bg-orange-50 dark:bg-orange-950/20 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{isAr ? 'موتوسيكل' : 'Motorcycle'}</button>
                                  <button type="button" onClick={() => setDriverRegForm(p => ({...p, vehicleType: 'bicycle'}))} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${driverRegForm.vehicleType === 'bicycle' ? 'border-primary bg-orange-50 dark:bg-orange-950/20 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{isAr ? 'عجلة' : 'Bicycle'}</button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'صورة وجه البطاقة 💳' : 'ID Card Front 💳'}</label>
                                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'idCardFront')} className="w-full text-[10px] text-gray-500" />
                                  {driverRegForm.idCardFront && <img src={driverRegForm.idCardFront} className="mt-2 h-20 w-full rounded-lg object-cover" />}
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'صورة ظهر البطاقة 💳' : 'ID Card Back 💳'}</label>
                                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'idCardBack')} className="w-full text-[10px] text-gray-500" />
                                  {driverRegForm.idCardBack && <img src={driverRegForm.idCardBack} className="mt-2 h-20 w-full rounded-lg object-cover" />}
                              </div>
                          </div>
                          {driverRegForm.vehicleType === 'motorcycle' && (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{isAr ? 'صورة الرخصة' : 'License Image'}</label>
                              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'licenseImage')} className="w-full text-xs text-gray-500" />
                              {driverRegForm.licenseImage && <img src={driverRegForm.licenseImage} className="mt-2 h-20 rounded-lg object-cover" />}
                          </div>
                          )}
                          <div className="flex gap-2 pt-4">
                              <button type="button" onClick={() => { setIsDriverRegistration(false); setError(''); }} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors">{isAr ? 'إلغاء' : 'Cancel'}</button>
                              <button type="submit" disabled={isDriverSubmitting} className="flex-1 py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors flex justify-center items-center">
                                  {isDriverSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isAr ? 'إرسال الطلب' : 'Submit Application')}
                              </button>
                          </div>
                      </form>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>;
};
export default LoginScreen;