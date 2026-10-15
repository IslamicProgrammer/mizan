/**
 * All 114 surahs, bundled rather than fetched -- see task-33-brief.md's Step
 * 2. This has not changed in fourteen centuries, so there is no upstream to
 * call and no cache to keep warm; it is just data.
 *
 * `ayahCount` and `revelation` are cross-checked against `api.quran.com`'s
 * `/v4/chapters` (verified live before this shipped), which is also where
 * `nameArabic` comes from. `nameUzbek` is not available from any keyless API
 * in Latin script -- `quran.com` has no Uzbek localisation for chapter names,
 * and `alquran.cloud`'s `uz.sodik` edition only translates ayah text, never
 * the surah heading -- so these are the standard Uzbek transliterations used
 * throughout Muhammad Sodiq Muhammad Yusuf's own edition, the same
 * translator `uz.sodik` already credits on the daily-ayah card. The eleven
 * short surahs (103-110, 112-114) are spelled identically to
 * `CURATED_AYAHS` in `./ayahs.ts` on purpose -- the same surah must read the
 * same name whether it is reached from the daily ayah or from this list.
 */
export type Revelation = 'meccan' | 'medinan';

export type Surah = {
  number: number;
  nameUzbek: string;
  nameArabic: string;
  ayahCount: number;
  revelation: Revelation;
};

export const SURAHS: readonly Surah[] = [
  { number: 1, nameUzbek: 'Fotiha', nameArabic: 'الفاتحة', ayahCount: 7, revelation: 'meccan' },
  { number: 2, nameUzbek: 'Baqara', nameArabic: 'البقرة', ayahCount: 286, revelation: 'medinan' },
  { number: 3, nameUzbek: "Oli Imron", nameArabic: 'آل عمران', ayahCount: 200, revelation: 'medinan' },
  { number: 4, nameUzbek: 'Niso', nameArabic: 'النساء', ayahCount: 176, revelation: 'medinan' },
  { number: 5, nameUzbek: 'Moida', nameArabic: 'المائدة', ayahCount: 120, revelation: 'medinan' },
  { number: 6, nameUzbek: "An'om", nameArabic: 'الأنعام', ayahCount: 165, revelation: 'meccan' },
  { number: 7, nameUzbek: "A'rof", nameArabic: 'الأعراف', ayahCount: 206, revelation: 'meccan' },
  { number: 8, nameUzbek: 'Anfol', nameArabic: 'الأنفال', ayahCount: 75, revelation: 'medinan' },
  { number: 9, nameUzbek: 'Tavba', nameArabic: 'التوبة', ayahCount: 129, revelation: 'medinan' },
  { number: 10, nameUzbek: 'Yunus', nameArabic: 'يونس', ayahCount: 109, revelation: 'meccan' },
  { number: 11, nameUzbek: 'Hud', nameArabic: 'هود', ayahCount: 123, revelation: 'meccan' },
  { number: 12, nameUzbek: 'Yusuf', nameArabic: 'يوسف', ayahCount: 111, revelation: 'meccan' },
  { number: 13, nameUzbek: "Ra'd", nameArabic: 'الرعد', ayahCount: 43, revelation: 'medinan' },
  { number: 14, nameUzbek: 'Ibrohim', nameArabic: 'ابراهيم', ayahCount: 52, revelation: 'meccan' },
  { number: 15, nameUzbek: 'Hijr', nameArabic: 'الحجر', ayahCount: 99, revelation: 'meccan' },
  { number: 16, nameUzbek: 'Nahl', nameArabic: 'النحل', ayahCount: 128, revelation: 'meccan' },
  { number: 17, nameUzbek: 'Isro', nameArabic: 'الإسراء', ayahCount: 111, revelation: 'meccan' },
  { number: 18, nameUzbek: 'Kahf', nameArabic: 'الكهف', ayahCount: 110, revelation: 'meccan' },
  { number: 19, nameUzbek: 'Maryam', nameArabic: 'مريم', ayahCount: 98, revelation: 'meccan' },
  { number: 20, nameUzbek: 'Toha', nameArabic: 'طه', ayahCount: 135, revelation: 'meccan' },
  { number: 21, nameUzbek: 'Anbiyo', nameArabic: 'الأنبياء', ayahCount: 112, revelation: 'meccan' },
  { number: 22, nameUzbek: 'Hajj', nameArabic: 'الحج', ayahCount: 78, revelation: 'medinan' },
  { number: 23, nameUzbek: "Mu'minun", nameArabic: 'المؤمنون', ayahCount: 118, revelation: 'meccan' },
  { number: 24, nameUzbek: 'Nur', nameArabic: 'النور', ayahCount: 64, revelation: 'medinan' },
  { number: 25, nameUzbek: 'Furqon', nameArabic: 'الفرقان', ayahCount: 77, revelation: 'meccan' },
  { number: 26, nameUzbek: 'Shuaro', nameArabic: 'الشعراء', ayahCount: 227, revelation: 'meccan' },
  { number: 27, nameUzbek: 'Naml', nameArabic: 'النمل', ayahCount: 93, revelation: 'meccan' },
  { number: 28, nameUzbek: 'Qasas', nameArabic: 'القصص', ayahCount: 88, revelation: 'meccan' },
  { number: 29, nameUzbek: 'Ankabut', nameArabic: 'العنكبوت', ayahCount: 69, revelation: 'meccan' },
  { number: 30, nameUzbek: 'Rum', nameArabic: 'الروم', ayahCount: 60, revelation: 'meccan' },
  { number: 31, nameUzbek: 'Luqmon', nameArabic: 'لقمان', ayahCount: 34, revelation: 'meccan' },
  { number: 32, nameUzbek: 'Sajda', nameArabic: 'السجدة', ayahCount: 30, revelation: 'meccan' },
  { number: 33, nameUzbek: 'Ahzob', nameArabic: 'الأحزاب', ayahCount: 73, revelation: 'medinan' },
  { number: 34, nameUzbek: 'Saba', nameArabic: 'سبإ', ayahCount: 54, revelation: 'meccan' },
  { number: 35, nameUzbek: 'Fotir', nameArabic: 'فاطر', ayahCount: 45, revelation: 'meccan' },
  { number: 36, nameUzbek: 'Yosin', nameArabic: 'يس', ayahCount: 83, revelation: 'meccan' },
  { number: 37, nameUzbek: 'Saffot', nameArabic: 'الصافات', ayahCount: 182, revelation: 'meccan' },
  { number: 38, nameUzbek: 'Sod', nameArabic: 'ص', ayahCount: 88, revelation: 'meccan' },
  { number: 39, nameUzbek: 'Zumar', nameArabic: 'الزمر', ayahCount: 75, revelation: 'meccan' },
  { number: 40, nameUzbek: "G'ofir", nameArabic: 'غافر', ayahCount: 85, revelation: 'meccan' },
  { number: 41, nameUzbek: 'Fussilat', nameArabic: 'فصلت', ayahCount: 54, revelation: 'meccan' },
  { number: 42, nameUzbek: 'Shuro', nameArabic: 'الشورى', ayahCount: 53, revelation: 'meccan' },
  { number: 43, nameUzbek: 'Zukhruf', nameArabic: 'الزخرف', ayahCount: 89, revelation: 'meccan' },
  { number: 44, nameUzbek: 'Dukhon', nameArabic: 'الدخان', ayahCount: 59, revelation: 'meccan' },
  { number: 45, nameUzbek: 'Josiya', nameArabic: 'الجاثية', ayahCount: 37, revelation: 'meccan' },
  { number: 46, nameUzbek: 'Ahqof', nameArabic: 'الأحقاف', ayahCount: 35, revelation: 'meccan' },
  { number: 47, nameUzbek: 'Muhammad', nameArabic: 'محمد', ayahCount: 38, revelation: 'medinan' },
  { number: 48, nameUzbek: 'Fath', nameArabic: 'الفتح', ayahCount: 29, revelation: 'medinan' },
  { number: 49, nameUzbek: 'Hujurot', nameArabic: 'الحجرات', ayahCount: 18, revelation: 'medinan' },
  { number: 50, nameUzbek: 'Qof', nameArabic: 'ق', ayahCount: 45, revelation: 'meccan' },
  { number: 51, nameUzbek: 'Zoriyot', nameArabic: 'الذاريات', ayahCount: 60, revelation: 'meccan' },
  { number: 52, nameUzbek: 'Tur', nameArabic: 'الطور', ayahCount: 49, revelation: 'meccan' },
  { number: 53, nameUzbek: 'Najm', nameArabic: 'النجم', ayahCount: 62, revelation: 'meccan' },
  { number: 54, nameUzbek: 'Qamar', nameArabic: 'القمر', ayahCount: 55, revelation: 'meccan' },
  { number: 55, nameUzbek: 'Rahmon', nameArabic: 'الرحمن', ayahCount: 78, revelation: 'medinan' },
  { number: 56, nameUzbek: 'Voqea', nameArabic: 'الواقعة', ayahCount: 96, revelation: 'meccan' },
  { number: 57, nameUzbek: 'Hadid', nameArabic: 'الحديد', ayahCount: 29, revelation: 'medinan' },
  { number: 58, nameUzbek: 'Mujodala', nameArabic: 'المجادلة', ayahCount: 22, revelation: 'medinan' },
  { number: 59, nameUzbek: 'Hashr', nameArabic: 'الحشر', ayahCount: 24, revelation: 'medinan' },
  { number: 60, nameUzbek: 'Mumtahana', nameArabic: 'الممتحنة', ayahCount: 13, revelation: 'medinan' },
  { number: 61, nameUzbek: 'Saff', nameArabic: 'الصف', ayahCount: 14, revelation: 'medinan' },
  { number: 62, nameUzbek: "Jum'a", nameArabic: 'الجمعة', ayahCount: 11, revelation: 'medinan' },
  { number: 63, nameUzbek: 'Munofiqun', nameArabic: 'المنافقون', ayahCount: 11, revelation: 'medinan' },
  { number: 64, nameUzbek: "Tag'obun", nameArabic: 'التغابن', ayahCount: 18, revelation: 'medinan' },
  { number: 65, nameUzbek: 'Taloq', nameArabic: 'الطلاق', ayahCount: 12, revelation: 'medinan' },
  { number: 66, nameUzbek: 'Tahrim', nameArabic: 'التحريم', ayahCount: 12, revelation: 'medinan' },
  { number: 67, nameUzbek: 'Mulk', nameArabic: 'الملك', ayahCount: 30, revelation: 'meccan' },
  { number: 68, nameUzbek: 'Qalam', nameArabic: 'القلم', ayahCount: 52, revelation: 'meccan' },
  { number: 69, nameUzbek: 'Haqqa', nameArabic: 'الحاقة', ayahCount: 52, revelation: 'meccan' },
  { number: 70, nameUzbek: "Ma'orij", nameArabic: 'المعارج', ayahCount: 44, revelation: 'meccan' },
  { number: 71, nameUzbek: 'Nuh', nameArabic: 'نوح', ayahCount: 28, revelation: 'meccan' },
  { number: 72, nameUzbek: 'Jin', nameArabic: 'الجن', ayahCount: 28, revelation: 'meccan' },
  { number: 73, nameUzbek: 'Muzzammil', nameArabic: 'المزمل', ayahCount: 20, revelation: 'meccan' },
  { number: 74, nameUzbek: 'Muddassir', nameArabic: 'المدثر', ayahCount: 56, revelation: 'meccan' },
  { number: 75, nameUzbek: 'Qiyomat', nameArabic: 'القيامة', ayahCount: 40, revelation: 'meccan' },
  { number: 76, nameUzbek: 'Inson', nameArabic: 'الانسان', ayahCount: 31, revelation: 'medinan' },
  { number: 77, nameUzbek: 'Mursalot', nameArabic: 'المرسلات', ayahCount: 50, revelation: 'meccan' },
  { number: 78, nameUzbek: "Naba'", nameArabic: 'النبإ', ayahCount: 40, revelation: 'meccan' },
  { number: 79, nameUzbek: 'Noziot', nameArabic: 'النازعات', ayahCount: 46, revelation: 'meccan' },
  { number: 80, nameUzbek: 'Abasa', nameArabic: 'عبس', ayahCount: 42, revelation: 'meccan' },
  { number: 81, nameUzbek: 'Takvir', nameArabic: 'التكوير', ayahCount: 29, revelation: 'meccan' },
  { number: 82, nameUzbek: 'Infitor', nameArabic: 'الإنفطار', ayahCount: 19, revelation: 'meccan' },
  { number: 83, nameUzbek: 'Mutaffifin', nameArabic: 'المطففين', ayahCount: 36, revelation: 'meccan' },
  { number: 84, nameUzbek: 'Inshiqoq', nameArabic: 'الإنشقاق', ayahCount: 25, revelation: 'meccan' },
  { number: 85, nameUzbek: 'Buruj', nameArabic: 'البروج', ayahCount: 22, revelation: 'meccan' },
  { number: 86, nameUzbek: 'Toriq', nameArabic: 'الطارق', ayahCount: 17, revelation: 'meccan' },
  { number: 87, nameUzbek: "A'lo", nameArabic: 'الأعلى', ayahCount: 19, revelation: 'meccan' },
  { number: 88, nameUzbek: "G'oshiya", nameArabic: 'الغاشية', ayahCount: 26, revelation: 'meccan' },
  { number: 89, nameUzbek: 'Fajr', nameArabic: 'الفجر', ayahCount: 30, revelation: 'meccan' },
  { number: 90, nameUzbek: 'Balad', nameArabic: 'البلد', ayahCount: 20, revelation: 'meccan' },
  { number: 91, nameUzbek: 'Shams', nameArabic: 'الشمس', ayahCount: 15, revelation: 'meccan' },
  { number: 92, nameUzbek: 'Layl', nameArabic: 'الليل', ayahCount: 21, revelation: 'meccan' },
  { number: 93, nameUzbek: 'Zuho', nameArabic: 'الضحى', ayahCount: 11, revelation: 'meccan' },
  { number: 94, nameUzbek: 'Inshiroh', nameArabic: 'الشرح', ayahCount: 8, revelation: 'meccan' },
  { number: 95, nameUzbek: 'Tin', nameArabic: 'التين', ayahCount: 8, revelation: 'meccan' },
  { number: 96, nameUzbek: 'Alaq', nameArabic: 'العلق', ayahCount: 19, revelation: 'meccan' },
  { number: 97, nameUzbek: 'Qadr', nameArabic: 'القدر', ayahCount: 5, revelation: 'meccan' },
  { number: 98, nameUzbek: 'Bayyina', nameArabic: 'البينة', ayahCount: 8, revelation: 'medinan' },
  { number: 99, nameUzbek: 'Zalzala', nameArabic: 'الزلزلة', ayahCount: 8, revelation: 'medinan' },
  { number: 100, nameUzbek: 'Odiyot', nameArabic: 'العاديات', ayahCount: 11, revelation: 'meccan' },
  { number: 101, nameUzbek: 'Qoria', nameArabic: 'القارعة', ayahCount: 11, revelation: 'meccan' },
  { number: 102, nameUzbek: 'Takosur', nameArabic: 'التكاثر', ayahCount: 8, revelation: 'meccan' },
  { number: 103, nameUzbek: 'Asr', nameArabic: 'العصر', ayahCount: 3, revelation: 'meccan' },
  { number: 104, nameUzbek: 'Humaza', nameArabic: 'الهمزة', ayahCount: 9, revelation: 'meccan' },
  { number: 105, nameUzbek: 'Fil', nameArabic: 'الفيل', ayahCount: 5, revelation: 'meccan' },
  { number: 106, nameUzbek: 'Quraysh', nameArabic: 'قريش', ayahCount: 4, revelation: 'meccan' },
  { number: 107, nameUzbek: "Mo'un", nameArabic: 'الماعون', ayahCount: 7, revelation: 'meccan' },
  { number: 108, nameUzbek: 'Kavsar', nameArabic: 'الكوثر', ayahCount: 3, revelation: 'meccan' },
  { number: 109, nameUzbek: 'Kofirun', nameArabic: 'الكافرون', ayahCount: 6, revelation: 'meccan' },
  { number: 110, nameUzbek: 'Nasr', nameArabic: 'النصر', ayahCount: 3, revelation: 'medinan' },
  { number: 111, nameUzbek: 'Masad', nameArabic: 'المسد', ayahCount: 5, revelation: 'meccan' },
  { number: 112, nameUzbek: 'Ixlos', nameArabic: 'الإخلاص', ayahCount: 4, revelation: 'meccan' },
  { number: 113, nameUzbek: 'Falaq', nameArabic: 'الفلق', ayahCount: 5, revelation: 'meccan' },
  { number: 114, nameUzbek: 'Nos', nameArabic: 'الناس', ayahCount: 6, revelation: 'meccan' },
];

export function surahByNumber(n: number): Surah | undefined {
  return SURAHS.find((s) => s.number === n);
}
