from prometheus_client import Counter, Gauge, Histogram


OLLAMA_CHAT_REQUESTS = Counter(
	"mhc_ollama_chat_requests_total",
	"Total Ollama chat requests by outcome",
	("model", "status"),
)

OLLAMA_CHAT_DURATION = Histogram(
	"mhc_ollama_chat_duration_seconds",
	"Time spent waiting for Ollama chat responses",
	("model",),
)

OLLAMA_INPUT_TOKENS = Counter(
	"mhc_ollama_input_tokens_total",
	"Total prompt tokens reported by Ollama",
	("model",),
)

OLLAMA_OUTPUT_TOKENS = Counter(
	"mhc_ollama_output_tokens_total",
	"Total generated tokens reported by Ollama",
	("model",),
)

OLLAMA_PROMPT_EVAL_DURATION = Histogram(
	"mhc_ollama_prompt_eval_duration_seconds",
	"Ollama prompt evaluation duration",
	("model",),
)

OLLAMA_EVAL_DURATION = Histogram(
	"mhc_ollama_eval_duration_seconds",
	"Ollama generated-token evaluation duration",
	("model",),
)

OLLAMA_LOAD_DURATION = Histogram(
	"mhc_ollama_load_duration_seconds",
	"Ollama model load duration",
	("model",),
)

OLLAMA_EMBED_REQUESTS = Counter(
	"mhc_ollama_embedding_requests_total",
	"Total Ollama embedding requests by outcome",
	("model", "status"),
)

OLLAMA_EMBED_DURATION = Histogram(
	"mhc_ollama_embedding_duration_seconds",
	"Time spent waiting for Ollama embeddings",
	("model",),
)

OLLAMA_AVAILABLE = Gauge(
	"mhc_ollama_available",
	"Whether Ollama was reachable during the last provider health check",
	("model",),
)


def observe_seconds(value_ns: object, metric: Histogram, model: str) -> None:
	"""Record an Ollama nanosecond duration when the API returned one."""
	if isinstance(value_ns, (int, float)) and value_ns >= 0:
		metric.labels(model=model).observe(value_ns / 1_000_000_000)
