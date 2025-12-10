import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, AudioLines } from 'lucide-react';

interface AudioPlayerProps {
  base64Audio: string;
  autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const decodeAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const numChannels = 1;
      const sampleRate = 24000;
      const frameCount = dataInt16.length; 
      
      const buffer = audioContextRef.current.createBuffer(numChannels, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < frameCount; i++) {
         channelData[i] = dataInt16[i] / 32768.0;
      }
      
      audioBufferRef.current = buffer;
    } catch (e) {
      console.error("Error decoding audio", e);
      setHasError(true);
    }
  }, [base64Audio]);

  useEffect(() => {
    decodeAudio().then(() => {
      if (autoPlay) {
        play();
      }
    });

    return () => {
      stop();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodeAudio]);

  const play = async () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    sourceRef.current = audioContextRef.current.createBufferSource();
    sourceRef.current.buffer = audioBufferRef.current;
    sourceRef.current.connect(audioContextRef.current.destination);

    const offset = pauseTimeRef.current;
    sourceRef.current.start(0, offset);
    startTimeRef.current = audioContextRef.current.currentTime - offset;

    sourceRef.current.onended = () => {
       setIsPlaying(false);
       pauseTimeRef.current = 0; 
    };

    setIsPlaying(true);
  };

  const pause = () => {
    if (sourceRef.current && isPlaying) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      if (audioContextRef.current) {
        pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
      setIsPlaying(false);
    }
  };

  const stop = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) { /* ignore */ }
    }
    pauseTimeRef.current = 0;
    setIsPlaying(false);
  };

  const handleToggle = () => {
    if (isPlaying) pause();
    else play();
  };

  if (hasError) return <div className="text-red-400 text-sm p-4">Audio playback unavailable</div>;

  return (
    <div className="flex items-center gap-5 px-6 py-4 bg-transparent w-full">
      <button
        onClick={handleToggle}
        className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 flex-shrink-0 ${
          isPlaying 
            ? 'bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-105' 
            : 'bg-white/10 text-slate-100 hover:bg-white/20 hover:scale-105'
        }`}
        aria-label={isPlaying ? "Pause Explanation" : "Play Explanation"}
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1.5">
         <div className="flex items-center justify-between">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
             Voice Output
           </span>
           {isPlaying && (
              <div className="flex gap-0.5 items-end h-3">
                 <div className="w-1 bg-amber-400 animate-[pulse_0.8s_ease-in-out_infinite] h-2"></div>
                 <div className="w-1 bg-amber-400 animate-[pulse_1.2s_ease-in-out_infinite] h-full"></div>
                 <div className="w-1 bg-amber-400 animate-[pulse_1.0s_ease-in-out_infinite] h-1.5"></div>
              </div>
           )}
         </div>
         <div className="text-sm font-medium text-slate-200 truncate">
            AI Generated Explanation
         </div>
         {/* Fake Progress Bar Visual */}
         <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
           <div className={`h-full bg-amber-400/80 rounded-full transition-all duration-1000 ${isPlaying ? 'w-full animate-[shimmer_2s_infinite]' : 'w-0'}`}></div>
         </div>
      </div>

      <div className={`text-slate-500 transition-colors ${isPlaying ? 'text-amber-400' : ''}`}>
        <Volume2 size={24} />
      </div>
    </div>
  );
};

export default AudioPlayer;