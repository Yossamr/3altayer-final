import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer: React.FC<{ src: string, isMe?: boolean }> = ({ src, isMe = false }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        if (playing) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play().catch(e => {
                console.error('Audio play failed', e);
                setPlaying(false);
            });
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            if (total > 0) setProgress((current / total) * 100);
        }
    };

    const handleEnded = () => {
        setPlaying(false);
        setProgress(0);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
        }
    };

    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 w-48 ${isMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
            <button 
                onClick={togglePlay} 
                className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                    isMe 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-light'
                }`}
                type="button"
            >
                {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            
            <div className="flex-1 flex flex-col gap-1">
                {/* Progress bar */}
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div 
                        className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-primary'}`} 
                        style={{ width: `${progress}%` }} 
                    />
                </div>
                
                {/* Time indicators */}
                <div className={`flex justify-between text-[10px] font-mono ${isMe ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}</span>
                    <span>{duration > 0 ? formatTime(duration) : '0:00'}</span>
                </div>
            </div>

            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={handleEnded}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
            />
        </div>
    );
};
