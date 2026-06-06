import React from 'react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}
const Loader: React.FC<LoaderProps> = ({ fullPage = false, message = 'Loading services...' }) => {
  if (fullPage) {
    return (
      <div className="loader-full-page">
        <div className="loader-container">
          <div className="loader-glow"></div>
          <div className="loader-spinner"></div>
          {message && <p className="loader-text">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loader-element">
      <div className="loader-spinner"></div>
      {message && <p className="loader-text">{message}</p>}
    </div>
  );
};

export default Loader;
