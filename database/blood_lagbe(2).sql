-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 21, 2026 at 05:07 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `blood_lagbe`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `admin_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_level` enum('Super Admin','Admin','Moderator','Support') NOT NULL DEFAULT 'Admin',
  `status` enum('Active','Suspended') NOT NULL DEFAULT 'Active',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`admin_id`, `username`, `email`, `password`, `role_level`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'akash123', 'bloodlagbe.team@gmail.com', '$2b$10$UjFrj/Rxcv/dt3cOllFzPOKI6xn5qRE.68DGXDytFAPMzF8K8wm4W', 'Super Admin', 'Active', '2026-10-25 09:45:12', '2026-10-13 18:44:30', '2026-10-25 09:45:12'),
(2, 'Akash', 'nurre_verse82@gmail.com', '$2b$10$eOPGcoxG5.drdZV0wy2FSuAFjcN.k9jIfUp9F.e8uiNYkDT6ZzqsK', 'Admin', 'Active', '2026-11-14 20:03:45', '2026-10-17 05:13:39', '2026-11-14 20:03:45');

-- --------------------------------------------------------

--
-- Table structure for table `admin_audit_log`
--

CREATE TABLE `admin_audit_log` (
  `log_id` bigint(20) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `target_type` varchar(40) DEFAULT NULL,
  `target_id` varchar(40) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin_audit_log`
--

INSERT INTO `admin_audit_log` (`log_id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `created_at`) VALUES
(1, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-13 18:31:55'),
(2, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"nurr_verse\"}', '::1', '2026-10-13 18:32:09'),
(3, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"superadmin\"}', '::1', '2026-10-13 18:33:29'),
(4, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"superadmin\"}', '::1', '2026-10-13 18:33:30'),
(5, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash\"}', '::1', '2026-10-13 18:36:29'),
(6, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash\"}', '::1', '2026-10-13 18:36:55'),
(7, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-13 18:37:27'),
(8, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-13 18:37:28'),
(9, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-13 18:37:28'),
(10, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-13 18:37:29'),
(11, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"nurmohammadakash1821444618@gmail.com\"}', '::1', '2026-10-13 18:37:35'),
(12, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"nurmohammadakash1821444618@gmail.com\"}', '::1', '2026-10-13 18:37:37'),
(13, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"bloodlagbe.team@gmail.com\"}', '::1', '2026-10-13 18:38:31'),
(14, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"bloodlagbe.team@gmail.com\"}', '::1', '2026-10-13 18:39:10'),
(15, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"bloodlagbe.team@gmail.com\"}', '::1', '2026-10-13 18:41:41'),
(16, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"bloodlagbe.team@gmail.com\"}', '::1', '2026-10-13 18:41:42'),
(17, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"bloodlagbe.team@gmail.com\"}', '::1', '2026-10-13 18:41:42'),
(18, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash\"}', '::1', '2026-10-13 18:41:53'),
(19, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-13 18:44:48'),
(20, 1, 'BLOODBANK_APPROVE', 'blood_bank', '5', '{\"name\":\"Agrabad Blood Bank\",\"from\":\"Pending\",\"to\":\"Approved\"}', '::1', '2026-10-13 19:17:46'),
(21, NULL, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash\"}', '::1', '2026-10-14 02:37:09'),
(22, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-14 02:37:13'),
(23, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-14 05:04:21'),
(24, 1, 'REPORT_EXPORT', 'report', 'users', '{\"from\":null,\"to\":null,\"rows\":3}', '::1', '2026-10-14 05:05:26'),
(25, 1, 'BLOODBANK_APPROVE', 'blood_bank', '9', '{\"name\":\"Demo Pending Blood Bank\",\"from\":\"Pending\",\"to\":\"Approved\"}', '::1', '2026-10-14 05:15:58'),
(26, 1, 'ANNOUNCEMENT_SEND', 'announcement', '1', '{\"title\":\"Urgent B+ blood needed\",\"audience\":\"users\",\"blood_group\":\"B+\",\"division\":\"Chattogram\",\"district\":\"Chattogram\",\"recipients\":3,\"email\":false}', '::1', '2026-10-14 05:19:48'),
(27, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-14 18:01:43'),
(28, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:29'),
(29, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:31'),
(30, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:32'),
(31, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:33'),
(32, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:35'),
(33, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:36'),
(34, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:37'),
(35, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:38'),
(36, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:38'),
(37, 1, 'LOGIN_FAILED', NULL, NULL, '{\"login\":\"akash123\"}', '::1', '2026-10-14 18:11:39'),
(38, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-17 05:06:17'),
(39, 1, 'ADMIN_CREATE', 'admin', '2', '{\"username\":\"Akash\",\"role\":\"Admin\"}', '::1', '2026-10-17 05:13:39'),
(40, 1, 'LOGOUT', NULL, NULL, NULL, '::1', '2026-10-17 05:14:11'),
(41, 2, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-17 05:14:22'),
(42, 2, 'PASSWORD_CHANGE', 'admin', '2', NULL, '::1', '2026-10-17 05:14:48'),
(43, 2, 'LOGOUT', NULL, NULL, NULL, '::1', '2026-10-17 05:14:54'),
(44, 2, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-17 05:15:04'),
(45, 2, 'LOGOUT', NULL, NULL, NULL, '::1', '2026-10-17 05:19:02'),
(46, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-17 12:02:35'),
(47, 1, 'REQUESTS_EXPIRE_OVERDUE', 'blood_request', NULL, '{\"count\":3}', '::1', '2026-10-17 12:08:04'),
(48, 1, 'REQUESTS_EXPIRE_OVERDUE', 'blood_request', NULL, '{\"count\":0}', '::1', '2026-10-17 12:08:08'),
(49, 1, 'REQUESTS_EXPIRE_OVERDUE', 'blood_request', NULL, '{\"count\":0}', '::1', '2026-10-17 12:08:15'),
(50, 1, 'REQUESTS_EXPIRE_OVERDUE', 'blood_request', NULL, '{\"count\":0}', '::1', '2026-10-17 12:08:20'),
(51, 1, 'BLOODBANK_APPROVE', 'blood_bank', '11', '{\"name\":\"GEC Blood Bank\",\"from\":\"Pending\",\"to\":\"Approved\"}', '::1', '2026-10-17 12:11:45'),
(52, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-21 06:49:09'),
(53, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-24 07:58:47'),
(54, 1, 'LOGIN', NULL, NULL, NULL, '::1', '2026-10-25 09:45:12'),
(55, 2, 'LOGIN', NULL, NULL, NULL, '::1', '2026-11-14 20:03:45');

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(120) NOT NULL,
  `message` varchar(500) NOT NULL,
  `audience` varchar(20) NOT NULL,
  `blood_group` varchar(3) DEFAULT NULL,
  `division` varchar(60) DEFAULT NULL,
  `district` varchar(60) DEFAULT NULL,
  `donors_only` tinyint(1) NOT NULL DEFAULT 0,
  `send_email` tinyint(1) NOT NULL DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `recipients` int(11) NOT NULL DEFAULT 0,
  `emails_sent` int(11) NOT NULL DEFAULT 0,
  `emails_failed` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcement`
--

INSERT INTO `announcement` (`announcement_id`, `title`, `message`, `audience`, `blood_group`, `division`, `district`, `donors_only`, `send_email`, `link`, `recipients`, `emails_sent`, `emails_failed`, `created_by`, `created_at`) VALUES
(1, 'Urgent B+ blood needed', '=In Metro Politon Hospital There is needed O+ blood urgently', 'users', 'B+', 'Chattogram', 'Chattogram', 1, 0, NULL, 3, 0, 0, 1, '2026-10-14 05:19:48');

-- --------------------------------------------------------

--
-- Table structure for table `app_notification`
--

CREATE TABLE `app_notification` (
  `notification_id` int(11) NOT NULL,
  `recipient_type` enum('user','bloodbank') NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `actor_type` enum('user','bloodbank') DEFAULT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `message` varchar(255) NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `app_notification`
--

INSERT INTO `app_notification` (`notification_id`, `recipient_type`, `recipient_id`, `actor_type`, `actor_id`, `type`, `message`, `link`, `is_read`, `created_at`) VALUES
(1, 'user', 15, 'user', 14, 'friend_request', 'Nur Mohammad Akash sent you a friend request.', '/profile?u=nurr_verse', 0, '2026-10-12 05:07:58'),
(2, 'user', 16, 'user', 14, 'friend_request', 'Nur Mohammad Akash sent you a friend request.', '/profile?u=nurr_verse', 0, '2026-10-12 05:08:00'),
(3, 'user', 14, 'user', 15, 'friend_accept', 'Apurba Dey accepted your friend request.', '/profile?u=apurbadey', 0, '2026-10-12 05:10:22'),
(4, 'user', 16, 'user', 15, 'friend_request', 'Apurba Dey sent you a friend request.', '/profile?u=apurbadey', 0, '2026-10-12 05:10:27'),
(5, 'user', 14, 'user', 15, 'like', 'Apurba Dey liked your post.', '/dashboard', 0, '2026-10-12 05:11:24'),
(6, 'user', 14, 'user', 15, 'like', 'Apurba Dey liked your post.', '/dashboard', 0, '2026-10-12 05:11:30'),
(7, 'user', 14, 'user', 15, 'comment', 'Apurba Dey commented: I would love to visit it', '/dashboard', 0, '2026-10-12 05:11:41'),
(8, 'user', 15, 'user', 16, 'friend_accept', 'Niloy Das accepted your friend request.', '/profile?u=alomgir', 0, '2026-10-12 05:12:19'),
(9, 'user', 14, 'user', 16, 'friend_accept', 'Niloy Das accepted your friend request.', '/profile?u=alomgir', 0, '2026-10-12 05:12:20'),
(10, 'user', 14, 'user', 16, 'like', 'Niloy Das liked your post.', '/dashboard', 1, '2026-10-12 05:12:25'),
(11, 'user', 14, 'user', 16, 'comment', 'Niloy Das commented: Vai kokhon niye jaben Coffee Shop e?', '/dashboard', 1, '2026-10-12 05:12:44'),
(12, 'user', 15, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-12 05:32:09'),
(13, 'user', 16, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-12 05:32:09'),
(14, 'user', 16, 'user', 14, 'donation_pending', 'Nur Mohammad Akash says you donated B+ blood to them. Please confirm.', '/dashboard', 1, '2026-10-12 05:45:55'),
(15, 'user', 14, 'user', 16, 'donation_confirmed', 'Niloy Das confirmed the B+ blood donation. You can now rate each other.', '/profile?u=alomgir', 1, '2026-10-12 05:51:28'),
(16, 'user', 16, 'user', 14, 'rating', 'Nur Mohammad Akash rated you 5 stars.', '/profile', 0, '2026-10-12 05:53:59'),
(17, 'user', 14, 'user', 16, 'rating', 'Niloy Das rated you 5 stars.', '/profile', 0, '2026-10-12 05:56:52'),
(18, 'user', 14, 'user', 16, 'friend_post', 'Niloy Das posted: I have donated my blood for the 10th Time, Thanks to The Al…', '/dashboard', 0, '2026-10-13 18:13:49'),
(19, 'user', 15, 'user', 16, 'friend_post', 'Niloy Das posted: I have donated my blood for the 10th Time, Thanks to The Al…', '/dashboard', 0, '2026-10-13 18:13:49'),
(20, 'user', 15, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-14 03:07:24'),
(21, 'user', 16, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-14 03:07:24'),
(22, 'user', 14, NULL, NULL, 'announcement', 'Urgent B+ blood needed: =In Metro Politon Hospital There is needed O+ blood urgently', '/dashboard', 0, '2026-10-14 05:19:48'),
(23, 'user', 19, NULL, NULL, 'announcement', 'Urgent B+ blood needed: =In Metro Politon Hospital There is needed O+ blood urgently', '/dashboard', 0, '2026-10-14 05:19:48'),
(24, 'user', 16, NULL, NULL, 'announcement', 'Urgent B+ blood needed: =In Metro Politon Hospital There is needed O+ blood urgently', '/dashboard', 1, '2026-10-14 05:19:48'),
(25, 'user', 18, 'user', 17, 'connection_request', 'Rahim Uddin wants to donate A+ blood to you.', '/connection?id=1', 0, '2026-10-15 06:10:25'),
(26, 'user', 14, 'user', 17, 'friend_request', 'Rahim Uddin sent you a friend request.', '/profile?u=demo_user01', 0, '2026-10-15 06:18:28'),
(27, 'user', 15, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-15 06:25:23'),
(28, 'user', 16, 'user', 14, 'need_blood', 'Nur Mohammad Akash needs B+ blood.', '/profile?u=nurr_verse', 0, '2026-10-15 06:25:23'),
(29, 'user', 14, 'user', 15, 'need_blood', 'Apurba Dey needs O+ blood.', '/profile?u=apurbadey', 0, '2026-10-15 06:38:09'),
(30, 'user', 16, 'user', 15, 'need_blood', 'Apurba Dey needs O+ blood.', '/profile?u=apurbadey', 0, '2026-10-15 06:38:09'),
(31, 'user', 16, 'user', 29, 'friend_request', 'Nur Mohammad sent you a friend request.', '/profile?u=akash', 0, '2026-10-17 11:53:59'),
(32, 'user', 29, 'user', 16, 'friend_accept', 'Niloy Das accepted your friend request.', '/profile?u=alomgir', 0, '2026-10-17 11:55:31'),
(33, 'user', 15, 'user', 16, 'need_blood', 'Niloy Das needs B+ blood.', '/profile?u=alomgir', 0, '2026-10-17 11:55:42'),
(34, 'user', 29, 'user', 16, 'need_blood', 'Niloy Das needs B+ blood.', '/profile?u=alomgir', 0, '2026-10-17 11:55:42'),
(35, 'user', 16, 'user', 29, 'connection_request', 'Nur Mohammad wants to donate B+ blood to you.', '/connection?id=6', 1, '2026-10-17 11:59:04'),
(36, 'user', 29, 'user', 16, 'connection_confirmed', 'Niloy Das confirmed your request. You can now see their contact details.', '/connection?id=6', 0, '2026-10-17 12:00:19'),
(37, 'user', 29, 'user', 16, 'connection_review', 'Niloy Das reviewed you. Please review them too to complete the connection.', '/connection?id=6', 1, '2026-10-17 12:01:06'),
(38, 'user', 16, 'user', 29, 'connection_successful', 'Your blood connection with Nur Mohammad is complete. Thank you!', '/connection?id=6', 0, '2026-10-17 12:02:05'),
(39, 'user', 16, 'user', 29, 'like', 'Nur Mohammad liked your post.', '/dashboard', 0, '2026-10-17 12:04:41'),
(40, 'user', 15, 'user', 29, 'friend_request', 'Nur Mohammad sent you a friend request.', '/profile?u=akash', 0, '2026-10-17 12:07:08'),
(41, 'bloodbank', 7, 'user', 29, 'bank_request', 'High: Nur Mohammad requested 1 unit of B+ for Akash.', '/bloodbank/dashboard#requests', 0, '2026-10-21 06:05:21'),
(42, 'bloodbank', 11, 'user', 29, 'bank_request', 'Nur Mohammad requested 1 unit of B+ for xyz.', '/bloodbank/dashboard#requests', 0, '2026-10-21 06:24:30'),
(43, 'user', 29, 'bloodbank', 11, 'bank_request_approved', 'GEC Blood Bank approved your request for 1 unit of B+. Please Contact Soon to our Blood Bank', '/banks', 1, '2026-10-21 06:25:27'),
(44, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-21 06:34:45'),
(45, 'user', 16, 'user', 29, 'friend_post', 'Nur Mohammad posted: I have Received Blood from GEC Blood Bank, They are totally…', '/dashboard', 1, '2026-10-21 06:35:59'),
(46, 'user', 29, 'user', 16, 'like', 'Niloy Das liked your post.', '/dashboard', 0, '2026-10-21 06:39:04'),
(47, 'user', 29, 'user', 16, 'comment', 'Niloy Das commented: Ok, Thanks for you info', '/dashboard', 0, '2026-10-21 06:39:17'),
(48, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-21 06:57:02'),
(49, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-21 06:57:12'),
(50, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-24 07:35:29'),
(51, 'user', 15, 'user', 16, 'need_blood', 'Niloy Das needs B+ blood.', '/profile?u=alomgir', 0, '2026-10-24 07:38:19'),
(52, 'user', 29, 'user', 16, 'need_blood', 'Niloy Das needs B+ blood.', '/profile?u=alomgir', 0, '2026-10-24 07:38:19'),
(53, 'user', 29, 'user', 30, 'connection_request', 'Ramish Jahra wants to donate B+ blood to you.', '/connection?id=10', 1, '2026-10-24 07:45:16'),
(54, 'user', 30, 'user', 29, 'connection_confirmed', 'Nur Mohammad confirmed your request. You can now see their contact details.', '/connection?id=10', 0, '2026-10-24 07:46:18'),
(55, 'user', 30, 'user', 29, 'connection_review', 'Nur Mohammad reviewed you. Please review them too to complete the connection.', '/connection?id=10', 1, '2026-10-24 07:46:59'),
(56, 'user', 29, 'user', 30, 'connection_successful', 'Your blood connection with Ramish Jahra is complete. Thank you!', '/connection?id=10', 0, '2026-10-24 07:48:42'),
(57, 'user', 29, 'user', 30, 'friend_request', 'Ramish Jahra sent you a friend request.', '/profile?u=Ramish', 1, '2026-10-24 07:50:01'),
(58, 'user', 30, 'user', 29, 'friend_accept', 'Nur Mohammad accepted your friend request.', '/profile?u=akash', 0, '2026-10-24 07:50:58'),
(59, 'bloodbank', 11, 'user', 29, 'bank_request', 'Critical: Nur Mohammad requested 1 unit of B+ for xyz.', '/bloodbank/dashboard#requests', 0, '2026-10-24 07:56:40'),
(60, 'user', 29, 'bloodbank', 11, 'bank_request_approved', 'GEC Blood Bank approved your request for 1 unit of B+. Please Contact Soon to our Blood Bank', '/banks', 0, '2026-10-24 07:57:09'),
(61, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:18:14'),
(62, 'user', 30, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:18:14'),
(63, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:18:32'),
(64, 'user', 30, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:18:32'),
(65, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:20:25'),
(66, 'user', 30, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 09:20:25'),
(67, 'user', 29, 'user', 32, 'connection_request', 'Niloy Das wants to donate B+ blood to you.', '/connection?id=14', 1, '2026-10-25 09:35:05'),
(68, 'user', 32, 'user', 29, 'connection_confirmed', 'Nur Mohammad confirmed your request. You can now see their contact details.', '/connection?id=14', 1, '2026-10-25 09:35:36'),
(69, 'user', 32, 'user', 29, 'connection_review', 'Nur Mohammad reviewed you. Please review them too to complete the connection.', '/connection?id=14', 0, '2026-10-25 09:37:22'),
(70, 'user', 29, 'user', 32, 'connection_successful', 'Your blood connection with Niloy Das is complete. Thank you!', '/connection?id=14', 0, '2026-10-25 09:37:56'),
(71, 'bloodbank', 11, 'user', 32, 'bank_request', 'Critical: Niloy Das requested 1 unit of B+ for abc.', '/bloodbank/dashboard#requests', 0, '2026-10-25 09:40:17'),
(72, 'user', 32, 'bloodbank', 11, 'bank_request_approved', 'GEC Blood Bank approved your request for 1 unit of B+.', '/banks', 1, '2026-10-25 09:41:17'),
(73, 'user', 16, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 10:24:28'),
(74, 'user', 30, 'user', 29, 'need_blood', 'Nur Mohammad needs B+ blood.', '/profile?u=akash', 0, '2026-10-25 10:24:28'),
(75, 'user', 29, 'user', 32, 'connection_request', 'Niloy Das wants to donate B+ blood to you.', '/connection?id=16', 1, '2026-10-25 10:28:23'),
(76, 'user', 32, 'user', 29, 'connection_confirmed', 'Nur Mohammad confirmed your request. You can now see their contact details.', '/connection?id=16', 0, '2026-10-25 10:28:45'),
(77, 'user', 32, 'user', 29, 'connection_review', 'Nur Mohammad reviewed you. Please review them too to complete the connection.', '/connection?id=16', 1, '2026-10-25 10:29:10'),
(78, 'user', 29, 'user', 32, 'connection_successful', 'Your blood connection with Niloy Das is complete. Thank you!', '/connection?id=16', 0, '2026-10-25 10:29:26'),
(79, 'bloodbank', 11, 'user', 32, 'bank_request', 'Critical: Niloy Das requested 1 unit of B+ for xyz.', '/bloodbank/dashboard#requests', 0, '2026-10-25 10:31:36'),
(80, 'user', 32, 'bloodbank', 11, 'bank_request_approved', 'GEC Blood Bank approved your request for 1 unit of B+. Please Contact Soon to our Blood Bank', '/banks', 1, '2026-10-25 10:32:36'),
(81, 'user', 29, 'user', 32, 'friend_request', 'Niloy Das sent you a friend request.', '/profile?u=niloy', 0, '2026-11-07 09:06:12'),
(82, 'user', 32, 'user', 29, 'friend_accept', 'Nur Mohammad accepted your friend request.', '/profile?u=akash', 0, '2026-11-07 09:06:43'),
(83, 'user', 29, 'user', 32, 'friend_post', 'Niloy Das posted: Hey, I am using Blood Lagbe, I found it so useful', '/dashboard', 0, '2026-11-07 09:06:52'),
(84, 'user', 29, 'user', 32, 'friend_post', 'Niloy Das posted: Hey, I am using Blood Lagbe, I found it so useful', '/dashboard', 0, '2026-11-07 09:07:28'),
(85, 'user', 29, 'user', 32, 'friend_post', 'Niloy Das posted: I am using Blood Lagbe, and I found it so useful', '/dashboard', 0, '2026-11-07 09:12:29'),
(86, 'user', 29, 'user', 32, 'like', 'Niloy Das liked your post.', '/dashboard', 0, '2026-11-07 09:12:40'),
(87, 'user', 29, 'user', 32, 'like', 'Niloy Das liked your post.', '/dashboard', 0, '2026-11-07 09:12:45');

-- --------------------------------------------------------

--
-- Table structure for table `bank_settings`
--

CREATE TABLE `bank_settings` (
  `bloodbank_id` int(11) NOT NULL,
  `about` varchar(500) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `is_24x7` tinyint(1) NOT NULL DEFAULT 0,
  `opening_time` time NOT NULL DEFAULT '09:00:00',
  `closing_time` time NOT NULL DEFAULT '17:00:00',
  `open_days` varchar(40) NOT NULL DEFAULT 'Sat,Sun,Mon,Tue,Wed,Thu',
  `services` varchar(200) NOT NULL DEFAULT 'Whole blood',
  `low_stock_threshold` int(11) NOT NULL DEFAULT 5,
  `critical_stock_threshold` int(11) NOT NULL DEFAULT 2,
  `expiry_warning_days` int(11) NOT NULL DEFAULT 7,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `bank_settings`
--

INSERT INTO `bank_settings` (`bloodbank_id`, `about`, `emergency_phone`, `is_24x7`, `opening_time`, `closing_time`, `open_days`, `services`, `low_stock_threshold`, `critical_stock_threshold`, `expiry_warning_days`, `updated_at`) VALUES
(11, 'This is a trusted Blood Bank', '01619534692', 0, '09:00:00', '17:00:00', 'Sat,Sun,Mon,Tue,Wed,Thu,Fri', 'Whole blood,Platelets', 5, 2, 7, '2026-10-18 06:03:40');

-- --------------------------------------------------------

--
-- Table structure for table `blood_bank`
--

CREATE TABLE `blood_bank` (
  `bloodbank_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `license_number` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `division` varchar(50) NOT NULL DEFAULT '',
  `district` varchar(100) NOT NULL DEFAULT '',
  `upazila` varchar(100) NOT NULL DEFAULT '',
  `postal_code` varchar(10) NOT NULL DEFAULT '',
  `address` text NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `email_otp` varchar(6) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Inactive') DEFAULT 'Pending',
  `status_reason` varchar(255) DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blood_bank`
--

INSERT INTO `blood_bank` (`bloodbank_id`, `name`, `license_number`, `email`, `phone`, `division`, `district`, `upazila`, `postal_code`, `address`, `username`, `password`, `latitude`, `longitude`, `email_verified`, `email_otp`, `otp_expiry`, `status`, `status_reason`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(5, 'Agrabad Blood Bank', '123456789', 'nurrverse82@gmail.com', '01619534692', 'Chattogram', 'Chattogram', 'Hathazari', '4100', 'Agrabad Chattogram', 'agrabad', '$2b$10$YOXRGmugdV4H6CF83zNSZOha8k4JWj1Rz1Rj4/AUZitZUJXc3q7Ba', 22.32445370, 91.81172320, 1, NULL, NULL, 'Approved', NULL, 1, '2026-10-13 19:17:46', '2026-10-13 19:16:30', '2026-10-13 19:17:55'),
(6, 'Demo City Blood Bank', 'DEMO-LIC-001', 'demo_bank1@demo.bloodlagbe.test', '01810000001', 'Chattogram', 'Chattogram', 'Kotwali', '4000', 'Demo address, Kotwali', 'demo_bank1', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', 22.34750000, 91.81230000, 1, NULL, NULL, 'Approved', NULL, NULL, NULL, '2026-05-17 05:10:28', '2026-10-21 06:05:51'),
(7, 'Demo Lifeline Blood Bank', 'DEMO-LIC-002', 'demo_bank2@demo.bloodlagbe.test', '01810000002', 'Chattogram', 'Chattogram', 'Panchlaish', '4203', 'Demo address, Panchlaish', 'demo_bank2', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', 22.35900000, 91.82000000, 1, NULL, NULL, 'Approved', NULL, NULL, NULL, '2026-06-16 05:10:28', '2026-10-14 05:10:28'),
(8, 'Demo Hope Blood Center', 'DEMO-LIC-003', 'demo_bank3@demo.bloodlagbe.test', '01810000003', 'Dhaka', 'Dhaka', 'Dhanmondi', '1205', 'Demo address, Dhanmondi', 'demo_bank3', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', NULL, NULL, 1, NULL, NULL, 'Approved', NULL, NULL, NULL, '2026-07-16 05:10:28', '2026-10-14 05:10:28'),
(9, 'Demo Pending Blood Bank', 'DEMO-LIC-004', 'demo_bank4@demo.bloodlagbe.test', '01810000004', 'Chattogram', 'Cumilla', 'Cumilla Sadar', '3500', 'Demo address, Cumilla Sadar', 'demo_bank4', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', NULL, NULL, 1, NULL, NULL, 'Approved', NULL, 1, '2026-10-14 05:15:58', '2026-10-10 05:10:28', '2026-10-14 05:15:58'),
(10, 'Demo Rejected Blood Bank', 'DEMO-LIC-005', 'demo_bank5@demo.bloodlagbe.test', '01810000005', 'Sylhet', 'Sylhet', 'Sylhet Sadar', '3100', 'Demo address, Sylhet Sadar', 'demo_bank5', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', NULL, NULL, 1, NULL, NULL, 'Rejected', NULL, NULL, NULL, '2026-09-19 05:10:28', '2026-10-14 05:10:28'),
(11, 'GEC Blood Bank', '123456788', 'bloodlagbe.team@gmail.com', '01812592591', 'Chattogram', 'Chattogram', 'Hathazari', '4100', 'Agrabad Chattogram', 'gecbloodbank', '$2b$10$LMN2UcV4rS4Nzh1DHXWJke54iX60EwKqkR8UaldCIMD/uCUI4gK8m', 22.32445370, 91.81172320, 1, NULL, NULL, 'Approved', NULL, 1, '2026-10-17 12:11:45', '2026-10-17 12:10:54', '2026-10-25 10:32:04');

-- --------------------------------------------------------

--
-- Table structure for table `blood_batch`
--

CREATE TABLE `blood_batch` (
  `batch_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `units_received` int(11) NOT NULL,
  `units_left` int(11) NOT NULL,
  `collected_on` date NOT NULL,
  `expires_on` date NOT NULL,
  `source` enum('Donation','Camp','Transfer','Other') NOT NULL DEFAULT 'Donation',
  `note` varchar(255) DEFAULT NULL,
  `status` enum('Available','Depleted','Expired','Discarded') NOT NULL DEFAULT 'Available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `blood_batch`
--

INSERT INTO `blood_batch` (`batch_id`, `bloodbank_id`, `blood_group`, `units_received`, `units_left`, `collected_on`, `expires_on`, `source`, `note`, `status`, `created_at`, `updated_at`) VALUES
(1, 6, 'A+', 6, 4, '2026-09-17', '2026-10-20', 'Donation', NULL, 'Expired', '2026-10-17 11:47:17', '2026-10-21 05:17:51'),
(2, 7, 'A+', 10, 10, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(3, 8, 'A+', 17, 17, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(4, 6, 'A-', 8, 8, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(5, 7, 'A-', 15, 15, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(6, 6, 'B+', 13, 13, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(7, 7, 'B+', 20, 20, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(8, 8, 'B+', 5, 5, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(9, 6, 'B-', 18, 18, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(10, 7, 'B-', 3, 3, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(11, 8, 'B-', 10, 10, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(12, 6, 'AB+', 1, 1, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(13, 7, 'AB+', 8, 8, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(14, 8, 'AB+', 15, 15, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(15, 6, 'AB-', 6, 6, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(16, 7, 'AB-', 13, 13, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(17, 8, 'AB-', 20, 20, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(18, 6, 'O+', 11, 11, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(19, 7, 'O+', 18, 18, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(20, 8, 'O+', 3, 3, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(21, 6, 'O-', 16, 16, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(22, 7, 'O-', 1, 1, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(23, 8, 'O-', 8, 8, '2026-10-21', '2026-11-25', 'Other', 'Opening balance', 'Available', '2026-10-21 05:10:20', '2026-10-21 05:10:20'),
(33, 6, 'B+', 3, 3, '2026-10-21', '2026-11-25', 'Donation', NULL, 'Available', '2026-10-21 05:20:18', '2026-10-21 05:20:18'),
(34, 6, 'A+', 5, 5, '2026-10-21', '2026-11-25', 'Donation', NULL, 'Available', '2026-10-21 05:21:54', '2026-10-21 05:21:54'),
(35, 11, 'B+', 5, 5, '2026-10-21', '2026-11-25', 'Camp', NULL, 'Available', '2026-10-21 06:23:39', '2026-10-21 06:23:39'),
(36, 11, 'B+', 10, 10, '2026-10-24', '2026-11-28', 'Donation', NULL, 'Available', '2026-10-24 07:52:59', '2026-10-24 07:52:59'),
(37, 11, 'A+', 2, 2, '2026-10-24', '2026-11-28', 'Camp', NULL, 'Available', '2026-10-24 07:53:58', '2026-10-24 07:53:58'),
(38, 11, 'AB-', 12, 12, '2026-10-24', '2026-11-28', 'Donation', NULL, 'Available', '2026-10-24 07:54:30', '2026-10-24 07:54:30'),
(39, 11, 'B-', 7, 7, '2026-10-24', '2026-11-28', 'Donation', NULL, 'Available', '2026-10-24 07:54:45', '2026-10-24 07:54:45'),
(40, 11, 'A+', 5, 5, '2026-10-24', '2026-11-28', 'Donation', NULL, 'Available', '2026-10-24 07:54:55', '2026-10-24 07:54:55'),
(41, 11, 'AB+', 10, 10, '2026-10-25', '2026-11-29', 'Camp', NULL, 'Available', '2026-10-25 09:42:23', '2026-10-25 09:42:23'),
(42, 11, 'A+', 20, 20, '2026-10-25', '2026-11-29', 'Camp', NULL, 'Available', '2026-10-25 10:34:10', '2026-10-25 10:34:10');

-- --------------------------------------------------------

--
-- Table structure for table `blood_connection`
--

CREATE TABLE `blood_connection` (
  `connection_id` int(11) NOT NULL,
  `note_owner_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `note_type` enum('Need','Available') NOT NULL,
  `note_blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `applicant_role` enum('Donor','Receiver') NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `father_name` varchar(100) NOT NULL,
  `mother_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `nid` varchar(17) NOT NULL,
  `last_donation_date` date DEFAULT NULL,
  `previous_donations` int(11) DEFAULT NULL,
  `has_blood_disease` enum('Yes','No') DEFAULT NULL,
  `illness_reason` varchar(500) DEFAULT NULL,
  `received_before` enum('Yes','No') DEFAULT NULL,
  `status` enum('Rejected','Submitted','Declined','Closed','Pending','Cancelled','Successful') NOT NULL DEFAULT 'Submitted',
  `status_reason` varchar(255) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` enum('Owner','Applicant','Admin','System') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blood_connection`
--

INSERT INTO `blood_connection` (`connection_id`, `note_owner_id`, `applicant_id`, `note_type`, `note_blood_group`, `applicant_role`, `full_name`, `father_name`, `mother_name`, `address`, `blood_group`, `mobile`, `email`, `nid`, `last_donation_date`, `previous_donations`, `has_blood_disease`, `illness_reason`, `received_before`, `status`, `status_reason`, `confirmed_at`, `completed_at`, `cancelled_at`, `cancelled_by`, `created_at`, `updated_at`) VALUES
(1, 18, 17, 'Need', 'A+', 'Donor', 'Rahim Uddin', 'Abdul Karim', 'Rahima Begum', 'House 5, Panchlaish, Chattogram', 'O+', '01710000001', 'demo_user01@demo.bloodlagbe.test', '1234567890', NULL, 0, 'No', NULL, NULL, 'Cancelled', 'No response within 7 days', NULL, NULL, '2026-10-24 13:35:46', 'System', '2026-10-15 06:10:25', '2026-10-24 07:35:46'),
(3, 16, 29, 'Need', 'B+', 'Donor', 'Nur Mohammad', 'Md. Alamgir Hossen', 'Nurun Nahar', 'Agrabad Chattogram', 'B+', '01877556005', 'nurmohammadakash1821444618@gmail.com', '6914673188', '2026-10-17', 1, 'No', NULL, NULL, 'Rejected', 'Donated too recently (last donation 2026-10-17)', NULL, NULL, NULL, NULL, '2026-10-17 11:56:56', '2026-10-17 11:56:56'),
(4, 16, 29, 'Need', 'B+', 'Donor', 'Nur Mohammad', 'Md. Alamgir Hossen', 'Nurun Nahar', 'Agrabad Chattogram', 'B+', '01877556005', 'nurmohammadakash1821444618@gmail.com', '6914673188', '2026-06-16', 1, 'Yes', NULL, NULL, 'Rejected', 'Declared a blood related disease', NULL, NULL, NULL, NULL, '2026-10-17 11:57:28', '2026-10-17 11:57:28'),
(5, 16, 29, 'Need', 'B+', 'Donor', 'Nur Mohammad', 'Md. Alamgir Hossen', 'Nurun Nahar', 'Agrabad Chattogram', 'B+', '01877556005', 'nurmohammadakash1821444618@gmail.com', '6914673188', '2026-06-16', 2, 'Yes', NULL, NULL, 'Rejected', 'Declared a blood related disease', NULL, NULL, NULL, NULL, '2026-10-17 11:57:59', '2026-10-17 11:57:59'),
(6, 16, 29, 'Need', 'B+', 'Donor', 'Nur Mohammad', 'Md. Alamgir Hossen', 'Nurun Nahar', 'Agrabad Chattogram', 'B+', '01877556005', 'nurmohammadakash1821444618@gmail.com', '6914673188', '2026-04-04', 1, 'No', NULL, NULL, 'Successful', NULL, '2026-10-17 18:00:18', '2026-10-17 18:02:05', NULL, NULL, '2026-10-17 11:59:04', '2026-10-17 12:02:05'),
(7, 29, 16, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'Bahaddarhat', 'B+', '01815802524', 'hridoy8414@gmail.com', '6914673189', '2025-02-18', 1, 'No', NULL, NULL, 'Rejected', 'Under 18 years old', NULL, NULL, NULL, NULL, '2026-10-21 06:40:32', '2026-10-21 06:40:32'),
(8, 29, 16, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'Bahaddarhat', 'B+', '01815802524', 'hridoy8414@gmail.com', '6914673189', '2024-01-09', 1, 'No', NULL, NULL, 'Rejected', 'Under 18 years old', NULL, NULL, NULL, NULL, '2026-10-24 07:37:54', '2026-10-24 07:37:54'),
(9, 16, 29, 'Need', 'B+', 'Donor', 'Nur Mohammad', 'Md. Alamgir Hossen', 'Nurun Nahar', 'Agrabad Chattogram', 'B+', '01877556005', 'nurmohammadakash1821444618@gmail.com', '6914673187', '2026-10-24', 1, 'No', NULL, NULL, 'Rejected', 'Donated too recently (last donation 2026-10-24)', NULL, NULL, NULL, NULL, '2026-10-24 07:39:33', '2026-10-24 07:39:33'),
(10, 29, 30, 'Need', 'B+', 'Donor', 'Ramish Jahra', 'Mohammad Hossain', 'Roje Akter', 'Badal Chowdhury Bari', 'B+', '01839237765', 'ramishjahra@gmail.com', '6914673185', NULL, 0, 'No', NULL, NULL, 'Successful', NULL, '2026-10-24 13:46:18', '2026-10-24 13:48:42', NULL, NULL, '2026-10-24 07:45:16', '2026-10-24 07:48:42'),
(11, 29, 16, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'Bahaddarhat', 'B+', '01815802524', 'hridoy8414@gmail.com', '6914673181', '2026-10-25', 1, 'No', NULL, NULL, 'Rejected', 'Under 18 years old', NULL, NULL, NULL, NULL, '2026-10-25 09:21:45', '2026-10-25 09:21:45'),
(12, 29, 32, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'North Kattali', 'B+', '01812124270', 'niloydas752@gmail.com', '6914673181212', '2026-10-25', 1, 'No', NULL, NULL, 'Rejected', 'Donated too recently (last donation 2026-10-25)', NULL, NULL, NULL, NULL, '2026-10-25 09:33:25', '2026-10-25 09:33:25'),
(13, 29, 32, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'North Kattali', 'B+', '01812124270', 'niloydas752@gmail.com', '6914673181132', '2025-05-20', 1, 'Yes', NULL, NULL, 'Rejected', 'Declared a blood related disease', NULL, NULL, NULL, NULL, '2026-10-25 09:34:28', '2026-10-25 09:34:28'),
(14, 29, 32, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'North Kattali', 'B+', '01812124270', 'niloydas752@gmail.com', '6914673181321', '2025-06-26', 1, 'No', NULL, NULL, 'Successful', NULL, '2026-10-25 15:35:36', '2026-10-25 15:37:56', NULL, NULL, '2026-10-25 09:35:05', '2026-10-25 09:37:56'),
(15, 29, 32, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'North Kattali', 'B+', '01812124270', 'niloydas752@gmail.com', '6914673182', '2026-10-25', 1, 'No', NULL, NULL, 'Rejected', 'Donated too recently (last donation 2026-10-25)', NULL, NULL, NULL, NULL, '2026-10-25 10:27:07', '2026-10-25 10:27:07'),
(16, 29, 32, 'Need', 'B+', 'Donor', 'Niloy Das', 'xyz Das', 'abc Das', 'North Kattali', 'B+', '01812124270', 'niloydas752@gmail.com', '1234567890123', '2026-03-24', 1, 'No', NULL, NULL, 'Successful', NULL, '2026-10-25 16:28:45', '2026-10-25 16:29:26', NULL, NULL, '2026-10-25 10:28:23', '2026-10-25 10:29:26');

-- --------------------------------------------------------

--
-- Table structure for table `blood_exchange`
--

CREATE TABLE `blood_exchange` (
  `exchange_id` int(11) NOT NULL,
  `donor_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `donated_on` date NOT NULL,
  `initiated_by` int(11) NOT NULL,
  `status` enum('Pending','Confirmed','Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `confirmed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blood_inventory`
--

CREATE TABLE `blood_inventory` (
  `inventory_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `unit_count` int(11) NOT NULL DEFAULT 0,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blood_inventory`
--

INSERT INTO `blood_inventory` (`inventory_id`, `bloodbank_id`, `blood_group`, `unit_count`, `last_updated`) VALUES
(17, 6, 'A+', 5, '2026-10-21 05:21:54'),
(18, 7, 'A+', 10, '2026-10-14 05:10:29'),
(19, 8, 'A+', 17, '2026-10-14 05:10:29'),
(20, 6, 'A-', 8, '2026-10-14 05:10:29'),
(21, 7, 'A-', 15, '2026-10-14 05:10:29'),
(22, 8, 'A-', 0, '2026-10-14 05:10:29'),
(23, 6, 'B+', 16, '2026-10-21 05:20:18'),
(24, 7, 'B+', 20, '2026-10-14 05:10:29'),
(25, 8, 'B+', 5, '2026-10-14 05:10:29'),
(26, 6, 'B-', 18, '2026-10-14 05:10:29'),
(27, 7, 'B-', 3, '2026-10-14 05:10:29'),
(28, 8, 'B-', 10, '2026-10-14 05:10:29'),
(29, 6, 'AB+', 1, '2026-10-14 05:10:29'),
(30, 7, 'AB+', 8, '2026-10-14 05:10:29'),
(31, 8, 'AB+', 15, '2026-10-14 05:10:29'),
(32, 6, 'AB-', 6, '2026-10-14 05:10:29'),
(33, 7, 'AB-', 13, '2026-10-14 05:10:29'),
(34, 8, 'AB-', 20, '2026-10-14 05:10:29'),
(35, 6, 'O+', 11, '2026-10-14 05:10:29'),
(36, 7, 'O+', 18, '2026-10-14 05:10:29'),
(37, 8, 'O+', 3, '2026-10-14 05:10:29'),
(38, 6, 'O-', 16, '2026-10-14 05:10:29'),
(39, 7, 'O-', 1, '2026-10-14 05:10:29'),
(40, 8, 'O-', 8, '2026-10-14 05:10:29'),
(44, 11, 'B+', 15, '2026-10-24 07:52:59'),
(46, 11, 'A+', 27, '2026-10-25 10:34:10'),
(47, 11, 'AB-', 12, '2026-10-24 07:54:30'),
(48, 11, 'B-', 7, '2026-10-24 07:54:45'),
(50, 11, 'AB+', 10, '2026-10-25 09:42:23');

-- --------------------------------------------------------

--
-- Table structure for table `blood_request`
--

CREATE TABLE `blood_request` (
  `request_id` int(11) NOT NULL,
  `requester_id` int(11) NOT NULL,
  `bloodbank_id` int(11) DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `units_required` int(11) NOT NULL DEFAULT 1,
  `urgency_level` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `patient_name` varchar(100) NOT NULL,
  `patient_age` int(11) DEFAULT NULL,
  `hospital_name` varchar(150) NOT NULL,
  `hospital_address` text NOT NULL,
  `contact_person` varchar(100) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `required_date` date NOT NULL,
  `note` text DEFAULT NULL,
  `status` enum('Pending','Accepted','Completed','Cancelled','Expired','Rejected') DEFAULT 'Pending',
  `status_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bank_note` varchar(255) DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `blood_request`
--

INSERT INTO `blood_request` (`request_id`, `requester_id`, `bloodbank_id`, `blood_group`, `units_required`, `urgency_level`, `patient_name`, `patient_age`, `hospital_name`, `hospital_address`, `contact_person`, `contact_number`, `required_date`, `note`, `status`, `status_reason`, `created_at`, `updated_at`, `bank_note`, `issued_at`) VALUES
(1, 17, NULL, 'O+', 2, 'Critical', 'Demo Patient 01', 34, 'Demo General Hospital', 'Demo hospital address', 'Demo Attendant 01', '01920000001', '2026-10-15', 'Demo request', 'Expired', 'Automatically expired (past the required date)', '2026-10-12 05:13:49', '2026-10-17 12:08:04', NULL, NULL),
(2, 18, 6, 'A+', 1, 'High', 'Demo Patient 02', 45, 'Demo Medical College', 'Demo hospital address', 'Demo Attendant 02', '01920000002', '2026-10-17', 'Demo request', 'Pending', NULL, '2026-10-10 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(3, 20, NULL, 'AB+', 3, 'Critical', 'Demo Patient 03', 28, 'Demo Heart Foundation', 'Demo hospital address', 'Demo Attendant 03', '01920000003', '2026-10-16', 'Demo request', 'Accepted', NULL, '2026-10-08 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(4, 21, 7, 'O-', 2, 'High', 'Demo Patient 04', 60, 'Demo General Hospital', 'Demo hospital address', 'Demo Attendant 04', '01920000004', '2026-10-18', 'Demo request', 'Accepted', NULL, '2026-10-05 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(5, 22, 6, 'A-', 1, 'Medium', 'Demo Patient 05', 22, 'Demo Medical College', 'Demo hospital address', 'Demo Attendant 05', '01920000005', '2026-10-04', 'Demo request', 'Completed', NULL, '2026-09-19 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(6, 24, 8, 'O+', 2, 'Medium', 'Demo Patient 06', 51, 'Demo Heart Foundation', 'Demo hospital address', 'Demo Attendant 06', '01920000006', '2026-09-24', 'Demo request', 'Completed', NULL, '2026-09-04 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(7, 19, 6, 'B+', 1, 'Low', 'Demo Patient 07', 19, 'Demo General Hospital', 'Demo hospital address', 'Demo Attendant 07', '01920000007', '2026-09-09', 'Demo request', 'Completed', NULL, '2026-08-15 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(8, 25, NULL, 'AB-', 2, 'High', 'Demo Patient 08', 39, 'Demo Medical College', 'Demo hospital address', 'Demo Attendant 08', '01920000008', '2026-10-09', 'Demo request', 'Cancelled', NULL, '2026-09-29 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(9, 23, NULL, 'B-', 1, 'Medium', 'Demo Patient 09', 31, 'Demo General Hospital', 'Demo hospital address', 'Demo Attendant 09', '01920000009', '2026-09-14', 'Demo request', 'Expired', NULL, '2026-08-20 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(10, 28, NULL, 'O+', 2, 'High', 'Demo Patient 10', 47, 'Demo Heart Foundation', 'Demo hospital address', 'Demo Attendant 10', '01920000010', '2026-10-11', 'Demo request', 'Expired', 'Automatically expired (past the required date)', '2026-10-02 05:13:49', '2026-10-17 12:08:04', NULL, NULL),
(11, 18, NULL, 'A+', 1, 'Medium', 'Demo Patient 11', 26, 'Demo Medical College', 'Demo hospital address', 'Demo Attendant 11', '01920000011', '2026-10-07', 'Demo request', 'Expired', 'Automatically expired (past the required date)', '2026-09-24 05:13:49', '2026-10-17 12:08:04', NULL, NULL),
(12, 17, 7, 'O+', 1, 'Low', 'Demo Patient 12', 33, 'Demo General Hospital', 'Demo hospital address', 'Demo Attendant 12', '01920000012', '2026-08-25', 'Demo request', 'Completed', NULL, '2026-07-21 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(13, 20, NULL, 'AB+', 1, 'Medium', 'Demo Patient 13', 42, 'Demo Heart Foundation', 'Demo hospital address', 'Demo Attendant 13', '01920000013', '2026-08-05', 'Demo request', 'Completed', NULL, '2026-06-26 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(14, 24, NULL, 'O-', 3, 'Critical', 'Demo Patient 14', 55, 'Demo Medical College', 'Demo hospital address', 'Demo Attendant 14', '01920000014', '2026-10-19', 'Demo request', 'Pending', NULL, '2026-10-13 05:13:49', '2026-10-14 05:13:49', NULL, NULL),
(15, 29, 7, 'B+', 1, 'High', 'Akash', 23, 'Metro Politon Hospital', 'GEC, Chattogram', 'Nur Mohammad', '01877556005', '2026-10-21', 'ward - 28, Bed - 514, Doctor - Omborish Shanyal', 'Pending', NULL, '2026-10-21 06:05:21', '2026-10-21 06:05:21', NULL, NULL),
(16, 29, 11, 'B+', 1, 'Medium', 'xyz', NULL, 'CSCR', 'Prabartak', 'Nur Mohammad', '01877556005', '2026-10-21', NULL, 'Accepted', NULL, '2026-10-21 06:24:29', '2026-10-21 06:25:27', 'Please Contact Soon to our Blood Bank', NULL),
(17, 29, 11, 'B+', 1, 'Critical', 'xyz', 34, 'Metro Politon Hospital', '9Q4M+P7V', 'Nur Mohammad', '01877556005', '2026-10-24', NULL, 'Accepted', NULL, '2026-10-24 07:56:40', '2026-10-24 07:57:09', 'Please Contact Soon to our Blood Bank', NULL),
(18, 32, 11, 'B+', 1, 'Critical', 'abc', 21, 'Chevron Clinic', '9Q4M+P7V', 'Niloy Das', '01877556005', '2026-10-25', NULL, 'Accepted', NULL, '2026-10-25 09:40:17', '2026-10-25 09:41:17', NULL, NULL),
(19, 32, 11, 'B+', 1, 'Critical', 'xyz', 24, 'park view', 'Agrabad, Chattogram', 'Niloy Das', '01877556005', '2026-10-25', 'gjdurtiuh', 'Accepted', NULL, '2026-10-25 10:31:35', '2026-10-25 10:32:36', 'Please Contact Soon to our Blood Bank', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `blood_reservation`
--

CREATE TABLE `blood_reservation` (
  `reservation_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `units` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `camp`
--

CREATE TABLE `camp` (
  `camp_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `camp_rsvp`
--

CREATE TABLE `camp_rsvp` (
  `rsvp_id` int(11) NOT NULL,
  `camp_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('Going','Interested','Cancelled') DEFAULT 'Interested',
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comment`
--

CREATE TABLE `comment` (
  `comment_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `connection_review`
--

CREATE TABLE `connection_review` (
  `review_id` int(11) NOT NULL,
  `connection_id` int(11) NOT NULL,
  `rater_id` int(11) NOT NULL,
  `rated_id` int(11) NOT NULL,
  `stars` tinyint(4) NOT NULL,
  `comment` varchar(300) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `connection_review`
--

INSERT INTO `connection_review` (`review_id`, `connection_id`, `rater_id`, `rated_id`, `stars`, `comment`, `created_at`) VALUES
(1, 6, 16, 29, 5, 'A good donor, can believe', '2026-10-17 12:01:06'),
(2, 6, 29, 16, 5, 'He was real, no fake application', '2026-10-17 12:02:05'),
(3, 10, 29, 30, 5, 'wonderful blood', '2026-10-24 07:46:59'),
(4, 10, 30, 29, 5, 'Very Good Behavior', '2026-10-24 07:48:42'),
(5, 14, 29, 32, 5, 'very good donor', '2026-10-25 09:37:22'),
(6, 14, 32, 29, 5, 'Not so good, but somehow believable', '2026-10-25 09:37:56'),
(7, 16, 29, 32, 3, 'good', '2026-10-25 10:29:10'),
(8, 16, 32, 29, 3, 'very good', '2026-10-25 10:29:26');

-- --------------------------------------------------------

--
-- Table structure for table `content_report`
--

CREATE TABLE `content_report` (
  `report_id` int(11) NOT NULL,
  `target_type` enum('post','comment') NOT NULL,
  `target_id` int(11) NOT NULL,
  `reporter_type` enum('user','bloodbank') NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reason` enum('Spam','Harassment','Misinformation','Inappropriate','Other') NOT NULL DEFAULT 'Other',
  `details` varchar(255) DEFAULT NULL,
  `status` enum('Open','Resolved','Dismissed') NOT NULL DEFAULT 'Open',
  `resolved_by` int(11) DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolution_note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `donation`
--

CREATE TABLE `donation` (
  `donation_id` int(11) NOT NULL,
  `donor_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `nid_number` varchar(20) NOT NULL,
  `nid_verified` tinyint(1) DEFAULT 0,
  `verified_latitude` decimal(10,8) DEFAULT NULL,
  `verified_longitude` decimal(11,8) DEFAULT NULL,
  `donation_date` date NOT NULL,
  `donation_time` time NOT NULL,
  `status` enum('Pending','Verified','Completed','Cancelled') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `donation`
--

INSERT INTO `donation` (`donation_id`, `donor_id`, `receiver_id`, `bloodbank_id`, `request_id`, `nid_number`, `nid_verified`, `verified_latitude`, `verified_longitude`, `donation_date`, `donation_time`, `status`, `created_at`, `updated_at`) VALUES
(1, 17, 20, 6, 3, 'DEMO0000000001', 0, NULL, NULL, '2026-10-14', '10:30:00', 'Pending', '2026-10-14 05:14:29', '2026-10-14 05:14:29'),
(2, 21, 24, 7, 4, 'DEMO0000000002', 1, NULL, NULL, '2026-10-13', '11:00:00', 'Verified', '2026-10-13 05:14:29', '2026-10-14 05:14:29'),
(3, 18, 22, 6, 5, 'DEMO0000000003', 1, NULL, NULL, '2026-10-04', '09:30:00', 'Completed', '2026-10-04 05:14:29', '2026-10-14 05:14:29'),
(4, 19, 24, 8, 6, 'DEMO0000000004', 1, NULL, NULL, '2026-09-24', '14:00:00', 'Completed', '2026-09-24 05:14:29', '2026-10-14 05:14:29'),
(5, 25, 19, 6, 7, 'DEMO0000000005', 1, NULL, NULL, '2026-09-09', '15:30:00', 'Completed', '2026-09-09 05:14:29', '2026-10-14 05:14:29'),
(6, 17, 28, 7, 12, 'DEMO0000000006', 1, NULL, NULL, '2026-08-25', '10:00:00', 'Completed', '2026-08-25 05:14:29', '2026-10-14 05:14:29'),
(7, 21, 20, 6, 13, 'DEMO0000000007', 1, NULL, NULL, '2026-08-05', '12:15:00', 'Completed', '2026-08-05 05:14:29', '2026-10-14 05:14:29'),
(8, 23, 18, 8, NULL, 'DEMO0000000008', 1, NULL, NULL, '2026-07-16', '16:00:00', 'Completed', '2026-07-16 05:14:29', '2026-10-14 05:14:29'),
(9, 25, 17, 7, NULL, 'DEMO0000000009', 0, NULL, NULL, '2026-09-29', '13:00:00', 'Cancelled', '2026-09-29 05:14:29', '2026-10-14 05:14:29'),
(10, 19, 25, 6, NULL, 'DEMO0000000010', 0, NULL, NULL, '2026-10-14', '17:30:00', 'Pending', '2026-10-14 05:14:29', '2026-10-14 05:14:29');

-- --------------------------------------------------------

--
-- Table structure for table `feed_comment`
--

CREATE TABLE `feed_comment` (
  `comment_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `author_type` enum('user','bloodbank') NOT NULL,
  `author_id` int(11) NOT NULL,
  `content` varchar(1000) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_hidden` tinyint(1) NOT NULL DEFAULT 0,
  `hidden_reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `feed_comment`
--

INSERT INTO `feed_comment` (`comment_id`, `post_id`, `author_type`, `author_id`, `content`, `created_at`, `is_hidden`, `hidden_reason`) VALUES
(3, 3, 'user', 16, 'Ok, Thanks for you info', '2026-10-21 06:39:17', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `feed_like`
--

CREATE TABLE `feed_like` (
  `like_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `liker_type` enum('user','bloodbank') NOT NULL,
  `liker_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reaction` enum('like','dislike') NOT NULL DEFAULT 'like'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `feed_like`
--

INSERT INTO `feed_like` (`like_id`, `post_id`, `liker_type`, `liker_id`, `created_at`, `reaction`) VALUES
(4, 2, 'user', 29, '2026-10-17 12:04:41', 'like'),
(5, 3, 'user', 16, '2026-10-21 06:39:04', 'like'),
(6, 3, 'user', 32, '2026-11-07 09:12:40', 'dislike');

-- --------------------------------------------------------

--
-- Table structure for table `feed_post`
--

CREATE TABLE `feed_post` (
  `post_id` int(11) NOT NULL,
  `author_type` enum('user','bloodbank') NOT NULL,
  `author_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `media_url` varchar(255) DEFAULT NULL,
  `is_urgent` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_hidden` tinyint(1) NOT NULL DEFAULT 0,
  `hidden_reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `feed_post`
--

INSERT INTO `feed_post` (`post_id`, `author_type`, `author_id`, `content`, `media_url`, `is_urgent`, `created_at`, `is_hidden`, `hidden_reason`) VALUES
(2, 'user', 16, 'I have donated my blood for the 10th Time, Thanks to The Almighty for giving me this opportunity.', NULL, 0, '2026-10-13 18:13:49', 0, NULL),
(3, 'user', 29, 'I have Received Blood from GEC Blood Bank, They are totally Good, if anybody wants, can connect with them', NULL, 0, '2026-10-21 06:35:59', 0, NULL),
(4, 'user', 32, 'Hey, I am using Blood Lagbe, I found it so useful', NULL, 0, '2026-11-07 09:05:57', 0, NULL),
(5, 'user', 32, 'Hey, I am using Blood Lagbe, I found it so useful', NULL, 0, '2026-11-07 09:05:59', 0, NULL),
(6, 'user', 32, 'Hey, I am using Blood Lagbe, I found it so useful', NULL, 0, '2026-11-07 09:06:52', 0, NULL),
(7, 'user', 32, 'Hey, I am using Blood Lagbe, I found it so useful', NULL, 0, '2026-11-07 09:07:28', 0, NULL),
(8, 'user', 32, 'I am using Blood Lagbe, and I found it so useful', NULL, 0, '2026-11-07 09:12:29', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `friendship`
--

CREATE TABLE `friendship` (
  `friendship_id` int(11) NOT NULL,
  `requester_id` int(11) NOT NULL,
  `addressee_id` int(11) NOT NULL,
  `status` enum('Pending','Accepted') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `friendship`
--

INSERT INTO `friendship` (`friendship_id`, `requester_id`, `addressee_id`, `status`, `created_at`, `responded_at`) VALUES
(3, 15, 16, 'Accepted', '2026-10-12 05:10:27', '2026-10-12 11:12:19'),
(5, 29, 16, 'Accepted', '2026-10-17 11:53:59', '2026-10-17 17:55:31'),
(6, 29, 15, 'Pending', '2026-10-17 12:07:08', NULL),
(7, 30, 29, 'Accepted', '2026-10-24 07:50:01', '2026-10-24 13:50:58'),
(8, 32, 29, 'Accepted', '2026-11-07 09:06:12', '2026-11-07 15:06:43');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_log`
--

CREATE TABLE `inventory_log` (
  `log_id` int(11) NOT NULL,
  `bloodbank_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `action` enum('Received','Issued','Expired','Discarded','Adjusted') NOT NULL,
  `change_units` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_log`
--

INSERT INTO `inventory_log` (`log_id`, `bloodbank_id`, `batch_id`, `blood_group`, `action`, `change_units`, `reason`, `created_at`) VALUES
(1, 6, 1, 'A+', 'Expired', -4, 'Passed expiry date', '2026-10-21 05:17:51'),
(2, 6, 33, 'B+', 'Received', 3, 'Donation batch added', '2026-10-21 05:20:18'),
(3, 6, 34, 'A+', 'Received', 5, 'Donation batch added', '2026-10-21 05:21:54'),
(4, 11, 35, 'B+', 'Received', 5, 'Camp batch added', '2026-10-21 06:23:39'),
(5, 11, 36, 'B+', 'Received', 10, 'Donation batch added', '2026-10-24 07:52:59'),
(6, 11, 37, 'A+', 'Received', 2, 'Camp batch added', '2026-10-24 07:53:58'),
(7, 11, 38, 'AB-', 'Received', 12, 'Donation batch added', '2026-10-24 07:54:30'),
(8, 11, 39, 'B-', 'Received', 7, 'Donation batch added', '2026-10-24 07:54:45'),
(9, 11, 40, 'A+', 'Received', 5, 'Donation batch added', '2026-10-24 07:54:55'),
(10, 11, 41, 'AB+', 'Received', 10, 'Camp batch added', '2026-10-25 09:42:23'),
(11, 11, 42, 'A+', 'Received', 20, 'Camp batch added', '2026-10-25 10:34:10');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('Blood Request','Donation','Camp','Post','System') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post`
--

CREATE TABLE `post` (
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `content_type` enum('Text','Image','Video','Mixed') DEFAULT 'Text',
  `media_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rating`
--

CREATE TABLE `rating` (
  `rating_id` int(11) NOT NULL,
  `donation_id` int(11) NOT NULL,
  `rater_id` int(11) NOT NULL,
  `rated_id` int(11) NOT NULL,
  `rating_value` tinyint(4) NOT NULL,
  `review` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `reaction`
--

CREATE TABLE `reaction` (
  `reaction_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reaction_type` enum('Like','Love','Care','Wow') NOT NULL DEFAULT 'Like',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_rating`
--

CREATE TABLE `site_rating` (
  `rating_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rating_value` tinyint(4) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `site_rating`
--

INSERT INTO `site_rating` (`rating_id`, `user_id`, `rating_value`, `created_at`) VALUES
(1, NULL, 1, '2026-08-16 05:23:36'),
(2, NULL, 2, '2026-08-16 05:23:37'),
(3, NULL, 3, '2026-08-16 05:23:38'),
(4, NULL, 4, '2026-08-16 05:23:39'),
(5, NULL, 5, '2026-08-16 05:23:40'),
(6, NULL, 1, '2026-08-16 05:23:49'),
(7, NULL, 2, '2026-08-16 05:23:50'),
(8, NULL, 3, '2026-08-16 05:23:51'),
(9, NULL, 4, '2026-08-16 05:23:52'),
(10, NULL, 5, '2026-08-16 05:23:53'),
(11, NULL, 1, '2026-08-17 02:01:23'),
(12, NULL, 2, '2026-08-17 02:01:24'),
(13, NULL, 3, '2026-08-17 02:01:36'),
(14, NULL, 4, '2026-08-17 02:01:37'),
(15, NULL, 5, '2026-08-17 02:01:38'),
(16, NULL, 1, '2026-08-17 02:45:27'),
(17, NULL, 2, '2026-08-17 02:45:28'),
(18, NULL, 3, '2026-08-17 02:45:30'),
(19, NULL, 4, '2026-08-17 02:45:31'),
(20, NULL, 5, '2026-08-17 02:45:32'),
(21, NULL, 3, '2026-10-13 18:30:45'),
(22, NULL, 4, '2026-10-13 18:30:46'),
(23, NULL, 5, '2026-10-13 18:30:47'),
(24, NULL, 1, '2026-10-17 05:16:11'),
(25, NULL, 5, '2026-10-17 05:16:22');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `division` varchar(50) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `upazila` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `role` enum('Donor','Recipient','Both','Volunteer') DEFAULT 'Donor',
  `eligibility_status` enum('Eligible','Not Eligible') DEFAULT 'Eligible',
  `next_eligible_date` date DEFAULT NULL,
  `trust_score` decimal(5,2) DEFAULT 100.00,
  `profile_picture` varchar(255) DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `email_otp` varchar(6) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `reset_otp` varchar(6) DEFAULT NULL,
  `reset_otp_expiry` datetime DEFAULT NULL,
  `account_status` enum('Pending','Active','Suspended','Blocked') DEFAULT 'Pending',
  `status_reason` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `address` text DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bio` varchar(300) DEFAULT NULL,
  `cover_picture` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `full_name`, `date_of_birth`, `gender`, `username`, `email`, `password`, `phone`, `division`, `district`, `upazila`, `postal_code`, `blood_group`, `role`, `eligibility_status`, `next_eligible_date`, `trust_score`, `profile_picture`, `email_verified`, `email_otp`, `otp_expiry`, `reset_otp`, `reset_otp_expiry`, `account_status`, `status_reason`, `last_login`, `address`, `latitude`, `longitude`, `created_at`, `updated_at`, `bio`, `cover_picture`) VALUES
(15, 'Apurba Dey', '2026-10-04', 'Male', 'apurbadey', 'deyapurba304@gmail.com', '$2b$10$QOROMtLeqW3Z4xCaUzH1DeGTfmTiPpJLzjTbClpHqrh/jWVedUykK', '01839435970', 'Chattogram', 'Chattogram', 'Raozan', '4340', 'O+', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-21 12:57:47', 'Agrabad, Chattogram', 22.32445370, 91.81172320, '2026-10-04 10:01:06', '2026-10-21 06:57:47', NULL, NULL),
(16, 'Niloy Das', '2026-10-04', 'Male', 'alomgir', 'hridoy8414@gmail.com', '$2b$10$Tbl9TY6aBKSG34lNaOFE9etZStki.sC4LPLYHaE0WplbdJepAvX7a', '01815802524', 'Chattogram', 'Chattogram', 'Hathazari', '4100', 'B+', 'Both', 'Eligible', NULL, 100.00, '/uploads/avatars/1791915149155-8b7d7fcd35d4.jpg', 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-25 15:19:10', 'Bahaddarhat', 22.37027670, 91.84341620, '2026-10-04 10:37:54', '2026-10-25 09:19:10', NULL, '/uploads/covers/1791915156724-2a20181d0474.jpg'),
(17, 'Rahim Uddin', '1998-03-14', 'Male', 'demo_user01', 'demo_user01@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000001', 'Chattogram', 'Chattogram', 'Panchlaish', '4203', 'O+', 'Donor', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-15 12:01:17', 'Demo address, Panchlaish', 22.36120000, 91.81230000, '2026-04-27 05:10:28', '2026-10-15 06:01:17', NULL, NULL),
(18, 'Nusrat Jahan', '2000-07-22', 'Female', 'demo_user02', 'demo_user02@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000002', 'Chattogram', 'Chattogram', 'Kotwali', '4000', 'A+', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-15 11:59:09', 'Demo address, Kotwali', 22.33840000, 91.83170000, '2026-05-17 05:10:28', '2026-10-15 05:59:09', NULL, NULL),
(19, 'Tanvir Hasan', '1995-11-02', 'Male', 'demo_user03', 'demo_user03@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000003', 'Chattogram', 'Chattogram', 'Halishahar', '4216', 'B+', 'Donor', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-15 12:22:31', 'Demo address, Halishahar', 22.33010000, 91.77820000, '2026-06-06 05:10:28', '2026-10-15 06:22:31', NULL, NULL),
(20, 'Sadia Islam', '2001-01-30', 'Female', 'demo_user04', 'demo_user04@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000004', 'Chattogram', 'Cox\'s Bazar', 'Cox\'s Bazar Sadar', '4700', 'AB+', 'Recipient', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-09-17 11:10:28', 'Demo address, Cox\'s Bazar Sadar', NULL, NULL, '2026-06-26 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(21, 'Imran Hossain', '1993-05-19', 'Male', 'demo_user05', 'demo_user05@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000005', 'Chattogram', 'Chattogram', 'Pahartali', '4202', 'O-', 'Donor', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-09-21 11:10:28', 'Demo address, Pahartali', 22.37050000, 91.80210000, '2026-07-11 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(22, 'Farhana Akter', '1997-09-08', 'Female', 'demo_user06', 'demo_user06@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000006', 'Chattogram', 'Cumilla', 'Cumilla Sadar', '3500', 'A-', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-09-24 11:10:28', 'Demo address, Cumilla Sadar', NULL, NULL, '2026-07-26 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(23, 'Mahmudul Karim', '1990-12-25', 'Male', 'demo_user07', 'demo_user07@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000007', 'Dhaka', 'Dhaka', 'Dhanmondi', '1205', 'B-', 'Donor', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-09-29 11:10:28', 'Demo address, Dhanmondi', NULL, NULL, '2026-08-15 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(24, 'Mim Chowdhury', '2002-04-11', 'Female', 'demo_user08', 'demo_user08@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000008', 'Dhaka', 'Dhaka', 'Mirpur', '1216', 'O+', 'Recipient', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-03 11:10:28', 'Demo address, Mirpur', NULL, NULL, '2026-08-30 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(25, 'Arif Rahman', '1996-08-03', 'Male', 'demo_user09', 'demo_user09@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000009', 'Chattogram', 'Chattogram', 'Double Mooring', '4100', 'AB-', 'Donor', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-07 11:10:28', 'Demo address, Double Mooring', 22.32630000, 91.81490000, '2026-09-14 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(26, 'Shirin Sultana', '1994-02-17', 'Female', 'demo_user10', 'demo_user10@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000010', 'Sylhet', 'Sylhet', 'Sylhet Sadar', '3100', 'A+', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Suspended', NULL, NULL, 'Demo address, Sylhet Sadar', NULL, NULL, '2026-09-24 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(27, 'Kamal Hossain', '1999-06-27', 'Male', 'demo_user11', 'demo_user11@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000011', 'Chattogram', 'Chattogram', 'Bayazid', '4210', 'B+', 'Donor', 'Eligible', NULL, 100.00, NULL, 0, NULL, NULL, NULL, NULL, 'Pending', NULL, NULL, 'Demo address, Bayazid', 22.39920000, 91.82650000, '2026-10-04 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(28, 'Lamia Rahman', '2003-10-09', 'Female', 'demo_user12', 'demo_user12@demo.bloodlagbe.test', '$2b$10$pxrhKvCCf3tf7UFaOhaNNerI7o34E3Ppjs7FZkMMyhHPhGgX1/aw.', '01710000012', 'Rajshahi', 'Rajshahi', 'Boalia', '6100', 'O+', 'Recipient', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-13 11:10:28', 'Demo address, Boalia', NULL, NULL, '2026-10-11 05:10:28', '2026-10-14 05:10:28', NULL, NULL),
(29, 'Nur Mohammad', '2003-06-15', 'Male', 'akash', 'nurmohammadakash1821444618@gmail.com', '$2b$10$Uchb/Nwlw4BQGbKmK9/FkORkiGfDOzRwdw2nJfbQ.y8gwX8Oe/3EG', '01877556005', 'Chattogram', 'Chattogram', 'Hathazari', '4100', 'B+', 'Both', 'Eligible', NULL, 100.00, '/uploads/avatars/1792238068106-9233b81528dd.jpg', 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-11-09 12:15:36', 'Agrabad Chattogram', 22.32445370, 91.81172320, '2026-10-17 11:53:15', '2026-11-09 06:15:36', NULL, '/uploads/covers/1792238073314-957a076358a8.jpg'),
(30, 'Ramish Jahra', '2005-03-20', 'Female', 'Ramish', 'ramishjahra@gmail.com', '$2b$10$.AFqWNWVV/k6PS65veE5ZO.2mv8md1mM/vHwL5Zbs06Unal0LpEf6', '01839237765', 'Chattogram', 'Chattogram', 'Hathazari', '4337', 'B+', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-10-24 13:48:06', 'Badal Chowdhury Bari', 22.42132520, 91.87330170, '2026-10-24 07:43:26', '2026-10-24 07:48:06', NULL, NULL),
(31, 'Niloy Das', '2003-05-27', 'Male', 'niloydas', 'mrniloydas329@gmail.com', '$2b$10$53zrtyAG9nBnS/BhrZETGO8.zOfZ1LJ.2KKs/XJcHJdnymRzMr.W.', '01856009143', 'Chattogram', 'Chattogram', 'Anwara', '4217', 'B+', 'Both', 'Eligible', NULL, 100.00, NULL, 0, '211035', '2026-10-25 15:30:57', NULL, NULL, 'Pending', NULL, NULL, 'North Kattali', 22.36288870, 91.77092170, '2026-10-25 09:25:57', '2026-10-25 09:25:57', NULL, NULL),
(32, 'Niloy Das', '2003-05-27', 'Male', 'niloy', 'niloydas752@gmail.com', '$2b$10$/Li8xXey1boHAiysucEerOgVWWIMZmknD8w2yBWX5P/Ak1FNeglTq', '01812124270', 'Chattogram', 'Chattogram', 'Banshkhali', '4217', 'B+', 'Both', 'Eligible', NULL, 100.00, NULL, 1, NULL, NULL, NULL, NULL, 'Active', NULL, '2026-11-07 15:05:38', 'North Kattali', 22.36288870, 91.77092170, '2026-10-25 09:31:12', '2026-11-07 09:05:38', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_note`
--

CREATE TABLE `user_note` (
  `note_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `note_type` enum('Need','Available') NOT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_review`
--

CREATE TABLE `user_review` (
  `review_id` int(11) NOT NULL,
  `exchange_id` int(11) NOT NULL,
  `rater_id` int(11) NOT NULL,
  `rated_id` int(11) NOT NULL,
  `stars` tinyint(4) NOT NULL,
  `review` varchar(300) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_audit_log`
--
ALTER TABLE `admin_audit_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_audit_admin` (`admin_id`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `idx_announcement_created` (`created_at`);

--
-- Indexes for table `app_notification`
--
ALTER TABLE `app_notification`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_notif_recipient` (`recipient_type`,`recipient_id`,`is_read`,`created_at`);

--
-- Indexes for table `bank_settings`
--
ALTER TABLE `bank_settings`
  ADD PRIMARY KEY (`bloodbank_id`);

--
-- Indexes for table `blood_bank`
--
ALTER TABLE `blood_bank`
  ADD PRIMARY KEY (`bloodbank_id`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `blood_batch`
--
ALTER TABLE `blood_batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `idx_batch_stock` (`bloodbank_id`,`blood_group`,`status`,`expires_on`);

--
-- Indexes for table `blood_connection`
--
ALTER TABLE `blood_connection`
  ADD PRIMARY KEY (`connection_id`),
  ADD KEY `idx_bc_owner` (`note_owner_id`,`status`),
  ADD KEY `idx_bc_applicant` (`applicant_id`,`status`),
  ADD KEY `idx_bc_status` (`status`,`created_at`),
  ADD KEY `idx_bc_nid` (`nid`),
  ADD KEY `idx_bc_mobile` (`mobile`),
  ADD KEY `idx_bc_email` (`email`);

--
-- Indexes for table `blood_exchange`
--
ALTER TABLE `blood_exchange`
  ADD PRIMARY KEY (`exchange_id`),
  ADD KEY `idx_exchange_donor` (`donor_id`,`status`,`donated_on`),
  ADD KEY `idx_exchange_recipient` (`recipient_id`,`status`);

--
-- Indexes for table `blood_inventory`
--
ALTER TABLE `blood_inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD UNIQUE KEY `unique_bloodbank_group` (`bloodbank_id`,`blood_group`);

--
-- Indexes for table `blood_request`
--
ALTER TABLE `blood_request`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_request_user` (`requester_id`),
  ADD KEY `fk_request_bloodbank` (`bloodbank_id`);

--
-- Indexes for table `blood_reservation`
--
ALTER TABLE `blood_reservation`
  ADD PRIMARY KEY (`reservation_id`),
  ADD KEY `idx_reservation_request` (`request_id`),
  ADD KEY `idx_reservation_bank` (`bloodbank_id`);

--
-- Indexes for table `camp`
--
ALTER TABLE `camp`
  ADD PRIMARY KEY (`camp_id`),
  ADD KEY `fk_camp_bloodbank` (`bloodbank_id`);

--
-- Indexes for table `camp_rsvp`
--
ALTER TABLE `camp_rsvp`
  ADD PRIMARY KEY (`rsvp_id`),
  ADD UNIQUE KEY `unique_camp_user` (`camp_id`,`user_id`),
  ADD KEY `fk_rsvp_user` (`user_id`);

--
-- Indexes for table `comment`
--
ALTER TABLE `comment`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `fk_comment_post` (`post_id`),
  ADD KEY `fk_comment_user` (`user_id`);

--
-- Indexes for table `connection_review`
--
ALTER TABLE `connection_review`
  ADD PRIMARY KEY (`review_id`),
  ADD UNIQUE KEY `uq_cr_once` (`connection_id`,`rater_id`),
  ADD KEY `fk_cr_rater` (`rater_id`),
  ADD KEY `fk_cr_rated` (`rated_id`);

--
-- Indexes for table `content_report`
--
ALTER TABLE `content_report`
  ADD PRIMARY KEY (`report_id`),
  ADD UNIQUE KEY `uq_report` (`target_type`,`target_id`,`reporter_type`,`reporter_id`),
  ADD KEY `idx_report_status` (`status`,`created_at`);

--
-- Indexes for table `donation`
--
ALTER TABLE `donation`
  ADD PRIMARY KEY (`donation_id`),
  ADD UNIQUE KEY `unique_request` (`request_id`),
  ADD KEY `fk_donation_donor` (`donor_id`),
  ADD KEY `fk_donation_receiver` (`receiver_id`),
  ADD KEY `fk_donation_bloodbank` (`bloodbank_id`);

--
-- Indexes for table `feed_comment`
--
ALTER TABLE `feed_comment`
  ADD PRIMARY KEY (`comment_id`),
  ADD KEY `idx_comment_post` (`post_id`);

--
-- Indexes for table `feed_like`
--
ALTER TABLE `feed_like`
  ADD PRIMARY KEY (`like_id`),
  ADD UNIQUE KEY `uq_feed_like` (`post_id`,`liker_type`,`liker_id`);

--
-- Indexes for table `feed_post`
--
ALTER TABLE `feed_post`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `idx_feed_author` (`author_type`,`author_id`),
  ADD KEY `idx_feed_created` (`created_at`);

--
-- Indexes for table `friendship`
--
ALTER TABLE `friendship`
  ADD PRIMARY KEY (`friendship_id`),
  ADD UNIQUE KEY `uq_friend_pair` (`requester_id`,`addressee_id`),
  ADD KEY `idx_friend_addressee` (`addressee_id`,`status`);

--
-- Indexes for table `inventory_log`
--
ALTER TABLE `inventory_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_log_batch` (`batch_id`),
  ADD KEY `idx_log_bank` (`bloodbank_id`,`created_at`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `fk_notification_user` (`user_id`);

--
-- Indexes for table `post`
--
ALTER TABLE `post`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `fk_post_user` (`user_id`);

--
-- Indexes for table `rating`
--
ALTER TABLE `rating`
  ADD PRIMARY KEY (`rating_id`),
  ADD UNIQUE KEY `unique_rating` (`donation_id`,`rater_id`),
  ADD KEY `fk_rating_rater` (`rater_id`),
  ADD KEY `fk_rating_rated` (`rated_id`);

--
-- Indexes for table `reaction`
--
ALTER TABLE `reaction`
  ADD PRIMARY KEY (`reaction_id`),
  ADD UNIQUE KEY `unique_post_reaction` (`post_id`,`user_id`),
  ADD KEY `fk_reaction_user` (`user_id`);

--
-- Indexes for table `site_rating`
--
ALTER TABLE `site_rating`
  ADD PRIMARY KEY (`rating_id`),
  ADD KEY `fk_site_rating_user` (`user_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `idx_user_donor_geo` (`blood_group`,`account_status`,`email_verified`,`eligibility_status`,`latitude`,`longitude`);

--
-- Indexes for table `user_note`
--
ALTER TABLE `user_note`
  ADD PRIMARY KEY (`note_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `user_review`
--
ALTER TABLE `user_review`
  ADD PRIMARY KEY (`review_id`),
  ADD UNIQUE KEY `uq_review` (`exchange_id`,`rater_id`),
  ADD KEY `idx_review_rated` (`rated_id`,`created_at`),
  ADD KEY `fk_review_rater` (`rater_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `admin_audit_log`
--
ALTER TABLE `admin_audit_log`
  MODIFY `log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `app_notification`
--
ALTER TABLE `app_notification`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=88;

--
-- AUTO_INCREMENT for table `blood_bank`
--
ALTER TABLE `blood_bank`
  MODIFY `bloodbank_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `blood_batch`
--
ALTER TABLE `blood_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blood_connection`
--
ALTER TABLE `blood_connection`
  MODIFY `connection_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `blood_exchange`
--
ALTER TABLE `blood_exchange`
  MODIFY `exchange_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `blood_inventory`
--
ALTER TABLE `blood_inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `blood_request`
--
ALTER TABLE `blood_request`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `blood_reservation`
--
ALTER TABLE `blood_reservation`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `camp`
--
ALTER TABLE `camp`
  MODIFY `camp_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `camp_rsvp`
--
ALTER TABLE `camp_rsvp`
  MODIFY `rsvp_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comment`
--
ALTER TABLE `comment`
  MODIFY `comment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `connection_review`
--
ALTER TABLE `connection_review`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `content_report`
--
ALTER TABLE `content_report`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `donation`
--
ALTER TABLE `donation`
  MODIFY `donation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `feed_comment`
--
ALTER TABLE `feed_comment`
  MODIFY `comment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `feed_like`
--
ALTER TABLE `feed_like`
  MODIFY `like_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `feed_post`
--
ALTER TABLE `feed_post`
  MODIFY `post_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `friendship`
--
ALTER TABLE `friendship`
  MODIFY `friendship_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `inventory_log`
--
ALTER TABLE `inventory_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `post`
--
ALTER TABLE `post`
  MODIFY `post_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rating`
--
ALTER TABLE `rating`
  MODIFY `rating_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reaction`
--
ALTER TABLE `reaction`
  MODIFY `reaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `site_rating`
--
ALTER TABLE `site_rating`
  MODIFY `rating_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `user_note`
--
ALTER TABLE `user_note`
  MODIFY `note_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `user_review`
--
ALTER TABLE `user_review`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_audit_log`
--
ALTER TABLE `admin_audit_log`
  ADD CONSTRAINT `admin_audit_log_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL;

--
-- Constraints for table `bank_settings`
--
ALTER TABLE `bank_settings`
  ADD CONSTRAINT `fk_settings_bank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE;

--
-- Constraints for table `blood_batch`
--
ALTER TABLE `blood_batch`
  ADD CONSTRAINT `fk_batch_bank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE;

--
-- Constraints for table `blood_connection`
--
ALTER TABLE `blood_connection`
  ADD CONSTRAINT `fk_bc_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bc_owner` FOREIGN KEY (`note_owner_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `blood_exchange`
--
ALTER TABLE `blood_exchange`
  ADD CONSTRAINT `fk_exchange_donor` FOREIGN KEY (`donor_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_exchange_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `blood_inventory`
--
ALTER TABLE `blood_inventory`
  ADD CONSTRAINT `fk_inventory_bloodbank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `blood_request`
--
ALTER TABLE `blood_request`
  ADD CONSTRAINT `fk_request_bloodbank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_request_user` FOREIGN KEY (`requester_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `blood_reservation`
--
ALTER TABLE `blood_reservation`
  ADD CONSTRAINT `fk_reservation_request` FOREIGN KEY (`request_id`) REFERENCES `blood_request` (`request_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `camp`
--
ALTER TABLE `camp`
  ADD CONSTRAINT `fk_camp_bloodbank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `camp_rsvp`
--
ALTER TABLE `camp_rsvp`
  ADD CONSTRAINT `fk_rsvp_camp` FOREIGN KEY (`camp_id`) REFERENCES `camp` (`camp_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rsvp_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `comment`
--
ALTER TABLE `comment`
  ADD CONSTRAINT `fk_comment_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `connection_review`
--
ALTER TABLE `connection_review`
  ADD CONSTRAINT `fk_cr_connection` FOREIGN KEY (`connection_id`) REFERENCES `blood_connection` (`connection_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cr_rated` FOREIGN KEY (`rated_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cr_rater` FOREIGN KEY (`rater_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `donation`
--
ALTER TABLE `donation`
  ADD CONSTRAINT `fk_donation_bloodbank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_donation_donor` FOREIGN KEY (`donor_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_donation_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_donation_request` FOREIGN KEY (`request_id`) REFERENCES `blood_request` (`request_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `feed_comment`
--
ALTER TABLE `feed_comment`
  ADD CONSTRAINT `fk_feed_comment_post` FOREIGN KEY (`post_id`) REFERENCES `feed_post` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `feed_like`
--
ALTER TABLE `feed_like`
  ADD CONSTRAINT `fk_feed_like_post` FOREIGN KEY (`post_id`) REFERENCES `feed_post` (`post_id`) ON DELETE CASCADE;

--
-- Constraints for table `friendship`
--
ALTER TABLE `friendship`
  ADD CONSTRAINT `fk_friend_addressee` FOREIGN KEY (`addressee_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_friend_requester` FOREIGN KEY (`requester_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `inventory_log`
--
ALTER TABLE `inventory_log`
  ADD CONSTRAINT `fk_log_bank` FOREIGN KEY (`bloodbank_id`) REFERENCES `blood_bank` (`bloodbank_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_log_batch` FOREIGN KEY (`batch_id`) REFERENCES `blood_batch` (`batch_id`) ON DELETE SET NULL;

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `post`
--
ALTER TABLE `post`
  ADD CONSTRAINT `fk_post_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `rating`
--
ALTER TABLE `rating`
  ADD CONSTRAINT `fk_rating_donation` FOREIGN KEY (`donation_id`) REFERENCES `donation` (`donation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rating_rated` FOREIGN KEY (`rated_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rating_rater` FOREIGN KEY (`rater_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reaction`
--
ALTER TABLE `reaction`
  ADD CONSTRAINT `fk_reaction_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reaction_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `site_rating`
--
ALTER TABLE `site_rating`
  ADD CONSTRAINT `fk_site_rating_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `user_note`
--
ALTER TABLE `user_note`
  ADD CONSTRAINT `fk_note_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_review`
--
ALTER TABLE `user_review`
  ADD CONSTRAINT `fk_review_exchange` FOREIGN KEY (`exchange_id`) REFERENCES `blood_exchange` (`exchange_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_review_rated` FOREIGN KEY (`rated_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_review_rater` FOREIGN KEY (`rater_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
