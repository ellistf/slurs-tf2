'use client';

import { useState } from 'react';
import { Settings2 } from 'lucide-react';

export function ElectronSettingsButton({
  onConfiguredChange
}: {
  onConfiguredChange: (configured: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [steamApiKey, setSteamApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (!window.slursApi) {
        throw new Error('Electron API bridge is unavailable.');
      }

      const payload = await window.slursApi.saveElectronSettings({
        steamApiKey
      });

      if (!payload) {
        throw new Error('Failed to save Steam API key.');
      }

      const result = payload as {
        steamApiKeyConfigured: boolean;
      };

      onConfiguredChange(result.steamApiKeyConfigured);
      setSteamApiKey('');
      setIsOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save Steam API key.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="electron-settings-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <Settings2 size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="electron-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="electron-settings-title">Settings</h2>
            <p>
              Create your Steam Web API key at{' '}
              <a
                href="https://steamcommunity.com/dev/apikey"
                target="_blank"
                rel="noreferrer"
              >
                steamcommunity.com/dev/apikey
              </a>
              .
            </p>
            <form className="electron-settings-form" onSubmit={handleSubmit}>
              <label className="electron-settings-label" htmlFor="electron-steam-api-key">
                Steam API key
              </label>
              <input
                id="electron-steam-api-key"
                className="electron-settings-input"
                value={steamApiKey}
                onChange={(event) => setSteamApiKey(event.target.value)}
                placeholder="Paste your Steam Web API key"
                autoComplete="off"
                spellCheck={false}
              />
              <p className={`electron-settings-feedback${error ? ' electron-settings-feedback-error' : ''}`}>
                {error ?? (isSaving ? 'Saving settings...' : 'Leave blank and save to clear the stored key.')}
              </p>
              <div className="confirm-modal-actions">
                <button type="button" className="modal-button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-button modal-button-danger">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
