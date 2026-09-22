import unittest

from app.ollama_provider import OllamaProvider


class FakeResponse:
    status_code = 200

    def json(self):
        return {
            "model": "asa",
            "created_at": "2026-09-17T00:00:00Z",
            "message": {"role": "assistant", "content": "A short response."},
            "prompt_eval_count": 12,
            "prompt_eval_duration": 1_000_000,
            "eval_count": 7,
            "eval_duration": 2_000_000,
            "load_duration": 500_000,
            "total_duration": 4_000_000,
        }


class FakeClient:
    async def post(self, path, json, timeout):
        self.path = path
        self.payload = json
        return FakeResponse()


class OllamaMonitoringTests(unittest.IsolatedAsyncioTestCase):
    async def test_chat_preserves_ollama_usage_metadata(self):
        provider = OllamaProvider(model="asa")
        provider.client = FakeClient()
        provider.is_initialized = True

        result = await provider.chat([{"role": "user", "content": "Hello"}])

        self.assertEqual(result.model_name, "asa")
        self.assertEqual(result.input_tokens, 12)
        self.assertEqual(result.output_tokens, 7)
        self.assertEqual(result.metadata["eval_count"], 7)


if __name__ == "__main__":
    unittest.main()
