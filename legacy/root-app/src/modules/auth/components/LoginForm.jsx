import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../../../hooks/useAuth';
import { isValidEmail, isNotEmpty } from '../../../utils/validators';

const LoginForm = () => {
  const { login, loginWithGoogle, authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (formError) setFormError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!isNotEmpty(formData.email)) {
      newErrors.email = 'Email address is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isNotEmpty(formData.password)) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setFormError('');
      await login({ email: formData.email, password: formData.password });
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setFormError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setFormError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="email@example.com"
          error={errors.email}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          error={errors.password}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={authLoading}
        >
          Login
        </Button>
      </form>

      <GoogleLoginButton onClick={handleGoogleAuth} isLoading={authLoading} />

      <div className="text-center pt-2 space-y-2">
        <div>
          <Link
            to="/forgot-password"
            className="text-xs text-[#666666] hover:text-[#111111] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <p className="text-xs text-[#666666]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#111111] font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
