import { useLanguage } from "../services/LanguageContext";
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { OrderType } from '../types';
import { Button } from './ui/Button';
import { StatusBadge } from './StatusBadge';
import { CURRENCY } from '../constants';
import { Plus, MapPin, Search, Store, Wallet, ChevronRight, Clock } from 'lucide-react';
export const StoreView: React.FC = () => {
  const {
    t,
    language
  } = useLanguage();
  const isAr = language === 'ar';
  const {
    currentUser,
    orders,
    zones,
    createOrder,
    users
  } = useApp();
  const [view, setView] = useState<'list' | 'create'>('list');

  // Form State
  const [items, setItems] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [selectedZone, setSelectedZone] = useState(zones[0].id);
  const storeOrders = orders.filter(o => o.storeId === currentUser?.id);
  const activeStoreOrders = storeOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const totalRevenue = storeOrders.reduce((acc, curr) => acc + curr.price, 0);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zone = zones.find(z => z.id === selectedZone)!;
    const calculatedPrice = zone.prices?.[OrderType.SHOPPING] ?? zone.price;
    createOrder({
      type: OrderType.SHOPPING,
      storeId: currentUser!.id,
      items,
      pickupAddress: currentUser!.name,
      deliveryAddress: {
        id: `temp-${Date.now()}`,
        title: customerName,
        details: addressDetails,
        zoneId: selectedZone
      },
      price: calculatedPrice
    });
    setView('list');
    setItems('');
    setAddressDetails('');
    setCustomerName('');
  };
  if (view === 'create') {
    return <div className="space-y-6 max-w-2xl mx-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-primary">{t("ar_all_1013")}</h2>
                    <button onClick={() => setView('list')} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-bold border-2 border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("ar_all_1014")}</label>
                            <input required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-primary outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t("ar_all_1015")} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("ar_all_1016")}</label>
                            <textarea required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-primary outline-none" value={items} onChange={e => setItems(e.target.value)} rows={3} placeholder={t("ar_all_1017")} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("ar_all_1018")}</label>
                            <input required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-primary outline-none" value={addressDetails} onChange={e => setAddressDetails(e.target.value)} placeholder={t("ar_all_1019")} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("ar_all_1020")}</label>
                            <div className="relative">
                                <select className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-primary outline-none appearance-none" value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
                                    {[...zones].sort((a,b)=>a.name.localeCompare(b.name, isAr ? 'ar' : 'en')).map(z => <option key={z.id} value={z.id}>{z.name} - {z.price} {CURRENCY}</option>)}
                                </select>
                                <ChevronRight className="absolute left-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400" size={20} />
                            </div>
                        </div>


                        <Button type="submit" fullWidth size="lg" className="mt-4">{t("ar_all_1021")}</Button>
                    </form>
                </div>
            </div>;
  }
  return <div className="space-y-6 pb-20">
             {/* Integrated Search Bar */}
            <div className="-mt-6 relative z-20 px-2 max-w-xl mx-auto">
                <div className="relative shadow-lg rounded-xl">
                    <input className="w-full h-14 pr-12 pl-4 rounded-xl border-none shadow-inner bg-white/95 text-gray-800 placeholder-gray-500 focus:ring-4 focus:ring-orange-100 font-medium outline-none transition-all" placeholder={t("ar_all_1022")} type="text" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <Search className="text-primary" size={24} />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary dark:bg-orange-800 p-5 rounded-3xl text-white relative overflow-hidden chunk-shadow group col-span-2 md:col-span-1">
                    <div className="absolute -right-6 -top-6 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Wallet size={20} />
                            </div>
                            <span className="text-orange-100 text-xs font-bold">{t("ar_all_1000")}</span>
                        </div>
                        <div className="text-3xl font-black mb-1 tracking-tight">{currentUser?.walletBalance.toLocaleString()}</div>
                        <div className="text-orange-100 text-sm font-bold opacity-80">{CURRENCY}</div>
                    </div>
                </div>
                
                {/* Create Order Card CTA */}
                <button onClick={() => setView('create')} className="bg-surface-light dark:bg-surface-dark p-5 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary group transition-all flex flex-col justify-center items-center gap-2 col-span-2 md:col-span-1">
                    <div className="bg-gray-100 dark:bg-gray-800 group-hover:bg-primary group-hover:text-white p-3 rounded-full transition-colors text-gray-400">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-gray-600 dark:text-gray-300 group-hover:text-primary">{t("ar_all_1013")}</span>
                </button>
            </div>

            {/* Active Orders List */}
            <section>
                <div className="flex justify-between items-end mb-4 px-1">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white border-r-4 border-primary pr-3 leading-none">{t("ar_all_1023")}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeStoreOrders.length === 0 ? <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-3xl">
                            <Store size={40} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-400 font-bold">{t("ar_all_1024")}</p>
                        </div> : activeStoreOrders.map((order, idx) => <div key={order.id} className="bg-surface-light dark:bg-surface-dark rounded-3xl p-5 chunk-shadow-lg border-2 border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 bg-yellow-400 text-black text-xs font-bold px-4 py-1.5 rounded-br-2xl shadow-sm z-20">
                                    {order.status.replace(/_/g, ' ')}
                                </div>
                                
                                <div className="flex gap-4 mt-2">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl flex-shrink-0 flex items-center justify-center text-primary bg-orange-50 border border-orange-100">
                                       <Store size={28} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg mb-1 truncate text-gray-800 dark:text-white">{order.deliveryAddress.title}</h3>
                                        <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1 mb-2 line-clamp-1">
                                            <MapPin size={12} />
                                            {order.deliveryAddress.details}
                                        </div>
                                        <div className="text-xs font-bold text-primary bg-orange-50 dark:bg-orange-900/30 inline-block px-2 py-1 rounded-lg">
                                            {order.items}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                             K
                                         </div>
                                         <div className="text-xs">
                                             <div className="font-bold text-gray-800 dark:text-white">{order.driverId ? users.find(u => String(u.id) === String(order.driverId))?.name : t("ar_all_1025")}</div>
                                             <div className="text-gray-400">{t("ar_all_1026")}</div>
                                         </div>
                                     </div>
                                     <div className="font-black text-lg text-gray-800 dark:text-white">{order.price} {CURRENCY}</div>
                                </div>
                            </div>)}
                </div>
            </section>

             {/* Performance Grid for Store */}
            <section className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-800 dark:text-white mb-1">{storeOrders.length}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{t("ar_all_1027")}</span>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-green-500 mb-1">{storeOrders.filter(o => o.status === 'DELIVERED').length}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{t("ar_all_1028")}</span>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl text-center flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-primary mb-1">{totalRevenue}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{t("ar_all_1029")}</span>
                </div>
            </section>
        </div>;
};