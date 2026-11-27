import React, { useMemo, useState } from "react";
import { Alert, Share, Text, TextInput, View, Pressable, ActivityIndicator } from "react-native";
import * as Contacts from "expo-contacts/legacy";

const colors = { ink:"#172B4D", muted:"#667085", brand:"#176B55", pale:"#EAF4EF", line:"#E7EBEF", white:"#FFFFFF", red:"#B54747" };

export default function ContactsScreen() {
  const [items,setItems] = useState([]);
  const [query,setQuery] = useState("");
  const [permission,setPermission] = useState("unknown");
  const [busy,setBusy] = useState(false);

  const loadContacts = async () => {
    setBusy(true);
    try {
      let result = await Contacts.getPermissionsAsync();
      if (result.status !== "granted") result = await Contacts.requestPermissionsAsync();
      setPermission(result.status);
      if (result.status !== "granted") {
        Alert.alert("إذن الوصول غير ممنوح","لم نقرأ أي جهة اتصال. يمكنك منح الإذن من إعدادات الهاتف متى رغبت.");
        return;
      }
      const all = [];
      let pageOffset = 0;
      let hasNextPage = true;
      while (hasNextPage && all.length < 5000) {
        const page = await Contacts.getContactsAsync({
          fields:[Contacts.Fields.Name,Contacts.Fields.PhoneNumbers],
          pageSize:500,
          pageOffset,
          sort:Contacts.SortTypes.FirstName
        });
        all.push(...(page.data || []));
        hasNextPage = !!page.hasNextPage;
        pageOffset += (page.data || []).length;
        if (!(page.data || []).length) break;
      }
      setItems(all.filter(x => x.name || (x.phoneNumbers || []).length));
    } catch (error) {
      Alert.alert("تعذر قراءة جهات الاتصال", error?.message || "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return items;
    return items.filter(item => {
      const name = (item.name || "").toLocaleLowerCase();
      const phones = (item.phoneNumbers || []).map(p => p.number || "").join(" ").toLocaleLowerCase();
      return name.includes(q) || phones.includes(q);
    });
  },[items,query]);

  const shareContact = async item => {
    const phones = (item.phoneNumbers || []).map(p => p.number).filter(Boolean);
    const message = "جهة اتصال من دفتر الهاتف\nالاسم: " + (item.name || "بدون اسم") +
      (phones.length ? "\nالأرقام:\n" + phones.join("\n") : "");
    try {
      await Share.share({message});
    } catch (error) {
      Alert.alert("تعذر المشاركة",error?.message || "حاول مرة أخرى.");
    }
  };

  const button = {backgroundColor:colors.brand,paddingVertical:12,paddingHorizontal:15,borderRadius:12,alignItems:"center"};
  return <View style={{gap:12}}>
    <View style={{backgroundColor:colors.pale,borderRadius:14,padding:14}}>
      <Text style={{color:colors.ink,fontSize:16,fontWeight:"900",textAlign:"right"}}>دفتر جهات اتصال الهاتف</Text>
      <Text style={{color:colors.muted,textAlign:"right",marginTop:6,lineHeight:21}}>
        القراءة تتم على جهازك فقط. لا تُرفع الأسماء أو الأرقام إلى السحابة، ولا يمكن لهذه الشاشة تعديل أو حذف جهات الاتصال.
      </Text>
    </View>
    <Pressable onPress={loadContacts} disabled={busy} style={[button,{opacity:busy?0.6:1}]}>
      {busy ? <ActivityIndicator color="#FFFFFF"/> : <Text style={{color:"#FFFFFF",fontWeight:"800"}}>{items.length ? "تحديث جهات الاتصال" : "السماح وقراءة جهات الاتصال"}</Text>}
    </Pressable>
    {permission==="denied" ? <Text style={{color:colors.red,textAlign:"right"}}>الإذن مرفوض. فعّله من إعدادات أندرويد إذا رغبت.</Text> : null}
    {items.length>0 ? <>
      <Text style={{color:colors.ink,textAlign:"right",fontWeight:"800"}}>تمت قراءة {items.length} جهة اتصال على هذا الجهاز</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="ابحث بالاسم أو رقم الهاتف" placeholderTextColor="#98A2B3" style={{borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,textAlign:"right",backgroundColor:colors.white,color:colors.ink}}/>
      <Text style={{color:colors.muted,textAlign:"right"}}>النتائج: {filtered.length}</Text>
      {filtered.slice(0,100).map((item,index) => {
        const phones=(item.phoneNumbers||[]).map(p=>p.number).filter(Boolean);
        return <View key={item.id || String(index)} style={{backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:13,gap:7}}>
          <Text style={{color:colors.ink,fontWeight:"800",textAlign:"right"}}>{item.name || "بدون اسم"}</Text>
          <Text selectable style={{color:colors.muted,textAlign:"right"}}>{phones.length ? phones.join("  •  ") : "لا يوجد رقم مسجل"}</Text>
          <Pressable onPress={()=>shareContact(item)} style={{alignSelf:"flex-end",backgroundColor:colors.pale,paddingVertical:8,paddingHorizontal:12,borderRadius:9}}>
            <Text style={{color:colors.brand,fontWeight:"800"}}>مشاركة مع ChatGPT</Text>
          </Pressable>
        </View>;
      })}
      {filtered.length>100 ? <Text style={{color:colors.muted,textAlign:"center"}}>نعرض أول 100 نتيجة. استخدم البحث لتحديد جهة الاتصال.</Text> : null}
      {filtered.length===0 ? <Text style={{color:colors.muted,textAlign:"center"}}>لا توجد نتائج مطابقة.</Text> : null}
    </> : <Text style={{color:colors.muted,textAlign:"right"}}>لم تُقرأ جهات الاتصال بعد. اضغط الزر وامنح الإذن من نافذة أندرويد.</Text>}
  </View>;
}
