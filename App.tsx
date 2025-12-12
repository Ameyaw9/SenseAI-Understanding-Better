import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Mic, 
  BrainCircuit, 
  Loader2, 
  Image as ImageIcon, 
  Accessibility, 
  Waves, 
  Brain, 
  MicOff, 
  StopCircle, 
  PlayCircle, 
  ScanFace, 
  Ear, 
  MoveRight 
} from 'lucide-react';
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

  // Determine layout state
  const isIdle = !content && appState === AppState.IDLE && !error;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const simulateVoiceInput = () => {
    setQuery("");
    setError(null);
    setAppState(AppState.RECORDING);
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
        setError("Could not access microphone.");
      }
      setAppState(AppState.IDLE);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
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
      const explanationData = await generateExplanation(query);
      
      const initialContent: GeneratedContent = {
        text: explanationData.explanation,
        spatialDescription: explanationData.spatialDescription
      };
      setContent(initialContent);

      setAppState(AppState.COMPLETED);
      
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
    if (error) setError(null);
  };

  // --- Components ---

  const Logo = () => (
    <div className="flex items-center gap-3 select-none">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
           <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" className="text-slate-700/50" strokeWidth="1" />
           <path d="M10 28 L16 14 L24 24 L32 8" fill="none" stroke="currentColor" className="text-cyan-400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
           <circle cx="10" cy="28" r="3" className="fill-slate-900 stroke-cyan-400" strokeWidth="2" />
           <circle cx="16" cy="14" r="3" className="fill-slate-900 stroke-cyan-400" strokeWidth="2" />
           <circle cx="24" cy="24" r="3" className="fill-slate-900 stroke-cyan-400" strokeWidth="2" />
           <circle cx="32" cy="8" r="3" className="fill-slate-900 stroke-cyan-400" strokeWidth="2" />
        </svg>
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-2xl font-bold text-white tracking-tight leading-none">Sense<span className="text-cyan-400">AI</span></span>
        <span className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mt-1">Understanding Better</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-[-1] bg-[#020617]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Navbar - Only shows full content when NOT idle, otherwise minimal */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${isIdle ? 'bg-transparent py-6' : 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-3'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
           <div className={`transition-opacity duration-500 ${isIdle ? 'opacity-0' : 'opacity-100'}`}>
              <Logo />
           </div>
           
           <div className="flex items-center gap-4">
              {appState === AppState.RECORDING && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-medium animate-pulse">
                   <div className="w-2 h-2 bg-red-500 rounded-full" />
                   Recording...
                 </div>
              )}
           </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 lg:px-6 pt-24 pb-12">
        
        {/* --- IDLE STATE: HERO SECTION --- */}
        <div className={`flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isIdle ? 'flex-1 translate-y-0 opacity-100' : 'h-0 opacity-0 overflow-hidden translate-y-[-50px]'}`}>
          
          <div className="mb-10 scale-150">
            <Logo />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-6 max-w-3xl leading-tight">
            Inclusive Intelligence for <br />
            <span className="text-cyan-400">Everyone.</span>
          </h1>

          <p className="text-slate-400 text-center max-w-xl mb-12 text-lg leading-relaxed">
            SenseAI bridges the gap between complex technical concepts and accessibility using 
            multimodal generation. Ask, listen, and visualize.
          </p>

        </div>

        {/* --- INPUT AREA --- */}
        <div className={`w-full max-w-3xl mx-auto transition-all duration-700 z-10 ${isIdle ? 'translate-y-0' : 'translate-y-0'}`}>
          <div className={`relative group transition-all duration-300 ${error ? 'ring-2 ring-red-500/50 rounded-3xl' : 'hover:ring-1 hover:ring-cyan-500/30 rounded-3xl'}`}>
            
            {/* Glow Effect */}
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500 ${isIdle ? 'opacity-30' : 'opacity-10'}`}></div>
            
            <div className="relative bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent p-6 min-h-[80px] outline-none text-xl text-slate-100 placeholder-slate-500 resize-none font-light leading-relaxed scrollbar-hide"
                placeholder={isIdle ? "Ask a complex question..." : "Ask follow up..."}
                rows={isIdle ? 3 : 1}
                value={query}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleProcess();
                  }
                }}
                disabled={appState === AppState.RECORDING || appState === AppState.TRANSCRIBING || appState === AppState.PROCESSING_TEXT}
              />
              
              <div className="flex items-center justify-between px-4 pb-4 pt-2">
                <div className="flex items-center gap-2">
                   <button 
                      onClick={toggleRecording}
                      disabled={appState === AppState.TRANSCRIBING || appState === AppState.PROCESSING_TEXT}
                      className={`p-3 rounded-full transition-all duration-200 ${
                        appState === AppState.RECORDING 
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                          : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                      title="Voice Input"
                   >
                     {appState === AppState.RECORDING ? <MicOff size={20} /> : <Mic size={20} />}
                   </button>
                   
                   {isIdle && (
                     <button
                        onClick={simulateVoiceInput}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                      >
                       <PlayCircle size={14} />
                       <span>Try Demo</span>
                     </button>
                   )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {query.length > 0 ? `${query.length} chars` : 'Markdown supported'}
                  </span>
                  <button
                      onClick={handleProcess}
                      disabled={!query || (appState !== AppState.IDLE && appState !== AppState.ERROR && appState !== AppState.COMPLETED)}
                      className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-300 ${
                        !query 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]'
                      }`}
                  >
                    {appState === AppState.PROCESSING_TEXT || appState === AppState.TRANSCRIBING ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Brain size={20} />
                    )}
                    <span>{appState === AppState.TRANSCRIBING ? "Thinking..." : "Explain"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- PROJECT INFO CARDS (Only visible when IDLE) --- */}
        <div className={`mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto transition-all duration-700 delay-100 ${isIdle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none absolute'}`}>
           
           {/* Card 1 */}
           <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm hover:bg-slate-800/40 hover:border-cyan-500/30 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <BrainCircuit size={20} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Deep Reasoning</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Uses advanced AI to break down complex topics into clear, step-by-step explanations that are easy to understand.
              </p>
           </div>

           {/* Card 2 */}
           <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm hover:bg-slate-800/40 hover:border-purple-500/30 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <ScanFace size={20} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Spatial Accessibility</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Generates specialized spatial descriptions that translate visual diagrams into logical, navigational instructions for the visually impaired.
              </p>
           </div>

           {/* Card 3 */}
           <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-sm hover:bg-slate-800/40 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Ear size={20} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multimodal Synthesis</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Simultaneously generates flowchart diagrams, text-to-speech audio, and text explanations for a complete sensory learning experience.
              </p>
           </div>
        </div>

        {/* --- ERROR STATE --- */}
        {error && (
          <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-3 animate-fade-in">
            <StopCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* --- RESULTS CONTENT --- */}
        {content && !isIdle && (
          <div className="animate-fade-in space-y-8 mt-12 pb-24">
            
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
              <div className="lg:col-span-5 space-y-6 flex flex-col sticky top-24 self-start">
                
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