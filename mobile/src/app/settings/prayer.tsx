import { router } from 'expo-router';
import React from 'react';


import { Bar, Label, List, Note, Row, Screen } from '../../components/ui';
import { FIVE, PRAYER_NAMES, hhmm, timesFor } from '../../data/prayer';
import { useStore } from '../../data/store';

const METHODS = ["O'zbekiston muftiyati", 'Muslim World League', 'Umm al-Qura'];

export default function PrayerSettings() {
  const { settings, patchSettings } = useStore();
  const times = timesFor(new Date(), settings.madhhab);

  return (
    <Screen glow="soft" pad={false}>
      <Bar title="Hisob usuli" onBack={() => router.back()} />

      <Label>Mazhab · Asr vaqti</Label>
      <List>
        <Row
          icon="shadow_long"
          title="Hanafiy"
          sub={`Kech Asr · ${hhmm(times.find((t) => t.id === 'asr')!.at)}`}
          on={settings.madhhab === 'hanafi'}
          onPress={() => patchSettings({ madhhab: 'hanafi' })}
        />
        <Row
          icon="shadow_short"
          title="Shofiiy"
          sub="Erta Asr"
          on={settings.madhhab === 'shafii'}
          onPress={() => patchSettings({ madhhab: 'shafii' })}
        />
      </List>

      <Label>Hisoblash standarti</Label>
      <List>
        {METHODS.map((m, i) => (
          <Row key={m} icon={i === 0 ? 'abacus' : undefined} title={m} on={i === 0} />
        ))}
      </List>

      <Label>Qo'lda sozlash</Label>
      <List>
        {FIVE.map((p) => (
          <Row key={p} icon={p} title={PRAYER_NAMES[p]} value="0 daq" chevron />
        ))}
      </List>

      <Note icon="clock">
        Devoriy taqvimingiz bilan solishtiring — farq bo'lsa har bir vaqtni alohida siljiting.
      </Note>
    </Screen>
  );
}
