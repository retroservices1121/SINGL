'use client';

import { useEffect, useState } from 'react';
import { ProfileModal } from '@agg-build/ui';
import { useAggAuth, useAggAuthContext, useAggClient } from '@agg-build/hooks';

// Fired from anywhere in the app (UserProfilePage's onEditProfile,
// ConnectButton's onProfileClick, a future Settings link, etc.) to
// pop the AGG profile-edit modal. Keep this name stable — multiple
// call sites depend on it.
export const EDIT_PROFILE_OPEN_EVENT = 'singl:edit-profile-open';

export function requestEditProfileOpen() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EDIT_PROFILE_OPEN_EVENT));
}

// Mount once at the app root (inside AggProvider). Listens for the
// event above and renders AGG's <ProfileModal> with onSave wired to
// updateUser + the presigned avatar upload flow.
export default function EditProfileModalHost() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAggAuth();
  // Auth context exposes signIn/setSession etc. After updateUser
  // mutates server-side, we need to refresh the cached profile so
  // every place that reads useAggAuth() (nav, profile page, edit
  // modal itself) renders the new username + avatar without a hard
  // reload.
  const authCtx = useAggAuthContext() as unknown as Record<string, unknown>;
  const client = useAggClient();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(EDIT_PROFILE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(EDIT_PROFILE_OPEN_EVENT, onOpen);
  }, []);

  // Best-effort field shapes off the SDK user — fields may be
  // null/undefined on first login.
  const userAny = user as Record<string, unknown> | null;
  const username = (userAny?.username as string | undefined) ?? null;
  const avatarPreview = (userAny?.avatarUrl as string | undefined) ?? null;
  const email = (userAny?.email as string | undefined) ?? null;

  // ProfileModal already calls client.updateUser + the presigned
  // avatar upload internally — it owns validation and its own error
  // UI ("username must be ≥ 3 chars" etc.). Our onSave fires *after*
  // a successful save, so all we need to do here is refresh the auth
  // context so the nav / profile page / modal pick up the new values
  // without a hard reload. Previously we duplicated the API call,
  // which raced the modal and clobbered its error rendering.
  const onSave = async (_data: { username?: string; avatarFile?: File; avatarPreview?: string }) => {
    if (saving) return;
    setSaving(true);
    try {
      const fresh = await client.getCurrentUser();
      const setSession = authCtx?.setSession as
        | ((session: { accessToken: string; user?: typeof fresh }) => Promise<unknown>)
        | undefined;
      const accessToken = (client as unknown as { accessToken?: string }).accessToken;
      if (setSession && accessToken) {
        await setSession({ accessToken, user: fresh });
      }
    } catch (err) {
      console.warn('[profile] post-save refresh failed', err);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  // Hard "delete profile" path — defer until AGG ships a real
  // delete-self endpoint; for now sign out and close.
  const onDeleteProfile = async () => {
    try { await client.signOut?.(); } catch {}
    setOpen(false);
  };

  return (
    <ProfileModal
      open={open}
      onOpenChange={setOpen}
      username={username}
      avatarPreview={avatarPreview}
      email={email}
      onSave={onSave}
      onDeleteProfile={onDeleteProfile}
    />
  );
}
