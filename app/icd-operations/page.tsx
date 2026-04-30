"use client";

import { useEffect, useState, useCallback } from "react";
import StatCard from "@/app/components/StatCard";
import DateFilter from "@/app/components/DateFilter";
import PermitsExitGauge from "@/app/components/icd-ops/PermitsExitGauge";
import ExitedPermitsByTypeChart from "@/app/components/icd-ops/ExitedPermitsByTypeChart";
import PendingPermitsAgingPieChart from "@/app/components/icd-ops/PendingPermitsAgingPieChart";
import AveragePermitTurnaroundRing from "@/app/components/icd-ops/AveragePermitTurnaroundRing";
import ReceivingVsExitTrendChart from "@/app/components/icd-ops/ReceivingVsExitTrendChart";
import PermitTurnaroundHistogram from "@/app/components/icd-ops/PermitTurnaroundHistogram";
import ReceivedContainersFclLclGauge from "@/app/components/icd-ops/ReceivedContainersFclLclGauge";
import ReceivedContainersBySizeChart from "@/app/components/icd-ops/ReceivedContainersBySizeChart";
import ReceivedContainers20vs40PieChart from "@/app/components/icd-ops/ReceivedContainers20vs40PieChart";
import { Package, Container, TruckIcon, Calendar } from "lucide-react";

type DateFilterOption = "today" | "last7days" | "last3months" | "custom";

export default function ICDOperations() {
  const [manifestCount, setManifestCount] = useState<number | null>(null);
  const [receivedContainersCount, setReceivedContainersCount] = useState<number | null>(null);
  const [exitedPermitsCount, setExitedPermitsCount] = useState<number | null>(null);
  const [bookingsCount, setBookingsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<DateFilterOption>("today");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("filterType", filterType);
      
      if (filterType === "custom") {
        if (startDate) {
          params.append("startDate", startDate.toISOString());
        }
        if (endDate) {
          params.append("endDate", endDate.toISOString());
        }
      }

      const queryString = params.toString();

      // Fetch manifests
      const manifestsResponse = await fetch(`/api/manifests?${queryString}`);
      const manifestsData = await manifestsResponse.json();
      
      if (Array.isArray(manifestsData)) {
        setManifestCount(manifestsData.length);
      }

      // Fetch received containers
      const receivedResponse = await fetch(`/api/containers/received?${queryString}`);
      const receivedData = await receivedResponse.json();
      
      if (Array.isArray(receivedData)) {
        setReceivedContainersCount(receivedData.length);
      }

      // Loading permits exited (OIGE gate-out date filter)
      const permitsExitedResponse = await fetch(`/api/permits/exited?${queryString}`);
      const permitsExitedData = await permitsExitedResponse.json();

      if (Array.isArray(permitsExitedData)) {
        setExitedPermitsCount(permitsExitedData.length);
      }

      // Fetch bookings
      const bookingsResponse = await fetch(`/api/containers/bookings?${queryString}`);
      const bookingsData = await bookingsResponse.json();
      
      if (Array.isArray(bookingsData)) {
        setBookingsCount(bookingsData.length);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [filterType, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = useCallback((
    newFilterType: DateFilterOption,
    newStartDate?: Date,
    newEndDate?: Date
  ) => {
    setFilterType(newFilterType);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              ICD Operations
            </h1>
            <p className="text-slate-600">Monitor and analyze your operational metrics</p>
          </div>
          <DateFilter onFilterChange={handleFilterChange} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Manifests"
            value={loading ? "..." : manifestCount ?? 0}
            icon={Package}
            description="Total uploaded manifests"
          />
          <StatCard
            title="Received Containers"
            value={loading ? "..." : receivedContainersCount ?? 0}
            icon={Container}
            description="Containers received"
          />
          <StatCard
            title="Exited Permits"
            value={loading ? "..." : exitedPermitsCount ?? 0}
            icon={TruckIcon}
            description="Loading permits exited (gate-out date)"
          />
          <StatCard
            title="Bookings"
            value={loading ? "..." : bookingsCount ?? 0}
            icon={Calendar}
            description="Container bookings"
          />
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            Received containers
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ReceivedContainersFclLclGauge
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
            <ReceivedContainersBySizeChart
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
            <ReceivedContainers20vs40PieChart
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            Exits & Loading permits
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Exit activity and permits still pending exit (illustrative figures until APIs are connected).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PermitsExitGauge
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
            <ExitedPermitsByTypeChart
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
            <PendingPermitsAgingPieChart
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
            <AveragePermitTurnaroundRing
              filterType={filterType}
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>

        <div className="mt-8">
          <PermitTurnaroundHistogram
            filterType={filterType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        <div className="mt-8">
          <ReceivingVsExitTrendChart
            filterType={filterType}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
}
