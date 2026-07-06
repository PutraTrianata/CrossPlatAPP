import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const COLORS = {
  background: '#F1F2ED', // Light Sage/Cream
  primary: '#656D4A',    // Dark Olive Green
  secondary: '#C2C5AA',  // Sage Green
  accent: '#414833',     // Deep Moss
  text: '#1A1A1A',       // Deep Charcoal
  textLight: '#545454',
  card: '#FFFFFF',
  border: '#C2C5AA',
  error: '#B71C1C',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email wajib diisi.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Format email tidak valid.';
    if (!password.trim()) newErrors.password = 'Kata sandi wajib diisi.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    
    try {
      console.log('[LOGIN] Attempting login with email:', email);
      const result = await apiService.post('/api/login', {
        email: email,
        password: password
      });
      console.log('[LOGIN] Login successful:', result.user.email);
      login(result.user);
      console.log('[LOGIN] User set in context');
    } catch (error) {
      const errorMsg = error.message || 'Koneksi ke server bermasalah.';
      console.error('[LOGIN] Login failed:', errorMsg);
      if (Platform.OS === 'web') {
        alert('Otentikasi Gagal\n\n' + errorMsg);
      } else {
        Alert.alert('Otentikasi Gagal', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🏛️</Text>
            </View>
            <Text style={styles.appName}>MyLibrary</Text>
            <View style={styles.headerDivider} />
            <Text style={styles.tagline}>Sistem Informasi Arsip & Literatur</Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={styles.cardTitle}>Masuk ke Sistem</Text>
            <Text style={styles.cardSubtitle}>Gunakan kredensial resmi institusi Anda</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL PENGGUNA</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="nama@email.com"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: null })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>KATA SANDI</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
                secureTextEntry
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Register')}
              style={styles.registerLink}
            >
              <Text style={styles.registerLinkText}>
                Belum terdaftar? <Text style={styles.registerLinkBold}>Registrasi Akun Baru</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Unit Perpustakaan Digital © 2024</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 4,
    fontFamily: serifFont,
  },
  headerDivider: {
    height: 1.5,
    width: 60,
    backgroundColor: COLORS.secondary,
    marginVertical: 12,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderLeftWidth: 8,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: Platform.OS === 'web' ? 450 : '100%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 30,
    fontStyle: 'italic',
  },
  fieldGroup: { marginBottom: 20 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 11, color: COLORS.error, marginTop: 6, fontStyle: 'italic' },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.8 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  registerLink: {
    marginTop: 25,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  registerLinkText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  registerLinkBold: {
    color: COLORS.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: {
    fontSize: 10,
    color: COLORS.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
