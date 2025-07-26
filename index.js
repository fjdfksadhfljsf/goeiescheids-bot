const venom = require('venom-bot');
const fs = require('fs');
const csv = require('csv-parser');
const schedule = require('node-schedule');
require('dotenv').config();

let users = {};
let games = [];

function loadUsers() {
  fs.createReadStream('./data/api_users.csv')
    .pipe(csv())
    .on('data', (row) => {
      users[row['name'].trim()] = row['phone'].trim();
    });
}

function loadGames() {
  games = [];
  fs.createReadStream('./data/api_games.csv')
    .pipe(csv())
    .on('data', (row) => {
      if (!row['Game Time']) return;
      const date = new Date(row['Game Time']);
      games.push({
        time: date,
        club: row['Club'],
        team: row['Home Team'],
        field: row['Field'],
        referees: [row['Referee 1'], row['Referee 2']].filter(Boolean),
      });
    });
}

function scheduleMessages(client) {
  games.forEach(game => {
    game.referees.forEach(name => {
      const number = users[name.trim()];
      if (!number) return;

      const timeStr = game.time.toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'});
      const msg1 = `Hoi ${name}, je fluit morgen om ${timeStr} op veld ${game.field} bij ${game.club} ${game.team}! Zorg dat je er bent! Vergeet na afloop niet het DWF in te vullen. Bedankt alvast en veel succes!\n\nTeam Goeiescheids`;
      const msg2 = `Hoi ${name}, over een uur fluit je op veld ${game.field} bij ${game.club} ${game.team}! Succes en vergeet niet het DWF in te vullen.\n\nTeam Goeiescheids`;

      let dayBefore = new Date(game.time);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(18, 0, 0, 0);

      let oneHourBefore = new Date(game.time);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);

      schedule.scheduleJob(dayBefore, () => {
        client.sendText(`${number}@c.us`, msg1);
      });

      schedule.scheduleJob(oneHourBefore, () => {
        client.sendText(`${number}@c.us`, msg2);
      });
    });
  });

  schedule.scheduleJob('*/10 * * * *', () => {
    const julius = process.env.JULIUS_PHONE;
    client.sendText(`${julius}@c.us`, 'Ping – ik ben nog actief.');
  });
}

venom.create({ session: 'goeiescheids' })
  .then((client) => {
    loadUsers();
    loadGames();
    setTimeout(() => scheduleMessages(client), 5000);
  });
