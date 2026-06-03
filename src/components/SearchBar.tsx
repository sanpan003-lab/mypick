import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Filter by species or location…' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute top-4 left-4 right-4 z-[25]">
      <div className="bg-[#fdfbf7]/95 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.10)] flex items-center px-4 py-3 border border-[#e8e4d9] gap-3">
        <Search size={18} className="text-[#0a3610] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none text-[#0a3610] bg-transparent placeholder-gray-400 text-sm font-medium min-w-0"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
