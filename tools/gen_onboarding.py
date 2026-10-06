#!/usr/bin/env python3
"""Generate the onboarding screens that share one structure.
Distinctive screens (language, welcome, time confirmation, paywall) are hand-written."""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "design-v3"
ICON = "assets/icons/%s.png"

HEAD = """<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>Mizan — %(title)s</title>
<link rel="icon" href="assets/img/mizan-mark.svg">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="onb.css">
</head>
<body>
<div class="screen">
  <div class="glow soft"></div>
  <div class="bleed"></div>

  <div class="status">
    9:41
    <span class="r">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect y="7.5" width="3" height="3.5" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" width="3" height="11" rx="1"/></svg>
      <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x=".5" y=".5" width="20" height="10" rx="3" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="17" height="7" rx="1.8" fill="currentColor"/><path d="M22 4v3a2 2 0 0 0 0-3" fill="currentColor" opacity=".5"/></svg>
    </span>
  </div>

  <div class="prog">
    <a href="%(prev)s" aria-label="Orqaga">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19 8 12l7-7"/></svg>
    </a>
    <span class="track"><i style="width:%(pct)d%%"></i></span>
    <span class="n">%(step)02d / 12</span>
  </div>
"""

FOOT = """
  <div class="foot">
    %(hint)s<a class="act" href="%(next)s">%(cta)s</a>
  </div>

  <div class="grain"></div>
</div>
</body>
</html>
"""

CHECK = ('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" '
         'stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>')
TICK = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>')


def opts_block(items):
    out = ['  <div class="opts">']
    for icon, title, sub, on in items:
        k = f'<span class="k">{CHECK}</span>' if on else '<span class="k"></span>'
        sub_html = f"<s>{sub}</s>" if sub else ""
        out.append(f'''    <button class="opt{' on' if on else ''}" type="button">
      <img src="{ICON % icon}" alt="">
      <span class="l"><b>{title}</b>{sub_html}</span>
      {k}
    </button>''')
    out.append("  </div>")
    return "\n".join(out)


def pair_block(items):
    out = ['  <div class="pair">']
    for icon, label, on in items:
        out.append(f'''    <button class="{'on' if on else ''}" type="button">
      <img src="{ICON % icon}" alt=""><b>{label}</b>
    </button>''')
    out.append("  </div>")
    return "\n".join(out)


def perm_block(icon, h1, p, bullets):
    lis = "\n".join(f"      <li>{TICK}{b}</li>" for b in bullets)
    return f'''  <div class="perm">
    <span class="big"><img src="{ICON % icon}" alt=""></span>
    <h1>{h1}</h1>
    <p>{p}</p>
    <ul>
{lis}
    </ul>
  </div>'''


SCREENS = [
 dict(file="03-gender.html", title="Jins", step=3, prev="02-welcome.html", next="04-practice.html",
      cta="Davom etish", hint="",
      ask=("Jinsingizni tanlang", "Bu namoz hisobini to'g'ri yuritish uchun kerak — juma namozi va hayz kunlari uchun."),
      body=pair_block([("person_man","Erkak",False),("person_woman","Ayol",True)]) +
           '''\n  <div class="note">
    <img src="assets/icons/cycle.png" alt="">
    <p>Hayz kunlarida namozlar <b>o'tkazib yuborilgan deb belgilanmaydi</b>. Bu kunlarni ilovada bir tugma bilan qayd etasiz.</p>
  </div>'''),

 dict(file="04-practice.html", title="Hozirgi holat", step=4, prev="03-gender.html", next="05-struggle.html",
      cta="Davom etish", hint='<div class="hint">bu javobni keyin ham o\'zgartirasiz</div>',
      ask=("Hozir qanchalik muntazam o'qiyapsiz?", "To'g'ri javob yo'q — bu faqat boshlang'ich nuqtangizni belgilaydi."),
      body=opts_block([
        ("ring_full","Barcha besh vaqt","Deyarli hech qaysisini qoldirmayman",False),
        ("ring_most","Ko'pini o'qiyman","Ba'zan bir-ikkitasi qoladi",True),
        ("ring_some","Ba'zi vaqtlarda","Muntazam emas, lekin o'qiyman",False),
        ("sprout","Endi boshlayapman","Odat qilmoqchiman",False),
        ("dash","Aytmayman","Bu savolni o'tkazib yuboraman",False)])),

 dict(file="05-struggle.html", title="Qiyinchilik", step=5, prev="04-practice.html", next="06-goal.html",
      cta="Davom etish", hint='<div class="hint">bir nechtasini tanlashingiz mumkin</div>',
      ask=("Eng qiyini nima?", "Ilova shunga qarab qaysi imkoniyatlarni oldinga chiqarishini hal qiladi."),
      body=opts_block([
        ("alarm","Bomdodga uyg'onolmayman","Budilnikni o'chirib yana uxlayman",True),
        ("apps","Telefon chalg'itadi","Scroll qilib vaqtni o'tkazaman",True),
        ("bell","Vaqtini unutib qo'yaman","Ish yoki o'qish orasida",False),
        ("chart","Muntazamlik yetishmaydi","Bir hafta yaxshi, keyin tashlab yuboraman",False)])),

 dict(file="06-goal.html", title="Maqsad", step=6, prev="05-struggle.html", next="07-madhhab.html",
      cta="Davom etish", hint="",
      ask=("30 kundan keyin qayerda bo'lmoqchisiz?", "Bog'ingiz shu maqsad bilan o'sadi."),
      body=opts_block([
        ("fajr","Bomdodni tiklash","Har kuni uyg'onib namozga turish",False),
        ("ring_full","Besh vaqtni to'liq","Bittasini ham qoldirmaslik",True),
        ("shield","Namoz vaqtini himoya qilish","Telefonsiz, xotirjam o'qish",False)])),

 dict(file="07-madhhab.html", title="Mazhab", step=7, prev="06-goal.html", next="08-location.html",
      cta="Davom etish", hint="",
      ask=("Qaysi mazhabga amal qilasiz?", "Bu faqat Asr vaqtini hisoblashga ta'sir qiladi."),
      body=pair_block([("shadow_long","Hanafiy",True),("shadow_short","Shofiiy",False)]) +
        '''\n  <div class="note">
    <img src="assets/icons/clock.png" alt="">
    <p>Hanafiyda Asr kechroq boshlanadi — <b>16:32</b>, Shofiiyda <b>15:48</b>. Hisob usuli
    O'zbekiston muftiyati taqvimiga moslangan; keyin sozlamalardan o'zgartirasiz.</p>
  </div>'''),

 dict(file="08-location.html", title="Joylashuv", step=8, prev="07-madhhab.html", next="09-timeconfirm.html",
      cta="Ruxsat berish",
      hint='<div class="hint">shaharni qo\'lda ham tanlashingiz mumkin</div>',
      ask=None,
      body=perm_block("pin","Namoz vaqtlari uchun joylashuv kerak",
        "Quyosh chiqishi va botishi shaharga qarab o'zgaradi. Joylashuvsiz vaqtlar noto'g'ri bo'ladi.",
        ["Faqat qurilmangizda saqlanadi","Hech kimga sotilmaydi va uzatilmaydi","Istalgan vaqtda o'chirasiz"])),

 dict(file="11-scanobject.html", title="Skaner buyumi", step=11, prev="10-fajrintro.html", next="12-paywall.html",
      cta="Davom etish", hint="",
      ask=("Nimani skanerlaysiz?", "Karavotdan uzoqroqdagi buyumni tanlang — shunda turishga majbur bo'lasiz."),
      body=opts_block([
        ("mat","Joynamoz","Namozga tayyorgarlik bilan bog'liq",True),
        ("tap","Rakovina","Hammomga borishni talab qiladi",False),
        ("mat_tap","Ikkalasi ham","Qaysinisi yaqin bo'lsa, o'shani",False)]) +
        '''\n  <div class="note">
    <img src="assets/icons/camera.png" alt="">
    <p>Kamera faqat signal vaqtida ochiladi. Rasm <b>saqlanmaydi</b> va hech qayerga yuborilmaydi.</p>
  </div>'''),
]

for s in SCREENS:
    ask = ""
    if s["ask"]:
        ask = f'''
  <div class="ask">
    <h1>{s["ask"][0]}</h1>
    <p>{s["ask"][1]}</p>
  </div>
'''
    html = HEAD % dict(title=s["title"], prev=s["prev"], step=s["step"],
                       pct=int(s["step"]/12*100)) + ask + s["body"] + \
           FOOT % dict(hint=s["hint"], next=s["next"], cta=s["cta"])
    (OUT / s["file"]).write_text(html, encoding="utf-8")
    print("wrote", s["file"])
