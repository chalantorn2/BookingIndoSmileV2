// src/contexts/AlertDialogContext.jsx
import React, { createContext, useContext } from "react";
import { useAlertDialog } from "../hooks/useAlertDialog";

// สร้าง Context
const AlertDialogContext = createContext(null);

/**
 * Provider สำหรับ Alert Dialog
 * ใช้งานคล้ายกับ ConfirmProvider ของ material-ui-confirm
 */
export const AlertDialogProvider = ({ children }) => {
  const { showAlert, AlertDialogComponent } = useAlertDialog();

  return (
    <AlertDialogContext.Provider value={{ showAlert }}>
      {children}
      <AlertDialogComponent />
    </AlertDialogContext.Provider>
  );
};

/**
 * Hook สำหรับใช้งาน Alert Dialog ใน component
 * ใช้งานคล้ายกับ useConfirm ของ material-ui-confirm
 *
 * @returns {Function} showAlert - ฟังก์ชันสำหรับแสดง Alert Dialog และรอการตัดสินใจของผู้ใช้
 */
export const useAlertDialogContext = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "useAlertDialogContext must be used within an AlertDialogProvider"
    );
  }
  return context.showAlert;
};
