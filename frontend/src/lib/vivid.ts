import type { TraitId } from '@/types'

export const VIVID = {
  title: 'VIVID: A Culturally Grounded Benchmark Exposing the Figurative Language Gap in Vietnamese NLP',
  expansion: 'Vietnamese Idioms for Validation and Interpretation Depth',
  authors: ['Tu Tran Do', 'Nhat Ngoc Nguyen', 'Khanh-Tung Tran', 'Hoang D. Nguyen', 'Tu Minh Phuong', 'Long Hoang Dang'],
  affiliations: 'Học viện Công nghệ Bưu chính Viễn thông (PTIT) · University College Cork',
  venue: 'LREC 2026',
  arxiv: 'arXiv:2608.03095',
  arxivUrl: 'https://arxiv.org/abs/2608.03095',
  repoUrl: 'https://github.com/ReML-AI/VIVID',
  license: 'MIT',
  shortCite: 'Do et al., LREC 2026',
  collectedPairs: 2254,
  releasedPairs: 1636,
  judgeKappa: 0.792,
  humanKappa: 0.913,
}

// Table 1 of the paper: judge prompting strategies against human ratings (mean 3.47)
export const JUDGE_STRATEGIES = [
  { name: 'Zero-shot', mean: 3.4, kappa: 0.774 },
  { name: 'Chain-of-Thought', mean: 3.7, kappa: 0.786 },
  { name: 'Demonstration', mean: 3.44, kappa: 0.783 },
  { name: 'Aspect-based', mean: 3.49, kappa: 0.792 },
]

// Table 3 of the paper: mean explanation score (0–5) over all topics
export const MODEL_RESULTS = [
  { model: 'GPT-4o', group: 'API', zeroShot: 2.46, fewShot: 2.04 },
  { model: 'Gemini Flash 2.5', group: 'API', zeroShot: 2.29, fewShot: 2.6 },
  { model: 'Qwen-3-14B', group: 'Đa ngôn ngữ', zeroShot: 1.09, fewShot: 1.12 },
  { model: 'Llama-4-Scout', group: 'Đa ngôn ngữ', zeroShot: 0.91, fewShot: 1.24 },
  { model: 'Llama-SEA-LION-v3-8B', group: 'Đa ngôn ngữ', zeroShot: 0.58, fewShot: 0.65 },
  { model: 'GreenMind-14B', group: 'Tiếng Việt', zeroShot: 1.09, fewShot: 1.02 },
  { model: 'Vistral-7B', group: 'Tiếng Việt', zeroShot: 0.35, fewShot: 0.7 },
  { model: 'VinaLLaMA-7B', group: 'Tiếng Việt', zeroShot: 0.13, fewShot: 0.24 },
]

// Table 4 of the paper, zero-shot: the two strongest models per complexity trait
export const TRAIT_RESULTS: { trait: TraitId; gpt4o: number; gemini: number }[] = [
  { trait: 'literal', gpt4o: 2.43, gemini: 1.7 },
  { trait: 'sino_vietnamese', gpt4o: 2.86, gemini: 3.04 },
  { trait: 'uncommon_vocab', gpt4o: 2.33, gemini: 2.3 },
  { trait: 'folk_knowledge', gpt4o: 2.39, gemini: 2.15 },
  { trait: 'pragmatic', gpt4o: 2.44, gemini: 2.19 },
]
