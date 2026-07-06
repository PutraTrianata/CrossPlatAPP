import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScanScreen from '../screens/ScanScreen';
import BookListScreen from '../screens/BookListScreen';
import BorrowScreen from '../screens/BorrowScreen';
import BorrowListScreen from '../screens/BorrowListScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading, isInitialized } = useAuth();

  console.log('[NAV] Render - user:', !!user, 'loading:', loading, 'initialized:', isInitialized);

  // Show loading while restoring auth state
  if (loading || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F2ED' }}>
        <ActivityIndicator size="large" color="#656D4A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="BookList" component={BookListScreen} />
            <Stack.Screen name="Borrow" component={BorrowScreen} />
            <Stack.Screen name="BorrowList" component={BorrowListScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
