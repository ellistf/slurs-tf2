import { useEffect, useState } from 'react';

import { HomePageClient } from '@/components/HomePageClient';

export function HomeRoute() {
  const [runtimeInfo, setRuntimeInfo] = useState({
    isElectronApp: true,
    steamApiKeyConfigured: false
  });

  useEffect(() => {
    document.title = 'Slurs.tf2';

    void window.slursApi?.getRuntimeInfo().then((info) => {
      setRuntimeInfo(info);
    });
  }, []);

  return (
    <HomePageClient
      initialVanityLookupEnabled={runtimeInfo.steamApiKeyConfigured}
      isElectronApp={runtimeInfo.isElectronApp}
    />
  );
}
