"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { registerAssetSchema } from "@luminar-iq/shared";

const formSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["Website", "WebApplication", "API"]),
  name: z.string().trim().min(2).max(120),
  url: z.string().url(),
  authorizationConfirmed: z.boolean().refine((value) => value, {
    message: "You must confirm authorization before registering this asset."
  }),
  scanHttps: z.boolean().default(true),
  scanHeaders: z.boolean().default(true),
  scanCookies: z.boolean().default(true),
  scanExposedFiles: z.boolean().default(true),
  scanZapBaseline: z.boolean().default(false)
});

type ScanFormValues = z.infer<typeof formSchema>;

export function ScanForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful }
  } = useForm<ScanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: "00000000-0000-4000-8000-000000000000",
      type: "Website",
      name: "",
      url: "",
      authorizationConfirmed: false,
      scanHttps: true,
      scanHeaders: true,
      scanCookies: true,
      scanExposedFiles: true,
      scanZapBaseline: false
    }
  });

  function submit(values: ScanFormValues) {
    registerAssetSchema.parse({
      projectId: values.projectId,
      type: values.type,
      name: values.name,
      url: values.url,
      authorizationConfirmed: values.authorizationConfirmed
    });
    console.info("Ready to register authorized defensive scan", values);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-teal-50 text-signal">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">Register asset</h2>
          <p className="text-sm text-slate-600">Find and fix security risks before attackers do.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Asset name</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-signal"
            placeholder="Marketing website"
            {...register("name")}
          />
          {errors.name && <span className="text-sm text-ember">{errors.name.message}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-signal"
            placeholder="https://example.com"
            {...register("url")}
          />
          {errors.url && <span className="text-sm text-ember">{errors.url.message}</span>}
        </label>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
            <input type="checkbox" {...register("scanHttps")} />
            HTTPS and TLS
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
            <input type="checkbox" {...register("scanHeaders")} />
            Security headers
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
            <input type="checkbox" {...register("scanCookies")} />
            Cookies
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
            <input type="checkbox" {...register("scanExposedFiles")} />
            Exposed files
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3">
            <input type="checkbox" {...register("scanZapBaseline")} />
            ZAP passive baseline
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-md border border-amber/30 bg-orange-50 p-3 text-sm text-slate-700">
          <input className="mt-1" type="checkbox" {...register("authorizationConfirmed")} />
          <span>I confirm that I own this asset or am authorized to perform defensive security testing.</span>
        </label>
        {errors.authorizationConfirmed && <p className="text-sm text-ember">{errors.authorizationConfirmed.message}</p>}

        <button className="w-full rounded-md bg-signal px-4 py-2.5 font-semibold text-white" type="submit">
          Queue authorized scan
        </button>
        {isSubmitSuccessful && <p className="text-sm font-medium text-signal">Scan request validated locally.</p>}
      </form>
    </section>
  );
}
