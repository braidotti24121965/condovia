"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { signIn, requestPasswordReset, updatePassword, type ActionState } from "@/lib/auth/actions";
import { Alert } from "@/components/ui/feedback";

type Mode = "login" | "forgot" | "reset";
const initial: ActionState = {};

export function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "login" ? signIn : mode === "forgot" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initial);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";
  const title = isLogin ? "Acesse sua conta" : mode === "forgot" ? "Recupere sua senha" : "Crie uma nova senha";
  const description = isLogin ? "Entre para acessar o CondoVia." : mode === "forgot" ? "Enviaremos as instruções para o seu e-mail." : "Escolha uma senha segura para sua conta.";

  return <section className="auth-card" aria-labelledby="auth-title">
    <div className="auth-heading"><p className="eyebrow">CONDOVIA · GESTÃO INTELIGENTE</p><h1 id="auth-title">{title}</h1><p>{description}</p></div>
    <form action={formAction} className="auth-form" data-navigation-feedback="off">
      {mode !== "reset" && <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" required /></div>}
      {mode !== "forgot" && <div className="field"><label htmlFor={mode === "reset" ? "password" : "password"}>Senha</label><div className="password-wrap"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} minLength={mode === "reset" ? 8 : undefined} required /><Button variant="icon" className="password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</Button></div>{mode === "reset" && <span className="field-hint">Use pelo menos 8 caracteres.</span>}</div>}
      {mode === "reset" && <div className="field"><label htmlFor="confirmation">Confirme a senha</label><input id="confirmation" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /></div>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Button className="auth-submit" type="submit" disabled={pending}>{pending && <LoaderCircle size={18} className="spin" />}{pending ? "Aguarde…" : isLogin ? "Entrar" : mode === "forgot" ? "Enviar instruções" : "Salvar nova senha"}</Button>
    </form>
    <div className="auth-footer">{isLogin ? <Link href="/forgot-password">Esqueci minha senha</Link> : <Link href="/login">Voltar para entrar</Link>}</div>
  </section>;
}
