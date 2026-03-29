import { Route, Routes } from 'react-router-dom';

import { HomeRoute } from '@/src/pages/HomeRoute';
import { PlayerRoute } from '@/src/pages/PlayerRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/player/:steamid" element={<PlayerRoute />} />
      <Route path="*" element={<HomeRoute />} />
    </Routes>
  );
}
