import { getAssetPath } from '@/lib/asset-path';

export function Logo({
  linked = true,
  className
}: {
  linked?: boolean;
  className?: string;
}) {
  const content = (
    <div className={className}>
      <div className="logo-wrap">
        <img
          src={getAssetPath('re-logo.png')}
          alt="Slurs.tf2"
          className="logo-img"
        />
      </div>
      <div className="site-tagline">CompTF2 Slur Statistics</div>
    </div>
  );

  if (!linked) {
    return content;
  }

  return (
    <a href="#/" aria-label="Go to home">
      {content}
    </a>
  );
}
