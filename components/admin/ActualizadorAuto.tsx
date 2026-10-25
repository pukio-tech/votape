"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { boton } from "@/components/ui";

/** Refresca los datos del servidor cada cierto tiempo y permite hacerlo a mano. */
export function ActualizadorAuto({ intervaloMs = 10_000 }: { intervaloMs?: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => startTransition(() => router.refresh()), intervaloMs);
    return () => clearInterval(id);
  }, [router, intervaloMs]);

  return (
    <button onClick={() => startTransition(() => router.refresh())} className={boton.secundario}>
      <RefreshCw className={`size-4 ${pendiente ? "animate-spin" : ""}`} aria-hidden /> Actualizar
    </button>
  );
}
