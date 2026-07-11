import { useLanguage } from "../services/LanguageContext";
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Order, OrderStatus, Role } from '../types';
import { MessageCircle, Clock, MapPin, User, ChevronLeft } from 'lucide-react';
import { ChatModal } from './ChatModal';
export const ChatsListView: React.FC = () => {
  const {
    t
  } = useLanguage();
  const {
    orders,
    currentUser,
    users
  } = useApp();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter active orders relevant to the current user
  const activeChats = orders.filter(o => {
    let isRelevant = false;
    if (currentUser?.role === 'CUSTOMER') {
      isRelevant = o.customerId === currentUser.id;
    } else if (currentUser?.role === 'DRIVER') {
      isRelevant = o.driverId === currentUser.id;
    } else if ([Role.ADMIN, Role.EMPLOYEE].includes(currentUser?.role as Role)) {
      isRelevant = true; // Admin sees all active chats
    }
    const isActive = o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.RETURNED;
    return isRelevant && isActive;
  }).sort((a, b) => b.createdAt - a.createdAt);
  return <div className="space-y-6 pb-20">
            {selectedOrder && <ChatModal order={orders.find(o => o.id === selectedOrder.id) || selectedOrder} onClose={() => setSelectedOrder(null)} />}

            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t("ar_all_1233")}</h2>
                    <p className="text-sm text-gray-500 font-bold">{t("ar_all_1234")}</p>
                </div>
            </div>

            {activeChats.length === 0 ? <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <MessageCircle size={48} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 font-bold">{t("ar_all_1235")}</p>
                    <p className="text-xs text-gray-400 mt-1">{t("ar_all_1236")}</p>
                </div> : <div className="space-y-3">
                    {activeChats.map(order => {
        let chatTitle = '';
        if (currentUser?.role === 'CUSTOMER') {
          const driverName = users.find(u => String(u.id) === String(order.driverId))?.name;
          chatTitle = driverName ? `Captain: ${driverName}` : `Order #${order.id.slice(-4)} (Waiting for Captain)`;
        } else {
          const customerName = users.find(u => String(u.id) === String(order.customerId))?.name || t("ar_all_1110");
          chatTitle = `Customer: ${customerName}`;
        }
        return <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 dark:text-white">{chatTitle}</h3>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 rounded-md text-gray-500 font-mono">#{order.id.slice(-4)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{order.items}</p>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                            <MapPin size={10} /> {order.deliveryAddress.title}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                                    <ChevronLeft size={20} className="rtl:rotate-180" />
                                </div>
                            </div>;
      })}
                </div>}
        </div>;
};