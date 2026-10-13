-- SQL to create database, table, and insert 10 sample sugarcane farmers for Sanjivani Sugar Factory
-- You can run this in pgAdmin (Query Tool)

CREATE TABLE IF NOT EXISTS farmers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    sugarcane_supply_tons NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_pending NUMERIC(12, 2) NOT NULL,
    factory_name VARCHAR(100) DEFAULT 'Sanjivani Sugar Factory'
);

-- Clean existing sample data (if re-running)
TRUNCATE TABLE farmers RESTART IDENTITY;

-- Insert 10 farmers data
INSERT INTO farmers (name, village, sugarcane_supply_tons, amount_paid, payment_pending) VALUES
('Ramesh Patil', 'Kopargaon', 120.50, 300000.00, 61500.00),
('Suresh Deshmukh', 'Kolpewadi', 95.00, 250000.00, 35000.00),
('Dnyaneshwar Shinde', 'Puntamba', 150.25, 400000.00, 50750.00),
('Tukaram Pawar', 'Shirdi', 80.00, 200000.00, 40000.00),
('Babasaheb Kale', 'Rahata', 210.00, 550000.00, 80000.00),
('Sanjay Jadhav', 'Pohegaon', 115.75, 300000.00, 47250.00),
('Ashok Ghadge', 'Yesgaon', 70.00, 180000.00, 30000.00),
('Vitthal Thorat', 'Chande', 185.50, 480000.00, 76500.00),
('Eknath Jagtap', 'Savalyavihar', 130.00, 350000.00, 40000.00),
('Balasaheb Vikhe', 'Shirasgaon', 160.00, 420000.00, 60000.00);

