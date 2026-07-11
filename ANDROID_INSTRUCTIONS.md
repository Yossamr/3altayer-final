# إرشادات تفعيل Background Location لتطبيق عالطاير (Android)

نظراً لأن المشروع يعمل حالياً كنسخة ويب مع تثبيت مكتبة `capacitor-community/background-geolocation`، فعند تصدير المشروع إلى نظام Android عبر أمر `npx cap add android`، **يجب** إعداد التصاريح وتوضيحات الخصوصية بشكل دقيق لتجنب رفض التطبيق في Google Play.

## الخطوة 1: تعديل AndroidManifest.xml

في مسار `android/app/src/main/AndroidManifest.xml`، أضف التصاريح التالية داخل وسم `<manifest>` (أو تأكد من وجودها):

```xml
<!-- Foreground Service location tracking for active delivery -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<!-- Required for Android 14+ -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Standard location tracking -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Background Location Tracking (CRITICAL) -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### التبرير لـ Google Play (Prominent Disclosure):
عند إرسال التطبيق للمراجعة، سيُطلب منك فيديو وتبرير نصي لاستخدام موقع الخلفية. استخدم النص التالي:
> "AlTayyar Driver app requires access to background location to track the driver's real-time position while they are online to receive orders or actively delivering an order, even when the screen is locked or the app is closed. This enables customers to track their delivery in real-time. Background location tracking stops immediately when the driver toggles themselves offline or completes all active orders."

بالعربية (إذا كان التبرير مطلوباً بالعربية):
> "يطلب تطبيق سائق عالطاير الوصول إلى الموقع في الخلفية لتتبع مكان السائق الفعلي أثناء توفره لاستقبال الطلبات أو أثناء توصيل طلب نشط، حتى عند قفل الشاشة أو إغلاق التطبيق. هذا يسمح للعملاء بتتبع طلبهم في الوقت الفعلي. يتوقف تتبع الموقع في الخلفية فوراً عندما يضع السائق نفسه غير متاح (Offline) أو ينهي الطلب النشط."

## الخطوة 2: اختبار قفل الشاشة (الذي تم تصميمه برمجياً)

تمت برمجة التطبيق ليعمل كالآتي:
1. بمجرد تحول السائق إلى **متاح** (Online) أو **موافقة على طلب**، يبدأ خدمة الواجهة الأمامية (Foreground Service) بالعمل مع إشعار دائم (Persistent Notification).
2. أثناء **قفل الشاشة (لعدة دقائق)**، يستمر التطبيق في تحديث الإحداثيات في قاعدة البيانات (`updateUserLocationInDB`) كل 10-20 ثانية (بناءً على الحركة).
3. بمجرد إنهاء الطلب وإيقاف السائق لنفسه (Offline)، يُحذف الـ Watcher برمجياً من الـ Plugin ويختفي الإشعار الدائم تلقائياً.

هذا يحقق التتبع الحقيقي والمستقر تماماً كما تعمل تطبيقات توصيل كبرى مثل طلبات وأوبر.
