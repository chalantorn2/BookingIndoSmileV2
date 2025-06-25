import supabase from "../config/supabaseClient";

/**
 * ตรวจสอบข้อมูลซ้ำก่อนเพิ่ม
 * @param {string} category - ประเภทข้อมูล
 * @param {string} value - ค่าข้อมูล
 * @param {number} excludeId - ID ที่ต้องการยกเว้น (สำหรับการแก้ไข)
 * @returns {Promise<{exists: boolean, existingRecord: Object|null, error: string|null}>}
 */
export const checkDuplicateValue = async (
  category,
  value,
  excludeId = null
) => {
  try {
    console.log(
      `🔍 Checking duplicate for category: ${category}, value: "${value}"`
    );

    if (!category || !value?.trim()) {
      return { exists: false, existingRecord: null, error: null };
    }

    // ทำการ normalize ข้อมูลก่อนตรวจสอบ
    const normalizedValue = value.trim();

    let query = supabase
      .from("information")
      .select("*")
      .eq("category", category)
      .eq("active", true);

    // ตรวจสอบแบบ case-insensitive
    query = query.ilike("value", normalizedValue);

    // ถ้ามี excludeId ให้ยกเว้น record นั้นออก (สำหรับการแก้ไข)
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error checking duplicate:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    // ตรวจสอบว่ามีข้อมูลที่ตรงกันแน่นอนหรือไม่
    const exactMatch = data?.find(
      (record) =>
        record.value.toLowerCase().trim() === normalizedValue.toLowerCase()
    );

    if (exactMatch) {
      console.log("⚠️ Duplicate found:", exactMatch);
      return {
        exists: true,
        existingRecord: exactMatch,
        error: null,
      };
    }

    console.log("✅ No duplicate found");
    return { exists: false, existingRecord: null, error: null };
  } catch (error) {
    console.error("💥 Exception in checkDuplicateValue:", error);
    return { exists: false, existingRecord: null, error: error.message };
  }
};

/**
 * ดึงข้อมูลทั้งหมดจากตาราง information
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export const fetchAllInformation = async () => {
  try {
    console.log("🔍 Fetching all information...");

    const { data, error } = await supabase
      .from("information")
      .select("*")
      .order("category")
      .order("value");

    if (error) {
      console.error("❌ Error fetching all information:", error);
      throw new Error(`Failed to fetch all information: ${error.message}`);
    }

    console.log(
      "✅ Successfully fetched all information:",
      data?.length,
      "records"
    );
    return { data: data || [], error: null };
  } catch (error) {
    console.error("💥 Exception in fetchAllInformation:", error);
    return { data: [], error: error.message };
  }
};

/**
 * ดึงข้อมูลตาม category
 * @param {string} category - ประเภทข้อมูล
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export const fetchInformationByCategory = async (category) => {
  try {
    console.log(`🔍 Fetching information for category: ${category}`);

    if (!category) {
      throw new Error("Category is required");
    }

    const { data, error } = await supabase
      .from("information")
      .select("*")
      .eq("category", category)
      .eq("active", true)
      .order("value");

    if (error) {
      console.error(`❌ Error fetching ${category} information:`, error);
      throw new Error(
        `Failed to fetch ${category} information: ${error.message}`
      );
    }

    console.log(
      `✅ Successfully fetched ${category} information:`,
      data?.length,
      "records"
    );
    return { data: data || [], error: null };
  } catch (error) {
    console.error(
      `💥 Exception in fetchInformationByCategory for ${category}:`,
      error
    );
    return { data: [], error: error.message };
  }
};

/**
 * เพิ่มข้อมูลใหม่พร้อมตรวจสอบความซ้ำ
 * @param {Object} informationData - ข้อมูลที่ต้องการเพิ่ม
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export const addInformation = async (informationData) => {
  try {
    console.log("🔍 Adding new information:", informationData);

    // Validate required fields
    if (!informationData.category) {
      throw new Error("Category is required");
    }
    if (!informationData.value || !informationData.value.trim()) {
      throw new Error("Value is required");
    }

    // ตรวจสอบข้อมูลซ้ำก่อน
    const duplicateCheck = await checkDuplicateValue(
      informationData.category,
      informationData.value
    );

    if (duplicateCheck.error) {
      throw new Error(`Duplicate check failed: ${duplicateCheck.error}`);
    }

    if (duplicateCheck.exists) {
      throw new Error(
        `ข้อมูล "${informationData.value}" มีอยู่ในระบบแล้วในประเภท "${informationData.category}"`
      );
    }

    // Prepare data for insertion
    const dataToInsert = {
      category: informationData.category.trim(),
      value: informationData.value.trim(),
      description: informationData.description?.trim() || "",
      phone: informationData.phone?.trim() || "",
      active: informationData.active !== false, // default to true
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("📝 Data to insert:", dataToInsert);

    const { data, error } = await supabase
      .from("information")
      .insert(dataToInsert)
      .select()
      .single();

    if (error) {
      console.error("❌ Database error while adding information:", error);

      // จัดการ error ที่เฉพาะเจาะจง
      if (error.code === "23505") {
        // Unique constraint violation
        throw new Error(`ข้อมูล "${informationData.value}" มีอยู่ในระบบแล้ว`);
      }

      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.error("❌ No data returned after insert");
      throw new Error("No data returned from database after insert");
    }

    console.log("✅ Successfully added information:", data);
    return { data, error: null };
  } catch (error) {
    console.error("💥 Exception in addInformation:", error);
    return { data: null, error: error.message };
  }
};

/**
 * อัปเดตข้อมูลพร้อมตรวจสอบความซ้ำ
 * @param {number} id - ID ของข้อมูล
 * @param {Object} updatedData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, data: Object|null, error: Object|null}>}
 */
export const updateInformation = async (id, updatedData) => {
  try {
    console.log(`🔍 Updating information ID ${id}:`, updatedData);

    // Validate ID
    if (!id) {
      throw new Error("ID is required for update");
    }

    // ถ้ามีการเปลี่ยน value ให้ตรวจสอบความซ้ำ
    if (updatedData.value) {
      // ดึงข้อมูลเดิมก่อน
      const { data: currentData, error: fetchError } = await supabase
        .from("information")
        .select("category, value")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current data: ${fetchError.message}`);
      }

      // ตรวจสอบว่า value เปลี่ยนแปลงหรือไม่
      if (currentData.value.trim() !== updatedData.value.trim()) {
        const duplicateCheck = await checkDuplicateValue(
          currentData.category,
          updatedData.value,
          id // ยกเว้น record ปัจจุบัน
        );

        if (duplicateCheck.error) {
          throw new Error(`Duplicate check failed: ${duplicateCheck.error}`);
        }

        if (duplicateCheck.exists) {
          throw new Error(
            `ข้อมูล "${updatedData.value}" มีอยู่ในระบบแล้วในประเภท "${currentData.category}"`
          );
        }
      }
    }

    // Prepare data for update
    const dataToUpdate = {
      ...updatedData,
      updated_at: new Date().toISOString(),
    };

    // Trim string values
    if (dataToUpdate.value) {
      dataToUpdate.value = dataToUpdate.value.trim();
    }
    if (dataToUpdate.description) {
      dataToUpdate.description = dataToUpdate.description.trim();
    }
    if (dataToUpdate.phone) {
      dataToUpdate.phone = dataToUpdate.phone.trim();
    }

    // Remove undefined values
    Object.keys(dataToUpdate).forEach((key) => {
      if (dataToUpdate[key] === undefined) {
        delete dataToUpdate[key];
      }
    });

    console.log("📝 Data to update:", dataToUpdate);

    const { data, error } = await supabase
      .from("information")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        `❌ Database error while updating information ID ${id}:`,
        error
      );

      // จัดการ error ที่เฉพาะเจาะจง
      if (error.code === "23505") {
        // Unique constraint violation
        throw new Error(`ข้อมูล "${updatedData.value}" มีอยู่ในระบบแล้ว`);
      }

      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Successfully updated information ID ${id}:`, data);
    return { success: true, data, error: null };
  } catch (error) {
    console.error(`💥 Exception in updateInformation for ID ${id}:`, error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * ลบข้อมูล (soft delete โดยการตั้งค่า active = false)
 * @param {number} id - ID ของข้อมูล
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export const deactivateInformation = async (id) => {
  try {
    console.log(`🔍 Deactivating information ID ${id}`);

    // Validate ID
    if (!id) {
      throw new Error("ID is required for deactivation");
    }

    const { data, error } = await supabase
      .from("information")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        `❌ Database error while deactivating information ID ${id}:`,
        error
      );
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Successfully deactivated information ID ${id}:`, data);
    return { success: true, error: null };
  } catch (error) {
    console.error(`💥 Exception in deactivateInformation for ID ${id}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * ตรวจสอบการเชื่อมต่อฐานข้อมูล
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const testDatabaseConnection = async () => {
  try {
    console.log("🔍 Testing database connection...");

    const { data, error } = await supabase
      .from("information")
      .select("count(*)")
      .limit(1);

    if (error) {
      console.error("❌ Database connection test failed:", error);
      throw new Error(`Database connection test failed: ${error.message}`);
    }

    console.log("✅ Database connection test successful");
    return { success: true, error: null };
  } catch (error) {
    console.error("💥 Database connection test exception:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงข้อมูลตาม category พร้อม search และ pagination
 * @param {string} category - ประเภทข้อมูล
 * @param {string} searchQuery - คำค้นหา
 * @param {number} page - หน้าที่ต้องการ (เริ่มจาก 1)
 * @param {number} limit - จำนวนรายการต่อหน้า
 * @returns {Promise<{data: Array, total: number, totalPages: number, error: Object|null}>}
 */
export const searchInformationByCategory = async (
  category,
  searchQuery = "",
  page = 1,
  limit = 10
) => {
  try {
    console.log(
      `🔍 Searching ${category} - Query: "${searchQuery}", Page: ${page}, Limit: ${limit}`
    );

    if (!category) {
      throw new Error("Category is required");
    }

    // สร้าง query พื้นฐาน
    let query = supabase
      .from("information")
      .select("*", { count: "exact" })
      .eq("category", category)
      .eq("active", true);

    // เพิ่มเงื่อนไขการค้นหา
    if (searchQuery.trim()) {
      query = query.or(
        `value.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
      );
    }

    // คำนวณ offset สำหรับ pagination
    const offset = (page - 1) * limit;

    // Execute query พร้อม pagination
    const { data, error, count } = await query
      .order("value")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`❌ Error searching ${category}:`, error);
      throw new Error(`Failed to search ${category}: ${error.message}`);
    }

    const totalPages = Math.ceil(count / limit);

    console.log(
      `✅ Found ${count} total records, showing page ${page}/${totalPages}`
    );

    return {
      data: data || [],
      total: count || 0,
      totalPages,
      error: null,
    };
  } catch (error) {
    console.error(`💥 Exception in searchInformationByCategory:`, error);
    return {
      data: [],
      total: 0,
      totalPages: 0,
      error: error.message,
    };
  }
};

/**
 * หาข้อมูลที่อาจซ้ำกัน
 * @param {string} category - ประเภทข้อมูล
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const findPotentialDuplicates = async (category) => {
  try {
    console.log(`🔍 Finding potential duplicates for category: ${category}`);

    const { data, error } = await supabase
      .from("information")
      .select("*")
      .eq("category", category)
      .eq("active", true)
      .order("value");

    if (error) throw error;

    // หาข้อมูลที่อาจซ้ำกัน (similar strings)
    const potentialDuplicates = [];
    const processed = new Set();

    for (let i = 0; i < data.length; i++) {
      if (processed.has(data[i].id)) continue;

      const group = [data[i]];
      const normalized1 = data[i].value.toLowerCase().trim();

      for (let j = i + 1; j < data.length; j++) {
        if (processed.has(data[j].id)) continue;

        const normalized2 = data[j].value.toLowerCase().trim();

        // เช็คความคล้ายกัน
        if (
          normalized1 === normalized2 || // เหมือนกันเป็นนดเดียว
          normalized1.includes(normalized2) || // อันหนึ่งรวมอีกอันหนึ่ง
          normalized2.includes(normalized1) ||
          levenshteinDistance(normalized1, normalized2) <= 2 // ใกล้เคียงกัน
        ) {
          group.push(data[j]);
          processed.add(data[j].id);
        }
      }

      if (group.length > 1) {
        potentialDuplicates.push(group);
      }
      processed.add(data[i].id);
    }

    return { data: potentialDuplicates, error: null };
  } catch (error) {
    console.error("Error finding potential duplicates:", error);
    return { data: [], error: error.message };
  }
};

// Helper function สำหรับคำนวณ Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
