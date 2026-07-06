import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  useEffect(() => {
    // Test localStorage access on web
    if (Platform.OS === 'web') {
      try {
        console.log('[APP] Platform: WEB');
        console.log('[APP] localStorage available:', !!window.localStorage);
        
        // Test write/read
        window.localStorage.setItem('_test_', 'value');
        const testRead = window.localStorage.getItem('_test_');
        console.log('[APP] localStorage test:', testRead === 'value' ? 'OK' : 'FAILED');
        window.localStorage.removeItem('_test_');
      } catch (e) {
        console.error('[APP] localStorage error:', e);
      }
    } else {
      console.log('[APP] Platform: MOBILE');
    }
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

// Perbaikan untuk error "main has not been registered"
registerRootComponent(App);

export default App;
