import google.generativeai as genai
from app.core.config import settings
from .base import LLMClient  # Assuming base class is in base.py

class GeminiLLMClient(LLMClient):
    """LLM Client implementation using Google Gemini."""
    def __init__(self):
        """
        Initializes the Gemini client using the API key from settings.
        Raises ValueError if the key is not found.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in the environment or .env file.")
        genai.configure(api_key=api_key)
        # TODO: Consider making the model name configurable
        self.model = genai.GenerativeModel("gemini-1.5-flash") # Using 1.5 flash as default

    async def generate_synthesis(self, prompt: str) -> str:
        """
        Generates synthesis text using the configured Gemini model.

        Args:
            prompt: The input prompt for the LLM.

        Returns:
            The generated text content as a string.

        Raises:
            Exception: If the API call fails.
        """
        try:
            # Note: Using generate_content_async for non-streaming
            resp = await self.model.generate_content_async(prompt)
            # Accessing text safely, ensuring parts exist
            if resp.parts:
                 # Check if the first part has text attribute
                if hasattr(resp.parts[0], 'text'):
                    return resp.parts[0].text.strip()
                else:
                    # Handle cases where the part might not contain text (e.g., function calls, safety blocks)
                    # Log the response for debugging
                    print(f"Warning: Gemini response part did not contain text: {resp.parts[0]}")
                    return "" # Return empty string or handle as appropriate
            else:
                # Handle cases where the response might be blocked or empty
                # Log the response for debugging
                print(f"Warning: Gemini response contained no parts. Response: {resp}")
                # Consider checking resp.prompt_feedback for safety ratings/blocks
                if resp.prompt_feedback and resp.prompt_feedback.block_reason:
                    print(f"Prompt blocked due to: {resp.prompt_feedback.block_reason}")
                    return f"Error: Content generation blocked ({resp.prompt_feedback.block_reason})."
                return "" # Return empty string if no parts and not explicitly blocked
        except Exception as e:
            # Log the error for diagnostics
            print(f"Error during Gemini API call: {e}")
            # Re-raise or return an error message
            raise Exception(f"Gemini API call failed: {e}") from e

    async def generate_embedding(self, text: str) -> list[float]:
        """Generates embeddings using the Gemini API (requires a text-embedding model)."""
        try:
            # Ensure the model supports embedding or use a specific embedding model
            # Example uses 'text-embedding-004', check available models
            result = await genai.embed_content_async(
                model="models/text-embedding-004", # Or another appropriate embedding model
                content=text,
                task_type="RETRIEVAL_DOCUMENT" # Adjust task_type as needed (e.g., SEMANTIC_SIMILARITY)
            )
            return result['embedding']
        except Exception as e:
            print(f"Error during Gemini embedding API call: {e}")
            raise Exception(f"Gemini embedding API call failed: {e}") from e 