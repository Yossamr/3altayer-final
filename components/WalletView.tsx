import { useLanguage } from "../services/LanguageContext";
import React from 'react';
import { useApp } from '../services/AppContext';
import { Card } from './ui/Card';
import { CURRENCY } from '../constants';
import { Wallet, CreditCard, History } from 'lucide-react';

export const WalletView: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, orders } = useApp();
  
  const transactions = orders
    .filter(o => 
      (currentUser?.role === 'DRIVER' && o.driverId === currentUser.id && o.status === 'DELIVERED') || 
      (currentUser?.role === 'CUSTOMER' && o.customerId === currentUser.id)
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t("ar_all_1000") || "المحفظة"}</h2>
        <button className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
            <History className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="bg-gradient-to-br from-secondary to-blue-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
         <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5"></div>
         <div className="relative z-10">
             <div className="flex items-center gap-2 mb-4 opacity-80">
                 <Wallet size={20} />
                 <span className="text-sm font-bold">{t("ar_all_1001") || "الرصيد الحالي"}</span>
             </div>
             <div className="text-4xl font-black mb-2 tracking-tight">
                 {currentUser?.walletBalance || 0} <span className="text-lg font-medium opacity-80">{CURRENCY}</span>
             </div>
             <div className="mt-4 text-xs font-medium text-white/90 bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm inline-block">
                جميع المدفوعات تتم نقدًا عند الاستلام
             </div>
         </div>
      </div>

      <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">{t("ar_all_1007") || "المعاملات الأخيرة"}</h3>
          <div className="space-y-3">
              {transactions.length > 0 ? transactions.map(t => (
                  <Card key={t.id} className="flex justify-between items-center py-3 px-4">
                      <div className="flex items-center gap-3">
                          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl">
                              <CreditCard size={20} className="text-gray-500" />
                          </div>
                          <div>
                              <div className="font-bold text-sm text-gray-800 dark:text-white">{t.items}</div>
                              <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</div>
                          </div>
                      </div>
                      <div className={`font-bold ${currentUser?.role === 'CUSTOMER' ? 'text-red-500' : 'text-green-500'}`}>
                          {currentUser?.role === 'CUSTOMER' ? '-' : '+'}{t.price} {CURRENCY}
                      </div>
                  </Card>
              )) : (
                  <div className="text-center py-8 text-gray-400">{t("ar_all_1008") || "لا توجد معاملات"}</div>
              )}
          </div>
      </div>
    </div>
  );
};
