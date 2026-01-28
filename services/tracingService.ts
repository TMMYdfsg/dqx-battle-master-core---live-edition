/**
 * Tracing Service for DQX Battle Master Core
 * Provides structured logging and performance tracing
 */

export type TraceLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface TraceEvent {
  id: string;
  timestamp: number;
  level: TraceLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

interface ActiveSpan {
  id: string;
  category: string;
  startTime: number;
  message: string;
}

const MAX_TRACE_EVENTS = 1000;
const traceEvents: TraceEvent[] = [];
const activeSpans: Map<string, ActiveSpan> = new Map();
let isEnabled = true;

const generateId = () => Math.random().toString(36).substring(2, 11);

const formatTimestamp = (ts: number) => {
  const date = new Date(ts);
  return date.toISOString();
};

const addEvent = (event: TraceEvent) => {
  if (!isEnabled) return;
  traceEvents.push(event);
  if (traceEvents.length > MAX_TRACE_EVENTS) {
    traceEvents.shift();
  }
  
  const levelColors: Record<TraceLevel, string> = {
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const color = levelColors[event.level];
  
  console.log(
    `${color}[${event.level}]${reset} [${formatTimestamp(event.timestamp)}] [${event.category}] ${event.message}`,
    event.data ? event.data : '',
    event.duration !== undefined ? `(${event.duration.toFixed(2)}ms)` : ''
  );
};

export const trace = {
  enable: () => { isEnabled = true; },
  disable: () => { isEnabled = false; },
  isEnabled: () => isEnabled,

  debug: (category: string, message: string, data?: Record<string, unknown>) => {
    addEvent({
      id: generateId(),
      timestamp: Date.now(),
      level: 'DEBUG',
      category,
      message,
      data,
    });
  },

  info: (category: string, message: string, data?: Record<string, unknown>) => {
    addEvent({
      id: generateId(),
      timestamp: Date.now(),
      level: 'INFO',
      category,
      message,
      data,
    });
  },

  warn: (category: string, message: string, data?: Record<string, unknown>) => {
    addEvent({
      id: generateId(),
      timestamp: Date.now(),
      level: 'WARN',
      category,
      message,
      data,
    });
  },

  error: (category: string, message: string, data?: Record<string, unknown>) => {
    addEvent({
      id: generateId(),
      timestamp: Date.now(),
      level: 'ERROR',
      category,
      message,
      data,
    });
  },

  /** Start a span to measure duration */
  startSpan: (category: string, message: string): string => {
    const id = generateId();
    activeSpans.set(id, {
      id,
      category,
      startTime: performance.now(),
      message,
    });
    trace.debug(category, `[SPAN_START] ${message}`);
    return id;
  },

  /** End a span and log the duration */
  endSpan: (spanId: string, data?: Record<string, unknown>) => {
    const span = activeSpans.get(spanId);
    if (!span) {
      trace.warn('TRACING', `Span not found: ${spanId}`);
      return;
    }
    const duration = performance.now() - span.startTime;
    activeSpans.delete(spanId);
    addEvent({
      id: spanId,
      timestamp: Date.now(),
      level: 'INFO',
      category: span.category,
      message: `[SPAN_END] ${span.message}`,
      data,
      duration,
    });
  },

  /** Get all trace events */
  getEvents: (): readonly TraceEvent[] => [...traceEvents],

  /** Clear all trace events */
  clear: () => {
    traceEvents.length = 0;
    activeSpans.clear();
  },

  /** Export events as JSON */
  exportJson: (): string => {
    return JSON.stringify(traceEvents, null, 2);
  },

  /** Performance measurement wrapper */
  measure: async <T>(
    category: string,
    message: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const spanId = trace.startSpan(category, message);
    try {
      const result = await fn();
      trace.endSpan(spanId, { success: true });
      return result;
    } catch (error) {
      trace.endSpan(spanId, { success: false, error: String(error) });
      throw error;
    }
  },

  /** Synchronous performance measurement wrapper */
  measureSync: <T>(
    category: string,
    message: string,
    fn: () => T
  ): T => {
    const spanId = trace.startSpan(category, message);
    try {
      const result = fn();
      trace.endSpan(spanId, { success: true });
      return result;
    } catch (error) {
      trace.endSpan(spanId, { success: false, error: String(error) });
      throw error;
    }
  },
};

export default trace;
