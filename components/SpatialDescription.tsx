import React from 'react';
import { Eye, Map, ArrowRight, Navigation } from 'lucide-react';

interface Props {
  description: string;
}

const SpatialDescription: React.FC<Props> = ({ description }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 pl-1">
        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20">
           <Navigation size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-none">
            Spatial Guide
          </h3>
          <p className="text-xs text-slate-400 mt-1">For Navigation & Accessibility</p>
        </div>
      </div>

      <div 
        className="flex-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-lg shadow-indigo-900/10"
        role="region"
        aria-label="Spatial description of the diagram"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
        
        <div className="prose prose-invert prose-indigo max-w-none relative z-10">
          <p className="text-lg leading-loose text-indigo-100 font-medium">
            {description}
          </p>
        </div>

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs">
             <Eye size={14} />
             <span>Reading Mode</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SpatialDescription;