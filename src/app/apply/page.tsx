"use client";

import { useState } from "react";
import Link from "next/link";

type ApplicationType = "seller" | "agent" | "collaborator";

const inputClass =
  "w-full rounded-md border border-navy-200 px-3 py-2 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-100";

const labelClass = "mb-1 block text-sm font-medium text-navy-800";

export default function ApplyPage() {
  const [applicationType, setApplicationType] = useState<ApplicationType>("seller");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    const payload = {
      applicationType,
      fullName: String(formData.get("fullName") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      businessName: String(formData.get("businessName") || ""),
      prcLicenseNumber: String(formData.get("prcLicenseNumber") || ""),
      profession: String(formData.get("profession") || ""),
      serviceArea: String(formData.get("serviceArea") || ""),
      propertyAddress: String(formData.get("propertyAddress") || ""),
      propertyType: String(formData.get("propertyType") || ""),
      isPropertyOwner: formData.get("isPropertyOwner") === "on",
      message: String(formData.get("message") || ""),
      consentConfirmed: formData.get("consentConfirmed") === "on",
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error || "Could not submit your application.");
        return;
      }

      setSuccess(true);
      setMessage("Application submitted. We will review your details and contact you soon.");
      event.currentTarget.reset();
      setApplicationType("seller");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit your application. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="bg-navy-50">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/" className="text-sm font-medium text-gold-700 hover:underline">
          ← Back to homepage
        </Link>

        <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-700">
              MM Properties Davao
            </p>
            <h1 className="mt-2 text-3xl font-bold text-navy-900 md:text-4xl">
              Apply to list, sell, or collaborate
            </h1>
            <p className="mt-3 text-sm leading-6 text-navy-500">
              Submit your details below. Applications are reviewed before any seller or
              agent dashboard access is granted.
            </p>
          </div>

          {message && (
            <div
              className={`mt-6 rounded-md p-4 text-sm ${
                success
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-7">
            <section>
              <h2 className="text-lg font-semibold text-navy-900">Application type</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <TypeCard
                  title="Seller / Property Owner"
                  description="I own a property and want to list it."
                  active={applicationType === "seller"}
                  onClick={() => setApplicationType("seller")}
                />
                <TypeCard
                  title="Licensed Agent / Broker"
                  description="I represent properties professionally."
                  active={applicationType === "agent"}
                  onClick={() => setApplicationType("agent")}
                />
                <TypeCard
                  title="Collaborator / Partner"
                  description="I want to partner or provide related services."
                  active={applicationType === "collaborator"}
                  onClick={() => setApplicationType("collaborator")}
                />
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <div>
                <label className={labelClass}>Full name</label>
                <input name="fullName" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input name="phone" required className={inputClass} />
              </div>
            </section>

            {applicationType === "seller" && (
              <section className="space-y-5 rounded-xl border border-navy-100 bg-navy-50 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    Property owner details
                  </h2>
                  <p className="mt-1 text-sm text-navy-500">
                    Seller applications are only for property owners, not agents or brokers.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Property address / area</label>
                    <input
                      name="propertyAddress"
                      placeholder="Example: Matina, Davao City"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Property type</label>
                    <input
                      name="propertyType"
                      placeholder="House, condo, lot, commercial, etc."
                      className={inputClass}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-navy-700">
                  <input
                    name="isPropertyOwner"
                    type="checkbox"
                    required
                    className="mt-1"
                  />
                  <span>I confirm that I am the property owner or authorized owner representative.</span>
                </label>
              </section>
            )}

            {applicationType === "agent" && (
              <section className="space-y-5 rounded-xl border border-navy-100 bg-navy-50 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    Agent / broker details
                  </h2>
                  <p className="mt-1 text-sm text-navy-500">
                    Agent applications require license and service area details.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Agency / business name</label>
                    <input name="businessName" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>PRC license number</label>
                    <input name="prcLicenseNumber" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Service area</label>
                    <input
                      name="serviceArea"
                      placeholder="Davao City, Davao del Sur, etc."
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>
            )}

            {applicationType === "collaborator" && (
              <section className="space-y-5 rounded-xl border border-navy-100 bg-navy-50 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    Collaborator details
                  </h2>
                  <p className="mt-1 text-sm text-navy-500">
                    For developers, marketers, photographers, property partners, and related service providers.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Profession / role</label>
                    <input
                      name="profession"
                      placeholder="Developer, photographer, marketer..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Business name</label>
                    <input name="businessName" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Service area</label>
                    <input name="serviceArea" className={inputClass} />
                  </div>
                </div>
              </section>
            )}

            <section>
              <label className={labelClass}>Message</label>
              <textarea
                name="message"
                rows={5}
                placeholder="Tell us what you want to list, sell, represent, or collaborate on."
                className={inputClass}
              />
            </section>

            <label className="flex items-start gap-3 text-sm text-navy-700">
              <input name="consentConfirmed" type="checkbox" required className="mt-1" />
              <span>
                I consent to being contacted by MM Properties Davao about this application.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit application"}
              </button>
              <p className="text-xs text-navy-400">
                Submitting this form does not automatically grant dashboard access.
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function TypeCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-gold-500 bg-gold-50 ring-2 ring-gold-100"
          : "border-navy-100 bg-white hover:border-gold-300"
      }`}
    >
      <span className="block font-semibold text-navy-900">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-navy-500">{description}</span>
    </button>
  );
}