import React from 'react';

export default function Roadmap({ setCurrentView }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🚀 Project Roadmap</h1>
        <button className="btn-secondary mt-15" onClick={() => setCurrentView('dashboard')}>⬅ Back to Dashboard</button>
      </header>
      <div className="timeline">
        <div className="timeline-item completed">
          <div className="timeline-badge">✓</div>
          <div className="timeline-content">
            <h3>Phase 1: Foundation</h3>
            <p>Core infrastructure established.</p>
          </div>
        </div>
        <div className="timeline-item progress">
          <div className="timeline-badge">⚙️</div>
          <div className="timeline-content">
            <h3>Phase 2: Decentralization</h3>
            <p>Bridging the real world with Web3 & dynamic Crypto Payments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
