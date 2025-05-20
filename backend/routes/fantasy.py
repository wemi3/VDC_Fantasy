from fastapi import APIRouter, Depends, HTTPException
import httpx
import os
from dotenv import load_dotenv
from  supabase import create_client
from typing import List
from pydantic import BaseModel
import uuid
from fastapi import Header
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

class FantasyTeam(BaseModel):
    player_ids: List[str]
    mmr_total: int
    user_id: str  # use mock for now

@router.post("/fantasy-team")
async def submit_team(team: FantasyTeam):
    now = datetime.now(timezone.utc)
    if now > LOCK_DEADLINE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team editing is locked after May 27th.",
        )
    
    print("Received team submission:", team.dict())
    data = {
        "user_id": team.user_id,
        "player_ids": team.player_ids,
        "mmr_total": team.mmr_total,
    }
    print("Upserting fantasy team with data:", data)

    # Check if a team already exists
    existing_team = supabase.table("fantasy_teams").select("*").eq("user_id", team.user_id).execute()

    if existing_team.data:
        # Update the existing team instead of inserting
        res = supabase.table("fantasy_teams").update(data).eq("user_id", team.user_id).execute()
        return {"message": "Team updated", "data": res.data}
    else:
        # No team found, insert new
        res = supabase.table("fantasy_teams").insert(data).execute()
        return {"message": "Team created", "data": res.data}

@router.post("/teams")
def fetch_teams_by_user_id(user_id: str):
    try:
        # Fetch teams for a given user ID
        res = supabase.table("fantasy_teams").select("*").eq("user_id", user_id).execute()

        if res.data:
            return res.data  # Return the teams data
        else:
            return []  # No teams found

    except Exception as e:
        print(f"Error fetching teams: {e}")
        return None

def calculate_fantasy_points(kills: int, deaths: int, assists: int, acs: int) -> float:
    return round((kills * 2) + (assists * 1.5) - (deaths * 1) + (acs * 0.05), 2)

@router.post("/add-player-match-stats/")
def add_player_match_stat(payload: dict):
    # Example payload:
    # {
    #   "player_id": "...",
    #   "match_id": "...",
    #   "kills": 20,
    #   "deaths": 12,
    #   "assists": 5,
    #   "acs": 250
    # }

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
    # Query the fantasy_teams table and join with player_match_stats to calculate fantasy points
    query = """
    SELECT 
        ft.id AS team_id, 
        ft.user_id, 
        SUM(pms.fantasy_points) AS total_fantasy_points
    FROM fantasy_teams ft
    JOIN players_combine pc ON pc.id = ANY(ft.player_ids)
    LEFT JOIN player_match_stats pms ON pms.player_id = pc.id
    GROUP BY ft.id, ft.user_id
    ORDER BY total_fantasy_points DESC
    LIMIT 10
    """
    result = supabase.from_sql(query)
    
    return result

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
        "id": user_id,
        "username": username,
        "avatar_url": avatar_url
    }).execute()

    if upsert_response.error:
        raise HTTPException(status_code=500, detail=f"Failed to upsert user: {upsert_response.error.message}")

    return {"message": "User synced", "username": username}

DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = "https://vdc-fantasy.vercel.app/callback"

@router.post("/api/discord/oauth")
async def discord_oauth(request: Request):
    data = await request.json()
    code = data.get("code")

    # Exchange code for access token
    token_resp = requests.post(
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

    token_data = token_resp.json()
    access_token = token_data.get("access_token")

    # Get user info with access token
    user_resp = requests.get(
        "https://discord.com/api/users/@me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    user_data = user_resp.json()

    # Return only safe info (no email)
    return JSONResponse({
        "discord_id": user_data["id"],
        "username": f"{user_data['username']}#{user_data['discriminator']}",
        "avatar": user_data["avatar"]
    })