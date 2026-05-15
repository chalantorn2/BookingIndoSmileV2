<?php

/**
 * Website Intake API
 *
 * Receives bookings from the customer-facing website
 * (www.indosmilesouthservices.com) and writes them into:
 *   1. Supabase (primary, read by admin web on Netlify)
 *   2. MySQL `sevensmile_indosmile_bookings` (mirror)
 *
 * Endpoint: POST https://bookings.indosmilesouthservices.com/api/intake.php
 *
 * Required header: X-Intake-Key: <shared secret>
 *
 * Body:
 *   { "type": "tour" | "transfer", "booking": { ... } }
 *
 * No schema changes required. Uses existing columns only:
 *   - orders.agent_name = "Website"      (identifies source)
 *   - orders.reference_id                (generated like "Website-2026-4-0014",
 *                                         using the existing sequences table)
 *   - tour_bookings.reference_id         ("T-2026-4-NNNN")
 *   - transfer_bookings.reference_id     ("Tr-2026-4-NNNN")
 *   - tour_bookings.tour_detail / transfer_bookings.transfer_detail
 *                                        (stuffs Web Ref / Email / Phone /
 *                                         Special — so staff can still match
 *                                         the customer's INDO... reference)
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Intake-Key");
header("Content-Type: application/json; charset=UTF-8");

// =====================================================================
// CONFIG
// =====================================================================

$SUPABASE_URL = 'https://itehwlzixbylnmxjxcmv.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZWh3bHppeGJ5bG5teGp4Y212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNzI0NjMsImV4cCI6MjA2MzY0ODQ2M30.y4qOApQEknv_e9kozwPznOqCqAoxqFdsxaUbWsI7Xts';

// Shared secret. Must match the value used by official-web. CHANGE BEFORE DEPLOY.
$INTAKE_SECRET = 'INDO_INTAKE_2026_CHANGE_ME_a8f3d2c1b4e7';

// MySQL mirror (same as sync.php)
$MYSQL_HOST = 'localhost:3306';
$MYSQL_DB   = 'sevensmile_indosmile_bookings';
$MYSQL_USER = 'sevensmile_indosmile_bookings';
$MYSQL_PASS = 'oS6h?IPyodz1gf@6';

date_default_timezone_set('Asia/Bangkok');

// =====================================================================
// LOGGING
// =====================================================================

function logIntake($msg)
{
    $logFile = __DIR__ . '/intake_debug.log';
    file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL, FILE_APPEND);
}

// =====================================================================
// PREFLIGHT + METHOD GUARD
// =====================================================================

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// =====================================================================
// AUTH
// =====================================================================

$providedKey = $_SERVER['HTTP_X_INTAKE_KEY'] ?? '';
if (!hash_equals($INTAKE_SECRET, $providedKey)) {
    logIntake('Auth failed: bad or missing X-Intake-Key from ' . ($_SERVER['REMOTE_ADDR'] ?? '?'));
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// =====================================================================
// READ INPUT
// =====================================================================

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
logIntake('Received: ' . substr($raw, 0, 800));

if (!$input || !isset($input['type']) || !isset($input['booking'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing type or booking']);
    exit;
}

$type    = $input['type'];
$booking = $input['booking'];

if (!in_array($type, ['tour', 'transfer'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid type']);
    exit;
}

// =====================================================================
// HELPERS
// =====================================================================

function supabaseRequest($method, $path, $body = null)
{
    global $SUPABASE_URL, $SUPABASE_KEY;
    $url = $SUPABASE_URL . '/rest/v1/' . $path;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $SUPABASE_KEY,
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    }
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new Exception("Supabase $method $path curl error: $err");
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new Exception("Supabase $method $path failed ($httpCode): $response");
    }
    return json_decode($response, true);
}

function mysqlMirror($table, $data)
{
    global $MYSQL_HOST, $MYSQL_DB, $MYSQL_USER, $MYSQL_PASS;
    try {
        $conn = new PDO(
            "mysql:host=$MYSQL_HOST;dbname=$MYSQL_DB;charset=utf8mb4",
            $MYSQL_USER,
            $MYSQL_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $cols = array_keys($data);
        $placeholders = array_map(function ($c) {
            return ':' . $c;
        }, $cols);
        $sql = "INSERT INTO $table (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $conn->prepare($sql);
        foreach ($data as $k => $v) {
            if (is_bool($v)) $v = $v ? 1 : 0;
            if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->execute();
    } catch (Exception $e) {
        // Mirror failures are non-fatal — Supabase is the source of truth
        logIntake("MySQL mirror skipped for $table: " . $e->getMessage());
    }
}

function splitName($full)
{
    $full = trim((string)$full);
    if ($full === '') return ['', ''];
    if (strpos($full, ' ') === false) return [$full, ''];
    $parts = explode(' ', $full, 2);
    return [$parts[0], $parts[1]];
}

/**
 * Generate a reference id using the existing `sequences` table convention,
 * matching src/utils/idGenerator.js:
 *   order:    "{Agent}-{YYYY}-{M}-{NNNN}"   (sequence key: order_{YYYY}-{M})
 *   booking:  "T-{YYYY}-{M}-{NNNN}" or "Tr-..."  (key: booking_{YYYY}-{M})
 */
function nextSequence($key)
{
    $rows = supabaseRequest('GET', "sequences?key=eq." . urlencode($key) . "&select=value");
    if (empty($rows)) {
        supabaseRequest('POST', 'sequences', ['key' => $key, 'value' => 1]);
        return 1;
    }
    $next = ((int)$rows[0]['value']) + 1;
    supabaseRequest('PATCH', 'sequences?key=eq.' . urlencode($key), ['value' => $next]);
    return $next;
}

function generateOrderRef($agent = 'Website')
{
    $year = (int)date('Y');
    $month = (int)date('n');
    $seq = nextSequence("order_$year-$month");
    $safeAgent = preg_replace('/\s+/', '_', $agent);
    return sprintf('%s-%d-%d-%04d', $safeAgent, $year, $month, $seq);
}

function generateBookingRef($type)
{
    $year = (int)date('Y');
    $month = (int)date('n');
    $seq = nextSequence("booking_$year-$month");
    $prefix = $type === 'tour' ? 'T' : 'Tr';
    return sprintf('%s-%d-%d-%04d', $prefix, $year, $month, $seq);
}

/**
 * Pack the web's customer-facing reference + contact info + special requests
 * into a multi-line string for the booking-level Detail field. This lets
 * staff match the customer's INDO... ref to the admin booking row.
 */
function buildContactInfo(array $b)
{
    $lines = [];
    if (!empty($b['booking_reference'])) {
        $lines[] = 'Web Ref: ' . $b['booking_reference'];
    }
    if (!empty($b['customer_email'])) {
        $lines[] = 'Email: ' . $b['customer_email'];
    }
    if (!empty($b['customer_phone'])) {
        $lines[] = 'Phone: ' . $b['customer_phone'];
    }
    if (!empty($b['special_requests'])) {
        $lines[] = 'Special: ' . $b['special_requests'];
    }
    return implode("\n", $lines);
}

function buildOrderData(array $b, $type, $referenceId)
{
    list($first, $last) = splitName($b['customer_name'] ?? '');
    $adt = (int)($b['adults']   ?? 0);
    $chd = (int)($b['children'] ?? 0);
    $inf = (int)($b['infants']  ?? 0);
    $totalPax = $adt + $chd + $inf;

    $startDate = $type === 'tour'
        ? ($b['travel_date'] ?? null)
        : ($b['pickup_date'] ?? null);
    $endDate = $startDate;
    if (
        $type === 'transfer'
        && ($b['trip_type'] ?? '') === 'return'
        && !empty($b['return_date'])
    ) {
        $endDate = $b['return_date'];
    }

    return [
        'first_name'   => $first,
        'last_name'    => $last,
        'agent_name'   => 'Website',
        'reference_id' => $referenceId,
        'pax'          => (string)$totalPax,
        'pax_adt'      => $adt,
        'pax_chd'      => $chd,
        'pax_inf'      => $inf,
        'start_date'   => $startDate,
        'end_date'     => $endDate,
    ];
}

// =====================================================================
// MAIN
// =====================================================================

try {
    $webRef = $booking['booking_reference'] ?? null;

    // 1. Insert order with admin-style reference (e.g. Website-2026-4-0014)
    $orderRef  = generateOrderRef('Website');
    $orderData = buildOrderData($booking, $type, $orderRef);
    $orderResult = supabaseRequest('POST', 'orders', $orderData);
    $orderId = $orderResult[0]['id'] ?? null;
    if (!$orderId) throw new Exception('Failed to create order: empty response');

    mysqlMirror('orders', array_merge($orderData, ['id' => $orderId]));
    logIntake("Order created id=$orderId ref=$orderRef webRef=" . ($webRef ?? '?'));

    $contactInfo = buildContactInfo($booking);
    $bookingIds = [];

    if ($type === 'tour') {
        $tourName = $booking['tour_name']
            ?? (isset($booking['tour_id']) ? 'Tour ID: ' . $booking['tour_id'] : null);

        $detailParts = [];
        if (!empty($tourName))    $detailParts[] = $tourName;
        if (!empty($contactInfo)) $detailParts[] = $contactInfo;
        $tourDetail = implode("\n\n", $detailParts);

        // Build price_details breakdown (per-pax sell, type controls which
        // pax count multiplies). Modal expects this shape; if absent it
        // would mistake selling_price for a per-pax value and double-multiply.
        $adultPrice = isset($booking['adult_price']) ? (float)$booking['adult_price'] : 0;
        $childPrice = isset($booking['child_price']) ? (float)$booking['child_price'] : 0;
        $priceDetails = [];
        if ($orderData['pax_adt'] > 0 && $adultPrice > 0) {
            $priceDetails[] = [
                'cost'   => 0,
                'sell'   => $adultPrice,
                'type'   => 'adt',
                'pax'    => null,
                'remark' => 'Adult',
            ];
        }
        if ($orderData['pax_chd'] > 0 && $childPrice > 0) {
            $priceDetails[] = [
                'cost'   => 0,
                'sell'   => $childPrice,
                'type'   => 'chd',
                'pax'    => null,
                'remark' => 'Child',
            ];
        }
        $totalSelling = ($orderData['pax_adt'] * $adultPrice) + ($orderData['pax_chd'] * $childPrice);

        $row = [
            'order_id'        => $orderId,
            'tour_date'       => $booking['travel_date'] ?? null,
            'tour_detail'     => $tourDetail,
            'reference_id'    => generateBookingRef('tour'),
            'status'          => 'pending',
            'pax'             => (int)$orderData['pax'],
            'pax_adt'         => $orderData['pax_adt'],
            'pax_chd'         => $orderData['pax_chd'],
            'pax_inf'         => $orderData['pax_inf'],
            'cost_price'      => 0,
            'selling_price'   => $totalSelling > 0 ? $totalSelling : null,
            'price_details'   => !empty($priceDetails) ? $priceDetails : null,
            'tour_contact_no' => $booking['customer_phone'] ?? null,
        ];
        $res = supabaseRequest('POST', 'tour_bookings', $row);
        $bookingId = $res[0]['id'] ?? null;
        $bookingIds[] = $bookingId;
        mysqlMirror('tour_bookings', array_merge($row, ['id' => $bookingId]));
    } else { // transfer

        // Frontend prepends "Vehicle: <name> — <price> THB\n" to special_requests.
        // Same regex as official-web's sendTransferBookingEmail() so both
        // sides stay in sync.
        $vehicleName  = null;
        $vehiclePrice = null;
        $cleanedRequests = $booking['special_requests'] ?? '';
        if ($cleanedRequests && preg_match('/^\s*Vehicle:\s*(.+?)\s+[—\-–]\s+([\d,\.]+)\s+THB\s*\n?(.*)$/su', $cleanedRequests, $m)) {
            $vehicleName  = trim($m[1]);
            $vehiclePrice = (float)str_replace(',', '', $m[2]);
            $cleanedRequests = trim($m[3]);
        }

        // Recompute contact info using the cleaned (vehicle-line stripped)
        // special_requests so it doesn't appear twice in transfer_detail.
        $cleanedBooking = $booking;
        $cleanedBooking['special_requests'] = $cleanedRequests;
        $contactInfo = buildContactInfo($cleanedBooking);

        // Per-trip flat price. pax:1 prevents the modal from multiplying
        // by total pax (transfer is per-vehicle, not per-person).
        $transferPriceDetails = null;
        if ($vehiclePrice && $vehiclePrice > 0) {
            $transferPriceDetails = [[
                'cost'   => 0,
                'sell'   => $vehiclePrice,
                'type'   => 'all',
                'pax'    => 1,
                'remark' => $vehicleName ?: 'Transfer',
            ]];
        }

        $outbound = [
            'order_id'        => $orderId,
            'transfer_date'   => $booking['pickup_date']     ?? null,
            'transfer_time'   => $booking['pickup_time']     ?? null,
            'pickup_location' => $booking['pickup_location'] ?? null,
            'drop_location'   => $booking['dropoff_location'] ?? null,
            'transfer_detail' => $contactInfo,
            'reference_id'    => generateBookingRef('transfer'),
            'status'          => 'pending',
            'pax'             => (int)$orderData['pax'],
            'pax_adt'         => $orderData['pax_adt'],
            'pax_chd'         => $orderData['pax_chd'],
            'pax_inf'         => $orderData['pax_inf'],
            'transfer_type'   => $booking['trip_type'] ?? 'one-way',
            'phone_number'    => $booking['customer_phone'] ?? null,
            'car_model'       => $vehicleName,
            'cost_price'      => 0,
            'selling_price'   => $vehiclePrice ?: null,
            'price_details'   => $transferPriceDetails,
        ];
        $res = supabaseRequest('POST', 'transfer_bookings', $outbound);
        $obId = $res[0]['id'] ?? null;
        $bookingIds[] = $obId;
        mysqlMirror('transfer_bookings', array_merge($outbound, ['id' => $obId]));

        // Return trip — gets its own admin-style reference (price is per way)
        if (($booking['trip_type'] ?? '') === 'return' && !empty($booking['return_date'])) {
            $inbound = $outbound;
            $inbound['transfer_date']   = $booking['return_date'];
            $inbound['transfer_time']   = $booking['return_time'] ?? null;
            $inbound['pickup_location'] = $booking['dropoff_location'] ?? null;
            $inbound['drop_location']   = $booking['pickup_location'] ?? null;
            $inbound['reference_id']    = generateBookingRef('transfer');
            $res2 = supabaseRequest('POST', 'transfer_bookings', $inbound);
            $ibId = $res2[0]['id'] ?? null;
            $bookingIds[] = $ibId;
            mysqlMirror('transfer_bookings', array_merge($inbound, ['id' => $ibId]));
        }
    }

    logIntake("Bookings created: " . json_encode($bookingIds));

    echo json_encode([
        'status'       => 'success',
        'order_id'     => $orderId,
        'reference_id' => $orderRef,
        'web_ref'      => $webRef,
        'booking_ids'  => $bookingIds,
    ]);
} catch (Exception $e) {
    logIntake("FATAL: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
