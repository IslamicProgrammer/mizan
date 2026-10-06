#!/usr/bin/env python3
"""Swap the borrowed Fluent Emoji set for the generated Mizan icon set.

Two problems are fixed at once, and they are separate:

  * colour  — Fluent Emoji are full-spectrum (hot pink hearts, blue droplets,
    green sprouts) and shout against a cream/gold/brown page.
  * meaning — several icons were simply wrong. A mosque stood for "man" and a
    star-and-crescent for "woman"; Hanafi and Shafi'i shared one book icon, so
    it carried no information; a mosque stood for a prayer mat.

OVERRIDES holds the per-screen corrections and is applied first, in order, so
repeated icons on one screen (07-madhhab's two books) can differ. GLOBAL then
handles the unambiguous rest.
"""
import pathlib
import re

SCREENS = pathlib.Path("design-v3")
GENERATORS = ["gen_app.py", "gen_onboarding.py", "gen_prayer.py",
              "gen_focus.py", "gen_misc.py", "gen_last.py"]

# old Fluent name -> new name, where the meaning was already right
GLOBAL = {
    "alarm_clock": "alarm", "bell": "bell", "compass": "compass",
    "camera": "camera", "locked": "lock", "red_heart": "heart",
    "wrapped_gift": "gift", "droplet": "droplet", "open_book": "book",
    "bar_chart": "chart", "spiral_calendar": "calendar",
    "check_mark_button": "check", "prayer_beads": "tasbih", "kaaba": "kaaba",
    "potted_plant": "plant", "seedling": "sprout", "mosque": "mosque",
    "sparkles": "sparkle", "glowing_star": "sparkle", "star": "sparkle",
    "fire": "flame", "gear": "gear", "house": "mosque",
    "mobile_phone": "apps", "cloud": "ring_some",
    # the daily cycle
    "sun_behind_small_cloud": "fajr", "sun": "dhuhr",
    "sun_behind_large_cloud": "asr", "sun_behind_cloud": "asr",
    "crescent_moon": "maghrib", "waxing_crescent_moon": "maghrib",
    "star_and_crescent": "isha",
}

# per screen: (old, new) applied once each, in order of appearance
OVERRIDES = {
    "03-gender": [("mosque", "person_man"),          # was: a mosque meant "man"
                  ("star_and_crescent", "person_woman"),
                  ("red_heart", "cycle")],           # note is about menstruation
    # these five are a frequency scale, so they now read as one
    "04-practice": [("star_and_crescent", "ring_full"),
                    ("sun_behind_small_cloud", "ring_most"),
                    ("cloud", "ring_some"),
                    ("seedling", "sprout"),
                    ("droplet", "dash")],
    "06-goal": [("star_and_crescent", "ring_full"), ("locked", "shield")],
    # Hanafi and Shafi'i differ on when Asr starts, by shadow length. The two
    # icons now encode exactly that instead of being the same book twice.
    "07-madhhab": [("open_book", "shadow_long"), ("open_book", "shadow_short"),
                   ("spiral_calendar", "clock")],
    "09-timeconfirm": [("sun", "sunrise")],          # this row is sunrise, not noon
    "10-fajrintro": [("locked", "shield")],
    "11-scanobject": [("mosque", "mat"), ("droplet", "tap"),
                      ("sparkles", "mat_tap")],
    "alarm-settings": [("mosque", "mat")],
    "cycle-mode": [("crescent_moon", "cycle")],
    "focus-home": [("locked", "shield"), ("bell", "feather"),
                   ("mobile_phone", "focus_deep"), ("mobile_phone", "apps")],
    "settings": [("spiral_calendar", "abacus"), ("compass", "pin"),
                 ("red_heart", "cycle"), ("locked", "shield")],
    "prayer-settings": [("open_book", "shadow_long"),
                        ("spiral_calendar", "abacus")],
    "08-location": [("compass", "pin")],
    "profile": [("red_heart", "sparkle")],
    "garden": [("glowing_star", "sparkle")],
}


def swap(text, overrides, pat, build):
    """Apply ordered overrides first, then the global map, over `pat` matches."""
    pending = list(overrides)
    out, last = [], 0
    for m in re.finditer(pat, text):
        old = m.group(1)
        new = None
        for i, (o, n) in enumerate(pending):
            if o == old:
                new = n
                pending.pop(i)
                break
        if new is None:
            new = GLOBAL.get(old)
        if new is None:
            print(f"    ?? no mapping for {old}")
            continue
        out.append(text[last:m.start()] + build(new))
        last = m.end()
    out.append(text[last:])
    return "".join(out)


def main():
    n = 0
    for f in sorted(SCREENS.glob("*.html")):
        s = f.read_text()
        if "_3d.png" not in s:
            continue
        s2 = swap(s, OVERRIDES.get(f.stem, []),
                  r'assets/icons/([a-z_]+)_3d\.png',
                  lambda new: f"assets/icons/{new}.png")
        if s2 != s:
            f.write_text(s2); n += 1
    print(f"updated {n} screens")

    # keep the generators in step, or the next regen puts the old icons back
    for g in GENERATORS:
        p = pathlib.Path("tools") / g
        if not p.exists():
            continue
        s = p.read_text()
        s = s.replace('IC = "assets/icons/%s_3d.png"', 'IC = "assets/icons/%s.png"')
        s = s.replace('ICON = "assets/icons/%s_3d.png"', 'ICON = "assets/icons/%s.png"')
        s = re.sub(r'assets/icons/([a-z_]+)_3d\.png',
                   lambda m: f"assets/icons/{GLOBAL.get(m.group(1), m.group(1))}.png", s)
        # icon names passed as the first argument of li(...) / opts entries
        s = re.sub(r'(li\(\s*)"([a-z_]+)"',
                   lambda m: m.group(1) + '"' + GLOBAL.get(m.group(2), m.group(2)) + '"', s)
        s = re.sub(r'(\(\s*)"([a-z_]+)"(\s*,\s*")',
                   lambda m: m.group(1) + '"' + GLOBAL.get(m.group(2), m.group(2)) + '"' + m.group(3), s)
        p.write_text(s)
    print("generators updated")


if __name__ == "__main__":
    main()
