export interface ModuleEvent {
  type: string;
  payload: unknown;
  sourceInstanceId: string;
  targetInstanceId?: string;
}

export type EventHandler = (event: ModuleEvent) => void;
