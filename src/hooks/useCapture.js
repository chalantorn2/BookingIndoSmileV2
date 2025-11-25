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
 * Hook for using the image capture system in any component
 *
 * @param {Object} options - Capture options
 * @returns {Object} - Functions and state for capturing
 */
const useCapture = (options = {}) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lastCaptureResult, setLastCaptureResult] = useState(null);
  const captureRef = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Check font loading
  useEffect(() => {
    const checkFonts = async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        setFontsLoaded(true);
      } else {
        // Fallback for older browsers
        setTimeout(() => setFontsLoaded(true), 1000);
      }
    };

    checkFonts();

    // Add Prompt font if not loaded yet
    const fontLink = document.querySelector('link[href*="Prompt"]');
    if (!fontLink) {
      const link = document.createElement("link");
      link.href =
        "https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  /**
   * Capture image and save as file
   * @param {string} filename - Filename for saving
   * @param {Object} captureOptions - Additional capture options
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
   * Capture image and copy to clipboard
   * @param {Object} captureOptions - Additional capture options
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
   * Create image preview
   * @param {Object} captureOptions - Additional capture options
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
   * Clear image preview
   */
  const clearPreview = () => {
    setPreviewUrl(null);
  };

  /**
   * Trigger print
   */
  const print = () => {
    window.print();
    return { success: true, type: "print" };
  };

  /**
   * Capture image with advanced options
   * @param {Object} advancedOptions - Advanced capture options
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
