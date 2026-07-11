import { useLanguage } from "../services/LanguageContext";
import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { Camera, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
interface QRScannerProps {
  onClose: () => void;
  onScan: (code: string) => void;
}
export const QRScannerView: React.FC<QRScannerProps> = ({
  onClose,
  onScan
}) => {
  const {
    t
  } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [processingImage, setProcessingImage] = useState(false);

  // REAL CAMERA LOGIC
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    const startCamera = async () => {
      try {
        // Request camera (prefer back camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment"
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready to play
          videoRef.current.setAttribute("playsinline", "true"); // required for iOS
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setCameraError(t("ar_all_1041"));
        setScanning(false);
      }
    };
    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });
          if (code && code.data) {
            // Found a code!
            setScanning(false);
            onScan(code.data);
            return; // Stop loop
          }
        }
      }
      if (scanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [scanning, onScan]);
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessingImage(true);
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setProcessingImage(false);
        if (code) {
          onScan(code.data);
        } else {
          toast.error(t("ar_all_1042"));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  return <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="flex justify-between items-center p-6 text-white bg-black/50 absolute top-0 w-full z-20 backdrop-blur-sm">
        <h2 className="text-xl font-bold">{t("ar_all_1043")}</h2>
        <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Camera Area */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
         {!cameraError && <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted />}
         
         <canvas ref={canvasRef} className="hidden" />

         {/* Scanner Overlay UI */}
         {!cameraError && <div className="relative w-72 h-72 border-2 border-primary/80 rounded-3xl overflow-hidden shadow-[0_0_0_200vh_rgba(0,0,0,0.8)] z-10">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-primary shadow-[0_0_20px_#FF7F11] animate-[scan_2s_infinite_linear]"></div>
                
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
             </div>}

         {cameraError && <div className="z-10 text-white text-center p-8 bg-gray-800 rounded-2xl max-w-xs">
                 <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                 <p className="font-bold mb-2">{t("ar_all_1044")}</p>
                 <p className="text-sm opacity-70 mb-4">{cameraError}</p>
                 <button onClick={() => fileInputRef.current?.click()} className="bg-primary px-6 py-2 rounded-xl font-bold">{t("ar_all_1045")}</button>
             </div>}

         <div className="absolute bottom-40 text-white text-center w-full px-4 z-20 pointer-events-none">
             {processingImage ? <div className="flex flex-col items-center gap-2 bg-black/60 p-4 rounded-xl backdrop-blur-md inline-block">
                     <Loader2 className="animate-spin text-primary" size={32} />
                     <p className="font-bold">{t("ar_all_1046")}</p>
                 </div> : !cameraError && <div className="bg-black/40 px-4 py-2 rounded-full inline-block backdrop-blur-sm">
                        <p className="font-bold text-sm">{t("ar_all_1047")}</p>
                    </div>}
         </div>
      </div>

      {/* Controls */}
      <div className="bg-black p-8 flex justify-around items-center pb-safe z-20">
         {/* Upload Button */}
         <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors group">
             <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                 <ImageIcon size={28} />
             </div>
             <span className="text-xs font-bold">{t("ar_all_1048")}</span>
         </button>
         <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
         
         <div className="text-gray-500 text-xs w-32 text-center">{t("ar_all_1049")}</div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>;
};