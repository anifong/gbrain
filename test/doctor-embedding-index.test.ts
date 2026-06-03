import { describe, expect, test } from 'bun:test';
import { hnswIndexStatusForEmbeddingColumn } from '../src/commands/doctor.ts';

describe('doctor embedding column HNSW index status', () => {
  test('does not warn when vector dimensions exceed pgvector HNSW limits', () => {
    const status = hnswIndexStatusForEmbeddingColumn({
      engineKind: 'postgres',
      column: 'embedding',
      type: 'vector',
      dimensions: 2560,
      hasIndex: false,
    });

    expect(status.status).toBe('ok');
    expect(status.message).toContain('HNSW unsupported for 2560 dimensions');
    expect(status.message).not.toContain('CREATE INDEX');
  });

  test('warns when a supported-dimension Postgres vector lacks HNSW', () => {
    const status = hnswIndexStatusForEmbeddingColumn({
      engineKind: 'postgres',
      column: 'embedding',
      type: 'vector',
      dimensions: 1536,
      hasIndex: false,
    });

    expect(status.status).toBe('warn');
    expect(status.message).toContain('no HNSW index');
    expect(status.message).toContain('CREATE INDEX');
  });
});
