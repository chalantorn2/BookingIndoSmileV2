SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- ตาราง: information
CREATE TABLE `information` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `description` TEXT NULL,
  `phone` VARCHAR(50) NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_information_category` (`category`),
  INDEX `idx_information_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: invoices
CREATE TABLE `invoices` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `invoice_name` VARCHAR(255) NULL,
  `invoice_date` DATE NULL,
  `payment_ids` JSON NULL,
  `total_amount` DECIMAL(10, 2) NULL DEFAULT 0,
  `total_cost` DECIMAL(10, 2) NULL DEFAULT 0,
  `total_selling_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `total_profit` DECIMAL(10, 2) NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: orders
CREATE TABLE `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `reference_id` VARCHAR(255) NULL,
  `first_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NULL,
  `agent_name` VARCHAR(255) NULL,
  `agent_id` BIGINT NULL,
  `pax` VARCHAR(50) NULL,
  `pax_adt` INT NULL DEFAULT 0,
  `pax_chd` INT NULL DEFAULT 0,
  `pax_inf` INT NULL DEFAULT 0,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `note` TEXT NULL,
  `completed` TINYINT(1) NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_reference_id_key` (`reference_id`),
  INDEX `idx_orders_created_at` (`created_at`),
  CONSTRAINT `orders_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `information` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: payments
CREATE TABLE `payments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `payment_id` VARCHAR(255) NULL,
  `order_id` BIGINT NULL,
  `first_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NULL,
  `agent_name` VARCHAR(255) NULL,
  `pax` VARCHAR(50) NULL,
  `bookings` JSON NULL,
  `total_cost` DECIMAL(10, 2) NULL DEFAULT 0,
  `total_selling_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `total_profit` DECIMAL(10, 2) NULL DEFAULT 0,
  `invoiced` TINYINT(1) NULL DEFAULT 0,
  `ref` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_payment_id_key` (`payment_id`),
  INDEX `idx_payments_order_id` (`order_id`),
  CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: sequences
CREATE TABLE `sequences` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255) NOT NULL,
  `value` INT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sequences_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: tour_bookings
CREATE TABLE `tour_bookings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT NULL,
  `reference_id` VARCHAR(255) NULL,
  `tour_date` DATE NOT NULL,
  `tour_pickup_time` VARCHAR(255) NULL,
  `tour_type` VARCHAR(255) NULL,
  `tour_detail` TEXT NULL,
  `tour_hotel` VARCHAR(255) NULL,
  `tour_room_no` VARCHAR(100) NULL,
  `tour_contact_no` VARCHAR(50) NULL,
  `send_to` VARCHAR(255) NULL,
  `pax` INT NULL DEFAULT 0,
  `pax_adt` INT NULL DEFAULT 0,
  `pax_chd` INT NULL DEFAULT 0,
  `pax_inf` INT NULL DEFAULT 0,
  `cost_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `selling_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `payment_status` VARCHAR(50) NULL DEFAULT 'not_paid',
  `payment_date` DATE NULL,
  `payment_note` TEXT NULL,
  `voucher_created` TINYINT(1) NULL DEFAULT 0,
  `status` VARCHAR(50) NULL DEFAULT 'pending',
  `note` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tour_bookings_reference_id_key` (`reference_id`),
  INDEX `idx_tour_bookings_order_id` (`order_id`),
  INDEX `idx_tour_bookings_tour_date` (`tour_date`),
  CONSTRAINT `tour_bookings_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tour_bookings_payment_status_check` CHECK (`payment_status` IN ('paid', 'not_paid')),
  CONSTRAINT `tour_bookings_status_check` CHECK (`status` IN ('pending', 'booked', 'in_progress', 'completed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: transfer_bookings
CREATE TABLE `transfer_bookings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT NULL,
  `reference_id` VARCHAR(255) NULL,
  `transfer_date` DATE NOT NULL,
  `transfer_time` VARCHAR(255) NULL,
  `transfer_type` VARCHAR(255) NULL,
  `transfer_detail` TEXT NULL,
  `pickup_location` VARCHAR(255) NULL,
  `drop_location` VARCHAR(255) NULL,
  `transfer_flight` VARCHAR(100) NULL,
  `transfer_ftime` VARCHAR(255) NULL,
  `send_to` VARCHAR(255) NULL,
  `car_model` VARCHAR(255) NULL,
  `phone_number` VARCHAR(50) NULL,
  `pax` INT NULL DEFAULT 0,
  `pax_adt` INT NULL DEFAULT 0,
  `pax_chd` INT NULL DEFAULT 0,
  `pax_inf` INT NULL DEFAULT 0,
  `cost_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `selling_price` DECIMAL(10, 2) NULL DEFAULT 0,
  `payment_status` VARCHAR(50) NULL DEFAULT 'not_paid',
  `payment_date` DATE NULL,
  `payment_note` TEXT NULL,
  `voucher_created` TINYINT(1) NULL DEFAULT 0,
  `status` VARCHAR(50) NULL DEFAULT 'pending',
  `note` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_bookings_reference_id_key` (`reference_id`),
  INDEX `idx_transfer_bookings_order_id` (`order_id`),
  INDEX `idx_transfer_bookings_transfer_date` (`transfer_date`),
  CONSTRAINT `transfer_bookings_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transfer_bookings_payment_status_check` CHECK (`payment_status` IN ('paid', 'not_paid')),
  CONSTRAINT `transfer_bookings_status_check` CHECK (`status` IN ('pending', 'booked', 'in_progress', 'completed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: users
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `fullname` VARCHAR(255) NULL,
  `role` VARCHAR(50) NULL DEFAULT 'user',
  `active` TINYINT(1) NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  CONSTRAINT `users_role_check` CHECK (`role` IN ('user', 'admin', 'dev'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง: vouchers
CREATE TABLE `vouchers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `year_number` VARCHAR(10) NULL,
  `sequence_number` VARCHAR(10) NULL,
  `booking_id` BIGINT NULL,
  `booking_type` VARCHAR(50) NULL,
  `customer_name` VARCHAR(255) NULL,
  `contact_person` VARCHAR(255) NULL,
  `customer_signature` TEXT NULL,
  `accommodation` TEXT NULL,
  `accommodation_at` VARCHAR(255) NULL,
  `accommodation_pax` INT NULL,
  `accommodation_check_in` DATE NULL,
  `accommodation_check_out` DATE NULL,
  `accommodation_room` VARCHAR(100) NULL,
  `accommodation_night` INT NULL,
  `accommodation_price` DECIMAL(10, 2) NULL,
  `transfer` TEXT NULL,
  `transfer_from` VARCHAR(255) NULL,
  `transfer_to` VARCHAR(255) NULL,
  `transfer_by` VARCHAR(255) NULL,
  `transfer_pax` INT NULL,
  `transfer_date` DATE NULL,
  `transfer_time` TIME NULL,
  `transfer_price` DECIMAL(10, 2) NULL,
  `transfer_pickup_time` TIME NULL,
  `transfer_type` VARCHAR(255) NULL,
  `transfer_detail` TEXT NULL,
  `transfer_license_plate` VARCHAR(100) NULL,
  `transfer_flight` VARCHAR(100) NULL,
  `transfer_ftime` TIME NULL,
  `tour` TEXT NULL,
  `tour_name` VARCHAR(255) NULL,
  `tour_pax` INT NULL,
  `tour_by` VARCHAR(255) NULL,
  `tour_date` DATE NULL,
  `tour_price` DECIMAL(10, 2) NULL,
  `tour_pickup_at` VARCHAR(255) NULL,
  `tour_detail` TEXT NULL,
  `tour_pickup_time` TIME NULL,
  `payment_option` VARCHAR(255) NULL,
  `payment_amount` DECIMAL(10, 2) NULL,
  `remark` TEXT NULL,
  `issue_by` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_vouchers_booking` (`booking_id`, `booking_type`),
  CONSTRAINT `vouchers_booking_type_check` CHECK (`booking_type` IN ('tour', 'transfer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
