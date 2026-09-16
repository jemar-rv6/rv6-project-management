import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-logo">
        <Image src="/rv6-logo-white.png" alt="RV6 Performance" width={86} height={52} priority />
      </div>
      {!compact && (
        <div>
          <div className="brand-kicker">PERSONAL COMMAND CENTER</div>
          <div className="brand-title">Project Management</div>
        </div>
      )}
    </div>
  );
}
