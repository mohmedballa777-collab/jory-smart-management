import React, { useEffect, useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable,
  Switch, I18nManager, StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const COLORS = {
  ink: "#172B4D", muted: "#667085", brand: "#176B55",
  pale: "#EAF4EF", line: "#E7EBEF", bg: "#F5F7F8",
  white: "#FFFFFF", gold: "#D99B25"
};

const sections = [
  { title: "الإدارة العامة", subtitle: "المتابعة والقرارات", icon: "🏢" },
  { title: "الإدارة المالية", subtitle: "الإيرادات والمصروفات", icon: "💰" },
  { title: "المشروعات والتشغيل", subtitle: "TRUST والركشة والمشروعات", icon: "⚙️" },
  { title: "المبيعات والتسويق", subtitle: "المبيعات والعملاء", icon: "🛒" },
  { title: "المخازن والمشتريات", subtitle: "الأرصدة وحركة الأصناف", icon: "📦" },
  { title: "الجودة والسلامة", subtitle: "الجودة و HSE", icon: "🧪" },
  { title: "التطوير والتقنية", subtitle: "الأنظمة والمساعد الذكي", icon: "🤖" },
  { title: "الشؤون الشخصية", subtitle: "الأهداف والمهام", icon: "🎯" }
];

function Metric({ label, value, note }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}

export default function App() {
  const [active, setActive] = useState("الرئيسية");
  const [online, setOnline] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("jouri-network-mode")
      .then(value => {
        if (value !== null) setOnline(value === "true");
        setSaved(true);
      })
      .catch(() => setSaved(true));
  }, []);

  const changeMode = async value => {
    setOnline(value);
    try {
      await AsyncStorage.setItem("jouri-network-mode", String(value));
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>جــوري</Text>
            <Text style={styles.tagline}>معامل جوري للصناعات المتعددة</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>ج</Text></View>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>لوحة الإدارة الذكية</Text>
          <Text style={styles.welcomeText}>مرحباً بك في مركز متابعة أعمال جوري</Text>
          <View style={styles.modeRow}>
            <View style={[styles.dot, { backgroundColor: online ? COLORS.brand : COLORS.gold }]} />
            <Text style={styles.modeText}>{online ? "وضع الاتصال مفعّل" : "وضع العمل المحلي"}</Text>
            <Switch value={online} onValueChange={changeMode} trackColor={{ true: COLORS.brand }} />
          </View>
          <Text style={styles.smallHint}>
            {saved ? "إعداد الاتصال محفوظ على هذا الجهاز" : "جارٍ تحميل الإعدادات..."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>ملخص المؤسسة</Text>
        <View style={styles.metrics}>
          <Metric label="الإدارات" value="8" note="إدارات معتمدة" />
          <Metric label="المشروعات" value="3" note="قيد المتابعة" />
        </View>
        <View style={styles.metrics}>
          <Metric label="المبيعات" value="—" note="تُحدّث نهاية اليوم" />
          <Metric label="صافي الربح" value="—" note="بانتظار تسجيل البيانات" />
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>متابعة TRUST للصابون</Text>
          <Text style={styles.noticeText}>بدأ البيع المباشر. سجّل المبيعات والمصروفات لتظهر النتائج المالية هنا.</Text>
          <Text style={styles.noticeFoot}>حالة المشروع: تشغيل وبيع</Text>
        </View>

        <Text style={styles.sectionTitle}>الإدارات</Text>
        <View style={styles.grid}>
          {sections.map((item, index) => (
            <Pressable key={item.title} style={styles.department} onPress={() => setActive(item.title)}>
              <Text style={styles.departmentIcon}>{item.icon}</Text>
              <Text style={styles.departmentTitle}>{item.title}</Text>
              <Text style={styles.departmentSubtitle}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {active !== "الرئيسية" && (
          <View style={styles.selected}>
            <Text style={styles.selectedTitle}>{active}</Text>
            <Text style={styles.selectedText}>تم فتح القسم مبدئياً. ستُضاف شاشاته ووظائفه في مراحل التطوير التالية.</Text>
            <Pressable onPress={() => setActive("الرئيسية")}><Text style={styles.back}>العودة للرئيسية</Text></Pressable>
          </View>
        )}
        <Text style={styles.footer}>جوري • نظام الإدارة الذكية</Text>
      </ScrollView>
      <View style={styles.bottom}>
        <Pressable onPress={() => setActive("الرئيسية")}><Text style={styles.bottomActive}>⌂  الرئيسية</Text></Pressable>
        <Pressable onPress={() => setActive("المهام")}><Text style={styles.bottomItem}>✓  المهام</Text></Pressable>
        <Pressable onPress={() => setActive("المساعد الذكي")}><Text style={styles.bottomItem}>✧  المساعد</Text></Pressable>
        <Pressable onPress={() => setActive("الإعدادات")}><Text style={styles.bottomItem}>⚙  الإعدادات</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  page: { padding: 18, paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  brand: { color: COLORS.brand, fontSize: 32, fontWeight: "900", letterSpacing: 2 },
  tagline: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.pale, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.brand, fontSize: 22, fontWeight: "800" },
  welcome: { backgroundColor: COLORS.ink, borderRadius: 20, padding: 18, marginBottom: 22 },
  welcomeTitle: { color: COLORS.white, fontSize: 21, fontWeight: "800", textAlign: "right" },
  welcomeText: { color: "#D5DFEA", fontSize: 13, marginTop: 7, textAlign: "right" },
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", marginTop: 18, gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  modeText: { color: COLORS.white, fontSize: 12, flex: 1 },
  smallHint: { color: "#C0CBD8", fontSize: 10, marginTop: 4, textAlign: "right" },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 12 },
  metrics: { flexDirection: "row", gap: 10, marginBottom: 10 },
  metric: { flex: 1, backgroundColor: COLORS.white, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: COLORS.line },
  metricLabel: { color: COLORS.muted, fontSize: 12, textAlign: "right" },
  metricValue: { color: COLORS.ink, fontSize: 25, fontWeight: "800", textAlign: "right", marginTop: 7 },
  metricNote: { color: COLORS.muted, fontSize: 10, textAlign: "right", marginTop: 3 },
  notice: { backgroundColor: COLORS.pale, borderRadius: 16, padding: 16, marginVertical: 15, borderWidth: 1, borderColor: "#D5E8DD" },
  noticeTitle: { color: COLORS.brand, fontWeight: "800", fontSize: 16, textAlign: "right" },
  noticeText: { color: COLORS.ink, fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 7 },
  noticeFoot: { color: COLORS.brand, fontSize: 11, fontWeight: "700", textAlign: "right", marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  department: { width: "48%", minHeight: 118, backgroundColor: COLORS.white, borderRadius: 15, padding: 13, borderWidth: 1, borderColor: COLORS.line },
  departmentIcon: { fontSize: 22, textAlign: "right" },
  departmentTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 12, textAlign: "right", marginTop: 8 },
  departmentSubtitle: { color: COLORS.muted, fontSize: 10, textAlign: "right", marginTop: 5 },
  selected: { backgroundColor: COLORS.white, borderRadius: 15, padding: 16, marginTop: 18 },
  selectedTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", textAlign: "right" },
  selectedText: { color: COLORS.muted, textAlign: "right", marginTop: 8, lineHeight: 20 },
  back: { color: COLORS.brand, textAlign: "right", fontWeight: "700", marginTop: 12 },
  footer: { color: COLORS.muted, fontSize: 10, textAlign: "center", marginTop: 25 },
  bottom: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 13, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.line },
  bottomActive: { color: COLORS.brand, fontWeight: "800", fontSize: 11 },
  bottomItem: { color: COLORS.muted, fontSize: 11 }
});