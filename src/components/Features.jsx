import React from 'react';
import diagImage from '../assets/images/picture1.jpg'; 
import consultImage from '../assets/images/picture2.jpg';

const Features = () => {
  const features = [
    {
      image: diagImage, 
      icon: "⚕️",
      title: "Diagnosis Akurat",
      description: "MediChat adalah perpaduan harmonis antara 'Medical' dan 'Chat', mencerminkan platform inovatif yang memungkinkan pengguna berinteraksi langsung dan cerdas seputar kesehatan. Nama ini menegaskan tujuan utama website, yaitu membantu pengguna mendapatkan informasi medis, melakukan pengecekan gejala awal, serta mendapatkan panduan kesehatan yang cepat, personal, dengan kecerdasan buatan berbasis pengetahuan medis tervalidasi."
    },
    {
      image: consultImage,
      icon: "💬",
      title: "Konsultasi Personal",
      description: "'MediChat' dirancang untuk memberikan pengalaman percakapan kesehatan yang aman, nyaman, dan bertanggung jawab. Setiap informasi dan panduan yang Anda terima disaring dari sumber medis terpercaya. MediChat memastikan interaksi Anda didasarkan pada pengetahuan medis yang tervalidasi."
    },
  ];

  return (
    <section className="features" id="features">
      <div className="container">
        <h2 className="section-title">Kenapa Memilih MediChat?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className={`feature-card feature-card-${index % 2 === 0 ? 'left' : 'right'}-image`} key={index}>
              <div className="feature-image-container">
                <img src={feature.image} alt={feature.title} className="feature-image" />
              </div>
              <div className="feature-text-content">
                <div className="feature-header">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                </div>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Features;