import { useEffect, useState } from 'react';
import supabase from '../supabaseClient'; // Ensure you have this client exported

const WebApp = window.Telegram?.WebApp;

export function useRealtimeSync(baqalaId, role) {
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!baqalaId) return;

    // 1. Subscribe to the 'Orders' channel
    const channel = supabase
      .channel('baqala-changes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'unpaid_items', 
          filter: `baqala_id=eq.${baqalaId}` 
        }, 
        (payload) => {
          handleDataChange(payload);
        }
      )
      .subscribe();

    const handleDataChange = (payload) => {
      setLastUpdate(Date.now());
      
      // Haptic Feedback based on role
      if (role === 'vendor' && payload.eventType === 'INSERT') {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
        WebApp?.showAlert("🏪 New Hisaab Order Received!");
      }
    };

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [baqalaId, role]);

  return lastUpdate;
}
