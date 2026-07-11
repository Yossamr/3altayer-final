import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, ShoppingBag, MapPin, Users, Star, ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../services/LanguageContext';

interface OnboardingWizardProps {
  onClose: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose }) => {
  const { isAr } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: isAr ? 'مرحباً بك في ع الطاير! 🚀' : 'Welcome to Aa-Tayar! 🚀',
      description: isAr 
        ? 'أسرع وأسهل طريقة لإنجاز مشاويرك، توصيل طلباتك، وشراء أي حاجة محتاجها وإنت في مكانك.'
        : 'The fastest and easiest way to get your errands done, deliver packages, and buy anything you need.',
      icon: <Star className="w-16 h-16 text-orange-500" />,
      color: 'from-orange-400 to-amber-500'
    },
    {
      title: isAr ? '1. اطلب مشوارك 📝' : '1. Request a Ride/Delivery 📝',
      description: isAr
        ? 'اختر الخدمة (طعام، طرد، مشتريات) واكتب طلبك بوضوح. يمكنك حتى تسجيل صوتي لتسهيل الشرح للمندوب!'
        : 'Select the service (food, parcel, shopping) and write your request. You can even record a voice note!',
      icon: <ShoppingBag className="w-16 h-16 text-blue-500" />,
      color: 'from-blue-400 to-indigo-500'
    },
    {
      title: isAr ? '2. اختر السعر والمندوب 🤝' : '2. Choose Price & Driver 🤝',
      description: isAr
        ? 'المناديب القريبين هيقدموا عروض أسعار لتوصيل طلبك. قارن بين أسعارهم وتقييماتهم، واقبل العرض الأنسب لك.'
        : 'Nearby drivers will submit price offers. Compare prices and ratings, and accept the best offer.',
      icon: <Users className="w-16 h-16 text-green-500" />,
      color: 'from-green-400 to-emerald-500'
    },
    {
      title: isAr ? '3. تتبع وتواصل مباشر 📍' : '3. Track & Communicate 📍',
      description: isAr
        ? 'تابع خط سير المندوب على الخريطة مباشرة، وتواصل معاه عن طريق الشات المدمج لحد ما طلبك يوصلك بالسلامة.'
        : 'Track the driver live on the map, and communicate via the built-in chat until your order arrives.',
      icon: <MapPin className="w-16 h-16 text-purple-500" />,
      color: 'from-purple-400 to-pink-500'
    },
    {
      title: isAr ? 'أمان وثقة 🛡️' : 'Safety & Trust 🛡️',
      description: isAr
        ? 'كل مناديبنا مسجلين وموثقين بهوياتهم. تقدر كمان تستخدم كود التأكيد السري لضمان استلام طلبك بأمان تام.'
        : 'All our drivers are verified. You can also use a secret confirmation code to ensure safe delivery.',
      icon: <ShieldCheck className="w-16 h-16 text-teal-500" />,
      color: 'from-teal-400 to-cyan-500'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-white dark:bg-zinc-950 overflow-hidden select-none w-full h-full">
      {/* Decorative premium ambient glowing lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full flex flex-col relative"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 left-6 z-20 p-3 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-zinc-300" />
        </button>

        {/* Top visual section with icon */}
        <div className="relative h-[40vh] min-h-[220px] flex items-center justify-center overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br opacity-10 dark:opacity-25 ${steps[currentStep].color}`} />
          <motion.div 
            key={currentStep}
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 p-8 bg-slate-50/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-slate-100/50 dark:border-zinc-700/50 scale-110 sm:scale-125"
          >
            {steps[currentStep].icon}
          </motion.div>
        </div>

        {/* Bottom content section with title, description, indicators & buttons */}
        <div className="p-8 sm:p-12 flex-1 flex flex-col justify-between text-center max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentStep}
              initial={{ x: isAr ? -30 : 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isAr ? 30 : -30, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex-1 flex flex-col justify-center py-4"
            >
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                {steps[currentStep].title}
              </h2>
              <p className="text-base sm:text-lg font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-auto flex flex-col gap-8 w-full">
            {/* Dots indicator */}
            <div className="flex justify-center gap-2.5">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-10 bg-primary shadow-md shadow-primary/20' : 'w-2.5 bg-slate-100 dark:bg-zinc-800'}`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-4 w-full">
              <button 
                onClick={handlePrev}
                className={`p-4 rounded-2xl font-bold transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95'}`}
              >
                {isAr ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </button>

              <button 
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/25 active:scale-95 transition-all"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    {isAr ? 'ابدأ الآن 🚀' : 'Start Now 🚀'} <Check className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    {isAr ? 'التالي' : 'Next'} {isAr ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
