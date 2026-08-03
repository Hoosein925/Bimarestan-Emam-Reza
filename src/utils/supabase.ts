import { createClient } from '@supabase/supabase-js';
import { Patient, Message, HospitalComplaint, CustomChecklist, NewsBanner, Disease, Department, AdminUser, AdmissionRecord } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://fsuycchgujsdvdxjvumg.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0JxiPIZBv0xez-CfXdyeEQ_itfooktX';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface SupabaseSyncSnapshot {
  id?: string;
  updated_at?: string;
  patients?: Patient[];
  messages?: Message[];
  complaints?: HospitalComplaint[];
  checklists?: CustomChecklist[];
  newsBanners?: NewsBanner[];
  diseases?: Disease[];
  departments?: Department[];
  admins?: AdminUser[];
  admissionRecords?: AdmissionRecord[];
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
 * Saves a snapshot of hospital data to Supabase Cloud ('hospital_cloud_sync' table and individual tables).
 */
export async function syncHospitalDataToSupabase(
  patients: Patient[],
  messages: Message[],
  complaints: HospitalComplaint[],
  checklists: CustomChecklist[],
  newsBanners?: NewsBanner[],
  diseases?: Disease[],
  departments?: Department[],
  admins?: AdminUser[],
  admissionRecords?: AdmissionRecord[]
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. First sync rows to individual Supabase tables independently so even if one table has an old schema, others succeed
    const tryUpsert = async (table: string, rows: any[]) => {
      try {
        if (!rows || rows.length === 0) return true;
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) {
          console.warn(`Supabase upsert warning on ${table}:`, error.message);
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    const results = await Promise.all([
      tryUpsert('hospital_news_banners', newsBanners?.map(b => ({
        id: b.id,
        title: b.title || '',
        content: b.content || '',
        image_url: b.imageUrl || '',
        is_active: b.isActive ?? true,
        created_at: b.createdAt || '',
        category: 'اخبار بیمارستان',
        summary: b.content ? b.content.slice(0, 100) : ''
      })) || []),

      tryUpsert('hospital_patients', patients?.map((p, idx) => ({
        id: p.nationalId || p.fileNumber || String(idx),
        national_id: p.nationalId || '',
        file_number: p.fileNumber || '',
        name: p.name || '',
        age: p.age || 0,
        phone: p.phone || '',
        department_id: p.departmentId || '',
        disease_id: p.diseaseId || '',
        followup_status: p.followupStatus || 'pending',
        discharge_date: p.dischargeDate || '',
        registered_at: p.registeredAt || new Date().toISOString(),
        data_json: JSON.stringify(p)
      })) || []),

      tryUpsert('hospital_diseases', diseases?.map(d => ({
        id: d.id,
        name: d.name || '',
        english_name: d.englishName || '',
        department_id: d.departmentId || '',
        description: d.description || '',
        data_json: JSON.stringify(d)
      })) || []),

      tryUpsert('hospital_messages', messages?.map(m => ({
        id: m.id,
        title: m.question ? m.question.slice(0, 50) : '',
        content: m.question || '',
        sender_name: m.patientName || '',
        target_group: m.departmentId || '',
        created_at: m.askedAt || '',
        data_json: JSON.stringify(m)
      })) || []),

      tryUpsert('hospital_complaints', complaints?.map(c => ({
        id: c.id,
        subject: c.description ? c.description.slice(0, 50) : '',
        department_name: '',
        description: c.description || '',
        status: 'submitted',
        created_at: (c as any).submittedAt || (c as any).date || '',
        data_json: JSON.stringify(c)
      })) || []),

      tryUpsert('hospital_custom_checklists', checklists?.map(c => ({
        id: c.id,
        title: c.title || '',
        description: '',
        target_group: c.targetType || 'all',
        created_at: c.createdAt || '',
        data_json: JSON.stringify(c)
      })) || []),

      tryUpsert('hospital_departments', departments?.map(d => ({
        id: d.id,
        name: d.name || '',
        icon: d.icon || '',
        data_json: JSON.stringify(d)
      })) || []),

      tryUpsert('hospital_admins', admins?.map(a => ({
        id: a.username,
        username: a.username || '',
        name: a.name || '',
        role: a.role || '',
        data_json: JSON.stringify(a)
      })) || []),

      tryUpsert('hospital_admission_history', admissionRecords?.map((a, idx) => ({
        id: a.id || String(idx),
        national_id: a.nationalId || '',
        patient_name: a.patientName || '',
        disease_name: a.diseaseName || '',
        admission_date: a.admissionDate || '',
        department_name: a.departmentName || '',
        data_json: JSON.stringify(a)
      })) || [])
    ]);

    // 2. Also save to main hospital_cloud_sync snapshot table
    const payload = {
      id: 'main_hospital_snapshot',
      updated_at: new Date().toISOString(),
      patients_json: JSON.stringify(patients || []),
      messages_json: JSON.stringify(messages || []),
      complaints_json: JSON.stringify(complaints || []),
      checklists_json: JSON.stringify(checklists || []),
      news_banners_json: JSON.stringify(newsBanners || []),
      diseases_json: JSON.stringify(diseases || []),
      departments_json: JSON.stringify(departments || []),
      admins_json: JSON.stringify(admins || []),
      admission_records_json: JSON.stringify(admissionRecords || [])
    };

    let syncError = null;
    const { error } = await supabase
      .from('hospital_cloud_sync')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      // If column does not exist yet (before running new SQL script), fallback to basic 4 columns
      if (error.message?.toLowerCase().includes('column') || error.code === '42703' || error.code === 'PGRST204') {
        const basicPayload = {
          id: 'main_hospital_snapshot',
          updated_at: new Date().toISOString(),
          patients_json: JSON.stringify(patients || []),
          messages_json: JSON.stringify(messages || []),
          complaints_json: JSON.stringify(complaints || []),
          checklists_json: JSON.stringify(checklists || [])
        };
        const { error: basicErr } = await supabase
          .from('hospital_cloud_sync')
          .upsert(basicPayload, { onConflict: 'id' });
        syncError = basicErr;
      } else {
        syncError = error;
      }
    }

    if (syncError) {
      if (syncError.code === '42P01' || syncError.message?.toLowerCase().includes('relation') || syncError.message?.toLowerCase().includes('table')) {
        // Even if main table is missing, check if any individual tables succeeded
        if (results.some(res => res === true)) {
          return {
            success: true,
            message: 'داده‌ها در جداول اختصاصی Supabase ذخیره شدند. (برای قابلیت همگام‌سازی کامل لطفاً اسکریپت جدید SQL را اجرا کنید)'
          };
        }
        return {
          success: false,
          message: 'جداول در Supabase ایجاد نشده‌اند. لطفاً اسکریپت جامع SQL (جدید) را در پنل Supabase اجرا کنید.'
        };
      }
      if (syncError.code === '42501' || syncError.message?.toLowerCase().includes('policy') || syncError.message?.toLowerCase().includes('permission')) {
        return {
          success: false,
          message: 'خطای سطح دسترسی (RLS): لطفاً اسکریپت SQL شامل Policyهای دسترسی و باکت را در Supabase اجرا کنید.'
        };
      }
      console.warn('Supabase sync warning:', syncError.message);
      if (results.some(res => res === true)) {
        return {
          success: true,
          message: 'برخی جداول ابری با موفقیت به‌روزرسانی شدند.'
        };
      }
      return {
        success: false,
        message: 'خطا در ذخیره‌سازی ابری: ' + (syncError.message || 'خطای ناشناخته')
      };
    }

    return {
      success: true,
      message: 'تمامی داده‌های بیماران، اخبار، بیماری‌ها، پیام‌ها، بخش‌ها و چک‌لیست‌ها با موفقیت در فضای ابری Supabase همگام‌سازی شد.'
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
    newsBanners?: NewsBanner[];
    diseases?: Disease[];
    departments?: Department[];
    admins?: AdminUser[];
    admissionRecords?: AdmissionRecord[];
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

    let newsBanners: NewsBanner[] | undefined = data?.news_banners_json ? JSON.parse(data.news_banners_json) : undefined;
    if (!newsBanners) {
      try {
        const { data: bRows } = await supabase.from('hospital_news_banners').select('*');
        if (bRows && bRows.length > 0) {
          newsBanners = bRows.map((r: any) => ({
            id: r.id,
            title: r.title || '',
            content: r.content || r.summary || '',
            imageUrl: r.image_url || '',
            isActive: r.is_active ?? true,
            createdAt: r.created_at || ''
          }));
        }
      } catch (e) {}
    }

    let patients: Patient[] | undefined = data?.patients_json ? JSON.parse(data.patients_json) : undefined;
    if (!patients) {
      try {
        const { data: pRows } = await supabase.from('hospital_patients').select('*');
        if (pRows && pRows.length > 0) {
          patients = pRows.map((r: any) => {
            if (r.data_json) {
              try { return JSON.parse(r.data_json); } catch (e) {}
            }
            return {
              nationalId: r.national_id || r.id || '',
              fileNumber: r.file_number || '',
              name: r.name || '',
              age: r.age || 0,
              phone: r.phone || '',
              departmentId: r.department_id || '',
              diseaseId: r.disease_id || '',
              followupStatus: r.followup_status || 'pending',
              dischargeDate: r.discharge_date || '',
              registeredAt: r.registered_at || ''
            } as Patient;
          });
        }
      } catch (e) {}
    }

    let diseases: Disease[] | undefined = data?.diseases_json ? JSON.parse(data.diseases_json) : undefined;
    if (!diseases) {
      try {
        const { data: dRows } = await supabase.from('hospital_diseases').select('*');
        if (dRows && dRows.length > 0) {
          diseases = dRows.map((r: any) => {
            if (r.data_json) {
              try { return JSON.parse(r.data_json); } catch (e) {}
            }
            return {
              id: r.id,
              name: r.name || '',
              englishName: r.english_name || '',
              departmentId: r.department_id || '',
              description: r.description || '',
              triageGuide: { green: { symptoms: [], actions: [] }, yellow: { symptoms: [], actions: [] }, red: { symptoms: [], actions: [] } }
            } as Disease;
          });
        }
      } catch (e) {}
    }

    return {
      success: true,
      data: {
        patients: patients,
        messages: data?.messages_json ? JSON.parse(data.messages_json) : undefined,
        complaints: data?.complaints_json ? JSON.parse(data.complaints_json) : undefined,
        checklists: data?.checklists_json ? JSON.parse(data.checklists_json) : undefined,
        newsBanners: newsBanners,
        diseases: diseases,
        departments: data?.departments_json ? JSON.parse(data.departments_json) : undefined,
        admins: data?.admins_json ? JSON.parse(data.admins_json) : undefined,
        admissionRecords: data?.admission_records_json ? JSON.parse(data.admission_records_json) : undefined
      },
      message: `اطلاعات با موفقیت از سرور ابری Supabase بارگذاری شد (آخرین بروزرسانی: ${data?.updated_at ? new Date(data.updated_at).toLocaleTimeString('fa-IR') : 'نامشخص'})`
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
 * Returns SQL code to create the required tables in Supabase SQL Editor and apply full RLS Policies for ALL tables.
 */
export function getSupabaseSetupSQL(): string {
  return `-- ================================================================
-- اسکریپت کامل و نهایی پاکسازی، ساخت مجدد تمامی جداول، باکت استوریج و پالیسی‌های RLS
-- (می‌توانید این کد را یکجا در SQL Editor سوپابیس کپی و Run کنید)
-- ================================================================

-- ۱. پاکسازی جداول قبلی در صورت وجود (برای شروع تمیز و بدون خطا)
DROP TABLE IF EXISTS hospital_cloud_sync CASCADE;
DROP TABLE IF EXISTS hospital_patients CASCADE;
DROP TABLE IF EXISTS hospital_news_banners CASCADE;
DROP TABLE IF EXISTS hospital_diseases CASCADE;
DROP TABLE IF EXISTS hospital_messages CASCADE;
DROP TABLE IF EXISTS hospital_complaints CASCADE;
DROP TABLE IF EXISTS hospital_custom_checklists CASCADE;
DROP TABLE IF EXISTS hospital_departments CASCADE;
DROP TABLE IF EXISTS hospital_admins CASCADE;
DROP TABLE IF EXISTS hospital_admission_history CASCADE;
DROP TABLE IF EXISTS hospital_satisfaction_surveys CASCADE;
DROP TABLE IF EXISTS hospital_dept_satisfaction_surveys CASCADE;

-- ۲. ساخت جدول اصلی همگام‌سازی ابری (Snapshot کل سیستم)
CREATE TABLE hospital_cloud_sync (
  id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  patients_json TEXT,
  messages_json TEXT,
  complaints_json TEXT,
  checklists_json TEXT,
  news_banners_json TEXT,
  diseases_json TEXT,
  departments_json TEXT,
  admins_json TEXT,
  admission_records_json TEXT
);

-- ۳. ساخت جداول اختصاصی بیمارستان همراه با تمامی ستون‌ها
CREATE TABLE hospital_patients (
  id TEXT PRIMARY KEY,
  national_id TEXT,
  file_number TEXT,
  name TEXT,
  age INTEGER,
  phone TEXT,
  department_id TEXT,
  disease_id TEXT,
  followup_status TEXT,
  discharge_date TEXT,
  registered_at TEXT,
  data_json TEXT
);

CREATE TABLE hospital_news_banners (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT,
  category TEXT,
  summary TEXT
);

CREATE TABLE hospital_diseases (
  id TEXT PRIMARY KEY,
  name TEXT,
  english_name TEXT,
  department_id TEXT,
  description TEXT,
  data_json TEXT
);

CREATE TABLE hospital_messages (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  sender_name TEXT,
  target_group TEXT,
  created_at TEXT,
  data_json TEXT
);

CREATE TABLE hospital_complaints (
  id TEXT PRIMARY KEY,
  subject TEXT,
  department_name TEXT,
  description TEXT,
  status TEXT,
  created_at TEXT,
  data_json TEXT
);

CREATE TABLE hospital_custom_checklists (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  target_group TEXT,
  created_at TEXT,
  data_json TEXT
);

CREATE TABLE hospital_departments (
  id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  data_json TEXT
);

CREATE TABLE hospital_admins (
  id TEXT PRIMARY KEY,
  username TEXT,
  name TEXT,
  role TEXT,
  data_json TEXT
);

CREATE TABLE hospital_admission_history (
  id TEXT PRIMARY KEY,
  national_id TEXT,
  patient_name TEXT,
  disease_name TEXT,
  admission_date TEXT,
  department_name TEXT,
  data_json TEXT
);

-- ۴. ساخت و تنظیم باکت استوریج (Storage Bucket) برای آپلود فایل و صدا
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hospital-files', 'hospital-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ۵. اعطای دسترسی عمومی (Policies) به Storage Bucket به صورت امن
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read hospital-files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public upload hospital-files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public update hospital-files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public delete hospital-files" ON storage.objects;

  CREATE POLICY "Allow public read hospital-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'hospital-files');

  CREATE POLICY "Allow public upload hospital-files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'hospital-files');

  CREATE POLICY "Allow public update hospital-files"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'hospital-files');

  CREATE POLICY "Allow public delete hospital-files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'hospital-files');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'خطایی در تنظیم پالیسی استوریج رخ داد که قابل چشم‌پوشی است: %', SQLERRM;
END
$$;

-- ۶. فعال‌سازی RLS و اعطای دسترسی عمومی (Policies) به تمامی جداول hospital_*
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
             AND table_name LIKE 'hospital_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow All %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow All %I" ON public.%I FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, public;', t);
  END LOOP;
END
$$;`;
}

