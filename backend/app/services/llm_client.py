import logging
from abc import ABC, abstractmethod
import openai
from app.core.config import settings
import google.generativeai as genai
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

class LLMClient(ABC):
    """Abstract Base Class for Language Model Clients."""

    @abstractmethod
    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generates text synchronously based on the prompt."""
        pass

    @abstractmethod
    async def agenerate_text(self, prompt: str, **kwargs) -> str:
        """Generates text asynchronously based on the prompt."""
        pass

    # Add other common methods if needed, e.g., embeddings, chat completions

class MockLLMClient(LLMClient):
    """A basic mock implementation of the LLMClient for testing/placeholder purposes."""

    def generate_text(self, prompt: str, **kwargs) -> str:
        logger.debug(f"MockLLMClient generating text for prompt: {prompt[:50]}... (kwargs: {kwargs})")
        return f"Mock LLM Response for: {prompt[:50]}..."

    async def agenerate_text(self, prompt: str, **kwargs) -> str:
        logger.debug(f"MockLLMClient generating text async for prompt: {prompt[:50]}... (kwargs: {kwargs})")
        # Simulate async operation if needed, e.g., await asyncio.sleep(0.1)
        return f"Mock LLM Response (async) for: {prompt[:50]}..."

# Real implementation using OpenAI
class OpenAILLMClient(LLMClient):
    """Client for interacting with OpenAI's API."""
    def __init__(self):
        # Initialize the OpenAI client using the API key from settings
        try:
            self.client = openai.OpenAI(api_key=settings.openai_api_key)
            logger.info("Initialized OpenAI LLM Client.")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
            # Handle initialization failure appropriately - maybe raise error or set client to None
            self.client = None
            raise ConnectionError("Failed to initialize OpenAI client. Check API key and configuration.") from e

    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generates text using the OpenAI API (synchronous)."""
        if not self.client:
            logger.error("OpenAI client not initialized.")
            return "Error: OpenAI client not available."

        try:
            # Default model if not provided in kwargs
            model = kwargs.get("model", "gpt-3.5-turbo")
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                **{k: v for k, v in kwargs.items() if k != 'model'} # Pass remaining kwargs
            )
            # Extract the text content from the first choice
            if response.choices:
                return response.choices[0].message.content.strip()
            else:
                logger.warning(f"OpenAI response for prompt '{prompt[:50]}...' had no choices.")
                return ""
        except Exception as e:
            logger.error(f"Error during OpenAI text generation: {e}", exc_info=True)
            return f"Error during generation: {e}"

    async def agenerate_text(self, prompt: str, **kwargs) -> str:
        """Generates text using the OpenAI API (asynchronous)."""
        if not self.client:
            logger.error("OpenAI client not initialized.")
            return "Error: OpenAI client not available."

        try:
            # Default model if not provided in kwargs
            model = kwargs.get("model", "gpt-3.5-turbo")
            # Note: The standard OpenAI client does not have an async version of chat.completions.create directly.
            # You would typically use an async library like httpx or run the sync call in a threadpool.
            # For simplicity, we'll run the synchronous call in a threadpool here.
            # Alternatively, consider using the `AsyncOpenAI` client if you add `openai` with `httpx` extras.

            def sync_completion():
                return self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    **{k: v for k, v in kwargs.items() if k != 'model'}
                )

            response = await run_in_threadpool(sync_completion)

            if response.choices:
                return response.choices[0].message.content.strip()
            else:
                logger.warning(f"OpenAI async response for prompt '{prompt[:50]}...' had no choices.")
                return ""
        except Exception as e:
            logger.error(f"Error during async OpenAI text generation: {e}", exc_info=True)
            return f"Error during async generation: {e}"

    async def generate_synthesis(self, prompt: str) -> str:
        """Generates synthesis using the OpenAI API (asynchronous)."""
        # This is similar to agenerate_text, potentially with different default params if needed
        # For now, mirrors the behavior but uses standard synthesis defaults
        # Uses run_in_threadpool as AsyncOpenAI requires httpx dependency.
        if not self.client:
            logger.error("OpenAI client not initialized.")
            return "Error: OpenAI client not available."
        try:
            # Use appropriate model and parameters for synthesis
            model = "gpt-3.5-turbo" # Or configure this
            temperature = 0.7
            max_tokens = 512

            def sync_completion():
                return self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

            response = await run_in_threadpool(sync_completion)

            if response.choices:
                return response.choices[0].message.content.strip()
            else:
                logger.warning(f"OpenAI synthesis response for prompt '{prompt[:50]}...' had no choices.")
                return ""
        except Exception as e:
            logger.error(f"Error during OpenAI synthesis generation: {e}", exc_info=True)
            return f"Error during synthesis generation: {e}"

# New Gemini Client Implementation
class GeminiLLMClient(LLMClient):
    """Client for interacting with Google's Generative AI API (Gemini)."""
    def __init__(self):
        self.model = None # Initialize model as None
        try:
            genai.configure(api_key=settings.google_api_key)
            # Initialize the generative model (e.g., gemini-1.5-flash-latest or gemini-pro)
            self.model = genai.GenerativeModel('gemini-1.5-flash-latest')
            logger.info("Initialized Google Generative AI (Gemini) LLM Client.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Generative AI client: {e}", exc_info=True)
            # Raise a ConnectionError if initialization fails
            raise ConnectionError("Failed to initialize Gemini client. Check API key and configuration.") from e

    def generate_text(self, prompt: str, **kwargs) -> str:
        """Generates text using the Gemini API (synchronous)."""
        if not self.model:
            logger.error("Gemini client not initialized.")
            return "Error: Gemini client not available."

        try:
            # Generate content using the model
            response = self.model.generate_content(prompt, **kwargs)
            # Extract the text from the response
            if response.text:
                return response.text.strip()
            else:
                logger.warning(f"Gemini response for prompt '{prompt[:50]}...' had no text content.")
                return "" # Or raise an error, depending on desired behavior
        except Exception as e:
            logger.error(f"Error during Gemini text generation: {e}", exc_info=True)
            return f"Error during Gemini generation: {e}"

    async def agenerate_text(self, prompt: str, **kwargs) -> str:
        """Generates text using the Gemini API (asynchronous)."""
        if not self.model:
            logger.error("Gemini client not initialized.")
            return "Error: Gemini client not available."

        try:
            # Use generate_content_async for asynchronous calls
            response = await self.model.generate_content_async(prompt, **kwargs)

            if response.text:
                return response.text.strip()
            else:
                logger.warning(f"Gemini async response for prompt '{prompt[:50]}...' had no text content.")
                return ""
        except Exception as e:
            # Fallback or specific error handling for async
            logger.error(f"Error during async Gemini text generation: {e}", exc_info=True)
            # Example: If generate_content_async doesn't work as expected or specific errors occur,
            # you could potentially fall back to run_in_threadpool, but the library should support async.
            # For now, just returning the error.
            return f"Error during async Gemini generation: {e}"
            # # Alternative using run_in_threadpool if generate_content_async is not suitable/available
            # try:
            #     logger.info("Using run_in_threadpool for async Gemini generation.")
            #     sync_response = await run_in_threadpool(self.model.generate_content, prompt, **kwargs)
            #     if sync_response.text:
            #         return sync_response.text.strip()
            #     else:
            #         logger.warning(f"Gemini async (threadpool) response for prompt '{prompt[:50]}...' had no text content.")
            #         return ""
            # except Exception as inner_e:
            #      logger.error(f"Error during async Gemini text generation (threadpool fallback): {inner_e}", exc_info=True)
            #      return f"Error during async Gemini generation (threadpool): {inner_e}"

    async def generate_synthesis(self, prompt: str) -> str:
        """
        Generates synthesis using the Gemini API (asynchronous).
        Mirrors the requested OpenAIClient.generate_synthesis structure.
        """
        if not self.model:
            logger.error("Gemini client not initialized.")
            return "Error: Gemini client not available."
        try:
            # Set generation config (can be passed via kwargs too if needed)
            generation_config = genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=512,
            )
            # Use generate_content_async for asynchronous calls
            response = await self.model.generate_content_async(
                prompt,
                generation_config=generation_config
            )

            if response.text:
                return response.text.strip()
            else:
                # Check if the response was blocked
                try:
                    reason = response.prompt_feedback.block_reason.name
                    reason_message = response.prompt_feedback.block_reason_message
                    logger.warning(f"Gemini synthesis response for prompt '{prompt[:50]}...' was empty. Blocked reason: {reason} - {reason_message}")
                    return f"Error: Content blocked by API - {reason}"
                except (AttributeError, ValueError):
                    # If no block reason, log generic warning
                    logger.warning(f"Gemini synthesis response for prompt '{prompt[:50]}...' had no text content and no block reason.")
                    return "" # Or raise an error, depending on desired behavior

        except Exception as e:
            logger.error(f"Error during async Gemini synthesis generation: {e}", exc_info=True)
            return f"Error during async Gemini synthesis generation: {e}"

# If you were implementing a real client, it might look like this:
# from some_llm_library import Client
# from app.core.config import settings
# class RealLLMClient(LLMClient):
#     def __init__(self, api_key: str):
#         self.client = Client(api_key=api_key)
#         logger.info("Initialized Real LLM Client.")

#     def generate_text(self, prompt: str, **kwargs) -> str:
#         # Actual implementation using self.client
#         response = self.client.completion(prompt=prompt, **kwargs)
#         return response

#     async def agenerate_text(self, prompt: str, **kwargs) -> str:
#         # Actual async implementation
#         response = await self.client.acompletion(prompt=prompt, **kwargs)
#         return response 