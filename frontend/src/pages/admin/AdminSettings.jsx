// src/pages/admin/AdminSettings.jsx
import React, { useState } from 'react';
import { 
  UploadCloud, 
  ShieldAlert, 
  BrainCircuit, 
  BookOpen, 
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../features/adminApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// CUSTOM TOGGLE SWITCH
// =========================================
const ToggleSwitch = ({ isOn, onToggle, isUpdating }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={isUpdating}
    aria-pressed={isOn}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
      isOn ? 'bg-yellow-500' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${
        isOn ? 'translate-x-[18px]' : 'translate-x-[3px]'
      }`}
    >
      {isUpdating && (
        <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-400" strokeWidth={2.5} />
      )}
    </span>
  </button>
);

// =========================================
// SETTING ROW
// =========================================
const SettingRow = ({ icon: Icon, title, description, isOn, onToggle, isUpdating, isLast }) => (
  <div className={`flex items-start justify-between gap-3 px-3 py-3 ${isLast ? '' : 'border-b border-zinc-800/60'}`}>
    <div className="flex min-w-0 items-start gap-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors ${
        isOn ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-400'
      }`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <h4 className="text-[12.5px] font-medium text-white">{title}</h4>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </div>
    <div className="mt-1 shrink-0">
      <ToggleSwitch isOn={isOn} onToggle={onToggle} isUpdating={isUpdating} />
    </div>
  </div>
);

// =========================================
// MAIN COMPONENT
// =========================================
const AdminSettings = () => {
  const toast = useToast();

  const { data: settingsData, isLoading, isError } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const [savingKey, setSavingKey] = useState(null);

  const settings = settingsData?.settings || {
    allowStudentResultUpload: false,
    onlyHodOrLecturerUploads: true,
    allowCourseRepMaterialUpload: true,
    allowStudentQuizGeneration: false,
    currentSemester: 'first',
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleUpdate = async (key, value) => {
    setSavingKey(key);
    try {
      await updateSettings({ [key]: value }).unwrap();
      toast.success('Setting updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  // =========================================
  // LOADING
  // =========================================
  if (isLoading) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================
  if (isError) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <div className="mx-auto max-w-5xl space-y-4">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {today}
            </p>
            <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
              System{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                Settings
              </span>
            </h1>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-red-500" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">Connection error</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Could not load system settings. Please check your connection and refresh.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // MAIN
  // =========================================
  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {today}
          </p>
          <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
            System{' '}
            <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
              Settings
            </span>
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Changes are saved to the database instantly.
          </p>
        </div>

        {/* SECTION 1: RESULTS & GRADING */}
        <div>
          <h2 className="mb-2 px-1 text-[14.5px] font-serif tracking-tight text-white md:px-0">
            Results & Grading
          </h2>
          <p className="mb-2.5 px-1 text-[10.5px] text-zinc-500 md:px-0">
            Control how and when students can see or upload their grades.
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <SettingRow
              icon={UploadCloud}
              title="Allow Student Self-Uploads"
              description="If enabled, old students (200L+) and transfer students can manually upload their historical results. They'll be prompted immediately after their first login."
              isOn={settings.allowStudentResultUpload}
              onToggle={() => handleUpdate('allowStudentResultUpload', !settings.allowStudentResultUpload)}
              isUpdating={savingKey === 'allowStudentResultUpload'}
            />
            <SettingRow
              icon={ShieldAlert}
              title="Restrict Uploads to Lecturers & HODs"
              description="When enabled, only assigned lecturers and Heads of Department can upload results for their courses. Disabling lets Admins upload too."
              isOn={settings.onlyHodOrLecturerUploads}
              onToggle={() => handleUpdate('onlyHodOrLecturerUploads', !settings.onlyHodOrLecturerUploads)}
              isUpdating={savingKey === 'onlyHodOrLecturerUploads'}
              isLast
            />
          </div>
        </div>

        {/* SECTION 2: STUDY & AI */}
        <div>
          <h2 className="mb-2 px-1 text-[14.5px] font-serif tracking-tight text-white md:px-0">
            Study Materials & AI
          </h2>
          <p className="mb-2.5 px-1 text-[10.5px] text-zinc-500 md:px-0">
            Manage course rep privileges and AI tool access.
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <SettingRow
              icon={BookOpen}
              title="Allow Course Reps to Upload Materials"
              description="When enabled, appointed course reps can upload lecture notes, slides, and past questions to the study hub for their courses."
              isOn={settings.allowCourseRepMaterialUpload}
              onToggle={() => handleUpdate('allowCourseRepMaterialUpload', !settings.allowCourseRepMaterialUpload)}
              isUpdating={savingKey === 'allowCourseRepMaterialUpload'}
            />
            <SettingRow
              icon={BrainCircuit}
              title="Allow AI Quiz Generation"
              description="When enabled, course reps can use Groq AI to auto-generate draft quizzes from uploaded materials. They still review and publish manually."
              isOn={settings.allowStudentQuizGeneration}
              onToggle={() => handleUpdate('allowStudentQuizGeneration', !settings.allowStudentQuizGeneration)}
              isUpdating={savingKey === 'allowStudentQuizGeneration'}
              isLast
            />
          </div>
        </div>

        {/* SECTION 3: CURRENT TERM */}
        <div>
          <h2 className="mb-2 px-1 text-[14.5px] font-serif tracking-tight text-white md:px-0">
            Current Academic Term
          </h2>
          <p className="mb-2.5 px-1 text-[10.5px] text-zinc-500 md:px-0">
            Set the active semester for course registrations and result uploads.
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-yellow-500/10 text-yellow-500">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[12.5px] font-medium text-white">Active Semester</h4>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">
                  Currently set to <span className="font-semibold text-yellow-500 capitalize">{settings.currentSemester}</span> Semester
                </p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {[
                { value: 'first', label: 'First' },
                { value: 'second', label: 'Second' },
              ].map(({ value, label }) => {
                const isActive = settings.currentSemester === value;
                const isSaving = savingKey === 'currentSemester' && isActive;
                return (
                  <button
                    key={value}
                    onClick={() => handleUpdate('currentSemester', value)}
                    disabled={savingKey === 'currentSemester'}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-[10.5px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed ${
                      isActive
                        ? 'border-yellow-500 bg-yellow-500 text-zinc-950'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50'
                    }`}
                  >
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />}
                    {label} Semester
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;