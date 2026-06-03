import { Menu, User } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <div className="bg-[#fdfbf7] px-6 py-4 flex items-center justify-center z-20 relative shrink-0 border-b border-[#e8e4d9] sticky top-0">
      <button 
        onClick={onMenuClick}
        className="absolute left-6 p-2 -ml-2 text-[#0a3610] hover:bg-[#e8e4d9] rounded-full transition-colors active:scale-90"
      >
        <Menu size={24} />
      </button>
      <h1 className="font-serif italic text-2xl text-[#0a3610] tracking-wide">My Pick</h1>
      <div className="absolute right-6 w-10 h-10" />
    </div>
  );
}
