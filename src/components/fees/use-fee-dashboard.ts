"use client";

import {
  useState, useEffect, useCallback, useRef,
}                              from "react";
import type { FeeDashboardData } from "./types";

export interface FeeFilters {
  classId:      string;
  status:       string;
  academicYear: string;
  search:       string;
}

export function useFeeDashboard() {
  const [data,    setData]    = useState<FeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [filters, setFilters] = useState<FeeFilters>({
    classId:      "",
    status:       "",
    academicYear: "",
    search:       "",
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: FeeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.classId)      params.set("classId",      f.classId);
      if (f.status)       params.set("status",        f.status);
      if (f.academicYear) params.set("academicYear",  f.academicYear);
      if (f.search)       params.set("search",        f.search);
      const res  = await fetch(`/api/fees/dashboard?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch fee data");
      const json = await res.json() as FeeDashboardData;
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filters), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters, fetchData]);

  const updateFilter = (key: keyof FeeFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const refetch = () => fetchData(filters);

  return { data, loading, error, filters, updateFilter, refetch };
}