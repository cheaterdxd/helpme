type AskOrbProps = {
  open: boolean;
  onOpen: () => void;
};

export function AskOrb({ open, onOpen }: AskOrbProps) {
  return (
    <button
      className="floating-orb"
      type="button"
      aria-label="Ask HelpMe"
      aria-expanded={open}
      aria-controls="askOverlay"
      onClick={onOpen}
    >
      <span className="orb-core" aria-hidden="true" />
    </button>
  );
}
