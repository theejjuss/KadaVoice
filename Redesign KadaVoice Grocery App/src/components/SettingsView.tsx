import { FormEvent, useEffect, useState } from "react";
import { API_BASE } from "../types";
import { Icon } from "./Icon";

export function SettingsView() {
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [gstin, setGstin] = useState("");
  const [invoiceFooter, setInvoiceFooter] = useState("");
  const [defaultVoice, setDefaultVoice] = useState("Ambuja");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setShopName(s.shop_name || "KadaVoice Supermarket");
        setShopPhone(s.shop_phone || "+91 98470 12345");
        setShopAddress(s.shop_address || "Alappuzha, Kerala");
        setTaxRate(s.tax_rate != null ? String(s.tax_rate) : "0");
        setGstin(s.gstin || "");
        setInvoiceFooter(s.invoice_footer || "Thank you for shopping with your local Kada! Visit again.");
        setDefaultVoice(s.default_voice || "Ambuja");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: shopName.trim(),
          shop_phone: shopPhone.trim(),
          shop_address: shopAddress.trim(),
          tax_rate: Number(taxRate) || 0,
          gstin: gstin.trim(),
          invoice_footer: invoiceFooter.trim(),
          default_voice: defaultVoice,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setStatusMessage("Settings updated successfully!");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell simple-page">
        <section className="panel" style={{ padding: "40px", textAlign: "center" }}>
          Loading shop settings...
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">STORE CONFIGURATION</span>
          <h1>Shop Details & Voice Settings</h1>
          <p>Customize your shop brand name, receipt headers, tax rates, and default confirmation voice.</p>
        </div>
      </div>

      <section className="panel" style={{ maxWidth: "680px", padding: "28px" }}>
        {statusMessage && (
          <div
            style={{
              padding: "10px 14px",
              background: statusMessage.includes("success") ? "#dcfce7" : "#fee2e2",
              color: statusMessage.includes("success") ? "#15803d" : "#991b1b",
              borderRadius: "8px",
              marginBottom: "18px",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
              Shop Name (appears on print invoices and receipts)
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                Phone Number
              </label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="Optional GSTIN"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
              Shop Address / Location
            </label>
            <input
              type="text"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                Applicable Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                Default Confirmation Voice
              </label>
              <select
                value={defaultVoice}
                onChange={(e) => setDefaultVoice(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              >
                <option value="Ambuja">Ambuja (Feminine)</option>
                <option value="Deepak">Deepak (Masculine)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
              Invoice & Thermal Receipt Footer Note
            </label>
            <textarea
              rows={2}
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </div>

          <button
            type="submit"
            className="button primary"
            disabled={saving}
            style={{ marginTop: "12px", justifySelf: "start" }}
          >
            <Icon name="check" size={16} /> {saving ? "Saving Changes..." : "Save Shop Settings"}
          </button>
        </form>
      </section>
    </main>
  );
}
