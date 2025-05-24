import supabase from "../config/supabaseClient";

export const fetchVoucherById = async (voucherId) => {
  try {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("id", voucherId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching voucher:", error);
    return { data: null, error: error.message };
  }
};

export const fetchAllVouchers = async () => {
  try {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return { data: null, error: error.message };
  }
};

export const createVoucher = async (voucherData) => {
  try {
    const { data: existingVoucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("id")
      .eq("booking_id", voucherData.booking_id)
      .eq("booking_type", voucherData.booking_type)
      .single();

    if (existingVoucher && !voucherError) {
      throw new Error("Booking นี้มี Voucher อยู่แล้ว");
    }
    if (voucherError && voucherError.code !== "PGRST116") {
      throw voucherError;
    }

    const currentYear = new Date().getFullYear();
    const { data: sequenceData, error: sequenceError } = await supabase
      .from("sequences")
      .select("*")
      .eq("key", `voucher_${currentYear}`)
      .single();

    let nextSequence = 1;

    if (sequenceError) {
      if (sequenceError.code === "PGRST116") {
        const { data: newSequence, error: insertError } = await supabase
          .from("sequences")
          .insert({ key: `voucher_${currentYear}`, value: 1 })
          .select()
          .single();

        if (insertError) throw insertError;
      } else {
        throw sequenceError;
      }
    } else {
      nextSequence = sequenceData.value + 1;

      const { error: updateError } = await supabase
        .from("sequences")
        .update({ value: nextSequence })
        .eq("key", `voucher_${currentYear}`);

      if (updateError) throw updateError;
    }

    const voucherNumber = String(nextSequence).padStart(4, "0");

    const voucherWithNumbers = {
      ...voucherData,
      year_number: currentYear.toString(),
      sequence_number: voucherNumber,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("vouchers")
      .insert(voucherWithNumbers)
      .select()
      .single();

    if (error) throw error;

    if (voucherData.booking_id && voucherData.booking_type) {
      const tableName =
        voucherData.booking_type === "tour"
          ? "tour_bookings"
          : "transfer_bookings";

      await supabase
        .from(tableName)
        .update({ voucher_created: true })
        .eq("id", voucherData.booking_id);

      // อัพเดต customer_signature ในตาราง orders
      if (voucherData.customer_signature) {
        const { data: bookingData, error: bookingError } = await supabase
          .from(tableName)
          .select("order_id")
          .eq("id", voucherData.booking_id)
          .single();

        if (bookingError) throw bookingError;

        const { error: orderError } = await supabase
          .from("orders")
          .update({ customer_signature: voucherData.customer_signature })
          .eq("id", bookingData.order_id);

        if (orderError) throw orderError;
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error creating voucher:", error);
    return { data: null, error: error.message };
  }
};

export const updateVoucher = async (voucherId, updateData) => {
  try {
    const { error } = await supabase
      .from("vouchers")
      .update(updateData)
      .eq("id", voucherId);

    if (error) throw error;

    // อัพเดต customer_signature ในตาราง orders
    if (
      updateData.customer_signature &&
      updateData.booking_id &&
      updateData.booking_type
    ) {
      const tableName =
        updateData.booking_type === "tour"
          ? "tour_bookings"
          : "transfer_bookings";

      const { data: bookingData, error: bookingError } = await supabase
        .from(tableName)
        .select("order_id")
        .eq("id", updateData.booking_id)
        .single();

      if (bookingError) throw bookingError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ customer_signature: updateData.customer_signature })
        .eq("id", bookingData.order_id);

      if (orderError) throw orderError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating voucher:", error);
    return { success: false, error: error.message };
  }
};

export const deleteVoucher = async (voucherId) => {
  try {
    const { data: voucher, error: fetchError } = await supabase
      .from("vouchers")
      .select("*")
      .eq("id", voucherId)
      .single();

    if (fetchError) throw fetchError;

    if (voucher.booking_id && voucher.booking_type) {
      const tableName =
        voucher.booking_type === "tour" ? "tour_bookings" : "transfer_bookings";

      await supabase
        .from(tableName)
        .update({ voucher_created: false })
        .eq("id", voucher.booking_id);
    }

    const { error } = await supabase
      .from("vouchers")
      .delete()
      .eq("id", voucherId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return { success: false, error: error.message };
  }
};
