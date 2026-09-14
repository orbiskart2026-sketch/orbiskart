import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';

const API_BASE = 'https://orbiskart.onrender.com/api';

export default function CustomerScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/`);
      const data = await res.json();
      setProducts(data.products || (Array.isArray(data) ? data : []));
    } catch {
      Alert.alert('त्रुटि', 'उत्पाद सूची लोड नहीं हो सकी।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleInstantBuy = async () => {
    if (!shippingAddress.trim()) {
      Alert.alert('अपूर्ण पता', 'कृपया डिलीवरी पता दर्ज करें।');
      return;
    }

    setIsOrdering(true);
    try {
      // त्वरित सिंगल-ऑर्डर प्लेसमेंट एंडपॉइंट कॉल
      const res = await fetch(`${API_BASE}/orders/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: shippingAddress,
          payment_method: 'COD',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert(
          '🎉 ऑर्डर सफल!',
          `ऑर्डर ID: #${data.order_id}\n` +
          `🔐 आपकी सुरक्षित डिलीवरी OTP: ${data.delivery_otp || 'XXXXXX'}\n\n` +
          'डिलीवरी बॉय को सामान मिलने पर ही यह OTP साझा करें।'
        );
        setSelectedProduct(null);
        setShippingAddress('');
      } else {
        Alert.alert('ऑर्डर स्थिति', data.message || 'ऑर्डर सफलतापूर्वक दर्ज हुआ।');
        setSelectedProduct(null);
      }
    } catch {
      Alert.alert('नेटवर्क त्रुटि', 'ऑर्डर सर्वर से कनेक्ट नहीं हो सका।');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* शीर्ष सर्च व कार्ट बार */}
      <View style={styles.topBar}>
        <Text style={styles.logoText}>Orbis<Text style={{ color: '#6366f1' }}>Kart</Text></Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => Alert.alert('कार्ट', `कार्ट में ${cartCount} उत्पाद हैं।`)}>
          <Text style={styles.cartBtnText}>🛒 {cartCount}</Text>
        </TouchableOpacity>
      </View>

      {/* कैटलॉग ग्रिड */}
      {loading ? (
        <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>कोई उत्पाद उपलब्ध नहीं है।</Text>}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.imageBox}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                  <Text style={styles.noImageText}>📦 चित्र उपलब्ध नहीं</Text>
                )}
              </View>

              <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.productPrice}>₹{item.price}</Text>

              {item.transparency_ledger && (
                <Text style={styles.taxInfo}>GST एवं कूरियर शुल्क सम्मिलित</Text>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.addToCartBtn}
                  onPress={() => setCartCount((prev) => prev + 1)}
                >
                  <Text style={styles.addToCartText}>+ कार्ट</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buyNowBtn}
                  onPress={() => setSelectedProduct(item)}
                >
                  <Text style={styles.buyNowText}>खरीदें</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* चेकआउट एवं पता मोडल */}
      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>सुरक्षित चेकआउट (Cash on Delivery)</Text>
            <Text style={styles.modalItemName}>{selectedProduct?.title}</Text>
            <Text style={styles.modalPrice}>देय राशि: ₹{selectedProduct?.price}</Text>

            <Text style={styles.label}>डिलीवरी का पूरा पता:</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="मकान संख्या, गली, पिनकोड, शहर"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              value={shippingAddress}
              onChangeText={setShippingAddress}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.confirmOrderBtn, isOrdering && { opacity: 0.7 }]}
                onPress={handleInstantBuy}
                disabled={isOrdering}
              >
                {isOrdering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmOrderText}>ऑर्डर कन्फर्म करें (OTP सहित)</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setSelectedProduct(null)}
              >
                <Text style={styles.cancelModalText}>रद्द</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logoText: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
  cartBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  cartBtnText: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold' },
  columnWrapper: { justifyContent: 'space-between' },
  productCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  imageBox: { height: 120, backgroundColor: '#020617', borderRadius: 6, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImageText: { color: '#64748b', fontSize: 11 },
  productTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '600', marginTop: 8 },
  productPrice: { color: '#38bdf8', fontSize: 15, fontWeight: 'bold', marginVertical: 4 },
  taxInfo: { color: '#94a3b8', fontSize: 10, marginBottom: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  addToCartBtn: { backgroundColor: '#1e293b', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6 },
  addToCartText: { color: '#cbd5e1', fontSize: 11, fontWeight: 'bold' },
  buyNowBtn: { backgroundColor: '#4f46e5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  buyNowText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  modalItemName: { color: '#94a3b8', fontSize: 13 },
  modalPrice: { color: '#34d399', fontSize: 16, fontWeight: 'bold', marginVertical: 6 },
  label: { color: '#cbd5e1', fontSize: 12, marginTop: 8, marginBottom: 4 },
  addressInput: { backgroundColor: '#020617', color: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155', textAlignVertical: 'top', marginBottom: 16 },
  row: { flexDirection: 'row' },
  confirmOrderBtn: { flex: 2, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  confirmOrderText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  cancelModalBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalText: { color: '#cbd5e1', fontWeight: 'bold' },
});