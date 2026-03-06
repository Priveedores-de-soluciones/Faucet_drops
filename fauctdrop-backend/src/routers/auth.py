"""
routers/auth.py — OAuth (Discord) authentication endpoints.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from config import oauth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/discord/login")
async def discord_login(request: Request):
    """Initiate Discord OAuth flow."""
    redirect_uri = str(request.url_for("discord_callback"))
    return await oauth.discord.authorize_redirect(request, redirect_uri)


@router.get("/discord/callback", name="discord_callback")
async def discord_callback(request: Request):
    """Handle Discord OAuth callback."""
    try:
        token = await oauth.discord.authorize_access_token(request)
        user = await oauth.discord.get(
            "users/@me",
            token=token,
        )
        user_data = user.json()
        request.session["discord_user"] = user_data
        return RedirectResponse(url="/")
    except Exception as exc:
        logger.error("Discord OAuth callback error: %s", exc)
        return RedirectResponse(url="/?auth_error=1")


@router.get("/discord/logout")
async def discord_logout(request: Request):
    """Clear session."""
    request.session.clear()
    return RedirectResponse(url="/")


@router.get("/me")
async def get_me(request: Request):
    """Return current user from session."""
    user = request.session.get("discord_user")
    if not user:
        return {"authenticated": False}
    return {"authenticated": True, "user": user}
