import logging
import openai
from app.core.config import settings # Import settings

logger = logging.getLogger(__name__)

# Implement the LLMClient class
class LLMClient:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not found in settings. LLMClient will not function.")
            self.client = None
        else:
            api_key = settings.OPENAI_API_KEY.get_secret_value() if hasattr(settings.OPENAI_API_KEY, 'get_secret_value') else settings.OPENAI_API_KEY
            try:
                # Use AsyncOpenAI for async method
                self.client = openai.AsyncOpenAI(api_key=api_key)
                logger.info("Async OpenAI client initialized.")
            except Exception as e:
                 logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
                 self.client = None

    async def generate_synthesis(self, prompt: str, model: str = "gpt-3.5-turbo", max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Generates text using the configured LLM."""
        if not self.client:
            logger.error("LLMClient not initialized or API key missing. Cannot generate synthesis.")
            return "Error: LLM Client not configured."

        try:
            logger.debug(f"Sending prompt to LLM (model: {model}, max_tokens: {max_tokens}):\n{prompt[:200]}...")
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an epistemic alchemist assisting in conceptual synthesis."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            generated_text = response.choices[0].message.content.strip()
            logger.debug("LLM response received successfully.")
            return generated_text
        except openai.APIError as e:
            logger.error(f"OpenAI API returned an API Error: {e}", exc_info=True)
            return f"Error: OpenAI API Error - {e}"
        except openai.APIConnectionError as e:
             logger.error(f"Failed to connect to OpenAI API: {e}", exc_info=True)
             return f"Error: OpenAI Connection Error - {e}"
        except openai.RateLimitError as e:
             logger.error(f"OpenAI API request exceeded rate limit: {e}", exc_info=True)
             return f"Error: OpenAI Rate Limit Error - {e}"
        except Exception as e:
            logger.error(f"Unexpected error during LLM generation: {e}", exc_info=True)
            return f"Error: Unexpected error during generation - {e}"

# Note: The old get_llm_completion function and test block are implicitly removed
# because they are not included in this edit block and there's no
# '// ... existing code ...' comment after the LLMClient class definition. 