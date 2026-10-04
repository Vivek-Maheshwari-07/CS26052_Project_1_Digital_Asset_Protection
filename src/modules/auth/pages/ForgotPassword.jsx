import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { isValidEmail, isNotEmpty } from '../../../utils/validators';
import authService from '../authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isNotEmpty(email)) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await authService.sendPasswordReset(email);
      setIsSent(true);
    } catch (err) {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#111111]">Forgot Password</h1>
            <p className="text-xs text-[#666666]">Enter your email to receive a reset link</p>
          </div>

          {isSent ? (
            <div className="text-center space-y-4 py-2">
              <p className="text-xs text-[#666666]">
                A password reset link has been sent to <strong className="text-[#111111]">{email}</strong>.
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="email@example.com"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-[#666666] hover:text-[#111111] transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
