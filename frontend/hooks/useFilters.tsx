"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Filters {
  date_from?: string | null;
  date_to?: string | null;
  boroughs?: string[] | null;
  hours?: [number, number] | null;
  days_of_week?: number[] | null;
  payment_types?: number[] | null;
  fare_range?: [number, number] | null;
  distance_range?: [number, number] | null;
}

const DEBOUNCE_MS = 250;

/**
 * Custom hook for managing filter state with URL synchronization and debouncing
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>({});

  // Parse filters from URL query parameters
  const parseFiltersFromURL = useCallback((): Filters => {
    const filters: Filters = {};

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) filters.date_from = dateFrom;

    const dateTo = searchParams.get("date_to");
    if (dateTo) filters.date_to = dateTo;

    const boroughs = searchParams.get("boroughs");
    if (boroughs) filters.boroughs = boroughs.split(",");

    const hours = searchParams.get("hours");
    if (hours) {
      const [min, max] = hours.split(",").map(Number);
      filters.hours = [min, max];
    }

    const daysOfWeek = searchParams.get("days_of_week");
    if (daysOfWeek) filters.days_of_week = daysOfWeek.split(",").map(Number);

    const paymentTypes = searchParams.get("payment_types");
    if (paymentTypes) filters.payment_types = paymentTypes.split(",").map(Number);

    const fareRange = searchParams.get("fare_range");
    if (fareRange) {
      const [min, max] = fareRange.split(",").map(Number);
      filters.fare_range = [min, max];
    }

    const distanceRange = searchParams.get("distance_range");
    if (distanceRange) {
      const [min, max] = distanceRange.split(",").map(Number);
      filters.distance_range = [min, max];
    }

    return filters;
  }, [searchParams]);

  // Serialize filters to URL query string
  const serializeFiltersToURL = useCallback(
    (filters: Filters) => {
      const params = new URLSearchParams();

      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);
      if (filters.boroughs && filters.boroughs.length > 0) {
        params.set("boroughs", filters.boroughs.join(","));
      }
      if (filters.hours) {
        params.set("hours", filters.hours.join(","));
      }
      if (filters.days_of_week && filters.days_of_week.length > 0) {
        params.set("days_of_week", filters.days_of_week.join(","));
      }
      if (filters.payment_types && filters.payment_types.length > 0) {
        params.set("payment_types", filters.payment_types.join(","));
      }
      if (filters.fare_range) {
        params.set("fare_range", filters.fare_range.join(","));
      }
      if (filters.distance_range) {
        params.set("distance_range", filters.distance_range.join(","));
      }

      return params.toString();
    },
    []
  );

  // Get current filters from URL
  const filters = parseFiltersFromURL();

  // Update URL with new filters (debounced)
  const updateFiltersDebounced = useCallback(
    (newFilters: Filters) => {
      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer
      debounceTimer.current = setTimeout(() => {
        const queryString = serializeFiltersToURL(newFilters);
        const newURL = queryString ? `${pathname}?${queryString}` : pathname;
        router.push(newURL, { scroll: false });
        setDebouncedFilters(newFilters);
      }, DEBOUNCE_MS);
    },
    [pathname, router, serializeFiltersToURL]
  );

  // Update a single filter
  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const currentFilters = parseFiltersFromURL();
      const newFilters = { ...currentFilters, [key]: value };

      // Remove null/undefined values
      Object.keys(newFilters).forEach((k) => {
        if (newFilters[k as keyof Filters] === null || newFilters[k as keyof Filters] === undefined) {
          delete newFilters[k as keyof Filters];
        }
      });

      updateFiltersDebounced(newFilters);
    },
    [parseFiltersFromURL, updateFiltersDebounced]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    router.push(pathname, { scroll: false });
    setDebouncedFilters({});
  }, [pathname, router]);

  // Set debounced filters on mount
  useEffect(() => {
    setDebouncedFilters(parseFiltersFromURL());
  }, [parseFiltersFromURL]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    resetFilters,
  };
}

/**
 * Convert Filters object to API request body format
 */
export function filtersToAPIBody(filters: Filters): Record<string, any> {
  const body: Record<string, any> = {};

  if (filters.date_from) body.date_from = filters.date_from;
  if (filters.date_to) body.date_to = filters.date_to;
  if (filters.boroughs && filters.boroughs.length > 0) body.boroughs = filters.boroughs;
  if (filters.hours) body.hours = filters.hours;
  if (filters.days_of_week && filters.days_of_week.length > 0) body.days_of_week = filters.days_of_week;
  if (filters.payment_types && filters.payment_types.length > 0) body.payment_types = filters.payment_types;
  if (filters.fare_range) body.fare_range = filters.fare_range;
  if (filters.distance_range) body.distance_range = filters.distance_range;

  return body;
}
