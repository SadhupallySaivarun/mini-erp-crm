import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { challanService } from "../services/challan.service";
import { SalesChallan, PaginationMeta } from "../types";
import { Loader } from "../components/Loader";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../utils/formatters";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export function Challans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";
  const canConfirm = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";
  const canCancel = user?.role === "ADMIN" || user?.role === "SALES";

  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadChallans() {
    setIsLoading(true);
    try {
      const res = await challanService.list({ page, limit: 10, status: statusFilter || undefined });
      setChallans(res.data);
      setMeta(res.meta);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadChallans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function handleConfirm(id: string) {
    if (!confirm("Confirm this challan? Stock will be deducted and this cannot be undone easily.")) return;
    try {
      await challanService.confirm(id);
      toast.success("Challan confirmed, stock deducted");
      loadChallans();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this challan? If it was confirmed, stock will be restored.")) return;
    try {
      await challanService.cancel(id);
      toast.success("Challan cancelled");
      loadChallans();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Challans</h1>
          <p className="text-sm text-gray-500">Draft, confirm, and track sales challans</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate("/challans/new")} className="btn-primary">
            + Create Challan
          </button>
        )}
      </div>

      <div className="card p-4 flex gap-3">
        <select
          className="input sm:w-56"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <Loader />
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/challans/${c.id}`} className="font-medium text-primary-700 hover:underline">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td>{"name" in (c.customer ?? {}) ? (c.customer as any).name : "—"}</td>
                    <td>{c.totalQuantity}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{c.createdBy?.name}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {c.status === "DRAFT" && canConfirm && (
                        <button
                          onClick={() => handleConfirm(c.id)}
                          className="text-sm text-green-600 hover:underline"
                        >
                          Confirm
                        </button>
                      )}
                      {c.status !== "CANCELLED" && canCancel && (
                        <button
                          onClick={() => handleCancel(c.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {challans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No sales challans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  );
}
