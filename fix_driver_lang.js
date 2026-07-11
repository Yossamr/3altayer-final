const fs = require('fs');

let langCode = fs.readFileSync('services/LanguageContext.tsx', 'utf8');

const arAdditions = `
    youAreOnline: "أنت متاح دلوقتى",
    youAreOffline: "أنت غير متاح",
    ordersWillReachYou: "الطلبات هتوصلك فوراً",
    clickToStart: "اضغط للبدء واستقبال طلبات",
    overallPerformance: "تقييم الأداء العام",
    details: "التفاصيل",
    totalOrders: "طلب (الكلي)",
    newOrdersTab: "جديدة",
    activeOrdersTab: "جارية",
    noOrdersNow: "لا توجد طلبات حالياً",
    youAreOfflineStatus: "أنت غير متاح حالياً",
    changeStatusToReceive: "قم بتغيير حالتك إلى متاح لاستقبال طلبات جديدة",
    acceptOrderCode: "إدخال كود الاستلام",
    askCustomerForCode: "اطلب الكود من العميل للتأكيد",
    confirmDelivery: "تأكيد الاستلام",
    codeMissingError: "برجاء إدخال الكود أولاً",
    distanceCalcError: "تعذر حساب المسافة",
    driverInfoMissing: "بيانات المندوب غير مكتملة",
    deliveryCompleted: "تم توصيل الطلب بنجاح!",
    detailsMissing: "يجب ملء التفاصيل",
    recipientMissing: "يجب إدخال اسم المستلم",
    finishDelivery: "إنهاء التوصيل",
`;

const enAdditions = `
    youAreOnline: "You are Online",
    youAreOffline: "You are Offline",
    ordersWillReachYou: "Orders will reach you immediately",
    clickToStart: "Click to start receiving orders",
    overallPerformance: "Overall Performance",
    details: "Details",
    totalOrders: "Total Orders",
    newOrdersTab: "New",
    activeOrdersTab: "Active",
    noOrdersNow: "No orders available currently",
    youAreOfflineStatus: "You are currently offline",
    changeStatusToReceive: "Change your status to Online to receive new orders",
    acceptOrderCode: "Enter Delivery Code",
    askCustomerForCode: "Ask the customer for the code to confirm",
    confirmDelivery: "Confirm Delivery",
    codeMissingError: "Please enter the code first",
    distanceCalcError: "Could not calculate distance",
    driverInfoMissing: "Driver information is incomplete",
    deliveryCompleted: "Order delivered successfully!",
    detailsMissing: "Details must be filled",
    recipientMissing: "Recipient name is required",
    finishDelivery: "Finish Delivery",
`;

langCode = langCode.replace('appName: "عالطاير"', 'appName: "عالطاير",' + arAdditions);
langCode = langCode.replace('appName: "3alTayar"', 'appName: "3alTayar",' + enAdditions);

fs.writeFileSync('services/LanguageContext.tsx', langCode);

let driverCode = fs.readFileSync('components/DriverView.tsx', 'utf8');

driverCode = driverCode.replace(/'أنت متاح دلوقتى'/g, "t('youAreOnline')");
driverCode = driverCode.replace(/'أنت غير متاح'/g, "t('youAreOffline')");
driverCode = driverCode.replace(/'الطلبات هتوصلك فوراً'/g, "t('ordersWillReachYou')");
driverCode = driverCode.replace(/'اضغط للبدء واستقبال طلبات'/g, "t('clickToStart')");
driverCode = driverCode.replace(/'تقييم الأداء العام'/g, "t('overallPerformance')");
driverCode = driverCode.replace(/'التفاصيل'/g, "t('details')");
driverCode = driverCode.replace(/'طلب \(الكلي\)'/g, "t('totalOrders')");
driverCode = driverCode.replace(/'جديدة'/g, "t('newOrdersTab')");
driverCode = driverCode.replace(/'جارية'/g, "t('activeOrdersTab')");
driverCode = driverCode.replace(/'لا توجد طلبات حالياً'/g, "t('noOrdersNow')");
driverCode = driverCode.replace(/'أنت غير متاح حالياً'/g, "t('youAreOfflineStatus')");
driverCode = driverCode.replace(/'قم بتغيير حالتك إلى "متاح" لاستقبال طلبات جديدة'/g, "t('changeStatusToReceive')");
driverCode = driverCode.replace(/'إدخال كود الاستلام'/g, "t('acceptOrderCode')");
driverCode = driverCode.replace(/'اطلب الكود من العميل للتأكيد'/g, "t('askCustomerForCode')");
driverCode = driverCode.replace(/'تأكيد الاستلام'/g, "t('confirmDelivery')");
driverCode = driverCode.replace(/'برجاء إدخال الكود أولاً'/g, "t('codeMissingError')");
driverCode = driverCode.replace(/'تعذر حساب المسافة'/g, "t('distanceCalcError')");
driverCode = driverCode.replace(/'بيانات المندوب غير مكتملة'/g, "t('driverInfoMissing')");
driverCode = driverCode.replace(/'تم توصيل الطلب بنجاح!'/g, "t('deliveryCompleted')");
driverCode = driverCode.replace(/'يجب ملء التفاصيل'/g, "t('detailsMissing')");
driverCode = driverCode.replace(/'يجب إدخال اسم المستلم'/g, "t('recipientMissing')");
driverCode = driverCode.replace(/'إنهاء التوصيل'/g, "t('finishDelivery')");

driverCode = driverCode.replace('isOnline ? \'-translate-x-[28px] sm:-translate-x-8\' : \'translate-x-0\'', "isOnline ? (isAr ? '-translate-x-[28px] sm:-translate-x-8' : 'translate-x-[28px] sm:translate-x-8') : 'translate-x-0'");

fs.writeFileSync('components/DriverView.tsx', driverCode);

console.log('Update complete.');
