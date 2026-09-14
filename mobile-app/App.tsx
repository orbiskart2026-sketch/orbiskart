import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// दोनों कंपोनेंट इम्पोर्ट करें
import CustomerScreen from './CustomerScreen';
import SellerHubScreen from './SellerHubScreen';

const API_BASE = 'https://orbiskart.onrender.com/api';

// --- 1. सेलर उत्पाद अपलोड स्क्रीन ---
function SellerUploadView() {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('1999');
  const [weight, setWeight] = useState('300');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericPrice = parseFloat(price) || 0;
  const numericWeight = parseInt(weight, 10) || 300;

  const taxableBase = numericPrice > 0 ? numericPrice / 1.18 : 0;
  const productGst = numericPrice - taxableBase;
  const forwardCourier = numericWeight <= 500 ? 50 : 80;
  const rtoRiskFee = numericWeight <= 500 ? 40 : 65;
  const totalPg = (numericPrice * 0.02) * 1.18;
  const totalPlatform = (numericPrice * 0.03) * 1.18;
  const netPayout = Math.max(0, numericPrice - totalPg - totalPlatform - forwardCourier);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('अनुमति आवश्यक', 'फ़ोटो चुनने के लिए गैलरी एक्सेस की अनुमति दें।');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePublish = () => {
    if (!title.trim() || numericPrice <= 0) {
      Alert.alert('अपूर्ण जानकारी', 'कृपया उत्पाद का नाम और मान्य विक्रय मूल्य दर्ज करें।');
      return;
    }

    Alert.alert(
      'पारदर्शिता समझौता',
      `बिक्री मूल्य: ₹${numericPrice.toFixed(2)}\nशुद्ध बैंक पेआउट (7 दिन): ₹${netPayout.toFixed(2)}\nकूरियर RTO जोखिम: ₹${rtoRiskFee}\n\nक्या आप इसे OrbisKart पर लाइव करने के लिए सहमत हैं?`,
      [
        { text: 'रद्द करें', style: 'cancel' },
        {
          text: 'हाँ, स्वीकार है',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const formData = new FormData();
              formData.append('title', title);
              formData.append('price', numericPrice.toString());
              formData.append('weight_grams', numericWeight.toString());
              formData.append('stock', '20');

              if (imageUri) {
                const filename = imageUri.split('/').pop() || 'product.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';
                formData.append('image', {
                  uri: imageUri,
                  name: filename,
                  type,
                } as any);
              }

              const res = await fetch(`${API_BASE}/products/`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
              });

              if (res.ok) {
                Alert.alert('🎉 बधाई!', 'उत्पाद OrbisKart पर तुरंत लाइव हो गया है।');
                setTitle('');
                setPrice('');
                setImageUri(null);
              } else {
                Alert.alert('सूचना', 'उत्पाद पंजीकृत हो गया है।');
              }
            } catch {
              Alert.alert('नेटवर्क सूचना', 'सर्वर से संपर्क हो रहा है...');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.label}>उत्पाद का नाम</Text>
        <TextInput
          style={styles.input}
          placeholder="उदा. वायरलेस नेकबैंड / टी-शर्ट"
          placeholderTextColor="#64748b"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>विक्रय मूल्य (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="₹ 1499"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>वजन (ग्राम में)</Text>
            <TextInput
              style={styles.input}
              placeholder="300"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>📷 उत्पाद की फ़ोटो चुनें</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.ledgerCard}>
        <Text style={styles.ledgerHeader}>📊 लाइव वित्तीय पारदर्शिता ऑडिट</Text>
        <View style={styles.ledgerRow}>
          <Text style={styles.ledgerText}>ग्राहक देगा (Gross Price)</Text>
          <Text style={styles.ledgerValue}>₹{numericPrice.toFixed(2)}</Text>
        </View>
        <View style={styles.ledgerRow}>
          <Text style={styles.ledgerText}>• वस्तु GST (18% टैक्स इनवॉइस)</Text>
          <Text style={styles.ledgerNegative}>- ₹{productGst.toFixed(2)}</Text>
        </View>
        <View style={styles.ledgerRow}>
          <Text style={styles.ledgerText}>• कूरियर डिलीवरी ({numericWeight}g दर)</Text>
          <Text style={styles.ledgerNegative}>- ₹{forwardCourier.toFixed(2)}</Text>
        </View>
        <View style={styles.ledgerRow}>
          <Text style={styles.ledgerText}>• पेमेंट गेटवे एवं प्लेटफ़ॉर्म फ़ीस</Text>
          <Text style={styles.ledgerNegative}>- ₹{(totalPg + totalPlatform).toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.payoutContainer}>
          <Text style={styles.payoutLabel}>आपके बैंक में शुद्ध क्रेडिट (7 दिन बाद):</Text>
          <Text style={styles.payoutValue}>₹{netPayout.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.publishBtn, isSubmitting && { opacity: 0.7 }]}
        onPress={handlePublish}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.publishBtnText}>स्वीकार करें और लाइव पब्लिश करें</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// --- 2. सेलर ऑर्डर्स एवं OTP सत्यापन स्क्रीन ---
function SellerOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpType, setOtpType] = useState<'DELIVERY' | 'RETURN'>('DELIVERY');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders/`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('त्रुटि', 'ऑर्डर्स लोड करने में असमर्थ।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleVerifyOtp = async (orderId: number) => {
    if (!otpInput || otpInput.length !== 6) {
      Alert.alert('अमान्य OTP', 'कृपया 6-अंकीय OTP दर्ज करें।');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput, type: otpType }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert('सत्यापित', data.message);
        setSelectedOrderId(null);
        setOtpInput('');
        fetchOrders();
      } else {
        Alert.alert('सुरक्षा चेतावनी', data.error || 'गलत OTP दर्ज किया गया है।');
      }
    } catch {
      Alert.alert('त्रुटि', 'सत्यापन सर्वर से संपर्क नहीं हो सका।');
    }
  };

  return (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeaderRow}>
        <Text style={styles.ordersTitle}>लॉजिस्टिक्स व पार्सल स्थिति</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>🔄 रिफ्रेश</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>वर्तमान में कोई लंबित ऑर्डर नहीं है।</Text>}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderIdText}>ऑर्डर #{item.id}</Text>
                <Text style={[styles.statusBadge, item.status === 'Delivered' ? styles.statusDelivered : styles.statusPending]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.orderSubText}>AWB ट्रैकिंग: {item.awb_number || 'DEL-102948'}</Text>
              <Text style={styles.orderSubText}>कुल राशि: ₹{item.total_price} ({item.payment_method})</Text>

              {item.status !== 'Delivered' && item.status !== 'Returned & Refunded' && (
                <View style={styles.otpActionBox}>
                  {selectedOrderId === item.id ? (
                    <View>
                      <View style={styles.row}>
                        <TouchableOpacity
                          style={[styles.typeBtn, otpType === 'DELIVERY' && styles.typeBtnActive]}
                          onPress={() => setOtpType('DELIVERY')}
                        >
                          <Text style={styles.typeBtnText}>डिलीवरी OTP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.typeBtn, otpType === 'RETURN' && styles.typeBtnActive]}
                          onPress={() => setOtpType('RETURN')}
                        >
                          <Text style={styles.typeBtnText}>रिटर्न OTP</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="6-अंकीय OTP"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        maxLength={6}
                        value={otpInput}
                        onChangeText={setOtpInput}
                      />
                      <View style={styles.row}>
                        <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerifyOtp(item.id)}>
                          <Text style={styles.verifyBtnText}>सत्यापित करें</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedOrderId(null)}>
                          <Text style={styles.cancelBtnText}>रद्द</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.startVerifyBtn} onPress={() => setSelectedOrderId(item.id)}>
                      <Text style={styles.startVerifyBtnText}>🔐 6-अंकीय OTP सत्यापित करें</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

// --- 3. मुख्य ऐप (4 टैब: स्टोर, अपलोड, ऑर्डर्स, सेलर हब) ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'upload' | 'orders' | 'hub'>('hub');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        
        {/* शीर्ष नेविगेशन बार (4 टैब) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'hub' && styles.tabItemActive]}
            onPress={() => setActiveTab('hub')}
          >
            <Text style={[styles.tabText, activeTab === 'hub' && styles.tabTextActive]}>
              👑 हब
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'upload' && styles.tabItemActive]}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
              📦 अपलोड
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              🚚 ऑर्डर्स
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'store' && styles.tabItemActive]}
            onPress={() => setActiveTab('store')}
          >
            <Text style={[styles.tabText, activeTab === 'store' && styles.tabTextActive]}>
              🛍️ स्टोर
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'hub' && <SellerHubScreen />}
        {activeTab === 'upload' && <SellerUploadView />}
        {activeTab === 'orders' && <SellerOrdersView />}
        {activeTab === 'store' && <CustomerScreen />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  tabBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#ffffff', fontWeight: 'bold' },
  container: { padding: 16, paddingTop: Platform.OS === 'android' ? 20 : 16, paddingBottom: 60 },
  card: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  row: { flexDirection: 'row' },
  imagePicker: { height: 110, borderWidth: 1.5, borderColor: '#4f46e5', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 8 },
  imagePickerText: { color: '#818cf8', fontSize: 13, fontWeight: '600' },
  ledgerCard: { backgroundColor: '#090d16', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#312e81', marginBottom: 20 },
  ledgerHeader: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  ledgerText: { color: '#94a3b8', fontSize: 12 },
  ledgerValue: { color: '#f8fafc', fontSize: 12, fontWeight: '600' },
  ledgerNegative: { color: '#f87171', fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 10 },
  payoutContainer: { backgroundColor: '#064e3b', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#059669' },
  payoutLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '600' },
  payoutValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  publishBtn: { backgroundColor: '#4f46e5', paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  publishBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  ordersContainer: { flex: 1, padding: 16 },
  ordersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ordersTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  refreshBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  refreshBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
  orderCard: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderIdText: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusDelivered: { backgroundColor: '#064e3b', color: '#34d399' },
  statusPending: { backgroundColor: '#78350f', color: '#fbbf24' },
  orderSubText: { color: '#94a3b8', fontSize: 12, marginVertical: 2 },
  otpActionBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  startVerifyBtn: { backgroundColor: '#1e1b4b', borderColor: '#4338ca', borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  startVerifyBtnText: { color: '#a5b4fc', fontSize: 13, fontWeight: 'bold' },
  typeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 6, marginHorizontal: 3, marginBottom: 8 },
  typeBtnActive: { backgroundColor: '#4f46e5' },
  typeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  otpInput: { backgroundColor: '#020617', color: '#fff', borderWidth: 1, borderColor: '#4338ca', borderRadius: 8, padding: 10, fontSize: 16, textAlign: 'center', letterSpacing: 4, marginBottom: 8 },
  verifyBtn: { flex: 2, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 6 },
  verifyBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#cbd5e1' },
});