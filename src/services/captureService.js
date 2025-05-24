// src/services/captureService.js
import domtoimage from "dom-to-image";
import { saveAs } from "file-saver";

/**
 * ตรวจสอบว่า Font ถูกโหลดแล้วหรือไม่
 * @param {string} fontFamily - ชื่อ Font ที่ต้องการตรวจสอบ
 * @returns {Promise<boolean>} - สถานะการโหลด Font
 */
// ปรับปรุงฟังก์ชัน checkFontLoaded ใน captureService.js
const checkFontLoaded = async (fontFamily = "Prompt") => {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.check) {
      // ลองตรวจสอบด้วยหลายขนาดและหลายน้ำหนัก
      const weights = ["400", "700"];
      let allLoaded = true;

      weights.forEach((weight) => {
        if (!document.fonts.check(`${weight} 12px "${fontFamily}"`)) {
          allLoaded = false;
        }
      });

      if (allLoaded) {
        resolve(true);
        return;
      }

      // รอให้ฟอนต์โหลดเสร็จโดยใช้ document.fonts.ready
      document.fonts.ready.then(() => {
        resolve(true);
      });
    } else {
      // รอนานขึ้นสำหรับเบราว์เซอร์เก่า
      setTimeout(() => resolve(true), 3000);
    }
  });
};

/**
 * ตรวจสอบว่าสามารถเข้าถึง Clipboard API ได้หรือไม่
 * @returns {boolean} - สถานะการรองรับ Clipboard API
 */
const canUseClipboard = () => {
  return !!(navigator.clipboard && navigator.clipboard.write);
};

/**
 * ปรับแต่ง DOM ก่อนทำการแคป
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {Object} options - ตัวเลือกการปรับแต่ง
 * @returns {HTMLElement} - Element ที่ปรับแต่งแล้ว
 */
const prepareElementForCapture = (element, options = {}) => {
  // Clone element เพื่อไม่ให้กระทบต่อ DOM จริง
  const clonedElement = element.cloneNode(true);

  // กำหนดสไตล์พื้นฐาน
  Object.assign(clonedElement.style, {
    fontFamily: "'Prompt', sans-serif",
    backgroundColor: options.bgColor || "#ffffff",
    width: options.width || `${element.offsetWidth}px`,
    height: options.height || `${element.offsetHeight}px`,
    overflow: "hidden",
    position: "relative",
  });

  // เพิ่มสไตล์อื่นๆ ตามต้องการ
  if (options.styles) {
    Object.assign(clonedElement.style, options.styles);
  }

  return clonedElement;
};

/**
 * สร้าง Blob จาก DOM Element
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {Object} options - ตัวเลือกการแคป
 * @returns {Promise<Blob>} - Blob ของรูปภาพ
 */
const createImageBlob = async (element, options = {}) => {
  // ตรวจสอบว่า Font ถูกโหลดเรียบร้อยแล้ว
  await checkFontLoaded(options.fontFamily || "Prompt");

  // ตั้งค่าสำหรับ domtoimage
  const captureOptions = {
    bgcolor: options.bgColor || "#ffffff",
    style: {
      fontFamily: "'Prompt', sans-serif",
      ...options.styles,
    },
    width: options.width || element.scrollWidth,
    height: options.height || element.scrollHeight,
    quality: options.quality || 1.0,
    cacheBust: true, // ป้องกันการใช้แคชเก่า
    imagePlaceholder:
      "data:image/png;base64,iVBORw0KGoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", // placeholder สำหรับรูปภาพ
    fontEmbedCSS: `
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&display=swap');
    * { font-family: 'Prompt', sans-serif !important; }
  `, // ฝังฟอนต์ CSS
  };

  try {
    return await domtoimage.toBlob(element, captureOptions);
  } catch (error) {
    console.error("Error creating image blob:", error);
    throw new Error(`ไม่สามารถสร้างรูปภาพได้: ${error.message}`);
  }
};

/**
 * แคปภาพและบันทึกเป็นไฟล์
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {string} filename - ชื่อไฟล์สำหรับบันทึก (ไม่รวมนามสกุล)
 * @param {Object} options - ตัวเลือกการแคป
 * @returns {Promise<boolean>} - สถานะความสำเร็จ
 */
export const captureToImage = async (
  element,
  filename = "capture",
  options = {}
) => {
  try {
    await checkFontLoaded(options.fontFamily || "Prompt");

    // ให้เวลาฟอนต์โหลดเพิ่มเติม
    await new Promise((resolve) => setTimeout(resolve, 500));

    // สร้าง inline style ชั่วคราวสำหรับองค์ประกอบที่จะแคป
    const originalStyles = element.getAttribute("style") || "";
    element.setAttribute(
      "style",
      `${originalStyles}; font-family: 'Prompt', sans-serif !important;`
    );

    const blob = await createImageBlob(element, options);
    saveAs(blob, `${filename}.png`);

    // คืนค่า style เดิม
    element.setAttribute("style", originalStyles);

    return true;
  } catch (error) {
    console.error("Error capturing to image:", error);
    throw error;
  }
};
/**
 * แคปภาพและคัดลอกไปยังคลิปบอร์ด
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {Object} options - ตัวเลือกการแคป
 * @returns {Promise<boolean>} - สถานะความสำเร็จ
 */
export const captureToClipboard = async (element, options = {}) => {
  try {
    if (!canUseClipboard()) {
      throw new Error("เบราว์เซอร์นี้ไม่รองรับการคัดลอกรูปภาพไปยังคลิปบอร์ด");
    }

    const blob = await createImageBlob(element, options);
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);

    return true;
  } catch (error) {
    console.error("Error capturing to clipboard:", error);
    throw error;
  }
};

/**
 * แคปภาพและแสดงตัวอย่าง
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {Object} options - ตัวเลือกการแคป
 * @returns {Promise<string>} - Data URL ของรูปภาพ
 */
export const captureToDataURL = async (element, options = {}) => {
  try {
    await checkFontLoaded(options.fontFamily || "Prompt");

    const captureOptions = {
      bgcolor: options.bgColor || "#ffffff",
      style: {
        fontFamily: "'Prompt', sans-serif",
        ...options.styles,
      },
      width: options.width || element.scrollWidth,
      height: options.height || element.scrollHeight,
      quality: options.quality || 1.0,
      cacheBust: true,
    };

    return await domtoimage.toPng(element, captureOptions);
  } catch (error) {
    console.error("Error capturing to data URL:", error);
    throw error;
  }
};

/**
 * แคปภาพด้วยตัวเลือกขั้นสูง
 * @param {HTMLElement} element - DOM Element ที่ต้องการแคป
 * @param {Object} options - ตัวเลือกการแคปขั้นสูง
 * @returns {Promise<Object>} - ผลลัพธ์การแคป (blob, dataURL)
 */
export const captureWithOptions = async (element, options = {}) => {
  try {
    await checkFontLoaded(options.fontFamily || "Prompt");

    // กำหนดตัวเลือกพื้นฐาน
    const captureOptions = {
      bgcolor: options.bgColor || "#ffffff",
      style: {
        fontFamily: "'Prompt', sans-serif",
        ...options.styles,
      },
      width: options.width || element.scrollWidth,
      height: options.height || element.scrollHeight,
      quality: options.quality || 1.0,
      cacheBust: true,
    };

    // สร้าง Blob และ Data URL พร้อมกัน
    const [blob, dataURL] = await Promise.all([
      domtoimage.toBlob(element, captureOptions),
      domtoimage.toPng(element, captureOptions),
    ]);

    // ถ้ามีการระบุให้บันทึกไฟล์
    if (options.saveAs && options.filename) {
      saveAs(blob, `${options.filename}.png`);
    }

    // ถ้ามีการระบุให้คัดลอกไปคลิปบอร์ด
    if (options.copyToClipboard && canUseClipboard()) {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
    }

    return { blob, dataURL };
  } catch (error) {
    console.error("Error in advanced capture:", error);
    throw error;
  }
};

/**
 * ตรวจสอบสภาพแวดล้อมสำหรับการแคปภาพ
 * @returns {Object} - ข้อมูลการรองรับของเบราว์เซอร์
 */
export const checkCaptureEnvironment = () => {
  return {
    domToImageSupported: typeof domtoimage !== "undefined",
    clipboardSupported: canUseClipboard(),
    fileSaverSupported: typeof saveAs === "function",
  };
};

export default {
  captureToImage,
  captureToClipboard,
  captureToDataURL,
  captureWithOptions,
  checkCaptureEnvironment,
};
