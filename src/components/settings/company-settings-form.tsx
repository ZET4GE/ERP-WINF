"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCompanySettings, uploadCompanyLogo } from "@/app/(dashboard)/configuracion/actions";
import type { CompanySettings } from "@/lib/types/settings";

export function CompanySettingsForm({
  settings,
  readOnly,
}: {
  settings: CompanySettings;
  readOnly: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(settings.name);
  const [cuit, setCuit] = useState(settings.cuit ?? "");
  const [contactPhone, setContactPhone] = useState(settings.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(settings.contact_email ?? "");
  const [domain, setDomain] = useState(settings.domain ?? "");
  const [billingDay, setBillingDay] = useState(settings.default_billing_day);
  const [currency, setCurrency] = useState(settings.default_currency);

  function handleSave() {
    startTransition(async () => {
      const result = await updateCompanySettings(settings.id, {
        name,
        cuit: cuit || undefined,
        contact_phone: contactPhone || undefined,
        contact_email: contactEmail || undefined,
        domain: domain || undefined,
        default_billing_day: billingDay,
        default_currency: currency,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Configuración actualizada");
    });
  }

  function handleLogoChange() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("logo", file);
    startUpload(async () => {
      const result = await uploadCompanyLogo(settings.id, formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Logo actualizado");
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
            {settings.logo_url ? (
              <Image
                src={settings.logo_url}
                alt="Logo WINF"
                width={64}
                height={64}
                unoptimized
                className="object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Sin logo</span>
            )}
          </div>
          {!readOnly && (
            <div className="flex flex-col gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={isUploading}
                className="text-sm text-muted-foreground file:mr-3 file:h-8 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:text-sm file:font-medium file:text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Se usa en el sidebar y en los PDFs. {isUploading && "Subiendo..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>CUIT</Label>
              <Input value={cuit} onChange={(e) => setCuit(e.target.value)} disabled={readOnly} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Teléfono de contacto</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={readOnly} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email de contacto</Label>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} disabled={readOnly} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Dominio</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="winf.com.ar"
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferencias</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Día de facturación por defecto</Label>
            <Input
              type="number"
              min="1"
              max="28"
              value={billingDay}
              onChange={(e) => setBillingDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Moneda por defecto</Label>
            <Select
              value={currency}
              onValueChange={(v) => v && setCurrency(v as "ARS" | "USD")}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div>
          <Button disabled={isPending} onClick={handleSave}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
