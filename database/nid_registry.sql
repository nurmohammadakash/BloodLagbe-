-- Fake national ID dataset used to validate NID numbers.
-- All records are invented for this project. They do not belong to real people.
CREATE TABLE IF NOT EXISTS `nid_registry` (
  `nid` varchar(17) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `date_of_birth` date NOT NULL,
  `district` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`nid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `nid_registry` (`nid`, `full_name`, `date_of_birth`, `district`) VALUES
('2588139986', 'Rahim Uddin', '2005-12-25', 'Rangpur'),
('83091141707536455', 'Karim Hossain', '1994-12-17', 'Chattogram'),
('6188447294055', 'Sadia Islam', '1999-07-03', 'Barishal'),
('9716897684', 'Nusrat Jahan', '1996-10-16', 'Cox''s Bazar'),
('90932081967273177', 'Tanvir Ahmed', '2004-05-18', 'Barishal'),
('5887663440', 'Mehedi Hasan', '1972-03-21', 'Gazipur'),
('8875347787', 'Farhana Akter', '1997-09-22', 'Dhaka'),
('55717847267147513', 'Imran Khan', '1996-03-15', 'Dhaka'),
('2079819331908', 'Sumaiya Rahman', '1987-11-25', 'Khulna'),
('3059972837', 'Rakib Hasan', '1978-10-23', 'Cox''s Bazar'),
('5162294866', 'Jannatul Ferdous', '1979-09-26', 'Sylhet'),
('7016105500875', 'Abir Chowdhury', '1989-08-11', 'Chattogram'),
('8799229836', 'Shamim Reza', '1991-08-20', 'Sylhet'),
('28603208073702838', 'Nabila Sultana', '1978-03-22', 'Cumilla'),
('7468616425247', 'Arif Mahmud', '2001-07-10', 'Rangpur'),
('3587718841', 'Tasnim Haque', '1983-04-01', 'Chattogram'),
('85682052589831948', 'Sohel Rana', '1983-10-10', 'Gazipur'),
('5821416210521', 'Mitu Begum', '2002-06-09', 'Gazipur'),
('2452441064', 'Faisal Karim', '1996-01-02', 'Chattogram'),
('40411895579906593', 'Lamia Noor', '1999-07-22', 'Chattogram'),
('6846450604', 'Hridoy Das', '1991-05-24', 'Chattogram'),
('5659085380', 'Priya Sen', '1977-03-20', 'Chattogram'),
('20285940692566636', 'Jubayer Alam', '1984-03-06', 'Cox''s Bazar'),
('1886423004876', 'Rumana Parvin', '1986-06-05', 'Gazipur'),
('2280845850', 'Nayeem Sheikh', '1970-11-08', 'Rangpur'),
('1382653845', 'Sabrina Yasmin', '1982-06-12', 'Rangpur'),
('8879432627058', 'Mahfuz Kabir', '1996-01-21', 'Cumilla'),
('2458421083', 'Orpita Roy', '1989-10-02', 'Barishal'),
('78828112658440932', 'Emon Talukder', '1988-05-18', 'Rajshahi'),
('6263097658280', 'Dilruba Khatun', '1981-06-18', 'Cumilla');