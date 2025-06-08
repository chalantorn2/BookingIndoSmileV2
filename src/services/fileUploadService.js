// src/services/fileUploadService.js
import supabase from "../config/supabaseClient";
import { validateFile, generateSafeFileName } from "../utils/fileValidation";

/**
 * อัพโหลดไฟล์ไปยัง Supabase Storage
 * @param {File} file - ไฟล์ที่ต้องการอัพโหลด
 * @param {string} folder - โฟลเดอร์ที่ต้องการเก็บ (default: 'invoices')
 * @returns {Promise<{success: boolean, data: Object|null, error: string|null}>}
 */
export const uploadFile = async (file, folder = "invoices") => {
  try {
    // ตรวจสอบไฟล์ก่อนอัพโหลด
    const validation = validateFile(file, 5); // จำกัด 5MB
    if (!validation.isValid) {
      return { success: false, data: null, error: validation.error };
    }

    // สร้างชื่อไฟล์ที่ปลอดภัย
    const safeFileName = generateSafeFileName(file.name);
    const filePath = `${folder}/${safeFileName}`;

    // อัพโหลดไฟล์พร้อม options เพิ่มเติม
    const { data, error } = await supabase.storage
      .from("invoice-attachments")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        duplex: "half", // เพิ่มสำหรับ browser compatibility
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, data: null, error: error.message };
    }

    // ดึง public URL
    const { data: urlData } = supabase.storage
      .from("invoice-attachments")
      .getPublicUrl(filePath);

    const fileInfo = {
      id: data.id || Date.now().toString(),
      name: file.name,
      originalName: file.name,
      fileName: safeFileName,
      path: filePath,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };

    return { success: true, data: fileInfo, error: null };
  } catch (error) {
    console.error("File upload error:", error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * อัพโหลดไฟล์หลายไฟล์
 * @param {FileList|Array} files - รายการไฟล์ที่ต้องการอัพโหลด
 * @param {string} folder - โฟลเดอร์ที่ต้องการเก็บ
 * @returns {Promise<{success: boolean, data: Array, errors: Array}>}
 */
export const uploadMultipleFiles = async (files, folder = "invoices") => {
  const results = [];
  const errors = [];

  try {
    const uploadPromises = Array.from(files).map(async (file) => {
      const result = await uploadFile(file, folder);

      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }

      return result;
    });

    await Promise.all(uploadPromises);

    return {
      success: errors.length === 0,
      data: results,
      errors,
    };
  } catch (error) {
    console.error("Multiple file upload error:", error);
    return {
      success: false,
      data: [],
      errors: [error.message],
    };
  }
};

/**
 * ลบไฟล์จาก Supabase Storage
 * @param {string} filePath - path ของไฟล์ที่ต้องการลบ
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from("invoice-attachments")
      .remove([filePath]);

    if (error) {
      console.error("Delete file error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Delete file error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบไฟล์หลายไฟล์
 * @param {Array} filePaths - array ของ path ไฟล์ที่ต้องการลบ
 * @returns {Promise<{success: boolean, errors: Array}>}
 */
export const deleteMultipleFiles = async (filePaths) => {
  try {
    const { error } = await supabase.storage
      .from("invoice-attachments")
      .remove(filePaths);

    if (error) {
      console.error("Delete multiple files error:", error);
      return { success: false, errors: [error.message] };
    }

    return { success: true, errors: [] };
  } catch (error) {
    console.error("Delete multiple files error:", error);
    return { success: false, errors: [error.message] };
  }
};

/**
 * ดาวน์โหลดไฟล์
 * @param {string} filePath - path ของไฟล์ที่ต้องการดาวน์โหลด
 * @returns {Promise<{success: boolean, data: Blob|null, error: string|null}>}
 */
export const downloadFile = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from("invoice-attachments")
      .download(filePath);

    if (error) {
      console.error("Download file error:", error);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error("Download file error:", error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * ตรวจสอบว่าไฟล์มีอยู่ใน Storage หรือไม่
 * @param {string} filePath - path ของไฟล์ที่ต้องการตรวจสอบ
 * @returns {Promise<{exists: boolean, error: string|null}>}
 */
export const checkFileExists = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from("invoice-attachments")
      .list("", {
        search: filePath,
      });

    if (error) {
      console.error("Check file exists error:", error);
      return { exists: false, error: error.message };
    }

    const exists = data && data.length > 0;
    return { exists, error: null };
  } catch (error) {
    console.error("Check file exists error:", error);
    return { exists: false, error: error.message };
  }
};

/**
 * ดึงรายการไฟล์ในโฟลเดอร์
 * @param {string} folder - ชื่อโฟลเดอร์
 * @returns {Promise<{success: boolean, data: Array|null, error: string|null}>}
 */
export const listFiles = async (folder = "invoices") => {
  try {
    const { data, error } = await supabase.storage
      .from("invoice-attachments")
      .list(folder);

    if (error) {
      console.error("List files error:", error);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error("List files error:", error);
    return { success: false, data: null, error: error.message };
  }
};
