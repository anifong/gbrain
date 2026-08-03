import type { Recipe } from '../types.ts';

/**
 * Compat fetch: OpenAI-compatible proxies are expected to default to
 * non-streaming (JSON) responses when the request body omits `stream`,
 * but some gateways (e.g. OmniRoute) default /chat/completions to SSE
 * unless told otherwise — which breaks the AI SDK's JSON response handler
 * ("Invalid JSON response"). Inject `Accept: application/json` when the
 * caller didn't already declare an Accept header, so the proxy returns
 * JSON for non-streaming calls. Streaming callers set `stream: true` in
 * the body (and usually `Accept: text/event-stream`), which the proxy
 * honors regardless, so this is a no-op for them. Fail-open: requests that
 * already carry an Accept header pass through untouched.
 *
 * @internal exported for tests. Cast through `unknown` because TS's
 * `typeof fetch` includes a `preconnect` member (matches openrouter.ts).
 */
export const litellmCompatFetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const headers = new Headers(init?.headers as any);
  if (headers.has('Accept')) {
    return fetch(input as any, init as any);
  }
  headers.set('Accept', 'application/json');
  return fetch(input as any, { ...(init as any), headers });
}) as typeof fetch;

/**
 * LiteLLM proxy template. Users run LiteLLM in front of any provider
 * (Bedrock, Vertex, Azure, Fireworks, Together, DeepSeek, etc.) and point
 * gbrain at it via `LITELLM_BASE_URL`. The proxy normalizes to
 * OpenAI-compatible API.
 *
 * See docs/integrations/embedding-providers.md for the setup recipe.
 */
export const litellmProxy: Recipe = {
  id: 'litellm',
  name: 'LiteLLM Proxy (universal)',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'http://localhost:4000', // LiteLLM default
  auth_env: {
    required: [], // LITELLM_API_KEY is optional (users may run proxy unauthenticated locally)
    optional: ['LITELLM_BASE_URL', 'LITELLM_API_KEY'],
    setup_url: 'https://docs.litellm.ai/docs/proxy/quick_start',
  },
  touchpoints: {
    embedding: {
      // Models depend on the proxy's config; declare empties so wizard prompts user.
      models: [],
      user_provided_models: true, // v0.32 D8=A wire-through for the litellm hardcode
      default_dims: 0, // user must declare --embedding-dimensions explicitly
      trust_custom_dims: true, // #2271: proxy-backed model dim is user-declared
      cost_per_1m_tokens_usd: undefined,
      price_last_verified: '2026-04-20',
      // LiteLLM's batch capacity is determined by the backend it proxies;
      // no static cap to declare here. v0.32 (#779).
      no_batch_cap: true,
      // v0.34.1 (#875): LiteLLM can forward to multimodal providers (OpenAI,
      // Gemini, Voyage etc.). embedMultimodal routes openai-compatible
      // recipes through embedMultimodalOpenAICompat() — same /embeddings
      // endpoint as text, with content arrays carrying image_base64
      // entries. No multimodal_models allow-list: the user knows which of
      // their proxied models support multimodal; we trust the model id and
      // surface the provider's rejection (D12 dim-validation catches
      // mismatched-dim responses pre-storage).
      supports_multimodal: true,
    },
    expansion: {
      models: [],
      cost_per_1m_tokens_usd: undefined,
      price_last_verified: '2026-06-14',
    },
    chat: {
      models: [],
      supports_tools: true,
      supports_subagent_loop: true,
      supports_prompt_cache: false,
      max_context_tokens: 200_000,
      cost_per_1m_input_usd: undefined,
      cost_per_1m_output_usd: undefined,
      price_last_verified: '2026-06-14',
    },
  },
  setup_hint: 'Run LiteLLM (https://docs.litellm.ai) in front of any provider; set LITELLM_BASE_URL (include the /v1 suffix if your proxy serves the OpenAI route there, e.g. http://localhost:4000/v1) + pass --embedding-model litellm:<model> and --embedding-dimensions <N>.',
  compat: { fetch: litellmCompatFetch },
};
