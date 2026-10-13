import { Redirect } from 'expo-router';
import React from 'react';

import { useSession } from '../data/auth';
import { useStore } from '../data/store';

/**
 * The entry decision, in one obvious place.
 *
 * This used to be a `<Redirect>` returned from the tabs layout, which is harder
 * to reason about and harder to verify: the layout has to both guard and render
 * a navigator. Here `/` does nothing except choose, and `/home` is a real route.
 *
 * Three-way, not two: onboarding first, then the account, then the app —
 * explaining the product before asking for one is the whole reason
 * onboarding exists. `loading` renders nothing rather than a flash of
 * `/sign-in` while `useSession` is still reading SecureStore; there is no
 * session to show signed out from until that read resolves.
 */
export default function Index() {
  const { onboarded } = useStore();
  const { session, loading } = useSession();

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (loading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href="/home" />;
}
