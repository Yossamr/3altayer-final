import { useLanguage } from "../services/LanguageContext";
import React, { useState, useMemo } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from './ui/Card';
import { StatusBadge } from './StatusBadge';
import { CURRENCY, ORDER_TYPE_LABELS } from '../constants';
import { Package, Clock, Layers, Search, X } from 'lucide-react';
import { OrderDetailsModal } from './OrderDetailsModal';
import { Order, Role, OrderStatus } from '../types';
export const OrdersView: React.FC = () => {
  const {
    t,
    isAr
  } = useLanguage();
  const {
    currentUser,
    orders,
    calculateDistance
  } = useApp();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const myOrders = useMemo(() => orders.filter(o => {
    if ([Role.ADMIN, Role.EMPLOYEE].includes(currentUser?.role as Role)) return o.customerId === currentUser?.id;
    if (currentUser?.role === Role.CUSTOMER) return o.customerId === currentUser.id;
    if (currentUser?.role === Role.DRIVER) {
      // If assigned to me specifically
      if (o.driverId === currentUser.id) return true;
      // If pending and I'm in the top 3 targeted drivers (OR it's an old manual order without targeting)
      if (o.status === OrderStatus.PENDING) {
        if (!o.assignedDriverIds || o.assignedDriverIds.length === 0 || o.assignedDriverIds.includes(currentUser.id)) return true;
      }
    }
    return false;
  }).sort((a, b) => b.createdAt - a.createdAt), [orders, currentUser]);
  const activeOrders = useMemo(() => myOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'RETURNED'), [myOrders]);
  const historyOrders = useMemo(() => myOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'RETURNED'), [myOrders]);
  const displayOrders = useMemo(() => {
    let list = tab === 'active' ? activeOrders : historyOrders;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(o => o.id && o.id.toLowerCase().includes(query) || o.items && o.items.toLowerCase().includes(query) || o.deliveryAddress?.title && o.deliveryAddress.title.toLowerCase().includes(query) || o.deliveryAddress?.details && o.deliveryAddress.details.toLowerCase().includes(query) || ORDER_TYPE_LABELS[o.type] && ORDER_TYPE_LABELS[o.type].toLowerCase().includes(query) || o.price && o.price.toString().includes(query) || o.notes && o.notes.toLowerCase().includes(query));
    }
    return list;
  }, [tab, activeOrders, historyOrders, searchQuery]);
  return <div className="space-y-6">
       {/* Full Details Modal */}
       {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} userRole={currentUser!.role} />}

       <h2 className="text-2xl font-black text-gray-800 dark:text-white">
         {([Role.ADMIN, Role.EMPLOYEE].includes(currentUser?.role as Role))
           ? (isAr ? 'طلباتي' : 'My Orders')
           : t("ar_all_1084")}
       </h2>
       
       {/* Search Bar */}
       <div className="relative">
           <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
           <input type="text" placeholder={t("ar_all_1085")} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pr-10 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 dark:text-white transition-all shadow-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                   <X size={18} />
               </button>}
       </div>

       <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex max-w-md">
           <button onClick={() => setTab('active')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'active' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_all_1086")}{activeOrders.length})
           </button>
           <button onClick={() => setTab('history')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === 'history' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}>{t("ar_all_1087")}{historyOrders.length})
           </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {displayOrders.length === 0 ? <div className="col-span-full text-center py-12 opacity-50">
                   <Package size={48} className="mx-auto mb-2 text-gray-300" />
                   <p className="font-bold text-gray-400">{t("ar_all_1088")}</p>
               </div> : displayOrders.map(order => <Card key={order.id} onClick={() => setSelectedOrder(order)} // Click to view details
      className="relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                       <div className="absolute top-0 right-0 bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                          {ORDER_TYPE_LABELS[order.type] || order.type}
                       </div>

                       {/* Targeted Priority Badge */}
                       {currentUser?.role === Role.DRIVER && order.status === OrderStatus.PENDING && order.assignedDriverIds?.[0] === currentUser.id && <div className="absolute top-0 left-0 bg-primary text-white text-[9px] font-black px-3 py-1 rounded-br-xl shadow-sm z-10 flex items-center gap-1 animate-pulse">
                               <Search size={10} />{t("ar_all_1089")}</div>}

                       {/* Order Batching suggestion logic */}
                       {currentUser?.role === Role.DRIVER && order.status === OrderStatus.PENDING && order.assignedDriverIds?.[0] !== currentUser.id && orders.some(other => other.id !== order.id && other.status === OrderStatus.PENDING && calculateDistance(order.deliveryAddress.lat!, order.deliveryAddress.lng!, other.deliveryAddress.lat!, other.deliveryAddress.lng!) < 1) && <div className="absolute top-0 left-0 bg-green-500 text-white text-[9px] font-black px-3 py-1 rounded-br-xl shadow-sm z-10 flex items-center gap-1">
                               <Layers size={10} />{t("ar_all_1090")}</div>}
                       <div className="flex justify-between items-start mb-3 pt-6">
                           <div className="flex gap-3">
                               <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-primary">
                                   <Package size={24} />
                               </div>
                               <div className="min-w-0">
                                   <div className="font-bold text-gray-800 dark:text-white truncate">{order.items}</div>
                                   <div className="text-xs text-gray-500 flex items-center gap-1">
                                       <Clock size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                                   </div>
                               </div>
                           </div>
                           <StatusBadge status={order.status} />
                       </div>
                       
                       <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                           <div className="text-sm text-gray-500 truncate max-w-[60%]">{order.deliveryAddress.title}</div>
                           <div className="font-black text-lg text-gray-800 dark:text-white">{order.price} {CURRENCY}</div>
                       </div>
                   </Card>)}
       </div>
    </div>;
};