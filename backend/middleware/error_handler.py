from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging
import traceback
from typing import Callable
import asyncio

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Custom error handling middleware."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        
        except HTTPException as e:
            # Let FastAPI handle HTTP exceptions normally
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        
        except ValueError as e:
            logger.error(f"ValueError in {request.method} {request.url}: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"Invalid input: {str(e)}"}
            )
        
        except PermissionError as e:
            logger.error(f"PermissionError in {request.method} {request.url}: {str(e)}")
            return JSONResponse(
                status_code=403,
                content={"detail": "Access denied"}
            )
        
        except asyncio.TimeoutError:
            logger.error(f"Timeout in {request.method} {request.url}")
            return JSONResponse(
                status_code=504,
                content={"detail": "Request timeout"}
            )
        
        except Exception as e:
            # Log the full traceback for debugging
            logger.error(f"Unhandled exception in {request.method} {request.url}: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return a generic error response
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = asyncio.get_event_loop().time()
        
        # Log request details
        logger.info(f"Request: {request.method} {request.url}")
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = asyncio.get_event_loop().time() - start_time
            
            # Log response details
            logger.info(
                f"Response: {request.method} {request.url} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.4f}s"
            )
            
            return response
            
        except Exception as e:
            process_time = asyncio.get_event_loop().time() - start_time
            logger.error(
                f"Error: {request.method} {request.url} - "
                f"Exception: {str(e)} - "
                f"Time: {process_time:.4f}s"
            )
            raise


class DatabaseErrorMiddleware(BaseHTTPMiddleware):
    """Middleware to handle database-specific errors."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        
        except Exception as e:
            error_message = str(e).lower()
            
            # Handle common database errors
            if "duplicate key" in error_message or "unique constraint" in error_message:
                logger.error(f"Duplicate key error in {request.method} {request.url}: {str(e)}")
                return JSONResponse(
                    status_code=409,
                    content={"detail": "Resource already exists"}
                )
            
            elif "connection" in error_message or "timeout" in error_message:
                logger.error(f"Database connection error in {request.method} {request.url}: {str(e)}")
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Database service unavailable"}
                )
            
            elif "objectid" in error_message or "invalid" in error_message:
                logger.error(f"Invalid ID error in {request.method} {request.url}: {str(e)}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid ID format"}
                )
            
            # Re-raise if not a database error
            raise


class ValidationErrorMiddleware(BaseHTTPMiddleware):
    """Middleware to handle validation errors."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        
        except Exception as e:
            error_message = str(e).lower()
            
            # Handle validation errors
            if "validation" in error_message or "field required" in error_message:
                logger.error(f"Validation error in {request.method} {request.url}: {str(e)}")
                return JSONResponse(
                    status_code=422,
                    content={"detail": f"Validation error: {str(e)}"}
                )
            
            # Re-raise if not a validation error
            raise