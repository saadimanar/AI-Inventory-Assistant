import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Optional

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"


@dataclass
class AuthUser:
    user_id: str
    display_name: str
    email: Optional[str] = None


def _allow_mock_auth() -> bool:
    return os.environ.get("ALLOW_MOCK_AUTH", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def _mock_user_id() -> str:
    return os.environ.get("MOCK_USER_ID", DEFAULT_MOCK_USER_ID).strip()


def _mock_display_name(user_id: str) -> str:
    configured = os.environ.get("MOCK_USER_DISPLAY_NAME", "").strip()
    if configured:
        return configured
    return f"User {user_id[:8]}"


def _jwt_secret() -> Optional[str]:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    return secret or None


def _supabase_url() -> Optional[str]:
    for key in ("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"):
        value = os.environ.get(key, "").strip().rstrip("/")
        if value:
            return value
    return None


def _auth_configured() -> bool:
    return _jwt_secret() is not None or _supabase_url() is not None


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    supabase_url = _supabase_url()
    if not supabase_url:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL is not configured",
        )
    return PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def _display_name_from_claims(claims: dict[str, Any]) -> str:
    metadata = claims.get("user_metadata") or {}
    if isinstance(metadata, dict):
        for key in ("full_name", "name", "display_name"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    email = claims.get("email")
    if isinstance(email, str) and email.strip():
        return email.split("@")[0]

    sub = claims.get("sub")
    if isinstance(sub, str) and sub:
        return f"User {sub[:8]}"

    return "User"


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    try:
        algorithm = jwt.get_unverified_header(token).get("alg", "")

        if algorithm == "HS256":
            secret = _jwt_secret()
            if not secret:
                raise HTTPException(
                    status_code=500,
                    detail="SUPABASE_JWT_SECRET is not configured",
                )
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )

        if algorithm == "ES256":
            supabase_url = _supabase_url()
            if not supabase_url:
                raise HTTPException(
                    status_code=500,
                    detail="SUPABASE_URL is not configured",
                )
            signing_key = _jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                issuer=f"{supabase_url}/auth/v1",
            )

        raise HTTPException(status_code=401, detail="Unsupported token algorithm")
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def _parse_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def authenticate_request(
    authorization: Optional[str] = Header(default=None),
) -> AuthUser:
    token = _parse_bearer_token(authorization)

    if token:
        if not _auth_configured():
            if _allow_mock_auth():
                user_id = _mock_user_id()
                return AuthUser(
                    user_id=user_id,
                    display_name=_mock_display_name(user_id),
                )
            raise HTTPException(
                status_code=500,
                detail="Supabase auth is not configured (set SUPABASE_URL or SUPABASE_JWT_SECRET)",
            )

        claims = verify_supabase_jwt(token)
        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id.strip():
            raise HTTPException(status_code=401, detail="Invalid token subject")
        email = claims.get("email")
        return AuthUser(
            user_id=user_id.strip(),
            display_name=_display_name_from_claims(claims),
            email=email if isinstance(email, str) else None,
        )

    if _allow_mock_auth():
        user_id = _mock_user_id()
        return AuthUser(
            user_id=user_id,
            display_name=_mock_display_name(user_id),
        )

    if _auth_configured():
        raise HTTPException(status_code=401, detail="Authorization required")

    user_id = _mock_user_id()
    return AuthUser(
        user_id=user_id,
        display_name=_mock_display_name(user_id),
    )
