import supabase from "../config/supabaseClient";
import { format } from "date-fns";

/**
 * ดึงข้อมูลการจองตามวันที่
 * @param {string} date - วันที่ในรูปแบบ 'YYYY-MM-DD'
 * @returns {Promise<{tourBookings: Array, transferBookings: Array, error: string|null}>}
 */
// bookingService.js
export const fetchBookingsByDate = async (date) => {
  try {
    // ดึงข้อมูลการจองทัวร์
    const { data: tourData, error: tourError } = await supabase
      .from("tour_bookings")
      .select(
        `
        *,
        orders(id, first_name, last_name, agent_name, reference_id, pax)
      `
      )
      .eq("tour_date", date);

    if (tourError) throw tourError;

    // ดึงข้อมูลการจองรถรับส่ง
    const { data: transferData, error: transferError } = await supabase
      .from("transfer_bookings")
      .select(
        `
        *,
        orders(id, first_name, last_name, agent_name, reference_id, pax)
      `
      )
      .eq("transfer_date", date);

    if (transferError) throw transferError;

    // เรียงลำดับตามเวลารับ
    const sortedTourBookings = tourData.sort((a, b) => {
      return (a.tour_pickup_time || "").localeCompare(b.tour_pickup_time || "");
    });

    const sortedTransferBookings = transferData.sort((a, b) => {
      return (a.transfer_time || "").localeCompare(b.transfer_time || "");
    });

    return {
      tourBookings: sortedTourBookings,
      transferBookings: sortedTransferBookings,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return {
      tourBookings: [],
      transferBookings: [],
      error: error.message,
    };
  }
};

/**
 * อัปเดตข้อมูลการจอง
 * @param {string} type - 'tour' หรือ 'transfer'
 * @param {object} bookingData - ข้อมูลการจองที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateBooking = async (type, bookingData) => {
  try {
    const table = type === "tour" ? "tour_bookings" : "transfer_bookings";

    const { error } = await supabase
      .from(table)
      .update(bookingData)
      .eq("id", bookingData.id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error updating ${type} booking:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบข้อมูลการจอง
 * @param {string} type - 'tour' หรือ 'transfer'
 * @param {number} id - ID ของการจอง
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteBooking = async (type, id) => {
  try {
    const table = type === "tour" ? "tour_bookings" : "transfer_bookings";

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting ${type} booking:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * สร้างรายการจองใหม่
 * @param {string} type - 'tour' หรือ 'transfer'
 * @param {object} bookingData - ข้อมูลการจอง
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export const createBooking = async (type, bookingData) => {
  try {
    const table = type === "tour" ? "tour_bookings" : "transfer_bookings";

    const { data, error } = await supabase
      .from(table)
      .insert(bookingData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data, error: null };
  } catch (error) {
    console.error(`Error creating ${type} booking:`, error);
    return { success: false, data: null, error: error.message };
  }
};

/**
 * ดึงข้อมูลการจองตามวันที่และสถานะ
 * @param {string} startDate - วันที่เริ่มต้นในรูปแบบ 'YYYY-MM-DD'
 * @param {string} endDate - วันที่สิ้นสุดในรูปแบบ 'YYYY-MM-DD'
 * @param {string} status - สถานะที่ต้องการค้นหา (optional)
 * @returns {Promise<{tourBookings: Array, transferBookings: Array, error: string|null}>}
 */
export const fetchBookingsByDateRange = async (
  startDate,
  endDate,
  status = null
) => {
  try {
    let tourQuery = supabase
      .from("tour_bookings")
      .select(
        `
        *,
        orders(id, first_name, last_name, agent_name, reference_id)
      `
      )
      .gte("tour_date", startDate)
      .lte("tour_date", endDate);

    let transferQuery = supabase
      .from("transfer_bookings")
      .select(
        `
        *,
        orders(id, first_name, last_name, agent_name, reference_id)
      `
      )
      .gte("transfer_date", startDate)
      .lte("transfer_date", endDate);

    // เพิ่มเงื่อนไขการค้นหาตามสถานะ (ถ้ามี)
    if (status) {
      tourQuery = tourQuery.eq("status", status);
      transferQuery = transferQuery.eq("status", status);
    }

    const [tourResult, transferResult] = await Promise.all([
      tourQuery,
      transferQuery,
    ]);

    if (tourResult.error) throw tourResult.error;
    if (transferResult.error) throw transferResult.error;

    return {
      tourBookings: tourResult.data || [],
      transferBookings: transferResult.data || [],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching bookings by date range:", error);
    return {
      tourBookings: [],
      transferBookings: [],
      error: error.message,
    };
  }
};
