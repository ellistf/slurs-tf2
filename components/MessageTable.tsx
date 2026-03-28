'use client';

import type { ReactNode } from 'react';

import type { ScannedMessage } from '@/types';

import { formatDateTime } from '@/lib/utils';

function getMessageColor(category: ScannedMessage['category']) {
  switch (category) {
    case 'RACIAL':
      return '#e06060';
    case 'BIGOTRY':
      return '#b06ad6';
    case 'GENERIC':
      return '#80aa80';
    default:
      return '#cccccc';
  }
}

function getMessageClass(category: ScannedMessage['category']) {
  switch (category) {
    case 'RACIAL':
      return 'msg-text msg-text-racial';
    case 'BIGOTRY':
      return 'msg-text msg-text-bigotry';
    case 'GENERIC':
      return 'msg-text msg-text-generic';
    default:
      return 'msg-text msg-text-clean';
  }
}

function renderMessageText(message: ScannedMessage) {
  if (!message.matches.length) {
    return message.text;
  }

  const fragments: ReactNode[] = [];
  let cursor = 0;

  for (const match of message.matches) {
    if (match.start > cursor) {
      fragments.push(message.text.slice(cursor, match.start));
    }

    fragments.push(
      <strong key={`${message.id}-${match.start}-${match.end}`} className="msg-highlight">
        {message.text.slice(match.start, match.end)}
      </strong>
    );

    cursor = match.end;
  }

  if (cursor < message.text.length) {
    fragments.push(message.text.slice(cursor));
  }

  return fragments;
}

export function MessageTable({ messages }: { messages: ScannedMessage[] }) {
  return (
    <div className="thin-scrollbar overflow-x-auto">
      <table className="msg-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}>LogID</th>
            <th style={{ width: 190 }}>Date</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {messages.length ? (
            messages.map((message) => (
              <tr key={message.id}>
                <td className="msg-logid-cell">
                  <a href={`https://logs.tf/${message.logId}`} target="_blank" rel="noreferrer">
                    {message.logId}
                  </a>
                </td>
                <td className="msg-date-cell">{formatDateTime(message.date)}</td>
                <td className={getMessageClass(message.category)} style={{ color: getMessageColor(message.category) }}>
                  {renderMessageText(message)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="table-empty">
                No messages found for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
