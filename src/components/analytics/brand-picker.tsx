"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";

export function BrandPicker({ brandIds, value, basePath }: { brandIds: string[]; value: string; basePath: string }) {
  const router = useRouter();
  return (
    <Select
      aria-label="Brand"
      className="w-56"
      value={value}
      onChange={(event) => router.push(`${basePath}?brand=${encodeURIComponent(event.target.value)}`)}
    >
      {brandIds.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </Select>
  );
}
