import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { productService, inventoryService } from "../services/product.service";
import { Product, StockMovement } from "../types";
import { Loader } from "../components/Loader";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../utils/formatters";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", movementType: "IN" as "IN" | "OUT", reason: "" });
  const [isSaving, setIsSaving] = useState(false);

  async function loadProducts() {
    setIsLoadingProducts(true);
    try {
      const res = await productService.list({ limit: 100 });
      setProducts(res.data);
      if (res.data.length > 0) setSelectedProductId(res.data[0].id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function loadMovements(productId: string) {
    if (!productId) return;
    setIsLoadingMovements(true);
    try {
      const data = await inventoryService.listMovements(productId);
      setMovements(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoadingMovements(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) loadMovements(selectedProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  function openMovementModal() {
    setForm({ productId: selectedProductId, quantity: "", movementType: "IN", reason: "" });
    setIsModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await inventoryService.recordMovement({
        productId: form.productId,
        quantity: Number(form.quantity),
        movementType: form.movementType,
        reason: form.reason,
      });
      toast.success("Stock movement recorded");
      setIsModalOpen(false);
      loadProducts();
      loadMovements(form.productId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Stock movement logs per product</p>
        </div>
        {canManage && (
          <button onClick={openMovementModal} className="btn-primary">
            + Record Movement
          </button>
        )}
      </div>

      {isLoadingProducts ? (
        <Loader />
      ) : (
        <div className="card p-4">
          <label className="label">Select Product</label>
          <select
            className="input sm:w-96"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Stock: {p.currentStock}
              </option>
            ))}
          </select>
          {selectedProduct && selectedProduct.currentStock <= selectedProduct.minStockAlert && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              ⚠ Low stock: {selectedProduct.currentStock} remaining (min alert: {selectedProduct.minStockAlert})
            </p>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Movement Log</h2>
        </div>
        {isLoadingMovements ? (
          <Loader />
        ) : movements.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No stock movements recorded for this product.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <StatusBadge status={m.movementType} />
                  </td>
                  <td>{m.quantity}</td>
                  <td>{m.reason}</td>
                  <td>{m.createdBy.name}</td>
                  <td>{formatDateTime(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title="Record Stock Movement" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Product *</label>
            <select
              required
              className="input"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock: {p.currentStock}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Movement Type *</label>
              <select
                className="input"
                value={form.movementType}
                onChange={(e) => setForm({ ...form, movementType: e.target.value as "IN" | "OUT" })}
              >
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input
                required
                type="number"
                min="1"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Reason *</label>
            <input
              required
              className="input"
              placeholder="e.g. New stock arrival, damaged goods, stock correction..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
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
