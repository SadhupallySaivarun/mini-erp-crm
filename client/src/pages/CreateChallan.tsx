import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { customerService } from "../services/customer.service";
import { productService } from "../services/product.service";
import { challanService } from "../services/challan.service";
import { Customer, Product } from "../types";
import { Loader } from "../components/Loader";
import { formatCurrency } from "../utils/formatters";
import { getErrorMessage } from "../services/api";

interface LineItem {
  productId: string;
  quantity: number;
}

export function CreateChallan() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);

  useEffect(() => {
    async function load() {
      try {
        const [customerRes, productRes] = await Promise.all([
          customerService.list({ limit: 100 }),
          productService.list({ limit: 100 }),
        ]);
        setCustomers(customerRes.data);
        setProducts(productRes.data);
        if (customerRes.data.length > 0) setCustomerId(customerRes.data[0].id);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addLine() {
    setItems((prev) => [...prev, { productId: products[0]?.id ?? "", quantity: 1 }]);
  }

  function removeLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productFor(productId: string) {
    return products.find((p) => p.id === productId);
  }

  const validItems = items.filter((i) => i.productId && i.quantity > 0);
  const total = validItems.reduce((sum, i) => {
    const p = productFor(i.productId);
    return sum + (p ? Number(p.unitPrice) * i.quantity : 0);
  }, 0);

  async function handleSubmit(status: "DRAFT" | "CONFIRMED") {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (validItems.length === 0) {
      toast.error("Add at least one product line with a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const challan = await challanService.create({
        customerId,
        items: validItems,
        status,
      });
      toast.success(status === "CONFIRMED" ? "Challan created and confirmed" : "Challan saved as draft");
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Loader label="Loading form..." />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Sales Challan</h1>
        <p className="text-sm text-gray-500">Select a customer, add products, and save as draft or confirm</p>
      </div>

      <div className="card p-5">
        <label className="label">Customer *</label>
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.length === 0 && <option value="">No customers available — add one first</option>}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.mobile}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Products</h2>
          <button onClick={addLine} className="btn-secondary text-sm">
            + Add Line
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const product = productFor(item.productId);
            const insufficient = product ? item.quantity > product.currentStock : false;
            return (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-gray-100 rounded-lg p-3">
                <select
                  className="input sm:flex-1"
                  value={item.productId}
                  onChange={(e) => updateItem(index, { productId: e.target.value })}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Stock: {p.currentStock} — {formatCurrency(p.unitPrice)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input sm:w-28"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
                <button
                  onClick={() => removeLine(index)}
                  className="text-sm text-red-600 hover:underline whitespace-nowrap"
                  disabled={items.length === 1}
                >
                  Remove
                </button>
                {insufficient && (
                  <p className="text-xs text-red-600 sm:ml-2">Insufficient stock!</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <p className="text-lg font-semibold text-gray-900">Total: {formatCurrency(total)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate("/challans")} className="btn-secondary">
          Cancel
        </button>
        <button onClick={() => handleSubmit("DRAFT")} disabled={isSubmitting} className="btn-secondary">
          Save as Draft
        </button>
        <button onClick={() => handleSubmit("CONFIRMED")} disabled={isSubmitting} className="btn-primary">
          Save & Confirm
        </button>
      </div>
    </div>
  );
}
