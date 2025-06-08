// src/utils/fileValidation.js

/**
 * ตรวจสอบประเภทไฟล์ที่อนุญาต
 * @param {File} file - ไฟล์ที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าประเภทไฟล์ถูกต้อง
 */
export const isValidFileType = (file) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];

  // ตรวจสอบ MIME type
  const isValidMimeType = allowedTypes.includes(file.type);

  // ตรวจสอบนามสกุลไฟล์
  const fileName = file.name.toLowerCase();
  const isValidExtension = allowedExtensions.some((ext) =>
    fileName.endsWith(ext)
  );

  return isValidMimeType && isValidExtension;
};

/**
 * ตรวจสอบขนาดไฟล์
 * @param {File} file - ไฟล์ที่ต้องการตรวจสอบ
 * @param {number} maxSizeMB - ขนาดสูงสุดใน MB (default: 5)
 * @returns {boolean} - true ถ้าขนาดไฟล์ไม่เกินที่กำหนด
 */
export const isValidFileSize = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024; // แปลงเป็น bytes
  return file.size <= maxSizeBytes;
};

/**
 * ตรวจสอบไฟล์ทั้งหมด (ประเภทและขนาด)
 * @param {File} file - ไฟล์ที่ต้องการตรวจสอบ
 * @param {number} maxSizeMB - ขนาดสูงสุดใน MB (default: 5)
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateFile = (file, maxSizeMB = 5) => {
  if (!file) {
    return { isValid: false, error: "ไม่พบไฟล์" };
  }

  if (!isValidFileType(file)) {
    return {
      isValid: false,
      error: "ประเภทไฟล์ไม่ถูกต้อง (อนุญาตเฉพาะ PDF, JPG, JPEG, PNG)",
    };
  }

  if (!isValidFileSize(file, maxSizeMB)) {
    return {
      isValid: false,
      error: `ขนาดไฟล์เกิน ${maxSizeMB} MB`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * ตรวจสอบไฟล์หลายไฟล์
 * @param {FileList|Array} files - รายการไฟล์ที่ต้องการตรวจสอบ
 * @param {number} maxSizeMB - ขนาดสูงสุดใน MB (default: 5)
 * @returns {Object} - { isValid: boolean, errors: Array, validFiles: Array }
 */
export const validateFiles = (files, maxSizeMB = 5) => {
  const errors = [];
  const validFiles = [];

  if (!files || files.length === 0) {
    return { isValid: false, errors: ["ไม่พบไฟล์"], validFiles: [] };
  }

  Array.from(files).forEach((file, index) => {
    const validation = validateFile(file, maxSizeMB);

    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`ไฟล์ ${index + 1}: ${validation.error}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validFiles,
  };
};

/**
 * แปลงขนาดไฟล์เป็นข้อความที่อ่านง่าย
 * @param {number} bytes - ขนาดไฟล์ใน bytes
 * @returns {string} - ขนาดไฟล์ในรูปแบบที่อ่านง่าย
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * สร้างชื่อไฟล์ที่ปลอดภัยสำหรับ Storage
 * @param {string} originalName - ชื่อไฟล์เดิม
 * @returns {string} - ชื่อไฟล์ใหม่ที่ปลอดภัย
 */
export const generateSafeFileName = (originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.substring(originalName.lastIndexOf("."));

  // แปลงชื่อไฟล์ให้ปลอดภัย
  const nameWithoutExt = originalName.substring(
    0,
    originalName.lastIndexOf(".")
  );

  // เอาเฉพาะตัวอักษร ตัวเลข และ - _ เท่านั้น
  const safeName = nameWithoutExt
    .replace(/[^\w\-_.]/g, "_") // แทนที่ตัวอักษรพิเศษด้วย _
    .replace(/\s+/g, "_") // แทนที่ช่องว่างด้วย _
    .replace(/_+/g, "_") // แทนที่ _ ซ้อนกันด้วย _ เดียว
    .toLowerCase(); // แปลงเป็นตัวเล็ก

  return `${safeName}_${timestamp}_${random}${extension.toLowerCase()}`;
};

/**
 * สร้างชื่อไฟล์ที่ไม่ซ้ำ (เวอร์ชันเก่า - deprecated)
 * @param {string} originalName - ชื่อไฟล์เดิม
 * @returns {string} - ชื่อไฟล์ใหม่ที่ไม่ซ้ำ
 */
export const generateUniqueFileName = (originalName) => {
  // ใช้ฟังก์ชันใหม่แทน
  return generateSafeFileName(originalName);
};
