import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse, summary="Process Authenticated Chat Message")
async def chat_endpoint(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Receives user prompt messages, validates authentication token,
    and returns AI assistant response tied to current user account.
    """
    try:
        user_id = current_user["id"]
        token = current_user.get("token")
        response = await ChatService.process_chat(
            request=request, 
            user_id=user_id,
            user_token=token
        )
        return response
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred: {str(err)}"
        )

@router.post("/chat/stream", summary="Stream Authenticated Chat Message with SSE")
async def chat_stream_endpoint(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Streams AI response progressively with Server-Sent Events (SSE) including real-time tool status.
    """
    user_id = current_user["id"]
    token = current_user.get("token")

    async def event_generator():
        try:
            # Yield initial acknowledgement event
            yield f"event: status\ndata: {json.dumps({'status': 'processing', 'message': 'PML initializing...'})}\n\n"
            
            response = await ChatService.process_chat(
                request=request,
                user_id=user_id,
                user_token=token
            )

            # Yield tool status event if tools were called
            if response.tools_called:
                for tool in response.tools_called:
                    yield f"event: tool_status\ndata: {json.dumps({'tool': tool, 'status': 'completed'})}\n\n"

            # Stream response text chunks
            text = response.response
            chunk_size = 12
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                yield f"event: token\ndata: {json.dumps({'chunk': chunk})}\n\n"

            # Yield final payload event
            yield f"event: done\ndata: {json.dumps(response.model_dump())}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
