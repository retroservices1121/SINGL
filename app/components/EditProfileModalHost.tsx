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

  const onSave = async (data: { username?: string; avatarFile?: File; avatarPreview?: string }) => {
    if (saving) return;
    setSaving(true);
    try {
      // Upload avatar first (if changed) so the confirmAvatar flag has
      // a freshly-staged asset to point at.
      if (data.avatarFile) {
        const { uploadUrl } = await client.createAvatarUploadUrl(data.avatarFile.type);
        const put = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': data.avatarFile.type },
          body: data.avatarFile,
        });
        if (!put.ok) throw new Error(`Avatar upload failed: ${put.status}`);
      }

      const payload: { username?: string; confirmAvatar?: true } = {};
      if (data.username && data.username !== username) payload.username = data.username;
      if (data.avatarFile) payload.confirmAvatar = true;
      if (Object.keys(payload).length > 0) {
        await client.updateUser(payload);
        // updateUser sets client.currentUser internally and calls
        // notifyListeners, but the React auth context cache can lag
        // by a render cycle. Pull the freshly-server-stored profile
        // and feed it back through setSession so every useAggAuth()
        // consumer (nav, profile page, this modal) re-renders with
        // the new values without a manual reload.
        const fresh = await client.getCurrentUser();
        // The SDK exposes setSession on the client; safe to call with
        // existing tokens since access/refresh are internal — passing
        // user only is enough to broadcast a session update.
        const setSession = (authCtx?.setSession as
          | ((session: { accessToken: string; user?: typeof fresh }) => Promise<unknown>)
          | undefined);
        const accessToken = (client as unknown as { accessToken?: string }).accessToken;
        if (setSession && accessToken) {
          await setSession({ accessToken, user: fresh });
        }
      }
      setOpen(false);
    } catch (err) {
      console.error('[profile] save failed', err);
      // Leave the modal open so the user can retry.
    } finally {
      setSaving(false);
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
