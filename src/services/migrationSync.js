/**
 * Migration Sync Service
 * Handles silent dual-write to the new MySQL database on Plesk.
 */

const SYNC_API_URL = "https://bookings.indosmilesouthservices.com/api/sync.php";

/**
 * Sends data to the new database API.
 * This function is "fire-and-forget" and will not throw errors to the caller.
 *
 * @param {string} table - The target table name (e.g., 'information', 'users')
 * @param {string} action - The action to perform ('insert', 'update', 'delete')
 * @param {object} data - The data payload (column: value pairs)
 * @param {string} primaryKey - The primary key column name (default: 'id')
 */
export const syncToNewDb = async (table, action, data, primaryKey = "id") => {
  try {
    console.log(`🔄 Syncing to new DB: ${table} -> ${action}`, data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(SYNC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table,
        action,
        data,
        primaryKey,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Sync failed (${response.status}): ${response.statusText}`,
        errorText
      );
      return;
    }

    const result = await response.json();
    if (result.status === "error") {
      console.error("❌ Sync API Error:", result.message);
    } else {
      console.log("✅ Sync success:", result);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("❌ Sync timed out");
    } else {
      console.error("❌ Sync exception:", error);
    }
    // Do not throw error, keep the app running
  }
};
