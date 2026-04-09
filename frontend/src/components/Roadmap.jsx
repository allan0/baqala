import React from 'react';

const WebApp = window.Telegram?.WebApp;

export default function Roadmap({ setCurrentView }) {
  
  const handleBack = () => {
    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
    setCurrentView('dashboard');
  };

  // Centralized data makes it easy to update your roadmap later!
  const roadmapData =[
    {
      phase: 1,
      title: "Luxury Foundation & Security",
      status: "completed",
      icon: "✓",
      color: "var(--logo-teal)",
      items:[
        "Luxury dark UI with shining gradients & glassmorphism.",
        "Telegram Auth & Secure API interceptors.",
        "Persistent Backend Database integration.",
        "Dual-role ecosystem (Customer & Vendor)."
      ]
    },
    {
      phase: 2,
      title: "Commerce & Web3 Layer",
      status: "completed",
      icon: "✓",
      color: "var(--logo-teal)",
      items:[
        "Floating Shopping Cart & dynamic checkout.",
        "Native Telegram QR Code Scanner for Baqalas.",
        "Web3 Wallet (MetaMask) Connection.",
        "Crypto micro-settlements for Hisaab."
      ]
    },
    {
      phase: 3,
      title: "AI & Smart Experience",
      status: "in-progress",
      icon: "⚙️",
      color: "var(--logo-orange)",
      items:[
        "In-App AI Voice Ordering & Chat Interface.",
        "Order History + Beautiful Digital Receipts.",
        "Loyalty Points & Family Profile Sharing.",
        "Automated Telegram Push Notifications."
      ]
    },
    {
      phase: 4,
      title: "Full Decentralization",
      status: "planned",
      icon: "🔮",
      color: "#64748b",
      items:[
        "Smart Contract Deployment (Base/Polygon).",
        "Chainlink AED/Crypto Price Oracles.",
        "Baqala B2B Marketplace & Restocking.",
        "DeFi Micro-loans based on Hisaab scores."
      ]
    }
  ];

  return (
    <div className="app-container" style={{ paddingBottom: '80px' }}>
      
      {/* Header with Back Button */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '30px', padding: '0 10px'
      }}>
        <button 
          className="btn-text" 
          onClick={handleBack}
          style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back
        </button>
        <img src="/baqalaslogo.png" alt="Baqala Network" style={{ height: '38px', width: 'auto', borderRadius: '6px' }} onError={(e) => e.target.style.display = 'none'} />
      </div>

      {/* Title Area */}
      <h1 style={{ 
        textAlign: 'center', marginBottom: '10px',
        background: 'var(--shining-gradient)', backgroundSize: '200% 200%', animation: 'shine 3s linear infinite',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px'
      }}>
        🚀 Project Roadmap
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--lux-hint)', marginBottom: '40px', fontSize: '15px' }}>
        Building the future of UAE baqalas — one premium step at a time.
      </p>

      {/* Roadmap Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {roadmapData.map((data) => {
          const isCompleted = data.status === 'completed';
          const isInProgress = data.status === 'in-progress';
          
          return (
            <div 
              key={data.phase} 
              className="card" 
              style={{ 
                borderLeft: `5px solid ${data.color}`, 
                opacity: data.status === 'planned' ? 0.6 : 1,
                boxShadow: isInProgress ? '0 10px 30px -10px rgba(255, 107, 0, 0.2)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', 
                    background: data.color, color: 'white',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '14px',
                    boxShadow: isInProgress ? '0 0 15px rgba(255, 107, 0, 0.6)' : 'none'
                  }}>
                    {data.icon}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--lux-text)' }}>Phase {data.phase}: {data.title}</h3>
                </div>
              </div>
              
              <ul style={{ paddingLeft: '20px', color: 'var(--lux-hint)', lineHeight: '1.7', fontSize: '14px', marginBottom: '15px' }}>
                {data.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              
              <small style={{ 
                color: isCompleted ? 'var(--logo-teal)' : (isInProgress ? 'var(--logo-orange)' : 'var(--lux-hint)'), 
                fontWeight: 700, 
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {isCompleted && "✓ Completed"}
                {isInProgress && "⚡ In Progress"}
                {data.status === 'planned' && "⏳ Planned"}
              </small>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--lux-hint)', fontSize: '13px' }}>
        Built with ❤️ for the UAE Baqala Community
      </div>
    </div>
  );
}
