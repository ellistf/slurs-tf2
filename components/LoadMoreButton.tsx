'use client';

export function LoadMoreButton({
  onClick,
  disabled
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="load-more-button"
      className="load-more-btn"
    >
      {disabled ? 'Scanning...' : 'Load more logs'}
    </button>
  );
}
