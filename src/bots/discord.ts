import { REST, Routes, Client, Events, GatewayIntentBits, InteractionContextType, ApplicationIntegrationType, SlashCommandBuilder, ActivityType } from 'discord.js';
import petPetGif from '@someaspy/pet-pet-gif';
import sharp from 'sharp';

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? '';


const commands = [
	new SlashCommandBuilder()
		.setName('pet')
		.setDescription('Select a member and pet them.')
		.addUserOption((option) => option.setName('target').setDescription('The member to pet'))
		.addIntegerOption((option) => option.setName('delay').setDescription('The duration between each frame (default 20)').setMinValue(15).setMaxValue(655360))
		.addBooleanOption((option) => option.setName('circle').setDescription('Whether to use a circular petting animation (default false)'))
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall)
		.setContexts([InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel]),

	new SlashCommandBuilder()
		.setName('pet-image')
		.setDescription('Provide an image url and pet it.')
		.addStringOption((option) => option.setName('url').setDescription('The url of the image to pet').setRequired(true))
		.addIntegerOption((option) => option.setName('delay').setDescription('The duration between each frame (default 20)').setMinValue(15).setMaxValue(655360))
		.addBooleanOption((option) => option.setName('circle').setDescription('Whether to use a circular petting animation (default false)'))
		.setIntegrationTypes(ApplicationIntegrationType.UserInstall)
		.setContexts([InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel]),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

registerCommands();


const client = new Client({
    intents: [GatewayIntentBits.Guilds],
	presence: {
		status: 'online',
		activities: [{
			name: 'Petting things :3',
			type: ActivityType.Custom,
			state: ''
		}],
	},
});

client.on(Events.ClientReady, readyClient => {
  	console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  	if (!interaction.isChatInputCommand()) return;

  	if (interaction.commandName === 'pet')
	{
		let urlOptions = '';
		if (interaction.options.getInteger('delay') || interaction.options.getBoolean('circle')) {
			urlOptions += '?';
			const params = [];
			if (interaction.options.getInteger('delay')) {
				params.push(`delay=${interaction.options.getInteger('delay')}`);
			}
			if (interaction.options.getBoolean('circle')) {
				params.push(`circle=true`);
			}
			urlOptions += params.join('&');
		}

		// Check if a user was provided
		const target = interaction.options.getUser('target');
		if (target) {
			console.log(`[Discord] ${interaction.user.tag} is petting ${target.tag}`);
			await interaction.reply(process.env.WEBSITE_URL + 'discord/' + target.id + ".gif" + urlOptions);
		} else {
			console.log(`[Discord] ${interaction.user.tag} is petting themselves`);
			await interaction.reply(process.env.WEBSITE_URL + 'discord/' + interaction.user.id + ".gif" + urlOptions);
		}
		return;
  	}

	if (interaction.commandName === 'pet-image')
	{
		// Defer reply because image fetching/processing can take >3s
		try {
			await interaction.deferReply();
		} catch (err) {
			console.error('Failed to defer reply:', err);
		}
		const url = interaction.options.getString('url')!;
		console.log(`[Discord] ${interaction.user.tag} is petting an image: ${url}`);

		// Fetch the image and convert it to a PNG buffer to ensure canvas supports it
		let imageBuffer;
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
			}
			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Use sharp to convert to PNG (first frame if animated) which canvas supports
			try {
				// Allow sharp to handle animated images and extract the first frame as PNG
				imageBuffer = await sharp(buffer, { animated: true }).png().toBuffer();
			} catch (convErr) {
				// Fallback in case the animated flag isn't supported for this input
				imageBuffer = await sharp(buffer).png().toBuffer();
			}
		} catch (error) {
			console.error('Error fetching or processing the image:', error);
			await interaction.reply({ content: 'Error fetching or processing the image. Please ensure the URL is valid and points to a supported image format (png/jpg/gif/webp).' });
			return;
		}
			// Reply with the petted image as an attachment
		try {
			const pettedImageBuffer = await petPetGif(
				imageBuffer,
				{
					resolution: 128,
					delay: interaction.options.getInteger('delay') || 20,
					backgroundColor: null,
				}
			);

			// Reply with the petted image as an attachment
			try {
				await interaction.editReply({
					files: [{
						attachment: pettedImageBuffer,
						name: 'petted.gif'
					}]
				});
			} catch (err) {
				console.error('Failed to send petted image reply:', err);
				try { await interaction.followUp({ content: 'Error sending the petted image.' }); } catch {};
			}
		} catch (error) {
			console.error(error);
			try { await interaction.editReply({ content: 'Error processing the image.' }); } catch { try { await interaction.followUp({ content: 'Error processing the image.' }); } catch {} }
		}
		return;
	}
});

export { client };
client.login(TOKEN);
