#!/usr/bin/env python3
"""Settings family, qibla, the log sheet, and the two full-screen Fajr moments."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_app import OUT, IC, page, bar, li, group, tiles, STATUS

W = lambda n, s: (OUT / n).write_text(s, encoding="utf-8") or print("wrote", n)
TG = lambda on: f'<span class="tg{" on" if on else ""}"><i></i></span>'

# ---------------------------------------------------------------- settings
W("settings.html", page("Sozlamalar",
  bar("Sozlamalar", back="home.html")
  + '''  <a class="me" href="profile.html">
    <span class="av">M</span>
    <span class="l"><b>Murodjon</b><s>Bepul reja · Premiumga o'tish</s></span>
    <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A5A11" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
  </a>
'''
  + '  <div class="lbl">Namoz</div>\n'
  + group([
      li("calendar","Hisob usuli va mazhab",right="Hanafiy",chev=True,href="prayer-settings.html"),
      li("compass","Joylashuv",right="Toshkent",chev=True),
      li("bell","Bildirishnomalar",chev=True,href="notifications.html"),
    ])
  + '  <div class="lbl">Shaxsiy</div>\n'
  + group([
      li("heart","Hayz rejimi",right="Yoqilgan",chev=True,href="cycle-mode.html"),
      li("alarm","Bomdod uyg'otgichi",right="Joynamoz",chev=True,href="alarm-settings.html"),
      li("lock","Fokus",right="Yoqilgan",chev=True,href="focus-home.html"),
      li(None,"Tungi ko'rinish",right=TG(False)),
    ])
  + '  <div class="lbl">Ilova</div>\n'
  + group([
      li(None,"Til",right="O'zbekcha",chev=True,href="01-language.html"),
      li(None,"Maxfiylik siyosati",chev=True),
      li(None,"Hisobni o'chirish",cls="danger",chev=True),
    ])
  + '  <div class="ver">Fajr 1.0.0 · Toshkent</div>\n',
  extra_css='''  .me{position:relative;margin:4px var(--gutter) 0;padding:16px 18px;border-radius:24px;
       background:linear-gradient(150deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
       display:flex;align-items:center;gap:14px;text-decoration:none;flex:none}
  .me .av{width:48px;height:48px;border-radius:17px;background:rgba(255,253,247,.6);flex:none;
          display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#8A5A11}
  .me .l{flex:1;display:flex;flex-direction:column;gap:2px}
  .me .l b{font-size:16px;font-weight:800;color:#40290C}
  .me .l s{font-size:12px;font-weight:600;color:#8A5A11;text-decoration:none}
  .li.danger .l b{color:#9E5757}
  .ver{position:relative;margin:18px var(--gutter) 0;text-align:center;font-size:11.5px;
       font-weight:500;color:#B5A692;flex:none}'''))

# ---------------------------------------------------------------- cycle mode
W("cycle-mode.html", page("Hayz rejimi",
  bar("Hayz rejimi", back="settings.html")
  + '''  <div class="act-state">
    <img src="assets/icons/maghrib.png" alt="">
    <span class="l"><b>Hozir faol</b><s>3-kun · 27-sentabrdan beri</s></span>
    <span class="tg on"><i></i></span>
  </div>
'''
  + '  <div class="lbl">Bu davrda ilova nima qiladi</div>\n'
  + group([
      li("check","Namozlar o'tkazib yuborilgan deb belgilanmaydi"),
      li("check","Bog'ingiz to'xtab turadi, qurib qolmaydi"),
      li("check","Namoz eslatmalari o'chiriladi"),
      li("check","Qazo hisobiga qo'shilmaydi"),
    ])
  + '  <div class="lbl">Tarix</div>\n'
  + group([
      li(None,"27-sentabr — davom etmoqda",right="3 kun"),
      li(None,"12–17 sentabr",right="6 kun",cls="dim"),
      li(None,"14–19 avgust",right="6 kun",cls="dim"),
    ])
  + '''  <div class="priv">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4E6480" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 19 6v6c0 4.4-3 7.6-7 8.8-4-1.2-7-4.4-7-8.8V6z"/></svg>
    <p>Bu ma'lumot faqat telefoningizda saqlanadi. Serverga yuborilmaydi va hech kim ko'rmaydi.</p>
  </div>
'''
  + '  <div style="margin:16px var(--gutter) 0;flex:none"><a class="act" href="#">Tugadi deb belgilash</a></div>\n',
  extra_css='''  .act-state{position:relative;margin:4px var(--gutter) 0;padding:16px 18px;border-radius:24px;
        background:linear-gradient(155deg,#F6E0E0,#EFD4D4);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:14px;flex:none}
  .act-state img{width:40px;height:40px}
  .act-state .l{flex:1;display:flex;flex-direction:column;gap:2px}
  .act-state .l b{font-size:16px;font-weight:800;color:#6E3838}
  .act-state .l s{font-size:12.5px;font-weight:600;color:#844646;text-decoration:none}
  .priv{position:relative;margin:14px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#F0F2F5;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.55;font-weight:500;color:#55657A}
  .priv svg{flex:none;margin-top:1px}
  .priv p{flex:1}'''))

# ---------------------------------------------------------------- notifications
W("notifications.html", page("Bildirishnomalar",
  bar("Bildirishnomalar", back="settings.html")
  + '  <div class="lbl">Namozdan oldin</div>\n'
  + group([li(None,"Oldindan eslatish",right=TG(True))])
  + '''  <div class="segwrap"><div class="seg">
    <button>5d</button><button>10d</button><button class="on">15d</button><button>30d</button>
  </div></div>
'''
  + '  <div class="lbl">Namuna</div>\n'
  + '''  <div class="prev">
    <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A3210" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V11.5a7 7 0 0 1 14 0V21"/><path d="M2.5 21h19"/></svg></span>
    <span class="l"><span class="t"><b>Fajr</b><s>hozir</s></span>
    <p>Peshingacha 15 daqiqa qoldi.</p></span>
  </div>
'''
  + '  <div class="lbl">Namozlar bo\'yicha</div>\n'
  + group([
      li(None,"Bomdod",right="Uyg'otgich"), li(None,"Peshin",right="Azon"),
      li(None,"Asr",right="Azon"), li(None,"Shom",right="Jimgina"), li(None,"Xufton",right="Azon"),
    ])
  + '''  <div class="warn">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 8v5M12 16.5h.01"/></svg>
    <p>Android bildirishnomalarni kechiktirishi mumkin. Aniq vaqtda kelishi uchun batareya optimallashtirishini o'chiring.</p>
  </div>
''',
  extra_css='''  .segwrap{margin-top:10px;flex:none}
  .prev{position:relative;margin:0 var(--gutter);padding:15px 16px;border-radius:22px;
        background:var(--surface);box-shadow:var(--lift);display:flex;gap:13px;flex:none}
  .prev .ic{width:40px;height:40px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;
            background:linear-gradient(150deg,#F9D89F,#E9A644)}
  .prev .l{flex:1;display:flex;flex-direction:column;gap:3px}
  .prev .t{display:flex;align-items:baseline;gap:8px}
  .prev .t b{flex:1;font-size:13px;font-weight:800}
  .prev .t s{font-size:11px;font-weight:500;color:#9A8974;text-decoration:none}
  .prev p{font-size:13px;line-height:1.45;font-weight:500;color:#4A3520}
  .warn{position:relative;margin:16px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#FDF3E4;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.5;font-weight:600;color:#8A5A11}
  .warn svg{flex:none;margin-top:1px}
  .warn p{flex:1}'''))

# ---------------------------------------------------------------- profile
W("profile.html", page("Profil",
  bar("Profil", back="settings.html")
  + '''  <div class="who">
    <span class="av">M</span>
    <b>Murodjon</b>
    <s>Google orqali kirilgan · 2026-yil sentabrdan</s>
  </div>
'''
  + tiles([("412","namoz"),("17","kun Bomdod"),("31s","fokus")])
  + '''  <div class="plan">
    <img src="assets/icons/heart.png" alt="">
    <span class="l"><b>Bepul reja</b><s>Premium bilan ko'proq imkoniyat</s></span>
  </div>
  <div style="margin:10px var(--gutter) 0;flex:none"><a class="act" href="12-paywall.html">7 kun bepul sinash</a></div>
'''
  + '  <div class="lbl">Hisob</div>\n'
  + group([
      li(None,"Email",right="m•••@gmail.com"),
      li(None,"Ma'lumotlarni yuklab olish",chev=True),
      li(None,"Boshqa qurilmalar",right="1 ta",chev=True),
    ])
  + '  <div style="margin:16px var(--gutter) 0;flex:none"><a class="act ghost" href="#">Chiqish</a></div>\n',
  extra_css='''  .who{position:relative;margin:6px var(--gutter) 18px;display:flex;flex-direction:column;
       align-items:center;gap:8px;flex:none}
  .who .av{width:82px;height:82px;border-radius:29px;background:linear-gradient(155deg,#F9D89F,#E9A644);
           display:flex;align-items:center;justify-content:center;font-size:31px;font-weight:800;
           color:#4A3210;box-shadow:0 12px 26px rgba(197,138,46,.26)}
  .who b{font-size:20px;font-weight:800}
  .who s{font-size:12.5px;font-weight:500;color:var(--ink-soft);text-decoration:none}
  .plan{position:relative;margin:14px var(--gutter) 0;padding:16px 18px;border-radius:22px;
        background:linear-gradient(155deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:13px;flex:none}
  .plan img{width:38px;height:38px}
  .plan .l{flex:1;display:flex;flex-direction:column;gap:2px}
  .plan .l b{font-size:15.5px;font-weight:800;color:#40290C}
  .plan .l s{font-size:12px;font-weight:600;color:#8A5A11;text-decoration:none}'''))

# ---------------------------------------------------------------- prayer settings
W("prayer-settings.html", page("Hisob usuli",
  bar("Hisob usuli", back="settings.html")
  + '  <div class="lbl">Mazhab · Asr vaqti</div>\n'
  + group([
      li("book","Hanafiy","Kech Asr · 16:34",cls="on"),
      li("book","Shofiiy","Erta Asr · 15:48"),
    ])
  + '  <div class="lbl">Hisoblash standarti</div>\n'
  + group([
      li("calendar","O'zbekiston muftiyati","Devoriy taqvimga mos keladi",cls="on"),
      li(None,"Muslim World League"),
      li(None,"Umm al-Qura"),
    ])
  + '  <div class="lbl">Qo\'lda sozlash</div>\n'
  + group([
      li(None,"Bomdod",right="0 daq",chev=True), li(None,"Peshin",right="0 daq",chev=True),
      li(None,"Asr",right="+2 daq",chev=True), li(None,"Shom",right="0 daq",chev=True),
      li(None,"Xufton",right="0 daq",chev=True),
    ])
  + '''  <div class="warn">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>
    <p>Devoriy taqvimingiz bilan solishtiring — farq bo'lsa har bir vaqtni alohida siljiting.</p>
  </div>
''',
  extra_css='''  .warn{position:relative;margin:16px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#FDF3E4;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.5;font-weight:600;color:#8A5A11}
  .warn svg{flex:none;margin-top:1px}
  .warn p{flex:1}'''))

print("settings family done")
