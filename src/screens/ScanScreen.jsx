import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});

// Web Camera Component dengan Scanning
const WebCameraView = React.forwardRef(({ onScan, onBackPress, onManualInput }, ref) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    // Load ZXing library (barcode decoding - supports EAN, Code128, UPC, dll)
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
    script.async = true;
    document.head.appendChild(script);

    // Initialize camera
    initCamera();

    return () => {
      if (scanIntervalRef.current) {
        if (typeof scanIntervalRef.current === 'number') {
          cancelAnimationFrame(scanIntervalRef.current);
        } else {
          clearInterval(scanIntervalRef.current);
        }
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        // Mulai scanning setelah video ready
        setTimeout(() => startScanning(), 1200);
      }
    } catch (error) {
      console.error('[WEB CAMERA ERROR]', error.message);
      setError('Kamera tidak terdeteksi atau izin ditolak. Gunakan Input Manual untuk melanjutkan.');
    }
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let lastScannedCode = '';
    let lastScannedTime = 0;

    // Gunakan ZXing jika tersedia
    if (window.ZXing) {
      try {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        console.log('ZXing reader initialized');

        // Mulai decode dari video element
        codeReader.decodeFromVideoElement(video, (result) => {
          if (result) {
            const scannedCode = result.getText();
            const now = Date.now();
            if (scannedCode && (scannedCode !== lastScannedCode || now - lastScannedTime > 2000)) {
              lastScannedCode = scannedCode;
              lastScannedTime = now;
              console.log('Barcode detected:', scannedCode);
              codeReader.reset();
              onScan(scannedCode);
              return;
            }
          }
        }, (error) => {
          // Continue scanning
        });
        return;
      } catch (err) {
        console.error('ZXing initialization error:', err);
      }
    }

    // Fallback: canvas-based frame processing
    startCanvasScanning();
  };

  const startCanvasScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let lastScannedCode = '';
    let lastScannedTime = 0;
    let frameCount = 0;

    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Proses setiap N frame untuk efisiensi
        if (frameCount % 3 === 0) {
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Coba dengan ZXing decodeSingle sebagai fallback
            if (window.ZXing) {
              try {
                const reader = new window.ZXing.BrowserMultiFormatReader();
                const luminanceSource = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
                const binaryBitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(luminanceSource));
                const result = reader.decodeWithState(binaryBitmap);
                
                if (result) {
                  const scannedCode = result.getText();
                  const now = Date.now();
                  if (scannedCode && (scannedCode !== lastScannedCode || now - lastScannedTime > 2000)) {
                    lastScannedCode = scannedCode;
                    lastScannedTime = now;
                    console.log('Canvas: Barcode detected:', scannedCode);
                    clearInterval(scanIntervalRef.current);
                    onScan(scannedCode);
                    return;
                  }
                }
              } catch (e) {
                // Ignore decode errors, continue scanning
              }
            }
          } catch (err) {
            console.error('Canvas frame processing error:', err);
          }
        }
        frameCount++;
      }
    }, 300);
  };

  return React.createElement('div', {
    ref: containerRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  },
    React.createElement('video', {
      ref: videoRef,
      autoPlay: true,
      playsInline: true,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }
    }),
    React.createElement('canvas', {
      ref: canvasRef,
      id: 'qr-reader',
      style: { display: 'none' }
    }),
    error ? React.createElement('div', {
      style: {
        position: 'absolute',
        backgroundColor: 'rgba(255,0,0,0.8)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '4px',
        bottom: 60,
        left: 20,
        right: 20,
        textAlign: 'center',
        fontSize: '12px',
        zIndex: 5
      }
    }, error) : null,
    React.createElement('button', {
      onClick: onBackPress,
      style: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        border: 'none',
        borderRadius: '50%',
        color: '#fff',
        fontSize: 20,
        cursor: 'pointer',
        fontWeight: 'bold',
        zIndex: 10,
      }
    }, '✕'),
    React.createElement('div', {
      style: {
        position: 'absolute',
        width: 280,
        height: 200,
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderColor: '#C2C5AA',
        borderRadius: 2,
        zIndex: 5
      }
    }),
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 200,
        textAlign: 'center',
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        zIndex: 5
      }
    }, 'Pindai Kode Arsip Literatur'),
    React.createElement('button', {
      onClick: onManualInput,
      style: {
        position: 'absolute',
        bottom: 80,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 30,
        paddingRight: 30,
        borderBottomWidth: 1,
        borderBottomStyle: 'solid',
        borderBottomColor: '#C2C5AA',
        backgroundColor: 'transparent',
        border: 'none',
        color: '#C2C5AA',
        fontWeight: 'bold',
        letterSpacing: 1,
        cursor: 'pointer',
        zIndex: 5,
        fontSize: 14
      }
    }, 'INPUT KODE MANUAL')
  );
});

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newStock, setNewStock] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  // Untuk web, bypass permission check
  if (Platform.OS !== 'web' && !permission) return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (Platform.OS !== 'web' && !permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.message}>Izin kamera diperlukan untuk sistem pengarsipan digital.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>BERI IZIN AKSES</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    processBarcode(data);
  };

  const processBarcode = async (barcode) => {
    setLoading(true);
    try {
      const result = await apiService.get(`/api/books/${barcode}`);
      if (result && result.success && result.book) {
        setLoading(false);
        Alert.alert(
          'Katalog Terdeteksi',
          `Buku "${result.book.title}" sudah terdaftar dalam arsip.\nPosisi Stok: ${result.book.stok}`,
          [{ text: 'KEMBALI', onPress: () => { setScanned(false); setManualBarcode(''); } }]
        );
      } else {
        handleFallbackSearch(barcode);
      }
    } catch (error) {
      handleFallbackSearch(barcode);
    }
  };

  const handleFallbackSearch = async (barcode) => {
    try {
      const dataOnline = await apiService.fetchExternalBook(barcode);
      setScannedBarcode(barcode);
      setNewStock(1);
      if (dataOnline) {
        setNewTitle(dataOnline.title);
        setNewAuthor(dataOnline.author);
      } else {
        setNewTitle('');
        setNewAuthor('');
      }
      setLoading(false);
      setModalVisible(true);
    } catch (e) {
      setLoading(false);
      setScannedBarcode(barcode);
      setModalVisible(true);
    }
  };

  const adjustStock = (val) => {
    if (newStock + val >= 1) setNewStock(newStock + val);
  };

  const handleSave = async () => {
    if (!newTitle.trim()) return Alert.alert('Peringatan', 'Judul literatur wajib diisi.');
    setLoading(true);
    try {
      await apiService.post('/api/books', {
        barcode: scannedBarcode,
        title: newTitle.trim(),
        author: newAuthor.trim() || 'Anonim',
        stok: newStock
      });

      setModalVisible(false);
      setScanned(false);
      setManualBarcode('');
      setNewTitle('');
      setNewAuthor('');
      setNewStock(1);

      if (Platform.OS === 'web') {
        setSuccessModalVisible(true);
      } else {
        Alert.alert('Berhasil', 'Data telah diarsipkan ke dalam sistem.', [{ text: 'SELESAI' }]);
      }
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan pada sistem pengarsipan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebCameraView onScan={processBarcode} onBackPress={() => navigation.goBack()} onManualInput={() => setManualInputModalVisible(true)} />
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128'] }}
          />
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Pindai Kode Arsip Literatur</Text>
            <TouchableOpacity style={styles.manualEntryBtn} onPress={() => setManualInputModalVisible(true)}>
              <Text style={styles.manualEntryText}>INPUT KODE MANUAL</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Registrasi Literatur Baru</Text>
              <View style={styles.divider} />
              <Text style={styles.modalSubtitle}>ID Katalog: {scannedBarcode}</Text>
              <Text style={styles.label}>JUDUL LITERATUR</Text>
              <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Judul Lengkap" />
              <Text style={styles.label}>PENULIS / OTORITAS</Text>
              <TextInput style={styles.input} value={newAuthor} onChangeText={setNewAuthor} placeholder="Nama Penulis" />
              <Text style={styles.label}>KUANTITAS STOK</Text>
              <View style={styles.stockSelector}>
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(-1)}><Text style={styles.stockBtnText}>−</Text></TouchableOpacity>
                <TextInput style={styles.stockInputText} value={String(newStock)} onChangeText={(val) => setNewStock(parseInt(val) || 1)} keyboardType="numeric" />
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(1)}><Text style={styles.stockBtnText}>+</Text></TouchableOpacity>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => { setModalVisible(false); setScanned(false); }}><Text style={styles.cBtnText}>BATAL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.sBtn]} onPress={handleSave}><Text style={styles.sBtnText}>ARSIPKAN DATA</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={manualInputModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.manualInputCard}>
            <Text style={styles.modalTitle}>Input Kode Katalog</Text>
            <View style={styles.divider} />
            <TextInput style={styles.input} placeholder="Barcode/ISBN" value={manualBarcode} onChangeText={setManualBarcode} keyboardType="numeric" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => setManualInputModalVisible(false)}><Text style={styles.cBtnText}>BATAL</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.sBtn]} onPress={() => { setManualInputModalVisible(false); processBarcode(manualBarcode); }}><Text style={styles.sBtnText}>VERIFIKASI</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Registrasi Berhasil</Text>
            <Text style={styles.successMessage}>Data literatur berhasil diarsipkan ke dalam sistem.</Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.successBtnText}>TUTUP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={COLORS.secondary} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(101, 109, 74, 0.4)' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  backBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scanFrame: { width: 280, height: 200, borderWidth: 1.5, borderColor: COLORS.secondary, borderRadius: 2 },
  scanText: { color: '#fff', marginTop: 24, fontSize: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  manualEntryBtn: { marginTop: 40, paddingVertical: 12, paddingHorizontal: 30, borderBottomWidth: 1, borderBottomColor: COLORS.secondary },
  manualEntryText: { color: COLORS.secondary, fontWeight: 'bold', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  manualInputCard: { backgroundColor: COLORS.background, padding: 25, width: Platform.OS === 'web' ? 400 : '100%', borderLeftWidth: 5, borderLeftColor: COLORS.primary },
  modalContent: { backgroundColor: COLORS.background, padding: 25, borderLeftWidth: 8, borderLeftColor: COLORS.primary, width: Platform.OS === 'web' ? 500 : '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5, fontFamily: serifFont },
  modalSubtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 20, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginBottom: 6, letterSpacing: 1 },
  input: { backgroundColor: '#FFF', padding: 14, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 15 },
  stockSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 10 },
  stockBtn: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
  stockBtnText: { color: COLORS.primary, fontSize: 24, fontWeight: '300' },
  stockInputText: { fontSize: 20, fontWeight: 'bold', width: 80, textAlign: 'center', color: COLORS.text },
  modalButtons: { flexDirection: 'row', gap: 15 },
  successCard: { backgroundColor: COLORS.background, padding: 25, width: Platform.OS === 'web' ? 380 : '100%', borderLeftWidth: 6, borderLeftColor: COLORS.primary, alignItems: 'center' },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  successMessage: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  successBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 2 },
  successBtnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },
  btn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 2 },
  cBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary },
  cBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  sBtn: { backgroundColor: COLORS.primary },
  sBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  permissionButton: { backgroundColor: COLORS.secondary, padding: 16, alignSelf: 'center', marginTop: 50 },
  permissionButtonText: { color: COLORS.primary, fontWeight: 'bold' },
  message: { color: '#fff', textAlign: 'center', paddingHorizontal: 40, fontSize: 16 },
});
