# backend/app/models.py

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PlayerMatchResult(Base):
    __tablename__ = 'player_match_results'
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, ForeignKey('players.id'))
    kills = Column(Integer)
    deaths = Column(Integer)
    assists = Column(Integer)
    acs = Column(Integer)
    fantasy_points = Column(Integer)

    player = relationship("Player", back_populates="match_results")
