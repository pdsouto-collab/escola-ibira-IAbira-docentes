"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ConfiguracoesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/diretoria?tab=configuracoes");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#f2efe9]">
      <Loader2 className="animate-spin text-[#8fb39c]" size={36} />
    </div>
  );
}
