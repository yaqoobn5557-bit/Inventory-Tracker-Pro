export type Language = 'en' | 'hi' | 'ar' | 'ur' | 'ne' | 'bn';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  ar: 'العربية',
  ur: 'اردو',
  ne: 'नेपाली',
  bn: 'বাংলা',
};

export type TranslationKey =
  | 'welcome_back'
  | 'sign_in_subtitle'
  | 'continue_with_google'
  | 'select_store'
  | 'choose_store_subtitle'
  | 'dashboard'
  | 'operations'
  | 'pomaker'
  | 'pomaker_sub'
  | 'invoice'
  | 'invoice_sub'
  | 'expiry_damage'
  | 'expiry_damage_sub'
  | 'settings'
  | 'appearance'
  | 'dark_mode'
  | 'dark_mode_sub'
  | 'language'
  | 'language_sub'
  | 'logout'
  | 'change_store'
  | 'rimal_footer';

type Translations = Record<TranslationKey, string>;

const translations: Record<Language, Translations> = {
  en: {
    welcome_back: 'Welcome Back',
    sign_in_subtitle: 'Sign in to access your inventory dashboard',
    continue_with_google: 'Continue with Google',
    select_store: 'SELECT STORE',
    choose_store_subtitle: 'Choose your store to continue',
    dashboard: 'Dashboard',
    operations: 'Operations',
    pomaker: 'POMAKER',
    pomaker_sub: 'Create purchase orders',
    invoice: 'INVOICE',
    invoice_sub: 'Manage invoices',
    expiry_damage: 'EXPIRY DAMAGE',
    expiry_damage_sub: 'Track expired & damaged items',
    settings: 'Settings',
    appearance: 'Appearance',
    dark_mode: 'Dark Mode',
    dark_mode_sub: 'Switch between light and dark theme',
    language: 'Language',
    language_sub: 'Choose your preferred language',
    logout: 'Logout',
    change_store: 'Change Store',
    rimal_footer: 'Rimal HungerStation Inventory System',
  },
  hi: {
    welcome_back: 'वापस स्वागत है',
    sign_in_subtitle: 'इन्वेंट्री डैशबोर्ड एक्सेस करने के लिए साइन इन करें',
    continue_with_google: 'Google से जारी रखें',
    select_store: 'स्टोर चुनें',
    choose_store_subtitle: 'जारी रखने के लिए अपना स्टोर चुनें',
    dashboard: 'डैशबोर्ड',
    operations: 'संचालन',
    pomaker: 'पीओ मेकर',
    pomaker_sub: 'खरीद ऑर्डर बनाएं',
    invoice: 'इनवॉइस',
    invoice_sub: 'इनवॉइस प्रबंधित करें',
    expiry_damage: 'एक्सपायरी डैमेज',
    expiry_damage_sub: 'एक्सपायर्ड और क्षतिग्रस्त आइटम ट्रैक करें',
    settings: 'सेटिंग्स',
    appearance: 'रूप',
    dark_mode: 'डार्क मोड',
    dark_mode_sub: 'लाइट और डार्क थीम के बीच स्विच करें',
    language: 'भाषा',
    language_sub: 'अपनी पसंदीदा भाषा चुनें',
    logout: 'लॉगआउट',
    change_store: 'स्टोर बदलें',
    rimal_footer: 'रिमाल हंगरस्टेशन इन्वेंट्री सिस्टम',
  },
  ar: {
    welcome_back: 'مرحباً بعودتك',
    sign_in_subtitle: 'سجّل دخولك للوصول إلى لوحة المخزون',
    continue_with_google: 'المتابعة مع Google',
    select_store: 'اختر المتجر',
    choose_store_subtitle: 'اختر متجرك للمتابعة',
    dashboard: 'لوحة التحكم',
    operations: 'العمليات',
    pomaker: 'أمر الشراء',
    pomaker_sub: 'إنشاء أوامر الشراء',
    invoice: 'الفاتورة',
    invoice_sub: 'إدارة الفواتير',
    expiry_damage: 'انتهاء الصلاحية',
    expiry_damage_sub: 'تتبع العناصر المنتهية والتالفة',
    settings: 'الإعدادات',
    appearance: 'المظهر',
    dark_mode: 'الوضع الداكن',
    dark_mode_sub: 'التبديل بين المظهر الفاتح والداكن',
    language: 'اللغة',
    language_sub: 'اختر لغتك المفضلة',
    logout: 'تسجيل الخروج',
    change_store: 'تغيير المتجر',
    rimal_footer: 'نظام مخزون ريمال هنغرستيشن',
  },
  ur: {
    welcome_back: 'واپس خوش آمدید',
    sign_in_subtitle: 'انوینٹری ڈیش بورڈ تک رسائی کے لیے سائن ان کریں',
    continue_with_google: 'گوگل سے جاری رکھیں',
    select_store: 'اسٹور منتخب کریں',
    choose_store_subtitle: 'جاری رکھنے کے لیے اپنا اسٹور منتخب کریں',
    dashboard: 'ڈیش بورڈ',
    operations: 'آپریشنز',
    pomaker: 'پی او میکر',
    pomaker_sub: 'خریداری آرڈر بنائیں',
    invoice: 'انوائس',
    invoice_sub: 'انوائس منیج کریں',
    expiry_damage: 'ایکسپائری ڈیمیج',
    expiry_damage_sub: 'میعاد ختم اور خراب اشیاء ٹریک کریں',
    settings: 'ترتیبات',
    appearance: 'ظاہری شکل',
    dark_mode: 'ڈارک موڈ',
    dark_mode_sub: 'لائٹ اور ڈارک تھیم کے درمیان تبدیل کریں',
    language: 'زبان',
    language_sub: 'اپنی پسندیدہ زبان منتخب کریں',
    logout: 'لاگ آؤٹ',
    change_store: 'اسٹور تبدیل کریں',
    rimal_footer: 'ریمال ہنگرسٹیشن انوینٹری سسٹم',
  },
  ne: {
    welcome_back: 'फिर स्वागत छ',
    sign_in_subtitle: 'इन्भेन्टरी ड्यासबोर्ड पहुँच गर्न साइन इन गर्नुहोस्',
    continue_with_google: 'Google सँग जारी राख्नुहोस्',
    select_store: 'स्टोर छान्नुहोस्',
    choose_store_subtitle: 'जारी राख्न आफ्नो स्टोर छान्नुहोस्',
    dashboard: 'ड्यासबोर्ड',
    operations: 'सञ्चालन',
    pomaker: 'पीओ मेकर',
    pomaker_sub: 'खरिद अर्डर बनाउनुहोस्',
    invoice: 'इनभ्वाइस',
    invoice_sub: 'इनभ्वाइस व्यवस्थापन',
    expiry_damage: 'एक्सपायरी डेमेज',
    expiry_damage_sub: 'म्याद सकिएका र क्षतिग्रस्त वस्तुहरू ट्र्याक गर्नुहोस्',
    settings: 'सेटिङ',
    appearance: 'उपस्थिति',
    dark_mode: 'डार्क मोड',
    dark_mode_sub: 'लाइट र डार्क थीम बीच स्विच गर्नुहोस्',
    language: 'भाषा',
    language_sub: 'आफ्नो मनपर्ने भाषा छान्नुहोस्',
    logout: 'लगआउट',
    change_store: 'स्टोर परिवर्तन',
    rimal_footer: 'रिमाल हंगरस्टेशन इन्भेन्टरी प्रणाली',
  },
  bn: {
    welcome_back: 'আবার স্বাগতম',
    sign_in_subtitle: 'ইনভেন্টরি ড্যাশবোর্ড অ্যাক্সেস করতে সাইন ইন করুন',
    continue_with_google: 'Google দিয়ে চালিয়ে যান',
    select_store: 'স্টোর নির্বাচন করুন',
    choose_store_subtitle: 'চালিয়ে যেতে আপনার স্টোর নির্বাচন করুন',
    dashboard: 'ড্যাশবোর্ড',
    operations: 'অপারেশন',
    pomaker: 'পিও মেকার',
    pomaker_sub: 'ক্রয় আদেশ তৈরি করুন',
    invoice: 'ইনভয়েস',
    invoice_sub: 'ইনভয়েস পরিচালনা করুন',
    expiry_damage: 'মেয়াদোত্তীর্ণ ক্ষতি',
    expiry_damage_sub: 'মেয়াদোত্তীর্ণ ও ক্ষতিগ্রস্ত আইটেম ট্র্যাক করুন',
    settings: 'সেটিংস',
    appearance: 'চেহারা',
    dark_mode: 'ডার্ক মোড',
    dark_mode_sub: 'লাইট এবং ডার্ক থিমের মধ্যে স্যুইচ করুন',
    language: 'ভাষা',
    language_sub: 'আপনার পছন্দের ভাষা বেছে নিন',
    logout: 'লগআউট',
    change_store: 'স্টোর পরিবর্তন',
    rimal_footer: 'রিমাল হাংগারস্টেশন ইনভেন্টরি সিস্টেম',
  },
};

export default translations;
