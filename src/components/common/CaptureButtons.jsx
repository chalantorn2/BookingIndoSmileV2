import React, { useState } from "react";
import { Camera, Download, Copy, Loader } from "lucide-react";
import domtoimage from "dom-to-image";
import { useNotification } from "../../hooks/useNotification";

// การตั้งค่าสำหรับ BookingList
const bookingListConfig = {
  showLabels: false, // ไม่แสดงข้อความ
  primaryButtonStyle: "bg-gray-500 text-white hover:bg-gray-700 shadow-lg",
  secondaryButtonStyle: "bg-gray-300 text-gray-800 hover:bg-gray-400 shadow-md",
  buttonSize: {
    sm: "p-1",
    md: "p-2",
    lg: "p-3",
  },
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  iconClass: "", // ไม่มี mr-1 สำหรับไอคอน
  hoverEffect: "transform hover:scale-105 transition-transform",
};

// การตั้งค่าสำหรับ Home
const homeConfig = {
  showLabels: true, // แสดงข้อความ
  primaryButtonStyle: "bg-gray-500 text-white hover:bg-gray-700", // ไม่มีเงา
  secondaryButtonStyle: "bg-gray-300 text-gray-800 hover:bg-gray-400", // ไม่มีเงา
  buttonSize: {
    sm: "p-2 text-base",
    md: "p-2",
    lg: "p-3 text-lg",
  },
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  iconClass: "mr-1", // มี mr-1 สำหรับไอคอน
  hoverEffect: "transform hover:scale-105 transition-transform",
};

const CaptureButtons = ({
  targetRef,
  filename = "captured-image",
  layout = "row",
  size = "md",
  variant = "default",
  primaryButton = "copy",
  showDownload = true,
  showCopy = true,
  className = "",
  options = {},
  context = "home",
}) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isCapturing, setIsCapturing] = useState(false);

  // เลือก config ตาม context
  const config = context === "bookingList" ? bookingListConfig : homeConfig;

  // แคปเป็นไฟล์รูปภาพ
  const captureAsImage = () => {
    if (!targetRef.current) {
      showError("ไม่พบองค์ประกอบสำหรับแคปภาพ");
      return;
    }

    setIsCapturing(true);
    showInfo("กำลังสร้างรูปภาพ กรุณารอสักครู่...");

    const scale = options.scale || 2;
    const style = {
      transform: "scale(" + scale + ")",
      transformOrigin: "top left",
      width: targetRef.current.offsetWidth + "px",
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
      backgroundColor: options.bgColor || "#ffffff",
      ...options.styles,
    };

    const param = {
      height: targetRef.current.offsetHeight * scale,
      width: targetRef.current.offsetWidth * scale,
      quality: options.quality || 1,
      style,
      cacheBust: true,
    };

    domtoimage
      .toBlob(targetRef.current, param)
      .then(function (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setIsCapturing(false);
        showSuccess("บันทึกภาพเรียบร้อยแล้ว");
      })
      .catch(function (error) {
        console.error("แคปภาพไม่สำเร็จ:", error);
        setIsCapturing(false);
        showError("เกิดข้อผิดพลาดในการแคปภาพ");
      });
  };

  // คัดลอกภาพไปยัง clipboard
  const copyToClipboard = () => {
    if (!targetRef.current) {
      showError("ไม่พบองค์ประกอบสำหรับแคปภาพ");
      return;
    }

    setIsCapturing(true);
    showInfo("กำลังคัดลอกรูปภาพ กรุณารอสักครู่...");

    const scale = options.scale || 2;
    const style = {
      transform: "scale(" + scale + ")",
      transformOrigin: "top left",
      width: targetRef.current.offsetWidth + "px",
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
      backgroundColor: options.bgColor || "#ffffff",
      ...options.styles,
    };

    const param = {
      height: targetRef.current.offsetHeight * scale,
      width: targetRef.current.offsetWidth * scale,
      quality: options.quality || 1,
      style,
      cacheBust: true,
    };

    domtoimage
      .toBlob(targetRef.current, param)
      .then(function (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard
          .write([item])
          .then(() => {
            setIsCapturing(false);
            showSuccess("คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว");
          })
          .catch((err) => {
            console.error("คัดลอกไปยังคลิปบอร์ดไม่สำเร็จ:", err);
            setIsCapturing(false);
            showError("ไม่สามารถคัดลอกไปยังคลิปบอร์ดได้");
          });
      })
      .catch(function (error) {
        console.error("สร้างรูปภาพไม่สำเร็จ:", error);
        setIsCapturing(false);
        showError("เกิดข้อผิดพลาดในการสร้างรูปภาพ");
      });
  };

  // เลือกฟังก์ชันหลักตาม primaryButton
  const getPrimaryFunction = () => {
    switch (primaryButton) {
      case "download":
        return captureAsImage;
      case "copy":
      default:
        return copyToClipboard;
    }
  };

  // เลือกไอคอนและข้อความหลักตาม primaryButton
  const getPrimaryContent = () => {
    if (isCapturing) {
      return (
        <>
          <Loader
            size={config.iconSize[size]}
            className={`animate-spin ${config.iconClass}`}
          />
          {config.showLabels && <span>กำลังดำเนินการ</span>}
        </>
      );
    }

    switch (primaryButton) {
      case "download":
        return (
          <>
            <Download
              size={config.iconSize[size]}
              className={config.iconClass}
            />
            {config.showLabels && <span>บันทึก</span>}
          </>
        );
      case "copy":
      default:
        return (
          <>
            <Camera size={config.iconSize[size]} className={config.iconClass} />
            {config.showLabels && <span>แคปภาพ</span>}
          </>
        );
    }
  };

  return (
    <div
      className={`flex ${
        layout === "row" ? "flex-row" : "flex-col"
      } gap-1 ${className}`}
    >
      {/* ปุ่มหลัก */}
      <button
        onClick={getPrimaryFunction()}
        disabled={isCapturing}
        className={`flex items-center justify-center rounded-md ${config.buttonSize[size]} ${config.primaryButtonStyle} ${config.hoverEffect}`}
      >
        {getPrimaryContent()}
      </button>

      {/* ปุ่มอื่นๆ */}
      {showCopy && primaryButton !== "copy" && (
        <button
          onClick={copyToClipboard}
          disabled={isCapturing}
          className={`flex items-center justify-center rounded-md ${config.buttonSize[size]} ${config.secondaryButtonStyle} ${config.hoverEffect}`}
          title="คัดลอกไปคลิปบอร์ด"
        >
          {isCapturing ? (
            <>
              <Loader
                size={config.iconSize[size]}
                className={`animate-spin ${config.iconClass}`}
              />
              {config.showLabels && <span>กำลังดำเนินการ</span>}
            </>
          ) : (
            <>
              <Camera
                size={config.iconSize[size]}
                className={config.iconClass}
              />
              {config.showLabels && <span>คัดลอก</span>}
            </>
          )}
        </button>
      )}

      {showDownload && primaryButton !== "download" && (
        <button
          onClick={captureAsImage}
          disabled={isCapturing}
          className={`flex items-center justify-center rounded-md ${config.buttonSize[size]} ${config.secondaryButtonStyle} ${config.hoverEffect}`}
          title="บันทึกเป็นรูปภาพ"
        >
          {isCapturing ? (
            <>
              <Loader
                size={config.iconSize[size]}
                className={`animate-spin ${config.iconClass}`}
              />
              {config.showLabels && <span>กำลังดำเนินการ</span>}
            </>
          ) : (
            <>
              <Download
                size={config.iconSize[size]}
                className={config.iconClass}
              />
              {config.showLabels && <span>บันทึก</span>}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CaptureButtons;
