import ast
import math
import operator as op
from typing import Dict, Any
from app.tools.base import BaseTool, ToolResult

# Safe operators mapping
SAFE_OPERATORS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
}

# Safe math functions mapping
SAFE_FUNCTIONS = {
    "sqrt": math.sqrt,
    "abs": abs,
    "round": round,
    "pow": pow,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "ceil": math.ceil,
    "floor": math.floor,
}

SAFE_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
}

def _eval_ast(node):
    if isinstance(node, ast.Num):  # Python < 3.8
        return node.n
    elif isinstance(node, ast.Constant):  # Python >= 3.8
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")
    elif isinstance(node, ast.BinOp):
        left = _eval_ast(node.left)
        right = _eval_ast(node.right)
        op_type = type(node.op)
        if op_type in SAFE_OPERATORS:
            return SAFE_OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported binary operator: {op_type.__name__}")
    elif isinstance(node, ast.UnaryOp):
        operand = _eval_ast(node.operand)
        op_type = type(node.op)
        if op_type in SAFE_OPERATORS:
            return SAFE_OPERATORS[op_type](operand)
        raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("Unsupported function call target.")
        func_name = node.func.id.lower()
        if func_name not in SAFE_FUNCTIONS:
            raise ValueError(f"Function '{func_name}' is not allowed in safe calculator.")
        args = [_eval_ast(arg) for arg in node.args]
        return SAFE_FUNCTIONS[func_name](*args)
    elif isinstance(node, ast.Name):
        var_name = node.id.lower()
        if var_name in SAFE_CONSTANTS:
            return SAFE_CONSTANTS[var_name]
        raise ValueError(f"Unknown variable: '{node.id}'")
    else:
        raise ValueError(f"Unsupported AST node type: {type(node).__name__}")


class CalculatorTool(BaseTool):
    """
    Safe Calculator Tool for mathematical evaluation.
    Uses Python AST parsing to strictly evaluate arithmetic expressions without eval().
    """
    name = "calculator"
    description = "Safely evaluates mathematical expressions (e.g. '3847 * 29', '25% of 840' -> '0.25 * 840', 'sqrt(144) + 10'). Use this tool whenever calculation or arithmetic is required."
    parameters_schema = {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Mathematical expression to evaluate (e.g. '3847 * 29', '0.25 * 840', 'pow(2, 10)')."
            }
        },
        "required": ["expression"]
    }

    async def execute(self, expression: str, **kwargs) -> ToolResult:
        try:
            # Clean and normalize mathematical expression
            clean_expr = expression.strip()
            clean_expr = clean_expr.replace("×", "*").replace("÷", "/").replace("^", "**")

            # Handle percentages like "25% of 840" -> "0.25 * 840"
            if "% of" in clean_expr.lower():
                parts = clean_expr.lower().split("% of")
                if len(parts) == 2:
                    pct = float(parts[0].strip()) / 100.0
                    val = parts[1].strip()
                    clean_expr = f"{pct} * {val}"

            # Parse AST
            parsed_ast = ast.parse(clean_expr, mode="eval")
            result_val = _eval_ast(parsed_ast.body)

            # Format result
            if isinstance(result_val, float) and result_val.is_integer():
                result_val = int(result_val)

            formatted = f"Calculation Result for '{expression}': {result_val}"
            return ToolResult(
                success=True,
                data={"expression": expression, "result": result_val},
                formatted_output=formatted
            )
        except Exception as err:
            return ToolResult(
                success=False,
                data={"expression": expression},
                error=f"Calculator Error: {str(err)}",
                formatted_output=f"Calculation Error for '{expression}': {str(err)}"
            )
