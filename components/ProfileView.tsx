import { useLanguage } from "../services/LanguageContext";
import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { User as UserIcon, Settings, Phone, Shield, Globe, LogOut, MapPin, ChevronLeft, ChevronDown, PhoneCall, MessageCircle, X, Edit3, Save, Loader2, AlertCircle } from 'lucide-react';
import { SUPPORT_PHONES } from '../constants';
import { Role } from '../types';
interface ProfileViewProps {
  onNavigate: (view: string) => void;
}

// --- SHARED: CONTACT ACTION MODAL (Replicated locally) ---
const ContactActionModal: React.FC<{
  phone: string | null;
  onClose: () => void;
}> = ({
  phone,
  onClose
}) => {
  const {
    t
  } = useLanguage();
  if (!phone) return null;
  const handleCall = () => {
    window.open(`tel:${phone}`, '_self');
    onClose();
  };
  const handleWhatsApp = () => {
    const waNumber = `20${phone.replace(/^0+/, '')}`;
    window.open(`https://wa.me/${waNumber}`, '_blank');
    onClose();
  };
  return <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200">
                    <X size={20} className="text-gray-500" />
                </button>
                <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-1">{t("ar_all_1050")}</h3>
                    <p className="text-lg font-bold text-primary">{phone}</p>
                </div>
                <div className="space-y-3">
                    <button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg">
                        <MessageCircle size={24} />{t("ar_all_1051")}</button>
                    <button onClick={handleCall} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg">
                        <PhoneCall size={24} />{t("ar_all_1052")}</button>
                </div>
            </div>
        </div>;
};
export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigate
}) => {
  const {
    t
  } = useLanguage();
  const {
    currentUser,
    logout,
    orders,
    updateProfile
  } = useApp();
  const [showSupport, setShowSupport] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const totalOrders = orders.filter(o => currentUser?.role === 'DRIVER' && o.driverId === currentUser.id && o.status === 'DELIVERED' || currentUser?.role === 'CUSTOMER' && o.customerId === currentUser.id).length;
  const handleSaveProfile = async () => {
    if (!editName) return toast.error(t("ar_all_1053"));
    setIsSaving(true);
    // Pass existing phone (unchanged)
    const success = await updateProfile(editName, currentUser?.phone || '');
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
      toast.success(t("ar_all_1054"));
    } else {
      toast.error(t("ar_all_1055"));
    }
  };
  return <div className="space-y-6">
      <ContactActionModal phone={selectedContact} onClose={() => setSelectedContact(null)} />

      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm border-2 border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-primary to-orange-400 opacity-20"></div>
          
          <div className="relative z-10">
              {/* EDIT BUTTON: ONLY FOR CUSTOMERS */}
              {currentUser?.role === Role.CUSTOMER && <div className="absolute top-0 left-0 p-1">
                      <button onClick={() => setIsEditing(!isEditing)} className="p-2 bg-white/50 dark:bg-black/20 rounded-full hover:bg-white transition-colors text-gray-700 dark:text-gray-200">
                          {isEditing ? <X size={18} /> : <Edit3 size={18} />}
                      </button>
                  </div>}

              <div className="w-20 h-20 rounded-full border-4 border-white mx-auto shadow-lg bg-gray-200 overflow-hidden mb-2">
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <UserIcon size={40} />
                  </div>
              </div>
              
              {isEditing ? <div className="space-y-2 animate-in fade-in max-w-xs mx-auto">
                      <div>
                          <label className="text-[9px] font-bold text-gray-500 block mb-1">{t("ar_all_1056")}</label>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 text-center border rounded-lg bg-white/80 dark:bg-black/20 font-bold text-sm outline-none focus:border-primary" placeholder={t("ar_all_1056")} />
                      </div>
                      <div>
                          <label className="text-[9px] font-bold text-gray-500 block mb-1">{t("ar_all_1057")}</label>
                          <input value={currentUser?.phone} disabled className="w-full p-2 text-center border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold text-sm cursor-not-allowed" dir="ltr" />
                          <p className="text-[9px] text-red-500 mt-1 flex items-center justify-center gap-1">
                              <AlertCircle size={10} />{t("ar_all_1058")}</p>
                      </div>
                      <button onClick={handleSaveProfile} disabled={isSaving} className="bg-green-500 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto shadow-md">
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} />{t("ar_all_1059")}</>}
                      </button>
                  </div> : <>
                      <h2 className="text-xl font-black text-gray-800 dark:text-white">{currentUser?.name}</h2>
                      <p className="text-gray-500 font-bold text-xs mb-3">{currentUser?.phone}</p>
                  </>}
              
              <div className="inline-block px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] uppercase tracking-wider mt-1">
                  {currentUser?.role}
              </div>
          </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3">
          <Card className="text-center py-4 bg-orange-50 border-orange-100">
              <span className="text-2xl font-black text-primary block">{totalOrders}</span>
              <span className="text-xs text-orange-400 font-bold">{t("ar_all_1060")}</span>
          </Card>
      </div>

      {/* Menu */}
      <div className="space-y-3">
          {currentUser?.role === Role.CUSTOMER && <button onClick={() => onNavigate('ADDRESSES')} className="w-full bg-surface-light dark:bg-surface-dark p-3 rounded-xl shadow-sm border-2 border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-primary transition-colors group">
                  <div className="bg-gray-100 p-2 rounded-xl text-gray-600 group-hover:bg-orange-100 group-hover:text-primary transition-colors"><MapPin size={18} /></div>
                  <span className="font-bold flex-1 text-right text-gray-700 dark:text-gray-200 text-sm">{t("ar_all_1061")}</span>
                  <ChevronLeft size={18} className="text-gray-300 rtl:rotate-180" />
              </button>}

          <button onClick={() => onNavigate('SETTINGS')} className="w-full bg-surface-light dark:bg-surface-dark p-3 rounded-xl shadow-sm border-2 border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-primary transition-colors group">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-600 group-hover:bg-orange-100 group-hover:text-primary transition-colors"><Settings size={18} /></div>
              <span className="font-bold flex-1 text-right text-gray-700 dark:text-gray-200 text-sm">{t("ar_all_1062")}</span>
              <ChevronLeft size={18} className="text-gray-300 rtl:rotate-180" />
          </button>
          
          <button onClick={() => onNavigate('PRIVACY')} className="w-full bg-surface-light dark:bg-surface-dark p-3 rounded-xl shadow-sm border-2 border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-primary transition-colors group">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-600 group-hover:bg-orange-100 group-hover:text-primary transition-colors"><Shield size={18} /></div>
              <span className="font-bold flex-1 text-right text-gray-700 dark:text-gray-200 text-sm">{t("ar_all_1063")}</span>
              <ChevronLeft size={18} className="text-gray-300 rtl:rotate-180" />
          </button>

          <button onClick={() => {
        if (navigator.share) {
          navigator.share({
            title: t("ar_all_1064"),
            text: t("ar_all_1065"),
            url: 'https://ais-pre-orksvymok4g3nd4bcx6x6h-61485418626.europe-west2.run.app'
          });
        } else {
          navigator.clipboard.writeText('https://ais-pre-orksvymok4g3nd4bcx6x6h-61485418626.europe-west2.run.app');
          toast.success(t("ar_all_1066"));
        }
      }} className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-primary transition-colors group">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-600 group-hover:bg-green-100 group-hover:text-green-600 transition-colors"><Globe size={20} /></div>
              <span className="font-bold flex-1 text-right text-gray-700 dark:text-gray-200">{t("ar_all_1067")}</span>
              <ChevronLeft size={20} className="text-gray-300 rtl:rotate-180" />
          </button>
          
          {/* Support Dropdown */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
             <button onClick={() => setShowSupport(!showSupport)} className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className="bg-gray-100 p-2 rounded-xl text-gray-600 group-hover:bg-orange-100 group-hover:text-primary transition-colors"><Phone size={20} /></div>
                  <span className="font-bold flex-1 text-right text-gray-700 dark:text-gray-200">{t("ar_all_1068")}</span>
                  {showSupport ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronLeft size={20} className="text-gray-300 rtl:rotate-180" />}
             </button>
             
             {showSupport && <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                     {SUPPORT_PHONES.map((phone, idx) => <button key={idx} onClick={() => setSelectedContact(phone)} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold hover:border-primary transition-colors text-gray-700 dark:text-gray-300 justify-center">
                             <PhoneCall size={14} className="text-green-500" />
                             {phone}
                         </button>)}
                 </div>}
          </div>
      </div>

      <Button variant="danger" fullWidth onClick={() => setShowLogoutConfirm(true)} className="gap-2 mt-4">
          <LogOut size={20} />{t("ar_all_1069")}</Button>

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-in zoom-in-95">
                  <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <LogOut size={32} />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white text-center mb-2">{t("ar_all_1070")}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold text-center mb-8">{t("ar_all_1071")}</p>
                  
                  <div className="flex gap-3">
                      <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-4 rounded-xl font-black text-sm transition-colors font-bold">{t("ar_all_1072")}</button>
                      <button onClick={() => {
            logout();
            setShowLogoutConfirm(false);
          }} className="flex-1 bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl font-black text-sm transition-colors shadow-lg shadow-red-200 dark:shadow-none font-bold">{t("ar_all_1073")}</button>
                  </div>
              </div>
          </div>}
      
      <div className="text-center text-xs text-gray-400 font-medium pt-4">{t("ar_all_1074")}</div>
    </div>;
};