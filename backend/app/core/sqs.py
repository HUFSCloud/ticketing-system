import json
from typing import Any

from app.core.config import get_settings

settings = get_settings()


def send_sqs_message(message: dict[str, Any]) -> bool:
    # SQS_QUEUE_URL이 없으면 로컬 개발 환경으로 보고 실제 전송을 생략한다.
    if not settings.sqs_queue_url:
        return False

    import boto3

    client = boto3.client("sqs", region_name=settings.aws_region)
    client.send_message(
        QueueUrl=settings.sqs_queue_url,
        MessageBody=json.dumps(message, ensure_ascii=False),
    )
    return True
