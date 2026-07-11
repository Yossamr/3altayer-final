import React, { useState, useEffect } from 'react';
import { useLanguage } from '../services/LanguageContext';
import { Loader2, Check, X, FileText, Image as ImageIcon } from 'lucide-react';
import { DriverApplication } from '../types';
import toast from 'react-hot-toast';

export const NewDriversTab: React.FC = () => {
  const { isAr } = useLanguage();
  const [apps, setApps] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<number, string>>({});

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/driver-applications');
      const data = await res.json();
      if (data.success) {
        setApps(data.applications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const pwd = passwords[id] || '';
      if (pwd.length < 6) {
        toast.error(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
        return;
      }
    }

    try {
      const res = await fetch(`/api/driver-applications/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password: passwords[id] })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? 'تم بنجاح' : 'Success');
        fetchApps();
      } else {
        toast.error(data.message || 'Error');
      }
    } catch (e) {
      toast.error('Error');
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  const pendingApps = apps.filter(a => a.status === 'pending');
  const processedApps = apps.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-black">{isAr ? 'الطلبات المعلقة' : 'Pending Requests'} ({pendingApps.length})</h3>
      {pendingApps.length === 0 ? (
        <div className="p-8 text-center text-gray-500 font-bold bg-gray-50 dark:bg-gray-800 rounded-2xl">{isAr ? 'لا توجد طلبات معلقة' : 'No pending requests'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingApps.map(app => (
            <div key={app.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-gray-900 dark:text-white text-lg">{app.name}</div>
                  <div className="text-gray-500 font-bold text-sm" dir="ltr">{app.phone}</div>
                </div>
                <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold">
                  {app.vehicleType === 'motorcycle' ? (isAr ? 'موتوسيكل' : 'Motorcycle') : (isAr ? 'عجلة' : 'Bicycle')}
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">{isAr ? 'العنوان:' : 'Address:'}</span> {app.address}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedImage(app.idCardFront)} className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 px-3 py-2 rounded-xl dark:bg-blue-950/20 dark:text-blue-400">
                  <ImageIcon size={14} /> {isAr ? 'وجه البطاقة 💳' : 'ID Front 💳'}
                </button>
                <button onClick={() => setSelectedImage(app.idCardBack)} className="flex items-center gap-1 text-xs font-bold text-teal-500 bg-teal-50 px-3 py-2 rounded-xl dark:bg-teal-950/20 dark:text-teal-400">
                  <ImageIcon size={14} /> {isAr ? 'ظهر البطاقة 💳' : 'ID Back 💳'}
                </button>
                {app.licenseImage && (
                  <button onClick={() => setSelectedImage(app.licenseImage!)} className="flex items-center gap-1 text-xs font-bold text-purple-500 bg-purple-50 px-3 py-2 rounded-xl dark:bg-purple-950/20 dark:text-purple-400">
                    <FileText size={14} /> {isAr ? 'صورة الرخصة 📄' : 'License 📄'}
                  </button>
                )}
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder={isAr ? 'كلمة المرور المؤقتة (6 أحرف على الأقل)' : 'Temporary Password (min 6 chars)'}
                  value={passwords[app.id] || ''}
                  onChange={(e) => setPasswords(prev => ({ ...prev, [app.id]: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-2 text-sm bg-gray-50 dark:bg-gray-700/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-2"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(app.id, 'reject')} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl flex justify-center items-center gap-1 transition-colors">
                  <X size={16} /> {isAr ? 'رفض' : 'Reject'}
                </button>
                <button onClick={() => handleAction(app.id, 'approve')} className="flex-1 py-2 bg-green-50 text-green-600 hover:bg-green-100 font-bold rounded-xl flex justify-center items-center gap-1 transition-colors">
                  <Check size={16} /> {isAr ? 'قبول' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {processedApps.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-black mb-4">{isAr ? 'الطلبات السابقة' : 'Past Requests'} ({processedApps.length})</h3>
          <div className="space-y-3">
            {processedApps.map(app => (
              <div key={app.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex justify-between items-center opacity-75">
                <div>
                  <div className="font-bold">{app.name} - <span dir="ltr">{app.phone}</span></div>
                  <div className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-lg ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {app.status === 'approved' ? (isAr ? 'مقبول' : 'Approved') : (isAr ? 'مرفوض' : 'Rejected')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-white/20"><X size={24} /></button>
        </div>
      )}
    </div>
  );
};
