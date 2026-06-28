// src/components/property/InquiryForm.tsx
"use client";
import { useState } from "react";

export function InquiryForm({ propertyId }: { propertyId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [isRemoteBuyer, setIsRemoteBuyer] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
        isRemoteBuyer,
      }),
    });
    if (response.ok) setSubmitted(true);
  }

  if (submitted) {
    return <p className="rounded-md bg-green-50 p-4 text-sm text-green-700">Thanks — your inquiry has been sent to the agent.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4 sm:p-5">
      <h3 className="text-lg font-semibold">Inquire about this property</h3>
      <input name="name" required placeholder="Full name" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border px-3 py-2 text-sm" />
      <textarea name="message" placeholder="Message" rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={isRemoteBuyer} onChange={(e) => setIsRemoteBuyer(e.target.checked)} />
        I'm an OFW / overseas buyer inquiring remotely
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          Send inquiry
        </button>
        <button type="button" className="rounded-md border px-4 py-2 text-sm">
          Schedule viewing
        </button>
      </div>
    </form>
  );
}
