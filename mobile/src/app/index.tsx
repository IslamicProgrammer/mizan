import { Redirect } from 'expo-router';
import React from 'react';

import { useStore } from '../data/store';

/**
 * The entry decision, in one obvious place.
 *
 * This used to be a `<Redirect>` returned from the tabs layout, which is harder
 * to reason about and harder to verify: the layout has to both guard and render
 * a navigator. Here `/` does nothing except choose, and `/home` is a real route.
 */
export default function Index() {
  const { onboarded } = useStore();
  return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
}
