export type ConnectionStatus = 'connected' | 'disconnected';

export function getConnectionStatus(): ConnectionStatus {
  return 'disconnected';
}
