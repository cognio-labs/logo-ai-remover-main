import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  key: keyof T | string;
  width?: number;
  format?: (value: any, row: T) => any;
}

/**
 * Professional real Excel (.xlsx) exporter using SheetJS
 * Configures headers, column widths, date/currency formatting, auto-filters, and clean filenames.
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  sheetName: string,
  fileNamePrefix: string
) {
  if (!data || data.length === 0) {
    // Generate empty sheet with headers
    const headerRow: Record<string, string> = {};
    columns.forEach((col) => {
      headerRow[col.header] = "No data available";
    });
    const ws = XLSX.utils.json_to_sheet([headerRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${fileNamePrefix}_${dateStr}.xlsx`);
    return;
  }

  // Format rows according to column definitions
  const formattedRows = data.map((row) => {
    const formattedObj: Record<string, any> = {};
    columns.forEach((col) => {
      const rawVal: any = row[col.key as keyof T];
      if (col.format) {
        formattedObj[col.header] = col.format(rawVal, row);
      } else if (rawVal instanceof Date) {
        formattedObj[col.header] = rawVal.toISOString().replace("T", " ").substring(0, 19);
      } else if (rawVal === null || rawVal === undefined) {
        formattedObj[col.header] = "—";
      } else if (typeof rawVal === "boolean") {
        formattedObj[col.header] = rawVal ? "YES" : "NO";
      } else {
        formattedObj[col.header] = rawVal;
      }
    });
    return formattedObj;
  });

  const ws = XLSX.utils.json_to_sheet(formattedRows);

  // Set explicit professional column widths
  ws["!cols"] = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length + 4, 15),
  }));

  // Add auto-filters to header row
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const dateStr = new Date().toISOString().split("T")[0];
  const safeFilename = `${fileNamePrefix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

// Preset exporter helpers for all major entities
export function exportUsersToExcel(users: any[]) {
  exportToExcel(
    users,
    [
      { header: "User ID", key: "id", width: 38 },
      { header: "Email Address", key: "email", width: 28 },
      { header: "Display Name", key: "name", width: 22 },
      { header: "Role", key: "role", width: 14, format: (v) => (v || "user").toUpperCase() },
      { header: "Status", key: "status", width: 14, format: (v) => (v || "active").toUpperCase() },
      { header: "Plan Tier", key: "plan", width: 16, format: (v) => (v || "free").toUpperCase() },
      { header: "Credits Balance", key: "credits", width: 18, format: (v) => Number(v || 0) },
      { header: "Country", key: "country", width: 12 },
      {
        header: "Created Date",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
      {
        header: "Last Login",
        key: "last_login",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
    ],
    "Users",
    "Bellix_Users"
  );
}

export function exportJobsToExcel(jobs: any[]) {
  exportToExcel(
    jobs,
    [
      { header: "Job ID", key: "id", width: 38 },
      { header: "User ID", key: "user_id", width: 38 },
      { header: "Neural Tool", key: "tool", width: 20 },
      { header: "Filename", key: "file_name", width: 30 },
      { header: "Status", key: "status", width: 16, format: (v) => (v || "queued").toUpperCase() },
      { header: "Credits Charged", key: "credits", width: 16 },
      { header: "GPU Seconds", key: "gpu_seconds", width: 16 },
      { header: "Cost ($)", key: "cost", width: 14, format: (v) => `$${Number(v || 0).toFixed(4)}` },
      {
        header: "Created At",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
      {
        header: "Finished At",
        key: "finished_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
      { header: "Error Message", key: "error", width: 30 },
    ],
    "Inference Jobs",
    "Bellix_Inference_Jobs"
  );
}

export function exportLedgerToExcel(ledger: any[]) {
  exportToExcel(
    ledger,
    [
      { header: "Transaction ID", key: "id", width: 38 },
      { header: "User ID", key: "user_id", width: 38 },
      { header: "Change (+/-)", key: "change", width: 16, format: (v) => (v > 0 ? `+${v}` : `${v}`) },
      { header: "Reason", key: "reason", width: 22 },
      { header: "Balance After", key: "balance_after", width: 16 },
      { header: "Associated Job", key: "job_id", width: 38 },
      {
        header: "Timestamp",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
    ],
    "Credit Ledger",
    "Bellix_Credit_Ledger"
  );
}

export function exportAuditLogsToExcel(logs: any[]) {
  exportToExcel(
    logs,
    [
      { header: "Audit ID", key: "id", width: 38 },
      { header: "Admin Email", key: "admin_email", width: 28 },
      { header: "Action", key: "action", width: 20 },
      { header: "Entity", key: "entity", width: 18 },
      { header: "Entity ID", key: "entity_id", width: 38 },
      { header: "IP Address", key: "ip", width: 18 },
      {
        header: "Timestamp",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
    ],
    "Audit Trail",
    "Bellix_Audit_Logs"
  );
}

export function exportPaymentsToExcel(payments: any[]) {
  exportToExcel(
    payments,
    [
      { header: "Payment ID", key: "id", width: 38 },
      { header: "User ID", key: "user_id", width: 38 },
      { header: "Amount", key: "amount", width: 14, format: (v) => `$${Number(v || 0).toFixed(2)}` },
      { header: "Currency", key: "currency", width: 12, format: (v) => (v || "usd").toUpperCase() },
      { header: "Status", key: "status", width: 14, format: (v) => (v || "").toUpperCase() },
      { header: "Stripe Payment ID", key: "stripe_payment_id", width: 32 },
      { header: "Refunded", key: "refunded", width: 12, format: (v) => (v ? "YES" : "NO") },
      {
        header: "Date",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
    ],
    "Payments",
    "Bellix_Payments"
  );
}

export function exportTicketsToExcel(tickets: any[]) {
  exportToExcel(
    tickets,
    [
      { header: "Ticket ID", key: "id", width: 38 },
      { header: "User Email", key: "user_email", width: 28 },
      { header: "Subject", key: "subject", width: 32 },
      { header: "Priority", key: "priority", width: 14, format: (v) => (v || "").toUpperCase() },
      { header: "Status", key: "status", width: 14, format: (v) => (v || "").toUpperCase() },
      { header: "Assignee", key: "assignee", width: 20 },
      {
        header: "Created Date",
        key: "created_at",
        width: 22,
        format: (v) => (v ? new Date(v).toISOString().replace("T", " ").substring(0, 19) : "—"),
      },
    ],
    "Support Tickets",
    "Bellix_Support_Tickets"
  );
}
