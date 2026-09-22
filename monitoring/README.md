# Local Ollama monitoring

Start the monitoring stack with:

```sh
docker compose up --build backend prometheus grafana
```

Open Grafana at `http://localhost:3001`. The `MHC Ollama Usage` dashboard is provisioned automatically. Prometheus is available at `http://localhost:9090`.

The dashboard tracks usage reported by Ollama itself:

- request volume and outcomes
- prompt and generated token throughput
- chat latency
- prompt evaluation, generation, and model-load time
- Ollama availability

Ollama's API does not expose host CPU, memory, or GPU utilization in chat responses. Those device metrics require a host exporter, such as `windows_exporter` on Windows or a GPU exporter for the installed GPU, and can be added as a separate Prometheus target later. The current dashboard intentionally does not label model usage as host-device utilization.
