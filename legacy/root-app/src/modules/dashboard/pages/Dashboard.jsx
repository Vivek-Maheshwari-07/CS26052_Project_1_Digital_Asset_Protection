import React, { useState } from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import QuickActions from '../components/QuickActions';
import ActivityLog from '../components/ActivityLog';

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <PageContainer searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
      <div className="space-y-6">
        {/* Quick Action Buttons */}
        <QuickActions />

        {/* System Activity & Provenance Log Table */}
        <ActivityLog />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
