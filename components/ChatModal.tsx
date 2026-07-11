import { useLanguage } from "../services/LanguageContext";
import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { AudioPlayer } from "./AudioPlayer";
import { createPortal } from 'react-dom';
import { useApp } from '../services/AppContext';
import { Message, Order } from '../types';
import { Send, X, MessageCircle, Mic, Square, Trash2, Play, Pause, Image as ImageIcon, Camera } from 'lucide-react';
interface ChatModalProps {
  order: Order;
  onClose: () => void;
}
export const ChatModal: React.FC<ChatModalProps> = ({
  order,
  onClose
}) => {
  const {
    t
  } = useLanguage();
  const {
    currentUser,
    sendMessage,
    fetchOrderMessages,
    resetUnreadCount
  } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageAsset, setImageAsset] = useState<string | null>(null);
  const [audioAsset, setAudioAsset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micPermission, setMicPermission] = useState<PermissionState | 'prompt'>('prompt');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRecordingIntentRef = useRef(false);
  const isCancelledRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const startRecording = async (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(t("ar_all_1237"));
      return;
    }
    isRecordingIntentRef.current = true;
    isCancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // If the user released the button before permissions were granted
      if (!isRecordingIntentRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/wav'];
      let selectedType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
      const options = selectedType ? {
        mimeType: selectedType
      } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: selectedType || 'audio/webm'
        });
        if (!isCancelledRef.current && chunksRef.current.length > 0) {
          const base64 = await blobToBase64(audioBlob);
          if (base64) {
            setAudioAsset(base64);
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      // Vibrate for feedback if supported
      if ('vibrate' in navigator) navigator.vibrate(50);
      setIsRecording(true);
      setRecordingTime(0);
      recorder.start(100); // Collect data in 100ms chunks

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      isRecordingIntentRef.current = false;
      setIsRecording(false);
      toast.error(t("ar_all_1238"));
    }
  };
  const stopRecording = (cancel = false, e?: React.SyntheticEvent) => {
    if (e && e.cancelable && e.type !== 'touchend') e.preventDefault();
    if (!isRecordingIntentRef.current && !isRecording) return;
    isRecordingIntentRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      isCancelledRef.current = cancel;
      mediaRecorderRef.current.stop();
      if (cancel && 'vibrate' in navigator) navigator.vibrate([30, 30]);else if (!cancel && 'vibrate' in navigator) navigator.vibrate(30);
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      startXRef.current = e.touches[0].clientX;
    } else {
      startXRef.current = (e as React.MouseEvent).clientX;
    }
    startRecording(e);
  };
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording || startXRef.current === null) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

    // Swipe left to cancel in RTL -> currentX is smaller than startX
    if (currentX < startXRef.current - 50) {
      stopRecording(true, e);
      startXRef.current = null;
    }
  };
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initial Load
  useEffect(() => {
    resetUnreadCount();
    loadMessages();
    // Polling for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);

    // Check mic permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({
        name: 'microphone' as any
      }).then(p => {
        setMicPermission(p.state);
        p.onchange = () => setMicPermission(p.state);
      });
    }
    return () => clearInterval(interval);
  }, [order.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  const loadMessages = async () => {
    const msgs = await fetchOrderMessages(order.id);
    setMessages(msgs);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t("ar_all_1239"));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageAsset(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageAsset && !audioAsset) return;
    const tempMsg = newMessage;
    const tempImg = imageAsset;
    const tempAudio = audioAsset;
    setNewMessage('');
    setImageAsset(null);
    setAudioAsset(null);
    setLoading(true);
    try {
      await sendMessage(order.id, tempMsg, tempAudio || undefined, tempImg || undefined);
      await loadMessages();
    } catch (error) {
      toast.error(t("ar_all_1247"));
    } finally {
      setLoading(false);
    }
  };
  return createPortal(<div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md h-[90dvh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                {/* Header */}
                <div className="p-4 bg-primary text-white flex justify-between items-center shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{t("ar_all_1240")}</h3>
                            <p className="text-xs text-orange-100">#{order.id.slice(-4)} • {order.items}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-black/50 space-y-3">
                    {messages.length === 0 ? <div className="text-center text-gray-400 mt-10">
                            <p className="text-sm">{t("ar_all_1241")}</p>
                            <p className="text-xs">{t("ar_all_1242")}</p>
                        </div> : messages.map(msg => {
          const isMe = msg.senderId === currentUser?.id;
          return <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 dark:text-white text-gray-800 rounded-tl-none border border-gray-200 dark:border-gray-700'}`}>
                                        {msg.image && <div className="mb-2">
                                                <img src={msg.image} alt="Attached" className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90" onClick={() => window.open(msg.image, '_blank')} referrerPolicy="no-referrer" />
                                            </div>}
                                        {msg.audio && <div className="mb-1">
                                                <AudioPlayer src={msg.audio} isMe={isMe} />
                                            </div>}
                                        {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
                                    </span>
                                </div>;
        })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Media Preview Overlay */}
                {(imageAsset || audioAsset) && <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
                        {imageAsset && <div className="relative self-start">
                                <img referrerPolicy="no-referrer" src={imageAsset} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2 border-primary shadow-sm" />
                                <button onClick={() => setImageAsset(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600">
                                    <X size={14} />
                                </button>
                            </div>}
                        {audioAsset && <div className="relative self-start bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-secondary w-full max-w-sm flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex-1">
                                    <AudioPlayer src={audioAsset} isMe={true} />
                                </div>
                                <button onClick={() => setAudioAsset(null)} className="bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>}
                    </div>}

                {/* Input Area */}
                <div className="px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    {isRecording ? <div className="flex-1 flex items-center justify-between bg-red-600 px-4 py-3 rounded-full shadow-lg shadow-red-200 dark:shadow-red-900/30 animate-pulse border-2 border-white/20">
                            <div className="flex items-center gap-2 text-white">
                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                                <span className="font-black text-sm md:text-base font-mono">{formatTime(recordingTime)}</span>
                            </div>
                            <span className="text-[10px] sm:text-xs text-white font-black animate-bounce">{t("ar_all_1243")}</span>
                        </div> : <>
                            <div className="flex shrink-0">
                                <label className="cursor-pointer text-gray-400 hover:text-primary transition-all p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <ImageIcon size={22} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <textarea rows={1} value={newMessage} onChange={e => {
            setNewMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as any);
            }
          }} className="flex-1 w-full min-w-0 bg-gray-100 dark:bg-gray-800 rounded-3xl px-4 py-3 border border-transparent focus:border-primary/30 text-[13px] md:text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 text-gray-800 dark:text-white resize-none max-h-[120px] overflow-y-auto leading-relaxed shadow-inner" placeholder={t("ar_all_1244")} />
                        </>}
                    
                    {/* The action button (Send/Mic) */}
                    <div className="shrink-0 flex items-center justify-center">
                        {newMessage.trim() || imageAsset || audioAsset ? <button onClick={handleSend as any} disabled={loading} className="bg-primary hover:bg-orange-600 w-12 h-12 flex items-center justify-center disabled:opacity-50 text-white rounded-full shadow-lg shadow-orange-200 dark:shadow-none transition-all active:scale-95">
                                <Send size={20} className="rtl:-rotate-90" />
                            </button> : <div className="relative">
                                <button type="button" onTouchStart={handleTouchStart} onTouchEnd={e => stopRecording(false, e)} onTouchMove={handleTouchMove} onMouseDown={handleTouchStart} onMouseUp={e => stopRecording(false, e)} onMouseLeave={e => stopRecording(true, e)} onContextMenu={e => e.preventDefault()} className={`w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-all touch-none select-none active:scale-110 ${micPermission === 'denied' ? 'bg-gray-400' : isRecording ? 'bg-red-500 ring-4 ring-red-500/20 shadow-red-500/40' : 'bg-primary hover:bg-orange-600'}`}>
                                    <Mic size={22} className="text-white" />
                                </button>
                            </div>}
                    </div>
                </div>
            </div>
        </div>, document.body);
};