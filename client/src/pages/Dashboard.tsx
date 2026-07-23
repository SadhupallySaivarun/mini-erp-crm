import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customerService } from "../services/customer.service";
import { productService } from "../services/product.service";
import { challanService } from "../services/challan.service";
import { Product, SalesChallan } from "../types";
import { Loader } from "../components/Loader";
import { formatCurrency } from "../utils/formatters";
import { StatusBadge } from "../components/StatusBadge";

interface Stats {
  totalCustomers: number;
  totalProducts: number;
  draftChallans: number;
  confirmedChallans: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recentChallans, setRecentChallans] = useState<SalesChallan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [customers, products, draftList, confirmedList, low, recent] = await Promise.all([
          customerService.list({ limit: 1 }),
          productService.list({ limit: 1 }),
          challanService.list({ status: "DRAFT", limit: 1 }),
          challanService.list({ status: "CONFIRMED", limit: 1 }),
          productService.lowStock(),
          challanService.list({ limit: 5 }),
        ]);

        setStats({
          totalCustomers: customers.meta.total,
          totalProducts: products.meta.total,
          draftChallans: draftList.meta.total,
          confirmedChallans: confirmedList.meta.total,
        });
        setLowStock(low.slice(0, 5));
        setRecentChallans(recent.data);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) return <Loader label="Loading dashboard..." />;

  const cards = [
    { label: "Total Customers", value: stats?.totalCustomers ?? 0, link: "/customers" },
    { label: "Total Products", value: stats?.totalProducts ?? 0, link: "/products" },
    { label: "Draft Challans", value: stats?.draftChallans ?? 0, link: "/challans" },
    { label: "Confirmed Challans", value: stats?.confirmedChallans ?? 0, link: "/challans" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.link} className="card p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link to="/inventory" className="text-sm text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No low stock products. All good!</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {p.currentStock} / min {p.minStockAlert}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Sales Challans</h2>
            <Link to="/challans" className="text-sm text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          {recentChallans.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No challans yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentChallans.map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.challanNumber}</p>
                    <p className="text-xs text-gray-500">
                      {"name" in (c.customer ?? {}) ? (c.customer as any).name : ""} &middot;{" "}
                      {formatCurrency(
                        c.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)
                      )}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
