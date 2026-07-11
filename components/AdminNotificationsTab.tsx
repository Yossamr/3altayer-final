import { useLanguage } from "../services/LanguageContext";
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { triggerPushNotification } from '../services/db';
import { Role } from '../types';
import { Send, Users, Truck, UserCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
export const AdminNotificationsTab: React.FC = () => {
  const {
    t
  } = useLanguage();
  const {
    users
  } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'CUSTOMERS' | 'DRIVERS' | 'SPECIFIC'>('ALL');
  const [specificUserId, setSpecificUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error(t("ar_all_1245"));
      return;
    }
    setIsSending(true);
    try {
      let targetUsers: typeof users = [];
      if (targetType === 'ALL') {
        targetUsers = users;
      } else if (targetType === 'CUSTOMERS') {
        targetUsers = users.filter(u => (u.role as string) === Role.CUSTOMER || (u.role as string) === 'customer');
      } else if (targetType === 'DRIVERS') {
        targetUsers = users.filter(u => (u.role as string) === Role.DRIVER || (u.role as string) === 'agent' || (u.role as string) === 'driver');
      } else if (targetType === 'SPECIFIC') {
        const u = users.find(u => u.id === specificUserId);
        if (u) targetUsers = [u];else {
          toast.error(t("ar_all_1246"));
          setIsSending(false);
          return;
        }
      }

      // In a real app, you'd have a backend endpoint to bulk send.
      // For now, since triggerPushNotification takes targetUserId, we loop.
      // Since this is just a quick internal implementation, it works for limited users.
      const batchSize = 50;
      for (let i = 0; i < targetUsers.length; i += batchSize) {
        const batch = targetUsers.slice(i, i + batchSize);
        const promises = batch.map(user => triggerPushNotification(user.id, title, body, {
          type: 'ADMIN_ANNOUNCEMENT'
        }));
        await Promise.all(promises);
      }
      toast.success(`Notification sent to ${targetUsers.length} users successfully!`);
      setTitle('');
      setBody('');
    } catch (e) {
      console.error(e);
      toast.error(t("ar_all_1247"));
    } finally {
      setIsSending(false);
    }
  };
  return <div className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <Send className="text-primary" />{t("ar_all_1248")}</h3>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold mb-2">{t("ar_all_1249")}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button onClick={() => setTargetType('ALL')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'ALL' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            <Users size={24} />
                            <span className="font-bold text-sm">{t("ar_all_1027")}</span>
                        </button>
                        <button onClick={() => setTargetType('CUSTOMERS')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'CUSTOMERS' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            <UserCheck size={24} />
                            <span className="font-bold text-sm">{t("ar_all_1250")}</span>
                        </button>
                        <button onClick={() => setTargetType('DRIVERS')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'DRIVERS' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            <Truck size={24} />
                            <span className="font-bold text-sm">{t("ar_all_1251")}</span>
                        </button>
                        <button onClick={() => setTargetType('SPECIFIC')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'SPECIFIC' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                            <AlertTriangle size={24} />
                            <span className="font-bold text-sm">{t("ar_all_1252")}</span>
                        </button>
                    </div>
                </div>

                {targetType === 'SPECIFIC' && <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-bold mb-2">{t("ar_all_1253")}</label>
                        <select value={specificUserId} onChange={e => setSpecificUserId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <option value="">{t("ar_all_1254")}</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.phone}) - {((u.role as string) === Role.DRIVER || (u.role as string) === 'agent' || (u.role as string) === 'driver') ? t("ar_all_1255") : t("ar_all_1256")}</option>)}
                        </select>
                    </div>}

                <div>
                    <label className="block text-sm font-bold mb-2">{t("ar_all_1257")}</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("ar_all_1258")} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold" />
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2">{t("ar_all_1259")}</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t("ar_all_1260")} rows={4} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none font-medium"></textarea>
                </div>

                <button onClick={handleSend} disabled={isSending || targetType === 'SPECIFIC' && !specificUserId} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                    {isSending ? t("ar_all_1135") : <>
                            <Send size={20} />{t("ar_all_1261")}</>}
                </button>
            </div>
        </div>;
};