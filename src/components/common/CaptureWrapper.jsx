// src/components/common/CaptureWrapper.jsx

import React, { useRef, useState, useEffect } from "react";
import { Camera, Download, Copy, Loader } from "lucide-react";
import {
  captureToImage,
  captureToClipboard,
  captureToDataURL,
} from "../../services/captureService";
import { useNotification } from "../../hooks/useNotification";

/**
 * CaptureWrapper - คอมโพเนนต์ห่อหุ้มเนื้อหาที่ต้องการแคปภาพ
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - เนื้อหาที่ต้องการแคป
 * @param {string} props.filename - ชื่อไฟล์เมื่อบันทึก (ไม่รวมนามสกุล)
 * @param {Object} props.options - ตัวเลือกการแคป (bgColor, styles, etc.)
 * @param {boolean} props.showPreview - แสดงตัวอย่างภาพหรือไม่
 * @param {string} props.className - คลาสเพิ่มเติมสำหรับ wrapper
 * @param {boolean} props.showButtons - แสดงปุ่มควบคุมหรือไม่
 * @param {Function} props.onCapture - callback เมื่อแคปเสร็จ
 */
const CaptureWrapper = ({
  children,
  filename = "captured-image",
  options = {},
  showPreview = false,
  className = "",
  showButtons = true,
  buttonPosition = "top-right",
  onCapture = null,
}) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const captureRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ตรวจสอบการโหลด Font
  // เพิ่มในส่วนต้นของ CaptureButtons.jsx หรือ CaptureWrapper.jsx
  useEffect(() => {
    // เพิ่มการโหลดฟอนต์ Kanit โดยตรง
    if (!document.getElementById("kanit-font")) {
      const link = document.createElement("link");
      link.id = "kanit-font";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&display=swap";
      document.head.appendChild(link);

      // สร้าง preload hint เพื่อเร่งการโหลด
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "font";
      preload.type = "font/woff2";
      preload.href =
        "https://fonts.gstatic.com/s/kanit/v12/nKKZ-Go6G5tXcraVGwCKd6xBDFs.woff2";
      preload.crossOrigin = "anonymous";
      document.head.appendChild(preload);
    }

    // รอให้ฟอนต์โหลดเสร็จก่อนแคป
    const waitForFonts = async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
        const isFontLoaded = document.fonts.check("400 16px 'Kanit'");
        console.log("Kanit font loaded:", isFontLoaded);
      } else {
        // รอสักครู่
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    waitForFonts();
  }, []);

  // แคปเป็นไฟล์รูปภาพ
  const handleCaptureImage = async () => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return;
    }

    setIsCapturing(true);
    showInfo("กำลังสร้างรูปภาพ กรุณารอสักครู่...");

    try {
      await captureToImage(captureRef.current, filename, options);
      showSuccess("บันทึกรูปภาพสำเร็จ");

      if (onCapture) {
        onCapture({ type: "image", success: true });
      }
    } catch (error) {
      showError(`เกิดข้อผิดพลาดในการบันทึกรูปภาพ: ${error.message}`);

      if (onCapture) {
        onCapture({ type: "image", success: false, error });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // แคปและคัดลอกไปยังคลิปบอร์ด
  const handleCaptureClipboard = async () => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return;
    }

    setIsCapturing(true);
    showInfo("กำลังคัดลอกรูปภาพ กรุณารอสักครู่...");

    try {
      await captureToClipboard(captureRef.current, options);
      showSuccess("คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว");

      if (onCapture) {
        onCapture({ type: "clipboard", success: true });
      }
    } catch (error) {
      showError(`เกิดข้อผิดพลาดในการคัดลอกรูปภาพ: ${error.message}`);

      if (onCapture) {
        onCapture({ type: "clipboard", success: false, error });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // สร้างตัวอย่างรูปภาพ
  const handlePreview = async () => {
    if (!captureRef.current || !fontsLoaded) {
      showError("กรุณารอให้องค์ประกอบและฟอนต์โหลดเสร็จก่อน");
      return;
    }

    setIsCapturing(true);

    try {
      const dataUrl = await captureToDataURL(captureRef.current, options);
      setPreviewUrl(dataUrl);

      if (onCapture) {
        onCapture({ type: "preview", success: true, dataUrl });
      }
    } catch (error) {
      showError(`เกิดข้อผิดพลาดในการสร้างตัวอย่าง: ${error.message}`);

      if (onCapture) {
        onCapture({ type: "preview", success: false, error });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // ปิดตัวอย่าง
  const closePreview = () => {
    setPreviewUrl(null);
  };

  // กำหนดตำแหน่งของปุ่ม
  const getButtonPositionClass = () => {
    switch (buttonPosition) {
      case "top-left":
        return "top-2 left-2";
      case "top-right":
        return "top-2 right-2";
      case "bottom-left":
        return "bottom-2 left-2";
      case "bottom-right":
        return "bottom-2 right-2";
      default:
        return "top-2 right-2";
    }
  };

  // สร้างปุ่มควบคุม
  const renderButtons = () => {
    if (!showButtons) return null;

    return (
      <div
        className={`absolute ${getButtonPositionClass()} flex gap-2 p-1 bg-gray-100 bg-opacity-80 rounded-md shadow print:hidden`}
      >
        {showPreview && (
          <button
            onClick={handlePreview}
            disabled={isCapturing}
            className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            title="แสดงตัวอย่าง"
          >
            <Camera size={18} />
          </button>
        )}
        <button
          onClick={handleCaptureImage}
          disabled={isCapturing}
          className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          title="บันทึกเป็นรูปภาพ"
        >
          <Download size={18} />
        </button>
        <button
          onClick={handleCaptureClipboard}
          disabled={isCapturing}
          className="p-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          title="คัดลอกไปยังคลิปบอร์ด"
        >
          <Copy size={18} />
        </button>
      </div>
    );
  };

  // แสดงตัวอย่างรูปภาพ
  const renderPreview = () => {
    if (!previewUrl) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
            <h3 className="font-medium">ตัวอย่างรูปภาพ</h3>
            <button
              onClick={closePreview}
              className="p-1 rounded-full hover:bg-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-auto flex-1">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full h-auto mx-auto"
            />
          </div>
          <div className="border-t p-3 flex justify-end gap-2">
            <button
              onClick={closePreview}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              ปิด
            </button>
            <button
              onClick={handleCaptureImage}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            >
              <Download size={16} className="mr-1" />
              บันทึกรูปภาพ
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* แสดงตัวโหลดเมื่อกำลังแคป */}
      {isCapturing && (
        <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <Loader size={40} className="animate-spin text-blue-500" />
            <p className="mt-2 text-blue-600 font-medium">
              กำลังสร้างรูปภาพ...
            </p>
          </div>
        </div>
      )}

      {/* แสดงปุ่มควบคุม */}
      {renderButtons()}

      {/* แสดงตัวอย่าง */}
      {renderPreview()}

      {/* เนื้อหาที่ต้องการแคป */}
      <div
        ref={captureRef}
        className="capture-content"
        style={{
          fontFamily: "Kanit, sans-serif",
          ...options.contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default CaptureWrapper;
