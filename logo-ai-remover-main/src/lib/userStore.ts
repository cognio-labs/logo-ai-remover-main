import { create } from "zustand";

export type UserPlan = "free" | "creator" | "professional";
export type UserRole = "user" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  plan: UserPlan;
  role: UserRole;
  credits: number;
  last_credit_reset: string;
}

export interface JobItem {
  id: string;
  user_id: string;
  file_name: string;
  file_type: "image" | "video" | "upscale";
  file_url?: string;
  result_url?: string;
  status: "queued" | "processing" | "completed" | "failed";
  error_message?: string;
  quality: string;
  credits_used: number;
  processing_time?: string;
  created_at: string;
}

interface UserState {
  user: UserProfile;
  isLoggedIn: boolean;
  jobs: JobItem[];
  
  // Actions
  login: (email: string, name?: string, role?: UserRole) => void;
  logout: () => void;
  setPlan: (plan: UserPlan) => void;
  toggleRole: () => void;
  deductCredit: () => boolean;
  refundCredit: (amount?: number) => void;
  addCredits: (amount: number) => void;
  addJob: (job: Omit<JobItem, "id" | "user_id" | "created_at">) => JobItem;
  updateJob: (id: string, updates: Partial<JobItem>) => void;
  deleteJob: (id: string) => void;
  retryJob: (id: string) => void;
  checkDailyReset: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: "usr_mock_001",
  email: "sarah.creator@example.com",
  name: "Sarah Jenkins",
  avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  plan: "free",
  role: "admin", // set to admin by default so user can test both regular & admin features
  credits: 5,
  last_credit_reset: new Date().toISOString(),
};

const INITIAL_JOBS: JobItem[] = [
  {
    id: "job_01",
    user_id: "usr_mock_001",
    file_name: "cyberpunk_portrait_midjourney.png",
    file_type: "image",
    status: "completed",
    quality: "4K UHD",
    credits_used: 1,
    processing_time: "4.2s",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    file_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    result_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=95",
  },
  {
    id: "job_02",
    user_id: "usr_mock_001",
    file_name: "fashion_reel_watermark_clean.mp4",
    file_type: "video",
    status: "completed",
    quality: "1080p 60fps",
    credits_used: 1,
    processing_time: "14.8s",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    file_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80",
    result_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=95",
  },
  {
    id: "job_03",
    user_id: "usr_mock_001",
    file_name: "luxury_packaging_render_8x.png",
    file_type: "upscale",
    status: "completed",
    quality: "8x SuperRes",
    credits_used: 1,
    processing_time: "6.1s",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    file_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80",
    result_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=95",
  },
  {
    id: "job_04",
    user_id: "usr_mock_001",
    file_name: "corrupted_hdr_source.mov",
    file_type: "video",
    status: "failed",
    error_message: "Bitrate stream desync in frame 142. Codec: HEVC 10-bit",
    quality: "4K UHD",
    credits_used: 0,
    processing_time: "2.3s",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

const LOCAL_STORAGE_KEY = "bellix_user_store_v2";

const loadState = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveState = (user: UserProfile, isLoggedIn: boolean, jobs: JobItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ user, isLoggedIn, jobs })
    );
  } catch {}
};

const saved = loadState();

export const useUserStore = create<UserState>((set, get) => ({
  user: saved?.user || DEFAULT_USER,
  isLoggedIn: saved?.isLoggedIn ?? true,
  jobs: saved?.jobs || INITIAL_JOBS,

  login: (email, name, role) => {
    const newUser: UserProfile = {
      ...get().user,
      email,
      name: name || email.split("@")[0],
      role: role || "user",
    };
    set({ user: newUser, isLoggedIn: true });
    saveState(newUser, true, get().jobs);
  },

  logout: () => {
    set({ isLoggedIn: false });
    saveState(get().user, false, get().jobs);
  },

  setPlan: (plan) => {
    const creditAllowance = plan === "professional" ? 1000 : plan === "creator" ? 200 : 5;
    const updated = {
      ...get().user,
      plan,
      credits: Math.max(get().user.credits, creditAllowance),
    };
    set({ user: updated });
    saveState(updated, get().isLoggedIn, get().jobs);
  },

  toggleRole: () => {
    const newRole = get().user.role === "admin" ? "user" : "admin";
    const updated = { ...get().user, role: newRole as UserRole };
    set({ user: updated });
    saveState(updated, get().isLoggedIn, get().jobs);
  },

  deductCredit: () => {
    const current = get().user.credits;
    if (current <= 0) return false;
    const updated = { ...get().user, credits: current - 1 };
    set({ user: updated });
    saveState(updated, get().isLoggedIn, get().jobs);
    return true;
  },

  refundCredit: (amount = 1) => {
    const updated = { ...get().user, credits: get().user.credits + amount };
    set({ user: updated });
    saveState(updated, get().isLoggedIn, get().jobs);
  },

  addCredits: (amount) => {
    const updated = { ...get().user, credits: get().user.credits + amount };
    set({ user: updated });
    saveState(updated, get().isLoggedIn, get().jobs);
  },

  addJob: (jobData) => {
    const newJob: JobItem = {
      ...jobData,
      id: `job_${Date.now()}`,
      user_id: get().user.id,
      created_at: new Date().toISOString(),
    };
    const updatedJobs = [newJob, ...get().jobs];
    set({ jobs: updatedJobs });
    saveState(get().user, get().isLoggedIn, updatedJobs);
    return newJob;
  },

  updateJob: (id, updates) => {
    const updatedJobs = get().jobs.map((j) => (j.id === id ? { ...j, ...updates } : j));
    set({ jobs: updatedJobs });
    saveState(get().user, get().isLoggedIn, updatedJobs);
  },

  deleteJob: (id) => {
    const updatedJobs = get().jobs.filter((j) => j.id !== id);
    set({ jobs: updatedJobs });
    saveState(get().user, get().isLoggedIn, updatedJobs);
  },

  retryJob: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;
    get().updateJob(id, {
      status: "processing",
      error_message: undefined,
      processing_time: "Retrying...",
    });
    // Simulate recovery
    setTimeout(() => {
      get().updateJob(id, {
        status: "completed",
        processing_time: "5.4s (recovered)",
        result_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&auto=format&fit=crop&q=95",
      });
    }, 2800);
  },

  checkDailyReset: () => {
    const { user } = get();
    if (user.plan !== "free") return;
    const lastReset = new Date(user.last_credit_reset).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - lastReset > oneDay) {
      const updated = {
        ...user,
        credits: 5,
        last_credit_reset: new Date().toISOString(),
      };
      set({ user: updated });
      saveState(updated, get().isLoggedIn, get().jobs);
    }
  },
}));
