import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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

export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Nama lengkap wajib diisi.';
    if (!email.trim()) newErrors.email = 'Alamat email wajib diisi.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Format email tidak sah.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    
    try {
      const result = await apiService.post('/api/update-profile', {
        id: user.id,
        name: name.trim(),
        email: email.trim()
      });

      updateUser(result.user);
      setSaved(true);
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setSaved(false));
    } catch (error) {
      Alert.alert('Gagal Sinkronisasi', error.message || 'Terjadi kesalahan pada sistem kearsipan.');
    } finally {
      setLoading(false);
    }
  };

  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Back Row */}
          <Animated.View style={[styles.backRow, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>KEMBALI KE DIREKTORI</Text>
            </TouchableOpacity>
            <View style={styles.thinDivider} />
          </Animated.View>

          {/* Header Section */}
          <Animated.View
            style={[
              styles.avatarSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.headerLabel}>PROFIL PENGGUNA</Text>
            <Text style={styles.avatarName}>{user?.name}</Text>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
          </Animated.View>

          {/* Success Banner */}
          <Animated.View style={[styles.successBanner, { opacity: successAnim }]}>
            <Text style={styles.successText}>✓ Data identitas berhasil diperbarui dalam arsip.</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.cardTitle}>Edit Profil</Text>
            <View style={styles.cardDivider} />

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NAMA LENGKAP PENGGUNA</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: null })); }}
                placeholder="Nama Lengkap"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ALAMAT EMAIL RESMI</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: null })); }}
                placeholder="email@institusi.ac.id"
                placeholderTextColor="#A0A0A0"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.buttonDisabled]} 
              onPress={handleSave} 
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>PERBARUI DATA ARSIP</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Legal Card */}
          <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
            <Text style={styles.infoIcon}>⚖️</Text>
            <Text style={styles.infoText}>
              Perubahan pada data profil akan disinkronkan dengan database pusat secara real-time untuk keperluan validasi sirkulasi literatur.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 25, paddingTop: 60, paddingBottom: 40 },
  backRow: { marginBottom: 30 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backArrow: { fontSize: 40, color: COLORS.primary, fontWeight: '300' },
  backText: { fontSize: 11, color: COLORS.primary, fontWeight: '800', letterSpacing: 1.5, marginLeft: 10 },
  thinDivider: { height: 1, backgroundColor: COLORS.primary, opacity: 0.2 },
  avatarSection: { alignItems: 'center', marginBottom: 35 },
  avatarBox: {
    width: 90,
    height: 90,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, fontFamily: serifFont },
  headerLabel: { fontSize: 10, fontWeight: '900', color: COLORS.secondary, letterSpacing: 2, marginBottom: 5 },
  avatarName: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, fontFamily: serifFont },
  avatarEmail: { fontSize: 13, color: COLORS.textLight, marginTop: 4, fontStyle: 'italic' },
  successBanner: {
    backgroundColor: '#F0F4F0',
    padding: 15,
    borderWidth: 1,
    borderColor: '#C0D0C0',
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: { fontSize: 13, fontWeight: 'bold', color: '#2E7D32', fontStyle: 'italic' },
  card: {
    backgroundColor: COLORS.card,
    padding: 25,
    borderLeftWidth: 10,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 25,
    width: Platform.OS === 'web' ? 500 : '100%',
    alignSelf: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5 },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  fieldGroup: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 11, color: COLORS.error, marginTop: 6, fontStyle: 'italic' },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.8 },
  saveButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  infoCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(101, 109, 74, 0.05)',
    borderWidth: 0.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    gap: 15,
    width: Platform.OS === 'web' ? 500 : '100%',
    alignSelf: 'center',
  },
  infoIcon: { fontSize: 24 },
  infoText: { flex: 1, fontSize: 11, color: COLORS.textLight, lineHeight: 18, fontStyle: 'italic' },
});
