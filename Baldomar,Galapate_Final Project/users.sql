-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 11, 2025 at 09:11 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grino_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `id_number` varchar(20) NOT NULL,
  `username` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `extension` varchar(20) DEFAULT NULL,
  `birthdate` date NOT NULL,
  `age` int(11) NOT NULL,
  `street` varchar(255) NOT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `country` varchar(100) NOT NULL,
  `zip` varchar(10) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `auth_q1` varchar(255) DEFAULT NULL,
  `auth_a1` varchar(255) DEFAULT NULL,
  `auth_q2` varchar(255) DEFAULT NULL,
  `auth_a2` varchar(255) DEFAULT NULL,
  `auth_q3` varchar(255) DEFAULT NULL,
  `auth_a3` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `id_number`, `username`, `first_name`, `middle_name`, `last_name`, `extension`, `birthdate`, `age`, `street`, `barangay`, `city`, `province`, `country`, `zip`, `email`, `password`, `auth_q1`, `auth_a1`, `auth_q2`, `auth_a2`, `auth_q3`, `auth_a3`, `created_at`) VALUES
(5, '2023-1016', 'kenneth', 'Kenneth', 'A', 'Baldomar', '', '2003-07-12', 22, 'Quarry Street', 'Barangay 9', 'cabadbaran city', 'agusan del norte', 'Philippines', '8605', 'kenneth@gmail.com', '$2y$10$TBkUSsQd3FgsJB60n81JLu0JPu.sV0xpApK//XjBnkovOdvUhuuBK', 'best_friend_elem', 'me', 'birth_place', 'me', 'favorite_food', 'me', '2025-11-04 16:18:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id_number` (`id_number`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
