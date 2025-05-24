import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export const useAlertDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "ตกลง",
    cancelText: "ยกเลิก",
    actionVariant: "primary", // เปลี่ยนค่าเริ่มต้นเป็น primary
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      const newState = {
        isOpen: true,
        title: options.title || "",
        description: options.description || "",
        confirmText: options.confirmText || "ตกลง",
        cancelText: options.cancelText || "ยกเลิก",
        actionVariant: options.actionVariant || "primary", // ใช้ primary ถ้าไม่ระบุ
        onConfirm: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      };

      // Debug ค่า actionVariant
      console.log("showAlert - actionVariant:", newState.actionVariant);

      setDialogState(newState);
    });
  }, []);

  const AlertDialogComponent = useCallback(() => {
    const {
      isOpen,
      title,
      description,
      confirmText,
      cancelText,
      actionVariant,
      onConfirm,
      onCancel,
    } = dialogState;

    if (!isOpen) return null;

    // กำหนดสไตล์สำหรับปุ่มยืนยันตาม actionVariant
    const variantStyles = {
      destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
      success:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-400",
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
      warning:
        "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-400",
      default: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-400",
    };

    const actionClassName = `inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      variantStyles[actionVariant] || variantStyles.primary
    }`;

    // Debug ค่า actionVariant ที่ใช้ใน render
    console.log("AlertDialogComponent - actionVariant:", actionVariant);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>
              {cancelText}
            </AlertDialogCancel>
            <AlertDialogAction className={actionClassName} onClick={onConfirm}>
              {confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [dialogState]);

  return { showAlert, AlertDialogComponent };
};
