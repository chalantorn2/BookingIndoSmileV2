import {
  format,
  parse,
  isValid,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale";

/**
 * แปลงรูปแบบวันที่จาก String เป็น Date
 * @param {string} dateString - วันที่ในรูปแบบต่างๆ
 * @param {string} inputFormat - รูปแบบข้อมูลเข้า (ถ้าทราบ)
 * @returns {Date|null} - วันที่ในรูปแบบ Date Object หรือ null ถ้าไม่สามารถแปลงได้
 */
export const parseDate = (dateString, inputFormat = "yyyy-MM-dd") => {
  if (!dateString) return null;

  // ลองแปลงวันที่ตามรูปแบบที่กำหนด
  try {
    const date = parse(dateString, inputFormat, new Date());
    if (isValid(date)) return date;
  } catch (e) {
    // ถ้าแปลงไม่สำเร็จให้ทำต่อ
  }

  // ลองแปลงวันที่จากรูปแบบ dd/MM/yyyy
  try {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (isValid(date)) return date;
    }
  } catch (e) {
    // ถ้าแปลงไม่สำเร็จให้ทำต่อ
  }

  // ลองแปลงวันที่จาก ISO format
  try {
    const date = new Date(dateString);
    if (isValid(date)) return date;
  } catch (e) {
    // ถ้าแปลงไม่สำเร็จ
    return null;
  }

  return null;
};

/**
 * แปลงวันที่เป็น String ในรูปแบบที่ต้องการ
 * @param {Date|string} date - วันที่ที่ต้องการแปลง
 * @param {string} outputFormat - รูปแบบข้อมูลออก (default: 'dd/MM/yyyy')
 * @returns {string} - วันที่ในรูปแบบ String ที่ต้องการ
 */
export const formatDate = (date, outputFormat = "dd/MM/yyyy") => {
  if (!date) return "";

  let dateObj = date;

  // ถ้า date เป็น string ให้แปลงเป็น Date Object ก่อน
  if (typeof date === "string") {
    dateObj = parseDate(date);
    if (!dateObj) return date; // ถ้าแปลงไม่ได้ให้คืนค่าเดิม
  }

  try {
    return format(dateObj, outputFormat);
  } catch (e) {
    return "";
  }
};

/**
 * แปลงวันที่เป็น String ในรูปแบบภาษาไทย
 * @param {Date|string} date - วันที่ที่ต้องการแปลง
 * @param {string} outputFormat - รูปแบบข้อมูลออก (default: 'd MMMM yyyy')
 * @returns {string} - วันที่ในรูปแบบภาษาไทย
 */
export const formatThaiDate = (date, outputFormat = "d MMMM yyyy") => {
  if (!date) return "";

  let dateObj = date;

  // ถ้า date เป็น string ให้แปลงเป็น Date Object ก่อน
  if (typeof date === "string") {
    dateObj = parseDate(date);
    if (!dateObj) return date; // ถ้าแปลงไม่ได้ให้คืนค่าเดิม
  }

  try {
    return format(dateObj, outputFormat, { locale: th });
  } catch (e) {
    return "";
  }
};

/**
 * คำนวณช่วงวันที่ (เช่น วันนี้, วันพรุ่งนี้, เดือนนี้)
 * @param {string} range - ช่วงที่ต้องการ ('today', 'tomorrow', 'thisWeek', 'thisMonth', 'lastMonth')
 * @returns {Object} - { start: Date, end: Date } วันที่เริ่มต้นและสิ้นสุดของช่วง
 */
export const getDateRange = (range) => {
  const today = new Date();

  switch (range) {
    case "today": {
      return {
        start: today,
        end: today,
      };
    }
    case "tomorrow": {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      return {
        start: tomorrow,
        end: tomorrow,
      };
    }
    case "thisWeek": {
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }), // เริ่มต้นสัปดาห์ด้วยวันจันทร์
        end: endOfWeek(today, { weekStartsOn: 1 }),
      };
    }
    case "thisMonth": {
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
    }
    case "lastMonth": {
      const lastMonth = subMonths(today, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    }
    case "nextWeek": {
      const nextWeekStart = addDays(endOfWeek(today, { weekStartsOn: 1 }), 1);
      return {
        start: nextWeekStart,
        end: addDays(nextWeekStart, 6),
      };
    }
    case "next7Days": {
      return {
        start: today,
        end: addDays(today, 6),
      };
    }
    case "last7Days": {
      return {
        start: subDays(today, 6),
        end: today,
      };
    }
    default: {
      return {
        start: today,
        end: today,
      };
    }
  }
};

/**
 * แปลงวันที่เป็นรูปแบบสำหรับส่ง Query ไปยัง Supabase
 * @param {Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} - วันที่ในรูปแบบ 'YYYY-MM-DD'
 */
export const formatDateForDatabase = (date) => {
  if (!date) return "";

  try {
    return format(date, "yyyy-MM-dd");
  } catch (e) {
    return "";
  }
};

/**
 * เปรียบเทียบวันที่ ไม่รวมเวลา
 * @param {Date} date1 - วันที่แรก
 * @param {Date} date2 - วันที่สอง
 * @returns {boolean} - true ถ้าวันที่เท่ากัน (ไม่คิดเวลา)
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * คำนวณจำนวนวันระหว่างวันที่
 * @param {Date|string} startDate - วันที่เริ่มต้น
 * @param {Date|string} endDate - วันที่สิ้นสุด
 * @returns {number} - จำนวนวัน
 */
export const getDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start =
    typeof startDate === "string" ? parseDate(startDate) : startDate;
  const end = typeof endDate === "string" ? parseDate(endDate) : endDate;

  if (!start || !end) return 0;

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
