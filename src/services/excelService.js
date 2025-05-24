import ExcelJS from "exceljs";

/**
 * ฟังก์ชันสำหรับ export ข้อมูล bookings เป็นไฟล์ Excel พร้อมตกแต่ง
 * @param {Array} tourBookings - รายการจอง tour
 * @param {Array} transferBookings - รายการจอง transfer
 * @param {string} date - วันที่ในรูปแบบ DD/MM/YYYY
 */
export const exportBookingsToExcel = async (
  tourBookings,
  transferBookings,
  date
) => {
  try {
    // สร้าง workbook ใหม่
    const workbook = new ExcelJS.Workbook();

    // ตั้งค่า properties ของ workbook
    workbook.creator = "SevenSmile Booking System";
    workbook.lastModifiedBy = "SevenSmile";
    workbook.created = new Date();
    workbook.modified = new Date();

    // ======= Tour Bookings Sheet =======
    const tourWorksheet = workbook.addWorksheet("Tour Bookings");
    await setupTourSheet(tourWorksheet, tourBookings, date);

    // ======= Transfer Bookings Sheet =======
    const transferWorksheet = workbook.addWorksheet("Transfer Bookings");
    await setupTransferSheet(transferWorksheet, transferBookings, date);

    // สร้างชื่อไฟล์
    const fileName = `daily-bookings-${date.replace(/\//g, "-")}.xlsx`;

    // บันทึกไฟล์
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // ดาวน์โหลดไฟล์
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      message: `ส่งออกข้อมูลสำเร็จ: ${fileName}`,
    };
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return {
      success: false,
      error: error.message,
      message: "เกิดข้อผิดพลาดในการส่งออกข้อมูล",
    };
  }
};

/**
 * ตั้งค่า Tour Bookings Sheet
 */
const setupTourSheet = async (worksheet, tourBookings, date) => {
  // A1: วันที่
  worksheet.getCell("A1").value = `วันที่: ${date}`;
  worksheet.getCell("A1").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "left" };

  // A2: ชื่อ Sheet
  worksheet.getCell("A2").value = "รายการ Tour";
  worksheet.getCell("A2").font = {
    size: 16,
    bold: true,
    color: { argb: "FF16A34A" }, // สีเขียว
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Merge A2 ข้ามหลายคอลัมน์
  worksheet.mergeCells("A2:K2");

  // หัวตาราง (แถว 4)
  const tourHeaders = [
    "ลำดับ",
    "ชื่อลูกค้า",
    "จำนวนคน",
    "เวลารับ",
    "โรงแรม",
    "หมายเลขห้อง",
    "รายละเอียด",
    "Agent",
    "ส่งใคร",
    "สถานะ",
    "Reference ID",
  ];

  tourHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(4, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF16A34A" }, // สีเขียว
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // เรียงลำดับข้อมูล
  const sortedTourBookings = [...tourBookings].sort((a, b) => {
    const timeA = a.tour_pickup_time || "";
    const timeB = b.tour_pickup_time || "";
    return timeA.localeCompare(timeB);
  });

  // ใส่ข้อมูล (เริ่มจากแถว 5)
  sortedTourBookings.forEach((booking, index) => {
    const rowIndex = index + 5;
    const rowData = prepareTourRowData(booking, index + 1);

    rowData.forEach((value, colIndex) => {
      const cell = worksheet.getCell(rowIndex, colIndex + 1);
      cell.value = value;
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // สีพื้นหลังสลับแถว
      if (index % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8F9FA" },
        };
      }
    });
  });

  // ตั้งค่าความกว้างคอลัมน์
  const tourColumnWidths = [8, 25, 12, 12, 20, 12, 35, 25, 20, 15, 20];
  tourColumnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // ตั้งค่าความสูงแถว
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(4).height = 30;
};

/**
 * ตั้งค่า Transfer Bookings Sheet
 */
const setupTransferSheet = async (worksheet, transferBookings, date) => {
  // A1: วันที่
  worksheet.getCell("A1").value = `วันที่: ${date}`;
  worksheet.getCell("A1").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "left" };

  // A2: ชื่อ Sheet
  worksheet.getCell("A2").value = "รายการ Transfer";
  worksheet.getCell("A2").font = {
    size: 16,
    bold: true,
    color: { argb: "FF2563EB" }, // สีน้ำเงิน
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Merge A2 ข้ามหลายคอลัมน์
  worksheet.mergeCells("A2:L2");

  // หัวตาราง (แถว 4)
  const transferHeaders = [
    "ลำดับ",
    "ชื่อลูกค้า",
    "จำนวนคน",
    "เวลารับ",
    "รับจาก",
    "ส่งที่",
    "เที่ยวบิน",
    "เวลาบิน",
    "Agent",
    "ส่งใคร",
    "สถานะ",
    "Reference ID",
  ];

  transferHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(4, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // สีน้ำเงิน
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // เรียงลำดับข้อมูล
  const sortedTransferBookings = [...transferBookings].sort((a, b) => {
    const timeA = a.transfer_time || "";
    const timeB = b.transfer_time || "";
    return timeA.localeCompare(timeB);
  });

  // ใส่ข้อมูล (เริ่มจากแถว 5)
  sortedTransferBookings.forEach((booking, index) => {
    const rowIndex = index + 5;
    const rowData = prepareTransferRowData(booking, index + 1);

    rowData.forEach((value, colIndex) => {
      const cell = worksheet.getCell(rowIndex, colIndex + 1);
      cell.value = value;
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // สีพื้นหลังสลับแถว
      if (index % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8F9FA" },
        };
      }
    });
  });

  // ตั้งค่าความกว้างคอลัมน์
  const transferColumnWidths = [8, 25, 12, 12, 25, 25, 15, 12, 25, 20, 15, 20];
  transferColumnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // ตั้งค่าความสูงแถว
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(4).height = 30;
};

/**
 * เตรียมข้อมูลแถวสำหรับ Tour
 */
const prepareTourRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "ไม่มีชื่อ";

  // ฟอร์แมต Pax
  const formatPax = () => {
    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(`${adtCount}ADT`);
      if (chdCount > 0) paxParts.push(`${chdCount}CHD`);
      if (infCount > 0) paxParts.push(`${infCount}INF`);

      return paxParts.length > 0 ? paxParts.join(" ") : "0";
    }
    return booking.pax || "0";
  };

  // แปลสถานะ
  const translateStatus = (status) => {
    const statusMap = {
      pending: "รอดำเนินการ",
      booked: "จองแล้ว",
      in_progress: "ดำเนินการอยู่",
      completed: "เสร็จสมบูรณ์",
      cancelled: "ยกเลิก",
    };
    return statusMap[status] || status;
  };

  // ข้อมูล Agent
  const getAgentName = () => {
    if (booking.orders?.agent_info?.value) {
      const phone = booking.orders.agent_info.phone;
      return phone
        ? `${booking.orders.agent_info.value}\n(${phone})`
        : booking.orders.agent_info.value;
    }
    return booking.orders?.agent_name || "ไม่ระบุ Agent";
  };

  return [
    index,
    customerName,
    formatPax(),
    booking.tour_pickup_time || "-",
    booking.tour_hotel || "-",
    booking.tour_room_no || "-",
    booking.tour_detail || "-",
    getAgentName(),
    booking.send_to || "-",
    translateStatus(booking.status),
    booking.reference_id || `ID: ${booking.id}`,
  ];
};

/**
 * เตรียมข้อมูลแถวสำหรับ Transfer
 */
const prepareTransferRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "ไม่มีชื่อ";

  // ฟอร์แมต Pax
  const formatPax = () => {
    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(`${adtCount}ADT`);
      if (chdCount > 0) paxParts.push(`${chdCount}CHD`);
      if (infCount > 0) paxParts.push(`${infCount}INF`);

      return paxParts.length > 0 ? paxParts.join(" ") : "0";
    }
    return booking.pax || "0";
  };

  // แปลสถานะ
  const translateStatus = (status) => {
    const statusMap = {
      pending: "รอดำเนินการ",
      booked: "จองแล้ว",
      in_progress: "ดำเนินการอยู่",
      completed: "เสร็จสมบูรณ์",
      cancelled: "ยกเลิก",
    };
    return statusMap[status] || status;
  };

  // ข้อมูล Agent
  const getAgentName = () => {
    if (booking.orders?.agent_info?.value) {
      const phone = booking.orders.agent_info.phone;
      return phone
        ? `${booking.orders.agent_info.value}\n(${phone})`
        : booking.orders.agent_info.value;
    }
    return booking.orders?.agent_name || "ไม่ระบุ Agent";
  };

  return [
    index,
    customerName,
    formatPax(),
    booking.transfer_time || "-",
    booking.pickup_location || "-",
    booking.drop_location || "-",
    booking.transfer_flight || "-",
    booking.transfer_ftime || "-",
    getAgentName(),
    booking.send_to || "-",
    translateStatus(booking.status),
    booking.reference_id || `ID: ${booking.id}`,
  ];
};
