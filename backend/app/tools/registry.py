import logging
from typing import Dict, Any, List, Optional
from app.tools.base import BaseTool, ToolResult
from app.tools.calculator import CalculatorTool
from app.tools.web_search import WebSearchTool
from app.tools.wikipedia import WikipediaTool
from app.tools.image_generation import ImageGenerationTool
from app.tools.image_search import ImageSearchTool

logger = logging.getLogger(__name__)

class ToolRegistry:
    """
    Central Tool Registry for PML AI System.
    Manages registration, schema export, and execution of AI tools.
    """
    _instance: Optional["ToolRegistry"] = None

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    @classmethod
    def get_instance(cls) -> "ToolRegistry":
        if cls._instance is None:
            cls._instance = ToolRegistry()
        return cls._instance

    def register_tool(self, tool: BaseTool) -> None:
        """Registers a new tool instance in the registry."""
        self._tools[tool.name] = tool
        logger.info(f"[PML Tool Registry] Registered tool: '{tool.name}'")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Retrieves a registered tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[BaseTool]:
        """Lists all registered tools."""
        return list(self._tools.values())

    def get_openai_tools_schema(self) -> List[Dict[str, Any]]:
        """Exports OpenAI function call tools array."""
        return [tool.to_openai_function_spec() for tool in self._tools.values()]

    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> ToolResult:
        """Safely executes a tool by name with arguments."""
        tool = self.get_tool(tool_name)
        if not tool:
            error_msg = f"Tool '{tool_name}' is not registered in PML Tool Registry."
            logger.error(f"[PML Tool Registry] {error_msg}")
            return ToolResult(
                success=False,
                data=None,
                error=error_msg,
                formatted_output=f"TOOL ERROR: {error_msg}"
            )

        logger.info(f"[PML Tool] Executing tool '{tool_name}' with args: {arguments}")
        try:
            result = await tool.execute(**arguments)
            logger.info(f"[PML Tool] Tool '{tool_name}' finished. Success={result.success}")
            return result
        except Exception as err:
            logger.error(f"[PML Tool] Tool '{tool_name}' failed with exception: {err}")
            return ToolResult(
                success=False,
                data=None,
                error=str(err),
                formatted_output=f"TOOL EXECUTION EXCEPTION in '{tool_name}': {str(err)}"
            )

    def _register_default_tools(self):
        """Registers default core tools: web_search, calculator, wikipedia_search, and generate_image."""
        self.register_tool(WebSearchTool())
        self.register_tool(CalculatorTool())
        self.register_tool(WikipediaTool())
        self.register_tool(ImageGenerationTool())
        self.register_tool(ImageSearchTool())


# Global Singleton Accessor
tool_registry = ToolRegistry.get_instance()
