import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
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
  success: '#2E7D32',
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});

export default function BorrowListScreen({ navigation }) {
  const [borrows, setBorrows] = useState([]);
  const [filteredBorrows, setFilteredBorrows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState(null);

  useEffect(() => {
    fetchBorrows();
  }, []);

  const fetchBorrows = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await apiService.get('/api/borrow');
      const list = Array.isArray(data) ? data : [];
      setBorrows(list);
      filterData(list, searchQuery);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterData = (list, query) => {
    if (!query) {
      setFilteredBorrows(list);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = list.filter(item => 
      (item.borrower_name?.toLowerCase() || '').includes(lowerQuery) ||
      (item.title?.toLowerCase() || '').includes(lowerQuery) ||
      (item.barcode?.toString() || '').includes(lowerQuery)
    );
    setFilteredBorrows(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterData(borrows, text);
  };

  const openReturnConfirm = (item) => {
    setSelectedBorrow(item);
    setConfirmModalVisible(true);
  };

  const handleReturn = async () => {
    if (!selectedBorrow) return;

    try {
      setLoading(true);
      await apiService.delete(`/api/borrow/${selectedBorrow.id}`);
      setConfirmModalVisible(false);

      if (Platform.OS === 'web') {
        alert('Berhasil\n\nArsip peminjaman telah diselesaikan.');
      } else {
        Alert.alert('Berhasil', 'Arsip peminjaman telah diselesaikan.');
      }

      setSelectedBorrow(null);
      fetchBorrows();
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Error\n\nGagal memproses data pengembalian.');
      } else {
        Alert.alert('Error', 'Gagal memproses data pengembalian.');
      }
      setLoading(false);
    }
  };

  const closeReturnConfirm = () => {
    setConfirmModalVisible(false);
    setSelectedBorrow(null);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.isTerlambat && styles.cardOverdue]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.borrowerLabel}>PEMINJAM</Text>
          <Text style={styles.borrowerName}>{item.borrower_name}</Text>
        </View>
        <View style={[styles.statusBadge, item.isTerlambat ? styles.statusBadgeDanger : styles.statusBadgeActive]}>
          <Text style={[styles.statusText, item.isTerlambat ? styles.statusTextDanger : styles.statusTextActive]}>
            {item.isTerlambat ? 'TERLAMBAT' : 'AKTIF'}
          </Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookInfo}>ID KATALOG: {item.barcode}</Text>
      
      <View style={styles.dateContainer}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>TANGGAL PINJAM</Text>
          <Text style={styles.dateValue}>{new Date(item.borrow_date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</Text>
        </View>
        <View style={[styles.dateBox, {alignItems: 'flex-end'}]}>
          <Text style={styles.dateLabel}>BATAS KEMBALI</Text>
          <Text style={[styles.dateValue, item.isTerlambat && {color: COLORS.danger}]}>
            {item.return_date ? new Date(item.return_date).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}
          </Text>
        </View>
      </View>

      {item.isTerlambat && (
        <View style={styles.fineBox}>
          <Text style={styles.fineLabel}>DENDA KETERLAMBATAN:</Text>
          <Text style={styles.fineValue}>Rp {item.denda?.toLocaleString('id-ID')}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.returnBtn} 
        onPress={() => openReturnConfirm(item)}
      >
        <Text style={styles.returnBtnText}>PROSES PENGEMBALIAN</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerLabel}>LOG AKTIVITAS</Text>
          <Text style={styles.headerTitle}>Daftar Peminjaman</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari dalam arsip pinjam..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <View style={styles.searchBorder} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredBorrows}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchBorrows();}} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Data tidak ditemukan dalam arsip.' : 'Tidak ada sirkulasi literatur aktif.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeReturnConfirm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.modalTitle}>Konfirmasi Pengembalian</Text>
            <Text style={styles.modalMessage}>
              Literatur "{selectedBorrow?.title}" akan dikembalikan oleh {selectedBorrow?.borrower_name}. Apakah Anda yakin?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btn, styles.cBtn]} onPress={closeReturnConfirm}>
                <Text style={styles.cBtnText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={[styles.btn, styles.sBtn]} onPress={handleReturn}>
                <Text style={styles.sBtnText}>KONFIRMASI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 40, color: COLORS.primary, fontWeight: '300' },
  headerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 2 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.accent, fontFamily: serifFont },
  searchContainer: { paddingHorizontal: 25, marginBottom: 20 },
  searchInput: { paddingVertical: 10, color: COLORS.text, fontSize: 16, fontFamily: serifFont, fontStyle: 'italic' },
  searchBorder: { height: 1, backgroundColor: COLORS.primary, opacity: 0.3 },
  list: { paddingHorizontal: 25, paddingBottom: 40 },
  card: { 
    backgroundColor: COLORS.card, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 0.5, 
    borderColor: COLORS.border,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.primary 
  },
  cardOverdue: {
    borderLeftColor: COLORS.danger,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  borrowerLabel: { fontSize: 9, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1 },
  borrowerName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 1 },
  statusBadgeActive: { borderColor: COLORS.primary, backgroundColor: '#FFFDF0' },
  statusBadgeDanger: { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' },
  statusText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  statusTextActive: { color: COLORS.primary },
  statusTextDanger: { color: COLORS.danger },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 15, opacity: 0.5 },
  bookTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  bookInfo: { fontSize: 11, color: COLORS.textLight, letterSpacing: 0.5 },
  dateContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textLight, letterSpacing: 1 },
  dateValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  fineBox: { 
    backgroundColor: '#FDF2F2', 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#F8D7DA', 
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fineLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.danger, letterSpacing: 0.5 },
  fineValue: { fontSize: 14, fontWeight: '900', color: COLORS.danger },
  returnBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, alignItems: 'center', borderRadius: 12, marginTop: 12 },
  returnBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmModalContent: { backgroundColor: COLORS.card, padding: 24, borderRadius: 24, width: Platform.OS === 'web' ? 420 : '94%', maxWidth: 520, alignSelf: 'center', borderLeftWidth: 6, borderLeftColor: COLORS.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 18 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5, textAlign: 'center' },
  modalMessage: { marginTop: 14, color: COLORS.textLight, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  modalButtons: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'stretch', justifyContent: 'center', marginTop: 22, gap: 10 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', minWidth: Platform.OS === 'web' ? 150 : undefined, paddingHorizontal: Platform.OS === 'web' ? 14 : 0 },
  cBtn: { backgroundColor: '#F8F8F8', borderWidth: 1, borderColor: COLORS.border, marginRight: Platform.OS === 'web' ? 10 : 0, marginBottom: Platform.OS === 'web' ? 0 : 10 },
  cBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  sBtn: { backgroundColor: COLORS.primary, marginLeft: Platform.OS === 'web' ? 10 : 0 },
  sBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textLight, fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 40 },
});
