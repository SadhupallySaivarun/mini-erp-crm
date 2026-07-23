import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { productService } from "../services/product.service";
import { Product, PaginationMeta } from "../types";
import { Loader } from "../components/Loader";
import { Pagination } from "../components/Pagination";
import { Modal } from "../components/Modal";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "",
  minStockAlert: "",
  location: "",
};

export function Products() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const res = await productService.list({ page, limit: 10, search: search || undefined });
      setProducts(res.data);
      setMeta(res.meta);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    loadProducts();
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category ?? "",
      unitPrice: String(p.unitPrice),
      currentStock: String(p.currentStock),
      minStockAlert: String(p.minStockAlert),
      location: p.location ?? "",
    });
    setIsModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || undefined,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock),
        minStockAlert: Number(form.minStockAlert),
        location: form.location || undefined,
      };
      if (editingId) {
        await productService.update(editingId, payload);
        toast.success("Product updated");
      } else {
        await productService.create(payload);
        toast.success("Product created");
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await productService.delete(id);
      toast.success("Product deleted");
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your product catalog</p>
        </div>
        {canManage && (
          <button onClick={openCreateModal} className="btn-primary">
            + Add Product
          </button>
        )}
      </div>

      <form onSubmit={handleSearchSubmit} className="card p-4 flex gap-2">
        <input
          className="input"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-gray-900">{p.name}</td>
                      <td>{p.sku}</td>
                      <td>{p.category || "—"}</td>
                      <td>{formatCurrency(p.unitPrice)}</td>
                      <td>
                        <span className={isLow ? "text-red-600 font-semibold" : ""}>
                          {p.currentStock}
                        </span>
                        <span className="text-gray-400"> / min {p.minStockAlert}</span>
                        {isLow && <span className="badge bg-red-100 text-red-700 ml-2">Low</span>}
                      </td>
                      <td>{p.location || "—"}</td>
                      <td className="text-right space-x-2 whitespace-nowrap">
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              className="text-sm text-primary-600 hover:underline"
                            >
                              Edit
                            </button>
                            {user?.role === "ADMIN" && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal title={editingId ? "Edit Product" : "Add Product"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">SKU / Code *</label>
              <input
                required
                className="input"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Unit Price *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Current Stock *</label>
              <input
                required
                type="number"
                min="0"
                className="input"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Min Stock Alert *</label>
              <input
                required
                type="number"
                min="0"
                className="input"
                value={form.minStockAlert}
                onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location / Warehouse</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
