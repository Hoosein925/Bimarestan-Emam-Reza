import { Department, Disease, Patient, AdminUser, Message } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'emergency', name: 'اورژانس', icon: 'PlusCircle' },
  { id: 'pediatrics', name: 'اطفال و نوزاد', icon: 'Baby' },
  { id: 'internal_surgery', name: 'داخلی و جراحی', icon: 'Scissors' },
  { id: 'dialysis', name: 'دیالیز', icon: 'Activity' },
  { id: 'ob_gyn_surgery', name: 'جراحی زنان و زایمان', icon: 'HeartHandshake' },
  { id: 'labor_block', name: 'بلوک زایمان', icon: 'Smile' },
  { id: 'thalassemia', name: 'تالاسمی', icon: 'Heart' },
  { id: 'operating_room', name: 'اتاق عمل', icon: 'Stethoscope' },
  { id: 'ccu', name: 'ccu', icon: 'TrendingUp' },
  { id: 'icu', name: 'ICU', icon: 'ShieldCheck' },
  { id: 'radiology', name: 'رادیولوژی', icon: 'Camera' },
  { id: 'laboratory', name: 'آزمایشگاه', icon: 'FlaskConical' }
];

export const DISEASES: Disease[] = [];

export const DEFAULT_ADMINS: AdminUser[] = [
  {
    username: '5850008985',
    name: 'حسین نصاری (مدیر کل سیستم)',
    passwordHash: '64546',
    role: 'super'
  }
];

export const DEFAULT_PATIENTS: Patient[] = [];

export const DEFAULT_MESSAGES: Message[] = [];

