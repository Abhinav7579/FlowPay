import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserCheck, ArrowRight } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import type { UserRole } from '../types';

// Validate form inputs using Zod matching the backend schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'CUSTOMER',
    },
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setIsSubmitting(true);
    try {
      const success = await registerUser(data.name, data.email, data.password, data.role as UserRole);
      if (success) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration submit error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { value: 'CUSTOMER', label: 'CUSTOMER - Personal Buyer' },
    { value: 'VENDOR', label: 'VENDOR - Merchant/Store' },
    { value: 'ADMIN', label: 'ADMIN - Platform Auditor' },
  ];

  return (
    <div className="register-form-content">
      <h2 className="form-card-title">Create Account</h2>
      <p className="form-card-subtitle">Get started with FlowPay services</p>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        {/* Full Name Field */}
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          icon={<User size={18} />}
          {...register('name')}
        />

        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          placeholder="john@example.com"
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

        {/* Role Selection Dropdown */}
        <Input
          label="Account Role Type"
          options={roleOptions}
          error={errors.role?.message}
          icon={<UserCheck size={18} />}
          {...register('role')}
        />

        {/* Submit button */}
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={<ArrowRight size={16} />}
          className="w-full mt-4"
        >
          Register Account
        </Button>
      </form>

      <div className="auth-form-footer">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign In instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
