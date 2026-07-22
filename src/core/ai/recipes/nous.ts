import type { Recipe } from '../types.ts';

/**
 * Nous Portal — OpenAI-compatible inference API from Nous Research.
 * One key, 265+ models (Claude, Gemini, Qwen, Grok, DeepSeek, etc.).
 * Requires a Nous Portal subscription key.
 *
 * Chat: `/v1/chat/completions` proxies every model Nous Portal routes,
 * with tool-calling per-model. The chat models list below is a curated
 * entry point — `supports_tools: true` reflects the API's tool-call
 * envelope, not every individual model's capability.
 *
 * Embeddings: `/v1/embeddings` via the openai-compat tier.
 */
export const nous: Recipe = {
  id: 'nous',
  name: 'Nous Portal',
  tier: 'openai-compat',
  implementation: 'openai-compatible',
  base_url_default: 'https://inference-api.nousresearch.com/v1',
  auth_env: {
    required: ['NOUS_API_KEY'],
    setup_url: 'https://portal.nousresearch.com',
  },
  touchpoints: {
    chat: {
      models: [
        'openai/gpt-4o-mini',
        'openai/gpt-5.2',
        'anthropic/claude-sonnet-4.6',
        'google/gemini-3-flash-preview',
        'qwen/qwen3.7-plus',
        'deepseek/deepseek-v4',
        'x-ai/grok-4.3',
        'nvidia/nemotron-3-ultra-550b-a55b',
      ],
      supports_tools: true,
      supports_subagent_loop: false,
      supports_prompt_cache: false,
      max_context_tokens: 200000,
      cost_per_1m_input_usd: 0.15,
      cost_per_1m_output_usd: 0.60,
      price_last_verified: '2026-06-15',
    },
    embedding: {
      models: [],
      user_provided_models: true,
      default_dims: 1536,
      cost_per_1m_tokens_usd: 0.02,
      price_last_verified: '2026-06-15',
    },
  },
  setup_hint: 'Get an API key at https://portal.nousresearch.com, then `export NOUS_API_KEY=...`',
};
