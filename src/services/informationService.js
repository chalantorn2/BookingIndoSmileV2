import supabase from "../config/supabaseClient";

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
 * เพิ่มข้อมูลใหม่
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
 * อัปเดตข้อมูล
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

    // Prepare data for update
    const dataToUpdate = {
      ...updatedData,
      updated_at: new Date().toISOString(),
    };

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
