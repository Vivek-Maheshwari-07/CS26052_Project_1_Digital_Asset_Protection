import React from 'react';

export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-800/60 border border-slate-700/30 ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-3">
      <Skeleton className="w-full aspect-[4/3] rounded-xl" />
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="w-1/3 h-4" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    </div>
  );
};

export default Skeleton;
