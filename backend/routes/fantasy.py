from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from fastapi.responses import JSONResponse
import httpx  # <-- only use httpx for HTTP requests
import os
from dotenv import load_dotenv
from supabase import create_client
from typing import List
from pydantic import BaseModel
from datetime import datetime, timezone

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

LOCK_DEADLINE = datetime(2025, 5, 27, 23, 59, 59, tzinfo=timezone.utc)

@router.get("/players")
async def get_players():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/players_combine?select=*&is_active=eq.true&order=mmr.desc",
            headers=headers
        )
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch players")
    return response.json()

# ... rest of your routes ...

@router.post("/api/discord/oauth")
async def discord_oauth(request: Request):
    data = await request.json()
    code = data.get("code")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        user_resp = await client.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info")

        user_data = user_resp.json()

    return JSONResponse({
        "discord_id": user_data["id"],
        "username": f"{user_data['username']}#{user_data['discriminator']}",
        "avatar": user_data["avatar"]
    })
