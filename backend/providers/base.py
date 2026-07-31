"""
backend/providers/base.py
Abstract base class for AI providers.
"""
from __future__ import annotations
import json
from abc import ABC, abstractmethod
from backend.api.core.models import Job, ProviderResult, ValidationEntry


class BaseProvider(ABC):
    """All AI providers must implement this interface."""

    name: str = "Base"

    def __init__(
        self,
        api_key: str,
        model: str,
        timeout: int = 60,
        max_retries: int = 3,
        enable_web_search: bool = True,
        temperature: float = 0.1,
        top_k: int = 40,
        top_p: float = 0.95,
    ) -> None:
        self.api_key           = api_key
        self.model             = model
        self.timeout           = timeout
        self.max_retries       = max_retries
        self.enable_web_search = enable_web_search
        self.temperature       = temperature
        self.top_k             = top_k
        self.top_p             = top_p

    @abstractmethod
    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
    ) -> ProviderResult:
        """Query the provider for ALL attributes of a single ASIN in one call."""
        ...

    @abstractmethod
    def test_connection(self) -> tuple[bool, str]:
        """Ping the provider to verify the API key is valid."""
        ...

    def _build_prompt(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
    ) -> str:
        """Build a structured batched JSON prompt for the AI."""
        lines = []
        lines.append("You are an Amazon product data specialist.")
        lines.append("Search the web for information about this Amazon product and extract the requested attributes.\n")
        
        context = {
            "ASIN": job.asin,
        }
        if job.product_type:
            context["Product Type"] = job.product_type
        if job.brand:
            context["Brand"] = job.brand
        if job.title:
            context["Title"] = job.title
        if job.barcode:
            context["Barcode"] = job.barcode
        if job.description:
            context["Description"] = job.description

        lines.append("=" * 60)
        lines.append("PRODUCT CONTEXT (JSON):")
        lines.append("=" * 60)
        lines.append(json.dumps(context, indent=2, ensure_ascii=False))

        lines.append("")
        lines.append("=" * 60)
        lines.append("ATTRIBUTES TO EXTRACT:")
        lines.append("=" * 60)

        schema: dict[str, object] = {}
        for attr_id in job.attributes:
            entry = validation_map.get(attr_id)
            label = attr_id.replace("_", " ").title()

            if entry and not entry.is_free_text and entry.allowed_values:
                allowed_json = json.dumps(entry.allowed_values, ensure_ascii=False)
                lines.append(
                    f"\n[{attr_id}]\n"
                    f"  Type: DROPDOWN\n"
                    f"  Instruction: You MUST pick EXACTLY ONE value from this list (case-sensitive). "
                    f"Do NOT invent values outside the list.\n"
                    f"  Allowed Values: {allowed_json}"
                )
                schema[attr_id] = "<one value from Allowed Values>"

            elif entry and entry.is_free_text:
                guidance = entry.tooltip if entry.tooltip else f"Provide the {label} for this product."
                lines.append(
                    f"\n[{attr_id}]\n"
                    f"  Type: FREE TEXT\n"
                    f"  Instruction: {guidance}\n"
                    f"  Respond with a concise value — one short phrase or sentence maximum."
                )
                schema[attr_id] = "<free text value>"

            else:
                lines.append(
                    f"\n[{attr_id}]\n"
                    f"  Type: FREE TEXT\n"
                    f"  Instruction: Provide the {label} for this product."
                )
                schema[attr_id] = "<free text value>"

        if not job.title:
            lines.append(
                f"\n[_extracted_title]\n"
                f"  Type: FREE TEXT\n"
                f"  Instruction: Provide the exact full title of this Amazon product based on your search.\n"
            )
            schema["_extracted_title"] = "<free text title>"

        lines.append("")
        lines.append("=" * 60)
        lines.append("OUTPUT FORMAT (STRICT JSON — NO MARKDOWN, NO EXPLANATION):")
        lines.append("=" * 60)
        lines.append(
            "Return ONLY a valid JSON object with exactly these keys. "
            "Do not include any text before or after the JSON.\n"
        )
        lines.append(json.dumps(schema, indent=2, ensure_ascii=False))

        return "\n".join(lines)
