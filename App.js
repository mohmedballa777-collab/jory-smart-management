import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, TextInput, StyleSheet,
  Pressable, Alert, StatusBar, ActivityIndicator, Share
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "jouri-business-data-v1";
const C = { ink:"#172B4D", muted:"#667085", brand:"#176B55", pale:"#EAF4EF", line:"#E7EBEF", bg:"#F5F7F8", white:"#FFFFFF", red:"#B54747", gold:"#D99B25" };
const DEPARTMENTS = [
  ["الإدارة العامة","🏢"],["الإدارة المالية","💰"],["المشروعات والتشغيل","⚙️"],["المبيعات والتسويق","🛒"],
  ["المخازن والمشتريات","📦"],["الجودة والسلامة","🧪"],["التطوير والتقنية","🤖"],["الشؤون الشخصية","🎯"]
];
const INITIAL = { sales:[], expenses:[], stock:[], users:[{id:"owner",name:"صاحب المؤسسة",role:"مدير عام"}], project:"TRUST - الصابون" };
const money = n => (Number(n)||0).toLocaleString("en-US") + " ج.س";
const stamp = () => new Date().toISOString();

function Field({label,value,onChange,placeholder,keyboardType="default"}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder||label} placeholderTextColor="#98A2B3" keyboardType={keyboardType} style={s.input}/></View>;
}
function Btn({title,onPress,secondary=false}) {
  return <Pressable onPress={onPress} style={[s.btn,secondary&&s.btnSecondary]}><Text style={[s.btnText,secondary&&s.btnSecondaryText]}>{title}</Text></Pressable>;
}
function Card({children}) { return <View style={s.card}>{children}</View>; }
function Section({children}) { return <Text style={s.section}>{children}</Text>; }
function Empty({children="لا توجد بيانات مسجلة بعد."}) { return <Text style={s.empty}>{children}</Text>; }

export default function App() {
  const [data,setData] = useState(INITIAL);
  const [screen,setScreen] = useState("الرئيسية");
  const [loading,setLoading] = useState(true);
  const [storageError,setStorageError] = useState(false);
  const [name,setName] = useState("");
  const [amount,setAmount] = useState("");
  const [quantity,setQuantity] = useState("");
  const [note,setNote] = useState("");
  const [itemName,setItemName] = useState("");
  const [itemQty,setItemQty] = useState("");
  const [outQty,setOutQty] = useState("");
  const [userName,setUserName] = useState("");
  const [userRole,setUserRole] = useState("موظف");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if(raw) {
        const parsed=JSON.parse(raw);
        setData({...INITIAL,...parsed});
      }
    }).catch(() => setStorageError(true)).finally(() => setLoading(false));
  }, []);

  const persist = async next => {
    setData(next);
    try { await AsyncStorage.setItem(KEY,JSON.stringify(next)); setStorageError(false); }
    catch (_) { setStorageError(true); Alert.alert("تنبيه","تعذر حفظ البيانات على الجهاز. تحقق من مساحة التخزين."); }
  };

  const totals = useMemo(() => {
    const sales=data.sales.reduce((a,x)=>a+Number(x.amount||0),0);
    const expenses=data.expenses.reduce((a,x)=>a+Number(x.amount||0),0);
    return {sales,expenses,net:sales-expenses};
  },[data]);

  const addFinancial = async type => {
    const v=Number(amount);
    if(!name.trim() || !amount.trim() || !Number.isFinite(v) || v<=0) {
      Alert.alert("بيانات ناقصة","أدخل الوصف والمبلغ الصحيح الأكبر من صفر."); return;
    }
    const entry={id:Date.now().toString(),name:name.trim(),amount:v,quantity:quantity.trim(),note:note.trim(),date:stamp()};
    const next={...data,[type]:[entry,...data[type]]};
    await persist(next); setName(""); setAmount(""); setQuantity(""); setNote("");
    Alert.alert("تم الحفظ","تم تسجيل العملية على هذا الجهاز.");
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
    await persist({...data,stock}); setItemName(""); setItemQty("");
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

  const shareBackup = async () => {
    try {
      await Share.share({message:JSON.stringify({exportedAt:stamp(),app:"Jouri",data},null,2),title:"نسخة احتياطية - جوري"});
    } catch (_) {
      Alert.alert("تعذر التصدير","لم نتمكن من فتح مشاركة النسخة الاحتياطية.");
    }
  };

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

  const addUser = async () => {
    if(!userName.trim()){Alert.alert("بيانات ناقصة","أدخل اسم المستخدم.");return;}
    await persist({...data,users:[...data.users,{id:Date.now().toString(),name:userName.trim(),role:userRole}]});
    setUserName("");
  };

  const removeEntry = (type,id) => Alert.alert("حذف العملية","هل تريد حذف هذا السجل؟",[
    {text:"إلغاء",style:"cancel"},
    {text:"حذف",style:"destructive",onPress:()=>persist({...data,[type]:data[type].filter(x=>x.id!==id)})}
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
    <Card><Text style={s.metricLabel}>صافي الفرق (مبيعات - مصروفات)</Text><Text style={[s.bigValue,{color:totals.net>=0?C.brand:C.red}]}>{money(totals.net)}</Text><Text style={s.hint}>ليس ربحاً محاسبياً نهائياً؛ لا يشمل تكلفة المخزون أو الالتزامات غير المسجلة.</Text></Card>
    <Section>ملخص اليوم</Section><View style={s.metrics}><Card><Text style={s.metricLabel}>عدد عمليات البيع</Text><Text style={s.metricValue}>{dailyReport.salesCount}</Text><Text style={s.hint}>{money(dailyReport.sales)}</Text></Card><Card><Text style={s.metricLabel}>عدد المصروفات</Text><Text style={s.metricValue}>{dailyReport.expenseCount}</Text><Text style={s.hint}>{money(dailyReport.expenses)}</Text></Card></View>\n    <Section>اختصارات التشغيل</Section>
    <View style={s.quickGrid}>
      {[[ "تسجيل بيع","المبيعات","🛒"],["تسجيل مصروف","المصروفات","💸"],["إدارة المخزون","المخزون","📦"],["المستخدمون","المستخدمون","👥"]].map(x=><Pressable key={x[1]} style={s.quick} onPress={()=>go(x[1])}><Text style={s.quickIcon}>{x[2]}</Text><Text style={s.quickTitle}>{x[0]}</Text></Pressable>)}
    </View>
    <Section>الإدارات الثماني</Section>
    {DEPARTMENTS.map(d=><Pressable key={d[0]} style={s.department} onPress={()=>go(d[0])}><Text style={s.deptIcon}>{d[1]}</Text><Text style={s.deptName}>{d[0]}</Text><Text style={s.chevron}>‹</Text></Pressable>)}
    <Card><Text style={s.cardTitle}>مشروع TRUST للصابون</Text><Text style={s.body}>مرحلة البيع المباشر. سجّل المبيعات والمصروفات يومياً لمتابعة الأداء.</Text><Text style={s.status}>الحالة: تشغيل وبيع</Text></Card>
  </>;

  const financeScreen = (type,title,subtitle) => <><Section>{title}</Section><Text style={s.body}>{subtitle}</Text><Card>
    <Field label="الوصف" value={name} onChange={setName} placeholder={type==="sales"?"مثال: بيع صابون TRUST":"مثال: شراء عبوات"}/>
    <Field label="المبلغ بالجنيه السوداني" value={amount} onChange={setAmount} keyboardType="decimal-pad"/>
    <Field label="الكمية (اختياري)" value={quantity} onChange={setQuantity} keyboardType="decimal-pad"/>
    <Field label="ملاحظات (اختياري)" value={note} onChange={setNote}/>
    <Btn title="حفظ العملية" onPress={()=>addFinancial(type)}/>
  </Card><Section>سجل العمليات</Section>
  {data[type].length===0?<Empty/>:data[type].map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{money(x.amount)}</Text><Text style={s.cardTitle}>{x.name}</Text></View>{x.quantity?<Text style={s.hint}>الكمية: {x.quantity}</Text>:null}{x.note?<Text style={s.hint}>{x.note}</Text>:null}<Text style={s.hint}>{new Date(x.date).toLocaleString("ar")}</Text><Pressable onPress={()=>removeEntry(type,x.id)}><Text style={s.delete}>حذف السجل</Text></Pressable></Card>)}</>;

  const stockScreen = <><Section>إدارة المخزون</Section><Card><Field label="اسم الصنف" value={itemName} onChange={setItemName}/><Field label="الكمية المضافة" value={itemQty} onChange={setItemQty} keyboardType="decimal-pad"/><Btn title="إضافة كمية للمخزون" onPress={addStock}/></Card><Section>الأصناف والأرصدة</Section>{data.stock.length===0?<Empty/>:data.stock.map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{x.quantity}</Text><Text style={s.cardTitle}>{x.name}</Text></View><Field label="كمية الصرف" value={outQty} onChange={setOutQty} keyboardType="decimal-pad"/><Btn title={"صرف من "+x.name} onPress={()=>issueStock(x)} secondary/></Card>)}<Section>آخر حركات المخزون</Section>{(data.movements||[]).slice(-8).reverse().map(m=><Card key={m.id}><View style={s.row}><Text style={s.amount}>{m.type==="صرف"?"-": "+"}{m.quantity}</Text><Text style={s.cardTitle}>{m.itemName}</Text></View><Text style={s.hint}>{new Date(m.date).toLocaleString("ar")}</Text></Card>)}<Text style={s.hint}>يُسجل الصرف ويُخصم من الرصيد. لم تُضف تكلفة الأصناف أو تقييم المخزون بعد.</Text></>;

  const usersScreen = <><Section>إدارة المستخدمين</Section><Text style={s.body}>تسجيل أسماء وأدوار مبدئي. المصادقة الحقيقية وحماية الصلاحيات تحتاج خادماً وتسجيل دخول قبل الاستخدام الفعلي متعدد الأجهزة.</Text><Card><Field label="اسم المستخدم" value={userName} onChange={setUserName}/><Text style={s.label}>الدور</Text><View style={s.roleRow}>{["مدير","مشرف","موظف","مشاهدة"].map(r=><Pressable key={r} onPress={()=>setUserRole(r)} style={[s.roleChip,userRole===r&&s.roleSelected]}><Text style={userRole===r?s.roleSelectedText:s.roleText}>{r}</Text></Pressable>)}</View><Btn title="إضافة مستخدم" onPress={addUser}/></Card>{data.users.map(u=><Card key={u.id}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.hint}>الدور: {u.role}</Text></Card>)}</>;

  const settingsScreen = <><Section>الإعدادات وحالة البيانات</Section><Card><Text style={s.cardTitle}>حفظ البيانات</Text><Text style={s.body}>الحفظ محلي على الجهاز باستخدام AsyncStorage. لا توجد مزامنة سحابية أو نسخ احتياطي تلقائي حالياً.</Text><Text style={[s.status,{color:storageError?C.red:C.brand}]}>{storageError?"يوجد خطأ في الحفظ":"حالة التخزين: متاح"}</Text><Btn title="تصدير نسخة احتياطية" onPress={shareBackup}/></Card><Card><Text style={s.cardTitle}>النسخة الحالية</Text><Text style={s.body}>واجهة تشغيل أولية تشمل المبيعات والمصروفات والمخزون والمستخدمين. لا تُدخل بيانات حساسة أو تعتمد عليها كسجل محاسبي نهائي قبل إعداد النسخ الاحتياطي والصلاحيات.</Text></Card></>;

  const deptScreen = <Card><Text style={s.cardTitle}>{screen}</Text><Text style={s.body}>تم إنشاء مدخل لهذا القسم ضمن الهيكل الإداري لجوري. وظائفه التفصيلية ستُبنى على مراحل، مع ربطها بقاعدة البيانات والصلاحيات.</Text></Card>;

  if(loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{marginTop:80}} size="large" color={C.brand}/><Text style={s.loading}>جارٍ تحميل بيانات جوري...</Text></SafeAreaView>;

  let body=home;
  if(screen==="المبيعات") body=financeScreen("sales","تسجيل المبيعات","سجّل كل عملية بيع، ويمكنك إدخال كمية المنتج.");
  else if(screen==="المصروفات") body=financeScreen("expenses","تسجيل المصروفات","سجّل مصروفات التشغيل والمشتريات.");
  else if(screen==="المخزون") body=stockScreen;
  else if(screen==="المستخدمون") body=usersScreen;
  else if(screen==="الإعدادات") body=settingsScreen;
  else if(screen!=="الرئيسية"&&screen!=="المهام"&&screen!=="المساعد الذكي") body=deptScreen;
  else if(screen==="المهام") body=<Card><Text style={s.cardTitle}>المهام</Text><Empty>سيتم تفعيل إدارة المهام في المرحلة التالية.</Empty></Card>;
  else if(screen==="المساعد الذكي") body=<Card><Text style={s.cardTitle}>مساعد جوري الذكي</Text><Text style={s.body}>واجهة المساعد ستُربط بخدمة ذكاء اصطناعي لاحقاً. لا يوجد اتصال ذكاء اصطناعي مفعّل في هذه النسخة.</Text></Card>;

  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/><ScrollView contentContainerStyle={s.page}>{header}
    <View style={s.topNav}><Pressable onPress={()=>go("الرئيسية")}><Text style={s.back}>‹ الرئيسية</Text></Pressable><Text style={s.screenTitle}>{screen}</Text></View>
    {body}<Text style={s.footer}>جوري • نظام الإدارة الذكية • إصدار أولي</Text>
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