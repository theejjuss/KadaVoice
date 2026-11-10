
import sqlite3
from pathlib import Path
from datetime import datetime


# =====================================================
# DATABASE CONFIGURATION
# =====================================================

DB_NAME = Path(__file__).resolve().parent / "kadavoice.db"


def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# =====================================================
# ALIAS NORMALIZATION
# =====================================================

def normalize_alias(alias):
    """
    Normalize aliases to avoid duplicate entries
    caused by case and whitespace differences.
    """
    return " ".join(alias.casefold().strip().split())


def insert_product_aliases(conn, product_id, aliases):
    """
    Insert unique aliases for a product.
    Duplicate normalized aliases within the same
    product are removed before insertion.
    """

    unique_aliases = {}

    for alias in aliases:

        if not alias or not alias.strip():
            continue

        original = alias.strip()
        normalized = normalize_alias(original)

        unique_aliases[normalized] = original

    for normalized, original in unique_aliases.items():

        conn.execute("""
            INSERT OR IGNORE INTO product_aliases (
                product_id,
                alias,
                normalized_alias
            )
            VALUES (?, ?, ?)
        """, (
            product_id,
            original,
            normalized
        ))


# =====================================================
# CREATE TABLES AND MIGRATIONS
# =====================================================

def create_tables():

    with get_connection() as conn:

        # Orders
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL
                    DEFAULT 'Walk-in Customer',
                created_at TEXT NOT NULL
            )
        """)

        # Order items
        conn.execute("""
            CREATE TABLE IF NOT EXISTS order_items (
                item_id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                FOREIGN KEY(order_id)
                    REFERENCES orders(order_id)
            )
        """)

        # Product catalogue
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                malayalam_name TEXT,
                category TEXT,
                default_unit TEXT NOT NULL DEFAULT 'piece',
                price REAL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)

        # Product aliases
        conn.execute("""
            CREATE TABLE IF NOT EXISTS product_aliases (
                alias_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                alias TEXT NOT NULL,
                normalized_alias TEXT NOT NULL UNIQUE,
                FOREIGN KEY(product_id)
                    REFERENCES products(product_id)
                    ON DELETE CASCADE
            )
        """)

        # Customers directory
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                created_at TEXT NOT NULL,
                notes TEXT
            )
        """)

        # Shop Settings (key-value store)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS shop_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        # Safely migrate existing order_items table
        existing_order_item_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(order_items)").fetchall()
        }

        if "product_id" not in existing_order_item_cols:
            conn.execute("ALTER TABLE order_items ADD COLUMN product_id INTEGER")
        if "unit_price" not in existing_order_item_cols:
            conn.execute("ALTER TABLE order_items ADD COLUMN unit_price REAL")
        if "line_total" not in existing_order_item_cols:
            conn.execute("ALTER TABLE order_items ADD COLUMN line_total REAL")

        # Safely migrate existing orders table
        existing_order_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(orders)").fetchall()
        }

        if "status" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
        if "payment_method" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'")
        if "payment_status" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'")
        if "discount" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0.0")
        if "tax" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN tax REAL NOT NULL DEFAULT 0.0")
        if "total_amount" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN total_amount REAL")
        if "notes" not in existing_order_cols:
            conn.execute("ALTER TABLE orders ADD COLUMN notes TEXT")

        # Safely migrate existing products table
        existing_prod_cols = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(products)").fetchall()
        }

        if "stock_quantity" not in existing_prod_cols:
            conn.execute("ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 100")
        if "image_url" not in existing_prod_cols:
            conn.execute("ALTER TABLE products ADD COLUMN image_url TEXT")

        # Seed default shop settings if empty
        default_settings = {
            "shop_name": "KadaVoice Supermarket",
            "shop_tagline": "നാടൻ പലചരക്ക് • Fresh Groceries Everyday",
            "shop_phone": "+91 98470 12345",
            "shop_address": "Main Road, Alappuzha, Kerala - 688001",
            "tax_rate": "0",
            "currency": "INR",
            "currency_symbol": "₹",
            "default_voice": "Ambuja",
            "invoice_footer": "Thank you for shopping with your local Kada! Visit again."
        }

        for key, val in default_settings.items():
            conn.execute("""
                INSERT OR IGNORE INTO shop_settings (key, value)
                VALUES (?, ?)
            """, (key, val))


# =====================================================
# ADD PRODUCT
# =====================================================

def add_product(
    name,
    malayalam_name="",
    category="General",
    default_unit="piece",
    price=None,
    stock_quantity=100,
    image_url="",
    aliases=None
):

    aliases = aliases or []
    name = name.strip()

    if not name:
        raise ValueError("Product name cannot be empty.")

    if price is not None and float(price) < 0:
        raise ValueError("Product price cannot be negative.")

    with get_connection() as conn:

        cursor = conn.execute("""
            INSERT INTO products (
                name,
                malayalam_name,
                category,
                default_unit,
                price,
                stock_quantity,
                image_url,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name,
            malayalam_name.strip(),
            category,
            default_unit,
            price,
            int(stock_quantity or 100),
            image_url or "",
            datetime.now().isoformat(timespec="seconds")
        ))

        product_id = cursor.lastrowid

        all_aliases = [
            name,
            malayalam_name,
            *aliases
        ]

        insert_product_aliases(
            conn,
            product_id,
            all_aliases
        )

        return product_id


# =====================================================
# GET PRODUCTS
# =====================================================

def get_products(active_only=False):

    with get_connection() as conn:

        query = "SELECT * FROM products"

        if active_only:
            query += " WHERE is_active = 1"

        query += " ORDER BY name"

        rows = conn.execute(query).fetchall()

        return [dict(row) for row in rows]


# =====================================================
# GET PRODUCT CATALOGUE WITH ALIASES
# =====================================================

def get_product_catalogue():

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT
                p.*,
                GROUP_CONCAT(a.alias, '|') AS aliases
            FROM products p
            LEFT JOIN product_aliases a
                ON p.product_id = a.product_id
            WHERE p.is_active = 1
            GROUP BY p.product_id
            ORDER BY p.name
        """).fetchall()

        return [dict(row) for row in rows]


# =====================================================
# UPDATE PRODUCT
# =====================================================

def update_product(
    product_id,
    name,
    malayalam_name,
    category,
    default_unit,
    price,
    aliases,
    stock_quantity=100,
    image_url=""
):

    name = name.strip()

    if not name:
        raise ValueError("Product name cannot be empty.")

    if price is not None and float(price) < 0:
        raise ValueError("Product price cannot be negative.")

    with get_connection() as conn:

        existing = conn.execute("""
            SELECT product_id
            FROM products
            WHERE product_id = ?
        """, (product_id,)).fetchone()

        if not existing:
            raise ValueError("Product not found.")

        conn.execute("""
            UPDATE products
            SET name = ?,
                malayalam_name = ?,
                category = ?,
                default_unit = ?,
                price = ?,
                stock_quantity = ?,
                image_url = ?
            WHERE product_id = ?
        """, (
            name,
            malayalam_name.strip(),
            category,
            default_unit,
            price,
            int(stock_quantity or 100),
            image_url or "",
            product_id
        ))

        # Replace the old aliases
        conn.execute("""
            DELETE FROM product_aliases
            WHERE product_id = ?
        """, (product_id,))

        all_aliases = [
            name,
            malayalam_name,
            *(aliases or [])
        ]

        insert_product_aliases(
            conn,
            product_id,
            all_aliases
        )


# =====================================================
# DEACTIVATE PRODUCT
# =====================================================

def deactivate_product(product_id):

    with get_connection() as conn:

        conn.execute("""
            UPDATE products
            SET is_active = 0
            WHERE product_id = ?
        """, (product_id,))


def activate_product(product_id):

    with get_connection() as conn:

        conn.execute("""
            UPDATE products
            SET is_active = 1
            WHERE product_id = ?
        """, (product_id,))


def delete_product(product_id):
    """
    Safely delete or deactivate a product:
    If referenced by order_items, deactivate; otherwise delete.
    """
    with get_connection() as conn:
        referenced = conn.execute("""
            SELECT COUNT(*) FROM order_items WHERE product_id = ?
        """, (product_id,)).fetchone()[0]

        if referenced > 0:
            conn.execute("UPDATE products SET is_active = 0 WHERE product_id = ?", (product_id,))
            return False  # Deactivated
        else:
            conn.execute("DELETE FROM product_aliases WHERE product_id = ?", (product_id,))
            conn.execute("DELETE FROM products WHERE product_id = ?", (product_id,))
            return True  # Deleted


# =====================================================
# GET PRODUCT ALIASES
# =====================================================

def get_product_aliases():

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT
                a.alias,
                a.normalized_alias,
                p.product_id,
                p.name,
                p.default_unit,
                p.price
            FROM product_aliases a
            JOIN products p
                ON p.product_id = a.product_id
            WHERE p.is_active = 1
            ORDER BY LENGTH(a.normalized_alias) DESC
        """).fetchall()

        return [dict(row) for row in rows]


# =====================================================
# SAVE ORDER (TRANSACTIONAL & COMPREHENSIVE)
# =====================================================

def save_order(
    items,
    customer_name="Walk-in Customer",
    customer_phone="",
    payment_method="cash",
    payment_status="pending",
    discount=0.0,
    tax=0.0,
    notes=""
):

    if not items:
        raise ValueError("Cannot save an empty order.")

    customer_name = (customer_name or "").strip() or "Walk-in Customer"

    with get_connection() as conn:

        # Calculate line totals & grand total
        computed_items = []
        subtotal = 0.0
        all_prices_known = True

        for item in items:
            product = str(item.get("product", "")).strip()
            quantity = float(item["quantity"])
            unit = str(item["unit"]).strip()

            if not product or not unit or quantity <= 0:
                raise ValueError("Invalid order item.")

            unit_price = item.get("unit_price")
            line_total = None

            if unit_price is not None:
                unit_price = float(unit_price)
                if unit_price < 0:
                    raise ValueError("Invalid product price.")
                line_total = round(quantity * unit_price, 2)
                subtotal += line_total
            else:
                all_prices_known = False

            computed_items.append({
                "product_id": item.get("product_id"),
                "product": product,
                "quantity": quantity,
                "unit": unit,
                "unit_price": unit_price,
                "line_total": line_total
            })

        grand_total = round(subtotal - float(discount or 0.0) + float(tax or 0.0), 2) if all_prices_known else None

        # Insert Order header
        cursor = conn.execute("""
            INSERT INTO orders (
                customer_name,
                created_at,
                status,
                payment_method,
                payment_status,
                discount,
                tax,
                total_amount,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            customer_name,
            datetime.now().isoformat(timespec="seconds"),
            "pending",
            payment_method or "cash",
            payment_status or "pending",
            float(discount or 0.0),
            float(tax or 0.0),
            grand_total,
            notes or ""
        ))

        order_id = cursor.lastrowid

        # Insert items and decrement stock
        for item in computed_items:
            conn.execute("""
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product,
                    quantity,
                    unit,
                    unit_price,
                    line_total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                item["product_id"],
                item["product"],
                item["quantity"],
                item["unit"],
                item["unit_price"],
                item["line_total"]
            ))

            # Decrement product stock if matched to product_id
            if item["product_id"]:
                conn.execute("""
                    UPDATE products
                    SET stock_quantity = MAX(0, stock_quantity - ?)
                    WHERE product_id = ?
                """, (item["quantity"], item["product_id"]))

        # Upsert customer profile if real customer
        if customer_name and customer_name.lower() != "walk-in customer":
            existing_cust = conn.execute("""
                SELECT customer_id FROM customers WHERE LOWER(name) = LOWER(?)
            """, (customer_name,)).fetchone()

            if existing_cust:
                if customer_phone:
                    conn.execute("""
                        UPDATE customers SET phone = ? WHERE customer_id = ?
                    """, (customer_phone, existing_cust["customer_id"]))
            else:
                conn.execute("""
                    INSERT INTO customers (name, phone, created_at, notes)
                    VALUES (?, ?, ?, ?)
                """, (
                    customer_name,
                    customer_phone or "",
                    datetime.now().isoformat(timespec="seconds"),
                    "Registered via KadaVoice order"
                ))

        return order_id


# =====================================================
# GET ALL ORDERS
# =====================================================

def get_orders():

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT
                o.order_id,
                o.customer_name,
                o.created_at,
                o.status,
                o.payment_method,
                o.payment_status,
                o.discount,
                o.tax,
                o.total_amount,
                o.notes,
                oi.item_id,
                oi.product,
                oi.quantity,
                oi.unit,
                oi.unit_price,
                oi.line_total
            FROM orders o
            JOIN order_items oi
                ON o.order_id = oi.order_id
            ORDER BY o.order_id DESC, oi.item_id
        """).fetchall()

        return [dict(row) for row in rows]


# =====================================================
# GET SINGLE ORDER / INVOICE
# =====================================================

def get_order_by_id(order_id):

    with get_connection() as conn:

        order = conn.execute("""
            SELECT *
            FROM orders
            WHERE order_id = ?
        """, (order_id,)).fetchone()

        if not order:
            return None

        items = conn.execute("""
            SELECT *
            FROM order_items
            WHERE order_id = ?
            ORDER BY item_id
        """, (order_id,)).fetchall()

        return {
            "order": dict(order),
            "items": [dict(item) for item in items]
        }


# =====================================================
# UPDATE ORDER STATUS & PAYMENT
# =====================================================

def update_order_status(order_id, status=None, payment_status=None, payment_method=None, notes=None, customer_name=None):
    with get_connection() as conn:
        updates = []
        params = []
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if payment_status is not None:
            updates.append("payment_status = ?")
            params.append(payment_status)
        if payment_method is not None:
            updates.append("payment_method = ?")
            params.append(payment_method)
        if notes is not None:
            updates.append("notes = ?")
            params.append(notes)
        if customer_name is not None:
            name_val = customer_name.strip() or "Walk-in Customer"
            updates.append("customer_name = ?")
            params.append(name_val)

        if not updates:
            return False

        params.append(order_id)
        conn.execute(f"UPDATE orders SET {', '.join(updates)} WHERE order_id = ?", params)
        return True


# =====================================================
# CUSTOMER MANAGEMENT
# =====================================================

def get_customers(search=""):
    with get_connection() as conn:
        query = """
            SELECT
                c.customer_id,
                c.name,
                c.phone,
                c.created_at,
                c.notes,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_spent,
                MAX(o.created_at) AS last_order_date
            FROM customers c
            LEFT JOIN orders o ON LOWER(o.customer_name) = LOWER(c.name)
        """
        params = []
        if search:
            query += " WHERE LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ?"
            params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])

        query += " GROUP BY c.customer_id ORDER BY total_spent DESC, c.name ASC"

        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def upsert_customer(name, phone="", notes=""):
    name = (name or "").strip()
    if not name:
        raise ValueError("Customer name cannot be empty.")

    with get_connection() as conn:
        existing = conn.execute("""
            SELECT customer_id FROM customers WHERE LOWER(name) = LOWER(?)
        """, (name,)).fetchone()

        if existing:
            conn.execute("""
                UPDATE customers
                SET phone = COALESCE(NULLIF(?, ''), phone),
                    notes = COALESCE(NULLIF(?, ''), notes)
                WHERE customer_id = ?
            """, (phone, notes, existing["customer_id"]))
            return existing["customer_id"]
        else:
            cursor = conn.execute("""
                INSERT INTO customers (name, phone, created_at, notes)
                VALUES (?, ?, ?, ?)
            """, (name, phone, datetime.now().isoformat(timespec="seconds"), notes))
            return cursor.lastrowid


def get_orders_by_customer(customer_name):

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT
                o.order_id,
                o.customer_name,
                o.created_at,
                o.status,
                o.payment_status,
                o.total_amount,
                oi.product,
                oi.quantity,
                oi.unit,
                oi.unit_price,
                oi.line_total
            FROM orders o
            JOIN order_items oi
                ON o.order_id = oi.order_id
            WHERE LOWER(o.customer_name) = LOWER(?)
            ORDER BY o.order_id DESC, oi.item_id
        """, (customer_name.strip(),)).fetchall()

        return [dict(row) for row in rows]


# =====================================================
# DASHBOARD ANALYTICS & STATS
# =====================================================

def get_dashboard_stats():
    today_prefix = datetime.now().strftime("%Y-%m-%d")

    with get_connection() as conn:
        # Total counts
        total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]

        today_orders = conn.execute("""
            SELECT COUNT(*) FROM orders WHERE created_at LIKE ?
        """, (f"{today_prefix}%",)).fetchone()[0]

        today_sales = conn.execute("""
            SELECT COALESCE(SUM(line_total), 0)
            FROM order_items oi
            JOIN orders o ON o.order_id = oi.order_id
            WHERE o.created_at LIKE ?
        """, (f"{today_prefix}%",)).fetchone()[0]

        total_revenue = conn.execute("""
            SELECT COALESCE(SUM(line_total), 0) FROM order_items
        """).fetchone()[0]

        pending_orders = conn.execute("""
            SELECT COUNT(*) FROM orders WHERE status = 'pending'
        """).fetchone()[0]

        completed_orders = conn.execute("""
            SELECT COUNT(*) FROM orders WHERE status = 'completed'
        """).fetchone()[0]

        total_customers = conn.execute("""
            SELECT COUNT(DISTINCT customer_name) FROM orders
        """).fetchone()[0]

        # Top 5 selling products
        top_products = conn.execute("""
            SELECT
                product,
                unit,
                SUM(quantity) AS total_quantity,
                COALESCE(SUM(line_total), 0) AS total_amount,
                COUNT(DISTINCT order_id) as order_count
            FROM order_items
            GROUP BY product, unit
            ORDER BY total_quantity DESC
            LIMIT 5
        """).fetchall()

        # Recent 5 orders
        recent_orders = conn.execute("""
            SELECT
                order_id,
                customer_name,
                created_at,
                status,
                payment_status,
                total_amount
            FROM orders
            ORDER BY order_id DESC
            LIMIT 5
        """).fetchall()

        return {
            "total_orders": total_orders,
            "today_orders": today_orders,
            "today_sales": round(today_sales, 2),
            "total_revenue": round(total_revenue, 2),
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "total_customers": total_customers,
            "top_products": [dict(r) for r in top_products],
            "recent_orders": [dict(r) for r in recent_orders]
        }


# =====================================================
# SHOP SETTINGS
# =====================================================

def get_shop_settings():
    with get_connection() as conn:
        rows = conn.execute("SELECT key, value FROM shop_settings").fetchall()
        return {r["key"]: r["value"] for r in rows}


def update_shop_settings(settings: dict):
    with get_connection() as conn:
        for k, v in settings.items():
            conn.execute("""
                INSERT INTO shop_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (str(k), str(v)))


# =====================================================
# SALES REPORTS
# =====================================================

def get_sales_report(start_date=None, end_date=None):
    with get_connection() as conn:
        query = """
            SELECT
                DATE(o.created_at) AS date,
                COUNT(DISTINCT o.order_id) AS order_count,
                COALESCE(SUM(oi.line_total), 0) AS total_sales,
                COUNT(oi.item_id) AS items_sold
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
        """
        params = []
        conditions = []

        if start_date:
            conditions.append("DATE(o.created_at) >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("DATE(o.created_at) <= ?")
            params.append(end_date)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " GROUP BY DATE(o.created_at) ORDER BY date DESC"

        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]

