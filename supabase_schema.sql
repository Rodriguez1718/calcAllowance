-- 1. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    user_id TEXT PRIMARY KEY,
    start_date DATE DEFAULT CURRENT_DATE,
    target_hours NUMERIC DEFAULT 480,
    hourly_rate NUMERIC DEFAULT 60,
    setup_complete BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Time Entries Table
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Active Timers Table
CREATE TABLE IF NOT EXISTS public.active_timers (
    user_id TEXT PRIMARY KEY,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Note: In Supabase Dashboard, you might need to disable RLS for these tables 
-- if you are just starting and want to test quickly, or set up policies.
