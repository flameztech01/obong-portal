// src/pages/admin/AdminSettings.jsx
import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  UploadCloud, 
  ShieldAlert, 
  BrainCircuit, 
  BookOpen, 
  CalendarDays,
  Loader2
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   CUSTOM TOGGLE SWITCH
   ========================================= */
const ToggleSwitch = ({ isOn, onToggle, isUpdating }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={isUpdating}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-50 ${
      isOn ? 'bg-yellow-500' : 'bg-zinc-700'
    }`}
  >
    <span
      className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
        isOn ? 'translate-x-6' : 'translate-x-1'
      }`}
    >
      {/* Tiny spinner inside the toggle knob when saving */}
      {isUpdating && <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />}
    </span>
  </button>
);

/* =========================================
   SETTING ROW COMPONENT
   ========================================= */
const SettingRow = ({ icon: Icon, title, description, isOn, onToggle, isUpdating }) => (
  <div className="flex items-start justify-between gap-4 py-5 border-b border-zinc-800/60 last:border-0">
    <div className="flex items-start gap-4">
      <div className={`p-2 rounded-lg mt-0.5 shrink-0 transition-colors ${isOn ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-400'}`}>
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="mt-1">
      <ToggleSwitch isOn={isOn} onToggle={onToggle} isUpdating={isUpdating} />
    </div>
  </div>
);

/* =========================================
   MAIN COMPONENT
   ========================================= */
const AdminSettings = () => {
  const toast = useToast();
  
  const { data: settingsData, isLoading, isError } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  // Track which specific toggle is currently saving
  const [savingKey, setSavingKey] = useState(null);

  const settings = settingsData?.settings || {
    allowStudentResultUpload: false,
    onlyHodOrLecturerUploads: true,
    allowCourseRepMaterialUpload: true,
    allowStudentQuizGeneration: false,
    currentSemester: 'first',
  };

  const handleUpdate = async (key, value) => {
    setSavingKey(key);
    try {
      // Send partial update to backend
      await updateSettings({ [key]: value }).unwrap();
      toast.success("Setting updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update setting");
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl text-white font-medium mb-2">Connection Error</h2>
        <p className="text-zinc-400 text-sm">Could not load system settings. Please check your connection.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-yellow-500" strokeWidth={1.5} />
          System Settings
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Changes are saved to the database instantly.</p>
      </div>

      <div className="space-y-6">
        
        {/* =========================================
            SECTION 1: RESULT UPLOADS
            ========================================= */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Results & Grading</h2>
            <p className="text-sm text-zinc-500 mt-1">Control how and when students can see or upload their grades.</p>
          </div>

          <div className="space-y-1">
            <SettingRow 
              icon={UploadCloud}
              title="Allow Student Self-Uploads"
              description="If enabled, old students (200L+) and transfer students can manually upload their historical results. They will be prompted immediately after their first login."
              isOn={settings.allowStudentResultUpload}
              onToggle={() => handleUpdate('allowStudentResultUpload', !settings.allowStudentResultUpload)}
              isUpdating={savingKey === 'allowStudentResultUpload'}
            />
            
            <SettingRow 
              icon={ShieldAlert}
              title="Restrict Uploads to Lecturers & HODs"
              description="When enabled, only assigned lecturers and Heads of Department can upload results for their specific courses. Disabling this allows Admins to upload results as well."
              isOn={settings.onlyHodOrLecturerUploads}
              onToggle={() => handleUpdate('onlyHodOrLecturerUploads', !settings.onlyHodOrLecturerUploads)}
              isUpdating={savingKey === 'onlyHodOrLecturerUploads'}
            />
          </div>
        </div>

        {/* =========================================
            SECTION 2: STUDY & AI
            ========================================= */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Study Materials & AI</h2>
            <p className="text-sm text-zinc-500 mt-1">Manage course rep privileges and AI tool access.</p>
          </div>

          <div className="space-y-1">
            <SettingRow 
              icon={BookOpen}
              title="Allow Course Reps to Upload Materials"
              description="When enabled, appointed course reps can upload lecture notes, slides, and past questions to the study hub for their specific courses."
              isOn={settings.allowCourseRepMaterialUpload}
              onToggle={() => handleUpdate('allowCourseRepMaterialUpload', !settings.allowCourseRepMaterialUpload)}
              isUpdating={savingKey === 'allowCourseRepMaterialUpload'}
            />

            <SettingRow 
              icon={BrainCircuit}
              title="Allow AI Quiz Generation"
              description="When enabled, course reps can use the Groq AI to auto-generate draft quizzes from uploaded study materials. They must still review and publish the quizzes manually."
              isOn={settings.allowStudentQuizGeneration}
              onToggle={() => handleUpdate('allowStudentQuizGeneration', !settings.allowStudentQuizGeneration)}
              isUpdating={savingKey === 'allowStudentQuizGeneration'}
            />
          </div>
        </div>

        {/* =========================================
            SECTION 3: CURRENT TERM
            ========================================= */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Current Academic Term</h2>
            <p className="text-sm text-zinc-500 mt-1">Set the active semester for course registrations and result uploads.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
              <CalendarDays className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Active Semester</h4>
              <div className="flex gap-2">
                {['first', 'second'].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => handleUpdate('currentSemester', sem)}
                    disabled={savingKey === 'currentSemester'}
                    className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors border flex items-center gap-2 ${
                      settings.currentSemester === sem
                        ? 'bg-yellow-500 border-yellow-500 text-zinc-950'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {savingKey === 'currentSemester' && settings.currentSemester === sem && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {sem} Semester
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;