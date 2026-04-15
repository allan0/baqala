import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Languages } from 'lucide-react';

const tourSteps = {
  en: [
    { title: "Welcome to Baqala Network!", description: "The future of neighborhood shopping. Let's take a quick tour." },
    { title: "Digital Hisaab (Ledger)", description: "Track your grocery tabs from any participating baqala, all in one place. No more forgotten debts." },
    { title: "AI-Powered Ordering", description: "Use our Telegram bot or the in-app AI Genie to order with your voice or text. Magic!" },
    { title: "Web3 Crypto Settlements", description: "Settle your Hisaab with crypto (like TON) to get exclusive, automatic discounts from your baqala." },
    { title: "Dual Profiles", description: "Seamlessly switch between your Resident account and your Baqala Owner dashboard if you run a store." }
  ],
  ar: [
    { title: "أهلاً بك في شبكة بقالات!", description: "مستقبل التسوق في الفريج. لنبدأ جولة سريعة." },
    { title: "الحساب الرقمي (الدفتر)", description: "تابع حساباتك من أي بقالة مشاركة في مكان واحد. لا ديون منسية بعد اليوم." },
    { title: "الطلب بالذكاء الاصطناعي", description: "استخدم بوت تيليجرام أو المساعد الذكي لطلب أغراضك بالصوت أو النص. سحر!" },
    { title: "التسويات بالعملات الرقمية", description: "ادفع حسابك بالعملات الرقمية (مثل TON) واحصل على خصومات حصرية وتلقائية." },
    { title: "ملفات شخصية مزدوجة", description: "تنقّل بسهولة بين حسابك كـ 'ساكن' ولوحة تحكم 'راعي الدكان' إذا كنت تملك بقالة." }
  ]
};

export default function WelcomeTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState('en');
  const t = useMemo(() => tourSteps[lang][step - 1], [lang, step]);
  const isRTL = lang === 'ar';

  const handleFinish = () => {
    localStorage.setItem('baqala_tour_completed', 'true');
    localStorage.setItem('baqala_lang', lang); // Save selected language
    onComplete(lang);
  };

  const content = () => {
    if (step === 0) {
      return (
        <div className="text-center">
          <Languages size={48} className="mx-auto text-teal-400 mb-6" />
          <h2 className="text-2xl font-black mb-4">Choose Language</h2>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setLang('en'); setStep(1); }} className="w-full py-4 bg-white/10 rounded-2xl font-bold">English</button>
            <button onClick={() => { setLang('ar'); setStep(1); }} className="w-full py-4 bg-white/10 rounded-2xl font-bold">العربية (Arabic)</button>
          </div>
        </div>
      );
    }

    return (
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center mb-8">
          <p className="font-black text-teal-400 text-sm mb-2">{isRTL ? `خطوة ${step} من ٥` : `STEP ${step} OF 5`}</p>
          <h2 className="text-3xl font-black italic">{t.title}</h2>
          <p className="text-white/60 mt-4 text-base leading-relaxed">{t.description}</p>
        </div>
        <div className="flex items-center justify-between mt-10">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="p-3 bg-white/5 rounded-full disabled:opacity-20">
            {isRTL ? <ChevronRight /> : <ChevronLeft />}
          </button>
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/20'}`} />)}
          </div>
          {step === 5 ? (
            <button onClick={handleFinish} className="bg-teal-400 text-black font-bold py-3 px-6 rounded-full flex items-center gap-2">
              {isRTL ? 'إنهاء' : 'Finish'} <Check size={16} />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="p-3 bg-white/10 rounded-full">
              {isRTL ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-[32px] p-8 shadow-2xl"
        >
          {content()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
