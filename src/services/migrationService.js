import supabase from "../config/supabaseClient";

/**
 * ดึงข้อมูลทั้งหมดใน category เพื่อให้เลือก master และ duplicates
 * @param {string} category - ประเภทข้อมูล
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const getAllInformationByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from("information")
      .select("*")
      .eq("category", category)
      .eq("active", true)
      .order("value");

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error fetching all information:", error);
    return { data: [], error: error.message };
  }
};

/**
 * ตรวจสอบผลกระทบก่อนการ merge
 * @param {number} masterId - ID ของ record หลัก
 * @param {Array} duplicateIds - array ของ duplicate IDs
 * @returns {Promise<{success: boolean, impact: Object, error: string|null}>}
 */
export const previewMergeImpact = async (masterId, duplicateIds) => {
  try {
    console.log(
      `🔍 Previewing merge impact - Master: ${masterId}, Duplicates:`,
      duplicateIds
    );

    // ดึงข้อมูล master และ duplicates
    const { data: allRecords, error } = await supabase
      .from("information")
      .select("*")
      .in("id", [masterId, ...duplicateIds]);

    if (error) throw error;

    const master = allRecords.find((r) => r.id === masterId);
    const duplicates = allRecords.filter((r) => duplicateIds.includes(r.id));

    if (!master) {
      throw new Error("Master record not found");
    }

    // นับจำนวน references ที่จะได้รับผลกระทบ
    let totalImpact = 0;
    const impactDetails = {};

    // ตรวจสอบ orders table
    if (master.category === "agent") {
      // agent_id references (Foreign Key)
      const { count: ordersAgentIdCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("agent_id", [masterId, ...duplicateIds]);

      impactDetails.orders_agent_id = ordersAgentIdCount || 0;
      totalImpact += ordersAgentIdCount || 0;

      // agent_name references (Text Field)
      const duplicateValues = duplicates.map((d) => d.value);
      if (duplicateValues.length > 0) {
        const { count: ordersAgentNameCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("agent_name", duplicateValues);

        impactDetails.orders_agent_name = ordersAgentNameCount || 0;
        totalImpact += ordersAgentNameCount || 0;
      }
    }

    // ตรวจสอบ booking tables (text fields)
    const duplicateValues = duplicates.map((d) => d.value);

    if (duplicateValues.length > 0) {
      // Tour bookings
      const tourFields = getTourFieldsByCategory(master.category);
      if (tourFields.length > 0) {
        for (const field of tourFields) {
          const { count } = await supabase
            .from("tour_bookings")
            .select("*", { count: "exact", head: true })
            .in(field, duplicateValues);

          impactDetails[`tour_${field}`] = count || 0;
          totalImpact += count || 0;
        }
      }

      // Transfer bookings
      const transferFields = getTransferFieldsByCategory(master.category);
      if (transferFields.length > 0) {
        for (const field of transferFields) {
          const { count } = await supabase
            .from("transfer_bookings")
            .select("*", { count: "exact", head: true })
            .in(field, duplicateValues);

          impactDetails[`transfer_${field}`] = count || 0;
          totalImpact += count || 0;
        }
      }

      // Payments table (agent_name)
      if (master.category === "agent") {
        const { count } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .in("agent_name", duplicateValues);

        impactDetails.payments_agent_name = count || 0;
        totalImpact += count || 0;
      }
    }

    console.log(`✅ Preview completed - Total impact: ${totalImpact} records`);

    return {
      success: true,
      impact: {
        masterRecord: master,
        duplicateRecords: duplicates,
        totalAffectedRecords: totalImpact,
        details: impactDetails,
      },
      error: null,
    };
  } catch (error) {
    console.error(`💥 Error previewing merge impact:`, error);
    return { success: false, impact: null, error: error.message };
  }
};

/**
 * ดำเนินการ merge records
 * @param {number} masterId - ID ของ record หลัก
 * @param {Array} duplicateIds - array ของ duplicate IDs
 * @param {Object} resolvedConflicts - ข้อมูลที่แก้ไขความขัดแย้งแล้ว
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const mergeInformationRecords = async (
  masterId,
  duplicateIds,
  resolvedConflicts = {}
) => {
  try {
    console.log(
      `🔍 Starting merge process - Master: ${masterId}, Duplicates:`,
      duplicateIds
    );

    // ดึงข้อมูลทั้งหมด
    const { data: allRecords, error } = await supabase
      .from("information")
      .select("*")
      .in("id", [masterId, ...duplicateIds]);

    if (error) throw error;

    const master = allRecords.find((r) => r.id === masterId);
    const duplicates = allRecords.filter((r) => duplicateIds.includes(r.id));

    if (!master) {
      throw new Error("Master record not found");
    }

    console.log(`📝 Master record: ${master.value} (ID: ${master.id})`);
    console.log(
      `📝 Duplicate records: ${duplicates
        .map((d) => `${d.value} (ID: ${d.id})`)
        .join(", ")}`
    );

    // รวมข้อมูลเพิ่มเติม
    const mergedData = { ...master };

    // รวม description และ phone จาก duplicates
    duplicates.forEach((duplicate) => {
      if (!mergedData.description && duplicate.description) {
        mergedData.description = duplicate.description;
      }
      if (!mergedData.phone && duplicate.phone) {
        mergedData.phone = duplicate.phone;
      }
    });

    // ใช้ข้อมูลที่ user แก้ไขความขัดแย้งแล้ว
    Object.assign(mergedData, resolvedConflicts);

    // อัพเดท master record
    console.log(`🔄 Updating master record...`);
    const { error: updateError } = await supabase
      .from("information")
      .update({
        description: mergedData.description,
        phone: mergedData.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", masterId);

    if (updateError) throw updateError;

    // อัพเดท references ในตารางอื่น ⭐ ส่วนที่สำคัญที่แก้ไข
    console.log(`🔄 Updating references in other tables...`);
    await updateReferences(master, duplicates);

    // ลบ duplicate records
    console.log(`🗑️ Deleting duplicate records...`);
    const { error: deleteError } = await supabase
      .from("information")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) throw deleteError;

    console.log(`✅ Merge completed successfully`);
    return { success: true, error: null };
  } catch (error) {
    console.error(`💥 Error in merge process:`, error);
    return { success: false, error: error.message };
  }
};

// Helper functions
const getTourFieldsByCategory = (category) => {
  const fieldMap = {
    tour_recipient: ["send_to"],
    tour_type: ["tour_type"],
    place: ["tour_hotel"], // โรงแรมในทัวร์
  };
  return fieldMap[category] || [];
};

const getTransferFieldsByCategory = (category) => {
  const fieldMap = {
    transfer_recipient: ["send_to"],
    transfer_type: ["transfer_type"],
    place: ["pickup_location", "drop_location"], // สถานที่รับและส่ง
  };
  return fieldMap[category] || [];
};

/**
 * อัพเดท references ในตารางอื่นๆ ⭐ ฟังก์ชันหลักที่แก้ไข
 * @param {Object} master - master record
 * @param {Array} duplicates - duplicate records
 */
const updateReferences = async (master, duplicates) => {
  try {
    const duplicateValues = duplicates.map((d) => d.value);
    const duplicateIds = duplicates.map((d) => d.id);

    console.log(`🔄 Updating references for category: ${master.category}`);
    console.log(
      `🔄 Duplicate values to replace: ${duplicateValues.join(", ")}`
    );
    console.log(`🔄 Replace with master value: ${master.value}`);

    // สำหรับ agent category
    if (master.category === "agent") {
      console.log(`🔄 Processing agent references...`);

      // 1. อัพเดท agent_id ใน orders (Foreign Key)
      if (duplicateIds.length > 0) {
        console.log(`🔄 Updating orders.agent_id...`);
        const { data: ordersUpdated, error: ordersIdError } = await supabase
          .from("orders")
          .update({ agent_id: master.id })
          .in("agent_id", duplicateIds)
          .select("id");

        if (ordersIdError) {
          console.error("❌ Error updating orders.agent_id:", ordersIdError);
          throw ordersIdError;
        }
        console.log(
          `✅ Updated ${ordersUpdated?.length || 0} orders.agent_id records`
        );
      }

      // 2. อัพเดท agent_name ใน orders (Text Field)
      if (duplicateValues.length > 0) {
        console.log(`🔄 Updating orders.agent_name...`);
        const { data: ordersNameUpdated, error: ordersNameError } =
          await supabase
            .from("orders")
            .update({ agent_name: master.value })
            .in("agent_name", duplicateValues)
            .select("id");

        if (ordersNameError) {
          console.error(
            "❌ Error updating orders.agent_name:",
            ordersNameError
          );
          throw ordersNameError;
        }
        console.log(
          `✅ Updated ${
            ordersNameUpdated?.length || 0
          } orders.agent_name records`
        );

        // 3. อัพเดท agent_name ใน payments
        console.log(`🔄 Updating payments.agent_name...`);
        const { data: paymentsUpdated, error: paymentsError } = await supabase
          .from("payments")
          .update({ agent_name: master.value })
          .in("agent_name", duplicateValues)
          .select("id");

        if (paymentsError) {
          console.error(
            "❌ Error updating payments.agent_name:",
            paymentsError
          );
          throw paymentsError;
        }
        console.log(
          `✅ Updated ${
            paymentsUpdated?.length || 0
          } payments.agent_name records`
        );
      }
    }

    // อัพเดท text fields ใน tour bookings
    const tourFields = getTourFieldsByCategory(master.category);
    if (tourFields.length > 0 && duplicateValues.length > 0) {
      console.log(
        `🔄 Processing tour booking fields: ${tourFields.join(", ")}`
      );

      for (const field of tourFields) {
        console.log(`🔄 Updating tour_bookings.${field}...`);
        const { data: tourUpdated, error: tourError } = await supabase
          .from("tour_bookings")
          .update({ [field]: master.value })
          .in(field, duplicateValues)
          .select("id");

        if (tourError) {
          console.error(`❌ Error updating tour_bookings.${field}:`, tourError);
          throw tourError;
        }
        console.log(
          `✅ Updated ${
            tourUpdated?.length || 0
          } tour_bookings.${field} records`
        );
      }
    }

    // อัพเดท text fields ใน transfer bookings
    const transferFields = getTransferFieldsByCategory(master.category);
    if (transferFields.length > 0 && duplicateValues.length > 0) {
      console.log(
        `🔄 Processing transfer booking fields: ${transferFields.join(", ")}`
      );

      for (const field of transferFields) {
        console.log(`🔄 Updating transfer_bookings.${field}...`);
        const { data: transferUpdated, error: transferError } = await supabase
          .from("transfer_bookings")
          .update({ [field]: master.value })
          .in(field, duplicateValues)
          .select("id");

        if (transferError) {
          console.error(
            `❌ Error updating transfer_bookings.${field}:`,
            transferError
          );
          throw transferError;
        }
        console.log(
          `✅ Updated ${
            transferUpdated?.length || 0
          } transfer_bookings.${field} records`
        );
      }
    }

    console.log(`✅ All references updated successfully`);
  } catch (error) {
    console.error(`💥 Error updating references:`, error);
    throw error;
  }
};
