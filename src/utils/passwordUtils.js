export const validatePassword = (
  password,
  confirmPassword,
  isNewUser = false
) => {
  const errors = {};

  // ตรวจสอบรหัสผ่าน (สำหรับเพิ่มผู้ใช้ใหม่ หรือเมื่อกรอกรหัสผ่าน)
  if (isNewUser || password) {
    if (isNewUser && !password) {
      errors.password = "กรุณากรอกรหัสผ่าน";
    } else if (password && password.length < 6) {
      errors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
