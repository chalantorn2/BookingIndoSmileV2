import React, { useState, useEffect } from "react";
import { X, Save, User, Eye, EyeOff } from "lucide-react";
import { validatePassword } from "../../utils/passwordUtils";
import { useAuth } from "../../contexts/AuthContext"; // เพิ่มการ import useAuth

const UserForm = ({ user, onSave, onClose }) => {
  const { user: currentUser } = useAuth(); // เพิ่มการเรียกใช้ useAuth
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullname: "",
    role: "user",
    active: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ถ้ามีข้อมูลผู้ใช้ส่งมา (กรณีแก้ไข)
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        password: "",
        confirmPassword: "",
        fullname: user.fullname || "",
        role: user.role || "user",
        active: user.active !== false,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // จัดการกับค่า active เป็นกรณีพิเศษ
    if (name === "active") {
      const boolValue = value === "true";
      console.log(`Setting active to: ${value} (${boolValue})`);
      setFormData({ ...formData, [name]: boolValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // ล้าง error เมื่อผู้ใช้แก้ไข
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // ตรวจสอบชื่อผู้ใช้
    if (!formData.username.trim()) {
      newErrors.username = "กรุณากรอกชื่อผู้ใช้";
    } else if (formData.username.length < 3) {
      newErrors.username = "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร";
    }

    // ตรวจสอบรหัสผ่าน (เฉพาะเมื่อเพิ่มผู้ใช้ใหม่)
    if (!user) {
      const { isValid, errors: passwordErrors } = validatePassword(
        formData.password,
        formData.confirmPassword,
        true
      );
      if (!isValid) {
        Object.assign(newErrors, passwordErrors);
      }
    }

    // ตรวจสอบชื่อ-นามสกุล
    if (!formData.fullname.trim()) {
      newErrors.fullname = "กรุณากรอกชื่อ-นามสกุล";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // สร้างข้อมูลที่จะส่งไป
      const userData = {
        username: formData.username,
        fullname: formData.fullname,
        role: formData.role,
        active: formData.active, // เพิ่มค่า active!
      };

      // เพิ่มรหัสผ่านเฉพาะเมื่อเพิ่มผู้ใช้ใหม่
      if (!user && formData.password) {
        userData.password = formData.password;
      }

      console.log("Form data before submit:", formData);
      console.log(
        "Active status type:",
        typeof formData.active,
        "value:",
        formData.active
      );

      // ส่งค่า formData ที่แปลงเป็น boolean ชัดเจนแล้ว
      const dataToSave = {
        ...formData,
        active: Boolean(formData.active), // แปลงให้เป็น boolean ชัดเจน
      };
      console.log("Data to save:", dataToSave);
      await onSave(userData, user ? user.id : null);

      // รีเซ็ตฟอร์ม
      if (!user) {
        setFormData({
          username: "",
          password: "",
          confirmPassword: "",
          fullname: "",
          role: "user",
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setLoading(false);
    }
  };

  // ตรวจสอบบทบาทของผู้ใช้ปัจจุบัน สำหรับการแสดงตัวเลือกที่เหมาะสม
  const renderRoleOptions = () => {
    // ถ้าผู้ใช้ปัจจุบันเป็น dev สามารถเลือกได้ทุกบทบาท
    if (currentUser.role === "dev") {
      return (
        <>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="dev">Developer</option>
        </>
      );
    } else if (currentUser.role === "admin") {
      // ถ้าเป็น admin สามารถเลือกได้แค่ user
      return <option value="user">User</option>;
    } else {
      // กรณีอื่นๆ ไม่ควรแก้ไข role ได้เลย
      return (
        <option value={formData.role}>
          {formData.role === "user"
            ? "User"
            : formData.role === "admin"
            ? "Admin"
            : formData.role === "dev"
            ? "Developer"
            : formData.role}
        </option>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {user ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อผู้ใช้ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={user != null} // ไม่ให้แก้ไขชื่อผู้ใช้ถ้าเป็นการแก้ไข
                  className={`pl-10 w-full p-2 border rounded-md ${
                    errors.username
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  } focus:outline-none focus:ring-2 ${
                    user ? "bg-gray-100" : ""
                  }`}
                  placeholder="ชื่อผู้ใช้"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-500">{errors.username}</p>
                )}
              </div>
            </div>
            {!user && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2 pr-10`}
                    placeholder="รหัสผ่าน"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-9 text-gray-500 hover:text-gray-700"
                    title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.confirmPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    } focus:outline-none focus:ring-2 pr-10`}
                    placeholder="ยืนยันรหัสผ่าน"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-9 text-gray-500 hover:text-gray-700"
                    title={
                      showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อ-นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${
                  errors.fullname
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } focus:outline-none focus:ring-2`}
                placeholder="ชื่อ-นามสกุล"
              />
              {errors.fullname && (
                <p className="mt-1 text-xs text-red-500">{errors.fullname}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ระดับสิทธิ์ <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={
                  currentUser.role !== "dev" &&
                  user &&
                  (user.role === "admin" || user.role === "dev")
                }
              >
                {renderRoleOptions()}
              </select>
              {currentUser.role === "admin" && (
                <p className="mt-1 text-xs text-gray-500">
                  Admin สามารถกำหนดได้เฉพาะสิทธิ์ User เท่านั้น
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สถานะผู้ใช้
              </label>
              <select
                name="active"
                value={formData.active === true ? "true" : "false"}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">ใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" /> บันทึก
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
