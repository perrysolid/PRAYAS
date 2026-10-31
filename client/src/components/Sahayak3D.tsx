/** Sahayak's picture. A gentle bob while she speaks; otherwise still. */
export function Sahayak3D({ speaking = false, className = "" }: { speaking?: boolean; joined?: boolean; greetAfter?: number | null; className?: string }) {
  return (
    <span className={`avatar3d ${className}`} aria-hidden="true">
      <img className={`avatar3d__pic${speaking ? " is-speaking" : ""}`} src="/img/sahayak.webp" width={360} height={360} alt="" draggable={false} />
    </span>
  );
}

export function Sahayak3DFace({ size = 26 }: { size?: number }) {
  return <img className="avatar3d__face" src="/img/sahayak.webp" width={size} height={size} alt="" />;
}
