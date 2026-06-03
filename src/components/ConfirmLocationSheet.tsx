import { MapPin, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo, useDragControls } from 'motion/react';

interface Props {
  onCancel: () => void;
  onNext: () => void;
  onEdit: () => void;
  onManualChange: (lat: number, lng: number) => void;
  lat: number;
  lng: number;
  address?: string;
}

export function ConfirmLocationSheet({ onCancel, onNext, onEdit, onManualChange, lat, lng, address }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [manualLat, setManualLat] = useState(lat.toString());
  const [manualLng, setManualLng] = useState(lng.toString());
  const controls = useAnimation();
  const dragControls = useDragControls();

  const handleManualSubmit = () => {
    const parsedLat = parseFloat(manualLat);
    const parsedLng = parseFloat(manualLng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      onManualChange(parsedLat, parsedLng);
      setIsEditing(false);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;

    if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      controls.start('hidden').then(() => onCancel());
    } else {
      controls.start('expanded');
    }
  };

  const variants = {
    expanded: { y: 0 },
    hidden: { y: "100%" }
  };

  return (
    <motion.div 
      className="absolute bottom-0 left-0 right-0 z-[90] bg-[#fdfbf7] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pt-4 pb-32 px-8 flex flex-col max-h-[85vh]"
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial="expanded"
      variants={variants}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <div 
        className="w-full flex flex-col items-center cursor-grab active:cursor-grabbing shrink-0"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
        <h2 className="font-serif italic text-3xl text-[#0a3610] mb-2 w-full text-left">Confirm Location</h2>
      </div>

      <motion.div 
        className="flex-1 overflow-y-auto no-scrollbar pb-24"
      >
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Position the map to capture the exact coordinates.
        </p>
        
        <div className="bg-[#f4f1e8] rounded-2xl p-4 flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#e8e4d9] p-3 rounded-xl text-[#6b4c3a]">
              <MapPin size={24} className="fill-[#8b6b55] text-[#f4f1e8]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-widest text-[#0a3610] uppercase mb-1">Current Location</p>
              {!isEditing ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#0a3610] leading-tight">{address || 'Finding address...'}</p>
                  <p className="text-[10px] font-mono text-gray-500">
                    {Math.abs(lat).toFixed(4)}° {lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}° {lng >= 0 ? 'E' : 'W'}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={manualLat} 
                    onChange={(e) => setManualLat(e.target.value)}
                    className="flex-1 bg-white border border-[#e8e4d9] rounded px-2 py-1 text-sm font-mono"
                    placeholder="Lat"
                  />
                  <input 
                    type="number" 
                    value={manualLng} 
                    onChange={(e) => setManualLng(e.target.value)}
                    className="flex-1 bg-white border border-[#e8e4d9] rounded px-2 py-1 text-sm font-mono"
                    placeholder="Lng"
                  />
                </div>
              )}
            </div>
            {!isEditing ? (
              <button 
                onClick={() => {
                  setManualLat(lat.toString());
                  setManualLng(lng.toString());
                  setIsEditing(true);
                }}
                className="text-xs font-bold text-[#0a3610] uppercase tracking-wider hover:bg-[#e8e4d9] px-3 py-2 rounded-lg transition-colors"
              >
                Edit
              </button>
            ) : (
              <button 
                onClick={handleManualSubmit}
                className="text-xs font-bold text-white bg-[#0a3610] uppercase tracking-wider hover:bg-[#052e16] px-3 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            )}
          </div>
          
          <button 
            onClick={() => {
              onEdit();
              setIsEditing(false);
            }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#e8e4d9] text-[#0a3610] rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#d1cbb8] transition-colors"
          >
            <Navigation size={16} />
            Use Current Location
          </button>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => controls.start('hidden').then(() => onCancel())}
            className="flex-1 bg-[#f4f1e8] text-[#0a3610] font-bold uppercase tracking-wider py-4 rounded-full transition-colors hover:bg-[#e8e4d9] text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={onNext}
            className="flex-1 bg-[#0a3610] text-white font-bold uppercase tracking-wider py-4 rounded-full transition-colors hover:bg-[#052e16] text-sm shadow-lg shadow-[#0a3610]/20"
          >
            Next Step
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
