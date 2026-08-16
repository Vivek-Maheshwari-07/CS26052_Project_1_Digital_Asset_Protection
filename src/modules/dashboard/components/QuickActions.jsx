import React from 'react';
import Button from '../../../components/common/Button';

const QuickActions = () => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Button variant="primary" size="md">
        Register Original Work
      </Button>

      <Button variant="secondary" size="md">
        Verify Suspicious Image
      </Button>
    </div>
  );
};

export default QuickActions;
