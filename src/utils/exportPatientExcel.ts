import * as XLSX from 'xlsx';
import { Patient, Disease, Department, Message, CustomChecklist } from '../types';

export const exportPatientExcel = (
  patient: Patient,
  diseases: Disease[],
  departments: Department[],
  messages: Message[],
  customChecklists: CustomChecklist[]
) => {
  const disease = diseases.find(d => d.id === patient.diseaseId);
  const department = departments.find(d => d.id === patient.departmentId);

  const diseaseName = disease?.name || 'تعریف نشده';
  const departmentName = department?.name || 'تعریف نشده';
  const currentDate = new Date().toLocaleDateString('fa-IR');

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: شناسنامه پرونده و وضعیت بالینی (Patient Profile)
  // ==========================================
  const sheet1Rows: any[][] = [];

  sheet1Rows.push(['🏥 سامانه یکپارچه بیمارستان من - پرونده تخصصی بیمار و خلاصه وضعیت بالینی']);
  sheet1Rows.push(['گزارش جامع اطلاعات شناسنامه‌ای، تاریخ بستر/ترخیص، وضعیت تریاژ و ارزیابی مراقبت‌های پس از ترخیص']);
  sheet1Rows.push([
    `تاریخ صدور گزارش: ${currentDate}`,
    '',
    `شماره پرونده: ${patient.fileNumber || 'ثبت نشده'}`,
    '',
    `کد ملی بیمار: ${patient.nationalId}`
  ]);
  sheet1Rows.push([]); // Spacer

  sheet1Rows.push(['👤 مشخصات فردی و پرونده پزشکی:']);
  sheet1Rows.push(['عنوان شاخص / مشخصه', 'مقدار / اطلاعات ثبت‌شده در سیستم', 'توضیحات و وضعیت بالینی']);

  sheet1Rows.push(['نام و نام خانوادگی بیمار', patient.name, '']);
  sheet1Rows.push(['کد ملی بیمار', patient.nationalId, 'شماره یکتا در سامانه']);
  sheet1Rows.push(['شماره پرونده بستری', patient.fileNumber || 'ثبت نشده', 'پرونده پزشکی بیمارستان']);
  sheet1Rows.push(['سن بیمار', `${patient.age} سال`, '']);
  sheet1Rows.push(['شماره تلفن همراه', patient.phone || 'ثبت نشده', 'جهت پیگیری‌های تلفنی و ارسال پیامک']);
  sheet1Rows.push(['بخش درمانی بستری', departmentName, 'بخش صادرکننده ترخیص']);
  sheet1Rows.push(['تشخیص اولیه بیماری', diseaseName, 'گروه بیماری اولیه']);
  sheet1Rows.push(['گروه بیماری ویژه', patient.specialDisease || 'سایر بیماران', 'طبقه‌بندی ۱۷ گانه بیماری‌های ویژه']);
  sheet1Rows.push(['وضعیت بارداری', patient.isPregnant ? 'مادر باردار' : 'خیر', 'غربالگری سلامت مادران']);
  sheet1Rows.push(['ارزیابی مادر پرخطر', patient.isPregnant ? (patient.isHighRiskMother ? '🔴 مادر پرخطر (نیازمند پیگیری ویژه)' : '🟢 مادر باردار کم‌خطر') : 'غیرمرتبط', 'پایش ویژه گروه پرخطر']);
  sheet1Rows.push(['تاریخ بستری در بیمارستان', patient.admissionDate || 'ثبت نشده', 'تاریخ ورود به بخش']);
  sheet1Rows.push(['تاریخ ترخیص از بیمارستان', patient.dischargeDate || 'ثبت نشده', 'مبنای شروع پیگیری']);

  const triageLabel = patient.followupStatus === 'green'
    ? '🟢 سطح سبز (کنترل‌شده - ایمن)'
    : patient.followupStatus === 'yellow'
    ? '🟡 سطح زرد (کنترل ناکافی - نیازمند پایش)'
    : patient.followupStatus === 'red'
    ? '🔴 سطح قرمز (کنترل‌نشده - حاد)'
    : '⏳ در انتظار ارزیابی اولیه';

  sheet1Rows.push(['سطح تریاژ و کنترل بیماری', triageLabel, 'ارزیابی بر اساس خودارزیابی و تماس']);
  sheet1Rows.push(['بستری مجدد در ماه اخیر', patient.readmissionRecentMonth ? '🔴 بله (بستری مجدد دارد)' : '🟢 خیر', 'شاخص بستری مجدد مرتبط']);
  sheet1Rows.push(['وضعیت تکمیل فرم رضایتمندی', patient.surveySubmitted ? '🟢 فرم رضایت‌مندی ثبت شده' : '⏳ ثبت نشده', 'سنجش سوال ۱۸ ترخیص']);
  sheet1Rows.push(['تاریخ ثبت اولیه در سامانه', patient.registeredAt || 'ثبت نشده', 'ایجاد پرونده الکترونیک']);
  sheet1Rows.push(['یادداشت‌ها و توصیه‌های کادر درمان', patient.guidanceNotes || 'یادداشتی ثبت نشده است', 'دستورات حین ترخیص']);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }
  ];
  ws1['!views'] = [{ RTL: true }];
  ws1['!cols'] = [
    { wch: 35 },
    { wch: 45 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'شناسنامه بیمار');

  // ==========================================
  // SHEET 2: سوابق چک‌لیست‌های آموزشی و خودارزیابی (Checklist Submissions)
  // ==========================================
  const sheet2Rows: any[][] = [];

  sheet2Rows.push(['📋 سوابق ارزیابی‌ها، پاسخ به چک‌لیست‌ها و خودارزیابی‌های آموزشی بیمار']);
  sheet2Rows.push([`بیمار: ${patient.name}`, '', `کد ملی: ${patient.nationalId}`, '', `تاریخ صدور: ${currentDate}`]);
  sheet2Rows.push([]); // Spacer

  sheet2Rows.push([
    'ردیف',
    'تاریخ و زمان ثبت',
    'عنوان چک‌لیست / نوبت ارزیابی',
    'سوال آموزشی / سنجش علامت',
    'پاسخ ثبت‌شده توسط بیمار'
  ]);

  let chkRowIdx = 1;
  if (patient.checklistSubmissions && patient.checklistSubmissions.length > 0) {
    patient.checklistSubmissions.forEach((sub, sIdx) => {
      const chk = customChecklists.find(c => c.id === sub.checklistId);
      const chkTitle = chk?.title || `چک‌لیست آموزشی شماره ${sIdx + 1}`;

      if (chk && sub.answers) {
        chk.questions.forEach((q) => {
          const ans = sub.answers[q.id];
          let ansStr = '';
          if (typeof ans === 'object' && ans !== null) {
            ansStr = JSON.stringify(ans);
          } else {
            ansStr = ans !== undefined && ans !== null ? String(ans) : 'پاسخ داده نشده';
          }

          sheet2Rows.push([
            chkRowIdx++,
            sub.submittedAt || 'نامشخص',
            chkTitle,
            q.text,
            ansStr
          ]);
        });
      }
    });
  } else {
    sheet2Rows.push([
      1,
      '-',
      'سوابق خودارزیابی',
      'تکمیل چک‌لیست‌های آموزشی',
      'هنوز هیچ خودارزیابی یا چک‌لیست پیگیری توسط بیمار ثبت نشده است.'
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 3 } }
  ];
  ws2['!views'] = [{ RTL: true }];
  ws2['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 35 },
    { wch: 55 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'چک‌لیست‌های آموزشی');

  // ==========================================
  // SHEET 3: پرسش و پاسخ‌ها با کادر درمان (Messages & Q&A History)
  // ==========================================
  const patientMsgs = messages.filter(m => m.patientId === patient.nationalId);
  const sheet3Rows: any[][] = [];

  sheet3Rows.push(['💬 تاریخچه ارتباطات، سوالات بیمار و پاسخ‌های کادر درمان']);
  sheet3Rows.push([`بیمار: ${patient.name}`, '', `کد ملی: ${patient.nationalId}`, '', `تاریخ گزارش: ${currentDate}`]);
  sheet3Rows.push([]); // Spacer

  sheet3Rows.push([
    'ردیف',
    'تاریخ و زمان پرسش',
    'متن پرسش / پیام بیمار',
    'فایل پیوست بیمار',
    'وضعیت پاسخگویی',
    'متن پاسخ کادر درمان',
    'تاریخ و زمان پاسخ',
    'پاسخ‌دهنده / پرسنل',
    'فایل پیوست کادر درمان'
  ]);

  if (patientMsgs.length > 0) {
    patientMsgs.forEach((m, idx) => {
      sheet3Rows.push([
        idx + 1,
        m.askedAt,
        m.question,
        m.patientFileName || 'ندارد',
        m.answer ? '🟢 پاسخ داده شده' : '⏳ در انتظار پاسخ',
        m.answer || 'پاسخ داده نشده',
        m.answeredAt || '-',
        m.answeredBy || '-',
        m.adminFileName || 'ندارد'
      ]);
    });
  } else {
    sheet3Rows.push([
      1,
      '-',
      'هیچ پیام یا پرسش متقابلی بین بیمار و کادر درمان ثبت نشده است.',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-'
    ]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
  ws3['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
  ];
  ws3['!views'] = [{ RTL: true }];
  ws3['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 45 },
    { wch: 20 },
    { wch: 22 },
    { wch: 45 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'پرسش و پاسخ');

  // ==========================================
  // SHEET 4: فرم سنجش رضایتمندی بیمار (Satisfaction Survey)
  // ==========================================
  const sat = patient.satisfactionSurvey;
  const surveyQuestionsMap: Record<string, string> = {
    q1: '۱. معرفی پرستار مسئول در بدو ورود به بخش',
    q2: '۲. آموزش نحوه استفاده از زنگ احضار پرستار و تجهیزات ایمنی',
    q3: '۳. آموزش اهمیت و نحوه استفاده از دستبند شناسایی بیمار',
    q4: '۴. آموزش مقررات، قوانین و ساعات ملاقات بخش و بیمارستان',
    q5: '۵. آموزش مراقبت‌های بهداشتی فردی و پیشگیری از عفونت',
    q6: '۶. رضایت از وضعیت نظافت بخش، سرویس‌های بهداشتی و ملحفه‌ها',
    q7: '۷. آگاهی از علت بستری و روند درمان بیماری',
    q8: '۸. آگاهی از علائم هشدار دهنده عود بیماری و اقدامات لازم',
    q9: '۹. آموزش نحوه صحیح مصرف داروها و عوارض احتمالی',
    q10: '۱۰. توضیحات لازم قبل از انجام اقدامات بالینی و آزمایشات',
    q11: '۱۱. آموزش پیگیری‌های پاراکلینیکی و مراقبت‌های پس از ترخیص',
    q12: '۱۲. آموزش نحوه پیگیری درمان، مراجعه بعدی و دسترسی به پزشک',
    q13: '۱۳. آموزش میزان و نحوه فعالیت‌های مجاز روزانه در منزل',
    q14: '۱۴. آگاهی و آموزش رژیم غذایی مناسب پس از ترخیص',
    q15: '۱۵. رضایت از نحوه و کیفیت آموزش‌های حین بستری توسط پرسنل',
    q16: '۱۶. رعایت حریم خصوصی در اقدامات معاینه و بالینی',
    q17: '۱۷. رضایت از نحوه برخورد، احترام و رفتار پرسنل بخش',
    q18: '۱۸. رضایت کلی از خدمات درمانی و بستری بیمارستان (شاخص اصلی ترخیص)',
    q19: '۱۹. اسامی پرسنل مورد رضایت و قدردانی بیمار',
    q20: '۲۰. پیشنهادات و انتقادات جهت بهبود کیفیت خدمات'
  };

  const sheet4Rows: any[][] = [];
  sheet4Rows.push(['⭐ فرم تفکیکی سنجش رضایتمندی بیمار از خدمات درمانی و ترخیص (سوال ۱ تا ۲۰)']);
  sheet4Rows.push([`بیمار: ${patient.name}`, '', `کد ملی: ${patient.nationalId}`, '', `تاریخ گزارش: ${currentDate}`]);
  sheet4Rows.push([]); // Spacer

  sheet4Rows.push([
    'کد / ردیف',
    'عنوان سوال / حوزه سنجش رضایت',
    'پاسخ ثبت‌شده / میزان رضایت'
  ]);

  if (sat || patient.surveySubmitted) {
    sheet4Rows.push(['- ', 'تاریخ ثبت فرم رضایت‌مندی', sat?.submittedAt || patient.surveyCompletedAt || 'ثبت شده']);
    if (patient.surveyHospitalizationSatisfaction) {
      sheet4Rows.push(['- ', 'امتیاز رضایت از دوران بستری (۱ تا ۵)', `${patient.surveyHospitalizationSatisfaction} از ۵ ⭐`]);
    }
    if (patient.surveyScreeningRiskFactors && patient.surveyScreeningRiskFactors.length > 0) {
      sheet4Rows.push(['- ', 'فاکتورهای خطر غربالگری شده', patient.surveyScreeningRiskFactors.join(' - ')]);
    }
    if (patient.surveyScreeningReferralNeeded !== undefined) {
      sheet4Rows.push(['- ', 'نیاز به ارجاع تخصصی غربالگری', patient.surveyScreeningReferralNeeded ? 'بله (ارزیابی مجدد)' : 'خیر']);
    }

    if (sat) {
      Object.keys(surveyQuestionsMap).forEach((key, qIdx) => {
        const val = (sat as any)[key];
        sheet4Rows.push([
          `سوال ${qIdx + 1}`,
          surveyQuestionsMap[key],
          val || 'پاسخ داده نشده'
        ]);
      });
    }
  } else {
    sheet4Rows.push([
      '1',
      'وضعیت تکمیل فرم رضایت‌مندی',
      'فرم سنجش رضایت‌مندی بیمار هنوز تکمیل نشده است.'
    ]);
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows);
  ws4['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
  ];
  ws4['!views'] = [{ RTL: true }];
  ws4['!cols'] = [
    { wch: 15 },
    { wch: 65 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'رضایتمندی بیمار');

  // Trigger File Download
  const sanitizedName = patient.name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const fileName = `پرونده_کامل_بیمار_${sanitizedName}_${patient.nationalId}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
