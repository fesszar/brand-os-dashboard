"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type BrandOption = {
  id: string;
  name: string;
};

export function QuickActions({ brands }: { brands: BrandOption[] }) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "gideonawolesi");
  const [slot, setSlot] = useState("1000");
  const [slotDir, setSlotDir] = useState("");
  const [message, setMessage] = useState<string>("");

  async function callApi(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await response.json()) as { message?: string; note?: string };
    if (!response.ok) {
      throw new Error(json.message || "Request failed");
    }

    return json;
  }

  async function handleGenerate() {
    try {
      const json = await callApi(`/api/drafts/${brandId}/generate`, { slot });
      setMessage(json.note || "Draft generation trigger sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to trigger generation");
    }
  }

  async function handlePublish() {
    try {
      const targetSlot = slotDir || `${new Date().toISOString().slice(0, 10)}-${slot}`;
      const json = await callApi(`/api/drafts/${brandId}/publish`, { slotDir: targetSlot });
      setMessage(json.note || `Publish trigger sent for ${targetSlot}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to trigger publish");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="quick-brand">Brand</Label>
            <Select id="quick-brand" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quick-slot">Slot (HHMM)</Label>
            <Input
              id="quick-slot"
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
              placeholder="1000"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="quick-slotdir">Slot Dir (publish)</Label>
            <Input
              id="quick-slotdir"
              value={slotDir}
              onChange={(event) => setSlotDir(event.target.value)}
              placeholder="2026-02-25-1000"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleGenerate}>Generate Draft Now</Button>
          <Button variant="secondary" onClick={handlePublish}>
            Publish Now
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/uploads")}>
            Upload Video
          </Button>
        </div>

        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
