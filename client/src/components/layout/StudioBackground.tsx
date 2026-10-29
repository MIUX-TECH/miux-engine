import React from 'react';

const StudioBackground: React.FC = () => {
  return (
    <>
      <div className="fixed inset-0 w-full h-full bg-[#070709] -z-20"></div>
      <div className="fixed inset-0 w-full h-full cyber-grid pointer-events-none -z-15 opacity-25"></div>
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-10 -left-20 w-[500px] h-[500px] bg-red-950/20 rounded-full mix-blend-screen filter blur-[150px]"></div>
          <div className="absolute bottom-10 -right-20 w-[600px] h-[600px] bg-zinc-900/40 rounded-full mix-blend-screen filter blur-[180px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-50 contrast-200"></div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent animate-cyber-scan blur-[1px]"></div>
      </div>
    </>
  );
};

export default StudioBackground;
