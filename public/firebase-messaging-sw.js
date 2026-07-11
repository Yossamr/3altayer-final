importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyACGhABasEvWM_YRwhNLjLIJG1BnDgOKIA",
  authDomain: "glassy-dynamo-2wh20.firebaseapp.com",
  projectId: "glassy-dynamo-2wh20",
  storageBucket: "glassy-dynamo-2wh20.firebasestorage.app",
  messagingSenderId: "491305480456",
  appId: "1:491305480456:web:2aa0f6dfda214215643cbd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "إشعار جديد", {
    body: body || "",
    icon: "/icon-192.png",
    data: payload.data,
  });
});
