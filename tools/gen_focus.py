#!/usr/bin/env python3
"""Focus + Fajr screens."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gen_app import OUT, IC, page, bar, li, group, tiles, STATUS

W = lambda n, s: (OUT / n).write_text(s, encoding="utf-8") or print("wrote", n)
TG = lambda on: f'<span class="tg{" on" if on else ""}"><i></i></span>'

# ---------------------------------------------------------------- focus home
W("focus-home.html", page("Fokus",
  bar("Fokus", back="home.html",
      right='<a class="ic" href="focus-stats.html" aria-label="Statistika"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 20V12M12 20V5M19 20v-6"/></svg></a>')
  + '''  <div class="state">
    <img src="assets/icons/lock.png" alt="">
    <span class="l"><b>Fokus yoqilgan</b><s>Keyingi bloklash: Asr · 16:34</s></span>
    <span class="tg on"><i></i></span>
  </div>
'''
  + '  <div class="lbl">Rejim</div>\n'
  + group([
      li("bell","Yumshoq","Faqat eslatma, bloklash yo'q"),
      li("lock","Fokus","Namoz vaqtida ilovalar yopiladi",cls="on"),
      li("apps","Chuqur fokus","Namozdan oldin va keyin ham",right="PREMIUM"),
    ])
  + '  <div class="lbl">Qaysi namozlarda</div>\n'
  + group([
      li(None,"Bomdod",right=TG(True)), li(None,"Peshin",right=TG(True)),
      li(None,"Asr",right=TG(True)), li(None,"Shom",right=TG(False)),
      li(None,"Xufton",right=TG(True)),
    ])
  + '  <div class="lbl">Ilovalar</div>\n'
  + group([li("apps","Bloklanadigan ilovalar","4 ta tanlangan",chev=True,href="app-picker.html")]),
  extra_css='''  .state{position:relative;margin:4px var(--gutter) 0;padding:16px 18px;border-radius:24px;
        background:linear-gradient(150deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:14px;flex:none}
  .state img{width:40px;height:40px}
  .state .l{flex:1;display:flex;flex-direction:column;gap:2px}
  .state .l b{font-size:16px;font-weight:800;color:#40290C}
  .state .l s{font-size:12.5px;font-weight:600;color:#8A5A11;text-decoration:none}''',
  tab=""))

# ---------------------------------------------------------------- app picker
def app_row(letter, name, sub, on):
    k = ('<span class="k on"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" '
         'stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
         if on else '<span class="k"></span>')
    return (f'    <div class="li"><span class="tile">{letter}</span>'
            f'<span class="l"><b>{name}</b><s>{sub}</s></span>{k}</div>')

W("app-picker.html", page("Ilovalar",
  bar("Ilovalar", back="focus-home.html", right='<span class="cnt">4</span>')
  + '''  <div class="search">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#A08B70" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>
    <input type="text" placeholder="Ilovani qidirish" aria-label="Ilovani qidirish">
  </div>
'''
  + '  <div class="lbl">Eng ko\'p vaqt oladiganlar</div>\n'
  + group([app_row("I","Instagram","Kuniga 2s 14d",True),
           app_row("T","TikTok","Kuniga 1s 48d",True),
           app_row("Y","YouTube","Kuniga 1s 06d",True),
           app_row("T","Telegram","Kuniga 52d",True)])
  + '  <div class="lbl">Boshqa ilovalar</div>\n'
  + group([app_row("W","WhatsApp","Kuniga 24d",False),
           app_row("U","Uzum Market","Kuniga 11d",False)])
  + '''  <div class="safe">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#4E6480" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/></svg>
    Telefon, SMS va xarita ilovalari hech qachon bloklanmaydi.
  </div>
''',
  extra_css='''  .cnt{padding:6px 13px;border-radius:999px;background:var(--surface);box-shadow:var(--lift);
       font-size:13px;font-weight:800;color:var(--ink)}
  .search{position:relative;margin:0 var(--gutter) 4px;padding:12px 15px;border-radius:17px;
          background:var(--surface);box-shadow:var(--lift);display:flex;align-items:center;gap:11px;flex:none}
  .search input{flex:1;border:0;background:none;outline:none;font-family:'Onest',sans-serif;
                font-size:14px;font-weight:500;color:var(--ink)}
  .tile{width:36px;height:36px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(148deg,#F0B45E,#B4548F);color:#fff;font-size:15px;font-weight:800}
  .k{width:24px;height:24px;border-radius:8px;flex:none;box-shadow:inset 0 0 0 2px rgba(80,50,15,.16)}
  .k.on{background:var(--accent);box-shadow:none;display:flex;align-items:center;justify-content:center}
  .safe{position:relative;margin:16px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#F0F2F5;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.5;font-weight:500;color:#55657A}
  .safe svg{flex:none;margin-top:1px}'''))

# ---------------------------------------------------------------- focus stats
bars = "".join(f'      <span class="b"><i style="height:{h}px"></i><s>{d}</s></span>\n'
               for h, d in [(52,"D"),(68,"S"),(38,"C"),(78,"P"),(88,"J"),(46,"Sh"),(26,"Y")])
W("focus-stats.html", page("Fokus natijalari",
  bar("Fokus natijalari", back="focus-home.html")
  + '''  <div class="big">
    <span class="k">Shu oy himoyalangan</span>
    <b>8s 20d</b>
    <span class="s">sentabrdan 2s 10d ko'proq</span>
  </div>
'''
  + f'''  <div class="chart">
    <span class="t">Kunlik fokus vaqti</span>
    <div class="bs">
{bars}    </div>
  </div>
'''
  + '  <div class="lbl">To\'xtatilgan urinishlar</div>\n'
  + group([
      li(None,"Instagram",value="47"), li(None,"TikTok",value="31"),
      li(None,"YouTube",value="18"), li(None,"Telegram",value="9"),
    ]),
  extra_css='''  .big{position:relative;margin:4px var(--gutter) 0;padding:22px;border-radius:26px;
       background:linear-gradient(155deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
       display:flex;flex-direction:column;gap:5px;flex:none}
  .big .k{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#90621C}
  .big b{font-size:46px;font-weight:900;line-height:1.05;letter-spacing:-1.6px;color:#40290C}
  .big .s{font-size:13px;font-weight:600;color:#8A5A11}
  .chart{position:relative;margin:14px var(--gutter) 0;padding:18px;border-radius:24px;
         background:var(--surface);box-shadow:var(--lift);flex:none}
  .chart .t{font-size:13px;font-weight:700;color:var(--ink)}
  .bs{margin-top:14px;display:flex;align-items:flex-end;gap:7px;height:106px}
  .b{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;justify-content:flex-end}
  .b i{width:100%;border-radius:8px;background:#E9B563;display:block}
  .b s{font-size:10px;font-weight:600;color:var(--ink-soft);text-decoration:none}'''))

# ---------------------------------------------------------------- alarm settings
W("alarm-settings.html", page("Bomdod uyg'otgichi",
  bar("Bomdod uyg'otgichi", back="home.html")
  + '''  <div class="state">
    <img src="assets/icons/alarm.png" alt="">
    <span class="l"><b>05:36</b><s>Ertaga · Bomdod vaqtida</s></span>
    <span class="tg on"><i></i></span>
  </div>
'''
  + '  <div class="lbl">Qanday o\'chiriladi</div>\n'
  + group([
      li("mosque","Joynamozni skanerlash","Karavotdan turishni talab qiladi",cls="on"),
      li("droplet","Rakovinani skanerlash","Hammomga borish kerak"),
      li("apps","Oddiy tugma","Tavsiya etilmaydi"),
    ])
  + '  <div class="lbl">Ovoz</div>\n'
  + group([
      li("bell","Ohang","Asta-sekin kuchayadi",right="Azon",chev=True),
      li(None,"Tebranish",right=TG(True)),
      li(None,"Takroriy signal","5 daqiqada bir",right=TG(True)),
    ])
  + '''  <div class="warn">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8A6222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 8v5M12 16.5h.01"/></svg>
    Signal aniq vaqtda ishlashi uchun batareya optimallashtirishini o'chiring.
  </div>
''',
  extra_css='''  .state{position:relative;margin:4px var(--gutter) 0;padding:16px 18px;border-radius:24px;
        background:linear-gradient(150deg,#FCEBC7,#F3C87E);box-shadow:var(--lift-hi);
        display:flex;align-items:center;gap:14px;flex:none}
  .state img{width:42px;height:42px}
  .state .l{flex:1;display:flex;flex-direction:column;gap:1px}
  .state .l b{font-size:26px;font-weight:900;color:#40290C;letter-spacing:-.8px;font-variant-numeric:tabular-nums}
  .state .l s{font-size:12.5px;font-weight:600;color:#8A5A11;text-decoration:none}
  .warn{position:relative;margin:16px var(--gutter) 0;padding:14px 16px;border-radius:19px;
        background:#FDF3E4;display:flex;gap:11px;align-items:flex-start;flex:none;
        font-size:12.5px;line-height:1.5;font-weight:600;color:#8A5A11}
  .warn svg{flex:none;margin-top:1px}'''))

print("focus + fajr screens done")
