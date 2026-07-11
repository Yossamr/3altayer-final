import { useLanguage } from "../services/LanguageContext";
import React, { useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { Bell, CheckCircle, Package } from 'lucide-react';
export const NotificationsView: React.FC = () => {
  const {
    t
  } = useLanguage();
  const {
    notificationsList,
    fetchNotifications,
    markNotificationRead
  } = useApp();
  useEffect(() => {
    fetchNotifications();
  }, []);
  const unreadCount = notificationsList.filter(n => !n.isRead).length;
  return <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black flex items-center gap-2">
                    <Bell className="text-primary" />{t("ar_all_1154")}</h2>
                {unreadCount > 0 && <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                        {unreadCount}{t("ar_all_1155")}</span>}
            </div>

            {notificationsList.length === 0 ? <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Bell size={32} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-bold">{t("ar_all_1156")}</p>
                </div> : <div className="space-y-3">
                    {notificationsList.map(notification => <div key={notification.id} className={`p-4 rounded-2xl border-2 transition-all ${notification.isRead ? 'bg-white dark:bg-gray-800 border-transparent shadow-sm opacity-70' : 'bg-primary/5 border-primary/20 shadow-md'}`} onClick={() => {
        if (!notification.isRead) {
          markNotificationRead(notification.id);
        }
      }}>
                            <div className="flex gap-4">
                                <div className="shrink-0 mt-1">
                                    {notification.type === 'ORDER' ? <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <Package size={20} />
                                        </div> : <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <Bell size={20} />
                                        </div>}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{notification.title}</h4>
                                        <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                            {new Date(notification.createdAt).toLocaleTimeString('ar-EG', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {notification.body}
                                    </p>
                                </div>
                            </div>
                        </div>)}
                </div>}
        </div>;
};