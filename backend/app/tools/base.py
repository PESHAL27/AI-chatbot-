from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class ToolResult(BaseModel):
    success: bool
    data: Any
    error: Optional[str] = None
    formatted_output: str

class BaseTool(ABC):
    """
    Abstract Base Class for all PML AI Tools.
    Every tool defines its name, description, JSON schema for arguments,
    and a safe execution method.
    """
    name: str
    description: str
    parameters_schema: Dict[str, Any]
    is_safe: bool = True
    requires_auth: bool = False

    def to_openai_function_spec(self) -> Dict[str, Any]:
        """Returns the OpenAI Function Call schema representation."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema
            }
        }

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Executes tool logic and returns a structured ToolResult."""
        pass
