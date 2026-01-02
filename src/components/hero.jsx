import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleStartDiagnosis = () => {
    if (isLoggedIn) {
      navigate('/diagnosis');
    } else {
      navigate('/login');
    }
  };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Selamat Datang di MediChat</h1>
            <span className="hero-subtitle">Layanan kesehatan digital yang siap membantu Anda</span>
            <div className="hero-buttons-left">
              <button onClick={handleStartDiagnosis} className="primary-btn hero-diagnosis-btn">
                Mulai Diagnosis
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;