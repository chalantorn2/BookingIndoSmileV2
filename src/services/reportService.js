import ExcelJS from "exceljs";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";

/**
 * ฟังก์ชันสำหรับ export รายงานเป็นไฟล์ Excel
 * @param {Array} tourBookings - รายการจอง tour
 * @param {Array} transferBookings - รายการจอง transfer
 * @param {string} selectedMonth - เดือนที่เลือก (YYYY-MM)
 * @param {string} exportRange - ช่วงเวลา (first_15, last_15, full_month)
 * @param {string} exportFormat - รูปแบบ (combined, separate)
 * @param {string} filterType - ประเภทตัวกรอง (agent, tour_recipient, transfer_recipient)
 * @param {string} selectedTourRecipient - ผู้รับ tour ที่เลือก
 * @param {string} selectedTransferRecipient - ผู้รับ transfer ที่เลือก
 */
export const exportReportToExcel = async (
  tourBookings,
  transferBookings,
  selectedMonth,
  exportRange,
  exportFormat = "combined",
  filterType = "agent",
  selectedTourRecipient = "",
  selectedTransferRecipient = ""
) => {
  try {
    // สร้าง workbook ใหม่
    const workbook = new ExcelJS.Workbook();

    // ตั้งค่า properties ของ workbook
    workbook.creator = "SevenSmile Booking System";
    workbook.lastModifiedBy = "SevenSmile";
    workbook.created = new Date();
    workbook.modified = new Date();

    // กรองข้อมูลตาม exportRange
    const filteredTourBookings = filterBookingsByRange(
      tourBookings,
      selectedMonth,
      exportRange,
      "tour"
    );
    const filteredTransferBookings = filterBookingsByRange(
      transferBookings,
      selectedMonth,
      exportRange,
      "transfer"
    );

    // กำหนดชื่อไฟล์และประเภทรายงาน
    const monthName = format(new Date(selectedMonth), "MMMM", { locale: th });
    const year = format(new Date(selectedMonth), "yyyy");
    const monthEng = format(new Date(selectedMonth), "MMMM"); // เดือนภาษาอังกฤษ
    const rangeTextEng = getRangeTextEng(exportRange);
    const dateCreated = format(new Date(), "yyyyMMdd");

    let typeText = "รวม";
    let reportName = "รายการ Bookings";
    if (exportFormat === "separate") {
      if (filteredTourBookings.length > 0) {
        typeText =
          filterType === "tour_recipient" && selectedTourRecipient
            ? `Tour${selectedTourRecipient}`
            : "Tour";
        reportName =
          filterType === "tour_recipient" && selectedTourRecipient
            ? `รายการ Bookings Tour ${selectedTourRecipient}`
            : "รายการ Bookings Tour";
      } else if (filteredTransferBookings.length > 0) {
        typeText =
          filterType === "transfer_recipient" && selectedTransferRecipient
            ? `Transfer${selectedTransferRecipient}`
            : "Transfer";
        reportName =
          filterType === "transfer_recipient" && selectedTransferRecipient
            ? `รายการ Bookings Transfer ${selectedTransferRecipient}`
            : "รายการ Bookings Transfer";
      }
    } else if (filterType === "tour_recipient" && selectedTourRecipient) {
      typeText = `Tour${selectedTourRecipient}`;
      reportName = `รายการ Bookings Tour ${selectedTourRecipient}`;
    } else if (
      filterType === "transfer_recipient" &&
      selectedTransferRecipient
    ) {
      typeText = `Transfer${selectedTransferRecipient}`;
      reportName = `รายการ Bookings Transfer ${selectedTransferRecipient}`;
    }

    const fileName = `Report${typeText}${monthEng}${year}${rangeTextEng}${dateCreated}.xlsx`;

    // ตรวจสอบว่ามีข้อมูลอะไรบ้าง
    const hasTour = filteredTourBookings.length > 0;
    const hasTransfer = filteredTransferBookings.length > 0;

    if (!hasTour && !hasTransfer) {
      throw new Error("ไม่มีข้อมูลสำหรับ Export");
    }

    if (exportFormat === "separate") {
      // แยก sheet
      if (hasTour) {
        const tourWorksheet = workbook.addWorksheet("Tour Bookings");
        await setupTourSheet(
          tourWorksheet,
          filteredTourBookings,
          monthName,
          year,
          exportRange,
          filterType,
          selectedTourRecipient
        );
      }

      if (hasTransfer) {
        const transferWorksheet = workbook.addWorksheet("Transfer Bookings");
        await setupTransferSheet(
          transferWorksheet,
          filteredTransferBookings,
          monthName,
          year,
          exportRange,
          filterType,
          selectedTransferRecipient
        );
      }
    } else {
      // รวม sheet - จัดกลุ่มตามวันที่
      const worksheet = workbook.addWorksheet(monthName);
      await setupCombinedSheet(
        worksheet,
        filteredTourBookings,
        filteredTransferBookings,
        monthName,
        year,
        exportRange,
        reportName
      );
    }

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
      message: `ส่งออกรายงานสำเร็จ: ${fileName}`,
    };
  } catch (error) {
    console.error("Error exporting report to Excel:", error);
    return {
      success: false,
      error: error.message,
      message: "เกิดข้อผิดพลาดในการส่งออกรายงาน",
    };
  }
};

/**
 * กรองข้อมูลตามช่วงเวลาที่เลือก
 */
const filterBookingsByRange = (bookings, selectedMonth, exportRange, type) => {
  if (!bookings || bookings.length === 0) return [];

  const monthStart = startOfMonth(new Date(selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedMonth));

  let startDate, endDate;

  switch (exportRange) {
    case "first_15":
      startDate = monthStart;
      endDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 15);
      break;
    case "last_15":
      startDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 16);
      endDate = monthEnd;
      break;
    case "full_month":
    default:
      startDate = monthStart;
      endDate = monthEnd;
      break;
  }

  const dateField = type === "tour" ? "tour_date" : "transfer_date";

  return bookings.filter((booking) => {
    const bookingDate = new Date(booking[dateField]);
    return bookingDate >= startDate && bookingDate <= endDate;
  });
};

/**
 * แปลง exportRange เป็นข้อความภาษาไทย
 */
const getRangeText = (exportRange) => {
  switch (exportRange) {
    case "first_15":
      return "15 วันแรก";
    case "last_15":
      return "15 วันหลัง";
    case "full_month":
    default:
      return "ทั้งเดือน";
  }
};

/**
 * แปลง exportRange เป็นข้อความภาษาอังกฤษ (สำหรับชื่อไฟล์)
 */
const getRangeTextEng = (exportRange) => {
  switch (exportRange) {
    case "first_15":
      return "First15Days";
    case "last_15":
      return "Last15Days";
    case "full_month":
    default:
      return "FullMonth";
  }
};

/**
 * ตั้งค่า Combined Sheet - รวม Tour และ Transfer โดยจัดกลุ่มตามวันที่
 */
const setupCombinedSheet = async (
  worksheet,
  tourBookings,
  transferBookings,
  monthName,
  year,
  exportRange,
  reportName
) => {
  // รวมข้อมูลและจัดกลุ่มตามวันที่
  const allBookings = [
    ...tourBookings.map((b) => ({
      ...b,
      type: "tour",
      date: b.tour_date,
      time: b.tour_pickup_time,
    })),
    ...transferBookings.map((b) => ({
      ...b,
      type: "transfer",
      date: b.transfer_date,
      time: b.transfer_time,
    })),
  ];

  // จัดกลุ่มตามวันที่
  const groupedByDate = {};
  allBookings.forEach((booking) => {
    const dateKey = booking.date;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(booking);
  });

  // เรียงลำดับวันที่
  const sortedDates = Object.keys(groupedByDate).sort();

  // A1: ชื่อรายงาน
  worksheet.getCell("A1").value = reportName;
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  // A2: เดือนและช่วงเวลา
  worksheet.getCell("A2").value = `${monthName} ${year} (${getRangeText(
    exportRange
  )})`;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Merge cells สำหรับหัวข้อ
  worksheet.mergeCells("A1:Q1");
  worksheet.mergeCells("A2:Q2");

  let currentRow = 4;

  // คำนวณความกว้างคอลัมน์
  const columnWidths = Array(17).fill(10); // ความกว้างเริ่มต้น

  // สำหรับแต่ละวันที่
  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    // เรียงตามเวลารับ (เช้าสู่ค่ำ)
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.time || "23:59"; // ถ้าไม่มีเวลา ไปท้ายสุด
      const timeB = b.time || "23:59";
      return timeA.localeCompare(timeB);
    });

    // แสดงวันที่
    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `วันที่ ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }, // สีเทาอ่อนสำหรับแถววันที่
    };
    worksheet.mergeCells(`A${currentRow}:Q${currentRow}`);
    currentRow++;

    // หัวตาราง
    const headers = [
      "ลำดับ",
      "ประเภท",
      "Agent",
      "Reference ID",
      "ชื่อลูกค้า",
      "จำนวนคน",
      "เวลารับ",
      "รับจาก",
      "ส่งที่",
      "เที่ยวบิน",
      "เวลาบิน",
      "ส่งใคร",
      "หมายเหตุ",
      "",
      "Cost",
      "Sell",
      "Profit",
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF6B7280" }, // สีเทาสำหรับหัวตาราง
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (index !== 13) {
        // ข้ามคอลัมน์ว่าง (index 13)
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      columnWidths[index] = Math.max(columnWidths[index], header.length * 1.2);
    });
    currentRow++;

    // ข้อมูลของวันนั้น
    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareCombinedRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };
        if (colIndex !== 13) {
          // ข้ามคอลัมน์ว่าง
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
        if (colIndex >= 14 && colIndex <= 16) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
          };
        }
        if (index % 2 === 0 && colIndex < 14) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" }, // สีพื้นหลังสลับแถว
          };
        }
        columnWidths[colIndex] = Math.max(
          columnWidths[colIndex],
          String(value).length * 1.2
        );
      });
      currentRow++;
    });
    currentRow++;
  }

  // ตั้งค่าความกว้างคอลัมน์
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  // ตั้งค่าความสูงแถว
  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

  // เพิ่มแถวสรุป Cost, Sell, Profit
  currentRow++;
  const totalCost = allBookings.reduce(
    (sum, b) => sum + (parseFloat(b.cost_price) || 0),
    0
  );
  const totalSell = allBookings.reduce(
    (sum, b) => sum + (parseFloat(b.selling_price) || 0),
    0
  );
  const totalProfit = totalSell - totalCost;

  const summaryRow = [
    "สรุป",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalCost.toLocaleString(),
    totalSell.toLocaleString(),
    totalProfit.toLocaleString(),
  ];
  summaryRow.forEach((value, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = value;
    cell.alignment = { vertical: "middle", wrapText: true };
    if (index !== 13) {
      // ข้ามคอลัมน์ว่าง
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
    if (index >= 14 && index <= 16) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
      };
    }
  });
};

/**
 * เตรียมข้อมูลแถวสำหรับ Combined Sheet
 */
const prepareCombinedRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "ไม่มีชื่อ";

  const formatPax = () => {
    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(adtCount.toString());
      if (chdCount > 0) paxParts.push(chdCount.toString());
      if (infCount > 0) paxParts.push(infCount.toString());

      return paxParts.length > 0 ? paxParts.join("+") : "0";
    }
    return booking.pax || "0";
  };

  const cost = parseFloat(booking.cost_price) || 0;
  const sell = parseFloat(booking.selling_price) || 0;
  const profit = sell - cost;

  let detail1, detail2, flight, flightTime, time;

  if (booking.type === "tour") {
    detail1 = booking.tour_hotel || "-";
    detail2 = booking.tour_detail || "-";
    flight = "-";
    flightTime = "-";
    time = booking.tour_pickup_time || "-";
  } else {
    detail1 = booking.pickup_location || "-";
    detail2 = booking.drop_location || "-";
    flight = booking.transfer_flight || "-";
    flightTime = booking.transfer_ftime || "-";
    time = booking.transfer_time || "-";
  }

  return [
    index,
    booking.type === "tour" ? "Tour" : "Transfer",
    booking.orders?.agent_name || "ไม่ระบุ Agent",
    booking.orders?.reference_id || `ID: ${booking.id}`,
    customerName,
    formatPax(),
    time,
    detail1,
    detail2,
    flight,
    flightTime,
    booking.send_to || "-",
    booking.note || "-",
    "",
    cost.toLocaleString(), // ฟอร์แมต Cost ด้วยคอมมา
    sell.toLocaleString(), // ฟอร์แมต Sell ด้วยคอมมา
    profit.toLocaleString(), // ฟอร์แมต Profit ด้วยคอมมา
  ];
};

/**
 * เตรียมข้อมูลแถวสำหรับ Tour
 */
const prepareTourRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "ไม่มีชื่อ";

  const formatPax = () => {
    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(adtCount.toString());
      if (chdCount > 0) paxParts.push(chdCount.toString());
      if (infCount > 0) paxParts.push(infCount.toString());

      return paxParts.length > 0 ? paxParts.join("+") : "0";
    }
    return booking.pax || "0";
  };

  const cost = parseFloat(booking.cost_price) || 0;
  const sell = parseFloat(booking.selling_price) || 0;
  const profit = sell - cost;

  return [
    index,
    booking.orders?.agent_name || "ไม่ระบุ Agent",
    booking.orders?.reference_id || `ID: ${booking.id}`,
    customerName,
    formatPax(),
    booking.tour_pickup_time || "-",
    booking.tour_hotel || "-",
    booking.tour_detail || "-",
    booking.send_to || "-",
    booking.note || "-",
    "",
    cost.toLocaleString(), // ฟอร์แมต Cost ด้วยคอมมา
    sell.toLocaleString(), // ฟอร์แมต Sell ด้วยคอมมา
    profit.toLocaleString(), // ฟอร์แมต Profit ด้วยคอมมา
  ];
};

/**
 * เตรียมข้อมูลแถวสำหรับ Transfer
 */
const prepareTransferRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "ไม่มีชื่อ";

  const formatPax = () => {
    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(adtCount.toString());
      if (chdCount > 0) paxParts.push(chdCount.toString());
      if (infCount > 0) paxParts.push(infCount.toString());

      return paxParts.length > 0 ? paxParts.join("+") : "0";
    }
    return booking.pax || "0";
  };

  const cost = parseFloat(booking.cost_price) || 0;
  const sell = parseFloat(booking.selling_price) || 0;
  const profit = sell - cost;

  return [
    index,
    booking.orders?.agent_name || "ไม่ระบุ Agent",
    booking.orders?.reference_id || `ID: ${booking.id}`,
    customerName,
    formatPax(),
    booking.transfer_time || "-",
    booking.pickup_location || "-",
    booking.drop_location || "-",
    booking.transfer_flight || "-",
    booking.transfer_ftime || "-",
    booking.send_to || "-",
    booking.note || "-",
    "",
    cost.toLocaleString(), // ฟอร์แมต Cost ด้วยคอมมา
    sell.toLocaleString(), // ฟอร์แมต Sell ด้วยคอมมา
    profit.toLocaleString(), // ฟอร์แมต Profit ด้วยคอมมา
  ];
};

/**
 * ตั้งค่า Tour Sheet
 */
const setupTourSheet = async (
  worksheet,
  tourBookings,
  monthName,
  year,
  exportRange,
  filterType,
  selectedTourRecipient
) => {
  // จัดกลุ่มตามวันที่
  const groupedByDate = {};
  tourBookings.forEach((booking) => {
    const dateKey = booking.tour_date;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(booking);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  // A1: ชื่อรายงาน
  const reportName =
    filterType === "tour_recipient" && selectedTourRecipient
      ? `รายการ Bookings Tour ${selectedTourRecipient}`
      : "รายการ Bookings Tour";
  worksheet.getCell("A1").value = reportName;
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF16A34A" }, // สีเขียวสำหรับหัวข้อTour
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  // A2: เดือนและช่วงเวลา
  worksheet.getCell("A2").value = `${monthName} ${year} (${getRangeText(
    exportRange
  )})`;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Merge cells สำหรับหัวข้อ
  worksheet.mergeCells("A1:O1");
  worksheet.mergeCells("A2:O2");

  let currentRow = 4;

  // คำนวณความกว้างคอลัมน์
  const columnWidths = Array(14).fill(10);

  // สำหรับแต่ละวันที่
  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    // เรียงตามเวลารับ
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.tour_pickup_time || "23:59";
      const timeB = b.tour_pickup_time || "23:59";
      return timeA.localeCompare(timeB);
    });

    // แสดงวันที่
    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `วันที่ ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }, // สีเทาอ่อนสำหรับแถววันที่
    };
    worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
    currentRow++;

    // หัวตาราง
    const tourHeaders = [
      "ลำดับ",
      "Agent",
      "Reference ID",
      "ชื่อลูกค้า",
      "จำนวนคน",
      "เวลารับ",
      "โรงแรม",
      "รายละเอียด",
      "ส่งใคร",
      "หมายเหตุ",
      "",
      "Cost",
      "Sell",
      "Profit",
    ];

    tourHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF16A34A" }, // สีเขียวสำหรับหัวตารางTour
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (index !== 10) {
        // ข้ามคอลัมน์ว่าง
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      columnWidths[index] = Math.max(columnWidths[index], header.length * 1.2);
    });
    currentRow++;

    // ข้อมูลของวันนั้น
    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareTourRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };
        if (colIndex !== 10) {
          // ข้ามคอลัมน์ว่าง
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
        if (colIndex >= 11 && colIndex <= 13) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
          };
        }
        if (index % 2 === 0 && colIndex < 11) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" }, // สีพื้น
          };
        }
        columnWidths[colIndex] = Math.max(
          columnWidths[colIndex],
          String(value).length * 1.2
        );
      });
      currentRow++;
    });
    currentRow++;
  }

  // ตั้งค่าความกว้างคอลัมน์
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  // ตั้งค่าความสูงแถว
  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

  // เพิ่มแถวสรุป Cost, Sell, Profit
  currentRow++;
  const totalCost = tourBookings.reduce(
    (sum, b) => sum + (parseFloat(b.cost_price) || 0),
    0
  );
  const totalSell = tourBookings.reduce(
    (sum, b) => sum + (parseFloat(b.selling_price) || 0),
    0
  );
  const totalProfit = totalSell - totalCost;

  const summaryRow = [
    "สรุป",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalCost.toLocaleString(),
    totalSell.toLocaleString(),
    totalProfit.toLocaleString(),
  ];
  summaryRow.forEach((value, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = value;
    cell.alignment = { vertical: "middle", wrapText: true };
    if (index !== 10) {
      // ข้ามคอลัมน์ว่าง
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
    if (index >= 11 && index <= 13) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
      };
    }
  });
};

/**
 * ตั้งค่า Transfer Sheet
 */
const setupTransferSheet = async (
  worksheet,
  transferBookings,
  monthName,
  year,
  exportRange,
  filterType,
  selectedTransferRecipient
) => {
  // จัดกลุ่มตามวันที่
  const groupedByDate = {};
  transferBookings.forEach((booking) => {
    const dateKey = booking.transfer_date; // เปลี่ยนจาก booking.date เป็น booking.transfer_date
    if (dateKey && !isNaN(new Date(dateKey).getTime())) {
      // ตรวจสอบว่า dateKey ถูกต้อง
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(booking);
    }
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  // A1: ชื่อรายงาน
  const reportName =
    filterType === "transfer_recipient" && selectedTransferRecipient
      ? `รายการ Bookings Transfer ${selectedTransferRecipient}`
      : "รายการ Bookings Transfer";
  worksheet.getCell("A1").value = reportName;
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF2563EB" }, // สีน้ำเงินสำหรับหัวข้อTransfer
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  // A2: เดือนและช่วงเวลา
  worksheet.getCell("A2").value = `${monthName} ${year} (${getRangeText(
    exportRange
  )})`;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  // Merge cells สำหรับหัวข้อ
  worksheet.mergeCells("A1:P1");
  worksheet.mergeCells("A2:P2");

  let currentRow = 4;

  // คำนวณความกว้างคอลัมน์
  const columnWidths = Array(16).fill(10);

  // สำหรับแต่ละวันที่
  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    // เรียงตามเวลารับ
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.transfer_time || "23:59";
      const timeB = b.transfer_time || "23:59";
      return timeA.localeCompare(timeB);
    });

    // แสดงวันที่
    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `วันที่ ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }, // สีเทาอ่อนสำหรับแถววันที่
    };
    worksheet.mergeCells(`A${currentRow}:P${currentRow}`);
    currentRow++;

    // หัวตาราง
    const transferHeaders = [
      "ลำดับ",
      "Agent",
      "Reference ID",
      "ชื่อลูกค้า",
      "จำนวนคน",
      "เวลารับ",
      "รับจาก",
      "ส่งที่",
      "เที่ยวบิน",
      "เวลาบิน",
      "ส่งใคร",
      "หมายเหตุ",
      "",
      "Cost",
      "Sell",
      "Profit",
    ];

    transferHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" }, // สีน้ำเงินสำหรับหัวตารางTransfer
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (index !== 12) {
        // ข้ามคอลัมน์ว่าง
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      columnWidths[index] = Math.max(columnWidths[index], header.length * 1.2);
    });
    currentRow++;

    // ข้อมูลของวันนั้น
    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareTransferRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };
        if (colIndex !== 12) {
          // ข้ามคอลัมน์ว่าง
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
        if (colIndex >= 13 && colIndex <= 15) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
          };
        }
        if (index % 2 === 0 && colIndex < 13) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        }
        columnWidths[colIndex] = Math.max(
          columnWidths[colIndex],
          String(value).length * 1.2
        );
      });
      currentRow++;
    });
    currentRow++;
  }

  // ตั้งค่าความกว้างคอลัมน์
  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  // ตั้งค่าความสูงแถว
  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

  // เพิ่มแถวสรุป Cost, Sell, Profit
  currentRow++;
  const totalCost = transferBookings.reduce(
    (sum, b) => sum + (parseFloat(b.cost_price) || 0),
    0
  );
  const totalSell = transferBookings.reduce(
    (sum, b) => sum + (parseFloat(b.selling_price) || 0),
    0
  );
  const totalProfit = totalSell - totalCost;

  const summaryRow = [
    "สรุป",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalCost.toLocaleString(),
    totalSell.toLocaleString(),
    totalProfit.toLocaleString(),
  ];
  summaryRow.forEach((value, index) => {
    const cell = worksheet.getCell(currentRow, index + 1);
    cell.value = value;
    cell.alignment = { vertical: "middle", wrapText: true };
    if (index !== 12) {
      // ข้ามคอลัมน์ว่าง
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
    if (index >= 13 && index <= 15) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFED7AA" }, // สีส้มอ่อนสำหรับ Cost/Sell/Profit
      };
    }
  });
};
