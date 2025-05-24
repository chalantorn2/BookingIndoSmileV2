import supabase from "../config/supabaseClient";

/**
 * ดึงข้อมูลการจ่ายเงินตาม Order ID
 * @param {number} orderId - ID ของ order
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const fetchPaymentByOrderId = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching payment:", error);
    return { data: null, error: error.message };
  }
};

/**
 * สร้างหรืออัปเดตข้อมูลการจ่ายเงิน
 * @param {Object} paymentData - ข้อมูลการจ่ายเงิน
 * @returns {Promise<{success: boolean, data: Object|null, error: string|null}>}
 */
export const savePayment = async (paymentData) => {
  try {
    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, invoiced")
      .eq("order_id", paymentData.order_id)
      .single();

    let result;
    if (existingPayment) {
      // ถ้ามีการแก้ไข Payment ที่มี invoiced = true ให้ถามยืนยัน
      if (existingPayment.invoiced) {
        // ในโค้ดจริงควรให้ component ที่เรียกใช้จัดการการถามยืนยัน
        // แต่ในที่นี้เราจะเปลี่ยนให้ invoiced = false เลย
        // (component ที่เรียกใช้จะต้องจัดการถามยืนยันเอง)
        paymentData.invoiced = false;
      }

      // Update existing payment
      result = await supabase
        .from("payments")
        .update({
          ...paymentData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPayment.id)
        .select()
        .single();
    } else {
      // Create new payment
      result = await supabase
        .from("payments")
        .insert({
          ...paymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { success: true, data: result.data, error: null };
  } catch (error) {
    console.error("Error saving payment:", error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * ดึงข้อมูลการจ่ายเงินทั้งหมดในช่วงวันที่
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const fetchPaymentsByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*, orders(reference_id, first_name, last_name, agent_name)")
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching payments by date range:", error);
    return { data: [], error: error.message };
  }
};

/**
 * อัปเดตสถานะการออกใบแจ้งหนี้
 * @param {number} paymentId - ID ของการจ่ายเงิน
 * @param {boolean} invoiced - สถานะการออกใบแจ้งหนี้
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updatePaymentInvoiceStatus = async (paymentId, invoiced) => {
  try {
    const { error } = await supabase
      .from("payments")
      .update({ invoiced, updated_at: new Date().toISOString() })
      .eq("id", paymentId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating payment invoice status:", error);
    return { success: false, error: error.message };
  }
};
