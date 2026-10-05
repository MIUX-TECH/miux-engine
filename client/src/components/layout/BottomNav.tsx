import React from 'react';

type NavPage = 'create' | 'library';

interface BottomNavProps {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
}

const NavButton = ({ page, label, icon, activePage, setActivePage }: { page: NavPage, label: string, icon: React.ReactNode, activePage: NavPage, setActivePage: (page: NavPage) => void }) => (
  <button 
      onClick={() => setActivePage(page)}
      className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${activePage === page ? 'text-neon scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
  >
      {icon}
      <span className={`text-[9px] font-bold uppercase tracking-widest ${activePage === page ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton 
            page="create" 
            label="Create" 
            activePage={activePage}
            setActivePage={setActivePage}
            icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
            }
          />
          <NavButton 
            page="library" 
            label="Library" 
            activePage={activePage}
            setActivePage={setActivePage}
            icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
            }
          />
      </div>
    </div>
  );
};

export default BottomNav;
