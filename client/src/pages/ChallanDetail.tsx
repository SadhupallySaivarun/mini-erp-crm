import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { challanService } from "../services/challan.service";
import { SalesChallan } from "../types";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export function ChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canConfirm = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";
  const canCancel = user?.role === "ADMIN" || user?.role === "SALES";

  async function load() {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await challanService.getById(id);
      setChallan(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!id || !confirm("Confirm this challan? Stock will be deducted.")) return;
    try {
      await challanService.confirm(id);
      toast.success("Challan confirmed");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCancel() {
    if (!id || !confirm("Cancel this challan?")) return;
    try {
      await challanService.cancel(id);
      toast.success("Challan cancelled");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) return <Loader label="Loading challan..." />;
  if (!challan) return <p className="text-gray-500">Challan not found.</p>;

  const total = challan.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const customer = challan.customer as any;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/challans")} className="text-sm text-primary-600 hover:underline">
          ← Back to Challans
        </button>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{challan.challanNumber}</h1>
          <StatusBadge status={challan.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 space-y-2">
          <h2 className="font-semibold text-gray-900 mb-2">Customer</h2>
          <p className="text-sm text-gray-900 font-medium">{customer?.name}</p>
          <p className="text-sm text-gray-500">{customer?.mobile}</p>
          {customer?.id && (
            <Link to={`/customers/${customer.id}`} className="text-sm text-primary-600 hover:underline">
              View customer profile
            </Link>
          )}
        </div>

        <div className="card p-5 space-y-2">
          <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
          <Row label="Total Quantity" value={String(challan.totalQuantity)} />
          <Row label="Total Value" value={formatCurrency(total)} />
          <Row label="Created By" value={challan.createdBy?.name} />
          <Row label="Created At" value={formatDateTime(challan.createdAt)} />
        </div>

        <div className="card p-5 flex flex-col justify-center gap-2">
          {challan.status === "DRAFT" && canConfirm && (
            <button onClick={handleConfirm} className="btn-primary w-full">
              Confirm Challan
            </button>
          )}
          {challan.status !== "CANCELLED" && canCancel && (
            <button onClick={handleCancel} className="btn-danger w-full">
              Cancel Challan
            </button>
          )}
          {challan.status === "CANCELLED" && (
            <p className="text-sm text-gray-500 text-center">This challan is cancelled.</p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Products (snapshot at time of creation)</h2>
        </div>
        <table className="table-base">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Quantity</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium text-gray-900">{item.productName}</td>
                <td>{item.productSku}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
