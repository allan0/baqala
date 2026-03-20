import React, { useEffect, useRef } from 'react';

export default function TelegramLogin({ botName, onAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    window.onTelegramAuth = (user) => onAuth(user);
    
    if (containerRef.current && containerRef.current.children.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botName);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      containerRef.current.appendChild(script);
    }
  },[botName, onAuth]);

  return <div ref={containerRef} className="login-container" style={{ height: 'auto', minHeight: '50px' }}></div>;
}
