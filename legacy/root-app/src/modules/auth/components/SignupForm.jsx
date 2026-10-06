import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../../../hooks/useAuth';
import { isValidEmail, isValidPassword, doPasswordsMatch, isNotEmpty } from '../../../utils/validators';

const SignupForm = () => {
  const { signup, loginWithGoogle, authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    if (!isNotEmpty(formData.name)) {
      newErrors.name = 'Name is required';
    }

    if (!isNotEmpty(formData.email)) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!isNotEmpty(formData.password)) {
      newErrors.password = 'Password is required';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!doPasswordsMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setFormError('');
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Signup failed. Please try again.');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setFormError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setFormError('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Manav"
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@company.com"
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

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          error={errors.confirmPassword}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2"
          isLoading={authLoading}
        >
          Create Account
        </Button>
      </form>

      <GoogleLoginButton onClick={handleGoogleAuth} isLoading={authLoading} text="Continue with Google" />

      <div className="text-center pt-2">
        <p className="text-xs text-[#666666]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#111111] font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
