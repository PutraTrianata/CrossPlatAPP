import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
};

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, serif',
});

export default function BookListScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editStock, setEditStock] = useState(1);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await apiService.get('/api/books');
      const list = Array.isArray(data) ? data : (data.data || []);
      setBooks(list);
      sortAndFilter(list, searchQuery, sortBy);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortAndFilter = (list, query, sort) => {
    let filtered = list.filter(book => 
      (book.title?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (book.author?.toLowerCase() || '').includes(query.toLowerCase()) ||
      (book.barcode?.toString() || '').includes(query)
    );

    filtered.sort((a, b) => {
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      return (a.author || '').localeCompare(b.author || '');
    });
    setFilteredBooks(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    sortAndFilter(books, text, sortBy);
  };

  const openDeleteModal = (book) => {
    setSelectedBook(book);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedBook) return;

    try {
      setLoading(true);
      await apiService.delete(`/api/books/${selectedBook.barcode}`);
      setDeleteModalVisible(false);
      setSelectedBook(null);
      fetchBooks();
      if (Platform.OS !== 'web') {
        Alert.alert('Berhasil', 'Data literatur berhasil dihapus.');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memproses penghapusan data.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (book) => {
    setSelectedBook(book);
    setEditBarcode(book.barcode.toString());
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditStock(book.stok || 1);
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editBarcode.trim()) return Alert.alert('Peringatan', 'ID Katalog tidak boleh kosong.');
    if (!editTitle.trim()) return Alert.alert('Peringatan', 'Judul literatur wajib diisi.');
    
    try {
      setLoading(true);
      await apiService.put(`/api/books/${selectedBook.barcode}`, {
        barcode: editBarcode.trim(),
        title: editTitle.trim(),
        author: editAuthor.trim(),
        stok: parseInt(editStock) || 0
      });
      setEditModalVisible(false);
      fetchBooks();
      Alert.alert('Berhasil', 'Data literatur telah diperbarui.');
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = (val) => {
    const nextVal = (parseInt(editStock) || 0) + val;
    if (nextVal >= 0) setEditStock(nextVal);
  };

  const renderItem = ({ item }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={styles.bookAuthor}>👤 {item.author}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.bookBarcode}>ID: {item.barcode}</Text>
          <View style={styles.thinLine} />
          <Text style={styles.stockText}>STOK: {item.stok ?? 0}</Text>
        </View>
      </View>
      
      <View style={styles.actionColumn}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.actionEmoji}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteModal(item)}>
          <Text style={styles.actionEmoji}>🗑️</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.headerLabel}>DIREKTORI</Text>
          <Text style={styles.headerTitle}>Katalog Literatur</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari dalam koleksi..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <View style={styles.searchBorder} />
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={(item, index) => (item.barcode || index).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchBooks} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>Tidak ada literatur ditemukan.</Text>
        }
      />

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Konfirmasi Hapus</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.confirmText}>
              Apakah Anda yakin ingin menghapus data literatur "{selectedBook?.title || ''}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => { setDeleteModalVisible(false); setSelectedBook(null); }}>
                <Text style={styles.cBtnText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.dBtn]} onPress={handleDelete}>
                <Text style={styles.dBtnText}>HAPUS DATA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Update Data Literatur</Text>
              <View style={styles.modalDivider} />
              
              <Text style={styles.label}>ID KATALOG / BARCODE</Text>
              <TextInput 
                style={styles.input} 
                value={editBarcode} 
                onChangeText={setEditBarcode} 
                keyboardType="numeric"
              />

              <Text style={styles.label}>JUDUL LITERATUR</Text>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
              
              <Text style={styles.label}>PENULIS / OTORITAS</Text>
              <TextInput style={styles.input} value={editAuthor} onChangeText={setEditAuthor} />

              <Text style={styles.label}>KUANTITAS STOK</Text>
              <View style={styles.stockSelector}>
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(-1)}>
                  <Text style={styles.stockBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput 
                  style={styles.stockInputText} 
                  value={String(editStock)} 
                  onChangeText={(val) => setEditStock(val.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(1)}>
                  <Text style={styles.stockBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cBtn]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cBtnText}>BATAL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.sBtn]} onPress={handleUpdate}>
                  <Text style={styles.sBtnText}>SIMPAN PERUBAHAN</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {loading && !refreshing && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={COLORS.primary} /></View>}
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
  searchContainer: { paddingHorizontal: 25, marginBottom: 25 },
  searchInput: { paddingVertical: 10, color: COLORS.text, fontSize: 16, fontFamily: serifFont, fontStyle: 'italic' },
  searchBorder: { height: 1, backgroundColor: COLORS.primary, opacity: 0.3 },
  listContent: { paddingHorizontal: 25, paddingBottom: 40 },
  bookCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.card, 
    padding: 20, 
    marginBottom: 15, 
    borderWidth: 0.5, 
    borderColor: COLORS.border,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.secondary,
    alignItems: 'center' 
  },
  bookInfo: { flex: 1 },
  titleRow: { marginBottom: 6 },
  bookTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.3 },
  bookAuthor: { fontSize: 13, color: COLORS.textLight, marginBottom: 10, fontStyle: 'italic' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookBarcode: { fontSize: 11, color: COLORS.textLight, letterSpacing: 0.5 },
  thinLine: { width: 1, height: 10, backgroundColor: COLORS.border },
  stockText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  actionColumn: { gap: 15, paddingLeft: 15, borderLeftWidth: 0.5, borderLeftColor: COLORS.border },
  actionBtn: { padding: 5 },
  actionEmoji: { fontSize: 18 },
  emptyText: { textAlign: 'center', marginTop: 40, color: COLORS.textLight, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  confirmCard: { backgroundColor: COLORS.background, padding: 25, width: Platform.OS === 'web' ? 420 : '100%', borderLeftWidth: 6, borderLeftColor: COLORS.danger, alignItems: 'center' },
  confirmText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalContent: { backgroundColor: COLORS.background, padding: 30, borderLeftWidth: 10, borderLeftColor: COLORS.primary, width: Platform.OS === 'web' ? 500 : '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5 },
  modalDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  label: { fontSize: 11, fontWeight: '900', color: COLORS.primary, marginBottom: 8, letterSpacing: 1.5 },
  input: { backgroundColor: '#FFF', padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, color: COLORS.text },
  stockSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 10, marginBottom: 30 },
  stockBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  stockBtnText: { color: COLORS.primary, fontSize: 24, fontWeight: '300' },
  stockInputText: { fontSize: 20, fontWeight: 'bold', width: 80, textAlign: 'center', color: COLORS.text },
  modalButtons: { flexDirection: 'row', gap: 15 },
  btn: { flex: 1, padding: 15, alignItems: 'center' },
  cBtn: { borderWidth: 1, borderColor: COLORS.primary },
  cBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  dBtn: { backgroundColor: COLORS.danger },
  dBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  sBtn: { backgroundColor: COLORS.primary },
  sBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(241, 242, 237, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }
});
