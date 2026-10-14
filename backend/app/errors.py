from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """A business rule rejected the request. The API returns `code` as `detail`."""

    def __init__(self, code: str, status_code: int = status.HTTP_409_CONFLICT):
        super().__init__(code)
        self.code = code
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, code: str = "not_found"):
        super().__init__(code, status.HTTP_404_NOT_FOUND)


async def app_error_handler(_request: Request, error: Exception) -> JSONResponse:
    assert isinstance(error, AppError)
    return JSONResponse(status_code=error.status_code, content={"detail": error.code})


class InvalidError(AppError):
    """The request is well formed but refers to something it may not use."""

    def __init__(self, code: str):
        super().__init__(code, status.HTTP_422_UNPROCESSABLE_CONTENT)
