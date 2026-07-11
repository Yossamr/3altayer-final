import { useLanguage } from "../services/LanguageContext";
import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface PrivacyProps {
  onBack: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
           <ArrowRight size={20} className="rtl:rotate-180" />
        </button>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">
            {isAr ? "سياسة الخصوصية وأمان البيانات" : "Privacy & Data Safety"}
        </h2>
      </div>
      
      <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-bold border-2 border-gray-100 dark:border-gray-700">
          <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full text-green-600">
                  <ShieldCheck size={48} />
              </div>
          </div>
          
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              
              <div>
                  <h3 className="font-bold text-lg text-primary">{isAr ? "1. أمان البيانات (Data Safety)" : "1. Data Safety"}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                      {isAr ? "نحن نلتزم بمتطلبات متجر Google Play بخصوص أمان البيانات. التطبيق يجمع فقط البيانات الأساسية اللازمة لعملية التوصيل، ولا نشاركها مع أطراف ثالثة لأغراض تسويقية. يتم تشفير جميع البيانات أثناء النقل." : "We comply with Google Play's Data Safety requirements. The app only collects essential data for the delivery process, and we do not share it with third parties for marketing purposes. All data is encrypted in transit."}
                  </p>
              </div>

              <div>
                  <h3 className="font-bold text-lg text-primary">{isAr ? "2. البيانات المجمعة وصلاحيات الجهاز" : "2. Collected Data & Permissions"}</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                      <li><strong>{isAr ? "الموقع الجغرافي:" : "Location:"}</strong> {isAr ? "نجمع بيانات الموقع في الواجهة (Foreground) للعميل لتحديد مكان الاستلام. بالنسبة للسائقين، نستخدم الموقع في الخلفية (Background) فقط أثناء توفرهم لاستقبال الطلبات أو أثناء توصيل طلب نشط لضمان التتبع، ويتوقف التتبع في الخلفية فور إيقاف التوفر أو انتهاء الطلب." : "We collect foreground location for customers to determine pickup. For drivers, we use background location ONLY when they are online to receive orders or during an active delivery to ensure tracking, which stops when they go offline or the order ends."}</li>
                      <li><strong>{isAr ? "المعلومات الشخصية:" : "Personal Info:"}</strong> {isAr ? "الاسم ورقم الهاتف لمعالجة الطلب." : "Name and phone number to process the order."}</li>
                      <li><strong>{isAr ? "بيانات المتقدمين للعمل كطيارين (طلب الانضمام):" : "Driver Applicant Data (Join Requests):"}</strong> {isAr ? "عند التقديم للانضمام كطيار، نطلب الاسم بالكامل، رقم الهاتف، العنوان، نوع المركبة، صورة وجه البطاقة الشخصية وصورة ظهر البطاقة الشخصية، وصورة رخصة القيادة. هذه البيانات الحساسة نجمعها ونعالجها فقط للتحقق من الهوية والأهلية القانونية والأمنية للعمل كطيار، ويتم حفظها بشكل آمن ومشفر على خوادمنا ولا يتم مشاركتها مطلقاً مع أي جهة خارجية." : "When applying to join as a driver, we require full name, phone, address, vehicle type, photos of the ID card (front and back), and the driver's license. This sensitive data is collected and processed solely to verify identity, legal eligibility, and security clearance for onboarding. It is securely stored on our encrypted servers and never shared with external parties."}</li>
                      <li><strong>{isAr ? "معرفات الجهاز (FCM):" : "Device IDs (FCM):"}</strong> {isAr ? "نجمع رمز الإشعارات لإرسال تحديثات حالة الطلب عبر Firebase." : "We collect notification tokens to send order updates via Firebase."}</li>
                      <li><strong>{isAr ? "جهات الاتصال:" : "Contacts:"}</strong> {isAr ? "التطبيق لا يصل مطلقاً إلى جهات الاتصال الخاصة بك." : "The app never accesses your contacts."}</li>
                  </ul>
              </div>

              <div>
                  <h3 className="font-bold text-lg text-primary">{isAr ? "3. شروط التوصيل (المنتجات المقيدة)" : "3. Delivery Terms (Restricted Items)"}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                      {isAr ? "يلتزم التطبيق بسياسات التوصيل. لا نسمح بتوصيل المواد الممنوعة. في حال تضمن الطلب منتجات مقيدة عمرياً (مثل التبغ)، سيقوم السائق بالتحقق من الهوية والعمر عند الاستلام." : "The app complies with delivery policies. We do not allow the delivery of illegal substances. If an order includes age-restricted items (e.g., tobacco), the driver will verify identity and age upon delivery."}
                  </p>
              </div>

              <div>
                  <h3 className="font-bold text-lg text-primary">{isAr ? "4. حذف الحساب والبيانات" : "4. Account & Data Deletion"}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                      {isAr ? "يمكنك حذف حسابك وكافة بياناتك المرتبطة نهائياً في أي وقت من خلال قسم (الإعدادات > حذف الحساب) داخل التطبيق. أو من خلال تقديم طلب عبر موقعنا الإلكتروني." : "You can permanently delete your account and all associated data at any time via the (Settings > Delete Account) section in the app. Or by submitting a request via our website."}
                  </p>
              </div>

              <div>
                  <h3 className="font-bold text-lg text-primary">{isAr ? "5. الدعم الفني والتواصل" : "5. Support & Contact"}</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                      {isAr ? "لأي استفسارات، أو لطلب الدعم الفني، أو للإبلاغ عن مشكلة، يرجى التواصل معنا عبر البريد الإلكتروني: support@altayyar.app أو الاتصال على الرقم المخصص للدعم داخل التطبيق." : "For any inquiries, technical support, or to report an issue, please contact us via email: support@altayyar.app or call the support number provided in the app."}
                  </p>
              </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
              {isAr ? "آخر تحديث: 2026 تم الإعداد ليتوافق مع سياسات Google Play" : "Last updated: 2026. Prepared to comply with Google Play Policies"}
          </div>
      </div>
    </div>
  );
};
