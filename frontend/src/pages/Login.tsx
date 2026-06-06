import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';

// Validate form inputs using Zod matching the backend schema
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        // Redirect based on user role
        if (result.role === 'ADMIN') {
          navigate('/admin');
        } else if (result.role === 'VENDOR') {
          navigate('/vendor/dashboard');
        } else {
          navigate('/shop');
        }
      }
    } catch (error) {
      // Errors are handled inside the auth context via toasts
      console.error('Login submit error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-form-content">
      <h2 className="form-card-title">Sign In</h2>
      <p className="form-card-subtitle">Access your payments dashboard</p>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message}
          icon={<Mail size={18} />}
          {...register('email')}
        />

        {/* Password Field */}
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          icon={<Lock size={18} />}
          {...register('password')}
        />

        {/* Submit button */}
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={<ArrowRight size={16} />}
          className="w-full mt-4"
        >
          Sign In to Account
        </Button>
      </form>

      <div className="auth-form-footer">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
