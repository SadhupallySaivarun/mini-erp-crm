import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { customerService } from "../services/customer.service";
import { Customer } from "../types";
import { Loader } from "../components/Loader";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatDateTime } from "../utils/formatters";
import { getErrorMessage } from "../services/api";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  async function loadCustomer() {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await customerService.getById(id);
      setCustomer(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setIsAddingNote(true);
    try {
      await customerService.addFollowUpNote(id, note.trim());
      setNote("");
      toast.success("Note added");
      loadCustomer();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingNote(false);
    }
  }

  if (isLoading) return <Loader label="Loading customer..." />;
  if (!customer) return <p className="text-gray-500">Customer not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/customers" className="text-sm text-primary-600 hover:underline">
          ← Back to Customers
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <StatusBadge status={customer.status} />
        </div>
        <p className="text-sm text-gray-500">{customer.businessName}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 space-y-3 lg:col-span-1">
          <h2 className="font-semibold text-gray-900 mb-2">Details</h2>
          <DetailRow label="Mobile" value={customer.mobile} />
          <DetailRow label="Email" value={customer.email || "—"} />
          <DetailRow label="GST Number" value={customer.gstNumber || "—"} />
          <DetailRow label="Type" value={customer.customerType} />
          <DetailRow label="Address" value={customer.address || "—"} />
          <DetailRow label="Follow-up Date" value={formatDate(customer.followUpDate)} />
          <DetailRow label="Customer Since" value={formatDate(customer.createdAt)} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Follow-up Notes</h2>
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              className="input"
              placeholder="Add a follow-up note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="submit" disabled={isAddingNote} className="btn-primary whitespace-nowrap">
              Add Note
            </button>
          </form>
          {!customer.followUpNotes || customer.followUpNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No follow-up notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {customer.followUpNotes.map((n) => (
                <li key={n.id} className="border-l-2 border-primary-200 pl-3">
                  <p className="text-sm text-gray-800">{n.note}</p>
                  <p className="text-xs text-gray-400">
                    {n.createdBy.name} &middot; {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Sales Challans</h2>
        </div>
        {!customer.challans || customer.challans.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No challans for this customer yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customer.challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`} className="text-primary-700 hover:underline font-medium">
                      {c.challanNumber}
                    </Link>
                  </td>
                  <td>{c.totalQuantity}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
