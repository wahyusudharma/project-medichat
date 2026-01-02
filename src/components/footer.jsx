import React from 'react';
import logoImage from '../assets/images/LogoMedicare Putih.png';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <a href="#home" className="footer-logo">
            <img 
              src={logoImage} 
              alt="MediChat Logo" 
              className="header-logo"
              style={{ 
                cursor: 'pointer',
                width: '300px',
                height: 'auto'
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/50x50/2a5298/ffffff?text=MC";
              }}
            />
            </a>
          <p className="footer-tagline">
            MediChat dapat membantu kesehatan, meningkatkan kualitas hidup, 
            dan memberikan akses ke profesional medis terpercaya.
          </p>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            &copy; {new Date().getFullYear()} MediChat. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;