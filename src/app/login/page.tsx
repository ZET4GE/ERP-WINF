import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar — WINF ERP",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_70%)]"
      />

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-winf-icon.png"
            alt="WINF"
            width={56}
            height={56}
            className="drop-shadow-lg drop-shadow-primary/20"
            priority
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">WINF ERP</h1>
            <p className="text-sm text-muted-foreground">
              Gestión integral de clientes, contratos y stock
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/5">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso restringido al equipo WINF. Los usuarios se crean desde el
          panel de administración.
        </p>
      </div>
    </div>
  );
}
