-- Demo e-commerce schema for trying DataPilot against a safe local database.
-- Run this in a separate database, then connect DataPilot using a read-only role.

CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  region TEXT NOT NULL,
  signup_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','cancelled','refunded'))
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE;

INSERT INTO customers (customer_name, region, signup_date) VALUES
('Aarav Sharma','North','2025-01-12'),
('Diya Verma','West','2025-02-03'),
('Kabir Singh','North','2025-02-20'),
('Anaya Patel','South','2025-03-15'),
('Vivaan Gupta','East','2025-04-09'),
('Ira Mehta','West','2025-05-21'),
('Reyansh Kumar','South','2025-06-02'),
('Sara Khan','North','2025-07-18'),
('Advik Jain','East','2025-08-11'),
('Myra Das','West','2025-09-04');

INSERT INTO products (product_name, category, unit_price) VALUES
('Wireless Mouse','Accessories',799.00),
('Mechanical Keyboard','Accessories',2499.00),
('USB-C Hub','Accessories',1899.00),
('Laptop Stand','Workspace',1299.00),
('Monitor 27 inch','Displays',14999.00),
('Webcam HD','Accessories',3299.00),
('Desk Lamp','Workspace',1599.00),
('Noise Cancelling Headphones','Audio',6999.00);

INSERT INTO orders (customer_id, order_date, status) VALUES
(1,'2025-10-02','completed'),(2,'2025-10-05','completed'),
(3,'2025-10-12','completed'),(4,'2025-10-19','cancelled'),
(5,'2025-11-01','completed'),(6,'2025-11-03','completed'),
(7,'2025-11-08','refunded'),(8,'2025-11-12','completed'),
(9,'2025-11-15','completed'),(10,'2025-11-20','completed'),
(1,'2025-12-02','completed'),(2,'2025-12-04','completed'),
(3,'2025-12-08','completed'),(5,'2025-12-10','completed'),
(6,'2025-12-12','completed'),(8,'2025-12-15','cancelled'),
(9,'2026-01-03','completed'),(10,'2026-01-06','completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1,1,2,799),(1,4,1,1299),(2,2,1,2499),(2,3,1,1899),
(3,5,1,14999),(3,6,1,3299),(4,7,1,1599),(5,8,1,6999),
(5,1,1,799),(6,2,1,2499),(6,4,2,1299),(7,3,1,1899),
(8,5,1,14999),(8,7,1,1599),(9,6,2,3299),(10,8,1,6999),
(11,2,1,2499),(11,1,1,799),(12,5,1,14999),(12,4,1,1299),
(13,3,2,1899),(14,8,1,6999),(14,6,1,3299),(15,7,2,1599),
(16,1,1,799),(17,5,1,14999),(17,2,1,2499),(18,8,1,6999);

-- Example read-only query: revenue by month (completed orders only).
SELECT date_trunc('month', o.order_date)::date AS month,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY 1
ORDER BY 1
LIMIT 500;
