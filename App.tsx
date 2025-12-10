import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Mic, Send, BrainCircuit, Sparkles, Loader2, Image as ImageIcon, Accessibility, Volume2, PlayCircle, StopCircle, MicOff, Waves, ChevronRight } from 'lucide-react';
import { AppState, GeneratedContent } from './types';
import { generateExplanation, generateDiagram, generateSpeech, transcribeAudio } from './services/geminiService';
import AudioPlayer from './components/AudioPlayer';
import SpatialDescription from './components/SpatialDescription';

const SIMULATION_QUERY = "Explain the Mixture-of-Experts (MoE) Architecture and, more importantly, describe the specific role of the Router Function within the sparse activation process.";

export default function App() {
  const [query, setQuery] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const simulateVoiceInput = () => {
    setQuery("");
    setError(null);
    setAppState(AppState.RECORDING); // Visually similar to recording
    let i = 0;
    const interval = setInterval(() => {
      setQuery(SIMULATION_QUERY.slice(0, i));
      i++;
      if (i > SIMULATION_QUERY.length) {
        clearInterval(interval);
        setAppState(AppState.IDLE);
      }
    }, 30);
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/webm;codecs=opus'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      
      if (!mimeType) {
        throw new Error("No supported audio mime type found in this browser.");
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        // Stop all stream tracks
        stream.getTracks().forEach(track => track.stop());
        
        await handleTranscription(audioBlob, mimeType);
      };

      recorder.start();
      setAppState(AppState.RECORDING);
    } catch (err: any) {
      console.error("Microphone error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Microphone access blocked. Please allow permissions.");
      } else {
        setError("Could not access microphone. Please ensure your device has a mic.");
      }
      setAppState(AppState.IDLE);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // State change happens in onstop
    } else {
      setAppState(AppState.IDLE);
    }
  };

  const toggleRecording = () => {
    if (appState === AppState.RECORDING) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleTranscription = async (blob: Blob, mimeType: string) => {
    setAppState(AppState.TRANSCRIBING);
    try {
      const base64Audio = await blobToBase64(blob);
      const text = await transcribeAudio(base64Audio, mimeType);
      setQuery(text);
      setAppState(AppState.IDLE);
    } catch (err) {
      console.error(err);
      setError("Failed to transcribe audio. Please check your network.");
      setAppState(AppState.IDLE);
    }
  };

  const handleProcess = async () => {
    if (!query) return;
    setAppState(AppState.PROCESSING_TEXT);
    setError(null);
    setContent(null);

    try {
      // Step 1: Text & Spatial Description
      const explanationData = await generateExplanation(query);
      
      const initialContent: GeneratedContent = {
        text: explanationData.explanation,
        spatialDescription: explanationData.spatialDescription
      };
      setContent(initialContent);

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      setAppState(AppState.COMPLETED);
      
      // Step 2: Parallel fetch for Image and Audio
      generateDiagram(explanationData.imagePrompt)
        .then(imageUrl => {
          if (imageUrl) {
            setContent(prev => prev ? { ...prev, imageUrl } : null);
          }
        })
        .catch(err => console.error("Diagram generation failed", err));

      generateSpeech(explanationData.explanation.slice(0, 800))
        .then(audioBase64 => {
          if (audioBase64) {
            setContent(prev => prev ? { ...prev, audioUrl: audioBase64 } : null);
          }
        })
        .catch(err => console.error("Speech generation failed", err));

    } catch (err: any) {
      console.error(err);
      setError("Failed to generate content. Please try again or check your API key.");
      setAppState(AppState.ERROR);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Clear error if user starts typing manually after a voice error
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen">
      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="relative">
                <svg width="42" height="28" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] transition-all duration-300">
                  <path d="M4 22 L14 10 L24 20 L34 6 L44 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="4" cy="22" r="3" className="fill-slate-900" stroke="currentColor" strokeWidth="2" />
                  <circle cx="14" cy="10" r="3" className="fill-slate-900" stroke="currentColor" strokeWidth="2" />
                  <circle cx="24" cy="20" r="3" className="fill-slate-900" stroke="currentColor" strokeWidth="2" />
                  <circle cx="34" cy="6" r="3" className="fill-slate-900" stroke="currentColor" strokeWidth="2" />
                  <circle cx="44" cy="14" r="3" className="fill-slate-900" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Sense<span className="text-cyan-400">AI</span></span>
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-white/10"></div>
            <p className="hidden sm:block text-sm text-slate-400 font-medium tracking-wide uppercase">Understanding Better</p>
          </div>
          <div className="flex gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-colors ${
              appState === AppState.RECORDING 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-white/5 text-slate-400 border-white/5'
            }`}>
               {appState === AppState.RECORDING && <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
               {appState === AppState.RECORDING ? 'Recording Audio' : 'System Ready'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-10 space-y-12">
        
        {/* Input Section */}
        <section className="max-w-4xl mx-auto animate-fade-in">
          <div className={`relative group transition-all duration-500 ${error ? 'ring-2 ring-red-500/50' : 'focus-within:ring-2 focus-within:ring-cyan-500/30'}`}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-1">
                <textarea
                  ref={textareaRef}
                  className="w-full bg-transparent p-6 min-h-[140px] outline-none text-xl text-slate-200 placeholder-slate-500 resize-none font-light leading-relaxed scrollbar-thin scrollbar-thumb-slate-700"
                  placeholder="Ask a complex question or describe a concept you want to visualize..."
                  value={query}
                  onChange={handleTextChange}
                  disabled={appState === AppState.RECORDING || appState === AppState.TRANSCRIBING || appState === AppState.PROCESSING_TEXT}
                />
              </div>
              
              <div className="flex items-center justify-between px-6 pb-6 pt-2">
                 <div className="flex items-center gap-3">
                   <button 
                      onClick={toggleRecording}
                      disabled={appState === AppState.TRANSCRIBING || appState === AppState.PROCESSING_TEXT}
                      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm overflow-hidden group/btn ${
                        appState === AppState.RECORDING 
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" 
                          : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                      }`}
                   >
                     {appState === AppState.RECORDING ? <MicOff size={18} /> : <Mic size={18} />}
                     <span>{appState === AppState.RECORDING ? "Stop Recording" : "Voice Input"}</span>
                     {appState === AppState.RECORDING && <span className="absolute inset-0 border border-red-500/30 rounded-xl animate-pulse"></span>}
                   </button>

                   <button
                      onClick={simulateVoiceInput}
                      disabled={appState !== AppState.IDLE && appState !== AppState.ERROR}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30 transition-colors"
                    >
                     <PlayCircle size={16} />
                     <span>Try Demo</span>
                   </button>
                 </div>

                 <button
                    onClick={handleProcess}
                    disabled={!query || (appState !== AppState.IDLE && appState !== AppState.ERROR && appState !== AppState.COMPLETED)}
                    className="group/process relative inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                 >
                   {appState === AppState.PROCESSING_TEXT || appState === AppState.TRANSCRIBING ? (
                     <Loader2 size={20} className="animate-spin" />
                   ) : (
                     <Sparkles size={20} className="group-hover/process:animate-pulse" />
                   )}
                   <span>{appState === AppState.TRANSCRIBING ? "Listening..." : "Explain"}</span>
                   <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20"></div>
                 </button>
              </div>
            </div>
          </div>
        </section>

        {/* Processing State */}
        {(appState === AppState.PROCESSING_TEXT || appState === AppState.TRANSCRIBING) && (
           <div className="flex justify-center py-16 animate-fade-in">
              <div className="flex flex-col items-center gap-6">
                 <div className="relative w-20 h-20">
                   <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin"></div>
                   <div className="absolute inset-2 rounded-full border-r-2 border-blue-500 animate-spin animation-delay-500"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <BrainCircuit size={32} className="text-cyan-400 animate-pulse" />
                   </div>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                   <p className="text-lg text-slate-200 font-medium">
                      {appState === AppState.TRANSCRIBING ? "Transcribing your voice..." : "Analyzing complex architecture..."}
                   </p>
                   <p className="text-sm text-slate-500">SenseAI is processing multimodal data</p>
                 </div>
              </div>
           </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 bg-red-500/5 backdrop-blur-sm border border-red-500/20 rounded-xl text-red-200 flex items-center gap-3 animate-fade-in shadow-lg shadow-red-900/20">
            <StopCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results Content */}
        {content && (
          <div className="animate-fade-in space-y-8 pb-24">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Text & Audio */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Audio Player Card */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-1 shadow-xl">
                  {content.audioUrl ? (
                    <AudioPlayer base64Audio={content.audioUrl} autoPlay={true} />
                  ) : (
                     <div className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse flex items-center justify-center">
                          <Waves size={20} className="text-slate-600" />
                        </div>
                        <div className="space-y-2 flex-1">
                           <div className="h-4 w-32 bg-slate-800 rounded animate-pulse"></div>
                           <div className="h-3 w-48 bg-slate-800/50 rounded animate-pulse"></div>
                        </div>
                        <span className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-800 rounded-full animate-pulse">Generating Audio</span>
                     </div>
                  )}
                </div>

                {/* Main Explanation Card */}
                <article className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50"></div>
                  
                  <div className="flex items-center gap-3 mb-8">
                     <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl text-cyan-300 border border-cyan-500/20">
                       <Accessibility size={24} />
                     </div>
                     <div>
                       <h2 className="text-xl font-bold text-white">Technical Deep Dive</h2>
                       <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Core Concepts & Reasoning</p>
                     </div>
                  </div>
                  
                  <div className="prose prose-invert prose-lg max-w-none 
                    prose-headings:text-slate-100 prose-headings:font-bold prose-h3:text-cyan-200 prose-h3:text-lg
                    prose-p:text-slate-300 prose-p:leading-8
                    prose-strong:text-cyan-400 prose-strong:font-semibold
                    prose-ul:marker:text-cyan-500/50
                    prose-li:text-slate-300
                    prose-code:text-cyan-300 prose-code:bg-cyan-950/30 prose-code:px-1 prose-code:rounded prose-code:border prose-code:border-cyan-500/20">
                    <ReactMarkdown>{content.text}</ReactMarkdown>
                  </div>
                </article>
              </div>

              {/* Right Column: Visuals & Spatial */}
              <div className="lg:col-span-5 space-y-6 flex flex-col sticky top-28 self-start">
                
                {/* Visual Generator Card */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2.5 text-slate-200">
                        <ImageIcon size={18} className="text-purple-400" />
                        <span className="font-semibold text-sm">Generated Architecture</span>
                     </div>
                     {!content.imageUrl && (
                        <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">
                           <Loader2 size={12} className="animate-spin" />
                           Rendering...
                        </div>
                     )}
                  </div>
                  
                  <div className="relative aspect-video bg-black/40 flex items-center justify-center group">
                    {content.imageUrl ? (
                      <>
                        <img 
                          src={content.imageUrl} 
                          alt="Generated flowchart of MoE Architecture" 
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                           <a 
                            href={content.imageUrl} 
                            download="moe-architecture.png"
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full border border-white/20 transition-all transform translate-y-2 group-hover:translate-y-0"
                          >
                            Download High-Res Diagram
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-slate-800"></div>
                          <div className="absolute top-0 w-12 h-12 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                        </div>
                        <span className="text-xs text-slate-500 font-medium tracking-wide">Constructing visual model...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spatial Description Card */}
                <div className="flex-1">
                   <SpatialDescription description={content.spatialDescription} />
                </div>

              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>
    </div>
  );
}