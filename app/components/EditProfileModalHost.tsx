'use client';

import { useEffect, useState } from 'react';
import { ProfileModal } from '@agg-build/ui';
import { useAggAuth, useAggClient } from '@agg-build/hooks';

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
