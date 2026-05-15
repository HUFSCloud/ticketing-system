from typing import Generic, TypeVar

from pydantic import BaseModel


DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    # API 응답 형식을 success/data 중심으로 통일한다.
    success: bool
    data: DataT
