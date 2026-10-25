"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { campo } from "./ui";

/** Input de contraseña con botón para mostrar u ocultar. Pensado para ir dentro de <Campo icono>. */
export function CampoPassword({
  id,
  name,
  autoComplete,
  placeholder,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${campo} pl-11 pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-marca-700"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </>
  );
}
