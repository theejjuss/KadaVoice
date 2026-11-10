import { FormEvent, useEffect, useState } from "react";
import { API_BASE, Product } from "../types";
import { Icon } from "./Icon";

export function CatalogueView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formMalayalam, setFormMalayalam] = useState("");
  const [formCategory, setFormCategory] = useState("Groceries");
  const [formUnit, setFormUnit] = useState("kg");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("100");
  const [formAliases, setFormAliases] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message || "Failed to load product catalogue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormMalayalam("");
    setFormCategory("Groceries");
    setFormUnit("kg");
    setFormPrice("");
    setFormStock("100");
    setFormAliases("");
    setShowAddModal(true);
    setFeedback("");
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormMalayalam(prod.malayalam_name || "");
    setFormCategory(prod.category || "Groceries");
    setFormUnit(prod.default_unit || "kg");
    setFormPrice(prod.price != null ? String(prod.price) : "");
    setFormStock(String(prod.stock_quantity ?? 100));
    setFormAliases((prod.aliases || []).join(", "));
    setShowAddModal(true);
    setFeedback("");
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback("Product name is required.");
      return;
    }

    setSubmitting(true);
    setFeedback("");

    try {
      const aliasList = formAliases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: formName.trim(),
        malayalam_name: formMalayalam.trim(),
        category: formCategory.trim() || "Groceries",
        default_unit: formUnit.trim() || "piece",
        price: formPrice ? Number(formPrice) : null,
        stock_quantity: Number(formStock) || 0,
        aliases: aliasList,
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`${API_BASE}/api/products/${editingProduct.product_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to save product.");
      }

      setShowAddModal(false);
      await loadProducts();
    } catch (err: any) {
      setFeedback(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductActive = async (prod: Product) => {
    try {
      const endpoint = prod.is_active ? "deactivate" : "activate";
      const res = await fetch(`${API_BASE}/api/products/${prod.product_id}/${endpoint}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.product_id === prod.product_id ? { ...p, is_active: !prod.is_active } : p))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.malayalam_name && p.malayalam_name.includes(term)) ||
      (p.aliases && p.aliases.some((a) => a.toLowerCase().includes(term)));
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">INVENTORY & ALIASES</span>
          <h1>Product Catalogue Management</h1>
          <p>Add and maintain products, Malayalam names, spoken aliases, prices, and stock counts.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="receipt-print" onClick={loadProducts}>
            <Icon name="refresh" size={16} /> Refresh
          </button>
          <button className="button primary" onClick={openAdd}>
            <Icon name="plus" size={16} /> Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <section className="panel" style={{ padding: "16px 20px", marginBottom: "22px" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <input
              type="text"
              placeholder="Search by product name, Malayalam or alias (e.g. soap, ari, വെളിച്ചെണ്ണ)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #dce4d9",
                fontSize: "13px",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: selectedCategory === cat ? "#14532d" : "#dce4d9",
                  background: selectedCategory === cat ? "#14532d" : "#fff",
                  color: selectedCategory === cat ? "#fff" : "#4b5563",
                  fontSize: "12px",
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product List Table */}
      {loading ? (
        <section className="panel" style={{ padding: "30px", textAlign: "center" }}>
          Loading products...
        </section>
      ) : error ? (
        <section className="panel" style={{ padding: "30px", textAlign: "center" }}>
          <h2>Error loading catalogue</h2>
          <p>{error}</p>
        </section>
      ) : filteredProducts.length === 0 ? (
        <section className="panel" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          <Icon name="bag" size={32} />
          <h3>No products match your search</h3>
          <p>Try searching for a different keyword or category.</p>
        </section>
      ) : (
        <section className="panel" style={{ padding: "20px" }}>
          <div className="invoice-table-wrap">
            <table className="invoice-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Malayalam Name</th>
                  <th>Category</th>
                  <th>Price / Unit</th>
                  <th>Stock</th>
                  <th>Aliases</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.product_id} style={{ opacity: p.is_active ? 1 : 0.6 }}>
                    <td>
                      <b>{p.name}</b>
                    </td>
                    <td style={{ color: "#14532d", fontWeight: 600 }}>{p.malayalam_name || "—"}</td>
                    <td>
                      <span
                        style={{
                          background: "#f0fdf4",
                          color: "#166534",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <strong>{p.price != null ? `₹${Number(p.price).toFixed(2)}` : "—"}</strong>{" "}
                      <small style={{ color: "#6b7280" }}>/ {p.default_unit}</small>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: (p.stock_quantity ?? 0) <= 10 ? "#dc2626" : "#1f2937",
                        }}
                      >
                        {p.stock_quantity ?? 100}
                      </span>
                    </td>
                    <td style={{ maxWidth: "220px" }}>
                      <small style={{ color: "#4b5563", display: "inline-block" }}>
                        {(p.aliases || []).slice(0, 3).join(", ")}
                        {(p.aliases || []).length > 3 && ` +${p.aliases.length - 3}`}
                      </small>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: p.is_active ? "#dcfce7" : "#f3f4f6",
                          color: p.is_active ? "#15803d" : "#6b7280",
                        }}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="receipt-print"
                        style={{ padding: "4px 8px", marginRight: "6px", fontSize: "11px" }}
                        onClick={() => openEdit(p)}
                      >
                        <Icon name="edit" size={13} /> Edit
                      </button>
                      <button
                        className="receipt-print"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => toggleProductActive(p)}
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "14px", fontSize: "12px", color: "#6b7280" }}>
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </section>
      )}

      {/* Add / Edit Product Modal */}
      {showAddModal && (
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
              maxWidth: "520px",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#14532d" }}>
                {editingProduct ? `Edit ${editingProduct.name}` : "Add New Grocery Product"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {feedback && (
              <div style={{ padding: "8px 12px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", marginBottom: "12px", fontSize: "12px" }}>
                {feedback}
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bathing Soap, Matta Rice"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Malayalam Script Name
                  </label>
                  <input
                    type="text"
                    value={formMalayalam}
                    onChange={(e) => setFormMalayalam(e.target.value)}
                    placeholder="e.g. സോപ്പ്, മട്ട അരി"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Grains, Essentials"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Default Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  >
                    <option value="kg">kg</option>
                    <option value="packet">packet</option>
                    <option value="litre">litre</option>
                    <option value="piece">piece</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 45.00"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Speech Recognition Aliases (comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={formAliases}
                  onChange={(e) => setFormAliases(e.target.value)}
                  placeholder="e.g. soap, soaps, soappu, കുളിക്കുന്ന സോപ്പ്"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "12px" }}
                />
                <small style={{ color: "#6b7280" }}>
                  Include Manglish variations and Malayalam colloquial words to improve voice matching.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="receipt-print"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
