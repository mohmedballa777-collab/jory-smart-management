import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, TextInput, StyleSheet,
  Pressable, Alert, StatusBar, ActivityIndicator, Share, AppState
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { supabase, isSupabaseConfigured } from "./src/lib/supabase";

const KEY = "jouri-business-data-v1";
const C = { ink:"#172B4D", muted:"#667085", brand:"#176B55", pale:"#EAF4EF", line:"#E7EBEF", bg:"#F5F7F8", white:"#FFFFFF", red:"#B54747", gold:"#D99B25" };
const DEPARTMENTS = [
  ["الإدارة العامة","🏢"],["الإدارة المالية","💰"],["المشروعات والتشغيل","⚙️"],["المبيعات والتسويق","🛒"],
  ["المخازن والمشتريات","📦"],["الجودة والسلامة","🧪"],["التطوير والتقنية","🤖"],["الشؤون الشخصية","🎯"]
];
const INITIAL = { sales:[], expenses:[], stock:[], purchases:[], productions:[], recipes:[], qualityChecks:[], movements:[], customers:[], receipts:[], staff:[], attendance:[], payrollPayments:[], tasks:[], users:[{id:"owner",name:"صاحب المؤسسة",role:"مدير عام"}], project:"TRUST - الصابون" };
const PERMISSION_SCREENS = ["الرئيسية","المبيعات","المصروفات","المخزون","المشتريات","الإنتاج","الجودة","الخزينة","متابعة TRUST","الموظفون والرواتب","المهام","التقارير","أداء الإدارات","العملاء","الموردون","المستخدمون","الإعدادات"];
const money = n => (Number(n)||0).toLocaleString("en-US") + " ج.س";
const stamp = () => new Date().toISOString();

function Field({label,value,onChange,placeholder,keyboardType="default",secureTextEntry=false,autoCapitalize="sentences",autoCorrect=true}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder||label} placeholderTextColor="#98A2B3" keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize} autoCorrect={autoCorrect} style={s.input}/></View>;
}
function Btn({title,onPress,secondary=false,disabled=false}) {
  return <Pressable onPress={onPress} disabled={disabled} style={[s.btn,secondary&&s.btnSecondary,disabled&&{opacity:0.5}]}><Text style={[s.btnText,secondary&&s.btnSecondaryText]}>{title}</Text></Pressable>;
}
function Card({children}) { return <View style={s.card}>{children}</View>; }
function Section({children}) { return <Text style={s.section}>{children}</Text>; }
function Empty({children="لا توجد بيانات مسجلة بعد."}) { return <Text style={s.empty}>{children}</Text>; }

export default function App() {
  const [data,setData] = useState(INITIAL);
  const [screen,setScreen] = useState("الرئيسية");
  const [loading,setLoading] = useState(true);
  const [loadedStorageKey,setLoadedStorageKey] = useState("");
  const [storageError,setStorageError] = useState(false);
  const [legacyLocalAvailable,setLegacyLocalAvailable] = useState(false);
  const [authReady,setAuthReady] = useState(!isSupabaseConfigured);
  const [authSession,setAuthSession] = useState(null);
  const [authBusy,setAuthBusy] = useState(false);
  const [authEmail,setAuthEmail] = useState("");
  const [authPassword,setAuthPassword] = useState("");
  const [authMode,setAuthMode] = useState("signin");
  const [authMessage,setAuthMessage] = useState("");
  const [organizationId,setOrganizationId] = useState("");
  const [organizationRole,setOrganizationRole] = useState("");
  const [organizationName,setOrganizationName] = useState("معامل جوري للصناعات المتعددة");
  const [membershipLoading,setMembershipLoading] = useState(false);
  const [cloudBusy,setCloudBusy] = useState(false);
  const [cloudChecked,setCloudChecked] = useState(false);
  const [cloudRevision,setCloudRevision] = useState(null);
  const [cloudRemoteData,setCloudRemoteData] = useState(null);
  const [cloudUpdatedAt,setCloudUpdatedAt] = useState("");
  const [cloudStatus,setCloudStatus] = useState("لم يتم فحص السحابة بعد.");
  const [name,setName] = useState("");
  const [amount,setAmount] = useState("");
  const [quantity,setQuantity] = useState("");
  const [note,setNote] = useState("");
  const [itemName,setItemName] = useState("");
  const [itemQty,setItemQty] = useState("");
  const [outQty,setOutQty] = useState("");
  const [userName,setUserName] = useState("");
  const [userRole,setUserRole] = useState("موظف");
  const [permissionUserId,setPermissionUserId] = useState("");
  const [backupText,setBackupText] = useState("");
  const [purchaseItem,setPurchaseItem] = useState("");
  const [purchaseQty,setPurchaseQty] = useState("");
  const [purchaseCost,setPurchaseCost] = useState("");
  const [supplier,setSupplier] = useState("");
  const [purchasePaid,setPurchasePaid] = useState("");
  const [supplierPaymentName,setSupplierPaymentName] = useState("");
  const [supplierPaymentAmount,setSupplierPaymentAmount] = useState("");
  const [expenseCategory,setExpenseCategory] = useState("تشغيل");
  const [expenseCenter,setExpenseCenter] = useState("عام");
  const [expenseProject,setExpenseProject] = useState("TRUST - الصابون");
  const [openingCashInput,setOpeningCashInput] = useState("");
  const [trustReportDay,setTrustReportDay] = useState(new Date().toISOString().slice(0,10));
  const [productionProduct,setProductionProduct] = useState("");
  const [productionOutput,setProductionOutput] = useState("");
  const [productionMaterials,setProductionMaterials] = useState("");
  const [productionExtraCost,setProductionExtraCost] = useState("");
  const [productionNote,setProductionNote] = useState("");
  const [recipeName,setRecipeName] = useState("");
  const [recipeProduct,setRecipeProduct] = useState("");
  const [recipeOutput,setRecipeOutput] = useState("");
  const [recipeMaterials,setRecipeMaterials] = useState("");
  const [selectedRecipeId,setSelectedRecipeId] = useState("");
  const [productionLot,setProductionLot] = useState("");
  const [saleLot,setSaleLot] = useState("");
  const [newCustomerName,setNewCustomerName] = useState("");
  const [newCustomerPhone,setNewCustomerPhone] = useState("");
  const [saleCustomerName,setSaleCustomerName] = useState("");
  const [salePaid,setSalePaid] = useState("");
  const [saleProject,setSaleProject] = useState("TRUST - الصابون");
  const [staffName,setStaffName] = useState("");
  const [staffJob,setStaffJob] = useState("");
  const [staffDepartment,setStaffDepartment] = useState("الإدارة العامة");
  const [reportDepartment,setReportDepartment] = useState("الكل");
  const [staffSalary,setStaffSalary] = useState("");
  const [attendanceStaff,setAttendanceStaff] = useState("");
  const [attendanceDate,setAttendanceDate] = useState(new Date().toISOString().slice(0,10));
  const [attendanceStatus,setAttendanceStatus] = useState("حضور");
  const [attendanceNote,setAttendanceNote] = useState("");
  const [payrollMonth,setPayrollMonth] = useState(new Date().toISOString().slice(0,7));
  const [payrollPayAmount,setPayrollPayAmount] = useState("");
  const [taskTitle,setTaskTitle] = useState("");
  const [taskDescription,setTaskDescription] = useState("");
  const [taskDepartment,setTaskDepartment] = useState("الإدارة العامة");
  const [taskAssignee,setTaskAssignee] = useState("");
  const [taskDueDate,setTaskDueDate] = useState(new Date().toISOString().slice(0,10));
  const [taskPriority,setTaskPriority] = useState("متوسطة");
  const [paymentCustomerId,setPaymentCustomerId] = useState("");
  const [paymentAmount,setPaymentAmount] = useState("");
  const [qcProduct,setQcProduct] = useState("");
  const [qcLot,setQcLot] = useState("");
  const [qcStage,setQcStage] = useState("منتج نهائي");
  const [qcDecision,setQcDecision] = useState("مقبول");
  const [qcDefects,setQcDefects] = useState("");
  const [qcNote,setQcNote] = useState("");

  const storageKey = authSession?.user?.id ? KEY + ":" + authSession.user.id : KEY;
  const syncMetaKey = organizationId && authSession?.user?.id ? KEY + ":cloud-sync-meta:" + organizationId + ":" + authSession.user.id : "";
  const pendingSyncKey = organizationId && authSession?.user?.id ? KEY + ":cloud-sync-pending:" + organizationId + ":" + authSession.user.id : "";
  const dataRef = useRef(data);
  const autoSyncLock = useRef(false);
  const autoSyncTimer = useRef(null);

  useEffect(() => {
    dataRef.current=data;
  }, [data]);

  useEffect(() => {
    setCloudChecked(false);
    setCloudRevision(null);
    setCloudRemoteData(null);
    setCloudUpdatedAt("");
    setCloudStatus("لم يتم فحص السحابة بعد.");
  }, [organizationId]);

  useEffect(() => {
    let active=true;
    let didLoad=false;
    setLoadedStorageKey("");
    setLoading(true);
    AsyncStorage.getItem(storageKey).then(async raw => {
      if(!active) return;
      if(raw) {
        const parsed=JSON.parse(raw);
        if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)) throw new Error("Invalid local data");
        setData({...INITIAL,...parsed});
        setLegacyLocalAvailable(false);
      } else if(storageKey!==KEY) {
        const legacyRaw=await AsyncStorage.getItem(KEY);
        if(!active) return;
        setLegacyLocalAvailable(Boolean(legacyRaw));
        setData(INITIAL);
      } else {
        setLegacyLocalAvailable(false);
        setData(INITIAL);
      }
      didLoad=true;
    }).catch(() => { if(active) setStorageError(true); })
      .finally(() => {
        if(active) {
          setLoading(false);
          if(didLoad) setLoadedStorageKey(storageKey);
        }
      });
    return () => { active=false; };
  }, [storageKey]);

  const loadMembership = async userId => {
    if(!supabase || !userId) { setOrganizationId(""); setOrganizationRole(""); return; }
    setMembershipLoading(true);
    const { data: membership, error } = await supabase
      .from("jory_memberships")
      .select("organization_id,role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if(error) setAuthMessage("تعذر قراءة عضوية الحساب: " + error.message);
    setOrganizationId(membership?.organization_id || "");
    setOrganizationRole(membership?.role || "");
    setMembershipLoading(false);
  };

  useEffect(() => {
    if(!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(({data,error}) => {
      if(!active) return;
      if(error) setAuthMessage("تعذر استعادة جلسة الدخول: " + error.message);
      const session=data?.session || null;
      setAuthSession(session);
      if(session?.user?.id) loadMembership(session.user.id);
      setAuthReady(true);
    }).catch(error => {
      if(active) { setAuthMessage("تعذر الاتصال بالمصادقة: " + error.message); setAuthReady(true); }
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      setAuthSession(session || null);
      setOrganizationId("");
      setOrganizationRole("");
      if(session?.user?.id) loadMembership(session.user.id);
      else setMembershipLoading(false);
    });
    return () => { active=false; subscription.unsubscribe(); };
  }, []);

  const submitAuth = async () => {
    const email=authEmail.trim().toLowerCase();
    if(!email || !authPassword || authPassword.length<6) {
      Alert.alert("بيانات الدخول","أدخل بريداً إلكترونياً وكلمة مرور من 6 أحرف على الأقل."); return;
    }
    setAuthBusy(true); setAuthMessage("");
    try {
      const result = authMode==="signup"
        ? await supabase.auth.signUp({email,password:authPassword})
        : await supabase.auth.signInWithPassword({email,password:authPassword});
      if(result.error) throw result.error;
      if(authMode==="signup" && !result.data.session) {
        setAuthMessage("تم إنشاء طلب الحساب. راجع بريدك لتأكيده، ثم ارجع وسجّل الدخول.");
      } else if(result.data.session) {
        setAuthSession(result.data.session);
        await loadMembership(result.data.user.id);
        setAuthMessage("تم تسجيل الدخول. إذا لم تكن هناك مؤسسة مرتبطة، أنشئ مؤسسة جوري.");
      }
    } catch(error) {
      setAuthMessage(error.message || "تعذر إكمال العملية.");
    } finally { setAuthBusy(false); }
  };

  const createOrganization = async () => {
    const orgName=organizationName.trim();
    if(!orgName || !authSession?.user?.id) return;
    setAuthBusy(true); setAuthMessage("");
    try {
      const {data:org,error} = await supabase.from("jory_organizations")
        .insert({name:orgName,created_by:authSession.user.id})
        .select("id").single();
      if(error) throw error;
      setOrganizationId(org.id);
      setOrganizationRole("owner");
      setAuthMessage("تم إنشاء المؤسسة وتسجيل حسابك كمالك.");
    } catch(error) {
      setAuthMessage("تعذر إنشاء المؤسسة: " + error.message);
    } finally { setAuthBusy(false); }
  };

  const signOut = async () => {
    if(!supabase) return;
    const {error}=await supabase.auth.signOut();
    if(error) setAuthMessage("تعذر تسجيل الخروج: " + error.message);
    else { setAuthSession(null); setOrganizationId(""); setOrganizationRole(""); }
  };

  const importLegacyLocalData = () => {
    if(!legacyLocalAvailable || storageKey===KEY) return;
    Alert.alert(
      "استيراد البيانات المحلية السابقة",
      "تم العثور على بيانات محفوظة من النسخة السابقة على هذا الجهاز. سيتم نسخها إلى حسابك الحالي، مع إبقاء الملف الأصلي ونسخة احتياطية محلية.",
      [
        {text:"إلغاء",style:"cancel"},
        {text:"استيراد آمن",onPress:async()=>{
          try {
            const legacyRaw=await AsyncStorage.getItem(KEY);
            if(!legacyRaw) {
              setLegacyLocalAvailable(false);
              Alert.alert("لم يتم العثور على نسخة","النسخة المحلية السابقة غير موجودة.");
              return;
            }
            const parsed=JSON.parse(legacyRaw);
            if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)) {
              throw new Error("ملف البيانات المحلية السابقة غير صالح.");
            }
            const backupKey=KEY+":before-legacy-import:"+Date.now();
            await AsyncStorage.setItem(backupKey,JSON.stringify(data));
            const imported={...INITIAL,...parsed};
            await AsyncStorage.setItem(storageKey,JSON.stringify(imported));
            setData(imported);
            setLegacyLocalAvailable(false);
            setStorageError(false);
            Alert.alert("اكتمل الاستيراد","تم استيراد البيانات السابقة إلى حسابك. النسخة الأصلية لم تُحذف.");
          } catch(error) {
            setStorageError(true);
            Alert.alert("تعذر الاستيراد",error.message||"حدث خطأ أثناء الاستيراد.");
          }
        }}
      ]
    );
  };

  const attemptAutomaticSync = async () => {
    if(!supabase || !organizationId || !syncMetaKey || !["owner","admin"].includes(organizationRole) || autoSyncLock.current) return;
    let pendingMarker=null;
    try {
      pendingMarker=await AsyncStorage.getItem(pendingSyncKey);
      if(!pendingMarker) return;
      const metaRaw=await AsyncStorage.getItem(syncMetaKey);
      if(!metaRaw) {
        setCloudStatus("توجد تعديلات محلية. نفّذ أول رفع أو تحميل يدوي لتأسيس المزامنة التلقائية.");
        return;
      }
      const meta=JSON.parse(metaRaw);
      if(!Number.isFinite(Number(meta.revision))) {
        setCloudStatus("بيانات تأسيس المزامنة غير صالحة. أعد فحص السحابة.");
        return;
      }
      const network=await Network.getNetworkStateAsync();
      if(network.isConnected!==true || network.isInternetReachable===false) return;

      autoSyncLock.current=true;
      const {data:latest,error:readError}=await supabase.from("jory_business_data")
        .select("revision,updated_at")
        .eq("organization_id",organizationId)
        .maybeSingle();
      if(readError) throw readError;
      if(!latest || Number(latest.revision)!==Number(meta.revision) || latest.updated_at!==meta.updatedAt) {
        setCloudChecked(false);
        setCloudStatus("تعارض في المزامنة التلقائية: النسخة السحابية تغيرت على جهاز آخر. لم يتم استبدال أي بيانات؛ راجع النسختين يدوياً.");
        return;
      }

      const snapshot=dataRef.current;
      const {data:saved,error:updateError}=await supabase.from("jory_business_data")
        .update({data:snapshot})
        .eq("organization_id",organizationId)
        .eq("revision",Number(meta.revision))
        .eq("updated_at",meta.updatedAt)
        .select("revision,updated_at")
        .maybeSingle();
      if(updateError) throw updateError;
      if(!saved) {
        setCloudChecked(false);
        setCloudStatus("تعارض أثناء المزامنة التلقائية. احتفظ جوري ببيانات الجهاز ولم يكتب فوق النسخة السحابية.");
        return;
      }

      const nextMeta={revision:Number(saved.revision),updatedAt:saved.updated_at||""};
      await AsyncStorage.setItem(syncMetaKey,JSON.stringify(nextMeta));
      setCloudRevision(nextMeta.revision);
      setCloudRemoteData({...snapshot});
      setCloudUpdatedAt(nextMeta.updatedAt);
      const currentPending=await AsyncStorage.getItem(pendingSyncKey);
      if(currentPending===pendingMarker) await AsyncStorage.removeItem(pendingSyncKey);
      if(dataRef.current!==snapshot) {
        await AsyncStorage.setItem(pendingSyncKey,String(Date.now()));
        scheduleAutomaticSync();
      } else {
        setCloudStatus("تمت مزامنة التعديلات تلقائياً. رقم المراجعة: "+nextMeta.revision+".");
      }
    } catch(error) {
      setCloudStatus("تعذرت المزامنة التلقائية حالياً: "+(error.message||"تحقق من الاتصال ثم أعد المحاولة."));
    } finally {
      autoSyncLock.current=false;
    }
  };

  const scheduleAutomaticSync = () => {
    if(autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current=setTimeout(() => {
      autoSyncTimer.current=null;
      attemptAutomaticSync();
    },1200);
  };

  useEffect(() => {
    if(!organizationId || !supabase || loading || loadedStorageKey!==storageKey) return;
    const networkSubscription=Network.addNetworkStateListener(state=>{
      if(state.isConnected===true && state.isInternetReachable!==false) attemptAutomaticSync();
    });
    const appSubscription=AppState.addEventListener("change",state=>{
      if(state==="active") attemptAutomaticSync();
    });
    attemptAutomaticSync();
    return ()=>{
      networkSubscription.remove();
      appSubscription.remove();
      if(autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    };
  },[organizationId,organizationRole,loading,loadedStorageKey,storageKey]);

  const persist = async next => {
    setData(next);
    dataRef.current=next;
    try {
      await AsyncStorage.setItem(storageKey,JSON.stringify(next));
      setStorageError(false);
      if(syncMetaKey) {
        const metaRaw=await AsyncStorage.getItem(syncMetaKey);
        if(metaRaw) {
          await AsyncStorage.setItem(pendingSyncKey,String(Date.now()));
          scheduleAutomaticSync();
        }
      }
    } catch (_) {
      setStorageError(true);
      Alert.alert("تنبيه","تعذر حفظ البيانات على الجهاز. تحقق من مساحة التخزين.");
    }
  };

  const refreshCloudStatus = async () => {
    if(!supabase || !organizationId) {
      Alert.alert("الاتصال غير جاهز","سجّل الدخول إلى مؤسسة جوري أولاً.");
      return;
    }
    setCloudBusy(true);
    setCloudStatus("جارٍ فحص النسخة السحابية...");
    try {
      const {data:row,error}=await supabase.from("jory_business_data")
        .select("data,revision,updated_at")
        .eq("organization_id",organizationId)
        .maybeSingle();
      if(error) throw error;
      setCloudChecked(true);
      if(!row) {
        setCloudRevision(null);
        setCloudRemoteData(null);
        setCloudUpdatedAt("");
        setCloudStatus("لا توجد نسخة سحابية لهذه المؤسسة. يمكنك إنشاء أول نسخة برفع البيانات المحلية.");
      } else {
        if(!row.data || typeof row.data!=="object" || Array.isArray(row.data)) {
          throw new Error("تنسيق النسخة السحابية غير صالح.");
        }
        setCloudRevision(Number(row.revision));
        setCloudRemoteData({...INITIAL,...row.data});
        setCloudUpdatedAt(row.updated_at||"");
        setCloudStatus("توجد نسخة سحابية. رقم المراجعة: "+row.revision+". لم يتم تحميلها أو دمجها.");
      }
    } catch(error) {
      setCloudChecked(false);
      setCloudStatus("تعذر فحص السحابة: "+(error.message||"خطأ غير معروف"));
    } finally {
      setCloudBusy(false);
    }
  };

  const uploadLocalData = () => {
    if(!["owner","admin"].includes(organizationRole)) {
      Alert.alert("صلاحية غير كافية","رفع البيانات والمزامنة التلقائية متاحان لمالك المؤسسة أو المدير الإداري فقط. يمكنك تحميل نسخة المؤسسة للقراءة.");
      return;
    }
    if(legacyLocalAvailable) {
      Alert.alert("استورد بياناتك السابقة أولاً","وجد جوري بيانات محلية من النسخة السابقة لم تُنقل إلى حسابك بعد. استوردها أولاً حتى لا ترفع سجلاً فارغاً أو ناقصاً.");
      return;
    }
    if(!cloudChecked) {
      Alert.alert("افحص السحابة أولاً","اضغط فحص السحابة قبل رفع البيانات.");
      return;
    }
    Alert.alert(
      "تأكيد رفع البيانات",
      cloudRemoteData
        ? "سيتم استبدال محتوى النسخة السحابية الحالية ببيانات هذا الجهاز. ستبقى النسخة المحلية محفوظة. هل تريد المتابعة؟"
        : "سيتم إنشاء أول نسخة سحابية من بيانات هذا الجهاز. هل تريد المتابعة؟",
      [
        {text:"إلغاء",style:"cancel"},
        {text:"تأكيد الرفع",onPress:async()=>{
          const localSnapshot=dataRef.current;
          setCloudBusy(true);
          setCloudStatus("جارٍ التحقق من النسخة السحابية قبل الرفع...");
          try {
            const {data:latest,error:readError}=await supabase.from("jory_business_data")
              .select("revision,updated_at")
              .eq("organization_id",organizationId)
              .maybeSingle();
            if(readError) throw readError;

            if(latest) {
              if(cloudRevision===null || (Number(latest.revision)!==cloudRevision || latest.updated_at!==cloudUpdatedAt)) {
                setCloudChecked(false);
                setCloudStatus("تعارض: النسخة السحابية تغيرت منذ آخر فحص. افحصها مجدداً قبل أي رفع.");
                Alert.alert("تم إيقاف الرفع","هناك نسخة سحابية أحدث. لم يتم استبدال أي بيانات.");
                return;
              }
              const {data:saved,error}=await supabase.from("jory_business_data")
                .update({data:localSnapshot})
                .eq("organization_id",organizationId)
                .eq("revision",cloudRevision)
                .eq("updated_at",cloudUpdatedAt)
                .select("revision,updated_at")
                .maybeSingle();
              if(error) throw error;
              if(!saved) {
                setCloudChecked(false);
                setCloudStatus("تعارض أثناء الرفع. افحص السحابة مجدداً.");
                Alert.alert("تم إيقاف الرفع","تغيرت النسخة السحابية أثناء العملية. بيانات الجهاز لم تتغير.");
                return;
              }
              setCloudRevision(Number(saved.revision));
              setCloudRemoteData({...localSnapshot});
              setCloudUpdatedAt(saved.updated_at||"");
              await AsyncStorage.setItem(syncMetaKey,JSON.stringify({revision:Number(saved.revision),updatedAt:saved.updated_at||""}));
              await AsyncStorage.removeItem(pendingSyncKey);
              if(dataRef.current!==localSnapshot) { await AsyncStorage.setItem(pendingSyncKey,String(Date.now())); scheduleAutomaticSync(); }
              setCloudStatus("تم رفع بيانات هذا الجهاز بنجاح. المزامنة التلقائية مفعّلة للتعديلات القادمة.");
            } else {
              if(cloudRevision!==null) {
                setCloudChecked(false);
                setCloudStatus("تعارض: النسخة السحابية التي فُحصت لم تعد موجودة. افحص السحابة مجدداً.");
                Alert.alert("تم إيقاف الرفع","تغيرت حالة النسخة السحابية. لم يتم رفع البيانات.");
                return;
              }
              const {data:saved,error}=await supabase.from("jory_business_data")
                .insert({organization_id:organizationId,data:localSnapshot})
                .select("revision,updated_at")
                .single();
              if(error) throw error;
              setCloudRevision(Number(saved.revision));
              setCloudRemoteData({...localSnapshot});
              setCloudUpdatedAt(saved.updated_at||"");
              await AsyncStorage.setItem(syncMetaKey,JSON.stringify({revision:Number(saved.revision),updatedAt:saved.updated_at||""}));
              await AsyncStorage.removeItem(pendingSyncKey);
              if(dataRef.current!==localSnapshot) { await AsyncStorage.setItem(pendingSyncKey,String(Date.now())); scheduleAutomaticSync(); }
              setCloudStatus("تم إنشاء أول نسخة سحابية بنجاح. المزامنة التلقائية مفعّلة للتعديلات القادمة.");
            }
          } catch(error) {
            setCloudStatus("تعذر رفع البيانات: "+(error.message||"خطأ غير معروف"));
            Alert.alert("تعذر الرفع",error.message||"حدث خطأ غير معروف.");
          } finally {
            setCloudBusy(false);
          }
        }}
      ]
    );
  };

  const downloadCloudData = () => {
    if(!cloudChecked || !cloudRemoteData || cloudRevision===null) {
      Alert.alert("لا توجد نسخة جاهزة","افحص السحابة أولاً وتأكد من وجود نسخة.");
      return;
    }
    Alert.alert(
      "تأكيد تحميل النسخة السحابية",
      "سيتم استبدال البيانات الحالية على هذا الجهاز. سيحفظ جوري نسخة محلية احتياطية تلقائياً قبل الاستبدال.",
      [
        {text:"إلغاء",style:"cancel"},
        {text:"حفظ نسخة ثم التحميل",onPress:async()=>{
          const localSnapshot=dataRef.current;
          setCloudBusy(true);
          try {
            const {data:latest,error:readError}=await supabase.from("jory_business_data")
              .select("data,revision,updated_at")
              .eq("organization_id",organizationId)
              .maybeSingle();
            if(readError) throw readError;
            if(!latest || (Number(latest.revision)!==cloudRevision || latest.updated_at!==cloudUpdatedAt)) {
              if(latest && latest.data && typeof latest.data==="object" && !Array.isArray(latest.data)) {
                setCloudRevision(Number(latest.revision));
                setCloudRemoteData({...INITIAL,...latest.data});
                setCloudUpdatedAt(latest.updated_at||"");
              }
              setCloudChecked(false);
              setCloudStatus("تغيرت النسخة السحابية. افحصها مجدداً قبل التحميل.");
              Alert.alert("تم إيقاف التحميل","النسخة السحابية تغيرت منذ آخر فحص. لم يتم استبدال بيانات الجهاز.");
              return;
            }
            if(dataRef.current!==localSnapshot) {
              Alert.alert("تغيرت البيانات المحلية","تم تسجيل تعديل جديد أثناء التحميل. لم يستبدل جوري بيانات الجهاز؛ أعد فحص السحابة ثم أعد المحاولة.");
              return;
            }
            const backupKey=KEY+":before-cloud-restore:"+Date.now();
            await AsyncStorage.setItem(backupKey,JSON.stringify(localSnapshot));
            const safeRemote={...INITIAL,...latest.data};
            await AsyncStorage.setItem(storageKey,JSON.stringify(safeRemote));
            setData(safeRemote);
            dataRef.current=safeRemote;
            setStorageError(false);
            setCloudRemoteData(safeRemote);
            setCloudUpdatedAt(latest.updated_at||"");
            await AsyncStorage.setItem(syncMetaKey,JSON.stringify({revision:Number(latest.revision),updatedAt:latest.updated_at||""}));
            await AsyncStorage.removeItem(pendingSyncKey);
            setCloudStatus("تم تحميل النسخة السحابية. حُفظت نسخة الجهاز السابقة احتياطياً، والمزامنة التلقائية مفعّلة.");
            Alert.alert("اكتمل التحميل","تم تحميل النسخة السحابية مع الاحتفاظ بنسخة احتياطية محلية من البيانات السابقة.");
          } catch(error) {
            setStorageError(true);
            setCloudStatus("تعذر تحميل النسخة: "+(error.message||"خطأ غير معروف"));
            Alert.alert("تعذر التحميل",error.message||"حدث خطأ أثناء حفظ النسخة الاحتياطية أو تحميل البيانات.");
          } finally {
            setCloudBusy(false);
          }
        }}
      ]
    );
  };

  const totals = useMemo(() => {
    const sales=data.sales.reduce((a,x)=>a+Number(x.amount||0),0);
    const expenses=data.expenses.reduce((a,x)=>a+Number(x.amount||0),0);
    const cogs=data.sales.reduce((a,x)=>a+Number(x.cogs||0),0);
    return {sales,expenses,cogs,gross:sales-cogs,net:sales-cogs-expenses};
  },[data]);

  const addFinancial = async type => {
    const v=Number(amount);
    if(!name.trim() || !amount.trim() || !Number.isFinite(v) || v<=0) {
      Alert.alert("بيانات ناقصة","أدخل الوصف والمبلغ الصحيح الأكبر من صفر."); return;
    }
    let entry={id:Date.now().toString(),name:name.trim(),amount:v,quantity:quantity.trim(),note:note.trim(),date:stamp()};
    if(type==="expenses") entry={...entry,category:expenseCategory.trim()||"غير مصنف",costCenter:expenseCenter.trim()||"عام",project:expenseProject.trim()||"عام"};
    if(type==="sales") {
      const customer=saleCustomerName.trim()?(data.customers||[]).find(x=>x.name.trim().toLowerCase()===saleCustomerName.trim().toLowerCase()):null;
      if(saleCustomerName.trim() && !customer) { Alert.alert("العميل غير مسجل","أضف العميل أولاً من صفحة العملاء أو اترك الحقل فارغاً."); return; }
      const paid=salePaid.trim()===""?v:Number(salePaid);
      if(!Number.isFinite(paid)||paid<0||paid>v) { Alert.alert("المبلغ المحصل غير صحيح","أدخل مبلغاً من صفر إلى قيمة الفاتورة."); return; }
      entry={...entry,customerId:customer?.id,customerName:customer?.name||"بيع نقدي",paidAmount:paid,dueAmount:v-paid,project:saleProject.trim()||"غير محدد"};
    }
    let next={...data,[type]:[entry,...data[type]]};
    const cashAmount=type==="sales"?Number(entry.paidAmount??entry.amount):type==="expenses"?Number(entry.amount):0;
    if(cashAmount>0) next.cashMovements=[{id:"cash-"+entry.id,referenceId:entry.id,type:type==="sales"?"قبض مبيعات":"صرف مصروف",direction:type==="sales"?"in":"out",amount:cashAmount,description:entry.name,date:entry.date},...(data.cashMovements||[])];
    if(type==="sales" && quantity.trim()) {
      const q=Number(quantity);
      if(!Number.isFinite(q) || q<=0) { Alert.alert("كمية غير صحيحة","أدخل كمية بيع أكبر من صفر."); return; }
      const item=data.stock.find(x=>x.name.trim().toLowerCase()===name.trim().toLowerCase());
      if(!item) { Alert.alert("الصنف غير موجود","أضف الصنف إلى المخزون أولاً، واستخدم اسم الصنف نفسه عند تسجيل البيع."); return; }
      const productLots=(data.productions||[]).filter(x=>(x.productId===item.id || x.productName.trim().toLowerCase()===item.name.trim().toLowerCase()));
      let selectedLot=null;
      if(productLots.length) {
        if(!saleLot.trim()) { Alert.alert("رقم التشغيلة مطلوب","هذا المنتج له تشغيلات إنتاج. أدخل رقم التشغيلة المراد البيع منها."); return; }
        selectedLot=productLots.find(x=>String(x.lotNumber||"").trim().toLowerCase()===saleLot.trim().toLowerCase());
        if(!selectedLot) { Alert.alert("التشغيلة غير موجودة","راجع رقم التشغيلة المسجل في الإنتاج."); return; }
        if(selectedLot.qualityStatus!=="مقبول") { Alert.alert("التشغيلة غير معتمدة","حالة جودة التشغيلة: "+(selectedLot.qualityStatus||"بانتظار الفحص")+"."); return; }
        if(q>Number(selectedLot.remainingQuantity??selectedLot.outputQuantity)) { Alert.alert("رصيد التشغيلة غير كافٍ","المتبقي في هذه التشغيلة "+Number(selectedLot.remainingQuantity??selectedLot.outputQuantity)+"."); return; }
      } else {
        const finalChecks=(data.qualityChecks||[]).filter(x=>x.product.trim().toLowerCase()===item.name.trim().toLowerCase() && x.stage==="منتج نهائي").sort((a,b)=>new Date(b.date)-new Date(a.date));
        if(finalChecks.length && finalChecks[0].decision!=="مقبول") { Alert.alert("البيع موقوف من الجودة","آخر فحص للمنتج "+item.name+" نتيجته: "+finalChecks[0].decision+"."); return; }
      }
      if(q>Number(item.quantity)) { Alert.alert("رصيد غير كافٍ", "المتاح من "+item.name+" هو "+item.quantity+" فقط."); return; }
      const unitCost=Number(item.unitCost)||0;
      entry={...entry,itemId:item.id,lotNumber:selectedLot?selectedLot.lotNumber:undefined,unitCost,cogs:q*unitCost,grossProfit:v-(q*unitCost)};
      next={...next,stock:data.stock.map(x=>x.id===item.id?{...x,quantity:Number(x.quantity)-q}:x),productions:selectedLot?(data.productions||[]).map(x=>x.id===selectedLot.id?{...x,remainingQuantity:Number(x.remainingQuantity??x.outputQuantity)-q}:x):(data.productions||[]),movements:[...(data.movements||[]),{id:entry.id,itemId:item.id,itemName:item.name,type:"بيع",quantity:q,lotNumber:selectedLot?selectedLot.lotNumber:undefined,date:entry.date}]};
    }
    await persist(next); setName(""); setAmount(""); setQuantity(""); setNote(""); setSaleLot(""); setSaleCustomerName(""); setSalePaid("");
    Alert.alert("تم الحفظ","تم تسجيل العملية على هذا الجهاز.");
  };

  const addCustomer = async () => {
    const customerName=newCustomerName.trim();
    if(!customerName) { Alert.alert("بيانات ناقصة","أدخل اسم العميل."); return; }
    if((data.customers||[]).some(x=>x.name.trim().toLowerCase()===customerName.toLowerCase())) { Alert.alert("عميل موجود","هذا العميل مسجل بالفعل."); return; }
    const customer={id:"customer-"+Date.now(),name:customerName,phone:newCustomerPhone.trim(),date:stamp()};
    await persist({...data,customers:[customer,...(data.customers||[])]});
    setNewCustomerName("");setNewCustomerPhone("");
    Alert.alert("تم التسجيل","أُضيف العميل إلى سجل جوري.");
  };

  const collectPayment = async () => {
    const value=Number(paymentAmount);
    const customer=(data.customers||[]).find(x=>x.id===paymentCustomerId);
    if(!customer || !paymentAmount.trim() || !Number.isFinite(value) || value<=0) { Alert.alert("بيانات غير مكتملة","اختر عميلاً وأدخل مبلغ تحصيل صحيحاً."); return; }
    let remaining=value;
    const invoices=(data.sales||[]).filter(x=>x.customerId===customer.id && Number(x.dueAmount)>0).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const due=invoices.reduce((sum,x)=>sum+Number(x.dueAmount||0),0);
    if(value>due) { Alert.alert("المبلغ أكبر من المديونية","إجمالي المديونية الحالية "+money(due)+"."); return; }
    const updatedSales=(data.sales||[]).map(sale=>{
      if(sale.customerId!==customer.id || remaining<=0 || Number(sale.dueAmount)<=0) return sale;
      const applied=Math.min(remaining,Number(sale.dueAmount));
      remaining-=applied;
      return {...sale,paidAmount:Number(sale.paidAmount||0)+applied,dueAmount:Number(sale.dueAmount)-applied};
    });
    const receipt={id:"receipt-"+Date.now(),customerId:customer.id,customerName:customer.name,amount:value,date:stamp()};
    const cashEntry={id:"cash-"+receipt.id,referenceId:receipt.id,type:"تحصيل عميل",direction:"in",amount:value,description:"تحصيل من "+customer.name,date:receipt.date};
    await persist({...data,sales:updatedSales,receipts:[receipt,...(data.receipts||[])],cashMovements:[cashEntry,...(data.cashMovements||[])]});
    setPaymentAmount("");
    Alert.alert("تم التحصيل","تم توزيع المبلغ على أقدم الفواتير المستحقة.");
  };

  const collectSupplierPayment = async () => {
    const value=Number(supplierPaymentAmount), supplierName=supplierPaymentName.trim();
    if(!supplierName || !supplierPaymentAmount.trim() || !Number.isFinite(value) || value<=0) { Alert.alert("بيانات غير مكتملة","أدخل اسم المورد ومبلغ سداد صحيحاً."); return; }
    const bills=(data.purchases||[]).filter(x=>(x.supplier||"مورد غير محدد").trim().toLowerCase()===supplierName.toLowerCase() && Number(x.dueAmount)>0).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    const due=bills.reduce((sum,x)=>sum+Number(x.dueAmount||0),0);
    if(!bills.length) { Alert.alert("لا توجد مديونية","لا توجد فواتير مستحقة لهذا المورد."); return; }
    if(value>due) { Alert.alert("المبلغ أكبر من المستحق","إجمالي مستحقات المورد "+money(due)+"."); return; }
    let remaining=value;
    const purchases=(data.purchases||[]).map(p=>{
      if((p.supplier||"مورد غير محدد").trim().toLowerCase()!==supplierName.toLowerCase() || remaining<=0 || Number(p.dueAmount)<=0) return p;
      const applied=Math.min(remaining,Number(p.dueAmount)); remaining-=applied;
      return {...p,paidAmount:Number(p.paidAmount||0)+applied,dueAmount:Number(p.dueAmount)-applied};
    });
    const receipt={id:"supplier-payment-"+Date.now(),supplier:supplierName,amount:value,date:stamp()};
    const cashEntry={id:"cash-"+receipt.id,referenceId:receipt.id,type:"سداد مورد",direction:"out",amount:value,description:"سداد إلى "+supplierName,date:receipt.date};
    await persist({...data,purchases,supplierPayments:[receipt,...(data.supplierPayments||[])],cashMovements:[cashEntry,...(data.cashMovements||[])]});
    setSupplierPaymentAmount("");
    Alert.alert("تم السداد","تم توزيع السداد على أقدم فواتير المورد.");
  };

  const saveOpeningCash = async () => {
    const value=openingCashInput.trim()===""?0:Number(openingCashInput);
    if(!Number.isFinite(value)) { Alert.alert("قيمة غير صحيحة","أدخل رصيداً افتتاحياً رقمياً."); return; }
    await persist({...data,openingCash:value});
    Alert.alert("تم الحفظ","تم تحديث الرصيد الافتتاحي للخزينة.");
  };

  const addStock = async () => {
    const q=Number(itemQty);
    if(!itemName.trim() || !itemQty.trim() || !Number.isFinite(q) || q<=0) {
      Alert.alert("بيانات ناقصة","أدخل اسم الصنف والكمية الصحيحة."); return;
    }
    const found=data.stock.find(x=>x.name.toLowerCase()===itemName.trim().toLowerCase());
    let stock;
    if(found) stock=data.stock.map(x=>x.id===found.id?{...x,quantity:Number(x.quantity)+q}:x);
    else stock=[{id:Date.now().toString(),name:itemName.trim(),quantity:q},...data.stock];
    const movements=[...(data.movements||[]),{id:Date.now().toString(),itemId:found?found.id:stock[0].id,itemName:itemName.trim(),type:"إضافة",quantity:q,date:stamp()}];
    await persist({...data,stock,movements}); setItemName(""); setItemQty("");
  };

  const addPurchase = async () => {
    const q=Number(purchaseQty), cost=Number(purchaseCost);
    if(!purchaseItem.trim() || !purchaseQty.trim() || !purchaseCost.trim() || !Number.isFinite(q) || q<=0 || !Number.isFinite(cost) || cost<=0) {
      Alert.alert("بيانات غير مكتملة","أدخل الصنف والكمية وتكلفة الشراء الإجمالية بقيم أكبر من صفر."); return;
    }
    const found=data.stock.find(x=>x.name.trim().toLowerCase()===purchaseItem.trim().toLowerCase());
    const oldQty=found?Number(found.quantity)||0:0;
    const oldCost=found?Number(found.unitCost)||0:0;
    const unitCost=cost/q;
    const knownCostQty=oldCost>0?oldQty:0;
    const newUnitCost=(knownCostQty+q)>0?((knownCostQty*oldCost)+cost)/(knownCostQty+q):unitCost;
    const itemId=found?found.id:Date.now().toString();
    const stock=found
      ? data.stock.map(x=>x.id===itemId?{...x,quantity:oldQty+q,unitCost:newUnitCost}:x)
      : [{id:itemId,name:purchaseItem.trim(),quantity:q,unitCost},...data.stock];
    const date=stamp();
    const paid=purchasePaid.trim()===""?cost:Number(purchasePaid);
    if(!Number.isFinite(paid)||paid<0||paid>cost) { Alert.alert("المبلغ المدفوع غير صحيح","أدخل مبلغاً من صفر إلى إجمالي تكلفة الشراء."); return; }
    const purchase={id:date+Math.random().toString(36).slice(2,6),itemId,itemName:purchaseItem.trim(),quantity:q,totalCost:cost,unitCost,supplier:supplier.trim()||"مورد غير محدد",paidAmount:paid,dueAmount:cost-paid,date};
    const movements=[...(data.movements||[]),{id:purchase.id,itemId,itemName:purchaseItem.trim(),type:"شراء",quantity:q,date}];
    const cashMovements=paid>0?[{id:"cash-"+purchase.id,referenceId:purchase.id,type:"سداد مشتريات",direction:"out",amount:paid,description:"شراء "+purchase.itemName+" من "+purchase.supplier,date},...(data.cashMovements||[])]:[...(data.cashMovements||[])];
    await persist({...data,stock,purchases:[...(data.purchases||[]),purchase],movements,cashMovements});
    setPurchaseItem("");setPurchaseQty("");setPurchaseCost("");setSupplier("");setPurchasePaid("");
    Alert.alert("تم تسجيل الشراء","تم تحديث رصيد المخزون ومتوسط تكلفة الوحدة.");
  };

  const issueStock = async item => {
    const q=Number(outQty);
    if(!outQty.trim() || !Number.isFinite(q) || q<=0) {
      Alert.alert("كمية غير صحيحة","أدخل كمية صرف أكبر من صفر."); return;
    }
    const current=data.stock.find(x=>x.id===item.id);
    if(!current || q>Number(current.quantity)) {
      Alert.alert("رصيد غير كافٍ","الكمية المطلوبة أكبر من الرصيد المتاح."); return;
    }
    const stock=data.stock.map(x=>x.id===item.id?{...x,quantity:Number(x.quantity)-q}:x);
    const movements=[...(data.movements||[]),{id:Date.now().toString(),itemId:item.id,itemName:item.name,type:"صرف",quantity:q,date:stamp()}];
    await persist({...data,stock,movements});
    setOutQty("");
    Alert.alert("تم الصرف","تم خصم الكمية من رصيد المخزون.");
  };

  const addProduction = async () => {
    const output=Number(productionOutput), extra=productionExtraCost.trim()?Number(productionExtraCost):0;
    if(!productionProduct.trim() || !productionOutput.trim() || !Number.isFinite(output) || output<=0 || (!selectedRecipeId && !productionMaterials.trim()) || !Number.isFinite(extra) || extra<0) {
      Alert.alert("بيانات ناقصة","أدخل اسم المنتج النهائي والكمية والمواد الخام المستخدمة."); return;
    }
    const selectedRecipe=(data.recipes||[]).find(x=>x.id===selectedRecipeId);
    if(selectedRecipeId && !selectedRecipe) { Alert.alert("الوصفة غير متاحة","اختر وصفة محفوظة أو أدخل المواد الخام يدوياً."); return; }
    const lines=selectedRecipe
      ? selectedRecipe.materials.map(x=>x.itemName+" | "+(Number(x.quantity)*output/Number(selectedRecipe.baseOutput)))
      : productionMaterials.split("\n").map(x=>x.trim()).filter(Boolean);
    const requirements=[];
    for(const line of lines) {
      const parts=line.split(/[|,،]/).map(x=>x.trim());
      if(parts.length<2 || !parts[0] || !parts[1]) { Alert.alert("صيغة المواد غير صحيحة","اكتب كل مادة في سطر بالشكل: اسم المادة | الكمية"); return; }
      const qty=Number(parts[1]);
      if(!Number.isFinite(qty) || qty<=0) { Alert.alert("كمية غير صحيحة","راجع كميات المواد الخام."); return; }
      const item=data.stock.find(x=>x.name.trim().toLowerCase()===parts[0].toLowerCase());
      if(!item) { Alert.alert("مادة غير موجودة","المادة "+parts[0]+" غير موجودة في المخزون."); return; }
      if(Number(item.quantity)<qty) { Alert.alert("رصيد غير كافٍ","المتاح من "+item.name+" هو "+item.quantity+" والمطلوب "+qty+"."); return; }
      if(!(Number(item.unitCost)>0)) { Alert.alert("تكلفة غير مسجلة","سجّل شراء المادة "+item.name+" أولاً حتى تُحسب تكلفة الإنتاج."); return; }
      const rawChecks=(data.qualityChecks||[]).filter(x=>x.product.trim().toLowerCase()===item.name.trim().toLowerCase() && x.stage==="استلام مواد خام").sort((a,b)=>new Date(b.date)-new Date(a.date));
      if(rawChecks.length && rawChecks[0].decision==="مرفوض") { Alert.alert("المادة مرفوضة من الجودة","المادة "+item.name+" عليها آخر نتيجة فحص مرفوضة. أعد الفحص واعتمدها قبل الإنتاج."); return; }
      requirements.push({itemId:item.id,itemName:item.name,quantity:qty,unitCost:Number(item.unitCost),cost:qty*Number(item.unitCost)});
    }
    const combined=[];
    requirements.forEach(x=>{
      const prior=combined.find(y=>y.itemId===x.itemId);
      if(prior) { prior.quantity+=x.quantity; prior.cost+=x.cost; }
      else combined.push({...x});
    });
    for(const x of combined) {
      const current=data.stock.find(y=>y.id===x.itemId);
      if(!current || Number(current.quantity)<x.quantity) { Alert.alert("رصيد غير كافٍ","إجمالي الكمية المطلوبة من "+x.itemName+" أكبر من الرصيد المتاح."); return; }
    }
    requirements.length=0;
    requirements.push(...combined);
    const materialCost=requirements.reduce((sum,x)=>sum+x.cost,0);
    const totalCost=materialCost+extra;
    const unitCost=totalCost/output;
    const existing=data.stock.find(x=>x.name.trim().toLowerCase()===productionProduct.trim().toLowerCase());
    const oldQty=existing?Number(existing.quantity)||0:0;
    const oldUnitCost=existing?Number(existing.unitCost)||0:0;
    const newUnitCost=oldQty>0 && oldUnitCost>0 ? ((oldQty*oldUnitCost)+totalCost)/(oldQty+output) : unitCost;
    const productId=existing?existing.id:Date.now().toString();
    let stock=data.stock.map(x=>{
      const consumed=requirements.find(r=>r.itemId===x.id);
      if(consumed) return {...x,quantity:Number(x.quantity)-consumed.quantity};
      if(x.id===productId) return {...x,quantity:oldQty+output,unitCost:newUnitCost};
      return x;
    });
    if(!existing) stock=[{id:productId,name:productionProduct.trim(),quantity:output,unitCost},...stock];
    const date=stamp(), id="prod-"+Date.now().toString();
    const lotNumber=productionLot.trim()||("LOT-"+Date.now().toString());
    const production={id,productId,productName:productionProduct.trim(),lotNumber,outputQuantity:output,remainingQuantity:output,materials:requirements,materialCost,extraCost:extra,totalCost,unitCost,note:productionNote.trim(),qualityStatus:"بانتظار فحص المنتج النهائي",date};
    const movements=[...(data.movements||[]),...requirements.map((x,i)=>({id:id+"-raw-"+i,itemId:x.itemId,itemName:x.itemName,type:"استهلاك إنتاج",quantity:x.quantity,date})),{id:id+"-out",itemId:productId,itemName:productionProduct.trim(),type:"إنتاج",quantity:output,date}];
    await persist({...data,stock,productions:[...(data.productions||[]),production],movements});
    setProductionProduct("");setProductionOutput("");setProductionMaterials("");setProductionExtraCost("");setProductionNote("");setProductionLot("");setSelectedRecipeId("");
    Alert.alert("تم تسجيل الإنتاج","تم خصم المواد الخام وإضافة المنتج النهائي إلى المخزون.");
  };

  const addRecipe = async () => {
    const base=Number(recipeOutput);
    if(!recipeName.trim() || !recipeProduct.trim() || !recipeOutput.trim() || !Number.isFinite(base) || base<=0 || !recipeMaterials.trim()) {
      Alert.alert("بيانات الوصفة ناقصة","أدخل اسم الوصفة والمنتج والكمية الأساسية والمواد الخام."); return;
    }
    const lines=recipeMaterials.split("\n").map(x=>x.trim()).filter(Boolean);
    const materials=[];
    for(const line of lines) {
      const parts=line.split(/[|,،]/).map(x=>x.trim());
      const q=Number(parts[1]);
      if(parts.length<2 || !parts[0] || !Number.isFinite(q) || q<=0) { Alert.alert("صيغة غير صحيحة","اكتب كل مادة بالشكل: اسم المادة | الكمية."); return; }
      const item=data.stock.find(x=>x.name.trim().toLowerCase()===parts[0].toLowerCase());
      if(!item) { Alert.alert("مادة غير موجودة","أضف "+parts[0]+" إلى المخزون أولاً."); return; }
      if(!(Number(item.unitCost)>0)) { Alert.alert("تكلفة غير مسجلة","سجّل شراء "+item.name+" أولاً."); return; }
      const prior=materials.find(x=>x.itemId===item.id);
      if(prior) prior.quantity+=q;
      else materials.push({itemId:item.id,itemName:item.name,quantity:q});
    }
    const recipe={id:"recipe-"+Date.now(),name:recipeName.trim(),productName:recipeProduct.trim(),baseOutput:base,materials};
    await persist({...data,recipes:[...(data.recipes||[]),recipe]});
    setRecipeName("");setRecipeProduct("");setRecipeOutput("");setRecipeMaterials("");
    Alert.alert("تم حفظ الوصفة","أصبحت الوصفة متاحة للاستخدام في دفعات الإنتاج.");
  };


  const addQualityCheck = async () => {
    if(!qcProduct.trim() || !qcLot.trim()) {
      Alert.alert("بيانات ناقصة","أدخل اسم الصنف أو المنتج ورقم الدفعة."); return;
    }
    const record={id:"qc-"+Date.now(),product:qcProduct.trim(),lot:qcLot.trim(),stage:qcStage,decision:qcDecision,defects:qcDefects.trim(),note:qcNote.trim(),date:stamp()};
    let productions=data.productions||[];
    if(qcStage==="منتج نهائي") {
      const lot=productions.find(x=>String(x.lotNumber||"").trim().toLowerCase()===qcLot.trim().toLowerCase() && x.productName.trim().toLowerCase()===qcProduct.trim().toLowerCase());
      if(lot) productions=productions.map(x=>x.id===lot.id?{...x,qualityStatus:qcDecision}:x);
    }
    await persist({...data,productions,qualityChecks:[...(data.qualityChecks||[]),record]});
    setQcProduct("");setQcLot("");setQcDefects("");setQcNote("");setQcDecision("مقبول");
    Alert.alert("تم حفظ الفحص","تم تسجيل نتيجة فحص الجودة.");
  };

  const shareBackup = async () => {
    try {
      await Share.share({message:JSON.stringify({exportedAt:stamp(),app:"Jouri",data},null,2),title:"نسخة احتياطية - جوري"});
    } catch (_) {
      Alert.alert("تعذر التصدير","لم نتمكن من فتح مشاركة النسخة الاحتياطية.");
    }
  };

  const restoreBackup = () => {
    let parsed;
    try {
      parsed=JSON.parse(backupText);
    } catch (_) {
      Alert.alert("ملف غير صالح","النص المدخل ليس JSON صالحاً."); return;
    }
    const restored=parsed && parsed.data ? parsed.data : parsed;
    if(!restored || !Array.isArray(restored.sales) || !Array.isArray(restored.expenses) || !Array.isArray(restored.stock) || !Array.isArray(restored.users)) {
      Alert.alert("نسخة غير متوافقة","تأكد أنك تستخدم نسخة احتياطية صادرة من تطبيق جوري."); return;
    }
    Alert.alert("تأكيد الاستعادة","سيتم استبدال البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية.",[
      {text:"إلغاء",style:"cancel"},
      {text:"استعادة البيانات",style:"destructive",onPress:async()=>{
        await persist({...INITIAL,...restored});
        setBackupText("");
        Alert.alert("تمت الاستعادة","تم تحميل بيانات النسخة الاحتياطية على هذا الجهاز.");
      }}
    ]);
  };

  const trustDaySummary = useMemo(() => {
    const sameDay=x=>String(x.date||"").slice(0,10)===trustReportDay;
    const sales=(data.sales||[]).filter(x=>sameDay(x) && (x.project||"غير محدد")==="TRUST - الصابون");
    const expenses=(data.expenses||[]).filter(x=>sameDay(x) && (x.project||"عام")==="TRUST - الصابون");
    const production=(data.productions||[]).filter(sameDay);
    const revenue=sales.reduce((sum,x)=>sum+Number(x.amount||0),0);
    const cogs=sales.reduce((sum,x)=>sum+Number(x.cogs||0),0);
    const expenseTotal=expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
    const collected=sales.reduce((sum,x)=>sum+Number(x.paidAmount??x.amount??0),0);
    return {sales,expenses,production,revenue,cogs,expenseTotal,collected,gross:revenue-cogs,net:revenue-cogs-expenseTotal};
  },[data,trustReportDay]);

  const dailyReport = useMemo(() => {
    const today=new Date().toDateString();
    const sales=data.sales.filter(x=>new Date(x.date).toDateString()===today);
    const expenses=data.expenses.filter(x=>new Date(x.date).toDateString()===today);
    return {
      sales:sales.reduce((a,x)=>a+Number(x.amount||0),0),
      expenses:expenses.reduce((a,x)=>a+Number(x.amount||0),0),
      salesCount:sales.length, expenseCount:expenses.length
    };
  },[data]);

  const selectedRecipePreview=(data.recipes||[]).find(x=>x.id===selectedRecipeId);
  const previewOutput=Number(productionOutput);
  const productionPreview=selectedRecipePreview && Number.isFinite(previewOutput) && previewOutput>0
    ? selectedRecipePreview.materials.map(m=>{
        const required=Number(m.quantity)*previewOutput/Number(selectedRecipePreview.baseOutput);
        const item=data.stock.find(x=>x.id===m.itemId);
        return {name:m.itemName,required,available:item?Number(item.quantity)||0:0,unitCost:item?Number(item.unitCost)||0:0};
      })
    : [];
  const previewMaterialCost=productionPreview.reduce((sum,x)=>sum+x.required*x.unitCost,0);
  const previewHasIssue=productionPreview.some(x=>x.available<x.required || x.unitCost<=0);
  const previewTotal=previewMaterialCost+(Number(productionExtraCost)||0);

  const addTask = async () => {
    if(!taskTitle.trim()){Alert.alert("بيانات ناقصة","اكتب عنوان المهمة.");return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(taskDueDate)){Alert.alert("التاريخ غير صحيح","اكتب الموعد بصيغة YYYY-MM-DD.");return;}
    const employee=(data.staff||[]).find(x=>x.id===taskAssignee);
    const task={id:"task-"+Date.now(),title:taskTitle.trim(),description:taskDescription.trim(),department:taskDepartment,assigneeId:employee?.id||"",assigneeName:employee?.name||"غير مسند",dueDate:taskDueDate,priority:taskPriority,status:"جديدة",createdAt:stamp(),updatedAt:stamp()};
    await persist({...data,tasks:[task,...(data.tasks||[])]});
    setTaskTitle("");setTaskDescription("");setTaskAssignee("");
  };
  const updateTaskStatus = async (id,status) => {
    const tasks=(data.tasks||[]).map(x=>x.id===id?{...x,status,updatedAt:stamp()}:x);
    await persist({...data,tasks});
  };

  const addStaff = async () => {
    const salary=Number(staffSalary);
    if(!staffName.trim() || !staffSalary.trim() || !Number.isFinite(salary) || salary<=0) { Alert.alert("بيانات ناقصة","أدخل اسم الموظف والراتب الشهري الصحيح."); return; }
    const staff={id:"staff-"+Date.now(),name:staffName.trim(),job:staffJob.trim()||"غير محدد",department:staffDepartment,monthlySalary:salary,createdAt:stamp(),active:true};
    await persist({...data,staff:[staff,...(data.staff||[])]});
    setStaffName("");setStaffJob("");setStaffSalary("");
  };
  const markAttendance = async () => {
    const employee=(data.staff||[]).find(x=>x.id===attendanceStaff);
    if(!employee){Alert.alert("اختر الموظف","حدد الموظف أولاً.");return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)){Alert.alert("التاريخ غير صحيح","اكتب التاريخ بصيغة YYYY-MM-DD.");return;}
    const rows=data.attendance||[];
    if(rows.some(x=>x.staffId===employee.id && x.date===attendanceDate)){Alert.alert("سجل موجود","تم تسجيل حالة هذا الموظف في التاريخ نفسه.");return;}
    const record={id:"att-"+Date.now(),staffId:employee.id,staffName:employee.name,date:attendanceDate,status:attendanceStatus,note:attendanceNote.trim()};
    await persist({...data,attendance:[record,...rows]});setAttendanceNote("");
  };
  const payStaff = async employee => {
    const rows=(data.attendance||[]).filter(x=>x.staffId===employee.id && x.date.slice(0,7)===payrollMonth);
    const absent=rows.filter(x=>x.status==="غياب").length;
    const due=Math.max(0,Number(employee.monthlySalary||0)-(Number(employee.monthlySalary||0)/30)*absent);
    const paid=(data.payrollPayments||[]).filter(x=>x.staffId===employee.id && x.month===payrollMonth).reduce((sum,x)=>sum+Number(x.amount||0),0);
    const remaining=Math.max(0,due-paid), amount=Number(payrollPayAmount);
    if(!payrollPayAmount.trim()||!Number.isFinite(amount)||amount<=0||amount>remaining){Alert.alert("مبلغ غير صحيح","أدخل مبلغاً أكبر من صفر ولا يتجاوز المتبقي "+money(remaining));return;}
    const id="pay-"+Date.now(),date=stamp();
    const payment={id,staffId:employee.id,staffName:employee.name,month:payrollMonth,amount,date};
    const expense={id,name:"راتب "+employee.name+" - "+payrollMonth,amount,quantity:"",note:"صرف راتب موظف",category:"رواتب",costCenter:"الموارد البشرية",project:"الرواتب",date};
    const cash={id:"cash-"+id,referenceId:id,type:"صرف راتب",direction:"out",amount,description:expense.name,date};
    await persist({...data,payrollPayments:[payment,...(data.payrollPayments||[])],expenses:[expense,...(data.expenses||[])],cashMovements:[cash,...(data.cashMovements||[])]});
    setPayrollPayAmount("");Alert.alert("تم التسجيل","تم تسجيل صرف الراتب في المصروفات والخزينة.");
  };

  const toggleUserPermission = async (userId,screenName) => {
    const target=(data.users||[]).find(u=>u.id===userId);
    if(!target || target.id==="owner") return;
    const current=target.permissions||PERMISSION_SCREENS.filter(x=>x!=="المستخدمون"&&x!=="الإعدادات");
    const permissions=current.includes(screenName)?current.filter(x=>x!==screenName):[...current,screenName];
    await persist({...data,users:data.users.map(u=>u.id===userId?{...u,permissions}:u)});
  };

  const addUser = async () => {
    if(!userName.trim()){Alert.alert("بيانات ناقصة","أدخل اسم المستخدم.");return;}
    await persist({...data,users:[...data.users,{id:Date.now().toString(),name:userName.trim(),role:userRole,permissions:PERMISSION_SCREENS.filter(x=>x!=="المستخدمون"&&x!=="الإعدادات")}]});
    setUserName("");
  };

  const removeEntry = (type,id) => Alert.alert("حذف العملية","هل تريد حذف هذا السجل؟",[
    {text:"إلغاء",style:"cancel"},
    {text:"حذف",style:"destructive",onPress:()=>{
      const record=(data[type]||[]).find(x=>x.id===id);
      if(type==="sales" && record && record.customerId) { Alert.alert("لا يمكن حذف الفاتورة","الفاتورة مرتبطة بحساب عميل؛ صحّحها يدوياً بعد مراجعة التحصيلات حتى لا تختل المديونية."); return; }
      let next={...data,[type]:(data[type]||[]).filter(x=>x.id!==id),cashMovements:(data.cashMovements||[]).filter(x=>x.referenceId!==id)};
      if(type==="sales" && record && record.itemId && Number(record.quantity)>0) {
        next.stock=data.stock.map(x=>x.id===record.itemId?{...x,quantity:Number(x.quantity)+Number(record.quantity)}:x);
        if(record.lotNumber) next.productions=(data.productions||[]).map(p=>p.lotNumber===record.lotNumber?{...p,remainingQuantity:Number(p.remainingQuantity??p.outputQuantity)+Number(record.quantity)}:p);
        next.movements=(data.movements||[]).filter(m=>m.id!==id);
      }
      persist(next);
    }}
  ]);

  const go = value => { setScreen(value); setName(""); setAmount(""); setQuantity(""); setNote(""); };
  const header = <View style={s.header}><View><Text style={s.brand}>جــوري</Text><Text style={s.tagline}>معامل جوري للصناعات المتعددة</Text></View><View style={s.logo}><Text style={s.logoText}>ج</Text></View></View>;

  const home = <>
    <View style={s.hero}><Text style={s.heroTitle}>لوحة الإدارة الذكية</Text><Text style={s.heroSub}>مركز متابعة أعمال جوري</Text><Text style={s.heroCaption}>وضع محلي • تُحفظ البيانات على هذا الجهاز</Text></View>
    <Section>المؤشرات المالية</Section>
    <View style={s.metrics}>
      <Card><Text style={s.metricLabel}>إجمالي المبيعات</Text><Text style={s.metricValue}>{money(totals.sales)}</Text></Card>
      <Card><Text style={s.metricLabel}>المصروفات</Text><Text style={s.metricValue}>{money(totals.expenses)}</Text></Card>
    </View>
    <Card><Text style={s.metricLabel}>تكلفة البضاعة المباعة المسجلة</Text><Text style={s.metricValue}>{money(totals.cogs)}</Text><Text style={s.hint}>تُحسب عند بيع صنف مخزني له تكلفة شراء مسجلة.</Text></Card>
    <Card><Text style={s.metricLabel}>الربح الإجمالي التقديري</Text><Text style={s.metricValue}>{money(totals.gross)}</Text><Text style={s.hint}>المبيعات ناقص تكلفة البضاعة المباعة المسجلة.</Text></Card>
    <Card><Text style={s.metricLabel}>صافي التشغيل التقديري</Text><Text style={[s.bigValue,{color:totals.net>=0?C.brand:C.red}]}>{money(totals.net)}</Text><Text style={s.hint}>الربح الإجمالي ناقص المصروفات المسجلة. لا يشمل الضرائب أو الالتزامات أو التكاليف غير المدخلة.</Text></Card>
    <Section>ملخص اليوم</Section><View style={s.metrics}><Card><Text style={s.metricLabel}>عدد عمليات البيع</Text><Text style={s.metricValue}>{dailyReport.salesCount}</Text><Text style={s.hint}>{money(dailyReport.sales)}</Text></Card><Card><Text style={s.metricLabel}>عدد المصروفات</Text><Text style={s.metricValue}>{dailyReport.expenseCount}</Text><Text style={s.hint}>{money(dailyReport.expenses)}</Text></Card></View>\n    <Section>اختصارات التشغيل</Section>
    <View style={s.quickGrid}>
      {[[ "تسجيل بيع","المبيعات","🛒"],["تسجيل مصروف","المصروفات","💸"],["إدارة المخزون","المخزون","📦"],["الإنتاج","الإنتاج","🏭"],["المستخدمون","المستخدمون","👥"],["الجودة","الجودة","🧪"],["التقارير","التقارير","📊"],["العملاء","العملاء","👤"],["الموردون","الموردون","🚚"],["الخزينة","الخزينة","💰"],["متابعة TRUST","متابعة TRUST","🧼"],["الموظفون والرواتب","الموظفون والرواتب","👷"],["أداء الإدارات","أداء الإدارات","📈"]].map(x=><Pressable key={x[1]} style={s.quick} onPress={()=>go(x[1])}><Text style={s.quickIcon}>{x[2]}</Text><Text style={s.quickTitle}>{x[0]}</Text></Pressable>)}
    </View>
    <Section>الإدارات الثماني</Section>
    {DEPARTMENTS.map(d=><Pressable key={d[0]} style={s.department} onPress={()=>go(d[0])}><Text style={s.deptIcon}>{d[1]}</Text><Text style={s.deptName}>{d[0]}</Text><Text style={s.chevron}>‹</Text></Pressable>)}
    <Card><Text style={s.cardTitle}>مشروع TRUST للصابون</Text><Text style={s.body}>مرحلة البيع المباشر. سجّل المبيعات والمصروفات يومياً لمتابعة الأداء.</Text><Text style={s.status}>الحالة: تشغيل وبيع</Text></Card>
  </>;

  const customersScreen = <>
    <Section>إضافة عميل جديد</Section>
    <Card><Field label="اسم العميل" value={newCustomerName} onChange={setNewCustomerName}/><Field label="رقم الهاتف (اختياري)" value={newCustomerPhone} onChange={setNewCustomerPhone} keyboardType="phone-pad"/><Btn title="حفظ العميل" onPress={addCustomer}/></Card>
    <Section>تسجيل تحصيل من عميل</Section>
    <Card><Text style={s.label}>اختر العميل</Text><View style={s.roleRow}>{(data.customers||[]).map(x=><Pressable key={x.id} onPress={()=>setPaymentCustomerId(x.id)} style={[s.roleChip,paymentCustomerId===x.id&&s.roleSelected]}><Text style={paymentCustomerId===x.id?s.roleSelectedText:s.roleText}>{x.name}</Text></Pressable>)}</View><Field label="مبلغ التحصيل بالجنيه" value={paymentAmount} onChange={setPaymentAmount} keyboardType="decimal-pad"/><Btn title="تسجيل التحصيل" onPress={collectPayment}/></Card>
    <Section>سجل العملاء والمديونيات</Section>
    {(data.customers||[]).length===0?<Empty>لم يتم تسجيل عملاء.</Empty>:(data.customers||[]).map(customer=>{
      const invoices=(data.sales||[]).filter(x=>x.customerId===customer.id);
      const total=invoices.reduce((sum,x)=>sum+Number(x.amount||0),0);
      const paid=invoices.reduce((sum,x)=>sum+Number(x.paidAmount||0),0);
      const due=invoices.reduce((sum,x)=>sum+Number(x.dueAmount||0),0);
      return <Card key={customer.id}><Text style={s.cardTitle}>{customer.name}</Text>{customer.phone?<Text style={s.hint}>الهاتف: {customer.phone}</Text>:null}<View style={s.metrics}><View><Text style={s.metricLabel}>إجمالي المشتريات</Text><Text style={s.metricValue}>{money(total)}</Text></View><View><Text style={s.metricLabel}>المحصل</Text><Text style={s.metricValue}>{money(paid)}</Text></View></View><Text style={[s.bigValue,{color:due>0?C.red:C.brand}]}>المديونية: {money(due)}</Text><Text style={s.hint}>عدد الفواتير: {invoices.length}</Text></Card>;
    })}
    <Section>آخر التحصيلات</Section>
    {(data.receipts||[]).length===0?<Empty>لا توجد تحصيلات مسجلة.</Empty>:(data.receipts||[]).slice(0,10).map(r=><Card key={r.id}><View style={s.row}><Text style={s.amount}>{money(r.amount)}</Text><Text style={s.cardTitle}>{r.customerName}</Text></View><Text style={s.hint}>{new Date(r.date).toLocaleString("ar")}</Text></Card>)}
  </>;

  const suppliersScreen = <>
    <Section>سداد مستحقات الموردين</Section>
    <Card><Field label="اسم المورد" value={supplierPaymentName} onChange={setSupplierPaymentName} placeholder="اكتب الاسم كما في فاتورة الشراء"/><Field label="مبلغ السداد بالجنيه" value={supplierPaymentAmount} onChange={setSupplierPaymentAmount} keyboardType="decimal-pad"/><Btn title="تسجيل سداد المورد" onPress={collectSupplierPayment}/></Card>
    <Section>أرصدة الموردين</Section>
    {Array.from(new Set((data.purchases||[]).map(x=>x.supplier||"مورد غير محدد"))).length===0?<Empty>لا توجد مشتريات مسجلة.</Empty>:Array.from(new Set((data.purchases||[]).map(x=>x.supplier||"مورد غير محدد"))).map(name=>{
      const bills=(data.purchases||[]).filter(x=>(x.supplier||"مورد غير محدد")===name);
      const total=bills.reduce((sum,x)=>sum+Number(x.totalCost||0),0);
      const paid=bills.reduce((sum,x)=>sum+Number(x.paidAmount??x.totalCost),0);
      const due=bills.reduce((sum,x)=>sum+Number(x.dueAmount||0),0);
      return <Card key={name}><Text style={s.cardTitle}>{name}</Text><View style={s.metrics}><View><Text style={s.metricLabel}>إجمالي المشتريات</Text><Text style={s.metricValue}>{money(total)}</Text></View><View><Text style={s.metricLabel}>المدفوع</Text><Text style={s.metricValue}>{money(paid)}</Text></View></View><Text style={[s.bigValue,{color:due>0?C.red:C.brand}]}>المتبقي: {money(due)}</Text><Text style={s.hint}>عدد الفواتير: {bills.length}</Text></Card>;
    })}
    <Section>آخر السداديات</Section>
    {(data.supplierPayments||[]).length===0?<Empty>لا توجد سداديات مسجلة.</Empty>:(data.supplierPayments||[]).slice(0,10).map(p=><Card key={p.id}><View style={s.row}><Text style={s.amount}>{money(p.amount)}</Text><Text style={s.cardTitle}>{p.supplier}</Text></View><Text style={s.hint}>{new Date(p.date).toLocaleString("ar")}</Text></Card>)}
  </>;

  const cashScreen = <>
    <Section>الرصيد النقدي</Section>
    <Card><Text style={s.metricLabel}>الرصيد الحالي التقديري</Text><Text style={s.bigValue}>{money((Number(data.openingCash)||0)+(data.cashMovements||[]).reduce((sum,x)=>sum+(x.direction==="in"?1:-1)*Number(x.amount||0),0))}</Text><Text style={s.hint}>الرصيد الافتتاحي + المقبوضات - المدفوعات المسجلة.</Text></Card>
    <Card><Field label="الرصيد الافتتاحي للخزينة" value={openingCashInput} onChange={setOpeningCashInput} keyboardType="decimal-pad" placeholder={String(data.openingCash??0)}/><Btn title="حفظ الرصيد الافتتاحي" onPress={saveOpeningCash}/></Card>
    <Section>ملخص حركة النقدية</Section>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>إجمالي المقبوضات</Text><Text style={s.metricValue}>{money((data.cashMovements||[]).filter(x=>x.direction==="in").reduce((sum,x)=>sum+Number(x.amount||0),0))}</Text></Card><Card><Text style={s.metricLabel}>إجمالي المدفوعات</Text><Text style={s.metricValue}>{money((data.cashMovements||[]).filter(x=>x.direction==="out").reduce((sum,x)=>sum+Number(x.amount||0),0))}</Text></Card></View>
    <Section>سجل حركة الخزينة</Section>
    {(data.cashMovements||[]).length===0?<Empty>لا توجد حركات نقدية مسجلة بعد.</Empty>:(data.cashMovements||[]).map(x=><Card key={x.id}><View style={s.row}><Text style={[s.amount,{color:x.direction==="in"?C.brand:C.red}]}>{x.direction==="in"?"+":"-"}{money(x.amount)}</Text><Text style={s.cardTitle}>{x.type}</Text></View><Text style={s.hint}>{x.description}</Text><Text style={s.hint}>{new Date(x.date).toLocaleString("ar")}</Text></Card>)}
  </>;

  const trustDashboard = <>
    <Section>لوحة متابعة TRUST اليومية</Section>
    <Card><Text style={s.label}>تاريخ التقرير</Text><Field label="التاريخ بصيغة YYYY-MM-DD" value={trustReportDay} onChange={setTrustReportDay} placeholder="2026-11-24"/></Card>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>إجمالي المبيعات</Text><Text style={s.metricValue}>{money(trustDaySummary.revenue)}</Text><Text style={s.hint}>عدد فواتير TRUST: {trustDaySummary.sales.length}</Text></Card><Card><Text style={s.metricLabel}>المبالغ المحصلة</Text><Text style={s.metricValue}>{money(trustDaySummary.collected)}</Text></Card></View>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>تكلفة البضاعة</Text><Text style={s.metricValue}>{money(trustDaySummary.cogs)}</Text></Card><Card><Text style={s.metricLabel}>الربح الإجمالي التقديري</Text><Text style={s.metricValue}>{money(trustDaySummary.gross)}</Text></Card></View>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>مصروفات TRUST</Text><Text style={s.metricValue}>{money(trustDaySummary.expenseTotal)}</Text><Text style={s.hint}>عدد العمليات: {trustDaySummary.expenses.length}</Text></Card><Card><Text style={s.metricLabel}>صافي اليوم التقديري</Text><Text style={[s.bigValue,{color:trustDaySummary.net>=0?C.brand:C.red}]}>{money(trustDaySummary.net)}</Text></Card></View>
    <Card><Text style={s.metricLabel}>دفعات الإنتاج</Text><Text style={s.bigValue}>{trustDaySummary.production.length}</Text><Text style={s.hint}>إجمالي الكمية المنتجة: {trustDaySummary.production.reduce((sum,x)=>sum+Number(x.outputQuantity||0),0)}</Text></Card>
    <Section>مبيعات اليوم</Section>
    {trustDaySummary.sales.length===0?<Empty>لا توجد مبيعات في هذا التاريخ.</Empty>:trustDaySummary.sales.map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{money(x.amount)}</Text><Text style={s.cardTitle}>{x.name}</Text></View><Text style={s.hint}>الكمية: {x.quantity||"غير مسجلة"} • المحصل: {money(x.paidAmount??x.amount)} • المتبقي: {money(x.dueAmount||0)}</Text></Card>)}
    <Section>مصروفات TRUST</Section>
    {trustDaySummary.expenses.length===0?<Empty>لا توجد مصروفات مسجلة لمشروع TRUST في هذا التاريخ.</Empty>:trustDaySummary.expenses.map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{money(x.amount)}</Text><Text style={s.cardTitle}>{x.name}</Text></View><Text style={s.hint}>{x.category||"غير مصنف"} • {x.costCenter||"عام"}</Text></Card>)}
    <Section>الإنتاج في التاريخ المحدد</Section>
    {trustDaySummary.production.length===0?<Empty>لا توجد دفعات إنتاج مسجلة.</Empty>:trustDaySummary.production.map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.productName}</Text><Text style={s.hint}>الكمية المنتجة: {x.outputQuantity} • رقم التشغيلة: {x.lotNumber||"غير محدد"}</Text></Card>)}
  </>;

  const departmentReports = <>
    <Section>لوحة أداء الإدارات</Section>
    <Card><Text style={s.label}>تصفية الإدارة</Text><View style={s.roleRow}><Pressable onPress={()=>setReportDepartment("الكل")} style={[s.roleChip,reportDepartment==="الكل"&&s.roleSelected]}><Text style={reportDepartment==="الكل"?s.roleSelectedText:s.roleText}>كل الإدارات</Text></Pressable>{DEPARTMENTS.map(x=><Pressable key={x[0]} onPress={()=>setReportDepartment(x[0])} style={[s.roleChip,reportDepartment===x[0]&&s.roleSelected]}><Text style={reportDepartment===x[0]?s.roleSelectedText:s.roleText}>{x[0]}</Text></Pressable>)}</View><Text style={s.hint}>الأرقام مبنية على المهام والموظفين والحضور والمصروفات التي تم إدخالها وربطها بالإدارة.</Text></Card>
    {DEPARTMENTS.filter(dep=>reportDepartment==="الكل"||dep[0]===reportDepartment).map(dep=>{
      const name=dep[0];
      const tasks=(data.tasks||[]).filter(x=>x.department===name);
      const staff=(data.staff||[]).filter(x=>x.department===name);
      const ids=new Set(staff.map(x=>x.id));
      const attendance=(data.attendance||[]).filter(x=>ids.has(x.staffId)&&x.date.slice(0,7)===payrollMonth);
      const expenses=(data.expenses||[]).filter(x=>x.costCenter===name);
      const done=tasks.filter(x=>x.status==="مكتملة").length;
      const overdue=tasks.filter(x=>x.status!=="مكتملة"&&x.dueDate<new Date().toISOString().slice(0,10)).length;
      const attendanceCount=attendance.filter(x=>x.status==="حضور").length;
      const absenceCount=attendance.filter(x=>x.status==="غياب").length;
      const expenseTotal=expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
      const paid=(data.payrollPayments||[]).filter(x=>ids.has(x.staffId)&&x.month===payrollMonth).reduce((sum,x)=>sum+Number(x.amount||0),0);
      const pct=tasks.length?Math.round(done/tasks.length*100):0;
      return <Card key={name}><View style={s.row}><Text style={s.cardTitle}>{dep[1]} {name}</Text><Text style={s.amount}>{pct}% إنجاز</Text></View><View style={s.metrics}><View><Text style={s.metricLabel}>المهام</Text><Text style={s.metricValue}>{tasks.length}</Text><Text style={s.hint}>مكتملة {done}</Text></View><View><Text style={s.metricLabel}>متأخرة</Text><Text style={[s.metricValue,{color:overdue?C.red:C.brand}]}>{overdue}</Text></View><View><Text style={s.metricLabel}>الموظفون</Text><Text style={s.metricValue}>{staff.length}</Text></View></View><View style={s.metrics}><View><Text style={s.metricLabel}>الحضور هذا الشهر</Text><Text style={s.metricValue}>{attendanceCount}</Text><Text style={s.hint}>غياب {absenceCount}</Text></View><View><Text style={s.metricLabel}>المصروفات</Text><Text style={s.metricValue}>{money(expenseTotal)}</Text></View><View><Text style={s.metricLabel}>الرواتب المصروفة</Text><Text style={s.metricValue}>{money(paid)}</Text></View></View><Text style={s.hint}>الفترة: {payrollMonth} • سجلات المصروفات تُحتسب عند اختيار مركز تكلفة مطابق لاسم الإدارة.</Text></Card>;
    })}
  </>;
  const reportScreen = <>
    <Section>الملخص المالي</Section>
    <View style={s.metrics}>
      <Card><Text style={s.metricLabel}>المبيعات</Text><Text style={s.metricValue}>{money(totals.sales)}</Text></Card>
      <Card><Text style={s.metricLabel}>المصروفات</Text><Text style={s.metricValue}>{money(totals.expenses)}</Text></Card>
    </View>
    <Card><Text style={s.metricLabel}>تكلفة البضاعة المسجلة</Text><Text style={s.metricValue}>{money(totals.cogs)}</Text><Text style={s.metricLabel}>الربح الإجمالي التقديري</Text><Text style={s.metricValue}>{money(totals.gross)}</Text><Text style={s.metricLabel}>صافي التشغيل التقديري</Text><Text style={[s.bigValue,{color:totals.net>=0?C.brand:C.red}]}>{money(totals.net)}</Text></Card>
    <Card><Text style={s.metricLabel}>إجمالي مديونيات العملاء</Text><Text style={[s.bigValue,{color:C.red}]}>{money((data.sales||[]).reduce((sum,x)=>sum+Number(x.dueAmount||0),0))}</Text><Text style={s.hint}>المبالغ المتبقية على فواتير العملاء المسجلين.</Text></Card>
    <Card><Text style={s.metricLabel}>مستحقات الموردين</Text><Text style={[s.bigValue,{color:C.red}]}>{money((data.purchases||[]).reduce((sum,x)=>sum+Number(x.dueAmount||0),0))}</Text></Card>
    <Card><Text style={s.metricLabel}>رصيد الخزينة التقديري</Text><Text style={s.bigValue}>{money((Number(data.openingCash)||0)+(data.cashMovements||[]).reduce((sum,x)=>sum+(x.direction==="in"?1:-1)*Number(x.amount||0),0))}</Text><Text style={s.hint}>وفق الحركات النقدية المسجلة فقط.</Text></Card>
    <Section>تحليل المصروفات حسب المشروع</Section>
    {Array.from(new Set((data.expenses||[]).map(x=>x.project||"عام"))).length===0?<Empty>لا توجد مصروفات مسجلة.</Empty>:Array.from(new Set((data.expenses||[]).map(x=>x.project||"عام"))).map(project=>{
      const rows=(data.expenses||[]).filter(x=>(x.project||"عام")===project);
      const total=rows.reduce((sum,x)=>sum+Number(x.amount||0),0);
      return <Card key={project}><Text style={s.cardTitle}>{project}</Text><Text style={s.bigValue}>{money(total)}</Text><Text style={s.hint}>عدد العمليات: {rows.length}</Text></Card>;
    })}
    <Section>تحليل المصروفات حسب مركز التكلفة</Section>
    {Array.from(new Set((data.expenses||[]).map(x=>x.costCenter||"عام"))).map(center=>{
      const rows=(data.expenses||[]).filter(x=>(x.costCenter||"عام")===center);
      return <Card key={center}><Text style={s.cardTitle}>{center}</Text><Text style={s.amount}>{money(rows.reduce((sum,x)=>sum+Number(x.amount||0),0))}</Text></Card>;
    })}
    <Section>تحليل المصروفات حسب التصنيف</Section>
    {Array.from(new Set((data.expenses||[]).map(x=>x.category||"غير مصنف"))).map(category=>{
      const rows=(data.expenses||[]).filter(x=>(x.category||"غير مصنف")===category);
      return <Card key={category}><Text style={s.cardTitle}>{category}</Text><Text style={s.amount}>{money(rows.reduce((sum,x)=>sum+Number(x.amount||0),0))}</Text></Card>;
    })}
    <Section>مؤشرات التشغيل</Section>
    <View style={s.metrics}>
      <Card><Text style={s.metricLabel}>أصناف المخزون</Text><Text style={s.metricValue}>{data.stock.length}</Text></Card>
      <Card><Text style={s.metricLabel}>قيمة المخزون التقديرية</Text><Text style={s.metricValue}>{money(data.stock.reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.unitCost)||0),0))}</Text></Card>
    </View>
    <View style={s.metrics}>
      <Card><Text style={s.metricLabel}>دفعات الإنتاج</Text><Text style={s.metricValue}>{(data.productions||[]).length}</Text></Card>
      <Card><Text style={s.metricLabel}>فحوصات الجودة</Text><Text style={s.metricValue}>{(data.qualityChecks||[]).length}</Text></Card>
    </View>
    <Section>حالة التشغيلات</Section>
    {(data.productions||[]).length===0?<Empty>لا توجد دفعات إنتاج.</Empty>:(data.productions||[]).slice().reverse().map(p=><Card key={p.id}><Text style={s.cardTitle}>{p.productName}</Text><Text style={s.hint}>التشغيلة: {p.lotNumber||"قديمة"} • المتبقي: {p.remainingQuantity??p.outputQuantity} من {p.outputQuantity}</Text><Text style={s.hint}>الجودة: {p.qualityStatus||"غير محدد"} • تكلفة الدفعة: {money(p.totalCost)}</Text></Card>)}
    <Section>تنبيهات المخزون</Section>
    {data.stock.filter(x=>Number(x.quantity)<=0 || !(Number(x.unitCost)>0)).length===0?<Text style={s.status}>لا توجد تنبيهات رصيد صفري أو تكلفة ناقصة.</Text>:data.stock.filter(x=>Number(x.quantity)<=0 || !(Number(x.unitCost)>0)).map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.name}</Text><Text style={s.hint}>الرصيد: {x.quantity} • {Number(x.quantity)<=0?"الرصيد صفر":"التكلفة غير مسجلة"}</Text></Card>)}
    <Section>متابعة الجودة</Section>
    <View style={s.metrics}>
      <Card><Text style={s.metricLabel}>مرفوض</Text><Text style={[s.metricValue,{color:C.red}]}>{(data.qualityChecks||[]).filter(x=>x.decision==="مرفوض").length}</Text></Card>
      <Card><Text style={s.metricLabel}>بانتظار فحص نهائي</Text><Text style={s.metricValue}>{(data.productions||[]).filter(x=>x.qualityStatus!=="مقبول").length}</Text></Card>
    </View>
    <Text style={s.hint}>هذه التقارير تُحسب من السجلات المحفوظة محلياً على هذا الجهاز. صافي التشغيل تقديري وليس قائمة دخل محاسبية مكتملة.</Text>
  </>;

  const financeScreen = (type,title,subtitle) => <><Section>{title}</Section><Text style={s.body}>{subtitle}</Text><Card>
    <Field label="الوصف" value={name} onChange={setName} placeholder={type==="sales"?"مثال: بيع صابون TRUST":"مثال: شراء عبوات"}/>
    <Field label="المبلغ بالجنيه السوداني" value={amount} onChange={setAmount} keyboardType="decimal-pad"/>
    {type==="expenses"?<><Field label="تصنيف المصروف" value={expenseCategory} onChange={setExpenseCategory} placeholder="تشغيل، نقل، أجور، تسويق..."/><Field label="مركز التكلفة / الإدارة" value={expenseCenter} onChange={setExpenseCenter} placeholder="الإنتاج، المبيعات، الإدارة..."/><Field label="المشروع" value={expenseProject} onChange={setExpenseProject} placeholder="TRUST - الصابون أو عام"/></>:null}
    {type==="sales"?<><Field label="المشروع" value={saleProject} onChange={setSaleProject} placeholder="TRUST - الصابون"/><Field label="العميل المسجل (اختياري)" value={saleCustomerName} onChange={setSaleCustomerName} placeholder="اكتب اسم العميل المسجل"/><Field label="المبلغ المحصل الآن (اتركه فارغاً للسداد الكامل)" value={salePaid} onChange={setSalePaid} keyboardType="decimal-pad"/></>:null}
    <Field label="الكمية (اختياري)" value={quantity} onChange={setQuantity} keyboardType="decimal-pad"/>
    {type==="sales" && quantity.trim() && (data.productions||[]).some(x=>x.productName.trim().toLowerCase()===name.trim().toLowerCase())?<Field label="رقم تشغيلة المنتج" value={saleLot} onChange={setSaleLot} placeholder="أدخل رقم التشغيلة"/>:null}
    <Field label="ملاحظات (اختياري)" value={note} onChange={setNote}/>
    <Btn title="حفظ العملية" onPress={()=>addFinancial(type)}/>
  </Card><Section>سجل العمليات</Section>
  {data[type].length===0?<Empty/>:data[type].map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{money(x.amount)}</Text><Text style={s.cardTitle}>{x.name}</Text></View>{x.quantity?<Text style={s.hint}>الكمية: {x.quantity}</Text>:null}{x.cogs!==undefined?<Text style={s.hint}>تكلفة البضاعة: {money(x.cogs)} • الربح الإجمالي: {money(x.grossProfit)}</Text>:null}{type==="sales"?<Text style={s.hint}>العميل: {x.customerName||"بيع نقدي"} • المحصل: {money(x.paidAmount??x.amount)} • المتبقي: {money(x.dueAmount||0)}</Text><Text style={s.hint}>المشروع: {x.project||"غير محدد"}</Text>:null}{type==="expenses"?<Text style={s.hint}>التصنيف: {x.category||"غير مصنف"} • مركز التكلفة: {x.costCenter||"عام"} • المشروع: {x.project||"عام"}</Text>:null}{x.note?<Text style={s.hint}>{x.note}</Text>:null}<Text style={s.hint}>{new Date(x.date).toLocaleString("ar")}</Text><Pressable onPress={()=>removeEntry(type,x.id)}><Text style={s.delete}>حذف السجل</Text></Pressable></Card>)}</>;

  const stockScreen = <><Section>إدارة المخزون</Section><Card><Field label="اسم الصنف" value={itemName} onChange={setItemName}/><Field label="الكمية المضافة" value={itemQty} onChange={setItemQty} keyboardType="decimal-pad"/><Btn title="إضافة كمية للمخزون" onPress={addStock}/></Card><Section>الأصناف والأرصدة</Section>{data.stock.length===0?<Empty/>:data.stock.map(x=><Card key={x.id}><View style={s.row}><View><Text style={s.amount}>{x.quantity}</Text>{x.unitCost? <Text style={s.hint}>متوسط تكلفة الوحدة: {money(x.unitCost)}</Text>:null}</View><Text style={s.cardTitle}>{x.name}</Text></View><Field label="كمية الصرف" value={outQty} onChange={setOutQty} keyboardType="decimal-pad"/><Btn title={"صرف من "+x.name} onPress={()=>issueStock(x)} secondary/></Card>)}<Section>تقييم المخزون التقريبي</Section><Card><Text style={s.bigValue}>{money(data.stock.reduce((sum,x)=>sum+(Number(x.quantity)||0)*(Number(x.unitCost)||0),0))}</Text><Text style={s.hint}>القيمة محسوبة من الرصيد الحالي ومتوسط تكلفة الوحدة المسجل، ولا تشمل الأصناف التي لم تُسجل لها تكلفة شراء.</Text></Card><Section>آخر حركات المخزون</Section>{(data.movements||[]).slice(-8).reverse().map(m=><Card key={m.id}><View style={s.row}><Text style={s.amount}>{m.type==="صرف"||m.type==="استهلاك إنتاج"?"-":"+"}{m.quantity}</Text><Text style={s.cardTitle}>{m.itemName}</Text></View><Text style={s.hint}>{new Date(m.date).toLocaleString("ar")}</Text></Card>)}<Text style={s.hint}>يُسجل الصرف والشراء والإضافة. متوسط التكلفة والتقييم تقديريان، ويعتمدان على المشتريات المسجلة.</Text></>;

  const productionScreen = <><Section>الوصفات القياسية</Section><Text style={s.body}>احفظ وصفة بكمية إنتاج أساسية، ثم استخدمها لإعادة حساب احتياجات المواد تلقائياً عند تغيير كمية الدفعة.</Text><Card>
    <Field label="اسم الوصفة" value={recipeName} onChange={setRecipeName} placeholder="مثال: وصفة صابون TRUST"/>
    <Field label="اسم المنتج النهائي" value={recipeProduct} onChange={setRecipeProduct}/>
    <Field label="الكمية الأساسية الناتجة" value={recipeOutput} onChange={setRecipeOutput} keyboardType="decimal-pad"/>
    <View style={s.field}><Text style={s.label}>المواد الخام للوصفة</Text><TextInput value={recipeMaterials} onChangeText={setRecipeMaterials} multiline numberOfLines={4} placeholder={"صابون خام | 20\nعبوات 350 مل | 50"} placeholderTextColor="#98A2B3" textAlignVertical="top" style={[s.input,{minHeight:100}]}/></View>
    <Btn title="حفظ الوصفة القياسية" onPress={addRecipe}/>
  </Card>{(data.recipes||[]).length===0?<Empty>لم تُحفظ وصفات بعد.</Empty>:(data.recipes||[]).map(recipe=><Card key={recipe.id}><Text style={s.cardTitle}>{recipe.name}</Text><Text style={s.hint}>المنتج: {recipe.productName} • الكمية الأساسية: {recipe.baseOutput}</Text><Text style={s.hint}>المواد: {recipe.materials.map(x=>x.itemName+" ("+x.quantity+")").join("، ")}</Text><Btn title="استخدام هذه الوصفة للإنتاج" onPress={()=>{setSelectedRecipeId(recipe.id);setProductionProduct(recipe.productName);setProductionOutput(String(recipe.baseOutput));setProductionMaterials("");}} secondary/></Card>)}
  <Section>تسجيل دفعة إنتاج</Section><Text style={s.body}>أدخل المنتج النهائي والمواد الخام. يجب أن تكون المواد الخام مسجلة في المخزون ولها تكلفة شراء.</Text><Card>
    {selectedRecipeId?<Text style={s.status}>الوصفة المختارة: {(data.recipes||[]).find(x=>x.id===selectedRecipeId)?.name} • تُضبط كميات المواد تلقائياً حسب حجم الدفعة</Text>:null}
    <Field label="اسم المنتج النهائي" value={productionProduct} onChange={v=>{setProductionProduct(v);setSelectedRecipeId("");}} placeholder="مثال: صابون TRUST 350 مل"/>
    <Field label="الكمية المنتجة" value={productionOutput} onChange={setProductionOutput} keyboardType="decimal-pad"/>
    <Field label="رقم التشغيلة (يُنشأ تلقائياً إذا تُرك فارغاً)" value={productionLot} onChange={setProductionLot} placeholder="مثال: TRUST-2026-001"/>
    {selectedRecipeId && previewOutput>0?<Card><Text style={s.cardTitle}>تقدير ما قبل الإنتاج</Text>{productionPreview.map(x=><Text key={x.name} style={s.hint}>{x.name}: مطلوب {x.required.toFixed(2)} • متاح {x.available} • تكلفة تقديرية {money(x.required*x.unitCost)}</Text>)}<Text style={s.hint}>إجمالي تكلفة الدفعة المتوقعة: {money(previewTotal)}</Text><Text style={s.hint}>تكلفة الوحدة المتوقعة: {money(previewTotal/previewOutput)}</Text><Text style={[s.status,{color:previewHasIssue?C.red:C.brand}]}>{previewHasIssue?"تنبيه: راجع الرصيد أو تكلفة إحدى المواد قبل الإنتاج":"المواد متاحة وتكاليفها مسجلة"}</Text></Card>:null}
    {!selectedRecipeId?<View style={s.field}><Text style={s.label}>المواد الخام المستهلكة (مادة في كل سطر)</Text><TextInput value={productionMaterials} onChangeText={setProductionMaterials} multiline numberOfLines={5} placeholder={"مثال:\nصابون خام | 20\nعبوات 350 مل | 50"} placeholderTextColor="#98A2B3" textAlignVertical="top" style={[s.input,{minHeight:120}]}/><Text style={s.hint}>الصيغة: اسم المادة | الكمية. استخدم سطراً مستقلاً لكل مادة.</Text></View>:<Btn title="إلغاء الوصفة واستخدام مواد يدوية" onPress={()=>setSelectedRecipeId("")} secondary/>}
    <Field label="تكاليف إضافية للدفعة (اختياري)" value={productionExtraCost} onChange={setProductionExtraCost} keyboardType="decimal-pad"/>
    <Field label="ملاحظات (اختياري)" value={productionNote} onChange={setProductionNote}/>
    <Btn title="حفظ دفعة الإنتاج" onPress={addProduction}/>
  </Card><Section>سجل دفعات الإنتاج</Section>{(data.productions||[]).length===0?<Empty/>:(data.productions||[]).slice().reverse().map(p=><Card key={p.id}><Text style={s.cardTitle}>{p.productName}</Text><Text style={s.hint}>التشغيلة: {p.lotNumber||"قديمة"} • المتبقي: {p.remainingQuantity??p.outputQuantity} • الجودة: {p.qualityStatus||"بانتظار الفحص"}</Text><Text style={s.hint}>الإنتاج: {p.outputQuantity} • تكلفة الدفعة: {money(p.totalCost)}</Text><Text style={s.hint}>تكلفة الوحدة المنتجة: {money(p.unitCost)}</Text><Text style={s.hint}>المواد: {(p.materials||[]).map(m=>m.itemName+" ("+m.quantity+")").join("، ")}</Text>{p.note?<Text style={s.hint}>{p.note}</Text>:null}<Text style={s.hint}>{new Date(p.date).toLocaleString("ar")}</Text></Card>)}</>;

  const purchasesScreen = <><Section>تسجيل مشتريات جديدة</Section><Text style={s.body}>أدخل التكلفة الإجمالية للكمية المشتراة. سيُحدّث التطبيق متوسط تكلفة الوحدة المرجّح للصنف.</Text><Card><Field label="اسم الصنف" value={purchaseItem} onChange={setPurchaseItem}/><Field label="الكمية المشتراة" value={purchaseQty} onChange={setPurchaseQty} keyboardType="decimal-pad"/><Field label="إجمالي تكلفة الشراء (ج.س)" value={purchaseCost} onChange={setPurchaseCost} keyboardType="decimal-pad"/><Field label="المورد (اختياري)" value={supplier} onChange={setSupplier}/><Field label="المبلغ المدفوع الآن (اتركه فارغاً للسداد الكامل)" value={purchasePaid} onChange={setPurchasePaid} keyboardType="decimal-pad"/><Btn title="حفظ المشتريات وتحديث المخزون" onPress={addPurchase}/></Card><Section>سجل المشتريات</Section>{(data.purchases||[]).length===0?<Empty/>:(data.purchases||[]).slice().reverse().map(p=><Card key={p.id}><View style={s.row}><Text style={s.amount}>{money(p.totalCost)}</Text><Text style={s.cardTitle}>{p.itemName}</Text></View><Text style={s.hint}>الكمية: {p.quantity} • تكلفة الوحدة: {money(p.unitCost)}</Text>{p.supplier?<Text style={s.hint}>المورد: {p.supplier}</Text>:null}<Text style={s.hint}>{new Date(p.date).toLocaleString("ar")}</Text></Card>)}</>; 

  const tasksScreen = <>
    <Section>إنشاء تكليف جديد</Section>
    <Card><Field label="عنوان المهمة" value={taskTitle} onChange={setTaskTitle}/><Field label="تفاصيل المهمة" value={taskDescription} onChange={setTaskDescription}/>
    <Text style={s.label}>الإدارة المسؤولة</Text><View style={s.roleRow}>{DEPARTMENTS.map(x=><Pressable key={x[0]} onPress={()=>setTaskDepartment(x[0])} style={[s.roleChip,taskDepartment===x[0]&&s.roleSelected]}><Text style={taskDepartment===x[0]?s.roleSelectedText:s.roleText}>{x[0]}</Text></Pressable>)}</View>
    <Text style={s.label}>الموظف المسؤول</Text><View style={s.roleRow}><Pressable onPress={()=>setTaskAssignee("")} style={[s.roleChip,!taskAssignee&&s.roleSelected]}><Text style={!taskAssignee?s.roleSelectedText:s.roleText}>غير مسند</Text></Pressable>{(data.staff||[]).map(x=><Pressable key={x.id} onPress={()=>setTaskAssignee(x.id)} style={[s.roleChip,taskAssignee===x.id&&s.roleSelected]}><Text style={taskAssignee===x.id?s.roleSelectedText:s.roleText}>{x.name}</Text></Pressable>)}</View>
    <Field label="الموعد النهائي YYYY-MM-DD" value={taskDueDate} onChange={setTaskDueDate}/>
    <Text style={s.label}>الأولوية</Text><View style={s.roleRow}>{["منخفضة","متوسطة","عالية","عاجلة"].map(x=><Pressable key={x} onPress={()=>setTaskPriority(x)} style={[s.roleChip,taskPriority===x&&s.roleSelected]}><Text style={taskPriority===x?s.roleSelectedText:s.roleText}>{x}</Text></Pressable>)}</View>
    <Btn title="إضافة المهمة" onPress={addTask}/></Card>
    <Section>ملخص المهام</Section>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>الإجمالي</Text><Text style={s.metricValue}>{(data.tasks||[]).length}</Text></Card><Card><Text style={s.metricLabel}>مكتملة</Text><Text style={s.metricValue}>{(data.tasks||[]).filter(x=>x.status==="مكتملة").length}</Text></Card></View>
    <View style={s.metrics}><Card><Text style={s.metricLabel}>قيد التنفيذ</Text><Text style={s.metricValue}>{(data.tasks||[]).filter(x=>x.status==="قيد التنفيذ").length}</Text></Card><Card><Text style={s.metricLabel}>متأخرة</Text><Text style={s.metricValue}>{(data.tasks||[]).filter(x=>x.status!=="مكتملة"&&x.dueDate<new Date().toISOString().slice(0,10)).length}</Text></Card></View>
    <Section>قائمة التكليفات</Section>
    {(data.tasks||[]).length===0?<Empty>لا توجد مهام بعد. أضف أول تكليف.</Empty>:[...(data.tasks||[])].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(task=><Card key={task.id}>
      <View style={s.row}><Text style={s.cardTitle}>{task.title}</Text><Text style={s.amount}>{task.priority}</Text></View>
      {task.description?<Text style={s.body}>{task.description}</Text>:null}
      <Text style={s.hint}>{task.department} • المسؤول: {task.assigneeName}</Text>
      <Text style={s.hint}>الموعد: {task.dueDate} • الحالة: {task.status}</Text>
      {task.status!=="مكتملة"&&task.dueDate<new Date().toISOString().slice(0,10)?<Text style={{color:C.red,fontWeight:"700"}}>متأخرة عن الموعد</Text>:null}
      <View style={s.roleRow}>{["جديدة","قيد التنفيذ","مكتملة"].map(st=><Pressable key={st} onPress={()=>updateTaskStatus(task.id,st)} style={[s.roleChip,task.status===st&&s.roleSelected]}><Text style={task.status===st?s.roleSelectedText:s.roleText}>{st}</Text></Pressable>)}</View>
    </Card>)}
  </>;

  const hrScreen = <>
    <Section>إضافة موظف</Section>
    <Card><Field label="اسم الموظف" value={staffName} onChange={setStaffName}/><Field label="المسمى الوظيفي" value={staffJob} onChange={setStaffJob}/><Text style={s.label}>الإدارة</Text><View style={s.roleRow}>{DEPARTMENTS.map(x=><Pressable key={x[0]} onPress={()=>setStaffDepartment(x[0])} style={[s.roleChip,staffDepartment===x[0]&&s.roleSelected]}><Text style={staffDepartment===x[0]?s.roleSelectedText:s.roleText}>{x[0]}</Text></Pressable>)}</View><Field label="الراتب الشهري بالجنيه" value={staffSalary} onChange={setStaffSalary} keyboardType="decimal-pad"/><Btn title="حفظ الموظف" onPress={addStaff}/></Card>
    <Section>تسجيل الحضور</Section>
    <Card><Text style={s.label}>اختر الموظف</Text><View style={s.roleRow}>{(data.staff||[]).map(x=><Pressable key={x.id} onPress={()=>setAttendanceStaff(x.id)} style={[s.roleChip,attendanceStaff===x.id&&s.roleSelected]}><Text style={attendanceStaff===x.id?s.roleSelectedText:s.roleText}>{x.name}</Text></Pressable>)}</View>
    <Field label="التاريخ YYYY-MM-DD" value={attendanceDate} onChange={setAttendanceDate}/>
    <Text style={s.label}>الحالة</Text><View style={s.roleRow}>{["حضور","غياب","إجازة"].map(x=><Pressable key={x} onPress={()=>setAttendanceStatus(x)} style={[s.roleChip,attendanceStatus===x&&s.roleSelected]}><Text style={attendanceStatus===x?s.roleSelectedText:s.roleText}>{x}</Text></Pressable>)}</View>
    <Field label="ملاحظات (اختياري)" value={attendanceNote} onChange={setAttendanceNote}/><Btn title="حفظ سجل الحضور" onPress={markAttendance}/></Card>
    <Section>الرواتب الشهرية</Section>
    <Card><Field label="الشهر YYYY-MM" value={payrollMonth} onChange={setPayrollMonth}/><Field label="مبلغ دفعة الراتب" value={payrollPayAmount} onChange={setPayrollPayAmount} keyboardType="decimal-pad"/><Text style={s.hint}>الحساب تقديري: الراتب الشهري ناقص خصم أيام الغياب على أساس 30 يوماً. الإجازة لا تخصم تلقائياً.</Text></Card>
    {(data.staff||[]).length===0?<Empty>أضف الموظفين أولاً.</Empty>:(data.staff||[]).map(employee=>{
      const rows=(data.attendance||[]).filter(x=>x.staffId===employee.id && x.date.slice(0,7)===payrollMonth);
      const absent=rows.filter(x=>x.status==="غياب").length;
      const due=Math.max(0,Number(employee.monthlySalary||0)-(Number(employee.monthlySalary||0)/30)*absent);
      const paid=(data.payrollPayments||[]).filter(x=>x.staffId===employee.id && x.month===payrollMonth).reduce((sum,x)=>sum+Number(x.amount||0),0);
      return <Card key={employee.id}><Text style={s.cardTitle}>{employee.name}</Text><Text style={s.hint}>{employee.job} • الراتب الأساسي: {money(employee.monthlySalary)}</Text><View style={s.metrics}><View><Text style={s.metricLabel}>الحضور</Text><Text style={s.metricValue}>{rows.filter(x=>x.status==="حضور").length}</Text></View><View><Text style={s.metricLabel}>الغياب</Text><Text style={s.metricValue}>{absent}</Text></View><View><Text style={s.metricLabel}>الإجازات</Text><Text style={s.metricValue}>{rows.filter(x=>x.status==="إجازة").length}</Text></View></View><Text style={s.hint}>المستحق: {money(due)} • المصروف: {money(paid)} • المتبقي: {money(Math.max(0,due-paid))}</Text><Btn title="تسجيل صرف الدفعة المدخلة" onPress={()=>payStaff(employee)} secondary={paid>=due}/></Card>;
    })}
    <Section>سجل الحضور للشهر</Section>
    {(data.attendance||[]).filter(x=>x.date.slice(0,7)===payrollMonth).length===0?<Empty>لا توجد سجلات حضور لهذا الشهر.</Empty>:(data.attendance||[]).filter(x=>x.date.slice(0,7)===payrollMonth).map(x=><Card key={x.id}><View style={s.row}><Text style={s.cardTitle}>{x.staffName}</Text><Text style={s.amount}>{x.status}</Text></View><Text style={s.hint}>{x.date}{x.note?" • "+x.note:""}</Text></Card>)}
  </>;

  const usersScreen = <><Section>إدارة المستخدمين والصلاحيات</Section><Text style={s.body}>يمكنك تحديد الشاشات المتاحة لكل مستخدم. هذه إعدادات تنظيمية محلية؛ لا تُعد مصادقة أو حماية أمنية فعلية قبل ربط خادم وتسجيل دخول موثوق.</Text><Card><Field label="اسم المستخدم" value={userName} onChange={setUserName}/><Text style={s.label}>الدور الوظيفي</Text><View style={s.roleRow}>{["مدير","مشرف","موظف","مشاهدة"].map(r=><Pressable key={r} onPress={()=>setUserRole(r)} style={[s.roleChip,userRole===r&&s.roleSelected]}><Text style={userRole===r?s.roleSelectedText:s.roleText}>{r}</Text></Pressable>)}</View><Btn title="إضافة مستخدم" onPress={addUser}/></Card><Section>تخصيص صلاحيات المستخدم</Section>{data.users.map(u=><Card key={u.id}><Pressable onPress={()=>setPermissionUserId(permissionUserId===u.id?"":u.id)}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.hint}>الدور: {u.role} • {u.id==="owner"?"حساب المالك المحمي":"اضغط لتعديل الشاشات المتاحة"}</Text></Pressable>{permissionUserId===u.id&&<>{u.id==="owner"?<Text style={s.status}>صلاحيات المالك كاملة ولا يمكن تعديلها من هذه الشاشة.</Text>:<View style={s.roleRow}>{PERMISSION_SCREENS.map(p=>{const allowed=(u.permissions||PERMISSION_SCREENS.filter(x=>x!=="المستخدمون"&&x!=="الإعدادات")).includes(p);return <Pressable key={p} onPress={()=>toggleUserPermission(u.id,p)} style={[s.roleChip,allowed&&s.roleSelected]}><Text style={allowed?s.roleSelectedText:s.roleText}>{allowed?"✓ ":""}{p}</Text></Pressable>})}</View>}</>}</Card>)}</>;

  const qualityScreen = <><Section>تسجيل فحص جودة</Section><Text style={s.body}>سجّل فحص المواد الخام أو أثناء التصنيع أو المنتج النهائي، مع قرار القبول أو الرفض وتوثيق العيوب.</Text><Card>
    <Field label="اسم الصنف أو المنتج" value={qcProduct} onChange={setQcProduct} placeholder="مثال: صابون TRUST 350 مل"/>
    <Field label="رقم الدفعة / التشغيلة" value={qcLot} onChange={setQcLot} placeholder="مثال: TRUST-2026-001"/>
    <Text style={s.label}>مرحلة الفحص</Text><View style={s.roleRow}>{["استلام مواد خام","أثناء التصنيع","منتج نهائي"].map(v=><Pressable key={v} onPress={()=>setQcStage(v)} style={[s.roleChip,qcStage===v&&s.roleSelected]}><Text style={qcStage===v?s.roleSelectedText:s.roleText}>{v}</Text></Pressable>)}</View>
    <Text style={s.label}>قرار الفحص</Text><View style={s.roleRow}>{["مقبول","مقبول بتحفظ","مرفوض"].map(v=><Pressable key={v} onPress={()=>setQcDecision(v)} style={[s.roleChip,qcDecision===v&&s.roleSelected]}><Text style={qcDecision===v?s.roleSelectedText:s.roleText}>{v}</Text></Pressable>)}</View>
    <Field label="العيوب أو الملاحظات الفنية" value={qcDefects} onChange={setQcDefects} placeholder="مثال: اختلاف اللون أو التسريب"/>
    <Field label="ملاحظات إضافية" value={qcNote} onChange={setQcNote}/>
    <Btn title="حفظ نتيجة الفحص" onPress={addQualityCheck}/>
  </Card><Section>سجل فحوصات الجودة</Section>{(data.qualityChecks||[]).length===0?<Empty>لا توجد فحوصات مسجلة.</Empty>:(data.qualityChecks||[]).slice().reverse().map(q=><Card key={q.id}><View style={s.row}><Text style={[s.amount,{color:q.decision==="مرفوض"?C.red:q.decision==="مقبول"?C.brand:C.gold}]}>{q.decision}</Text><Text style={s.cardTitle}>{q.product}</Text></View><Text style={s.hint}>الدفعة: {q.lot} • المرحلة: {q.stage}</Text>{q.defects?<Text style={s.hint}>العيوب: {q.defects}</Text>:null}{q.note?<Text style={s.hint}>ملاحظات: {q.note}</Text>:null}<Text style={s.hint}>{new Date(q.date).toLocaleString("ar")}</Text></Card>)}</>;

  const settingsScreen = <>
    <Section>الإعدادات وحالة البيانات</Section>
    {legacyLocalAvailable?<Card>
      <Text style={s.cardTitle}>بيانات محلية من النسخة السابقة</Text>
      <Text style={s.body}>وجد جوري سجلات محفوظة قبل ربط الحساب. لم تُحذف ولم تُرفع. استوردها إلى حسابك قبل استخدام المزامنة.</Text>
      <Btn title="استيراد البيانات السابقة بأمان" onPress={importLegacyLocalData}/>
    </Card>:null}
    <Card>
      <Text style={s.cardTitle}>الحفظ المحلي</Text>
      <Text style={s.body}>كل عملية تُحفظ على هذا الجهاز أولاً. المزامنة السحابية يدوية فقط، ولا ترفع أو تستبدل البيانات تلقائياً.</Text>
      <Text style={[s.status,{color:storageError?C.red:C.brand}]}>{storageError?"يوجد خطأ في الحفظ المحلي":"حالة التخزين المحلي: متاح"}</Text>
      <Btn title="تصدير نسخة احتياطية" onPress={shareBackup}/>
      <View style={s.field}><Text style={s.label}>استعادة نسخة JSON</Text><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={5} placeholder="الصق محتوى النسخة الاحتياطية هنا" placeholderTextColor="#98A2B3" textAlignVertical="top" style={[s.input,{minHeight:110}]}/></View>
      <Btn title="استعادة البيانات من النص" onPress={restoreBackup} secondary/>
    </Card>
    <Section>المزامنة السحابية</Section>
    <Card>
      <Text style={s.cardTitle}>حالة الاتصال</Text>
      <Text style={s.body}>المؤسسة: {organizationId?"مرتبطة بحسابك":"غير محددة"}</Text>
      <Text style={s.body}>صلاحية الحساب: {organizationRole||"غير محددة"}</Text>
      <Text style={s.status}>{cloudStatus}</Text>
      {cloudUpdatedAt?<Text style={s.hint}>آخر تحديث سحابي: {new Date(cloudUpdatedAt).toLocaleString("ar")}</Text>:null}
      <Btn title={cloudBusy?"جارٍ التنفيذ...":"1. فحص النسخة السحابية"} onPress={refreshCloudStatus} disabled={cloudBusy}/>
      <Btn title="2. رفع بيانات هذا الجهاز إلى السحابة" onPress={uploadLocalData} disabled={cloudBusy}/>
      <Btn title="3. تحميل النسخة السحابية إلى هذا الجهاز" onPress={downloadCloudData} secondary disabled={cloudBusy}/>
      <Text style={s.hint}>للمالك والمدير: بعد أول رفع أو تحميل ناجح، تُزامَن التعديلات تلقائياً عند توفر الإنترنت والتطبيق مفتوح أو عند إعادة فتحه؛ لا تعمل المزامنة والتطبيق مغلقاً. إذا عدّل جهاز آخر النسخة السحابية، تتوقف المزامنة لحماية البيانات وتحتاج إلى مراجعة يدوية. الموظفون يمكنهم تحميل النسخة وفق صلاحياتهم، ولا يرفعون تعديلاتهم بهذه السياسة.</Text>
    </Card>
    <Card>
      <Text style={s.cardTitle}>النسخة الحالية</Text>
      <Text style={s.body}>تظل البيانات المحلية محفوظة عند انقطاع الإنترنت. لا تستخدم بيانات تشغيل حقيقية على أجهزة متعددة قبل اختبار المزامنة بحسابات المؤسسة وصلاحياتها.</Text>
    </Card>
  </>;

  const deptScreen = <Card><Text style={s.cardTitle}>{screen}</Text><Text style={s.body}>تم إنشاء مدخل لهذا القسم ضمن الهيكل الإداري لجوري. وظائفه التفصيلية ستُبنى على مراحل، مع ربطها بقاعدة البيانات والصلاحيات.</Text></Card>;

  if(loading || (isSupabaseConfigured && (!authReady || membershipLoading))) return <SafeAreaView style={s.safe}><ActivityIndicator style={{marginTop:80}} size="large" color={C.brand}/><Text style={s.loading}>جارٍ تجهيز جوري...</Text></SafeAreaView>;

  if(isSupabaseConfigured && (!authSession || !organizationId)) return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><View><Text style={s.brand}>جوري</Text><Text style={s.tagline}>معامل جوري للصناعات المتعددة</Text></View><View style={s.logo}><Text style={s.logoText}>ج</Text></View></View>
    <Card><Section>{authSession ? "إنشاء مؤسسة جوري" : "تسجيل الدخول إلى جوري"}</Section>
      <Text style={s.body}>اتصال الحساب السحابي مفعّل. بيانات التشغيل المحلية لا تُنقل إلى السحابة تلقائياً.</Text>
      {!authSession ? <>
        <Field label="البريد الإلكتروني" value={authEmail} onChange={setAuthEmail} keyboardType="email-address" autoCapitalize="none"/>
        <Field label="كلمة المرور (6 أحرف على الأقل)" value={authPassword} onChange={setAuthPassword} secureTextEntry autoCapitalize="none"/>
        <Btn title={authBusy ? "جارٍ التنفيذ..." : authMode==="signin" ? "تسجيل الدخول" : "إنشاء حساب"} onPress={submitAuth}/>
        <Btn title={authMode==="signin" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"} onPress={()=>{setAuthMode(authMode==="signin"?"signup":"signin");setAuthMessage("");}} secondary/>
      </> : <>
        <Field label="اسم المؤسسة" value={organizationName} onChange={setOrganizationName}/>
        <Btn title={authBusy ? "جارٍ الإنشاء..." : "إنشاء المؤسسة وتعييني مالكاً"} onPress={createOrganization}/>
        <Btn title="تسجيل الخروج" onPress={signOut} secondary/>
      </>}
      {authMessage ? <Text style={s.status}>{authMessage}</Text> : null}
    </Card>
    <Text style={s.footer}>جوري • تسجيل الدخول السحابي</Text>
  </ScrollView></SafeAreaView>;

  let body=home;
  if(screen==="المبيعات") body=financeScreen("sales","تسجيل المبيعات","سجّل كل عملية بيع، ويمكنك إدخال كمية المنتج.");
  else if(screen==="المصروفات") body=financeScreen("expenses","تسجيل المصروفات","سجّل مصروفات التشغيل والمشتريات.");
  else if(screen==="المخزون") body=stockScreen;
  else if(screen==="المشتريات") body=purchasesScreen;
  else if(screen==="الإنتاج") body=productionScreen;
  else if(screen==="الجودة") body=qualityScreen;
  else if(screen==="الخزينة") body=cashScreen;
  else if(screen==="متابعة TRUST") body=trustDashboard;
  else if(screen==="الموظفون والرواتب") body=hrScreen;
  else if(screen==="المهام") body=tasksScreen;
  else if(screen==="التقارير") body=reportScreen;
  else if(screen==="أداء الإدارات") body=departmentReports;
  else if(screen==="العملاء") body=customersScreen;
  else if(screen==="الموردون") body=suppliersScreen;
  else if(screen==="المستخدمون") body=usersScreen;
  else if(screen==="الإعدادات") body=settingsScreen;
  else if(screen!=="الرئيسية"&&screen!=="المهام"&&screen!=="المساعد الذكي") body=deptScreen;
  else if(screen==="المساعد الذكي") body=<Card><Text style={s.cardTitle}>مساعد جوري الذكي</Text><Text style={s.body}>واجهة المساعد ستُربط بخدمة ذكاء اصطناعي لاحقاً. لا يوجد اتصال ذكاء اصطناعي مفعّل في هذه النسخة.</Text></Card>;

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/><ScrollView contentContainerStyle={s.page}>{header}
    <View style={s.topNav}><Pressable onPress={()=>go("الرئيسية")}><Text style={s.back}>‹ الرئيسية</Text></Pressable><Text style={s.screenTitle}>{screen}</Text></View>
    {body}{isSupabaseConfigured&&authSession?<Pressable onPress={signOut}><Text style={s.delete}>تسجيل الخروج من الحساب السحابي</Text></Pressable>:null}<Text style={s.footer}>جوري • نظام الإدارة الذكية • إصدار أولي</Text>
  </ScrollView><View style={s.bottom}>{[["الرئيسية","⌂"],["المبيعات","＋"],["المخزون","▦"],["الإعدادات","⚙"]].map(x=><Pressable key={x[0]} onPress={()=>go(x[0])} style={s.tab}><Text style={[s.tabIcon,screen===x[0]&&s.tabOn]}>{x[1]}</Text><Text style={[s.tabText,screen===x[0]&&s.tabOn]}>{x[0]}</Text></Pressable>)}</View></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},page:{padding:17,paddingBottom:30},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:16},brand:{fontSize:31,fontWeight:"900",color:C.brand},tagline:{fontSize:11,color:C.muted,marginTop:2},logo:{width:43,height:43,borderRadius:14,backgroundColor:C.pale,alignItems:"center",justifyContent:"center"},logoText:{fontSize:22,color:C.brand,fontWeight:"900"},
 topNav:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},back:{color:C.brand,fontWeight:"700"},screenTitle:{fontSize:15,color:C.ink,fontWeight:"800"},hero:{backgroundColor:C.ink,borderRadius:19,padding:19,marginBottom:19},heroTitle:{color:C.white,fontSize:21,fontWeight:"900",textAlign:"right"},heroSub:{color:"#D5DFEA",textAlign:"right",marginTop:7},heroCaption:{color:"#C0CBD8",fontSize:11,textAlign:"right",marginTop:14},
 section:{fontSize:17,color:C.ink,fontWeight:"900",textAlign:"right",marginTop:13,marginBottom:10},metrics:{flexDirection:"row",gap:9,marginBottom:9},card:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:15,padding:14,marginBottom:10},metricLabel:{color:C.muted,fontSize:11,textAlign:"right"},metricValue:{fontSize:17,color:C.ink,fontWeight:"800",textAlign:"right",marginTop:8},bigValue:{fontSize:25,fontWeight:"900",textAlign:"right",marginTop:7},hint:{fontSize:10,color:C.muted,textAlign:"right",marginTop:6,lineHeight:16},cardTitle:{fontSize:14,fontWeight:"800",color:C.ink,textAlign:"right"},body:{fontSize:12,color:C.muted,textAlign:"right",lineHeight:20,marginTop:7},status:{color:C.brand,fontSize:11,fontWeight:"800",textAlign:"right",marginTop:9},
 quickGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},quick:{width:"48%",backgroundColor:C.white,borderRadius:14,padding:13,borderWidth:1,borderColor:C.line},quickIcon:{fontSize:22,textAlign:"right"},quickTitle:{fontSize:12,color:C.ink,fontWeight:"800",textAlign:"right",marginTop:7},
 department:{flexDirection:"row",alignItems:"center",backgroundColor:C.white,borderRadius:12,borderWidth:1,borderColor:C.line,padding:12,marginBottom:7},deptIcon:{fontSize:18,marginRight:8},deptName:{flex:1,textAlign:"right",color:C.ink,fontWeight:"700",fontSize:12},chevron:{fontSize:22,color:C.muted,marginLeft:8},
 field:{marginBottom:12},label:{fontSize:11,color:C.ink,fontWeight:"700",textAlign:"right",marginBottom:6},input:{backgroundColor:C.bg,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:12,paddingVertical:10,textAlign:"right",fontSize:13,color:C.ink},btn:{backgroundColor:C.brand,padding:13,borderRadius:11,alignItems:"center",marginTop:4},btnText:{color:C.white,fontWeight:"800",fontSize:13},btnSecondary:{backgroundColor:C.pale},btnSecondaryText:{color:C.brand},
 row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},amount:{fontSize:13,color:C.brand,fontWeight:"900"},delete:{color:C.red,fontSize:11,textAlign:"right",marginTop:8},empty:{color:C.muted,textAlign:"center",padding:18,fontSize:12},
 roleRow:{flexDirection:"row",justifyContent:"space-between",marginBottom:13,marginTop:7},roleChip:{paddingVertical:8,paddingHorizontal:12,borderRadius:20,backgroundColor:C.bg,borderWidth:1,borderColor:C.line},roleSelected:{backgroundColor:C.pale,borderColor:C.brand},roleText:{fontSize:11,color:C.muted},roleSelectedText:{fontSize:11,color:C.brand,fontWeight:"800"},
 footer:{fontSize:10,color:C.muted,textAlign:"center",marginTop:20},bottom:{flexDirection:"row",justifyContent:"space-around",backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,paddingVertical:10},tab:{alignItems:"center",gap:3},tabIcon:{fontSize:17,color:C.muted},tabText:{fontSize:10,color:C.muted},tabOn:{color:C.brand,fontWeight:"900"},loading:{textAlign:"center",color:C.muted,marginTop:12}
});