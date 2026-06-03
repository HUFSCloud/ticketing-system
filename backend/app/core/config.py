from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # 실행 환경과 외부 서비스 연결 정보를 환경변수에서 읽어서 저장하는 클래스
    app_env: str = "local"

    db_host: str = "db"
    db_port: int = 3306
    db_name: str = "ticketing"
    db_user: str = "root"
    db_password: str = "root"

    redis_host: str = "redis"
    redis_port: int = 6379

    aws_region: str = "ap-northeast-2"
    sqs_queue_url: str = ""

    # 로컬 실행 시에는 .env 파일을 읽고, Docker 실행 시에는 주입된 환경변수를 사용한다.
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        # SQLAlchemy가 MySQL에 접속할 때 사용할 연결 문자열을 만든다.
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    # 설정 객체는 한 번만 생성해서 앱 전체에서 재사용한다.
    return Settings()
