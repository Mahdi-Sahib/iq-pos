/**
 * ApexPOS Enterprise - Transactional Outbox & Sync Contract Engine
 * 
 * Rules:
 * - Uses time-ordered UUIDv7 identifiers.
 * - Outbox events must be generated atomically with the local business entity.
 * - Idempotency key prevents duplicate execution on sync.
 */

import { OutboxEvent } from './types.ts';

/**
 * Fast RFC 9562 compliant UUIDv7 generator (timestamp millisecond prefix + random bits)
 */
export function generateUUIDv7(): string {
  const now = Date.now();
  // 48-bit timestamp
  const timestampHex = now.toString(16).padStart(12, '0');
  
  // random bits
  const rand1 = Math.floor(Math.random() * 0x1000).toString(16).padStart(3, '0');
  const rand2 = Math.floor(Math.random() * 0x4000 + 0x8000).toString(16).padStart(4, '0');
  const rand3 = Array.from({ length: 3 }, () => 
    Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  ).join('');

  // 8-4-4-4-12 format with version 7 and variant 10xx
  const part1 = timestampHex.slice(0, 8);
  const part2 = timestampHex.slice(8, 12);
  const part3 = `7${rand1}`;
  const part4 = rand2;
  const part5 = rand3;

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export class OutboxEngine {
  static createEvent(params: {
    aggregateType: 'Order' | 'Payment' | 'Customer' | 'Shift' | 'Inventory';
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    idempotencyKey?: string;
  }): OutboxEvent {
    const eventId = generateUUIDv7();
    const idempotencyKey = params.idempotencyKey || `idemp-${params.aggregateType}-${params.aggregateId}-${eventId.slice(-8)}`;

    return {
      id: eventId,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      payload: params.payload,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
      idempotencyKey,
    };
  }

  static markSynced(event: OutboxEvent): OutboxEvent {
    return {
      ...event,
      status: 'synced',
    };
  }

  static markFailed(event: OutboxEvent): OutboxEvent {
    return {
      ...event,
      status: 'failed',
      retryCount: event.retryCount + 1,
    };
  }
}
