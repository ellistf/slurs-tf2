import Image from 'next/image';
import Link from 'next/link';

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
        <Image
          src="/re-logo.png"
          alt="Slurs.tf2"
          width={420}
          height={136}
          priority
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
    <Link href="/" aria-label="Go to home">
      {content}
    </Link>
  );
}
