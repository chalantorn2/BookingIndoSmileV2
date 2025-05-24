// src/hooks/useCapture.js
import { useState, useRef, useEffect } from "react";
import { useNotification } from "./useNotification";
import {
  captureToImage,
  captureToClipboard,
  captureToDataURL,
  captureWithOptions,
} from "../services/captureService";

/**
 * Hook สำหรับการใช้งานระบบแคปภาพในคอมโพเนนต์ใดๆ
 *
 * @param {Object} options - ตัวเลือกการแคป
 * @returns {Object} - ฟังก์ชันและสถานะสำหรับการแคป
 */
const useCapture = (options = {}) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lastCaptureResult, setLastCaptureResult] = useState(null);
  const captureRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ตรวจสอบการโหลด Font
  useEffect(() => {
    const checkFonts = async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        setFontsLoaded(true);
      } else {
        // Fallback สำหรับเบราว์เซอร์เก่า
        setTimeout(() => setFontsLoaded(true), 1000);
      }
    };

    checkFonts();

    // เพิ่ม Font Kanit ถ้ายังไม่ได้โหลด
    const fontLink = document.querySelector('link[href*="Kanit"]');
    if (!fontLink) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  /**
   * แคปภาพและบันทึกเป็นไฟล์
   * @param {string} filename - ชื่อไฟล์สำหรับบันทึก
   * @param {Object} captureOptions - ตัวเลือกการแคปเพิ่มเติม
   */
  const capture = async (filename = "captured-image", captureOptions = {}) => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return null;
    }

    setIsCapturing(true);
    showInfo("กำลังสร้างรูปภาพ กรุณารอสักครู่...");

    try {
      const combinedOptions = { ...options, ...captureOptions };
      await captureToImage(captureRef.current, filename, combinedOptions);
      showSuccess("บันทึกรูปภาพสำเร็จ");

      const result = { success: true, type: "image", filename };
      setLastCaptureResult(result);
      return result;
    } catch (error) {
      const result = { success: false, type: "image", error };
      setLastCaptureResult(result);
      showError(`เกิดข้อผิดพลาดในการบันทึกรูปภาพ: ${error.message}`);
      return result;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * แคปภาพและคัดลอกไปยังคลิปบอร์ด
   * @param {Object} captureOptions - ตัวเลือกการแคปเพิ่มเติม
   */
  const copyToClipboard = async (captureOptions = {}) => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return null;
    }

    setIsCapturing(true);
    showInfo("กำลังคัดลอกรูปภาพ กรุณารอสักครู่...");

    try {
      const combinedOptions = { ...options, ...captureOptions };
      await captureToClipboard(captureRef.current, combinedOptions);
      showSuccess("คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว");

      const result = { success: true, type: "clipboard" };
      setLastCaptureResult(result);
      return result;
    } catch (error) {
      const result = { success: false, type: "clipboard", error };
      setLastCaptureResult(result);
      showError(`เกิดข้อผิดพลาดในการคัดลอกรูปภาพ: ${error.message}`);
      return result;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * สร้างตัวอย่างรูปภาพ
   * @param {Object} captureOptions - ตัวเลือกการแคปเพิ่มเติม
   */
  const createPreview = async (captureOptions = {}) => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return null;
    }

    setIsCapturing(true);

    try {
      const combinedOptions = { ...options, ...captureOptions };
      const dataUrl = await captureToDataURL(
        captureRef.current,
        combinedOptions
      );
      setPreviewUrl(dataUrl);

      const result = { success: true, type: "preview", dataUrl };
      setLastCaptureResult(result);
      return result;
    } catch (error) {
      const result = { success: false, type: "preview", error };
      setLastCaptureResult(result);
      showError(`เกิดข้อผิดพลาดในการสร้างตัวอย่าง: ${error.message}`);
      return result;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * ล้างตัวอย่างรูปภาพ
   */
  const clearPreview = () => {
    setPreviewUrl(null);
  };

  /**
   * สั่งพิมพ์
   */
  const print = () => {
    window.print();
    return { success: true, type: "print" };
  };

  /**
   * แคปภาพด้วยตัวเลือกขั้นสูง
   * @param {Object} advancedOptions - ตัวเลือกการแคปขั้นสูง
   */
  const captureAdvanced = async (advancedOptions = {}) => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return null;
    }

    setIsCapturing(true);
    showInfo("กำลังดำเนินการ กรุณารอสักครู่...");

    try {
      const combinedOptions = { ...options, ...advancedOptions };
      const result = await captureWithOptions(
        captureRef.current,
        combinedOptions
      );

      if (combinedOptions.saveAs) {
        showSuccess("บันทึกรูปภาพสำเร็จ");
      }

      if (combinedOptions.copyToClipboard) {
        showSuccess("คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว");
      }

      if (combinedOptions.preview) {
        setPreviewUrl(result.dataURL);
      }

      setLastCaptureResult({ success: true, type: "advanced", ...result });
      return { success: true, ...result };
    } catch (error) {
      const errorResult = { success: false, type: "advanced", error };
      setLastCaptureResult(errorResult);
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
      return errorResult;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    captureRef,
    isCapturing,
    previewUrl,
    lastCaptureResult,
    fontsLoaded,
    capture,
    copyToClipboard,
    createPreview,
    clearPreview,
    print,
    captureAdvanced,
  };
};

export default useCapture;
