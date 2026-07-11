const fs = require('fs');
let code = fs.readFileSync('components/LoginScreen.tsx', 'utf8');

const stateAdd = `
  const [isDriverRegistration, setIsDriverRegistration] = useState(false);
  const [driverRegForm, setDriverRegForm] = useState({ name: '', phone: '', address: '', vehicleType: 'motorcycle', idCardImage: '', licenseImage: '' });
  const [isDriverSubmitting, setIsDriverSubmitting] = useState(false);

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverRegForm.name || !driverRegForm.phone || !driverRegForm.address || !driverRegForm.idCardImage) {
      setError(isAr ? 'يرجى ملء جميع الحقول المطلوبة والصور.' : 'Please fill all required fields and images.');
      return;
    }
    if (driverRegForm.vehicleType === 'motorcycle' && !driverRegForm.licenseImage) {
      setError(isAr ? 'صورة الرخصة مطلوبة للموتوسيكل.' : 'License image is required for motorcycle.');
      return;
    }
    try {
      setIsDriverSubmitting(true);
      setError('');
      const res = await fetch('/api/driver-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverRegForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isAr ? 'تم إرسال طلبك بنجاح للفرز.' : 'Application sent successfully.');
        setIsDriverRegistration(false);
        setDriverRegForm({ name: '', phone: '', address: '', vehicleType: 'motorcycle', idCardImage: '', licenseImage: '' });
      } else {
        setError(data.message);
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred');
    } finally {
      setIsDriverSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCardImage' | 'licenseImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriverRegForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
`;

code = code.replace("const [isRegister, setIsRegister] = useState(false);", "const [isRegister, setIsRegister] = useState(false);" + stateAdd);

const buttonAdd = `
                    <div className="text-center mt-3">
                        <button onClick={() => setIsDriverRegistration(true)} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl px-4 py-2">
                            {isAr ? 'انضم كطيار 🛵' : 'Join as Driver 🛵'}
                        </button>
                    </div>
`;

code = code.replace("</div>\n            </div>\n \n            {/* Sandbox Quick Dev Triggers", buttonAdd + "</div>\n            </div>\n \n            {/* Sandbox Quick Dev Triggers");

const overlayAdd = `
            {/* Driver Registration Overlay */}
            <AnimatePresence>
                {isDriverRegistration && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <h2 className="text-xl font-black mb-4 text-center">{isAr ? 'انضم لفريق الطيارين' : 'Join the Drivers Team'}</h2>
                            {error && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center border border-red-100">{error}</div>}
                            <form onSubmit={handleDriverSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                                    <input required type="text" value={driverRegForm.name} onChange={e => setDriverRegForm(p => ({...p, name: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'رقم الهاتف' : 'Phone Number'}</label>
                                    <input required type="tel" value={driverRegForm.phone} onChange={e => setDriverRegForm(p => ({...p, phone: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'العنوان' : 'Address'}</label>
                                    <input required type="text" value={driverRegForm.address} onChange={e => setDriverRegForm(p => ({...p, address: e.target.value}))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-primary text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'نوع المركبة' : 'Vehicle Type'}</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setDriverRegForm(p => ({...p, vehicleType: 'motorcycle'}))} className={\`flex-1 py-2 rounded-xl text-sm font-bold border \${driverRegForm.vehicleType === 'motorcycle' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 text-gray-500'}\`}>{isAr ? 'موتوسيكل' : 'Motorcycle'}</button>
                                        <button type="button" onClick={() => setDriverRegForm(p => ({...p, vehicleType: 'bicycle'}))} className={\`flex-1 py-2 rounded-xl text-sm font-bold border \${driverRegForm.vehicleType === 'bicycle' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 text-gray-500'}\`}>{isAr ? 'عجلة' : 'Bicycle'}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'صورة البطاقة' : 'ID Card Image'}</label>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'idCardImage')} className="w-full text-xs" />
                                    {driverRegForm.idCardImage && <img src={driverRegForm.idCardImage} className="mt-2 h-20 rounded-lg object-cover" />}
                                </div>
                                {driverRegForm.vehicleType === 'motorcycle' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? 'صورة الرخصة' : 'License Image'}</label>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'licenseImage')} className="w-full text-xs" />
                                    {driverRegForm.licenseImage && <img src={driverRegForm.licenseImage} className="mt-2 h-20 rounded-lg object-cover" />}
                                </div>
                                )}
                                <div className="flex gap-2 pt-4">
                                    <button type="button" onClick={() => setIsDriverRegistration(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors">{isAr ? 'إلغاء' : 'Cancel'}</button>
                                    <button type="submit" disabled={isDriverSubmitting} className="flex-1 py-3 bg-primary hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors flex justify-center items-center">
                                        {isDriverSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isAr ? 'إرسال الطلب' : 'Submit Application')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
`;

code = code.replace("{/* Right column:", overlayAdd + "\n            {/* Right column:");

fs.writeFileSync('components/LoginScreen.tsx', code);
