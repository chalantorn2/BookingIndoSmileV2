import supabase from "../config/supabaseClient";

/**
 * สร้าง Order ID ในรูปแบบ AGENT-YYYY-MM-XXXX
 * @param {string} agent ชื่อ agent ที่จะใช้เป็น prefix
 * @returns {Promise<string>} Order ID ที่สร้างขึ้น
 */
export async function generateOrderID(agent = "SEVEN") {
  try {
    // รูปแบบ: AGENT-YYYY-MM-XXXX
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript month is 0-indexed
    const monthKey = `${year}-${month}`;

    // ปรับชื่อ agent ให้ปลอดภัยสำหรับใช้ใน ID
    // แทนที่ space ด้วย underscore
    const safeAgent = agent.replace(/\s+/g, "_");

    // ใช้ Supabase ในการ query sequence ล่าสุด
    const { data: sequenceData, error } = await supabase
      .from("sequences")
      .select("*")
      .eq("key", `order_${monthKey}`)
      .single();

    let sequence = 1;

    if (error) {
      // ถ้าไม่พบ sequence ให้สร้างใหม่
      if (error.code === "PGRST116") {
        const { data: newSequence, error: insertError } = await supabase
          .from("sequences")
          .insert({ key: `order_${monthKey}`, value: 1 })
          .select()
          .single();

        if (insertError) throw insertError;
      } else {
        throw error;
      }
    } else {
      // ถ้าพบ sequence ให้เพิ่มค่าขึ้น 1
      sequence = sequenceData.value + 1;

      const { error: updateError } = await supabase
        .from("sequences")
        .update({ value: sequence })
        .eq("key", `order_${monthKey}`);

      if (updateError) throw updateError;
    }

    // สร้าง reference_id ในรูปแบบใหม่: AGENT-YYYY-MM-XXXX
    return `${safeAgent}-${year}-${month}-${String(sequence).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating order ID:", error);
    throw error;
  }
}

/**
 * สร้าง Booking ID สำหรับ tour หรือ transfer
 * @param {string} type ประเภทของ booking ('tour' หรือ 'transfer')
 * @returns {Promise<string>} Booking ID ที่สร้างขึ้น
 */
export async function generateBookingID(type) {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript month is 0-indexed
    const monthKey = `${year}-${month}`;

    // กำหนด prefix ตามประเภท
    const prefix = type.toLowerCase() === "tour" ? "T" : "Tr";
    const sequenceKey = `booking_${monthKey}`; // ใช้ sequence ร่วมกันระหว่าง tour และ transfer

    // ใช้ Supabase ในการ query sequence ล่าสุด
    const { data: sequenceData, error } = await supabase
      .from("sequences")
      .select("*")
      .eq("key", sequenceKey)
      .single();

    let sequence = 1;

    if (error) {
      // ถ้าไม่พบ sequence ให้สร้างใหม่
      if (error.code === "PGRST116") {
        const { data: newSequence, error: insertError } = await supabase
          .from("sequences")
          .insert({ key: sequenceKey, value: 1 })
          .select()
          .single();

        if (insertError) throw insertError;
      } else {
        throw error;
      }
    } else {
      // ถ้าพบ sequence ให้เพิ่มค่าขึ้น 1
      sequence = sequenceData.value + 1;

      const { error: updateError } = await supabase
        .from("sequences")
        .update({ value: sequence })
        .eq("key", sequenceKey);

      if (updateError) throw updateError;
    }

    // สร้าง reference_id ในรูปแบบใหม่: PREFIX-YYYY-MM-XXXX
    return `${prefix}-${year}-${month}-${String(sequence).padStart(4, "0")}`;
  } catch (error) {
    console.error(`Error generating ${type} booking ID:`, error);
    throw error;
  }
}
