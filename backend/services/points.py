# backend/app/services.py

def calculate_fantasy_points(player_stats):
    points = 0

    # Kills: +2 points per kill
    points += player_stats['kills'] * 2

    # Deaths: -1 point per death
    points -= player_stats['deaths'] * 1

    # Assists: +1.5 points per assist
    points += player_stats['assists'] * 1.5

    # ACS: +0.1 points per ACS
    points += player_stats['acs'] * 0.1

    return points
