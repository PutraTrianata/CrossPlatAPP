import React, { useState, useRef } from 'react';
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
  danger: '#800000',
};

// Font safe fallback untuk Web
const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});

// Web Camera Component dengan Scanning (ZXing)
const WebCameraView = React.forwardRef(({ onScan, onBackPress, onManualInput }, ref) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const scanIntervalRef = useRef(null);

  React.useEffect(() => {
    // Load ZXing library dari CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
    script.async = true;
    document.head.appendChild(script);

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

    if (window.ZXing) {
      try {
        const codeReader = new window.ZXing.BrowserMultiFormatReader();
        console.log('ZXing reader initialized for borrowing');

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

        if (frameCount % 3 === 0) {
          try {
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
                // Ignore decode errors
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
      id: 'qr-reader-borrow',
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
    }, 'Pindai Kode Sirkulasi Literatur'),
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

export default function BorrowScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  
  const [bookData, setBookData] = useState(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');

  // Untuk web, bypass permission check
  if (Platform.OS !== 'web' && !permission) return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  
  if (Platform.OS !== 'web' && !permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.message}>Izin kamera diperlukan untuk sistem kearsipan literatur.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>BERI IZIN AKSES</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getDefaultReturnDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    fetchBookDetail(data);
  };

  const fetchBookDetail = async (barcode) => {
    setLoading(true);
    try {
      const result = await apiService.get(`/api/books/${barcode}?t=${new Date().getTime()}`);
      if (result && result.success && result.book) {
        if (result.book.stok <= 0) {
          Alert.alert('Informasi Stok', 'Maaf, literatur ini sedang tidak tersedia (stok kosong).', [{ text: 'KEMBALI', onPress: () => setScanned(false) }]);
        } else {
          setBookData(result.book);
          setReturnDate(getDefaultReturnDate());
          setModalVisible(true);
        }
      } else {
        Alert.alert('Data Kosong', 'Buku belum terdaftar dalam sistem katalog perpustakaan.', [{ text: 'KEMBALI', onPress: () => setScanned(false) }]);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memverifikasi data literatur.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcode.trim()) return Alert.alert('Peringatan', 'ID Katalog wajib diisi.');
    setManualInputModalVisible(false);
    setScanned(true);
    fetchBookDetail(manualBarcode.trim());
  };

  const handleProcessBorrow = async () => {
    if (!borrowerName.trim()) return Alert.alert('Peringatan', 'Identitas peminjam wajib diisi.');
    
    setLoading(true);
    try {
      await apiService.post('/api/borrow', {
        barcode: bookData.barcode,
        borrower_name: borrowerName.trim(),
        return_date: returnDate
      });
      
      Alert.alert('Berhasil', 'Transaksi peminjaman telah diarsipkan.', [{ 
        text: 'SELESAI', 
        onPress: () => {
          setModalVisible(false);
          setScanned(false);
          navigation.goBack();
        } 
      }]);
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat memproses data arsip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebCameraView onScan={fetchBookDetail} onBackPress={() => navigation.goBack()} onManualInput={() => setManualInputModalVisible(true)} />
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
            <Text style={styles.scanText}>Pindai Kode Sirkulasi Literatur</Text>
            
            <TouchableOpacity style={styles.manualEntryBtn} onPress={() => setManualInputModalVisible(true)}>
              <Text style={styles.manualEntryText}>INPUT KODE MANUAL</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal visible={manualInputModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.manualInputCard}>
            <Text style={styles.modalTitle}>Verifikasi Katalog</Text>
            <View style={styles.divider} />
            <TextInput 
              style={styles.input} 
              placeholder="Nomor Barcode / ISBN"
              placeholderTextColor="#A0A0A0"
              value={manualBarcode} 
              onChangeText={setManualBarcode}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => setManualInputModalVisible(false)}>
                <Text style={styles.cBtnText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.sBtn]} onPress={handleManualBarcodeSubmit}>
                <Text style={styles.sBtnText}>VERIFIKASI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Formulir Peminjaman</Text>
              <View style={styles.divider} />

              <View style={styles.bookDetailCard}>
                <Text style={styles.bookTitle}>{bookData?.title}</Text>
                <Text style={styles.bookAuthor}>Otoritas: {bookData?.author}</Text>
                <Text style={styles.stokLabel}>POSISI STOK: <Text style={styles.stokValue}>{bookData?.stok}</Text></Text>
              </View>

              <Text style={styles.label}>IDENTITAS PEMINJAM</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Nama Lengkap"
                placeholderTextColor="#A0A0A0"
                value={borrowerName} 
                onChangeText={setBorrowerName} 
              />
              
              <Text style={styles.label}>TANGGAL PENGEMBALIAN</Text>
              <TextInput 
                style={styles.input} 
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A0A0A0"
                value={returnDate} 
                onChangeText={setReturnDate} 
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => { setModalVisible(false); setScanned(false); }}>
                  <Text style={styles.cBtnText}>BATALKAN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.sBtn]} onPress={handleProcessBorrow}>
                  <Text style={styles.sBtnText}>PROSES ARSIP</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 25 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  manualInputCard: { backgroundColor: COLORS.background, padding: 30, borderLeftWidth: 8, borderLeftColor: COLORS.primary, width: Platform.OS === 'web' ? 400 : '100%' },
  modalContent: { backgroundColor: COLORS.background, padding: 30, borderLeftWidth: 10, borderLeftColor: COLORS.primary, width: Platform.OS === 'web' ? 500 : '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5, fontFamily: serifFont },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  bookDetailCard: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 25 },
  bookTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 6, fontFamily: serifFont },
  bookAuthor: { fontSize: 13, color: COLORS.textLight, fontStyle: 'italic', marginBottom: 10 },
  stokLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '800' },
  stokValue: { color: COLORS.primary, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '900', color: COLORS.primary, marginBottom: 8, letterSpacing: 1.5 },
  input: { backgroundColor: '#FFF', padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, color: COLORS.text },
  modalButtons: { flexDirection: 'row', gap: 15 },
  btn: { flex: 1, padding: 15, alignItems: 'center' },
  cBtn: { borderWidth: 1, borderColor: COLORS.primary },
  cBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  sBtn: { backgroundColor: COLORS.primary },
  sBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  message: { color: '#fff', textAlign: 'center', paddingHorizontal: 40, fontSize: 16 },
  permissionButton: { backgroundColor: COLORS.secondary, padding: 16, alignSelf: 'center', marginTop: 50 },
  permissionButtonText: { color: COLORS.primary, fontWeight: 'bold' },
});
