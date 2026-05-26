import express from 'express';
import { client } from './bots/discord.ts';
import petPetGif from '@someaspy/pet-pet-gif';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const app = express();
const port = process.env.PORT || 4001;

app.get('/', (req, res) => {
    res.send('Welcome to the Pet Api Website!');
});

app.get('/bot', async (req, res) => {
    res.send(`Bot is logged in as ${client.user?.tag}`);
});

app.get('/discord/:id.gif', async (req, res) => {
    const userId = req.params.id;
    const delay = typeof req.query.delay === 'string' ? parseInt(req.query.delay) : 20;
    const circle = req.query.circle === 'true';
    try {
        const user = await client.users.fetch(userId);
        console.log(`[Website] Fetched: discord user ${user.tag} (${user.id})`);

        // Now we pet their pfp
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
        console.log(`[Website] Debug: ${userId} | delay=${delay} | circle=${circle} | avatarUrl=${avatarUrl}`);
        const petGif = await petPetGif(avatarUrl, { resolution: 128, delay: delay, backgroundColor: null });

        // Now we respond with the gif
        res.setHeader('Content-Type', 'image/gif');
        res.send(petGif);
    } catch (error) {
        console.error(`[Website] Error fetching: Discord user (${userId})`, error);
        res.status(404).json({ error: 'User not found, probably...' });
        return;
    }
});


app.listen(port, () => {
    console.log(`Pet Api Website listening at http://localhost:${port}`)
})
