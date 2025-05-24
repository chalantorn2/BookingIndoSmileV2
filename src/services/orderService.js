import supabase from "../config/supabaseClient";
import { generateOrderID } from "../utils/idGenerator";

/**
 * ดึงข้อมูล orders ทั้งหมด พร้อมจำนวน bookings และ vouchers
 * @returns {Promise<{orders: Array, error: string|null}>}
 */
export const fetchAllOrders = async (startDate = null, endDate = null) => {
  try {
    // สร้าง query พื้นฐาน
    let query = supabase.from("orders").select(`
      *,
      tour_bookings(*),
      transfer_bookings(*)
    `);

    // เพิ่มเงื่อนไขกรองตามวันที่ (ถ้ามี)
    if (startDate && endDate) {
      query = query
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
    }

    // เรียงลำดับตามวันที่สร้าง (ล่าสุดขึ้นก่อน)
    query = query.order("created_at", { ascending: false });

    // ดำเนินการ query
    const { data, error } = await query;

    if (error) throw error;

    // สร้าง arrays เพื่อเก็บ booking IDs
    const tourIds = [];
    const transferIds = [];

    // เก็บ booking IDs จากทุก order
    data.forEach((order) => {
      if (order.tour_bookings) {
        tourIds.push(...order.tour_bookings.map((b) => b.id));
      }
      if (order.transfer_bookings) {
        transferIds.push(...order.transfer_bookings.map((b) => b.id));
      }
    });

    // ดึงข้อมูล vouchers ที่เกี่ยวข้อง
    let vouchers = [];

    if (tourIds.length > 0) {
      const { data: tourVouchers } = await supabase
        .from("vouchers")
        .select("*")
        .eq("booking_type", "tour")
        .in("booking_id", tourIds);

      if (tourVouchers) {
        vouchers = [...vouchers, ...tourVouchers];
      }
    }

    if (transferIds.length > 0) {
      const { data: transferVouchers } = await supabase
        .from("vouchers")
        .select("*")
        .eq("booking_type", "transfer")
        .in("booking_id", transferIds);

      if (transferVouchers) {
        vouchers = [...vouchers, ...transferVouchers];
      }
    }

    // สร้าง map ระหว่าง booking ID และ voucher
    const voucherMap = {};
    vouchers.forEach((voucher) => {
      const key = `${voucher.booking_type}_${voucher.booking_id}`;
      voucherMap[key] = voucher;
    });

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการ
    const processedOrders = data.map((order) => {
      const tourBookings = order.tour_bookings || [];
      const transferBookings = order.transfer_bookings || [];

      // เพิ่ม vouchers ให้กับ bookings
      tourBookings.forEach((booking) => {
        const key = `tour_${booking.id}`;
        booking.voucher = voucherMap[key];
      });

      transferBookings.forEach((booking) => {
        const key = `transfer_${booking.id}`;
        booking.voucher = voucherMap[key];
      });

      // เก็บ vouchers ทั้งหมดของ order
      const orderVouchers = [
        ...tourBookings.filter((b) => b.voucher).map((b) => b.voucher),
        ...transferBookings.filter((b) => b.voucher).map((b) => b.voucher),
      ];

      return {
        ...order,
        tourCount: tourBookings.length,
        transferCount: transferBookings.length,
        bookingsCount: tourBookings.length + transferBookings.length,
        vouchers: orderVouchers,
      };
    });

    return { orders: processedOrders || [], error: null };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { orders: [], error: error.message };
  }
};

/**
 * ดึงข้อมูล order ตาม ID พร้อมข้อมูลการจองและ vouchers
 * @param {number} id - ID ของ order
 * @returns {Promise<{order: Object|null, error: string|null}>}
 */
export const fetchOrderById = async (id) => {
  try {
    console.log(`Fetching order data for ID: ${id}`);

    // ดึงข้อมูลหลักของ order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Error fetching order data:", orderError);
      throw orderError;
    }
    console.log("Order data fetched:", orderData);

    // ดึงข้อมูล tour bookings ที่เกี่ยวข้อง
    const { data: tourBookings, error: tourError } = await supabase
      .from("tour_bookings")
      .select("*")
      .eq("order_id", id);

    if (tourError) {
      console.error("Error fetching tour bookings:", tourError);
      throw tourError;
    }
    console.log("Tour bookings fetched:", tourBookings);

    // ดึงข้อมูล transfer bookings ที่เกี่ยวข้อง
    const { data: transferBookings, error: transferError } = await supabase
      .from("transfer_bookings")
      .select("*")
      .eq("order_id", id);

    if (transferError) {
      console.error("Error fetching transfer bookings:", transferError);
      throw transferError;
    }
    console.log("Transfer bookings fetched:", transferBookings);

    // สร้าง object ที่มีข้อมูลครบถ้วน
    const orderWithDetails = {
      ...orderData,
      tourBookings: tourBookings || [],
      transferBookings: transferBookings || [],
      vouchers: [], // จะเติมในขั้นตอนถัดไป
    };

    // หา vouchers ก็ต่อเมื่อมี bookings
    if (tourBookings?.length > 0 || transferBookings?.length > 0) {
      // รวบรวม booking IDs เพื่อดึง vouchers
      const tourIds = tourBookings?.map((b) => b.id) || [];
      const transferIds = transferBookings?.map((b) => b.id) || [];

      // ดึง vouchers ที่เกี่ยวข้อง - tour
      if (tourIds.length > 0) {
        console.log("Fetching tour vouchers for IDs:", tourIds);
        const { data: tourVouchers, error: tourVoucherError } = await supabase
          .from("vouchers")
          .select("*")
          .eq("booking_type", "tour")
          .in("booking_id", tourIds);

        if (tourVoucherError) {
          console.error("Error fetching tour vouchers:", tourVoucherError);
        } else if (tourVouchers?.length > 0) {
          console.log("Tour vouchers fetched:", tourVouchers);
          orderWithDetails.vouchers = [
            ...orderWithDetails.vouchers,
            ...tourVouchers,
          ];
        }
      }

      // ดึง vouchers ที่เกี่ยวข้อง - transfer
      if (transferIds.length > 0) {
        console.log("Fetching transfer vouchers for IDs:", transferIds);
        const { data: transferVouchers, error: transferVoucherError } =
          await supabase
            .from("vouchers")
            .select("*")
            .eq("booking_type", "transfer")
            .in("booking_id", transferIds);

        if (transferVoucherError) {
          console.error(
            "Error fetching transfer vouchers:",
            transferVoucherError
          );
        } else if (transferVouchers?.length > 0) {
          console.log("Transfer vouchers fetched:", transferVouchers);
          orderWithDetails.vouchers = [
            ...orderWithDetails.vouchers,
            ...transferVouchers,
          ];
        }
      }
    }

    console.log("Final order with details:", orderWithDetails);

    return {
      order: orderWithDetails,
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return { order: null, error: error.message };
  }
};

/**
 * ดึงข้อมูล bookings ทั้งหมดของ order
 * @param {number} orderId - ID ของ order
 * @returns {Promise<{tourBookings: Array, transferBookings: Array, error: string|null}>}
 */
export const fetchOrderBookings = async (orderId) => {
  try {
    // ดึงข้อมูลทัวร์
    const { data: tourData, error: tourError } = await supabase
      .from("tour_bookings")
      .select("*")
      .eq("order_id", orderId);

    if (tourError) throw tourError;

    // ดึงข้อมูลรถรับส่ง
    const { data: transferData, error: transferError } = await supabase
      .from("transfer_bookings")
      .select("*")
      .eq("order_id", orderId);

    if (transferError) throw transferError;

    return {
      tourBookings: tourData || [],
      transferBookings: transferData || [],
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching bookings for order ${orderId}:`, error);
    return {
      tourBookings: [],
      transferBookings: [],
      error: error.message,
    };
  }
};

/**
 * อัปเดต order
 * @param {number} id - ID ของ order ที่ต้องการอัปเดต
 * @param {Object} orderData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateOrder = async (id, orderData) => {
  try {
    // อัปเดตเวลาแก้ไข
    const updatedData = {
      ...orderData,
      updated_at: new Date().toISOString(),
    };

    // ลบข้อมูลที่ไม่ต้องการบันทึกลงในตาราง orders
    const { tourBookings, transferBookings, vouchers, ...dataToUpdate } =
      updatedData;

    const { error } = await supabase
      .from("orders")
      .update(dataToUpdate)
      .eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error updating order ${id}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตหมายเหตุของ order
 * @param {number} id - ID ของ order
 * @param {string} note - หมายเหตุที่ต้องการอัปเดต
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateOrderNote = async (id, note) => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error updating order note ${id}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * อัปเดตสถานะของ order
 * @param {number} id - ID ของ order
 * @param {boolean} completed - สถานะความเรียบร้อย
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const updateOrderStatus = async (id, completed) => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error updating order status ${id}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * ลบ order
 * @param {number} id - ID ของ order ที่ต้องการลบ
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteOrder = async (id) => {
  try {
    // ดึงข้อมูล bookings ทั้งหมดของ order
    const {
      tourBookings,
      transferBookings,
      error: fetchError,
    } = await fetchOrderBookings(id);

    if (fetchError) throw new Error(fetchError);

    // ลบ tour bookings
    for (const booking of tourBookings) {
      const { error: tourError } = await supabase
        .from("tour_bookings")
        .delete()
        .eq("id", booking.id);

      if (tourError) throw tourError;
    }

    // ลบ transfer bookings
    for (const booking of transferBookings) {
      const { error: transferError } = await supabase
        .from("transfer_bookings")
        .delete()
        .eq("id", booking.id);

      if (transferError) throw transferError;
    }

    // ลบ order
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting order ${id}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงข้อมูล orders ตามช่วงวันที่และคำค้นหา
 * @param {Object} params - พารามิเตอร์สำหรับการค้นหา
 * @param {string} params.startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} params.endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @param {string} params.searchTerm - คำค้นหา
 * @param {string} params.filterType - ประเภทการกรอง (all, completed, incomplete)
 * @returns {Promise<{orders: Array, error: string|null}>}
 */
export const searchOrders = async ({
  startDate,
  endDate,
  searchTerm,
  filterType,
}) => {
  try {
    // สร้าง query พื้นฐาน
    let query = supabase.from("orders").select(`
      *,
      tour_bookings(*),
      transfer_bookings(*)
    `);

    // เพิ่มเงื่อนไขกรองตามวันที่ (ถ้ามี)
    if (startDate && endDate) {
      query = query
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
    }

    // เพิ่มเงื่อนไขกรองตามสถานะ (ถ้ามี)
    if (filterType === "completed") {
      query = query.eq("completed", true);
    } else if (filterType === "incomplete") {
      query = query.eq("completed", false);
    }

    // ดำเนินการ query
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    // กรองข้อมูลตาม searchTerm (ถ้ามี)
    let filteredOrders = [...data];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(
        (order) =>
          (order.reference_id &&
            order.reference_id.toLowerCase().includes(term)) ||
          `${order.first_name || ""} ${order.last_name || ""}`
            .toLowerCase()
            .includes(term) ||
          (order.agent_name && order.agent_name.toLowerCase().includes(term))
      );
    }

    // สร้าง arrays เพื่อเก็บ booking IDs
    const tourIds = [];
    const transferIds = [];

    // เก็บ booking IDs จากทุก order
    filteredOrders.forEach((order) => {
      if (order.tour_bookings) {
        tourIds.push(...order.tour_bookings.map((b) => b.id));
      }
      if (order.transfer_bookings) {
        transferIds.push(...order.transfer_bookings.map((b) => b.id));
      }
    });

    // ดึงข้อมูล vouchers ที่เกี่ยวข้อง
    let vouchers = [];

    if (tourIds.length > 0) {
      const { data: tourVouchers } = await supabase
        .from("vouchers")
        .select("*")
        .eq("booking_type", "tour")
        .in("booking_id", tourIds);

      if (tourVouchers) {
        vouchers = [...vouchers, ...tourVouchers];
      }
    }

    if (transferIds.length > 0) {
      const { data: transferVouchers } = await supabase
        .from("vouchers")
        .select("*")
        .eq("booking_type", "transfer")
        .in("booking_id", transferIds);

      if (transferVouchers) {
        vouchers = [...vouchers, ...transferVouchers];
      }
    }

    // สร้าง map ระหว่าง booking ID และ voucher
    const voucherMap = {};
    vouchers.forEach((voucher) => {
      const key = `${voucher.booking_type}_${voucher.booking_id}`;
      voucherMap[key] = voucher;
    });

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการ
    const processedOrders = filteredOrders.map((order) => {
      const tourBookings = order.tour_bookings || [];
      const transferBookings = order.transfer_bookings || [];

      // เพิ่ม vouchers ให้กับ bookings
      tourBookings.forEach((booking) => {
        const key = `tour_${booking.id}`;
        booking.voucher = voucherMap[key];
      });

      transferBookings.forEach((booking) => {
        const key = `transfer_${booking.id}`;
        booking.voucher = voucherMap[key];
      });

      // เก็บ vouchers ทั้งหมดของ order
      const orderVouchers = [
        ...tourBookings.filter((b) => b.voucher).map((b) => b.voucher),
        ...transferBookings.filter((b) => b.voucher).map((b) => b.voucher),
      ];

      return {
        ...order,
        tourCount: tourBookings.length,
        transferCount: transferBookings.length,
        bookingsCount: tourBookings.length + transferBookings.length,
        vouchers: orderVouchers,
      };
    });

    return { orders: processedOrders || [], error: null };
  } catch (error) {
    console.error("Error searching orders:", error);
    return { orders: [], error: error.message };
  }
};
