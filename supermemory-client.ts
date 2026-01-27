/**
 * Supermemory API Client (v3)
 *
 * Wraps the Supermemory REST API for memory storage and search.
 * API docs: https://supermemory.ai/docs/api-reference
 */

import type {
  SupermemoryAddResponse,
  SupermemorySearchResponse,
  SupermemorySearchResult,
} from "./types.js";

export type SupermemoryClientOptions = {
  apiKey: string;
  baseUrl?: string;
};

export class SupermemoryClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: SupermemoryClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.supermemory.ai";
  }

  /**
   * Add content to long-term memory.
   * POST /v3/documents
   */
  async add(params: {
    content: string;
    containerTag?: string;
    metadata?: Record<string, unknown>;
    customId?: string;
  }): Promise<SupermemoryAddResponse> {
    const url = new URL("/v3/documents", this.baseUrl);

    const body: Record<string, unknown> = { content: params.content };
    if (params.containerTag) {
      // containerTags is an array in v3 API
      body.containerTags = [params.containerTag];
    }
    if (params.metadata) {
      body.metadata = params.metadata;
    }
    if (params.customId) {
      body.customId = params.customId;
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supermemory add failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<SupermemoryAddResponse>;
  }

  /**
   * Search memories for a given query.
   * POST /v3/search
   */
  async search(params: {
    q: string;
    containerTag?: string;
    limit?: number;
    chunkThreshold?: number;
    rewriteQuery?: boolean;
  }): Promise<SupermemorySearchResult[]> {
    const url = new URL("/v3/search", this.baseUrl);

    const body: Record<string, unknown> = { q: params.q };
    if (params.containerTag) {
      body.containerTags = [params.containerTag];
    }
    if (params.limit !== undefined) {
      body.limit = params.limit;
    }
    if (params.chunkThreshold !== undefined) {
      body.chunkThreshold = params.chunkThreshold;
    }
    if (params.rewriteQuery !== undefined) {
      body.rewriteQuery = params.rewriteQuery;
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supermemory search failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as SupermemorySearchResponse;

    // Flatten chunks from all documents into search results
    const results: SupermemorySearchResult[] = [];
    for (const doc of data.results ?? []) {
      for (const chunk of doc.chunks ?? []) {
        results.push({
          id: doc.documentId,
          content: chunk.content,
          score: chunk.score,
          metadata: doc.metadata,
        });
      }
    }

    return results;
  }
}
