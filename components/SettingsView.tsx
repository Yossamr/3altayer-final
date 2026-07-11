import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { useLanguage } from '../services/LanguageContext';
import { Button } from './ui/Button';
import { Bell, Moon, Volume2, Shield, AlertTriangle, ArrowRight, X, Loader2, CheckCircle, Globe, HelpCircle } from 'lucide-react';
interface SettingsProps {
  onBack: () => void;
}
export const SettingsView: React.FC<SettingsProps> = ({
  onBack
}) => {
  const {
    changePassword,
    currentUser,
    deleteAccount,
    logout
  } = useApp();
  const {
    language,
    setLanguage,
    t,
    isAr
  } = useLanguage();

  // Settings States (Persisted in localStorage)
  const [notifications, setNotifications] = useState(() => localStorage.getItem('notifications') !== 'false');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sounds, setSounds] = useState(() => localStorage.getItem('sounds') !== 'false');

  // Modal States
  const [activeModal, setActiveModal] = useState<'PASSWORD' | 'REPORT' | 'DELETE_ACCOUNT' | null>(null);

  // Password Form State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');

  // Report Form State
  const [issueText, setIssueText] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    // Dark Mode Logic
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  useEffect(() => {
    localStorage.setItem('notifications', String(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem('sounds', String(sounds));
  }, [sounds]);
  const toggleSounds = () => {
    setSounds(!sounds);
    if (!sounds) {
      // Play test beep
      const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed", e));
    }
  };
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg('');
    const result = await changePassword(oldPass, newPass);
    setPassLoading(false);
    setPassMsg(result.message || (result.success ? t('updatePasswordSuccess') : "Error"));
    if (result.success) {
      setTimeout(() => {
        setActiveModal(null);
        setOldPass('');
        setNewPass('');
        setPassMsg('');
      }, 1500);
    }
  };
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportLoading(true);
    // Simulate API call
    setTimeout(() => {
      setReportLoading(false);
      toast.error(t('reportSentSuccess'));
      setActiveModal(null);
      setIssueText('');
    }, 1000);
  };
  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
           <ArrowRight size={20} className="rtl:rotate-180" />
        </button>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t('settingsTitle')}</h2>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-2 shadow-bold border-2 border-gray-100 dark:border-gray-700">
          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600"><Bell size={20} /></div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{t('notifications')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600"><Moon size={20} /></div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{t('darkMode')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
          </div>

          {/* Sounds Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600"><Volume2 size={20} /></div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{t('sounds')}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={sounds} onChange={toggleSounds} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
          </div>

          {/* Language Selection Toggle */}
          <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-650"><Globe size={20} /></div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{t('language')}</span>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                  <button type="button" onClick={() => setLanguage('ar')} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${language === 'ar' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-850 dark:hover:text-gray-300'}`}>
                      {t('arabic')}
                  </button>
                  <button type="button" onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${language === 'en' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-850 dark:hover:text-gray-300'}`}>
                      {t('english')}
                  </button>
              </div>
          </div>
      </div>

      <div className="space-y-3">
          <button onClick={() => setActiveModal('REPORT')} className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
              <AlertTriangle size={20} />
              <span>{t('reportIssue')}</span>
          </button>
          
          <button onClick={() => setActiveModal('PASSWORD')} className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex items-center gap-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Shield size={20} />
              <span>{t('changePassword')}</span>
          </button>
          
          <button onClick={() => {
        if (currentUser) {
          localStorage.removeItem(`hide_how_it_works_${currentUser.id}`);
          toast.success(isAr ? t("ar_all_1039") : 'Reset successful. Guide will show on Home.');
        }
      }} className="w-full bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 flex items-center gap-3 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
              <HelpCircle size={20} />
              <span>{t('resetGuide')}</span>
          </button>
      </div>

      
          <button onClick={() => setActiveModal('DELETE_ACCOUNT')} className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
              <AlertTriangle size={20} />
              <span>{isAr ? "حذف الحساب" : "Delete Account"}</span>
          </button>
  
      {/* --- PASSWORD MODAL --- */}
      {activeModal === 'PASSWORD' && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <button onClick={() => setActiveModal(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white mb-4 text-center">{t('changePassword')}</h3>
                  
                  <form onSubmit={handleSubmitPassword} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">{t('currentPassword')}</label>
                          <input type="password" required value={oldPass} onChange={e => setOldPass(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-primary outline-none dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">{t('newPassword')}</label>
                          <input type="password" required value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-primary outline-none dark:text-white" />
                      </div>

                      {passMsg && <div className={`text-xs font-bold text-center p-2 rounded-lg ${passMsg.includes(t("ar_all_1040")) || passMsg.includes('success') ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                              {passMsg}
                          </div>}

                      <Button fullWidth disabled={passLoading} type="submit">
                          {passLoading ? <Loader2 className="animate-spin" /> : t('saveChanges')}
                      </Button>
                  </form>
              </div>
          </div>}

      
      {/* --- DELETE ACCOUNT MODAL --- */}
      {activeModal === 'DELETE_ACCOUNT' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <button onClick={() => setActiveModal(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
                  <div className="flex flex-col items-center mb-4">
                      <div className="bg-red-100 p-3 rounded-full text-red-500 mb-2">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white text-center">
                          {isAr ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
                      </h3>
                  </div>
                  <p className="text-sm text-gray-500 text-center mb-6">
                      {isAr ? "هل أنت متأكد من رغبتك في حذف الحساب؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح كافة بياناتك." : "Are you sure you want to delete your account? This action cannot be undone and all your data will be wiped."}
                  </p>
                  <div className="flex gap-3">
                      <Button fullWidth variant="secondary" onClick={() => setActiveModal(null)}>
                          {isAr ? "إلغاء" : "Cancel"}
                      </Button>
                      <Button fullWidth variant="danger" onClick={async () => {
                          await deleteAccount();
                      }}>
                          {isAr ? "حذف" : "Delete"}
                      </Button>
                  </div>
              </div>
          </div>
      )}
  
      {/* --- REPORT PROBLEM MODAL --- */}
      {activeModal === 'REPORT' && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
                  <button onClick={() => setActiveModal(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
                  <div className="flex flex-col items-center mb-4">
                      <div className="bg-red-100 p-3 rounded-full text-red-500 mb-2">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-800 dark:text-white">{t('reportIssue')}</h3>
                  </div>
                  
                  <form onSubmit={handleSubmitReport} className="space-y-4">
                      <p className="text-sm text-gray-500 text-center">{t('describeIssue')}</p>
                      <textarea required rows={4} value={issueText} onChange={e => setIssueText(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-primary outline-none dark:text-white resize-none" placeholder={t('writeHere')} />
                      
                      <Button fullWidth disabled={reportLoading} variant="danger" type="submit">
                          {reportLoading ? <Loader2 className="animate-spin" /> : t('sendReport')}
                      </Button>
                  </form>
              </div>
          </div>}
    </div>;
};