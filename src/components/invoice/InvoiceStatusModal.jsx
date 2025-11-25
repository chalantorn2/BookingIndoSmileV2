// src/components/invoice/InvoiceStatusModal.jsx
import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  Save,
  Eye,
} from "lucide-react";
import { useNotification } from "../../hooks/useNotification";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";
import { uploadFile, deleteFile } from "../../services/fileUploadService";
import { validateFile, formatFileSize } from "../../utils/fileValidation";
import {
  updateInvoiceStatus,
  updateInvoiceAttachments,
  fetchAllInvoices,
} from "../../services/invoiceService";

const InvoiceStatusModal = ({
  isOpen,
  onClose,
  onInvoiceSelect,
  allPaymentsData = [],
}) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const showAlert = useAlertDialogContext();

  // States
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load recent invoices when opening Modal
  useEffect(() => {
    if (isOpen) {
      loadRecentInvoices();
    }
  }, [isOpen]);

  // Load invoice details when selecting Invoice
  useEffect(() => {
    if (selectedInvoice) {
      setInvoiceStatus(selectedInvoice.status || false);
      setAttachments(selectedInvoice.attachments || []);
    }
  }, [selectedInvoice]);

  // Search invoices
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchAllInvoices();
      if (error) throw new Error(error);

      // Sort by latest creation date and take only first 5
      const recent = (data || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setRecentInvoices(recent);
    } catch (error) {
      console.error("Error loading recent invoices:", error);
      showError("Unable to load Invoice list");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const { data, error } = await fetchAllInvoices();
      if (error) throw new Error(error);

      const filtered = (data || []).filter(
        (invoice) =>
          (invoice.invoice_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (invoice.invoice_date || "").includes(searchQuery)
      );

      setSearchResults(filtered);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching invoices:", error);
      showError("An error occurred while searching");
    }
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setShowSearchResults(false);
    setSearchQuery("");
  };

  const handleStatusToggle = async () => {
    const newStatus = !invoiceStatus;
    setInvoiceStatus(newStatus);

    // ✅ Auto-save status immediately when changed
    if (selectedInvoice?.id) {
      try {
        const result = await updateInvoiceStatus(selectedInvoice.id, newStatus);
        if (result.success) {
          showInfo(
            `Status updated to "${
              newStatus ? "Complete" : "Incomplete"
            }" automatically`
          );

          // 🔄 Update local state in recentInvoices and searchResults
          const updateInvoiceInList = (invoiceList) =>
            invoiceList.map((invoice) =>
              invoice.id === selectedInvoice.id
                ? { ...invoice, status: newStatus }
                : invoice
            );

          setRecentInvoices((prev) => updateInvoiceInList(prev));
          setSearchResults((prev) => updateInvoiceInList(prev));

          // Update selectedInvoice as well
          setSelectedInvoice((prev) => ({ ...prev, status: newStatus }));
        } else {
          // Revert status if save fails
          setInvoiceStatus(!newStatus);
          showError("Unable to save status. Please try again");
        }
      } catch (autoSaveError) {
        console.error("Auto-save status error:", autoSaveError);
        // Revert status if error occurs
        setInvoiceStatus(!newStatus);
        showError("An error occurred while saving status. Please try again");
      }
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedInvoice) {
      showError("Please select an Invoice before uploading files");
      return;
    }

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        // Validate file
        const validation = validateFile(file, 5);
        if (!validation.isValid) {
          showError(`${file.name}: ${validation.error}`);
          continue;
        }

        // Upload file
        const { success, data, error } = await uploadFile(
          file,
          `invoices/${selectedInvoice.id}`
        );

        if (success) {
          uploadedFiles.push(data);
          showSuccess(`Upload ${file.name} successfully`);
        } else {
          showError(`An error occurred while uploading ${file.name}: ${error}`);
        }
      }

      if (uploadedFiles.length > 0) {
        const newAttachments = [...attachments, ...uploadedFiles];
        setAttachments(newAttachments);

        // ✅ Auto-save filesimmediately after uploadsuccessfully
        try {
          const attachmentResult = await updateInvoiceAttachments(
            selectedInvoice.id,
            newAttachments
          );
          if (attachmentResult.success) {
            showInfo(
              `Save attachmentsautomatically (${uploadedFiles.length} files)`
            );

            // 🔄 Update local state in recentInvoices and searchResults
            const updateInvoiceAttachments = (invoiceList) =>
              invoiceList.map((invoice) =>
                invoice.id === selectedInvoice.id
                  ? { ...invoice, attachments: newAttachments }
                  : invoice
              );

            setRecentInvoices((prev) => updateInvoiceAttachments(prev));
            setSearchResults((prev) => updateInvoiceAttachments(prev));

            // Update selectedInvoice as well
            setSelectedInvoice((prev) => ({
              ...prev,
              attachments: newAttachments,
            }));
          } else {
            showError(
              "Upload successful but unable to save data. Please click save again"
            );
          }
        } catch (autoSaveError) {
          console.error("Auto-save error:", autoSaveError);
          showError(
            "Upload successful but unable to auto-save. Please click save to confirm"
          );
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      showError("An error occurred while uploading file");
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleFileDelete = async (fileIndex) => {
    const file = attachments[fileIndex];

    const confirmed = await showAlert({
      title: "Confirm file deletion",
      description: `Do you want to delete file "${file.name}" ?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      actionVariant: "destructive",
    });

    if (!confirmed) return;

    try {
      // Delete file from Storage
      const { success, error } = await deleteFile(file.path);

      if (success) {
        // Remove from state
        const newAttachments = attachments.filter(
          (_, index) => index !== fileIndex
        );
        setAttachments(newAttachments);
        showSuccess("File deleted successfully");

        // ✅ Auto-save filesimmediately after deletionsuccessfully
        try {
          if (selectedInvoice?.id) {
            const attachmentResult = await updateInvoiceAttachments(
              selectedInvoice.id,
              newAttachments
            );
            if (attachmentResult.success) {
              showInfo("File deletion saved automatically");

              // 🔄 Update local state in recentInvoices and searchResults
              const updateInvoiceAttachments = (invoiceList) =>
                invoiceList.map((invoice) =>
                  invoice.id === selectedInvoice.id
                    ? { ...invoice, attachments: newAttachments }
                    : invoice
                );

              setRecentInvoices((prev) => updateInvoiceAttachments(prev));
              setSearchResults((prev) => updateInvoiceAttachments(prev));

              // Update selectedInvoice as well
              setSelectedInvoice((prev) => ({
                ...prev,
                attachments: newAttachments,
              }));
            } else {
              showError(
                "File deleted successfullybut unable to save data. Please click Save again"
              );
            }
          }
        } catch (autoSaveError) {
          console.error("Auto-save error after delete:", autoSaveError);
          showError(
            "File deleted successfullybut unable to auto-save. Please click Save to confirm"
          );
        }
      } else {
        showError(`An error occurred while deleting file: ${error}`);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      showError("An error occurred while deleting file");
    }
  };

  const handleDownloadFile = (file) => {
    // Open file in new tab
    window.open(file.url, "_blank");
  };

  const handleSave = async () => {
    if (!selectedInvoice) {
      showError("Please select an Invoice first");
      return;
    }

    setLoading(true);

    try {
      // Update status
      const statusResult = await updateInvoiceStatus(
        selectedInvoice.id,
        invoiceStatus
      );
      if (!statusResult.success) {
        throw new Error(statusResult.error);
      }

      // Update attachments
      const attachmentResult = await updateInvoiceAttachments(
        selectedInvoice.id,
        attachments
      );
      if (!attachmentResult.success) {
        throw new Error(attachmentResult.error);
      }

      showSuccess("Data saved successfully");

      // Close Modal immediately after saving successfully
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error saving invoice status:", error);
      showError(`An error occurred while saving: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderFileIcon = (fileType) => {
    if (fileType.includes("pdf")) {
      return <FileText size={16} className="text-red-500" />;
    } else if (fileType.includes("image")) {
      return <Image size={16} className="text-blue-500" />;
    }
    return <FileText size={16} className="text-gray-500" />;
  };

  const handleFilePreview = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };

  const renderInvoiceList = (invoices, title) => (
    <div className="mb-4">
      <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
      {invoices.length === 0 ? (
        <p className="text-gray-500 text-sm">No data found</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              onClick={() => handleInvoiceSelect(invoice)}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedInvoice?.id === invoice.id
                  ? "bg-blue-50 border-blue-300"
                  : "hover:bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">
                    {invoice.invoice_name || "No name"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoice.invoice_date || "No date"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      invoice.status
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {invoice.status ? "Complete" : "Incomplete"}
                  </span>
                  {invoice.attachments && invoice.attachments.length > 0 && (
                    <span className="text-xs text-blue-600">
                      {invoice.attachments.length} files
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  const calculateRealTimeTotal = (invoice, allPaymentsData) => {
    if (!invoice?.payment_ids || !allPaymentsData) return 0;

    let total = 0;
    const relatedPayments = allPaymentsData.filter((p) =>
      invoice.payment_ids.includes(p.id)
    );

    relatedPayments.forEach((payment) => {
      if (payment.bookings && Array.isArray(payment.bookings)) {
        payment.bookings.forEach((booking) => {
          const price = parseFloat(booking.sellingPrice) || 0;
          const quantity = parseInt(booking.quantity) || 0;
          total += price * quantity;
        });
      }
    });

    return total;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
          <h3 className="text-xl font-semibold">Check Invoice Status</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: Invoice list */}
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search Invoice (name or date)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              {showSearchResults &&
                renderInvoiceList(
                  searchResults,
                  `Search Results (${searchResults.length} items)`
                )}

              {/* Recent Invoices */}
              {!showSearchResults && (
                <>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading...</p>
                    </div>
                  ) : (
                    renderInvoiceList(
                      recentInvoices,
                      "Latest Invoices (5 items)"
                    )
                  )}
                </>
              )}
            </div>

            {/* Right side: Invoice details */}
            <div>
              {selectedInvoice ? (
                <div className="space-y-4">
                  {/* Invoice Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Invoice Information
                    </h4>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedInvoice.invoice_name}
                    </p>
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {selectedInvoice.invoice_date}
                    </p>
                    {selectedInvoice &&
                      (() => {
                        const realTimeTotal = calculateRealTimeTotal(
                          selectedInvoice,
                          allPaymentsData
                        );
                        const deduction = parseFloat(
                          selectedInvoice.deduction_amount || 0
                        );
                        return (
                          <p>
                            <span className="font-medium">Total:</span>{" "}
                            {(realTimeTotal - deduction).toLocaleString()} THB
                          </p>
                        );
                      })()}
                  </div>

                  {/* Status Toggle */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">
                      Invoice Status
                    </h4>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invoiceStatus}
                        onChange={handleStatusToggle}
                        className="sr-only"
                      />
                      <span
                        className={`mr-3 text-sm text-white px-3 py-1 rounded-lg ${
                          invoiceStatus ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {invoiceStatus ? "Complete" : "Incomplete"}
                      </span>
                      <span
                        className={`relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                          invoiceStatus ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                            invoiceStatus ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </label>
                  </div>

                  {/* File Upload */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">
                      Attachments
                    </h4>

                    {/* Upload Button */}
                    <div className="mb-4">
                      <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                        <Upload size={16} className="mr-2" />
                        {uploading ? "Uploading..." : "Select files"}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports PDF, JPG, PNG (max 5MB)
                      </p>
                    </div>

                    {/* File List */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex items-center space-x-3">
                              {renderFileIcon(file.type)}
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </p>
                                <p className="text-xs text-blue-600">
                                  Click "Preview" button to view files
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleFilePreview(file)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                                title="Preview"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleFileDelete(index)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Select an Invoice to manage status and attachments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {selectedInvoice && (
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                      fill="none"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      className="opacity-75"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop">
          <div className="relative max-w-6xl max-h-[95vh] bg-white rounded-lg overflow-hidden w-full mx-4">
            <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
              <div>
                <h4 className="font-medium text-lg">{previewFile.name}</h4>
                <p className="text-sm text-gray-500">
                  Size: {formatFileSize(previewFile.size)}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="overflow-auto"
              style={{ height: "calc(95vh - 120px)" }}
            >
              {previewFile.type.includes("image") ? (
                <div className="p-4 flex justify-center">
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-1/2 max-h-1/2 object-contain"
                  />
                </div>
              ) : previewFile.type.includes("pdf") ? (
                <div className="h-full">
                  {/* Try to display PDF with various methods */}
                  <div className="h-full">
                    {/* Method 1: Use embed tag */}
                    <embed
                      src={`${previewFile.url}#toolbar=1&navpanes=1&scrollbar=1`}
                      type="application/pdf"
                      width="100%"
                      height="100%"
                      className="min-h-[600px]"
                      onError={(e) => {
                        console.log("Embed failed, trying iframe");
                        e.target.style.display = "none";
                        // Show fallback
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.style.display = "block";
                      }}
                    />

                    {/* Method 2: Fallback - iframe */}
                    <div style={{ display: "none" }} className="h-full">
                      <iframe
                        src={`${previewFile.url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                        className="w-full h-full min-h-[600px] border-0"
                        title={previewFile.name}
                        onError={(e) => {
                          console.log(
                            "Iframe failed, showing fallback buttons"
                          );
                          e.target.parentElement.style.display = "none";
                          const buttonFallback =
                            e.target.parentElement.parentElement.querySelector(
                              ".pdf-fallback"
                            );
                          if (buttonFallback)
                            buttonFallback.style.display = "block";
                        }}
                      />
                    </div>

                    {/* Method 3: Fallback - Alternative buttons */}
                    <div
                      className="pdf-fallback text-center p-8"
                      style={{ display: "none" }}
                    >
                      <FileText
                        size={64}
                        className="mx-auto mb-4 text-red-500"
                      />
                      <h3 className="text-xl font-medium mb-4">
                        Unable to display PDF
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Your browser does not support direct PDF display
                      </p>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                          <button
                            onClick={() =>
                              window.open(previewFile.url, "_blank")
                            }
                            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                          >
                            <Eye size={20} className="mr-2" />
                            Open in New Tab
                          </button>

                          <button
                            onClick={() => handleDownloadFile(previewFile)}
                            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            <Download size={20} className="mr-2" />
                            Download
                          </button>
                        </div>

                        <div className="text-center">
                          <button
                            onClick={() =>
                              window.open(
                                `https://docs.google.com/viewer?url=${encodeURIComponent(
                                  previewFile.url
                                )}&embedded=true`,
                                "_blank"
                              )
                            }
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center"
                          >
                            <FileText size={16} className="mr-2" />
                            Google Docs Viewer
                          </button>
                        </div>

                        <div className="text-center">
                          <button
                            onClick={() =>
                              window.open(
                                `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
                                  previewFile.url
                                )}`,
                                "_blank"
                              )
                            }
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center"
                          >
                            <FileText size={16} className="mr-2" />
                            PDF.js Viewer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">
                    Preview not supported
                  </h3>
                  <p className="text-gray-600 mb-4">
                    File type {previewFile.type}
                  </p>
                  <div className="space-x-4">
                    <button
                      onClick={() => window.open(previewFile.url, "_blank")}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center"
                    >
                      <Eye size={16} className="mr-2" />
                      Open in new page
                    </button>
                    <button
                      onClick={() => handleDownloadFile(previewFile)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center"
                    >
                      <Download size={16} className="mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer for PDF */}
            {previewFile.type.includes("pdf") && (
              <div className="p-3 bg-gray-50 border-t text-center">
                <div className="flex justify-center space-x-4 text-sm">
                  <button
                    onClick={() => window.open(previewFile.url, "_blank")}
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <Eye size={14} className="mr-1" />
                    Open in New Tab
                  </button>
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="text-green-600 hover:underline flex items-center"
                  >
                    <Download size={14} className="mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://docs.google.com/viewer?url=${encodeURIComponent(
                          previewFile.url
                        )}`,
                        "_blank"
                      )
                    }
                    className="text-orange-600 hover:underline flex items-center"
                  >
                    <FileText size={14} className="mr-1" />
                    Google Viewer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceStatusModal;
