import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleGoBack = () => {
    switch (role) {
      case 'ADMIN':
        navigate('/admin');
        break;
      case 'VENDOR':
        navigate('/vendor/dashboard');
        break;
      case 'CUSTOMER':
        navigate('/shop');
        break;
      default:
        navigate('/login');
    }
  };

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-icon-wrapper">
          <ShieldAlert className="unauthorized-icon" size={64} />
        </div>
        <h2 className="unauthorized-title">Access Restricted</h2>
        <p className="unauthorized-desc">
          Your account role does not have authorization to view this resource. 
          Please contact system administration if you believe this is in error.
        </p>
        <div className="unauthorized-actions">
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={handleGoBack}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
