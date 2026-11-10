import { useEffect, useState } from "react";
import { API_BASE } from "../types";
import { Icon } from "./Icon";

export function ReportsView() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/reports/sales?days=${days}`);
      if (!res.ok) throw new Error("Failed to load sales report");
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load sales analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [days]);

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">SALES & REVENUE REPORT</span>
          <h1>Business Reports & Analytics</h1>
          <p>Historical sales trends, order volume, and downloadable CSV records for bookkeeping.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #dce4d9",
              background: "#fff",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={365}>Last 1 Year</option>
          </select>

          <a
            href={`${API_BASE}/api/reports/sales/csv`}
            download="kadavoice_sales_report.csv"
            className="button primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="download" size={16} /> Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
          Loading sales analytics...
        </section>
      ) : error || !reportData ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Report Error</h2>
          <p>{error || "Could not compile sales summary."}</p>
        </section>
      ) : (
        <>
          {/* Summary KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom: "28px",
            }}
          >
            <div className="panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
                TOTAL REVENUE
              </span>
              <h2 style={{ fontSize: "26px", margin: "6px 0 2px", color: "#14532d" }}>
                ₹{Number(reportData.total_revenue || 0).toFixed(2)}
              </h2>
              <small style={{ color: "#6b7280" }}>Across {reportData.total_orders || 0} orders</small>
            </div>

            <div className="panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
                TOTAL ORDERS
              </span>
              <h2 style={{ fontSize: "26px", margin: "6px 0 2px", color: "#1f2937" }}>
                {reportData.total_orders || 0}
              </h2>
              <small style={{ color: "#6b7280" }}>Recorded in this period</small>
            </div>

            <div className="panel" style={{ padding: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "1px" }}>
                AVG ORDER VALUE
              </span>
              <h2 style={{ fontSize: "26px", margin: "6px 0 2px", color: "#2563eb" }}>
                ₹
                {reportData.total_orders
                  ? (reportData.total_revenue / reportData.total_orders).toFixed(2)
                  : "0.00"}
              </h2>
              <small style={{ color: "#6b7280" }}>Per completed order</small>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <section className="panel" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", color: "#14532d" }}>Daily Breakdown</h3>
            {(reportData.daily_breakdown || []).length === 0 ? (
              <p style={{ color: "#6b7280", padding: "10px 0" }}>No daily sales recorded for this period.</p>
            ) : (
              <div className="invoice-table-wrap">
                <table className="invoice-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders Count</th>
                      <th style={{ textAlign: "right" }}>Daily Sales (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.daily_breakdown || []).map((row: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <b>{row.date}</b>
                        </td>
                        <td>{row.orders_count} orders</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#14532d" }}>
                          ₹{Number(row.daily_sales || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
