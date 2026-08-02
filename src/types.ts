export interface Disease {
  id: string;
  name: string;
  englishName: string;
  departmentId: string;
  description: string;
  educationalContent: string;
  attachmentImages?: string[];
  triageGuide: {
    green: {
      symptoms: string[];
      actions: string[];
    };
    yellow: {
      symptoms: string[];
      actions: string[];
    };
    red: {
      symptoms: string[];
      actions: string[];
    };
  };
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  color?: string;
  emoji?: string;
}

export interface SatisfactionSurvey {
  q1: string; // معرفی پرستار (بله / خیر / تا حدودی)
  q2: string; // آموزش ایمنی و احضار پرستار
  q3: string; // آموزش دستبند شناسایی
  q4: string; // آموزش مقررات بخش و بیمارستان
  q5: string; // آموزش مراقبت های بهداشتی شخصی
  q6: string; // رضایت از نظافت بخش و ملحفه
  q7: string; // آگاهی از علت و علائم بیماری
  q8: string; // آگاهی از علائم خطر عود بیماری
  q9: string; // آموزش داروها و عوارض
  q10: string; // توضیح قبل از هر اقدام بالینی
  q11: string; // آموزش پیگیری پاراکلینیک
  q12: string; // آموزش پیگیری بیماری و دسترسی به پزشک
  q13: string; // آموزش فعالیت‌های روزانه در منزل
  q14: string; // آگاهی از رژیم غذایی منزل
  q15: string; // رضایت از آموزش‌های حین بستری پرسنل
  q16: string; // رعایت حریم خصوصی بالینی
  q17: string; // رضایت از برخورد پرسنل
  q18: string; // رضایت کلی از خدمت‌رسانی بیمارستان (عالی / خوب / متوسط / ضعیف)
  q19: string; // پرسنل مورد رضایت کامل
  q20: string; // پیشنهاد یا انتقاد بهبود بیمارستان
  submittedAt: string;
}

export const PERSIAN_MONTHS = [
  { id: 'all', name: 'کل سال (همه ماه‌ها)', shortName: 'کل سال' },
  { id: '01', name: 'فروردین', shortName: 'فروردین' },
  { id: '02', name: 'اردیبهشت', shortName: 'اردیبهشت' },
  { id: '03', name: 'خرداد', shortName: 'خرداد' },
  { id: '04', name: 'تیر', shortName: 'تیر' },
  { id: '05', name: 'مرداد', shortName: 'مرداد' },
  { id: '06', name: 'شهریور', shortName: 'شهریور' },
  { id: '07', name: 'مهر', shortName: 'مهر' },
  { id: '08', name: 'آبان', shortName: 'آبان' },
  { id: '09', name: 'آذر', shortName: 'آذر' },
  { id: '10', name: 'دی', shortName: 'دی' },
  { id: '11', name: 'بهمن', shortName: 'بهمن' },
  { id: '12', name: 'اسفند', shortName: 'اسفند' },
] as const;

export const SPECIAL_DISEASES = [
  'نارسایی مزمن قلبی عروقی(CHF)',
  'نارسایی مزمن تنفسی (COPD)',
  'بیماران دچار ضایعه مغزی (CVA)',
  'دیابت بزرگسال',
  'دیابت کودکان',
  'آمپوتاسیون',
  'سرطان بزرگسال',
  'سرطان کودکان',
  'سوختگی',
  'پرفشاری خون',
  'سکته قلبی',
  'اختلالات روان',
  'نارسایی مزمن کلیوی',
  'صرع کودکان',
  'نوزاد نیازمند مراقبت ویژه',
  'بیماران دچار حوادث و بلایا',
  'سایر بیماران',
] as const;

export type SpecialDiseaseType = typeof SPECIAL_DISEASES[number];

export interface AdmissionRecord {
  id: string;
  nationalId: string;
  patientName: string;
  diseaseName: string; // تشخیص پزشکی
  admissionDate: string; // تاریخ بستری
  departmentId: string;
  departmentName: string; // بخش بستری
  fileNumber?: string;
  specialDisease?: string;
  notes?: string;
  createdAt?: string;
}

export interface Patient {
  nationalId: string;
  userCode?: string;
  password?: string;
  fileNumber: string;
  name: string;
  age: number;
  phone: string;
  dischargeDate: string;
  departmentId: string;
  diseaseId: string;
  specialDisease?: string;
  followupStatus: 'pending' | 'green' | 'yellow' | 'red';
  satisfactionRate?: number; // 1-5
  readmitted?: boolean;
  readmissionRecentMonth?: boolean;
  isPregnant?: boolean;
  isHighRiskMother?: boolean;
  guidanceNotes?: string;
  hashtaggedDiseaseIds?: string[];
  unplannedEmergencyVisit?: boolean;
  registeredAt: string;
  admissionDate?: string; // تاریخ بستری بیمار بر اساس هجری شمسی
  // Survey and screening fields
  surveySubmitted?: boolean;
  surveyHospitalizationSatisfaction?: number; // 1-5 rating for duration of hospital stay
  surveyScreeningRiskFactors?: string[]; // risk factors screened
  surveyScreeningReferralNeeded?: boolean; // screening referral required
  surveyCompletedAt?: string;
  satisfactionSurvey?: SatisfactionSurvey;
  activeChecklistIds?: string[]; // Custom self-care checklists assigned to patient
  checklistSubmissions?: PatientChecklistAnswer[]; // Submissions of assigned checklists
}

export interface CustomChecklistQuestion {
  id: string;
  text: string;
  type: 'qualitative' | 'quantitative' | 'multiple_choice' | 'emoji' | 'descriptive' | 'hybrid';
  options?: string[]; // for multiple choice or qualitative options
  hybridType1?: 'qualitative' | 'quantitative' | 'multiple_choice' | 'emoji';
  hybridType2?: 'descriptive';
}

export interface CustomChecklist {
  id: string;
  title: string;
  targetType: 'patient' | 'satisfaction'; // 'patient' for self-care, 'satisfaction' for department rating
  departmentId?: string; // only used if targetType is 'satisfaction'
  questions: CustomChecklistQuestion[];
  createdAt: string;
}

export interface PatientChecklistAnswer {
  checklistId: string;
  answers: Record<string, any>; // questionId -> answer value
  submittedAt: string;
}

export interface HospitalComplaint {
  id: string;
  name: string;
  phone: string;
  age: number;
  date: string;
  description: string;
  submittedAt: string;
}

export interface DeptSatisfactionSubmission {
  id: string;
  departmentId: string;
  answers: Record<string, any>; // questionId -> answer value
  submittedAt: string;
}

export interface AdminUser {
  username: string;
  name: string;
  passwordHash: string;
  role: 'super' | 'department';
  departmentId?: string; // if role is department
}

export interface Message {
  id: string;
  patientId: string; // nationalId
  patientName: string;
  departmentId: string;
  question: string;
  askedAt: string;
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
  // File Transfer support
  patientFileName?: string;
  patientFileUrl?: string; // base64 or mock URL
  adminFileName?: string;
  adminFileUrl?: string;
}

export interface NewsBanner {
  id: string;
  title: string;
  content: string; // خلاصه خبر در بنر
  description?: string; // متن کامل و توضیحات شخصی‌سازی‌شده صفحه خبر
  attachmentImages?: string[]; // عکس‌های ضمیمه توضیحات خبر
  imageUrl?: string;
  link?: string;
  isActive: boolean;
  createdAt: string;
}

export interface YearlyIndicatorArchive {
  id: string;
  year: string; // e.g., "1404", "1405"
  archivedAt: string; // ISO timestamp
  archivedBy: string; // Admin name
  totalCount: number;
  evaluatedCount: number;
  followupRate: number;
  satisfactionRate: number;
  readmissionRate: number;
  screeningRate: number;
  totalPregnantCount: number;
  highRiskPregnantCount: number;
  readmittedCount: number;
  totalActivePatientsCount: number;
  monthlyIndicatorsSeries: {
    monthId: string;
    monthName: string;
    shortName: string;
    totalCount: number;
    evaluatedCount: number;
    followupRate: number;
    satisfactionRate: number;
    readmissionRate: number;
    screeningRate: number;
    readmittedCount: number;
  }[];
  departmentIndicatorsSeries?: {
    departmentId: string;
    departmentName: string;
    totalCount: number;
    evaluatedCount: number;
    followupRate: number;
    satisfactionRate: number;
    readmissionRate: number;
    screeningRate: number;
    readmittedCount: number;
  }[];
  specialDiseaseCounts: {
    diseaseName: string;
    count: number;
    readmissionCount: number;
    monthlyCounts?: Record<string, number>;
    monthlyReadmissionCounts?: Record<string, number>;
  }[];
  triageCounts?: {
    red: number;
    yellow: number;
    green: number;
    pending: number;
  };
  monthlyTriageSeries?: {
    monthId: string;
    monthName: string;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    pendingCount: number;
    totalCount: number;
  }[];
  departmentTriageSeries?: {
    departmentId: string;
    departmentName: string;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    pendingCount: number;
    totalCount: number;
  }[];
}

