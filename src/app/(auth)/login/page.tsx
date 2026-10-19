import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Alert } from "@/components/ui/feedback";
export const metadata: Metadata = { title: "Entrar" };
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  return <>{error==="invitation"&&<Alert tone="error">O convite não pôde ser confirmado. Solicite um novo convite ao condomínio.</Alert>}{(error==="link"||error==="auth")&&<Alert tone="error">Este link não é mais válido: ele expirou, já foi usado ou foi aberto em outro navegador. Solicite um novo em &ldquo;Esqueci minha senha&rdquo;.</Alert>}<AuthForm mode="login" /></>;
}
