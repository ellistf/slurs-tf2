import { Logo } from '@/components/Logo';
import { SearchBar } from '@/components/SearchBar';

export function Nav({ initialSearch = '' }: { initialSearch?: string }) {
  return (
    <header className="player-page">
      <div style={{ marginBottom: '24px' }}>
        <Logo />
        <SearchBar initialValue={initialSearch} />
      </div>
    </header>
  );
}
