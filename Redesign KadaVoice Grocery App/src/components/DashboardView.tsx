import { useEffect, useState } from "react";
import { API_BASE, View } from "../types";
import { Icon } from "./Icon";

export function DashboardView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const data = await res.json();
      setStats(data.stats || data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <main className="page-shell simple-page">
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading dashboard metrics...</p>
        </div>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="page-shell simple-page">
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <h2>Dashboard Unavailable</h2>
          <p>{error || "Could not retrieve statistics."}</p>
          <button className="button primary" onClick={fetchDashboard} style={{ marginTop: "15px" }}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  const lowStock = stats.low_stock_products || [];
  const topProducts = stats.top_products || [];

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">SHOPKEEPER OVERVIEW</span>
          <h1>Store Performance & Dashboard</h1>
          <p>Live snapshot of today's sales, active orders, and inventory status.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="receipt-print" onClick={fetchDashboard}>
            <Icon name="refresh" size={16} /> Refresh
          </button>
          <button className="button primary" onClick={() => onNavigate("order")}>
            <Icon name="mic" size={16} /> New Voice Order
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        <div className="panel" style={{ padding: "22px", borderLeft: "4px solid #14532d" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
            TODAY'S SALES
          </span>
          <h2 style={{ fontSize: "28px", margin: "8px 0 4px", color: "#14532d" }}>
            ₹{Number(stats.today_sales || 0).toFixed(2)}
          </h2>
          <small style={{ color: "#6b7280" }}>Revenue collected today</small>
        </div>

        <div className="panel" style={{ padding: "22px", borderLeft: "4px solid #22c55e" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
            TODAY'S ORDERS
          </span>
          <h2 style={{ fontSize: "28px", margin: "8px 0 4px", color: "#1f2937" }}>
            {stats.today_orders || 0}
          </h2>
          <small style={{ color: "#6b7280" }}>Orders received today</small>
        </div>

        <div className="panel" style={{ padding: "22px", borderLeft: "4px solid #eab308" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
            PENDING ORDERS
          </span>
          <h2 style={{ fontSize: "28px", margin: "8px 0 4px", color: "#b45309" }}>
            {stats.pending_orders || 0}
          </h2>
          <small style={{ color: "#6b7280" }}>Awaiting completion / dispatch</small>
        </div>

        <div className="panel" style={{ padding: "22px", borderLeft: "4px solid #3b82f6" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
            TOTAL CUSTOMERS
          </span>
          <h2 style={{ fontSize: "28px", margin: "8px 0 4px", color: "#1e40af" }}>
            {stats.total_customers || 0}
          </h2>
          <small style={{ color: "#6b7280" }}>Active shoppers on record</small>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
        {/* Top Selling Products */}
        <section className="panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#14532d" }}>Top Selling Products</h3>
              <small style={{ color: "#6b7280" }}>Most frequently ordered grocery items</small>
            </div>
            <Icon name="spark" size={18} />
          </div>

          {topProducts.length === 0 ? (
            <p style={{ color: "#6b7280", padding: "20px 0" }}>No product sales recorded yet.</p>
          ) : (
            <table className="invoice-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th style={{ textAlign: "right" }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <b>{item.name}</b>
                    </td>
                    <td>{item.total_quantity} units</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#14532d" }}>
                      ₹{Number(item.total_revenue || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#b45309" }}>Inventory Alerts</h3>
              <small style={{ color: "#6b7280" }}>Items running low in stock (≤ 10)</small>
            </div>
            <button
              className="receipt-print"
              style={{ padding: "4px 10px", fontSize: "11px" }}
              onClick={() => onNavigate("catalogue")}
            >
              Manage Stock
            </button>
          </div>

          {lowStock.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#15803d" }}>
              <Icon name="check" size={24} />
              <p style={{ margin: "6px 0 0" }}>All catalogue items have healthy stock levels!</p>
            </div>
          ) : (
            <table className="invoice-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((prod: any) => (
                  <tr key={prod.product_id}>
                    <td>
                      <b>{prod.name}</b>
                      {prod.malayalam_name && <small style={{ display: "block", color: "#6b7280" }}>{prod.malayalam_name}</small>}
                    </td>
                    <td style={{ color: "#dc2626", fontWeight: 700 }}>
                      {prod.stock_quantity} {prod.default_unit}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="receipt-print"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => onNavigate("catalogue")}
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
