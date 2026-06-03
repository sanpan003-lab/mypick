import { TreeDetails } from '../types/trees';
import { MapPin, X } from 'lucide-react';

interface DetailsCardProps {
  details: TreeDetails;
  imageUrl?: string;
  onSave: () => void;
  onCancel: () => void;
}

export function DetailsCard({ details, imageUrl, onSave, onCancel }: DetailsCardProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[90] bg-[#fdfbf7] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto pb-32 flex flex-col">
      <div className="sticky top-0 bg-[#fdfbf7]/90 backdrop-blur-md pt-6 pb-4 px-8 flex justify-between items-center z-10">
        <h2 className="font-serif italic text-3xl text-[#0a3610] truncate pr-4">{details.commonName}</h2>
        <button onClick={onCancel} className="p-2 bg-[#f4f1e8] rounded-full text-[#0a3610] hover:bg-[#e8e4d9] transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="px-8 pb-8 space-y-6">
        {imageUrl && (
          <div className="w-full h-56 rounded-3xl overflow-hidden shadow-sm">
            <img src={imageUrl} alt="Scanned tree" className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest mb-1">Scientific Name</p>
          <p className="text-lg text-[#0a3610] italic">{details.scientificName}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest mb-2">Botanical Description</p>
          <p className="text-gray-700 leading-relaxed text-sm">{details.description}</p>
        </div>

        <div className="bg-[#f4f1e8] rounded-3xl p-6 border border-[#e8e4d9]">
          <div>
            <p className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest mb-1">Description</p>
            <p className="text-[#0a3610] text-sm font-medium">{details.description || 'No details available.'}</p>
          </div>
        </div>

        <button 
          onClick={onSave}
          className="w-full bg-[#0a3610] hover:bg-[#052e16] text-white font-semibold py-4 rounded-full shadow-[0_8px_20px_rgba(10,54,16,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95 mt-4"
        >
          Close Details
        </button>
      </div>
    </div>
  );
}
