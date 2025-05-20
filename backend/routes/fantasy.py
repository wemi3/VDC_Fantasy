from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from fastapi.responses import JSONResponse
import httpx
import os
from dotenv import load_dotenv
from supabase import create_client
from typing import List
from pydantic import BaseModel
from datetime import datetime, timezone

env_file = ".env.local" if os.getenv("ENV", "development") == "development" else ".env"
load_dotenv(dotenv_path=env_file)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI")

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

class FantasyTeam(BaseModel):
    player_ids: List[str]
    mmr_total: int
    user_id: str

@router.post("/fantasy-team")
async def submit_team(team: FantasyTeam):
    now = datetime.now(timezone.utc)
    if now > LOCK_DEADLINE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team editing is locked after May 27th.",
        )
    
    # Check if user exists
    user_res = supabase.table("users").select("*").eq("supabase_user_id", team.user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=400, detail="User not found. Please sync user first.")
    
    data = {
        "user_id": team.user_id,
        "player_ids": team.player_ids,
        "mmr_total": team.mmr_total,
    }

    existing_team = supabase.table("fantasy_teams").select("*").eq("user_id", team.user_id).execute()

    if existing_team.data:
        res = supabase.table("fantasy_teams").update(data).eq("user_id", team.user_id).execute()
        return {"message": "Team updated", "data": res.data}
    else:
        res = supabase.table("fantasy_teams").insert(data).execute()
        return {"message": "Team created", "data": res.data}

@router.post("/teams")
async def fetch_teams_by_user_id(user_id: str):
    try:
        res = supabase.table("fantasy_teams").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data
        else:
            return []
    except Exception as e:
        print(f"Error fetching teams: {e}")
        return None

def calculate_fantasy_points(kills: int, deaths: int, assists: int, acs: int) -> float:
    return round((kills * 2) + (assists * 1.5) - (deaths * 1) + (acs * 0.05), 2)

@router.post("/add-player-match-stats/")
async def add_player_match_stat(payload: dict):
    fp = calculate_fantasy_points(
        payload["kills"], payload["deaths"], payload["assists"], payload["acs"]
    )

    response = supabase.table("player_match_stats").insert({
        **payload,
        "fantasy_points": fp
    }).execute()

    if response.error:
        raise HTTPException(status_code=500, detail=response.error.message)

    return {"message": "Stat added", "fantasy_points": fp}

@router.get("/leaderboard")
async def get_leaderboard():
    # Use supabase.from with filters and joins is limited,
    # better to create a Postgres RPC function for complex queries or do multiple queries here.
    # Here is a simplified approach with multiple queries:

    # Get top teams with player_ids
    teams_res = supabase.table("fantasy_teams").select("id, user_id, player_ids").execute()
    if teams_res.error:
        raise HTTPException(status_code=500, detail=teams_res.error.message)

    teams = teams_res.data

    # For each team, sum fantasy_points of players
    leaderboard = []
    for team in teams:
        player_ids = team.get("player_ids") or []
        if not player_ids:
            total_fp = 0
        else:
            stats_res = supabase.table("player_match_stats").select("fantasy_points").in_("player_id", player_ids).execute()
            if stats_res.error:
                total_fp = 0
            else:
                total_fp = sum(stat["fantasy_points"] for stat in stats_res.data or [])
        leaderboard.append({
            "team_id": team["id"],
            "user_id": team["user_id"],
            "total_fantasy_points": total_fp,
        })

    # Sort descending by total_fantasy_points and limit 10
    leaderboard_sorted = sorted(leaderboard, key=lambda x: x["total_fantasy_points"], reverse=True)[:10]
    return leaderboard_sorted

@router.post("/auth/sync_user")
async def sync_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=400, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    user_response = supabase.auth.get_user(token)

    if user_response.get("error") or not user_response.get("data"):
        raise HTTPException(status_code=401, detail="Invalid token or user not found")

    user = user_response["data"]["user"]
    user_id = user.get("id")
    metadata = user.get("user_metadata") or {}
    username = metadata.get("full_name") or metadata.get("name") or "Unknown"
    avatar_url = metadata.get("avatar_url")

    upsert_response = supabase.table("users").upsert({
    "supabase_user_id": user_id,
    "username": username,
    "avatar_url": avatar_url
}).execute()


    if upsert_response.error:
        raise HTTPException(status_code=500, detail=f"Failed to upsert user: {upsert_response.error.message}")

    return {"message": "User synced", "username": username}

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

        discord_id = user_data["id"]
        username = user_data["username"]
        discriminator = user_data["discriminator"]
        avatar_hash = user_data["avatar"]

        if discriminator != "0":
            full_username = f"{username}#{discriminator}"
        else:
            full_username = username

        if avatar_hash:
            avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"
        else:
            avatar_url = None

    # Check if user exists
    existing_user_resp = supabase.table("users").select("*").eq("discord_id", discord_id).execute()

    if existing_user_resp.data is None:
        raise HTTPException(status_code=500, detail="Error querying Supabase users")

    if len(existing_user_resp.data) == 0:
        # Insert new user
        insert_resp = supabase.table("users").insert({
            "discord_id": discord_id,
            "username": full_username,
            "avatar_url": avatar_url,
        }).execute()

        if insert_resp.data is None or len(insert_resp.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to insert user")

        supabase_user_id = insert_resp.data[0]["supabase_user_id"]
    else:
        # User already exists
        supabase_user_id = existing_user_resp.data[0]["supabase_user_id"]

    return JSONResponse({
        "discord_id": discord_id,
        "username": full_username,
        "avatar": avatar_url,
        "supabase_user_id": supabase_user_id
    })

