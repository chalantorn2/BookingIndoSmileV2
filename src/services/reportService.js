import ExcelJS from "exceljs";
import { format } from "date-fns";

const generateFileName = (startDate, endDate, selectedFilters) => {
  const startFormatted = format(new Date(startDate), "ddMMyyyy");
  const endFormatted = format(new Date(endDate), "ddMMyyyy");
  const dateCreated = format(new Date(), "yyyyMMdd");

  const agentCount = selectedFilters.agents?.length || 0;
  const tourCount = selectedFilters.tourRecipients?.length || 0;
  const transferCount = selectedFilters.transferRecipients?.length || 0;
  const totalFilters = agentCount + tourCount + transferCount;

  let filterText = "";

  if (totalFilters > 1) {
    const filterParts = [];
    if (agentCount > 0)
      filterParts.push(`${agentCount}agent${agentCount > 1 ? "s" : ""}`);
    if (tourCount > 0)
      filterParts.push(`${tourCount}tour${tourCount > 1 ? "s" : ""}`);
    if (transferCount > 0)
      filterParts.push(
        `${transferCount}transfer${transferCount > 1 ? "s" : ""}`
      );
    filterText = filterParts.join("-");
  } else if (totalFilters === 1) {
    if (agentCount === 1) filterText = selectedFilters.agents[0];
    else if (tourCount === 1)
      filterText = `Tour${selectedFilters.tourRecipients[0]}`;
    else if (transferCount === 1)
      filterText = `Transfer${selectedFilters.transferRecipients[0]}`;
  } else {
    filterText = "All";
  }

  return `Report${filterText}_${startFormatted}-${endFormatted}_${dateCreated}.xlsx`;
};

/**
 * ฟังก์ชันสำหรับ export รายงานเป็นไฟล์ Excel
 * @param {Array} tourBookings - รายการจอง tour
 * @param {Array} transferBookings - รายการจอง transfer
 * @param {string} startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param {string} endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @param {string} exportFormat - รูปแบบ (combined, separate)
 * @param {object} selectedFilters - ตัวกรองที่เลือก
 */
export const exportReportToExcel = async (
  tourBookings,
  transferBookings,
  startDate,
  endDate,
  exportFormat = "combined",
  selectedFilters = {
    agents: [],
    tourRecipients: [],
    transferRecipients: [],
  }
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SevenSmile Booking System";
    workbook.lastModifiedBy = "SevenSmile";
    workbook.created = new Date();
    workbook.modified = new Date();

    // ข้อมูลถูก filter มาแล้วจาก Report.jsx ไม่ต้อง filter อีก
    const filteredTourBookings = tourBookings;
    const filteredTransferBookings = transferBookings;

    const dateRangeText = `${format(new Date(startDate), "dd/MM/yyyy")} - ${format(new Date(endDate), "dd/MM/yyyy")}`;
    const sheetName = format(new Date(startDate), "MMM-yyyy");

    let reportName = "Booking List";

    const fileName = generateFileName(startDate, endDate, selectedFilters);

    const hasTour = filteredTourBookings.length > 0;
    const hasTransfer = filteredTransferBookings.length > 0;

    if (!hasTour && !hasTransfer) {
      throw new Error("No data to export");
    }

    if (exportFormat === "separate") {
      if (hasTour) {
        const tourWorksheet = workbook.addWorksheet("Tour Bookings");
        await setupTourSheet(
          tourWorksheet,
          filteredTourBookings,
          dateRangeText
        );
      }

      if (hasTransfer) {
        const transferWorksheet = workbook.addWorksheet("Transfer Bookings");
        await setupTransferSheet(
          transferWorksheet,
          filteredTransferBookings,
          dateRangeText
        );
      }
    } else {
      const worksheet = workbook.addWorksheet(sheetName);
      await setupCombinedSheet(
        worksheet,
        filteredTourBookings,
        filteredTransferBookings,
        dateRangeText,
        reportName
      );
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      message: `Export successful: ${fileName}`,
    };
  } catch (error) {
    console.error("Error exporting report to Excel:", error);
    return {
      success: false,
      error: error.message,
      message: "Error exporting report",
    };
  }
};


const setupCombinedSheet = async (
  worksheet,
  tourBookings,
  transferBookings,
  dateRangeText,
  reportName
) => {
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

  const groupedByDate = {};
  allBookings.forEach((booking) => {
    const dateKey = booking.date;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(booking);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  worksheet.getCell("A1").value = reportName;
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell("A2").value = dateRangeText;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A1:S1");
  worksheet.mergeCells("A2:S2");

  let currentRow = 4;
  const columnWidths = Array(19).fill(10); // เพิ่มจาก 18 เป็น 19

  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.time || "23:59";
      const timeB = b.time || "23:59";
      return timeA.localeCompare(timeB);
    });

    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `Date: ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    worksheet.mergeCells(`A${currentRow}:S${currentRow}`); // เปลี่ยนจาก R เป็น S
    currentRow++;

    const headers = [
      "No.",
      "Type",
      "Agent",
      "Customer Name",
      "Pax",
      "Pickup Time",
      "Hotel",
      "Details",
      "Pickup From",
      "Drop To",
      "Flight",
      "Flight Time",
      "Send To",
      "Remark",
      "",
      "Cost",
      "Sell",
      "Profit",
      "Note",
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF6B7280" },
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      // คอลัมน์ O (index 14) ไม่มี border
      if (index !== 14) {
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

    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareCombinedRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };

        // คอลัมน์ O (index 14) ไม่มี border
        if (colIndex !== 14) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }

        // สี Cost, Sell, Profit (คอลัมน์ 15, 16, 17) - ข้อมูลชิดขวา
        if (colIndex >= 15 && colIndex <= 17) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" },
          };
          cell.alignment = {
            horizontal: "right",
            vertical: "middle",
            wrapText: true,
          };
        }

        // สี Note (คอลัมน์ 18) - สีส้มอ่อนกว่า
        if (colIndex === 18) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEED9" }, // สีส้มอ่อนกว่า
          };
        }

        // สีสลับแถวสำหรับคอลัมน์อื่นๆ (ไม่รวม Cost, Sell, Profit, Note)
        if (index % 2 === 0 && colIndex < 15) {
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

  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

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

  // แถว "สรุป" - merge จาก A ถึง N
  worksheet.getCell(currentRow, 1).value = "Summary";
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(currentRow, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  worksheet.mergeCells(`A${currentRow}:N${currentRow}`); // merge A ถึง N

  // ข้อมูล totals ในตำแหน่งใหม่ - อยู่ตรงกลาง
  worksheet.getCell(currentRow, 16).value = totalCost.toLocaleString(); // คอลัมน์ P
  worksheet.getCell(currentRow, 17).value = totalSell.toLocaleString(); // คอลัมน์ Q
  worksheet.getCell(currentRow, 18).value = totalProfit.toLocaleString(); // คอลัมน์ R

  [16, 17, 18].forEach((colIndex) => {
    const cell = worksheet.getCell(currentRow, colIndex);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFED7AA" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = {
      horizontal: "center", // totals อยู่ตรงกลาง
      vertical: "middle",
    };
    cell.font = { bold: true };
  });
};

const setupTransferSheet = async (
  worksheet,
  transferBookings,
  dateRangeText
) => {
  const groupedByDate = {};
  transferBookings.forEach((booking) => {
    const dateKey = booking.transfer_date;
    if (dateKey && !isNaN(new Date(dateKey).getTime())) {
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(booking);
    }
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  worksheet.getCell("A1").value = "Transfer Booking List";
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF2563EB" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell("A2").value = dateRangeText;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A1:P1");
  worksheet.mergeCells("A2:P2");

  let currentRow = 4;
  const columnWidths = Array(16).fill(10); // เพิ่มจาก 15 เป็น 16

  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.transfer_time || "23:59";
      const timeB = b.transfer_time || "23:59";
      return timeA.localeCompare(timeB);
    });

    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `Date: ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    worksheet.mergeCells(`A${currentRow}:P${currentRow}`); // เปลี่ยนจาก O เป็น P
    currentRow++;

    const transferHeaders = [
      "No.",
      "Agent",
      "Customer Name",
      "Pax",
      "Pickup Time",
      "Pickup From",
      "Drop To",
      "Flight",
      "Flight Time",
      "Send To",
      "Remark",
      "",
      "Cost",
      "Sell",
      "Profit",
      "Note",
    ];

    transferHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" },
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      // คอลัมน์ L (index 11) ไม่มี border
      if (index !== 11) {
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

    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareTransferRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };

        // คอลัมน์ L (index 11) ไม่มี border
        if (colIndex !== 11) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }

        // สี Cost, Sell, Profit (คอลัมน์ 12, 13, 14) - ข้อมูลชิดขวา
        if (colIndex >= 12 && colIndex <= 14) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" },
          };
          cell.alignment = {
            horizontal: "right",
            vertical: "middle",
            wrapText: true,
          };
        }

        // สี Note (คอลัมน์ 15) - สีส้มอ่อนกว่า
        if (colIndex === 15) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEED9" }, // สีส้มอ่อนกว่า
          };
        }

        // สีสลับแถวสำหรับคอลัมน์อื่นๆ (ไม่รวม Cost, Sell, Profit, Note)
        if (index % 2 === 0 && colIndex < 12) {
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

  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

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

  // แถว "สรุป" - merge จาก A ถึง L และใส่ border
  worksheet.getCell(currentRow, 1).value = "Summary";
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(currentRow, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  worksheet.mergeCells(`A${currentRow}:L${currentRow}`); // merge A ถึง L

  // ข้อมูล totals - อยู่ตรงกลาง
  worksheet.getCell(currentRow, 13).value = totalCost.toLocaleString();
  worksheet.getCell(currentRow, 14).value = totalSell.toLocaleString();
  worksheet.getCell(currentRow, 15).value = totalProfit.toLocaleString();

  [13, 14, 15].forEach((colIndex) => {
    const cell = worksheet.getCell(currentRow, colIndex);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFED7AA" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = {
      horizontal: "center", // totals อยู่ตรงกลาง
      vertical: "middle",
    };
    cell.font = { bold: true };
  });
};

const setupTourSheet = async (
  worksheet,
  tourBookings,
  dateRangeText
) => {
  const groupedByDate = {};
  tourBookings.forEach((booking) => {
    const dateKey = booking.tour_date;
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(booking);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  worksheet.getCell("A1").value = "Tour Booking List";
  worksheet.getCell("A1").font = {
    size: 16,
    bold: true,
    color: { argb: "FF16A34A" },
  };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.getCell("A2").value = dateRangeText;
  worksheet.getCell("A2").font = {
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  worksheet.getCell("A2").alignment = { horizontal: "center" };

  worksheet.mergeCells("A1:N1");
  worksheet.mergeCells("A2:N2");

  let currentRow = 4;
  const columnWidths = Array(14).fill(10); // เพิ่มจาก 13 เป็น 14

  for (const dateKey of sortedDates) {
    let bookingsOfDate = groupedByDate[dateKey];
    bookingsOfDate = bookingsOfDate.sort((a, b) => {
      const timeA = a.tour_pickup_time || "23:59";
      const timeB = b.tour_pickup_time || "23:59";
      return timeA.localeCompare(timeB);
    });

    const dateCell = worksheet.getCell(currentRow, 1);
    dateCell.value = `Date: ${format(new Date(dateKey), "dd/MM/yyyy")}`;
    dateCell.font = {
      size: 14,
      bold: true,
      color: { argb: "FF000000" },
    };
    dateCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    worksheet.mergeCells(`A${currentRow}:N${currentRow}`); // เปลี่ยนจาก M เป็น N
    currentRow++;

    const tourHeaders = [
      "No.",
      "Agent",
      "Customer Name",
      "Pax",
      "Pickup Time",
      "Hotel",
      "Details",
      "Send To",
      "Remark",
      "",
      "Cost",
      "Sell",
      "Profit",
      "Note",
    ];

    tourHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      if (header !== "") {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF16A34A" },
        };
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
      // คอลัมน์ J (index 9) ไม่มี border
      if (index !== 9) {
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

    bookingsOfDate.forEach((booking, index) => {
      const rowData = prepareTourRowData(booking, index + 1);
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: true };

        // คอลัมน์ J (index 9) ไม่มี border
        if (colIndex !== 9) {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }

        // สี Cost, Sell, Profit (คอลัมน์ 10, 11, 12) - ข้อมูลชิดขวา
        if (colIndex >= 10 && colIndex <= 12) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFED7AA" },
          };
          cell.alignment = {
            horizontal: "right",
            vertical: "middle",
            wrapText: true,
          };
        }

        // สี Note (คอลัมน์ 13) - สีส้มอ่อนกว่า
        if (colIndex === 13) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEED9" }, // สีส้มอ่อนกว่า
          };
        }

        // สีสลับแถวสำหรับคอลัมน์อื่นๆ (ไม่รวม Cost, Sell, Profit, Note)
        if (index % 2 === 0 && colIndex < 10) {
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

  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = Math.min(Math.max(width, 10), 50);
  });

  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 20;

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

  // แถว "สรุป" - merge จาก A ถึง J และใส่ border
  worksheet.getCell(currentRow, 1).value = "Summary";
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  worksheet.getCell(currentRow, 1).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`); // merge A ถึง J

  // ข้อมูล totals - อยู่ตรงกลาง
  worksheet.getCell(currentRow, 11).value = totalCost.toLocaleString();
  worksheet.getCell(currentRow, 12).value = totalSell.toLocaleString();
  worksheet.getCell(currentRow, 13).value = totalProfit.toLocaleString();

  [11, 12, 13].forEach((colIndex) => {
    const cell = worksheet.getCell(currentRow, colIndex);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFED7AA" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = {
      horizontal: "center", // totals อยู่ตรงกลาง
      vertical: "middle",
    };
    cell.font = { bold: true };
  });
};

const prepareCombinedRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "No Name";

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

  // แยกข้อมูลให้ชัดเจน
  let hotel, details, pickupFrom, dropTo, flight, flightTime, time;

  if (booking.type === "tour") {
    hotel = booking.tour_hotel || "-";
    details = booking.tour_detail || "-";
    pickupFrom = "-"; // Tour ไม่มีจุดรับ
    dropTo = "-"; // Tour ไม่มีจุดส่ง
    flight = "-";
    flightTime = "-";
    time = booking.tour_pickup_time || "-";
  } else {
    hotel = "-"; // Transfer ไม่มีโรงแรม
    details = "-"; // Transfer ไม่มีรายละเอียดทัวร์
    pickupFrom = booking.pickup_location || "-";
    dropTo = booking.drop_location || "-";
    flight = booking.transfer_flight || "-";
    flightTime = booking.transfer_ftime || "-";
    time = booking.transfer_time || "-";
  }

  return [
    index,
    booking.type === "tour" ? "Tour" : "Transfer",
    booking.orders?.agent_name || "No Agent",
    customerName,
    formatPax(),
    time,
    hotel, // โรงแรม (เฉพาะ Tour)
    details, // รายละเอียด (เฉพาะ Tour)
    pickupFrom, // รับจาก (เฉพาะ Transfer)
    dropTo, // ส่งที่ (เฉพาะ Transfer)
    flight,
    flightTime,
    booking.send_to || "-",
    booking.note || "-",
    "",
    cost.toLocaleString(),
    sell.toLocaleString(),
    profit.toLocaleString(),
    booking.payment_note || "-", // เพิ่ม payment_note
  ];
};

const prepareTourRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "No Name";

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
    booking.orders?.agent_name || "No Agent",
    customerName,
    formatPax(),
    booking.tour_pickup_time || "-",
    booking.tour_hotel || "-",
    booking.tour_detail || "-",
    booking.send_to || "-",
    booking.note || "-",
    "",
    cost.toLocaleString(),
    sell.toLocaleString(),
    profit.toLocaleString(),
    booking.payment_note || "-", // เพิ่ม payment_note
  ];
};

const prepareTransferRowData = (booking, index) => {
  const firstName = booking.orders?.first_name || "";
  const lastName = booking.orders?.last_name || "";
  const customerName = `${firstName} ${lastName}`.trim() || "No Name";

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
    booking.orders?.agent_name || "No Agent",
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
    cost.toLocaleString(),
    sell.toLocaleString(),
    profit.toLocaleString(),
    booking.payment_note || "-", // เพิ่ม payment_note
  ];
};
