import { createClient } from '@supabase/supabase-js';
import { Patient, Message, HospitalComplaint, CustomChecklist } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fsuycchgujsdvdxjvumg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0JxiPIZBv0xez-CfXdyeEQ_itfooktX';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface SupabaseSyncSnapshot {
  id?: string;
  updated_at?: string;
  patients?: Patient[];
  messages?: Message[];
  complaints?: HospitalComplaint[];
  checklists?: CustomChecklist[];
}

/**
 * Tests connection to the Supabase Cloud project.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startTime = Date.now();
  try {
    // Attempt a lightweight query against the Supabase REST API
    const { error } = await supabase.from('hospital_cloud_sync').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (error && error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('table')) {
        return {
          success: true,
          message: 'اتصال به سرور ابری Supabase برقرار است (آماده ایجاد جدول hospital_cloud_sync)',
          latencyMs
        };
      }
      if (error.code === '42501' || error.message?.toLowerCase().includes('policy') || error.message?.toLowerCase().includes('permission')) {
        return {
          success: true,
          message: 'اتصال به Supabase برقرار است (نیاز به اجرای کد SQL جهت فعال‌سازی Policyهای RLS)',
          latencyMs
        };
      }
    }

    return {
      success: true,
      message: 'اتصال فعال و پایدار به پایگاه داده ابری Supabase 🟢',
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'خطا در برقراری ارتباط با Supabase: ' + (err?.message || 'خطای شبکه')
    };
  }
}

/**
 * Saves a snapshot of hospital data to Supabase Cloud ('hospital_cloud_sync' table).
 */
export async function syncHospitalDataToSupabase(
  patients: Patient[],
  messages: Message[],
  complaints: HospitalComplaint[],
  checklists: CustomChecklist[]
): Promise<{ success: boolean; message: string }> {
  try {
    const payload = {
      id: 'main_hospital_snapshot',
      updated_at: new Date().toISOString(),
      patients_json: JSON.stringify(patients),
      messages_json: JSON.stringify(messages),
      complaints_json: JSON.stringify(complaints),
      checklists_json: JSON.stringify(checklists)
    };

    const { error } = await supabase
      .from('hospital_cloud_sync')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('table')) {
        return {
          success: false,
          message: 'جدول hospital_cloud_sync در Supabase ایجاد نشده است. لطفاً اسکریپت SQL پیشنهادی را در پنل Supabase اجرا کنید.'
        };
      }
      if (error.code === '42501' || error.message?.toLowerCase().includes('policy') || error.message?.toLowerCase().includes('permission')) {
        return {
          success: false,
          message: 'خطای سطح دسترسی (RLS): لطفاً اسکریپت SQL شامل Policyهای دسترسی را در Supabase اجرا کنید.'
        };
      }
      console.warn('Supabase sync warning:', error.message);
      return {
        success: false,
        message: 'خطا در ذخیره‌سازی ابری: ' + (error.message || 'خطای ناشناخته')
      };
    }

    return {
      success: true,
      message: 'تمامی داده‌های بیماران، پیام‌ها و چک‌لیست‌ها با موفقیت در فضای ابری Supabase همگام‌سازی شد.'
    };
  } catch (err: any) {
    console.warn('Supabase sync exception:', err?.message || err);
    return {
      success: false,
      message: 'خطا در ذخیره‌سازی ابری: ' + (err?.message || 'خطای ناشناخته')
    };
  }
}

/**
 * Loads the latest hospital snapshot from Supabase Cloud.
 */
export async function fetchHospitalDataFromSupabase(): Promise<{
  success: boolean;
  data?: {
    patients?: Patient[];
    messages?: Message[];
    complaints?: HospitalComplaint[];
    checklists?: CustomChecklist[];
  };
  message: string;
}> {
  try {
    const { data, error } = await supabase
      .from('hospital_cloud_sync')
      .select('*')
      .eq('id', 'main_hospital_snapshot')
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, message: 'هنوز هیچ نسخه ابری در Supabase ذخیره نشده است.' };
      }
      if (error.code === '42P01' || error.message?.toLowerCase().includes('relation')) {
        return { success: false, message: 'جدول ابری hospital_cloud_sync در Supabase هنوز ایجاد نشده است.' };
      }
      if (error.code === '42501' || error.message?.toLowerCase().includes('policy') || error.message?.toLowerCase().includes('permission')) {
        return {
          success: false,
          message: 'دسترسی RLS در Supabase محدود است. لطفاً کدهای Policy را در بخش SQL Editor پروژه Supabase اجرا کنید.'
        };
      }
      console.warn('Supabase fetch warning:', error.message);
      return {
        success: false,
        message: 'خطا در دریافت اطلاعات: ' + (error.message || 'خطای شبکه')
      };
    }

    if (!data) {
      return { success: false, message: 'داده‌ای در سرور ابری یافت نشد.' };
    }

    return {
      success: true,
      data: {
        patients: data.patients_json ? JSON.parse(data.patients_json) : undefined,
        messages: data.messages_json ? JSON.parse(data.messages_json) : undefined,
        complaints: data.complaints_json ? JSON.parse(data.complaints_json) : undefined,
        checklists: data.checklists_json ? JSON.parse(data.checklists_json) : undefined
      },
      message: `اطلاعات با موفقیت از سرور ابری Supabase بارگذاری شد (آخرین بروزرسانی: ${data.updated_at ? new Date(data.updated_at).toLocaleTimeString('fa-IR') : 'نامشخص'})`
    };
  } catch (err: any) {
    console.warn('Supabase fetch exception:', err?.message || err);
    return {
      success: false,
      message: 'خطا در دریافت اطلاعات از Supabase: ' + (err?.message || 'خطای شبکه')
    };
  }
}

/**
 * Returns SQL code to create the required table in Supabase SQL Editor.
 */
export function getSupabaseSetupSQL(): string {
  return `-- ================================================================
-- ۱. ایجاد جدول اصلی همگام‌سازی ابری اطلاعات بیمارستان
-- ================================================================
CREATE TABLE IF NOT EXISTS hospital_cloud_sync (
  id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  patients_json TEXT,
  messages_json TEXT,
  complaints_json TEXT,
  checklists_json TEXT
);

-- ۲. فعال‌سازی دسترسی امنیتی سطح سطر (RLS)
ALTER TABLE hospital_cloud_sync ENABLE ROW LEVEL SECURITY;

-- ۳. حذف Policyهای قدیمی در صورت وجود
DROP POLICY IF EXISTS "Enable read access for all users" ON hospital_cloud_sync;
DROP POLICY IF EXISTS "Enable insert access for all users" ON hospital_cloud_sync;
DROP POLICY IF EXISTS "Enable update access for all users" ON hospital_cloud_sync;
DROP POLICY IF EXISTS "Enable delete access for all users" ON hospital_cloud_sync;

-- ۴. تعریف Policy دسترسی خواندن (SELECT)
CREATE POLICY "Enable read access for all users"
ON hospital_cloud_sync FOR SELECT
TO public, anon, authenticated
USING (true);

-- ۵. تعریف Policy دسترسی ایجاد رکورد (INSERT)
CREATE POLICY "Enable insert access for all users"
ON hospital_cloud_sync FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- ۶. تعریف Policy دسترسی ویرایش رکورد (UPDATE)
CREATE POLICY "Enable update access for all users"
ON hospital_cloud_sync FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- ۷. تعریف Policy دسترسی حذف رکورد (DELETE)
CREATE POLICY "Enable delete access for all users"
ON hospital_cloud_sync FOR DELETE
TO public, anon, authenticated
USING (true);

GRANT ALL ON TABLE hospital_cloud_sync TO anon, authenticated, public;

-- ================================================================
-- ۸. اعطای دسترسی Policy به سایر جداول (در صورت ایجاد توسط کاربر)
-- ================================================================
-- اگر جداول جداگانه patients, messages, complaints, checklists یا todos ایجاد کرده‌اید:
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
             AND table_name IN ('patients', 'messages', 'complaints', 'checklists', 'custom_checklists', 'todos')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow All %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow All %I" ON public.%I FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, public;', t);
  END LOOP;
END
$$;`;
}

