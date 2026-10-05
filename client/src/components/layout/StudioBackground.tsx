import React from 'react';

const StudioBackground: React.FC = () => {
  return (
    <>
      <div className="fixed inset-0 w-full h-full bg-dark -z-20"></div>
      <div className="fixed inset-0 w-full h-full cyber-grid pointer-events-none -z-15 opacity-40"></div>
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-neon/5 rounded-full mix-blend-screen filter blur-[150px] animate-pulse-neon"></div>
          <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-neon/5 rounded-full mix-blend-screen filter blur-[180px] animate-pulse-neon" style={{animationDelay: '2s'}}></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-50 contrast-200"></div>
          <div className="w-full h-1 bg-neon/20 animate-cyber-scan blur-[1px]"></div>
      </div>
    </>
  );
};

export default StudioBackground;
