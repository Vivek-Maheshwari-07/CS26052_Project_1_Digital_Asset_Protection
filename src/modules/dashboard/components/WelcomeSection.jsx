import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

const WelcomeSection = () => {
  const { user } = useAuth();
  const userName = user?.name || 'Manav';

  return (
    <div className="space-y-1 py-2">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#111111]">
        Welcome back, {userName}
      </h1>
      <p className="text-sm text-[#666666]">
        Protect and verify digital assets.
      </p>
    </div>
  );
};

export default WelcomeSection;
