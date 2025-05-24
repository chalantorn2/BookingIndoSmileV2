// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import supabase from "../config/supabaseClient";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ตรวจสอบสถานะการล็อกอินเมื่อโหลดแอพ
  useEffect(() => {
    const checkAuthState = async () => {
      setLoading(true);
      try {
        // ดึงข้อมูลผู้ใช้จาก localStorage
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          // ตรวจสอบข้อมูลผู้ใช้กับ Supabase เพื่อยืนยันว่าผู้ใช้ยังมีอยู่และใช้งานได้
          const userData = JSON.parse(storedUser);

          // ตรวจสอบว่าผู้ใช้ยังมีอยู่ในระบบและยังใช้งานได้
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userData.id)
            .eq("active", true)
            .single();

          if (error || !data) {
            // ถ้าไม่พบข้อมูลผู้ใช้หรือผู้ใช้ถูกปิดใช้งาน ให้ล้างข้อมูลการล็อกอิน
            console.log("User session invalid, cleaning up...");
            localStorage.removeItem("user");
            setUser(null);
          } else {
            // อัพเดทข้อมูลผู้ใช้ใหม่ในกรณีที่มีการเปลี่ยนแปลง
            const updatedUserData = {
              id: data.id,
              username: data.username,
              fullname: data.fullname,
              role: data.role,
            };

            localStorage.setItem("user", JSON.stringify(updatedUserData));
            setUser(updatedUserData);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Authentication check error:", error);
        // ในกรณีที่เกิดข้อผิดพลาด ให้ล้างข้อมูลการล็อกอินเพื่อความปลอดภัย
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // ฟังก์ชัน login
  const login = async (username, password, rememberMe = false) => {
    try {
      setLoading(true);
      // ค้นหาผู้ใช้ด้วย username และ password
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("active", true)
        .single();

      if (error) throw error;
      if (!data) throw new Error("ไม่พบชื่อผู้ใช้");

      // ตรวจสอบรหัสผ่าน (ใช้ bcrypt ใน production)
      const { data: passwordValid, error: pwdError } = await supabase.rpc(
        "verify_password",
        {
          password_input: password,
          password_hash: data.password_hash,
        }
      );

      if (pwdError) throw pwdError;
      if (!passwordValid) throw new Error("รหัสผ่านไม่ถูกต้อง");

      // สร้างออบเจ็คผู้ใช้ไม่รวมรหัสผ่าน
      const userData = {
        id: data.id,
        username: data.username,
        fullname: data.fullname,
        role: data.role,
      };

      // บันทึกข้อมูลลง localStorage
      localStorage.setItem("user", JSON.stringify(userData));

      // เพิ่มเติม: บันทึกการจดจำชื่อผู้ใช้ถ้า rememberMe = true
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }

      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชัน logout
  const logout = () => {
    localStorage.removeItem("user");
    // ไม่ลบ rememberedUsername เพื่อให้จำชื่อผู้ใช้ไว้สำหรับการเข้าสู่ระบบครั้งถัดไป
    setUser(null);
  };

  // ฟังก์ชันตรวจสอบสิทธิ์
  const checkPermission = (requiredRole) => {
    if (!user) return false;

    // ถ้าเป็น Dev สามารถเข้าถึงได้ทุกส่วน
    if (user.role === "dev") return true;

    // ถ้าต้องการสิทธิ์ Admin และผู้ใช้เป็น Admin
    if (requiredRole === "admin" && user.role === "admin") return true;

    // ถ้าต้องการสิทธิ์ Admin แต่เป็น User ให้กลับ false
    if (requiredRole === "admin" && user.role === "user") return false;

    // กรณีอื่นๆ (ไม่ต้องการสิทธิ์พิเศษ)
    return true;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
