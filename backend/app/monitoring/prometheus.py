from prometheus_client import CONTENT_TYPE_LATEST, REGISTRY, generate_latest


def metrics_payload() -> tuple[bytes, str]:
	"""Return the current Prometheus exposition payload and content type."""
	return generate_latest(REGISTRY), CONTENT_TYPE_LATEST
