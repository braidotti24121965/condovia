import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Calendar, Clock, MapPin, AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QrCode, Ecc, buildAuthorizationPassUrl } from "@/lib/gatehouse/qrcode";
import { formatDateTimeInTimezone, getAuthorizationOperationalStatus } from "@/lib/gatehouse/timezone";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Passe de Acesso",
    description: "Passe de autorização de acesso ao condomínio via CondoVia.",
  };
}

export default async function VisitorPassPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <AlertCircle size={40} color="var(--cv-error)" style={{ margin: "0 auto 16px auto" }} />
          <h1 style={styles.title}>Serviço Indisponível</h1>
          <p style={styles.description}>Não foi possível conectar ao serviço de autorizações.</p>
        </div>
      </main>
    );
  }

  // Fetch through safe public RPC get_visitor_pass
  const { data, error } = await supabase.rpc("get_visitor_pass", {
    p_token: token,
  });

  const pass = data?.[0];

  if (error || !pass) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <AlertCircle size={40} color="var(--cv-warning)" style={{ margin: "0 auto 16px auto" }} />
          <h1 style={styles.title}>Autorização Não Encontrada</h1>
          <p style={styles.description}>
            Este passe de acesso não foi encontrado, foi cancelado ou ainda não foi aprovado.
            Solicite ao morador uma nova liberação de acesso.
          </p>
          <div style={{ marginTop: "20px" }}>
            <Link href="/login" style={styles.linkButton}>
              <ArrowLeft size={16} /> Ir para o CondoVia
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const timeZone = "America/Sao_Paulo";
  const opStatus = getAuthorizationOperationalStatus(pass.valid_from, pass.valid_until);
  const formattedFrom = formatDateTimeInTimezone(pass.valid_from, timeZone);
  const formattedUntil = formatDateTimeInTimezone(pass.valid_until, timeZone);

  // Generate QR Code containing this canonical pass URL
  const qr = QrCode.encodeText(buildAuthorizationPassUrl(token), Ecc.MEDIUM);
  const svgString = qr.toSvgString(4);

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.brandBadge}>
            <ShieldCheck size={16} color="var(--cv-brand-navy)" />
            <span>CondoVia Acesso Seguro</span>
          </div>
          <h1 style={styles.condoName}>{pass.condominium_name}</h1>
          <p style={styles.subtitle}>Passe Digital de Visitante</p>
        </header>

        {/* Status Badge */}
        <div style={styles.statusWrap}>
          <span
            style={{
              ...styles.statusBadge,
              border: "1px solid transparent",
              backgroundColor:
                opStatus.tone === "active"
                  ? "color-mix(in srgb, var(--cv-success), white 93%)"
                  : opStatus.tone === "info"
                  ? "color-mix(in srgb, var(--cv-info), white 93%)"
                  : "var(--cv-background)",
              color:
                opStatus.tone === "active"
                  ? "var(--cv-success)"
                  : opStatus.tone === "info"
                  ? "var(--cv-info)"
                  : "var(--cv-text)",
            }}
          >
            ● {opStatus.label}
          </span>
        </div>

        {/* QR Code */}
        <div style={styles.qrContainer} dangerouslySetInnerHTML={{ __html: svgString }} />

        <p style={styles.qrInstructions}>
          Apresente este QR Code na portaria na sua chegada.
        </p>

        {/* Visitor Details Card */}
        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Visitante:</span>
            <strong style={styles.detailValue}>{pass.visitor_name}</strong>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Destino:</span>
            <strong style={styles.detailValue}>
              <MapPin size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Unidade {pass.unit_code}
            </strong>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Início:</span>
            <span style={styles.detailValue}>
              <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              {formattedFrom}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Validade até:</span>
            <span style={styles.detailValue}>
              <Clock size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              {formattedUntil}
            </span>
          </div>

        </div>

        <footer style={styles.footer}>
          <small style={styles.legalNotice}>
            Emitido pelo sistema CondoVia em conformidade com as regras de acesso do condomínio.
          </small>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px 16px",
    background: "var(--cv-background)",
  },
  card: {
    width: "min(100%, 420px)",
    background: "var(--cv-surface)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "var(--cv-shadow-md)",
    border: "1px solid var(--cv-border)",
    textAlign: "center",
  },
  header: {
    marginBottom: "16px",
  },
  brandBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "color-mix(in srgb, var(--cv-brand-teal), white 90%)",
    color: "var(--cv-brand-navy)",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--cv-brand-teal), white 55%)",
    marginBottom: "12px",
  },
  condoName: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--cv-text-strong)",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--cv-text-muted)",
    margin: 0,
  },
  statusWrap: {
    marginBottom: "16px",
  },
  statusBadge: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "999px",
  },
  qrContainer: {
    background: "var(--cv-surface)",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--cv-border)",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: "220px",
    height: "220px",
    margin: "0 auto 12px auto",
    boxShadow: "var(--cv-shadow-sm)",
  },
  qrInstructions: {
    fontSize: "13px",
    color: "var(--cv-text)",
    fontWeight: 500,
    margin: "0 0 16px 0",
  },
  detailsBox: {
    background: "var(--cv-background)",
    border: "1px solid var(--cv-border)",
    borderRadius: "10px",
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "13px",
    marginBottom: "16px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  detailLabel: {
    color: "var(--cv-text-muted)",
  },
  detailValue: {
    color: "var(--cv-text-strong)",
    textAlign: "right",
  },
  footer: {
    borderTop: "1px solid var(--cv-border)",
    paddingTop: "12px",
  },
  codeText: {
    fontSize: "12px",
    color: "var(--cv-text-muted)",
    fontFamily: "monospace",
    margin: "0 0 4px 0",
  },
  legalNotice: {
    fontSize: "11px",
    color: "var(--cv-text-muted)",
    display: "block",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--cv-text-strong)",
    marginBottom: "8px",
  },
  description: {
    fontSize: "14px",
    color: "var(--cv-text-muted)",
    lineHeight: 1.5,
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--cv-brand-navy)",
    color: "var(--cv-surface)",
    fontSize: "14px",
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: "8px",
    textDecoration: "none",
  },
};
