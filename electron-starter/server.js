const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock team data
let teamData = [
    { id: 1, name: "Player Alpha", level: 6 },
    { id: 2, name: "Player Bravo", level: 11 },
    { id: 3, name: "Player Charlie", level: 8 },
    { id: 4, name: "Player Delta", level: 15 },
    { id: 5, name: "Player Echo", level: 9 }
];

app.get('/api/team', (req, res) => {
    res.json(teamData);
});

app.post('/api/team/update', (req, res) => {
    const { id, level } = req.body;
    const player = teamData.find(p => p.id === id);
    if (player) {
        player.level = level;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

app.listen(3000, () => {
    console.log('API server running on http://localhost:3000');
});
