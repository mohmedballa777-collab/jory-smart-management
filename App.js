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
const INITIAL = { sales:[], expenses:[], stock:[], purchases:[], productions:[], recipes:[], movements:[], users:[{id:"owner",name:"صاحب المؤسسة",role:"مدير عام"}], project:"TRUST - الصابون" };
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
  const [backupText,setBackupText] = useState("");
  const [purchaseItem,setPurchaseItem] = useState("");
  const [purchaseQty,setPurchaseQty] = useState("");
  const [purchaseCost,setPurchaseCost] = useState("");
  const [supplier,setSupplier] = useState("");
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
    const cogs=data.sales.reduce((a,x)=>a+Number(x.cogs||0),0);
    return {sales,expenses,cogs,gross:sales-cogs,net:sales-cogs-expenses};
  },[data]);

  const addFinancial = async type => {
    const v=Number(amount);
    if(!name.trim() || !amount.trim() || !Number.isFinite(v) || v<=0) {
      Alert.alert("بيانات ناقصة","أدخل الوصف والمبلغ الصحيح الأكبر من صفر."); return;
    }
    let entry={id:Date.now().toString(),name:name.trim(),amount:v,quantity:quantity.trim(),note:note.trim(),date:stamp()};
    let next={...data,[type]:[entry,...data[type]]};
    if(type==="sales" && quantity.trim()) {
      const q=Number(quantity);
      if(!Number.isFinite(q) || q<=0) { Alert.alert("كمية غير صحيحة","أدخل كمية بيع أكبر من صفر."); return; }
      const item=data.stock.find(x=>x.name.trim().toLowerCase()===name.trim().toLowerCase());
      if(!item) { Alert.alert("الصنف غير موجود","أضف الصنف إلى المخزون أولاً، واستخدم اسم الصنف نفسه عند تسجيل البيع."); return; }
      if(q>Number(item.quantity)) { Alert.alert("رصيد غير كافٍ", "المتاح من "+item.name+" هو "+item.quantity+" فقط."); return; }
      const unitCost=Number(item.unitCost)||0;
      entry={...entry,itemId:item.id,unitCost,cogs:q*unitCost,grossProfit:v-(q*unitCost)};
      next={...next,stock:data.stock.map(x=>x.id===item.id?{...x,quantity:Number(x.quantity)-q}:x),movements:[...(data.movements||[]),{id:entry.id,itemId:item.id,itemName:item.name,type:"بيع",quantity:q,date:entry.date}]};
    }
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
    const purchase={id:date+Math.random().toString(36).slice(2,6),itemId,itemName:purchaseItem.trim(),quantity:q,totalCost:cost,unitCost,supplier:supplier.trim(),date};
    const movements=[...(data.movements||[]),{id:purchase.id,itemId,itemName:purchaseItem.trim(),type:"شراء",quantity:q,date}];
    await persist({...data,stock,purchases:[...(data.purchases||[]),purchase],movements});
    setPurchaseItem("");setPurchaseQty("");setPurchaseCost("");setSupplier("");
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
    if(!productionProduct.trim() || !productionOutput.trim() || !Number.isFinite(output) || output<=0 || !productionMaterials.trim() || !Number.isFinite(extra) || extra<0) {
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
    const production={id,productId,productName:productionProduct.trim(),outputQuantity:output,materials:requirements,materialCost,extraCost:extra,totalCost,unitCost,note:productionNote.trim(),date};
    const movements=[...(data.movements||[]),...requirements.map((x,i)=>({id:id+"-raw-"+i,itemId:x.itemId,itemName:x.itemName,type:"استهلاك إنتاج",quantity:x.quantity,date})),{id:id+"-out",itemId:productId,itemName:productionProduct.trim(),type:"إنتاج",quantity:output,date}];
    await persist({...data,stock,productions:[...(data.productions||[]),production],movements});
    setProductionProduct("");setProductionOutput("");setProductionMaterials("");setProductionExtraCost("");setProductionNote("");setSelectedRecipeId("");
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

  const addUser = async () => {
    if(!userName.trim()){Alert.alert("بيانات ناقصة","أدخل اسم المستخدم.");return;}
    await persist({...data,users:[...data.users,{id:Date.now().toString(),name:userName.trim(),role:userRole}]});
    setUserName("");
  };

  const removeEntry = (type,id) => Alert.alert("حذف العملية","هل تريد حذف هذا السجل؟",[
    {text:"إلغاء",style:"cancel"},
    {text:"حذف",style:"destructive",onPress:()=>{
      const record=(data[type]||[]).find(x=>x.id===id);
      let next={...data,[type]:(data[type]||[]).filter(x=>x.id!==id)};
      if(type==="sales" && record && record.itemId && Number(record.quantity)>0) {
        next.stock=data.stock.map(x=>x.id===record.itemId?{...x,quantity:Number(x.quantity)+Number(record.quantity)}:x);
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
      {[[ "تسجيل بيع","المبيعات","🛒"],["تسجيل مصروف","المصروفات","💸"],["إدارة المخزون","المخزون","📦"],["الإنتاج","الإنتاج","🏭"],["المستخدمون","المستخدمون","👥"]].map(x=><Pressable key={x[1]} style={s.quick} onPress={()=>go(x[1])}><Text style={s.quickIcon}>{x[2]}</Text><Text style={s.quickTitle}>{x[0]}</Text></Pressable>)}
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
  {data[type].length===0?<Empty/>:data[type].map(x=><Card key={x.id}><View style={s.row}><Text style={s.amount}>{money(x.amount)}</Text><Text style={s.cardTitle}>{x.name}</Text></View>{x.quantity?<Text style={s.hint}>الكمية: {x.quantity}</Text>:null}{x.cogs!==undefined?<Text style={s.hint}>تكلفة البضاعة: {money(x.cogs)} • الربح الإجمالي: {money(x.grossProfit)}</Text>:null}{x.note?<Text style={s.hint}>{x.note}</Text>:null}<Text style={s.hint}>{new Date(x.date).toLocaleString("ar")}</Text><Pressable onPress={()=>removeEntry(type,x.id)}><Text style={s.delete}>حذف السجل</Text></Pressable></Card>)}</>;

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
    {selectedRecipeId && previewOutput>0?<Card><Text style={s.cardTitle}>تقدير ما قبل الإنتاج</Text>{productionPreview.map(x=><Text key={x.name} style={s.hint}>{x.name}: مطلوب {x.required.toFixed(2)} • متاح {x.available} • تكلفة تقديرية {money(x.required*x.unitCost)}</Text>)}<Text style={s.hint}>إجمالي تكلفة الدفعة المتوقعة: {money(previewTotal)}</Text><Text style={s.hint}>تكلفة الوحدة المتوقعة: {money(previewTotal/previewOutput)}</Text><Text style={[s.status,{color:previewHasIssue?C.red:C.brand}]}>{previewHasIssue?"تنبيه: راجع الرصيد أو تكلفة إحدى المواد قبل الإنتاج":"المواد متاحة وتكاليفها مسجلة"}</Text></Card>:null}
    {!selectedRecipeId?<View style={s.field}><Text style={s.label}>المواد الخام المستهلكة (مادة في كل سطر)</Text><TextInput value={productionMaterials} onChangeText={setProductionMaterials} multiline numberOfLines={5} placeholder={"مثال:\nصابون خام | 20\nعبوات 350 مل | 50"} placeholderTextColor="#98A2B3" textAlignVertical="top" style={[s.input,{minHeight:120}]}/><Text style={s.hint}>الصيغة: اسم المادة | الكمية. استخدم سطراً مستقلاً لكل مادة.</Text></View>:<Btn title="إلغاء الوصفة واستخدام مواد يدوية" onPress={()=>setSelectedRecipeId("")} secondary/>}
    <Field label="تكاليف إضافية للدفعة (اختياري)" value={productionExtraCost} onChange={setProductionExtraCost} keyboardType="decimal-pad"/>
    <Field label="ملاحظات (اختياري)" value={productionNote} onChange={setProductionNote}/>
    <Btn title="حفظ دفعة الإنتاج" onPress={addProduction}/>
  </Card><Section>سجل دفعات الإنتاج</Section>{(data.productions||[]).length===0?<Empty/>:(data.productions||[]).slice().reverse().map(p=><Card key={p.id}><Text style={s.cardTitle}>{p.productName}</Text><Text style={s.hint}>الإنتاج: {p.outputQuantity} • تكلفة الدفعة: {money(p.totalCost)}</Text><Text style={s.hint}>تكلفة الوحدة المنتجة: {money(p.unitCost)}</Text><Text style={s.hint}>المواد: {(p.materials||[]).map(m=>m.itemName+" ("+m.quantity+")").join("، ")}</Text>{p.note?<Text style={s.hint}>{p.note}</Text>:null}<Text style={s.hint}>{new Date(p.date).toLocaleString("ar")}</Text></Card>)}</>;

  const purchasesScreen = <><Section>تسجيل مشتريات جديدة</Section><Text style={s.body}>أدخل التكلفة الإجمالية للكمية المشتراة. سيُحدّث التطبيق متوسط تكلفة الوحدة المرجّح للصنف.</Text><Card><Field label="اسم الصنف" value={purchaseItem} onChange={setPurchaseItem}/><Field label="الكمية المشتراة" value={purchaseQty} onChange={setPurchaseQty} keyboardType="decimal-pad"/><Field label="إجمالي تكلفة الشراء (ج.س)" value={purchaseCost} onChange={setPurchaseCost} keyboardType="decimal-pad"/><Field label="المورد (اختياري)" value={supplier} onChange={setSupplier}/><Btn title="حفظ المشتريات وتحديث المخزون" onPress={addPurchase}/></Card><Section>سجل المشتريات</Section>{(data.purchases||[]).length===0?<Empty/>:(data.purchases||[]).slice().reverse().map(p=><Card key={p.id}><View style={s.row}><Text style={s.amount}>{money(p.totalCost)}</Text><Text style={s.cardTitle}>{p.itemName}</Text></View><Text style={s.hint}>الكمية: {p.quantity} • تكلفة الوحدة: {money(p.unitCost)}</Text>{p.supplier?<Text style={s.hint}>المورد: {p.supplier}</Text>:null}<Text style={s.hint}>{new Date(p.date).toLocaleString("ar")}</Text></Card>)}</>; 

  const usersScreen = <><Section>إدارة المستخدمين</Section><Text style={s.body}>تسجيل أسماء وأدوار مبدئي. المصادقة الحقيقية وحماية الصلاحيات تحتاج خادماً وتسجيل دخول قبل الاستخدام الفعلي متعدد الأجهزة.</Text><Card><Field label="اسم المستخدم" value={userName} onChange={setUserName}/><Text style={s.label}>الدور</Text><View style={s.roleRow}>{["مدير","مشرف","موظف","مشاهدة"].map(r=><Pressable key={r} onPress={()=>setUserRole(r)} style={[s.roleChip,userRole===r&&s.roleSelected]}><Text style={userRole===r?s.roleSelectedText:s.roleText}>{r}</Text></Pressable>)}</View><Btn title="إضافة مستخدم" onPress={addUser}/></Card>{data.users.map(u=><Card key={u.id}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.hint}>الدور: {u.role}</Text></Card>)}</>;

  const settingsScreen = <><Section>الإعدادات وحالة البيانات</Section><Card><Text style={s.cardTitle}>حفظ البيانات</Text><Text style={s.body}>الحفظ محلي على الجهاز باستخدام AsyncStorage. لا توجد مزامنة سحابية أو نسخ احتياطي تلقائي؛ يمكنك تصدير نسخة JSON واستعادتها يدوياً.</Text><Text style={[s.status,{color:storageError?C.red:C.brand}]}>{storageError?"يوجد خطأ في الحفظ":"حالة التخزين: متاح"}</Text><Btn title="تصدير نسخة احتياطية" onPress={shareBackup}/><View style={s.field}><Text style={s.label}>استعادة نسخة JSON</Text><TextInput value={backupText} onChangeText={setBackupText} multiline numberOfLines={5} placeholder="الصق محتوى النسخة الاحتياطية هنا" placeholderTextColor="#98A2B3" textAlignVertical="top" style={[s.input,{minHeight:110}]}/></View><Btn title="استعادة البيانات من النص" onPress={restoreBackup} secondary/></Card><Card><Text style={s.cardTitle}>النسخة الحالية</Text><Text style={s.body}>واجهة تشغيل أولية تشمل المبيعات والمصروفات والمخزون والمستخدمين. لا تُدخل بيانات حساسة أو تعتمد عليها كسجل محاسبي نهائي قبل إعداد النسخ الاحتياطي والصلاحيات.</Text></Card></>;

  const deptScreen = <Card><Text style={s.cardTitle}>{screen}</Text><Text style={s.body}>تم إنشاء مدخل لهذا القسم ضمن الهيكل الإداري لجوري. وظائفه التفصيلية ستُبنى على مراحل، مع ربطها بقاعدة البيانات والصلاحيات.</Text></Card>;

  if(loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{marginTop:80}} size="large" color={C.brand}/><Text style={s.loading}>جارٍ تحميل بيانات جوري...</Text></SafeAreaView>;

  let body=home;
  if(screen==="المبيعات") body=financeScreen("sales","تسجيل المبيعات","سجّل كل عملية بيع، ويمكنك إدخال كمية المنتج.");
  else if(screen==="المصروفات") body=financeScreen("expenses","تسجيل المصروفات","سجّل مصروفات التشغيل والمشتريات.");
  else if(screen==="المخزون") body=stockScreen;
  else if(screen==="المشتريات") body=purchasesScreen;
  else if(screen==="الإنتاج") body=productionScreen;
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