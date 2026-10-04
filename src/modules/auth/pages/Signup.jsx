import React from 'react';
import SignupForm from '../components/SignupForm';

const Signup = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Simple Centered Card */}
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#111111]">AI Provenance</h1>
            <p className="text-xs text-[#666666]">Protect your digital work</p>
          </div>

          <SignupForm />
        </div>
      </div>
    </div>
  );
};

export default Signup;
