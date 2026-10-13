/**
 * Onboarding content — all 12 steps.
 *
 * Copy is taken verbatim from the designed screens (design-v3/0*.html). Do not
 * paraphrase it here; change the design first, or the mockups and the app drift.
 */
import type { IconKey } from '../data/icons';

export type Choice = { key: string; icon: IconKey; title: string; sub?: string };

type Base = { id: string; cta: string; hint?: string };

export type Step = Base &
  (
    | { kind: 'language' }
    | { kind: 'welcome' }
    | { kind: 'choose'; select: 'one' | 'many'; ask: string; why: string; choices: Choice[] }
    | { kind: 'pair'; ask: string; why: string; note?: { icon: IconKey; text: string }; choices: [Choice, Choice] }
    | { kind: 'permission'; icon: IconKey; ask: string; why: string; bullets: string[] }
    | { kind: 'times'; ask: string; why: string }
    | { kind: 'steps'; ask: string; why: string; items: Choice[]; note: { icon: IconKey; text: string } }
    | { kind: 'paywall' }
  );

/**
 * v1 ships Uzbek only — the market is Uzbekistan, and a language the app
 * cannot actually speak must not be offered as if it could. Russian and
 * English stay listed, marked `soon`, so the plan is visible rather than
 * the two languages simply vanishing from the screen.
 */
export const LANGUAGES: { key: string; title: string; sub: string; soon?: true }[] = [
  { key: 'uz', title: "O'zbekcha", sub: 'Lotin alifbosi' },
  { key: 'ru', title: 'Русский', sub: 'Tez kunda', soon: true },
  { key: 'en', title: 'English', sub: 'Tez kunda', soon: true },
];

export const STEPS: Step[] = [
  { id: 'language', kind: 'language', cta: 'Davom etish' },
  { id: 'welcome', kind: 'welcome', cta: 'Boshlash' },
  {
    id: 'gender',
    kind: 'pair',
    cta: 'Davom etish',
    ask: 'Jinsingizni tanlang',
    why: "Bu namoz hisobini to'g'ri yuritish uchun kerak — juma namozi va hayz kunlari uchun.",
    note: {
      icon: 'cycle',
      text: "Hayz kunlarida namozlar o'tkazib yuborilgan deb belgilanmaydi. Bu kunlarni ilovada bir tugma bilan qayd etasiz.",
    },
    choices: [
      { key: 'man', icon: 'person_man', title: 'Erkak' },
      { key: 'woman', icon: 'person_woman', title: 'Ayol' },
    ],
  },
  {
    id: 'practice',
    kind: 'choose',
    select: 'one',
    cta: 'Davom etish',
    hint: "bu javobni keyin ham o'zgartirasiz",
    ask: "Hozir qanchalik muntazam o'qiyapsiz?",
    why: "To'g'ri javob yo'q — bu faqat boshlang'ich nuqtangizni belgilaydi.",
    choices: [
      { key: 'all', icon: 'ring_full', title: 'Barcha besh vaqt', sub: 'Deyarli hech qaysisini qoldirmayman' },
      { key: 'most', icon: 'ring_most', title: "Ko'pini o'qiyman", sub: "Ba'zan bir-ikkitasi qoladi" },
      { key: 'some', icon: 'ring_some', title: "Ba'zi vaqtlarda", sub: "Muntazam emas, lekin o'qiyman" },
      { key: 'starting', icon: 'sprout', title: 'Endi boshlayapman', sub: 'Odat qilmoqchiman' },
      { key: 'skip', icon: 'dash', title: 'Aytmayman', sub: "Bu savolni o'tkazib yuboraman" },
    ],
  },
  {
    id: 'struggle',
    kind: 'choose',
    select: 'many',
    cta: 'Davom etish',
    hint: 'bir nechtasini tanlashingiz mumkin',
    ask: 'Eng qiyini nima?',
    why: 'Ilova shunga qarab qaysi imkoniyatlarni oldinga chiqarishini hal qiladi.',
    choices: [
      { key: 'wake', icon: 'alarm', title: "Bomdodga uyg'onolmayman", sub: "Budilnikni o'chirib yana uxlayman" },
      { key: 'phone', icon: 'apps', title: "Telefon chalg'itadi", sub: "Scroll qilib vaqtni o'tkazaman" },
      { key: 'forget', icon: 'bell', title: "Vaqtini unutib qo'yaman", sub: "Ish yoki o'qish orasida" },
      { key: 'streak', icon: 'chart', title: 'Muntazamlik yetishmaydi', sub: 'Bir hafta yaxshi, keyin tashlab yuboraman' },
    ],
  },
  {
    id: 'goal',
    kind: 'choose',
    select: 'one',
    cta: 'Davom etish',
    ask: "30 kundan keyin qayerda bo'lmoqchisiz?",
    why: "Bog'ingiz shu maqsad bilan o'sadi.",
    choices: [
      { key: 'fajr', icon: 'fajr', title: 'Bomdodni tiklash', sub: "Har kuni uyg'onib namozga turish" },
      { key: 'five', icon: 'ring_full', title: "Besh vaqtni to'liq", sub: 'Bittasini ham qoldirmaslik' },
      { key: 'protect', icon: 'shield', title: 'Namoz vaqtini himoya qilish', sub: "Telefonsiz, xotirjam o'qish" },
    ],
  },
  {
    id: 'madhhab',
    kind: 'pair',
    cta: 'Davom etish',
    ask: 'Qaysi mazhabga amal qilasiz?',
    why: "Bu faqat Asr vaqtini hisoblashga ta'sir qiladi.",
    note: {
      icon: 'clock',
      text: "Hanafiyda Asr kechroq boshlanadi. Hisob usuli O'zbekiston muftiyati taqvimiga moslangan; keyin sozlamalardan o'zgartirasiz.",
    },
    choices: [
      { key: 'hanafi', icon: 'shadow_long', title: 'Hanafiy' },
      { key: 'shafii', icon: 'shadow_short', title: 'Shofiiy' },
    ],
  },
  {
    id: 'location',
    kind: 'permission',
    cta: 'Ruxsat berish',
    hint: "shaharni qo'lda ham tanlashingiz mumkin",
    icon: 'pin',
    ask: 'Namoz vaqtlari uchun joylashuv kerak',
    why: "Quyosh chiqishi va botishi shaharga qarab o'zgaradi. Joylashuvsiz vaqtlar noto'g'ri bo'ladi.",
    bullets: [
      'Faqat qurilmangizda saqlanadi',
      'Hech kimga sotilmaydi va uzatilmaydi',
      "Istalgan vaqtda o'chirasiz",
    ],
  },
  {
    id: 'times',
    kind: 'times',
    cta: "Ha, to'g'ri",
    hint: 'devoriy taqvimingiz bilan solishtiring',
    ask: 'Vaqtlar taqvimingizga mos keladimi?',
    why: "Toshkent · muftiyat taqvimi. Farq bo'lsa, har bir vaqtni alohida sozlang.",
  },
  {
    id: 'fajr',
    kind: 'steps',
    cta: 'Yoqish',
    ask: "Bomdodda o'rningizdan turishga majbur qiladi",
    why: "Oddiy budilnikni yotgan joyda o'chirasiz. Bu boshqacha ishlaydi.",
    items: [
      { key: 's1', icon: 'alarm', title: 'Signal boshlanadi', sub: "Ovoz asta-sekin kuchayadi. Ekranda bitta tugma." },
      { key: 's2', icon: 'camera', title: 'Turib skanerlaysiz', sub: "Joynamozni kameraga ko'rsatasiz — buning uchun o'rningizdan turishingiz kerak." },
      { key: 's3', icon: 'check', title: "Signal to'xtaydi", sub: "Endi siz oyoqdasiz. Qolgani sizga bog'liq." },
    ],
    note: {
      icon: 'shield',
      text: "Ilova buyumni ko'rganini tasdiqlaydi, namoz o'qiganingizni emas. Zarur bo'lsa signalni 10 soniya bosib turib o'chirasiz.",
    },
  },
  {
    id: 'scan',
    kind: 'choose',
    select: 'one',
    cta: 'Davom etish',
    ask: 'Nimani skanerlaysiz?',
    why: "Karavotdan uzoqroqdagi buyumni tanlang — shunda turishga majbur bo'lasiz.",
    choices: [
      { key: 'mat', icon: 'mat', title: 'Joynamoz', sub: "Namozga tayyorgarlik bilan bog'liq" },
      { key: 'sink', icon: 'tap', title: 'Rakovina', sub: 'Hammomga borishni talab qiladi' },
      { key: 'both', icon: 'mat_tap', title: 'Ikkalasi ham', sub: "Qaysinisi yaqin bo'lsa, o'shani" },
    ],
  },
  { id: 'paywall', kind: 'paywall', cta: '7 kun bepul boshlash' },
];

/** Steps that require an answer before the CTA enables. */
export const NEEDS_ANSWER = new Set(['gender', 'practice', 'struggle', 'goal', 'madhhab', 'scan']);
