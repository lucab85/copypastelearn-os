export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="CopyPasteLearn">
      <span className="brand-mark"><i /><i /><i /></span>
      {!compact && <span className="brand-word">COPYPASTE<span>LEARN</span></span>}
    </div>
  );
}
