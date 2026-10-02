import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="CondoVia início"><span className="brand-condo">Condo</span><span className="brand-via">Via</span><span className="brand-by">by Kynovia</span></Link>;
}
