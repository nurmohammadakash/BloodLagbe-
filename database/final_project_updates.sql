-- Blood-Lagbe final performance/support migration
-- Safe to run after database/schema.sql.
-- Adds indexes used by the 5 km donor search and ensures every blood bank
-- has one inventory row for each supported blood group.

CREATE INDEX idx_user_donor_geo
ON `user` (blood_group, account_status, email_verified, eligibility_status, latitude, longitude);

INSERT INTO blood_inventory (bloodbank_id, blood_group, unit_count)
SELECT b.bloodbank_id, g.blood_group, 0
FROM blood_bank b
CROSS JOIN (
    SELECT 'A+' blood_group UNION ALL SELECT 'A-' UNION ALL
    SELECT 'B+' UNION ALL SELECT 'B-' UNION ALL
    SELECT 'AB+' UNION ALL SELECT 'AB-' UNION ALL
    SELECT 'O+' UNION ALL SELECT 'O-'
) g
LEFT JOIN blood_inventory i
  ON i.bloodbank_id=b.bloodbank_id AND i.blood_group=g.blood_group
WHERE i.inventory_id IS NULL;
