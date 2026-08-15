import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GlassSelect } from '../common/GlassSelect';
import { User, Check, Save, Mail, Camera } from 'lucide-react';
import { AccountCategory, UserProfile } from '../../types';
import { uploadUserMedia } from '../../config/firebase';

const CATEGORIES: { id: AccountCategory; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'creator', label: 'Creator' },
  { id: 'business', label: 'Business' },
  { id: 'church', label: 'Church' },
  { id: 'organization', label: 'Organization' },
  { id: 'school', label: 'School' },
  { id: 'agency', label: 'Agency' },
];

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

export const ProfileSettingsView: React.FC = () => {
  const { user, setUser, authenticatedFetch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name || '');
  const [organizationName, setOrganizationName] = useState(user.organizationName || '');
  const [category, setCategory] = useState<AccountCategory>(user.category || 'business');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [email, setEmail] = useState(user.email || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authenticatedFetch('/api/auth/me');
        const json = await res.json();
        const profile = json?.data?.user;
        if (!profile) return;
        if (profile.name) setName(profile.name);
        if (profile.email) setEmail(profile.email);
        if (profile.organizationName !== undefined) setOrganizationName(profile.organizationName || '');
        if (profile.category) setCategory(profile.category);
        if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
      } catch (err) {
        console.warn('Failed to load profile:', err);
      }
    };
    load();
  }, [authenticatedFetch]);

  const persistLocalUser = (profile: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...profile };
      localStorage.setItem('brosai_user_data', JSON.stringify(updated));
      return updated;
    });
  };

  const saveProfile = async (nextAvatar?: string) => {
    const res = await authenticatedFetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        organizationName: organizationName.trim(),
        category,
        ...(nextAvatar ? { avatarUrl: nextAvatar } : {})
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save profile');
    }
    persistLocalUser({
      name: json.data.name,
      organizationName: json.data.organizationName,
      category: json.data.category,
      avatarUrl: json.data.avatarUrl,
      email: json.data.email || email
    });
    if (json.data.avatarUrl) setAvatarUrl(json.data.avatarUrl);
    return json.data;
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ownerId = user.id || email || 'anonymous';
      const downloadUrl = await uploadUserMedia(ownerId, file, 'avatar');
      setAvatarUrl(downloadUrl);
      await saveProfile(downloadUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Could not upload photo. Check Firebase Storage rules and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      await saveProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const photo = avatarUrl || user.avatarUrl || FALLBACK_AVATAR;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Account</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">
          Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-white/70 mt-0.5 sm:mt-1">
          Change your name, workspace, and photo. Photos are stored in Firebase.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/25 shrink-0 group"
            title="Change photo"
          >
            <img src={photo} alt={name || 'Profile'} className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <Camera className="w-5 h-5" />
              <span className="text-[10px] mt-1">{uploading ? 'Uploading…' : 'Change'}</span>
            </span>
          </button>
          <div className="text-center sm:text-left">
            <div className="text-sm font-semibold text-white">{name || 'Your photo'}</div>
            <p className="text-xs text-white/60 mt-1 max-w-sm">
              Click the photo to upload a new one. JPG, PNG, or WebP, up to 5MB.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white hover:bg-white/15"
            >
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white transition-all"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </span>
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-sm text-white/60 cursor-not-allowed"
            />
            <p className="text-[10px] text-white/45 mt-1.5">Email comes from your sign-in provider.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Organization / workspace</label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white transition-all"
              placeholder="e.g. Northstar Studio"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Account type</label>
            <GlassSelect
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
              value={category}
              onChange={(val) => setCategory(val as AccountCategory)}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-300">{error}</p>
        )}

        <div className="pt-1 flex items-center justify-between">
          {saved && (
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <Check className="w-4 h-4 text-white" />
              <span>Profile saved</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving || uploading}
            className="ml-auto px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center gap-2 transition-all shadow-xl disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{saving ? 'Saving...' : 'Save profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
