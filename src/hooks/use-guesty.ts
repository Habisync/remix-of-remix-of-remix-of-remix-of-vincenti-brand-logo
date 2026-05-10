import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GuestyListing {
  _id: string;
  title?: string;
  nickname?: string;
  picture?: { thumbnail?: string; large?: string; regular?: string };
  pictures?: { original?: string; thumbnail?: string; caption?: string }[];
  address?: { city?: string; country?: string; full?: string };
  accommodates?: number;
  bedrooms?: number;
  bathrooms?: number;
  prices?: { basePrice?: number; currency?: string };
  propertyType?: string;
  amenities?: string[];
  publicDescription?: { summary?: string; space?: string };
}

interface ListingsResponse {
  results?: GuestyListing[];
  data?: GuestyListing[];
  count?: number;
  error?: string;
}

async function invoke<T>(action: string, params: Record<string, string> = {}, body?: unknown): Promise<T> {
  const qs = new URLSearchParams({ action, ...params });
  const { data, error } = await supabase.functions.invoke<T>(`guesty-beapi?${qs.toString()}`, {
    body: body as object | undefined,
  });
  if (error) throw error;
  return data as T;
}

export function useGuestyListings(filters: { city?: string; checkIn?: string; checkOut?: string; minOccupancy?: string } = {}) {
  const [listings, setListings] = useState<GuestyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const out: Record<string, string> = { limit: "24" };
    if (filters.city) out.city = filters.city;
    if (filters.checkIn) out.checkIn = filters.checkIn;
    if (filters.checkOut) out.checkOut = filters.checkOut;
    if (filters.minOccupancy) out.minOccupancy = filters.minOccupancy;
    return out;
  }, [filters.city, filters.checkIn, filters.checkOut, filters.minOccupancy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    invoke<ListingsResponse>("listings", params)
      .then((res) => {
        if (cancelled) return;
        const items = res.results ?? res.data ?? [];
        setListings(Array.isArray(items) ? items : []);
        if (res.error) setError(res.error);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params]);

  return { listings, loading, error };
}

export const guestyApi = {
  listings: (params?: Record<string, string>) => invoke<ListingsResponse>("listings", params ?? {}),
  listing: (id: string) => invoke<GuestyListing>("listing", { id }),
  calendar: (id: string, from: string, to: string) => invoke<unknown>("calendar", { id, from, to }),
  paymentProvider: (id: string) => invoke<unknown>("payment-provider", { id }),
  createQuote: (body: unknown) => invoke<unknown>("create-quote", {}, body),
  getQuote: (id: string) => invoke<unknown>("get-quote", { id }),
  applyCoupon: (id: string, couponCode: string) => invoke<unknown>("apply-coupon", { id }, { couponCode }),
  instantCharge: (quoteId: string, body: unknown) => invoke<unknown>("instant-charge", { id: quoteId }, body),
  verifyPayment: (reservationId: string, body: unknown) => invoke<unknown>("verify-payment", { id: reservationId }, body),
  reservation: (id: string) => invoke<unknown>("reservation", { id }),
};
