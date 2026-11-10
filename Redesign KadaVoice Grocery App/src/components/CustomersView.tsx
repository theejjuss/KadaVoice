import { useEffect, useState } from "react";
import { API_BASE, View } from "../types";
import { Icon } from "./Icon";

export function CustomersView({
  onSelectCustomer,
}: {
  onSelectCustomer: (name: string, phone: string) => void;
}) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/customers`);
      if (!res.ok) throw new Error("Failed to load customer list");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomerOrders = async (cust: any) => {
    setSelectedCustomer(cust);
    try {
      setOrdersLoading(true);
      const res = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(cust.name)}/orders`);
      if (res.ok) {
        const data = await res.json();
        setCustomerOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase().trim();
    return (
      !term ||
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term))
    );
  });

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">SHOPPER DIRECTORY</span>
          <h1>Customer Management</h1>
          <p>Profiles, order frequency, total spending, and quick repeat ordering for local patrons.</p>
        </div>
        <button className="receipt-print" onClick={fetchCustomers}>
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </div>

      <section className="panel" style={{ padding: "16px 20px", marginBottom: "22px" }}>
        <input
          type="text"
          placeholder="Search by customer name or phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #dce4d9",
            fontSize: "13px",
          }}
        />
      </section>

      {loading ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
          Loading customers...
        </section>
      ) : error ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Error loading customers</h2>
          <p>{error}</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          <Icon name="user" size={32} />
          <h3>No customers found</h3>
          <p>Customers are automatically saved when you confirm voice orders with customer names.</p>
        </section>
      ) : (
        <section className="panel" style={{ padding: "20px" }}>
          <div className="invoice-table-wrap">
            <table className="invoice-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Orders Count</th>
                  <th>Total Spent</th>
                  <th>First Added</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.customer_id || c.name}>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td style={{ color: "#4b5563" }}>{c.phone || "—"}</td>
                    <td>
                      <span
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        {c.total_orders || 0} orders
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#14532d" }}>
                      ₹{Number(c.total_spent || 0).toFixed(2)}
                    </td>
                    <td style={{ color: "#6b7280", fontSize: "11px" }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="receipt-print"
                        style={{ padding: "4px 8px", marginRight: "6px", fontSize: "11px" }}
                        onClick={() => openCustomerOrders(c)}
                      >
                        View Orders
                      </button>
                      <button
                        className="button primary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() => onSelectCustomer(c.name, c.phone || "")}
                      >
                        <Icon name="mic" size={12} /> New Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#14532d" }}>
                  Orders for {selectedCustomer.name}
                </h2>
                <small style={{ color: "#6b7280" }}>
                  Phone: {selectedCustomer.phone || "Not provided"} • Total orders: {customerOrders.length}
                </small>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {ordersLoading ? (
              <p>Loading customer history...</p>
            ) : customerOrders.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No prior orders recorded for this customer.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {customerOrders.map((ord) => (
                  <div
                    key={ord.order_id}
                    style={{
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <b>Order #{ord.order_id}</b>
                      <span style={{ fontWeight: 700, color: "#14532d" }}>
                        ₹{Number(ord.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <small style={{ color: "#6b7280", display: "block" }}>
                      {new Date(ord.created_at).toLocaleString("en-IN")} • Status: {ord.status}
                    </small>
                    <div style={{ marginTop: "6px", fontSize: "12px" }}>
                      {(ord.items || []).map((it: any, i: number) => (
                        <span key={i} style={{ marginRight: "10px", color: "#374151" }}>
                          {it.product} ({it.quantity} {it.unit})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
