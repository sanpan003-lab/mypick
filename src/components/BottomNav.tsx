import { Map, Trees, MapPin, BookOpen } from 'lucide-react';

export type Tab = 'explorer' | 'mytrees' | 'save_location' | 'journal';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const navItems = [
    { id: 'explorer', label: 'EXPLORER', icon: Map },
    { id: 'mytrees', label: 'MY TREES', icon: Trees },
    { id: 'save_location', label: 'SAVE', icon: MapPin },
    { id: 'journal', label: 'JOURNAL', icon: BookOpen },
  ] as const;

  return (
    <div className="flex flex-col w-full shrink-0 z-[100] pointer-events-none">
      <div className="bg-[#fdfbf7] flex justify-between items-stretch pb-[env(safe-area-inset-bottom,20px)] pt-3 px-2 rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] border-t border-[#e8e4d9] min-h-[90px] pointer-events-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center justify-center relative group outline-none"
            >
              <div className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-full max-w-[85px] py-2.5 rounded-2xl ${
                isActive ? 'bg-[#0a3610] text-white shadow-lg shadow-[#0a3610]/20 scale-105' : 'text-[#6b4c3a] hover:text-[#0a3610]'
              }`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-white' : 'text-[#6b4c3a]'}`}>
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
