import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';

export default function SellerHubScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // मॉक अथवा वास्तविक API फेच
    setTimeout(() => {
      setData({
        store_name: "श्री बालाजी इलेक्ट्रॉनिक्स",
        is_approved: true,
        is_orbiskart_mall: true,
        wallet_balance: "48,520.00",
        quality_score: "4.9",
        orders_summary: { total: 142, delivered: 135, returns: 4 },
        banking: { bank_name: "HDFC Bank", account_masked: "XXXXXX8912", ifsc: "HDFC0001245" },
        support: { it_call_no: "+9118008892026", ref_no: "REF-ORB-9981" }
      });
      setLoading(false);
    }, 600);
  }, []);

  if (loading) return <ActivityIndicator color="#6366f1" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. सेलर ब्रांडिंग, अप्रूवल टिक और मॉल बैज */}
      <View style={styles.profileHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowAlign}>
            <Text style={styles.storeTitle}>{data.store_name}</Text>
            {data.is_approved && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
          </View>
          {data.is_orbiskart_mall && (
            <Text style={styles.mallTag}>🏬 OrbisKart Mall Certified Partner</Text>
          )}
          <Text style={styles.qualityText}>गुणवत्ता रेटिंग (Quality Check): ⭐ {data.quality_score}/5.0</Text>
        </View>
      </View>

      {/* 2. बैंक बैलेंस व पेआउट कार्ड */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceSub}>उपलब्ध बैंक पेआउट बैलेंस</Text>
        <Text style={styles.balanceAmount}>₹{data.wallet_balance}</Text>
        <View style={styles.bankRow}>
          <Text style={styles.bankText}>खाता: {data.banking.bank_name} ({data.banking.account_masked})</Text>
          <Text style={styles.bankText}>IFSC: {data.banking.ifsc}</Text>
        </View>
      </View>

      {/* 3. ऑर्डर्स व रिटर्न विश्लेषण */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{data.orders_summary.total}</Text>
          <Text style={styles.statLabel}>कुल ऑर्डर्स</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#34d399' }]}>{data.orders_summary.delivered}</Text>
          <Text style={styles.statLabel}>डिलीवर हुए</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#f87171' }]}>{data.orders_summary.returns}</Text>
          <Text style={styles.statLabel}>रिटर्न (RTO)</Text>
        </View>
      </View>

      {/* 4. लाइव कूरियर व पार्सल सुरक्षा */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🚚 सक्रिय कूरियर व राइडर सहायता</Text>
        <Text style={styles.infoRow}>कूरियर पार्टनर: Delhivery Surface Express</Text>
        <Text style={styles.infoRow}>राइडर संपर्क: +91 98765 43210 (सीधा कॉल)</Text>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => Linking.openURL('https://delhivery.com')}
        >
          <Text style={styles.actionBtnText}>📍 लाइव GPS ट्रैकिंग देखें</Text>
        </TouchableOpacity>
      </View>

      {/* 5. ज़ीरो-हिडन-चार्ज: पारदर्शिता कटिंग स्लिप */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🧾 कटौती व ऑडिट स्लिप (No Hidden Cuts)</Text>
        <Text style={styles.infoRow}>• GST इनवॉइस रिपोर्ट: स्वतः प्रमाणित (18% ITC)</Text>
        <Text style={styles.infoRow}>• कूरियर भार स्लैब चार्ज: सटीक वज़न अनुसार</Text>
        <Text style={styles.infoRow}>• रिटर्न पेनाल्टी: ₹0 (शून्य दंड नीति)</Text>
      </View>

      {/* 6. प्रायोरिटी IT कॉल व रेफरेंस सपोर्ट */}
      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>📞 सेलर हेल्पलाइन एवं तत्काल IT सपोर्ट</Text>
        <Text style={styles.supportText}>रेफरेंस टिकट: {data.support.ref_no}</Text>
        <TouchableOpacity 
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${data.support.it_call_no}`)}
        >
          <Text style={styles.callBtnText}>डायरेक्ट कॉल: {data.support.it_call_no}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 14 },
  profileHeader: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  storeTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  verifiedBadge: { backgroundColor: '#064e3b', color: '#34d399', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  mallTag: { color: '#fbbf24', fontSize: 11, fontWeight: '700', marginTop: 4 },
  qualityText: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  balanceCard: { backgroundColor: '#1e1b4b', borderColor: '#4338ca', borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 12 },
  balanceSub: { color: '#c7d2fe', fontSize: 12 },
  balanceAmount: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginVertical: 4 },
  bankRow: { borderTopWidth: 1, borderTopColor: '#312e81', paddingTop: 8, marginTop: 4 },
  bankText: { color: '#a5b4fc', fontSize: 11 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statBox: { backgroundColor: '#0f172a', flex: 1, padding: 12, marginHorizontal: 3, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  statNum: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  card: { backgroundColor: '#0f172a', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  cardHeader: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  infoRow: { color: '#cbd5e1', fontSize: 12, marginVertical: 3 },
  actionBtn: { backgroundColor: '#1e293b', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  supportCard: { backgroundColor: '#064e3b', borderColor: '#059669', borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 40 },
  supportTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  supportText: { color: '#a7f3d0', fontSize: 12, marginVertical: 4 },
  callBtn: { backgroundColor: '#059669', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  callBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});