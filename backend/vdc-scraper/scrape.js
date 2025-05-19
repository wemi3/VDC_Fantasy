require('dotenv').config();

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Fantasy point formula
function calculateFantasyPoints(kills, deaths, assists, acs) {
  return (kills * 2) + (assists * 1.5) - (deaths * 1) + (acs * 0.05);
}

async function scrapeAndStorePlayerStats() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://vdc.gg/stats', { waitUntil: 'networkidle0' });
  await page.waitForSelector('tr.bg-gray-200, tr.bg-white');

  const players = await page.evaluate(() => {
    const rows = document.querySelectorAll('tr.bg-gray-200, tr.bg-white');
    const data = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 9) {
        data.push({
          name: cells[0]?.innerText.trim(),
          kills: parseInt(cells[6]?.innerText),
          deaths: parseInt(cells[7]?.innerText),
          assists: parseInt(cells[8]?.innerText),
          acs: parseFloat(cells[5]?.innerText),
        });
      }
    });

    return data;
  });

  const matchId = uuidv4(); // or hardcode like "Week 1"

  for (const player of players) {
    // Step 1: Upsert global stats into players_combine
    const { data: playerUpsert, error: upsertError } = await supabase
      .from('players_combine')
      .upsert([
        {
          name: player.name,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          acs: player.acs,
          is_active: true,
        },
      ])
      .select();

    if (upsertError) {
      console.error(`Error upserting ${player.name}`, upsertError);
      continue;
    }

    const playerId = playerUpsert?.[0]?.id;
    if (!playerId) {
      console.warn(`Player ID not found for ${player.name}`);
      continue;
    }

    // Step 2: Insert into player_match_stats
    const fantasyPoints = calculateFantasyPoints(player.kills, player.deaths, player.assists, player.acs);

    const { error: matchError } = await supabase
      .from('player_match_stats')
      .insert([
        {
          player_id: playerId,
          match_id: matchId,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          acs: player.acs,
          fantasy_points: fantasyPoints,
        },
      ]);

    if (matchError) {
      console.error(`Error inserting match stats for ${player.name}:`, matchError);
    } else {
      console.log(`Logged match stats for ${player.name}: ${fantasyPoints} pts`);
    }
  }

  await browser.close();
}

scrapeAndStorePlayerStats().catch(console.error);
