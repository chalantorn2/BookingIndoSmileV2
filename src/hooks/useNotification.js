// src/hooks/useNotification.js
import { useSnackbar } from "notistack";

export const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showSuccess = (message) => {
    enqueueSnackbar(message, {
      variant: "success",
      autoHideDuration: 3000,
    });
  };

  const showError = (message) => {
    enqueueSnackbar(message, {
      variant: "error",
      autoHideDuration: 5000,
    });
  };

  const showInfo = (message) => {
    enqueueSnackbar(message, {
      variant: "info",
      autoHideDuration: 3000,
    });
  };

  const showWarning = (message) => {
    enqueueSnackbar(message, {
      variant: "warning",
      autoHideDuration: 4000,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    closeSnackbar,
  };
};
