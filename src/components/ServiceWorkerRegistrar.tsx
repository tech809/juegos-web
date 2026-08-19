"use client";

import { useEffect } from "react";

/**
 * Registra el service worker que permite instalar la app y abrirla sin
 * conexión. En desarrollo no se registra, para no servir código cacheado
 * mientras se está trabajando.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // si falla, la app sigue funcionando como una web normal
      });
    };

    // Cuando este componente monta, la página suele estar ya cargada y el
    // evento "load" no volverá a dispararse: hay que comprobarlo a mano.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
