// src/services/authService.js
import supabase from "../config/supabaseClient";

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const fetchAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("username");

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { data: [], error: error.message };
  }
};

/**
 * สร้างผู้ใช้ใหม่
 * @param {Object} userData ข้อมูลผู้ใช้
 * @returns {Promise<{success: boolean, data: Object|null, error: string|null}>}
 */
export const createUser = async (userData) => {
  try {
    // ตรวจสอบว่า username ซ้ำหรือไม่
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", userData.username)
      .single();

    if (existingUser) {
      return {
        success: false,
        data: null,
        error: "ชื่อผู้ใช้นี้มีในระบบแล้ว",
      };
    }

    // เข้ารหัสรหัสผ่าน (ใช้ Supabase Function)
    const { data: passwordHash, error: hashError } = await supabase.rpc(
      "hash_password",
      { password: userData.password }
    );

    if (hashError) throw hashError;

    // เตรียมข้อมูลผู้ใช้พร้อม hash
    const newUser = {
      username: userData.username,
      password_hash: passwordHash,
      fullname: userData.fullname || "",
      role: userData.role || "user",
      active: true,
      created_at: new Date().toISOString(),
    };

    // บันทึกข้อมูลผู้ใช้
    const { data, error } = await supabase
      .from("users")
      .insert(newUser)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data, error: null };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * อัปเดตข้อมูลผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @param {Object} userData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
// ในฟังก์ชัน updateUser ในไฟล์ authService.js
export const updateUser = async (userId, userData) => {
  try {
    console.log("Updating user with data:", userData); // เพิ่ม log

    const updates = {
      fullname: userData.fullname,
      role: userData.role,
      active: userData.active, // ต้องเป็น boolean แล้ว
      updated_at: new Date().toISOString(),
    };

    console.log("Final update payload:", updates); // เพิ่ม log

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
};

/**
 * เปลี่ยนรหัสผ่านผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} newPassword - รหัสผ่านใหม่
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const changePassword = async (userId, newPassword) => {
  try {
    // เข้ารหัสรหัสผ่านใหม่
    const { data: passwordHash, error: hashError } = await supabase.rpc(
      "hash_password",
      { password: newPassword }
    );

    if (hashError) throw hashError;

    // อัปเดตรหัสผ่าน
    const { error } = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบหรือปิดการใช้งานผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @param {boolean} softDelete - ถ้าเป็น true จะเป็นการปิดการใช้งานแทนที่จะลบ
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteUser = async (userId, softDelete = true) => {
  try {
    let result;

    if (softDelete) {
      // ปิดการใช้งานแทนที่จะลบจริง
      result = await supabase
        .from("users")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      // ลบจริง
      result = await supabase.from("users").delete().eq("id", userId);
    }

    if (result.error) throw result.error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
};
