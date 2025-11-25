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
      showError("Element not found for capture");
      return;
    }

    setIsCapturing(true);
    showInfo("Creating image, please wait...");

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
        showSuccess("Image saved successfully");
      })
      .catch(function (error) {
        console.error("Capture failed:", error);
        setIsCapturing(false);
        showError("Error capturing image");
      });
  };

  // คัดลอกภาพไปยัง clipboard
  const copyToClipboard = () => {
    if (!targetRef.current) {
      showError("Element not found for capture");
      return;
    }

    setIsCapturing(true);
    showInfo("Copying image, please wait...");

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
            showSuccess("Image copied to clipboard");
          })
          .catch((err) => {
            console.error("Copy to clipboard failed:", err);
            setIsCapturing(false);
            showError("Unable to copy to clipboard");
          });
      })
      .catch(function (error) {
        console.error("Image creation failed:", error);
        setIsCapturing(false);
        showError("Error creating image");
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
          {config.showLabels && <span>Processing</span>}
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
            {config.showLabels && <span>Save</span>}
          </>
        );
      case "copy":
      default:
        return (
          <>
            <Camera size={config.iconSize[size]} className={config.iconClass} />
            {config.showLabels && <span>Capture</span>}
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
          title="Copy to clipboard"
        >
          {isCapturing ? (
            <>
              <Loader
                size={config.iconSize[size]}
                className={`animate-spin ${config.iconClass}`}
              />
              {config.showLabels && <span>Processing</span>}
            </>
          ) : (
            <>
              <Camera
                size={config.iconSize[size]}
                className={config.iconClass}
              />
              {config.showLabels && <span>Copy</span>}
            </>
          )}
        </button>
      )}

      {showDownload && primaryButton !== "download" && (
        <button
          onClick={captureAsImage}
          disabled={isCapturing}
          className={`flex items-center justify-center rounded-md ${config.buttonSize[size]} ${config.secondaryButtonStyle} ${config.hoverEffect}`}
          title="Save as image"
        >
          {isCapturing ? (
            <>
              <Loader
                size={config.iconSize[size]}
                className={`animate-spin ${config.iconClass}`}
              />
              {config.showLabels && <span>Processing</span>}
            </>
          ) : (
            <>
              <Download
                size={config.iconSize[size]}
                className={config.iconClass}
              />
              {config.showLabels && <span>Save</span>}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CaptureButtons;
