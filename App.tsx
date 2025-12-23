
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Save, Trash2, ShieldCheck, ShieldAlert, ArrowRightLeft, UserCircle2, Image as ImageIcon } from 'lucide-react';
import { Fielder, FieldSetup, ValidationResult } from './types';
import html2canvas from 'html2canvas';

const PITCH_Y = 50;

const INITIAL_FIELDERS: Fielder[] = [
  { id: 'bowler', name: 'Bowler', role: 'bowler', pos: { x: 41, y: 50 } },
  { id: 'keeper', name: 'Keeper', role: 'keeper', pos: { x: 18, y: 50 } },
  { id: 'f1', name: 'P1', role: 'fielder', pos: { x: 30, y: 75 } },
  { id: 'f2', name: 'P2', role: 'fielder', pos: { x: 45, y: 85 } },
  { id: 'f3', name: 'P3', role: 'fielder', pos: { x: 60, y: 70 } },
  { id: 'f4', name: 'P4', role: 'fielder', pos: { x: 60, y: 30 } },
  { id: 'f5', name: 'P5', role: 'fielder', pos: { x: 45, y: 15 } },
  { id: 'f6', name: 'P6', role: 'fielder', pos: { x: 30, y: 25 } },
  { id: 'f7', name: 'P7', role: 'fielder', pos: { x: 75, y: 18 } },
];

const App: React.FC = () => {
  const [fielders, setFielders] = useState<Fielder[]>(INITIAL_FIELDERS);
  const [strategyName, setStrategyName] = useState("Captain's Game Plan 1");
  const [savedSetups, setSavedSetups] = useState<FieldSetup[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingFielderId, setEditingFielderId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('f15_sim_data');
    if (saved) setSavedSetups(JSON.parse(saved));
  }, []);

  const validateField = useCallback((): ValidationResult => {
    let offCount = 0;
    let legCount = 0;
    const errors: string[] = [];

    fielders.forEach(f => {
      if (f.role === 'fielder') {
        if (f.pos.y < PITCH_Y) legCount++;
        else if (f.pos.y > PITCH_Y) offCount++;
      }
    });

    if (offCount > 4) errors.push(`Max 4 fielders on Off side (Current: ${offCount})`);
    if (legCount > 4) errors.push(`Max 4 fielders on Leg side (Current: ${legCount})`);

    return {
      isValid: errors.length === 0,
      errors,
      counts: { off: offCount, leg: legCount }
    };
  }, [fielders]);

  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    setDraggedId(id);
    setEditingFielderId(id);
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggedId || !fieldRef.current) return;

    const rect = fieldRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setFielders(prev => prev.map(f => 
      f.id === draggedId ? { ...f, pos: { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) } } : f
    ));
  };

  const handleDragEnd = () => setDraggedId(null);

  const saveSetup = () => {
    const newSetup: FieldSetup = {
      id: crypto.randomUUID(),
      bowlerName: 'N/A',
      strategyName,
      fielders: JSON.parse(JSON.stringify(fielders)),
      timestamp: Date.now()
    };
    const updated = [newSetup, ...savedSetups];
    setSavedSetups(updated);
    localStorage.setItem('f15_sim_data', JSON.stringify(updated));
  };

  const loadSetup = (setup: FieldSetup) => {
    setFielders(setup.fielders);
    setStrategyName(setup.strategyName);
    setEditingFielderId(null);
  };

  const deleteSetup = (id: string) => {
    const updated = savedSetups.filter(s => s.id !== id);
    setSavedSetups(updated);
    localStorage.setItem('f15_sim_data', JSON.stringify(updated));
  };

  const downloadSetupImage = async (setup: FieldSetup) => {
    // Load the setup first
    loadSetup(setup);
    
    // Set capturing state to trigger visual feedback (outside captured area)
    setIsCapturing(true);
    setEditingFielderId(null);
    
    setTimeout(async () => {
      if (!fieldRef.current) return;
      try {
        const canvas = await html2canvas(fieldRef.current, {
          backgroundColor: '#020617',
          scale: 3, 
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `F15_${setup.strategyName.replace(/\s+/g, '_')}.png`;
        link.click();
      } catch (err) {
        console.error("Capture failed", err);
      } finally {
        setIsCapturing(false);
      }
    }, 400); // Slight delay for rendering to finish
  };

  const validation = validateField();

  const handleFielderNameChange = (id: string, newName: string) => {
    setFielders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar Panel */}
      <div className="w-full lg:w-[320px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-hidden shadow-2xl z-10">
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white uppercase italic leading-tight">F15 Field Simulator</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Captain's Command Center</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Active Plan Name</label>
          <input 
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            placeholder="e.g. In-swinger Trap"
          />
        </div>

        {/* Validation Shield */}
        <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${validation.isValid ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/20 border-rose-500/30 text-rose-400'}`}>
          {validation.isValid ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
          <div className="text-[10px] uppercase font-bold tracking-tight">
            <p className="mb-1">{validation.isValid ? 'Layout Legal' : 'Illegal Setup'}</p>
            <div className="flex gap-2 opacity-80">
              <span>OFF: {validation.counts.off}/4</span>
              <span>LEG: {validation.counts.leg}/4</span>
            </div>
          </div>
        </div>

        {/* Command Actions */}
        <div className="shrink-0 space-y-3">
          <button 
            onClick={saveSetup} 
            disabled={!validation.isValid} 
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-xl font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 border border-emerald-400/20"
          >
            <Save className="w-4 h-4" /> Save To Library
          </button>
        </div>

        {/* Help Tip */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <UserCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactics Guide</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Drag players to set your field. Use the <ImageIcon className="inline w-3 h-3 mx-1"/> button in the library to export a high-res screenshot.
          </p>
        </div>

        {/* Library Mini-Shelf */}
        <div className="shrink-0 space-y-3 mt-auto border-t border-slate-800 pt-5 flex-1 flex flex-col min-h-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Saved Match Plans</label>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
            {savedSetups.length === 0 ? (
              <p className="text-slate-600 text-[9px] italic py-2 px-1">No saved plans yet.</p>
            ) : (
              savedSetups.map(setup => (
                <div key={setup.id} className="group flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-700/60 rounded-lg transition-all border border-slate-800">
                  <div className="cursor-pointer overflow-hidden flex-1" onClick={() => loadSetup(setup)}>
                    <p className="text-[10px] font-bold truncate leading-tight group-hover:text-emerald-400">{setup.strategyName}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{new Date(setup.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadSetupImage(setup); }} 
                      disabled={isCapturing}
                      className="p-1.5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Download Screenshot"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteSetup(setup.id); }} 
                      className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Field Visualization */}
      <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4 lg:p-10 overflow-hidden">
        {/* The Field Container being captured */}
        <div 
          ref={fieldRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleDragEnd}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleDragEnd}
          className="field-container select-none relative"
          style={{ width: 'min(92vh, 92vw)' }}
          onClick={() => setEditingFielderId(null)}
        >
          {/* SVG Field Implementation for high-quality export */}
          <svg className="field-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="grassGrad" cx="30%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#15803d" />
                <stop offset="100%" stopColor="#166534" />
              </radialGradient>
              <pattern id="grassStripe" x="0" y="0" width="10" height="100" patternUnits="userSpaceOnUse">
                <rect width="5" height="100" fill="rgba(255,255,255,0.03)" />
              </pattern>
              <radialGradient id="dirtGrad" cx="40%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
            </defs>
            
            {/* Outfield Grass */}
            <path 
              d="M 5 20 Q 30 5 70 5 Q 85 10 93 25 Q 96 50 93 75 Q 85 90 70 95 Q 40 95 5 80 Z" 
              fill="url(#grassGrad)" 
            />
            <path 
              d="M 5 20 Q 30 5 70 5 Q 85 10 93 25 Q 96 50 93 75 Q 85 90 70 95 Q 40 95 5 80 Z" 
              fill="url(#grassStripe)" 
            />

            {/* Infield Dirt */}
            <ellipse cx="32" cy="50" rx="22" ry="25" fill="url(#dirtGrad)" fillOpacity="0.8" />
            
            {/* Boundary Outline */}
            <path 
              d="M 5 20 Q 30 5 70 5 Q 85 10 93 25 Q 96 50 93 75 Q 85 90 70 95 Q 40 95 5 80 Z" 
              fill="none" 
              stroke="white" 
              strokeWidth="0.4" 
              strokeOpacity="0.4"
            />

            {/* Pitch */}
            <rect x="21" y="46" width="18" height="8" fill="#fbbf24" stroke="#92400e" strokeWidth="0.3" rx="0.5" />
            <line x1="21.5" y1="46" x2="21.5" y2="54" stroke="white" strokeWidth="0.2" />
            <line x1="38.5" y1="46" x2="38.5" y2="54" stroke="white" strokeWidth="0.2" />
            
            {/* Pitch Text */}
            <text x="30" y="50.8" fontSize="1.5" fontWeight="900" fill="#92400e" textAnchor="middle" opacity="0.3" letterSpacing="0.2">PITCH</text>
            
            {/* Stumps */}
            <circle cx="21.5" cy="48.5" r="0.2" fill="black" />
            <circle cx="21.5" cy="50" r="0.2" fill="black" />
            <circle cx="21.5" cy="51.5" r="0.2" fill="black" />
            
            <circle cx="38.5" cy="48.5" r="0.2" fill="black" />
            <circle cx="38.5" cy="50" r="0.2" fill="black" />
            <circle cx="38.5" cy="51.5" r="0.2" fill="black" />
          </svg>

          {/* Markers */}
          <div className="dist-marker left-[40%] top-[94%]">140 ft</div>
          <div className="dist-marker left-[75%] top-[90%]">165 ft</div>
          
          {/* Fielder Interaction Layer */}
          {fielders.map(f => (
            <div
              key={f.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-transform 
                ${draggedId === f.id ? 'scale-110 z-50' : ''}
                ${editingFielderId === f.id ? 'z-50' : ''}`}
              style={{ left: `${f.pos.x}%`, top: `${f.pos.y}%` }}
            >
              <div className="relative group flex flex-col items-center">
                <div 
                  onMouseDown={(e) => handleDragStart(f.id, e)}
                  onTouchStart={(e) => handleDragStart(f.id, e)}
                  className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 flex items-center justify-center shadow-2xl transition-all duration-200 cursor-grab active:cursor-grabbing
                    ${editingFielderId === f.id ? 'ring-4 ring-emerald-500/50 border-emerald-400 scale-105 shadow-emerald-900/40' : 'hover:scale-105'}
                    ${f.role === 'bowler' ? 'bg-amber-500 border-amber-300 text-amber-950' : 
                      f.role === 'keeper' ? 'bg-sky-500 border-sky-300 text-sky-950' : 
                      'bg-slate-50 border-slate-300 text-slate-900 shadow-sm'}`}
                >
                  <span className="text-[10px] lg:text-[12px] font-black pointer-events-none uppercase">
                    {f.role === 'bowler' ? 'B' : f.role === 'keeper' ? 'W' : f.id.replace('f','')}
                  </span>
                </div>
                
                {/* On-field Name Input */}
                <div 
                  onClick={(e) => { e.stopPropagation(); setEditingFielderId(f.id); }}
                  className={`mt-2 transition-all ${editingFielderId === f.id ? 'scale-105' : ''}`}
                >
                  {editingFielderId === f.id ? (
                    <input
                      autoFocus
                      value={f.name}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleFielderNameChange(f.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingFielderId(null)}
                      className="bg-slate-900/95 backdrop-blur-md text-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-center border-2 border-emerald-500 shadow-2xl outline-none w-24 uppercase"
                    />
                  ) : (
                    <div className="bg-slate-900/80 backdrop-blur-md text-slate-100 px-3 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border border-white/10 shadow-xl opacity-90 hover:opacity-100 cursor-text transition-opacity uppercase">
                      {f.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Capture Overlay (Moved OUTSIDE fieldRef so it's not captured in the image) */}
        {isCapturing && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-400">Exporting Plan</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generating High-Res Capture...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Schematic Footer Reference */}
        <div className="absolute bottom-6 left-8 flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl p-3 rounded-xl border border-white/5">
           <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             F15 Schematic Engine • PNG Snapshots Enabled
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
