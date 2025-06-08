// src/services/invoiceService.js
import supabase from "../config/supabaseClient";

/**
 * ดึงข้อมูล invoice ตาม invoice ID
 * @param {string} invoiceId - ID ของ invoice
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export const fetchInvoiceById = async (invoiceId) => {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return { data: null, error: error.message };
  }
};

/**
 * ดึงข้อมูล invoice ทั้งหมด
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export const fetchAllInvoices = async () => {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return { data: null, error: error.message };
  }
};

/**
 * สร้าง invoice ใหม่
 * @param {Object} invoiceData - ข้อมูล invoice ที่จะสร้าง
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
// แก้ไขฟังก์ชัน createInvoice ใน invoiceService.js
export const createInvoice = async (invoiceData) => {
  try {
    // ตรวจสอบว่าข้อมูลที่จำเป็นมีครบ
    if (
      !invoiceData.invoice_name ||
      !invoiceData.invoice_date ||
      !invoiceData.payment_ids
    ) {
      throw new Error("ข้อมูล Invoice ไม่ครบถ้วน");
    }

    // ตรวจสอบว่า payment_ids เป็น array
    if (!Array.isArray(invoiceData.payment_ids)) {
      throw new Error("payment_ids ต้องเป็น array");
    }

    // แปลงค่าตัวเลขให้เป็น numeric
    const numericFields = [
      "total_amount",
      "total_cost",
      "total_selling_price",
      "total_profit",
    ];
    numericFields.forEach((field) => {
      if (invoiceData[field] !== undefined) {
        invoiceData[field] = parseFloat(invoiceData[field]) || 0;
      }
    });

    const { data, error } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return { data: null, error: error.message };
  }
};

/**
 * อัปเดต invoice ตาม ID
 * @param {string} invoiceId - ID ของ invoice
 * @param {Object} updateData - ข้อมูลที่จะอัปเดต
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateInvoice = async (invoiceId, updateData) => {
  try {
    const { error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating invoice:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะการออกใบแจ้งหนี้สำหรับหลาย payment
 * @param {Array<string>} paymentIds - รายการ ID ของ payment
 * @param {boolean} invoiced - สถานะการออกใบแจ้งหนี้
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updatePaymentsInvoiceStatus = async (paymentIds, invoiced) => {
  try {
    // Update each payment's invoiced status
    await Promise.all(
      paymentIds.map(async (id) => {
        await supabase.from("payments").update({ invoiced }).eq("id", id);
      })
    );

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating payments invoice status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบ invoice ตาม ID
 * @param {string} invoiceId - ID ของ invoice
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
/**
 * ลบ invoice ตาม ID
 * @param {string} invoiceId - ID ของ invoice
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteInvoice = async (invoiceId) => {
  try {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะ Invoice
 * @param {string} invoiceId - ID ของ invoice
 * @param {boolean} status - สถานะใหม่ (true = เรียบร้อย, false = ไม่เรียบร้อย)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตไฟล์แนบของ Invoice
 * @param {string} invoiceId - ID ของ invoice
 * @param {Array} attachments - รายการไฟล์แนับ
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateInvoiceAttachments = async (invoiceId, attachments) => {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({
        attachments: attachments,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating invoice attachments:", error);
    return { success: false, error: error.message };
  }
};

/**
 * คำนวณยอดรวมของ Invoice ใหม่จาก Payments
 * @param {string} invoiceId - ID ของ invoice
 * @returns {Promise<{success: boolean, data: Object|null, error: string|null}>}
 */
export const recalculateInvoiceTotals = async (invoiceId) => {
  try {
    // ดึงข้อมูล invoice เพื่อหา payment_ids
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("payment_ids")
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    if (!invoice.payment_ids || invoice.payment_ids.length === 0) {
      return {
        success: true,
        data: {
          totalAmount: 0,
          totalCost: 0,
          totalSellingPrice: 0,
          totalProfit: 0,
        },
        error: null,
      };
    }

    // ดึงข้อมูล payments ทั้งหมดที่อยู่ใน invoice
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .in("id", invoice.payment_ids);

    if (paymentsError) throw paymentsError;

    // คำนวณยอดรวมใหม่
    let totalAmount = 0;
    let totalCost = 0;
    let totalSellingPrice = 0;
    let totalProfit = 0;

    payments.forEach((payment) => {
      if (payment.bookings && Array.isArray(payment.bookings)) {
        payment.bookings.forEach((booking) => {
          const price = parseFloat(booking.sellingPrice) || 0;
          const quantity = parseInt(booking.quantity) || 0;
          const cost = parseFloat(booking.cost) || 0;

          const rowTotal = price * quantity;
          const rowCost = cost * quantity;
          const rowProfit = rowTotal - rowCost;

          totalAmount += rowTotal;
          totalCost += rowCost;
          totalSellingPrice += rowTotal;
          totalProfit += rowProfit;
        });
      }
    });

    // อัปเดตยอดรวมใน invoice
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        total_amount: totalAmount.toString(),
        total_cost: totalCost.toString(),
        total_selling_price: totalSellingPrice.toString(),
        total_profit: totalProfit.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    return {
      success: true,
      data: {
        totalAmount,
        totalCost,
        totalSellingPrice,
        totalProfit,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error recalculating invoice totals:", error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * ดึง Invoice ที่เกี่ยวข้องกับ Payment ID
 * @param {number} paymentId - ID ของ payment
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const findInvoicesByPaymentId = async (paymentId) => {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .contains("payment_ids", [paymentId]);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error finding invoices by payment ID:", error);
    return { data: [], error: error.message };
  }
};
