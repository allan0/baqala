import React, { useEffect, useRef } from 'react';

export default function TelegramLogin({ botName, onAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Define the global callback for Telegram widget
    window.onTelegramAuth = (user) => {
      if (onAuth) onAuth(user);
    };

    // Only inject the script once
    if (containerRef.current && containerRef.current.children.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botName);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-userpic', 'true');        // Show user avatar
      script.setAttribute('data-radius', '12');           // Rounded corners
      script.async = true;
      
      containerRef.current.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, onAuth]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center',
        marginTop: '10px'
      }}
    />
  );
}
