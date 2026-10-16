const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
  ActivityType,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/*
  =========================================================
  BOTRIX OWNER SERVER
  =========================================================
*/
const BOT_OWNER_SERVER_ID = "1550513070772584538";
const BOT_OWNER_ROLE_ID = "1553087011794063411";
const BOT_OWNER_USER_IDS = new Set(["1474376084647710762", "1355170884884889815"]);

/*
  =========================================================
  OWNER CONTROL PANEL CHANNELS
  =========================================================
*/
const CONTROL_SERVER_CHANNEL_ID = "1550602188328534038";
const OWNER_CHANGE_CHANNEL_ID = "1550839193205481502";
const LEAVE_BOT_CHANNEL_ID = "1550597229377617951";
const PHOTO_LOG_CHANNEL_ID = "1550596192818299022";
const NAME_LOG_CHANNEL_ID = "1550596192818299023";
const VERIFICATION_INFO_CHANNEL_ID = "1560413853395845191";

/* =========================================================
   BOTRIX PUBLIC CHANNELS
========================================================= */
const BOTRIX_UPDATE_CHANNEL_ID = "1550540272738246738";
const BOTRIX_STATUS_CHANNEL_ID = "1550540280330068149";
const BOTRIX_INVITE_CHANNEL_ID = "1550540263951302799";
const BOTRIX_IMAGE_URL = "https://media.discordapp.net/attachments/1542383698886918265/1550621414162178058/botrix.png?ex=6aafa8fa&is=6aae577a&hm=5cbafa660629c8d8534d593de2c63981602ca2bf4d8d15a30e9e3bbe7fd62d97&=&format=webp&quality=lossless&width=80&height=78";

// Fixed website welcome channel
const WEBSITE_WELCOME_CHANNEL_ID = "1551600238144266300";
const BOTRIX_WEBSITE_URL = "https://botrix-system-dashboard.netlify.app/";

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing DISCORD_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User
  ]
});

client.commands = new Collection();

/* =========================================================
   STORAGE
========================================================= */

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const files = {
  warns: path.join(dataDir, "warns.json"),
  economy: path.join(dataDir, "economy.json"),
  reps: path.join(dataDir, "reps.json"),
  afk: path.join(dataDir, "afk.json"),
  tickets: path.join(dataDir, "tickets.json"),
  ticketConfig: path.join(dataDir, "ticketConfig.json"),
  welcomeSent: path.join(dataDir, "welcomeSent.json"),
  welcomeConfig: path.join(dataDir, "welcomeConfig.json"),
  autorole: path.join(dataDir, "autorole.json"),
  aiChannels: path.join(dataDir, "aiChannels.json"),
  logsChannels: path.join(dataDir, "logsChannels.json"),

  // Server customization access
  serverAccess: path.join(dataDir, "serverAccess.json"),
  publicPanels: path.join(dataDir, "publicPanels.json"),
  giveaways: path.join(dataDir, "giveaways.json"),
  inviteCounts: path.join(dataDir, "inviteCounts.json"),
  moderationConfig: path.join(dataDir, "moderationConfig.json"),
  moderationImages: path.join(dataDir, "moderationImages.json")
};

function loadJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(fallback, null, 2)
      );
      return fallback;
    }

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

const DEFAULT_MODERATION_ROLE_IDS = {
  warn1RoleId: "1540749187908505640",
  warn2RoleId: "1540749446437150750",
  warn3RoleId: "1540749564372455524"
};

const DEFAULT_MODERATION_IMAGES = {
  smallImage: "https://cdn.discordapp.com/attachments/1555949088078438491/1556054113345601626/396150555_705894754932449_4149540353580831879_n-removebg-preview.png?backend=b2&ex=6ac2c3d2&is=6ac17252&hm=b1ad12d6b301848929177a37dfd93c9590dc6289f66154940ee1b02ff445e4db&",
  largeImage: "https://cdn.discordapp.com/attachments/1555949088078438491/1556055214144884786/download.gif?ex=6ac2c4d9&is=6ac17359&hm=57bda7e992dfceed89384504c197208f5ca6fd3d6a7fbac8b5b383f6b4dbb876&"
};

function getModerationConfig(guildId) {
  const cfg = db.moderationConfig[guildId] || {};
  let changed = false;
  for (const [key, value] of Object.entries(DEFAULT_MODERATION_ROLE_IDS)) {
    if (!cfg[key]) { cfg[key] = value; changed = true; }
  }
  if (changed) {
    db.moderationConfig[guildId] = cfg;
    saveJSON(files.moderationConfig, db.moderationConfig);
  }
  return cfg;
}

const db = {
  warns: loadJSON(files.warns),
  economy: loadJSON(files.economy),
  reps: loadJSON(files.reps),
  afk: loadJSON(files.afk),
  tickets: loadJSON(files.tickets),
  ticketConfig: loadJSON(files.ticketConfig),
  welcomeSent: loadJSON(files.welcomeSent),
  welcomeConfig: loadJSON(files.welcomeConfig),
  autorole: loadJSON(files.autorole),
  aiChannels: loadJSON(files.aiChannels),
  logsChannels: loadJSON(files.logsChannels),

  // Access database
  serverAccess: loadJSON(files.serverAccess),
  publicPanels: loadJSON(files.publicPanels),
  giveaways: loadJSON(files.giveaways),
  inviteCounts: loadJSON(files.inviteCounts),
  moderationConfig: loadJSON(files.moderationConfig),
  moderationImages: loadJSON(files.moderationImages)
};

/* =========================================================
   HELPERS
========================================================= */

function money(userId) {
  if (!db.economy[userId]) {
    db.economy[userId] = {
      cash: 1000,
      bank: 0
    };

    saveJSON(
      files.economy,
      db.economy
    );
  }

  return db.economy[userId];
}

function botrixEmbed(
  title,
  description,
  color = 0x5865f2
) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "Botrix System"
    })
    .setTimestamp();

  const imagePath = path.join(
    __dirname,
    "botrix.png"
  );

  if (fs.existsSync(imagePath)) {
    embed.setThumbnail(
      "attachment://botrix.png"
    );
  }

  return embed;
}

function botrixFiles() {
  const imagePath = path.join(
    __dirname,
    "botrix.png"
  );

  return fs.existsSync(imagePath)
    ? [
        new AttachmentBuilder(
          imagePath,
          {
            name: "botrix.png"
          }
        )
      ]
    : [];
}


function moderationImageConfig(guildId) {
  return {
    ...DEFAULT_MODERATION_IMAGES,
    ...(db.moderationImages[guildId] || {})
  };
}

function moderationEmbed(guildId, title, description, color = 0xed1c24) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "Rezistanza RolePlay" })
    .setTimestamp();

  const cfg = moderationImageConfig(guildId);
  if (cfg.smallImage && /^https?:\/\/\S+$/i.test(cfg.smallImage)) {
    embed.setThumbnail(cfg.smallImage);
  }
  if (cfg.largeImage && /^https?:\/\/\S+$/i.test(cfg.largeImage)) {
    embed.setImage(cfg.largeImage);
  }
  return embed;
}

function memberCan(member, permission) {
  return member.permissions.has(permission);
}

function replyOptions(options = {}) {
  const { ephemeral, ...rest } = options;
  if (ephemeral) rest.flags = 64;
  return rest;
}

async function safeReply(interaction, options = {}) {
  if (!interaction) return null;

  try {
    const data = replyOptions(options);

    // Discord interactions can only receive one initial acknowledgement.
    // Prefer the current interaction state before sending anything.
    if (interaction.deferred) {
      return await interaction.editReply(data);
    }

    if (interaction.replied) {
      return await interaction.followUp(data);
    }

    return await interaction.reply(data);
  } catch (error) {
    // 10062 = the interaction token expired.
    // 40060 = the interaction was already acknowledged by another path.
    // Both are safe to ignore here; do not spam the console with a second
    // error while handling the original interaction.
    if (error?.code === 40060 || error?.rawError?.code === 40060) {
      return null;
    }

    if (error?.code === 10062 || error?.rawError?.code === 10062) {
      return null;
    }

    console.error("❌ Interaction reply error:", error);
    return null;
  }
}

/* =========================================================
   BOT OWNER CHECK
========================================================= */

async function isBotOwner(interaction) {
  try {
    const userId = interaction?.user?.id;
    if (!userId) return false;
    if (BOT_OWNER_USER_IDS.has(userId)) return true;
    const ownerGuild = client.guilds.cache.get(BOT_OWNER_SERVER_ID) || await client.guilds.fetch(BOT_OWNER_SERVER_ID).catch(() => null);
    if (!ownerGuild) return false;
    const member = await ownerGuild.members.fetch(userId).catch(() => null);
    const hasRole = Boolean(member?.roles?.cache?.has(BOT_OWNER_ROLE_ID));
    console.log(`🔐 Owner check ${userId}: ${hasRole ? "GRANTED" : "DENIED"}`);
    return hasRole;
  } catch (error) {
    console.error("❌ Botrix Owner check error:", error?.message || error);
    return false;
  }
}

/* =========================================================
   OWNER SERVER CHECK
========================================================= */

function isBotOwnerServer(guild) {
  return Boolean(
    guild &&
    guild.id === BOT_OWNER_SERVER_ID
  );
}

/* =========================================================
   SERVER CHANGE ACCESS
========================================================= */

function hasServerChangeAccess(
  guild,
  userId
) {
  if (!guild) {
    return false;
  }

  const access =
    db.serverAccess[guild.id];

  return Boolean(
    access &&
    access.enabled === true &&
    access.ownerId === guild.ownerId &&
    access.ownerId === userId
  );
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("verification_bot")
    .setDescription("Post the Botrix Discord verification panel"),

  new SlashCommandBuilder()
    .setName("addmembre")
    .setDescription("Add users who explicitly verified to a target Discord server")
    .addStringOption(option =>
      option.setName("serverid")
        .setDescription("Target Discord server ID")
        .setRequired(true)
    ),


  new SlashCommandBuilder()
    .setName("joinvc")
    .setDescription("Make Botrix join a voice channel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Voice channel for Botrix")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("leavevc")
    .setDescription("Make Botrix leave the voice channel"),

  new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure the server logs channel")
    .addChannelOption(option =>
      option
        .setName("channellogs")
        .setDescription("Channel where Botrix will send all server logs")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "Show all Botrix System commands"
    ),

  new SlashCommandBuilder()
    .setName("bot")
    .setDescription(
      "Show Botrix System information"
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription(
      "Show server information"
    ),

  /* ========================================================
     OWNER ACCESS COMMANDS
     The old /serversinfo, /giveacces, /removeacces and /infoacces
     commands were replaced by buttons in the owner control panels.
     ======================================================== */

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription(
      "Show user information"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Open Rezistanza RolePlay moderation role panel"),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription(
      "Kick a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription(
      "Timeout a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Minutes")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription(
      "Warn a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription(
      "Delete messages"
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("1-100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription(
      "Lock the current text channel"
    ),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription(
      "Set channel slowmode"
    )
    .addIntegerOption(option =>
      option
        .setName("seconds")
        .setDescription("0-21600")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("afk")
    .setDescription(
      "Set or remove your AFK status"
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("AFK reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription(
      "Create a poll"
    )
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rep")
    .setDescription(
      "Give reputation to a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription(
      "Show your activity rank"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "Show reputation leaderboard"
    ),

  new SlashCommandBuilder()
    .setName("economy")
    .setDescription(
      "Economy commands"
    )
    .addSubcommand(sub =>
      sub
        .setName("balance")
        .setDescription("Show balance")
    )
    .addSubcommand(sub =>
      sub
        .setName("daily")
        .setDescription("Claim daily cash")
    )
    .addSubcommand(sub =>
      sub
        .setName("pay")
        .setDescription("Pay a member")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("Amount")
            .setMinValue(1)
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription(
      "Open the Botrix ticket setup panel"
    ),

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription(
      "Configure server welcome system"
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription(
          "Welcome channel"
        )
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("photoirl")
        .setDescription(
          "Welcome photo URL"
        )
        .setMaxLength(500)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription(
      "Set the server join/welcome channel"
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel for new member welcome messages")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("autorole")
    .setDescription(
      "Configure autorole"
    )
    .addRoleOption(option =>
      option
        .setName("rolename")
        .setDescription("Role")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sendmessage")
    .setDescription(
      "Send a message to a channel"
    )
    .addStringOption(option =>
      option
        .setName("yourmessage")
        .setDescription("Message")
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("yourchannel")
        .setDescription("Channel")
        .addChannelTypes(
          ChannelType.GuildText
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Configure Botrix AI auto-replies in a channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Text channel where Botrix AI will answer automatically")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("giveways")
    .setDescription("Create an invite/member giveaway")
    .addChannelOption(option => option.setName("channel").setDescription("Giveaway channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(option => option.setName("type").setDescription("Giveaway type").setRequired(true).addChoices(
      { name: "Invites", value: "invites" },
      { name: "Members", value: "members" },
      { name: "Other", value: "other" }
    ))
    .addIntegerOption(option => option.setName("target").setDescription("Target: 5 to 30").setMinValue(5).setMaxValue(30).setRequired(true))
    .addStringOption(option => option.setName("photo").setDescription("Giveaway image URL").setMaxLength(500).setRequired(true))
    .addStringOption(option => option.setName("prize").setDescription("What will the winner receive?").setMaxLength(1000).setRequired(true))

].map(command =>
  command.toJSON()
);

/* =========================================================
   GLOBAL COMMAND REGISTRATION
========================================================= */

async function registerCommands() {
  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  // Register the current command list globally. PUT replaces the existing
  // global command list, so removed commands such as /warn disappear.
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    {
      body: commands
    }
  );

  // Also replace guild command lists. This removes old commands that were
  // previously registered directly on individual servers.
  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guild.id),
        {
          body: commands
        }
      );
    } catch (error) {
      console.warn(
        `⚠️ Could not refresh commands in ${guild.name} (${guild.id}): ${error.message}`
      );
    }
  }

  console.log(
    `✅ Botrix commands refreshed: ${commands.length} active commands; old commands removed from ${client.guilds.cache.size} servers.`
  );
}

/* =========================================================
   STATUS
========================================================= */

const statuses = [
  "136 Server",
  "Owner:J4nk",
  "/help|Botrix.System.xyz",
  "Active Giveaways In The Support Server",
  "60000 membres !",
  "(Botrix.System)",
  "dashboard:https://botrix-system-dashboard.netlify.app/",
];

let statusIndex = 0;

function rotateStatus() {
  if (!client.user) {
    return;
  }

  client.user.setPresence({
    activities: [
      {
        name: statuses[statusIndex],
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });

  statusIndex =
    (statusIndex + 1) %
    statuses.length;
}

/* =========================================================
   PUBLIC BOTRIX CHANNEL PANELS
========================================================= */

function publicHelpText() {
  return `**Welcome to Botrix!**
I'm an all-in-one Discord bot packed with features.

### 🎵 Music

\`/music play\` — Play songs from YouTube, Spotify, SoundCloud.

### 🛡️ Moderation

\`/kick\` \`/timeout\`  \`/clear\` \`/lockdown\`

### ⚙️ AutoMod

\`/automod\` — Anti-spam and automatic moderation.

### 🎉 Community

\`/afk\` \`/poll\` \`/rep\` \`/rank\` \`/leaderboard\`

### 💰 Economy

\`/economy\`

### 🎫 Tickets

\`/ticket\`

### 🎁 Giveaways

\`/giveaway\`

### 📊 Information

\`/serverinfo\` \`/userinfo\` \`/bot\` \`/help\`

### 💡 Quick Tips

• Type \`/help\` in your server.
• Use the interactive setup panels.
• Configure Botrix directly from your server.`;
}

function inviteButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Invite to another server")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Link)
      .setURL(BOT_INVITE_URL)
  );
}

async function upsertPublicPanel(channelId, type) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return null;

  const key = type === "help" ? "helpMessageId" : type === "status" ? "statusMessageId" : "updateMessageId";
  const savedId = db.publicPanels[key];
  let message = savedId ? await channel.messages.fetch(savedId).catch(() => null) : null;

  if (type === "help") {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setDescription(publicHelpText())
      .setThumbnail(BOTRIX_IMAGE_URL)
      .setFooter({ text: "Botrix System" });

    const payload = {
      embeds: [helpEmbed],
      components: [inviteButtonRow()]
    };
    if (message) await message.edit(payload);
    else message = await channel.send(payload);
  } else if (type === "status") {
    const totalMembers = client.guilds.cache.reduce((sum, g) => sum + (g.memberCount || 0), 0);
    const text = `🟢 **Botrix Status**\n\n**Status:** Online\n**Servers:** ${client.guilds.cache.size}\n**Members:** ${totalMembers.toLocaleString()}\n**Last update:** <t:${Math.floor(Date.now()/1000)}:R>`;
    const payload = { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(text).setThumbnail(BOTRIX_IMAGE_URL)] };
    if (message) await message.edit(payload);
    else message = await channel.send(payload);
  } else {
    const payload = {
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🛠️ Botrix System — Updates")
          .setDescription([
            "✨ **New Features**",
            "",
            "🎤 **Voice**",
            "• `/joinvc` — Join a voice channel",
            "• `/leavevc` — Leave the voice channel",
            "",
            "👋 **Welcome**",
            "• `/welcome channel` — Configure the welcome channel",
            "• Welcome message stays as plain text, without a frame",
            "",
            "🛠️ **Server Profile**",
            "• Change Botrix Photo",
            "• Change Botrix Name",
            "• Change Botrix Background",
            "",
            "📖 **Help**",
            "• `/help` — New framed command panel",
            "• Invite to another server button",
            "",
            "📊 **Live Status**",
            "• Online status",
            "• Server count",
            "• Member count",
            "• Last update time"
          ].join("\n"))
          .setThumbnail(BOTRIX_IMAGE_URL)
          .setFooter({ text: "Botrix System" })
      ]
    };
    if (message) await message.edit(payload);
    else message = await channel.send(payload);
  }

  if (message) {
    db.publicPanels[key] = message.id;
    saveJSON(files.publicPanels, db.publicPanels);
  }
  return message;
}

async function refreshPublicPanels() {
  // The Updates channel is a fixed changelog. It is not refreshed every minute.
  await upsertPublicPanel(BOTRIX_UPDATE_CHANNEL_ID, "update").catch(() => {});
  await upsertPublicPanel(BOTRIX_STATUS_CHANNEL_ID, "status").catch(() => {});
  await upsertPublicPanel(BOTRIX_INVITE_CHANNEL_ID, "help").catch(() => {});
}

async function refreshLiveStatus() {
  await upsertPublicPanel(BOTRIX_STATUS_CHANNEL_ID, "status").catch(() => {});
}


/* =========================================================
   AUTOMATIC OUR WEBSITE PANEL
   Sends/updates the website message automatically in
   channel 1551600238144266300 when Botrix starts.
========================================================= */
async function upsertWebsiteWelcomePanel() {
  try {
    const channel = await client.channels.fetch(WEBSITE_WELCOME_CHANNEL_ID).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error(`❌ Our Website channel not found: ${WEBSITE_WELCOME_CHANNEL_ID}`);
      return;
    }

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const existing = messages?.find(message =>
      message.author.id === client.user.id &&
      message.embeds?.[0]?.footer?.text === "Botrix System • Our Website"
    );

    const websiteEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🤖 Welcome to Botrix System!")
      .setDescription(
        "✨ **Our Website**\n\n" +
        "🌐 Discover Botrix System, manage your server and access all our tools from our official website.\n\n" +
        "⚡ **Quick Links**\n" +
        "🛠️ **Botrix Dashboard** — Manage your Botrix setup\n" +
        "🤖 **Botrix System** — Powerful Discord tools\n" +
        "💬 **Need help?** Just ask — our team is here for you."
      )
      .setThumbnail(BOTRIX_IMAGE_URL)
      .setImage("attachment://botrix.png")
      .setFooter({ text: "Botrix System • Our Website" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Visit Our Website")
        .setStyle(ButtonStyle.Link)
        .setURL(BOTRIX_WEBSITE_URL)
    );

    const payload = {
      embeds: [websiteEmbed],
      components: [row],
      files: botrixFiles()
    };

    if (existing) {
      await existing.edit(payload);
      console.log(`🌐 Our Website message updated in #${channel.name}`);
    } else {
      await channel.send(payload);
      console.log(`🌐 Our Website message sent automatically in #${channel.name}`);
    }
  } catch (error) {
    console.error("❌ Our Website panel error:", error);
  }
}

/* =========================================================
   READY
========================================================= */

client.once(
  "clientReady",
  async () => {

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      "🤖 BOTRIX SYSTEM"
    );

    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    console.log(
      `🌐 Servers: ${client.guilds.cache.size}`
    );

    console.log(
      `👑 Owner Server: ${BOT_OWNER_SERVER_ID}`
    );

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    rotateStatus();

    // Timed-ban scheduler is not implemented in this source file.

    setInterval(
      rotateStatus,
      10_000
    );

    // IMPORTANT: Do not block the interaction gateway with startup REST work.
    // Discord requires the first interaction acknowledgement within a few seconds.
    // Running command registration / panel setup / website updates here can queue
    // REST requests and make a freshly-used slash command expire with error 10062.
    // Start these background tasks after the bot is fully ready to receive commands.
    setTimeout(async () => {
      try {
        await registerCommands();
      } catch (error) {
        console.error(
          "❌ Command registration error:",
          error
        );
      }

      try {
        await setupOwnerPanels();
      } catch (error) {
        console.error(
          "❌ Owner panel setup error:",
          error
        );
      }

      try {
        await setupVerificationInfoPanel();
      } catch (error) {
        console.error("❌ Verification info panel setup error:", error);
      }

      try {
        await refreshPublicPanels();
      } catch (error) {
        console.error("❌ Public panels refresh error:", error);
      }

      try {
        await upsertWebsiteWelcomePanel();
      } catch (error) {
        console.error("❌ Website welcome panel error:", error);
      }
    }, 3000);

    // Only the live Status message is refreshed automatically.
    setInterval(refreshLiveStatus, 30_000);
  }
);

/* =========================================================
   OWNER CONTROL PANELS
========================================================= */

async function ownerOnlyPanelCheck(interaction) {
  return isBotOwner(interaction);
}

async function safeShowModal(interaction, modal) {
  try {
    if (!interaction || !interaction.isButton()) return false;
    if (interaction.replied || interaction.deferred) return false;

    await interaction.showModal(modal);
    return true;
  } catch (error) {
    if (error?.code === 10062 || error?.rawError?.code === 10062) {
      console.warn(
        `⚠️ Modal interaction expired: ${interaction.customId} (${interaction.id})`
      );
      return false;
    }

    if (error?.code === 40060 || error?.rawError?.code === 40060) {
      console.warn(
        `⚠️ Modal interaction was already acknowledged: ${interaction.customId}`
      );
      return false;
    }

    console.error(`❌ Could not open modal ${interaction.customId}:`, error);
    return false;
  }
}

function controlPanelEmbed(title, description) {
  return botrixEmbed(
    title,
    description,
    0x5865f2
  );
}

function makePanelButton(customId, label, emoji, style = ButtonStyle.Primary) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style);
}

async function sendOrUpdateOwnerPanel(channelId, embed, components) {
  const channel = await client.channels.fetch(channelId, { force: true }).catch(error => {
    console.error(`❌ Could not fetch owner panel channel ${channelId}:`, error?.message || error);
    return null;
  });

  if (!channel) {
    console.error(`❌ Owner panel channel not found or Botrix has no access: ${channelId}`);
    return;
  }

  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    console.error(`❌ Owner panel ID ${channelId} is not a text/announcement channel. Type: ${channel.type}`);
    return;
  }

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const existing = messages?.find(
    message =>
      message.author.id === client.user.id &&
      message.embeds?.[0]?.footer?.text === "Botrix System"
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components }).catch(error => {
      console.error(`❌ Could not update panel ${channelId}:`, error);
    });
    return;
  }

  await channel.send({ embeds: [embed], components }).catch(error => {
    console.error(`❌ Could not send panel ${channelId}:`, error);
  });
}


function getVerifiedUserStats() {
  const users = readVerifiedUsers();
  const entries = Object.entries(users).filter(([, item]) => item && item.verified_at);
  let latest = null;

  for (const [userId, item] of entries) {
    const time = Date.parse(item.verified_at);
    if (!Number.isNaN(time) && (!latest || time > latest.time)) {
      latest = {
        userId,
        username: item.username || "Unknown",
        time
      };
    }
  }

  return {
    total: entries.length,
    latest
  };
}

async function setupVerificationInfoPanel() {
  const channel = await client.channels.fetch(VERIFICATION_INFO_CHANNEL_ID, { force: true }).catch(error => {
    console.error(`❌ Could not fetch verification info channel ${VERIFICATION_INFO_CHANNEL_ID}:`, error?.message || error);
    return null;
  });

  if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    console.error(`❌ Verification info channel ${VERIFICATION_INFO_CHANNEL_ID} was not found or is not a text/announcement channel.`);
    return;
  }

  const { total, latest } = getVerifiedUserStats();
  const latestText = latest
    ? `<@${latest.userId}> — <t:${Math.floor(latest.time / 1000)}:R>`
    : "No verification yet.";

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🔐 Botrix System — Verification Info")
    .setDescription([
      "Statistics for Discord users who completed Botrix OAuth verification.",
      "",
      `👥 **Verified users:** \`${total}\``,
      `🕐 **Latest verification:** ${latestText}`,
      "",
      "The number updates automatically whenever a new user verifies."
    ].join("\n"))
    .setFooter({ text: "Botrix System • Verification Statistics" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    makePanelButton("botrix_verification_info_refresh", "Refresh", "🔄", ButtonStyle.Secondary)
  );

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const existing = messages?.find(
    message =>
      message.author.id === client.user.id &&
      message.embeds?.[0]?.footer?.text === "Botrix System • Verification Statistics"
  );

  const payload = { embeds: [embed], components: [row] };

  if (existing) {
    await existing.edit(payload).catch(error => {
      console.error(`❌ Could not update verification info panel ${VERIFICATION_INFO_CHANNEL_ID}:`, error);
    });
  } else {
    await channel.send(payload).catch(error => {
      console.error(`❌ Could not send verification info panel ${VERIFICATION_INFO_CHANNEL_ID}:`, error);
    });
  }
}

async function setupOwnerPanels() {
  const guild = client.guilds.cache.get(BOT_OWNER_SERVER_ID);
  if (!guild) {
    console.error("❌ Botrix owner server is not available for control panels.");
    return;
  }

  const controlEmbed = controlPanelEmbed(
    "🛠️ Botrix System — Control Server",
    [
      "Use the buttons below to manage Botrix server customization access.",
      "",
      "🔓 **Give Access** — allow a server owner to use `/change`.",
      "🔒 **Remove Access** — remove customization access from a server.",
      "⚙️ **Change Server** — change Botrix name, photo or background by Server ID.",
      "🔐 **Info Access** — view servers that currently have access.",
      "",
      "⚠️ These controls are restricted to members with the Botrix Owner role."
    ].join("\n")
  );

  const controlRow = new ActionRowBuilder().addComponents(
    makePanelButton("botrix_panel_give_access", "Give Access", "🔓"),
    makePanelButton("botrix_panel_remove_access", "Remove Access", "🔒", ButtonStyle.Danger),
    makePanelButton("botrix_panel_info_access", "Info Access", "🔐", ButtonStyle.Secondary)
  );

  await sendOrUpdateOwnerPanel(
    CONTROL_SERVER_CHANNEL_ID,
    controlEmbed,
    [controlRow]
  );

  await sendOrUpdateOwnerPanel(
    OWNER_CHANGE_CHANNEL_ID,
    controlPanelEmbed(
      "⚙️ Botrix System — Change Server",
      [
        "Press **Change** and enter the Discord Server ID.",
        "",
        "You can then change Botrix's **Name**, **Photo** or **Background** on that server.",
        "",
        "⚠️ This panel is restricted to members with the Botrix Owner role."
      ].join("\n"),
      0x5865f2
    ),
    [
      new ActionRowBuilder().addComponents(
        makePanelButton("botrix_owner_change", "Change", "⚙️")
      )
    ]
  );

  await sendOrUpdateOwnerPanel(
    LEAVE_BOT_CHANNEL_ID,
    controlPanelEmbed(
      "🚪 Botrix System — Leave Bot",
      [
        "Use the button below to make Botrix leave a Discord server.",
        "",
        "Enter the **Server ID** of the server you want Botrix to leave.",
        "",
        "⚠️ This control is restricted to members with the Botrix Owner role."
      ].join("\n"),
      0xed1c24
    ),
    [
      new ActionRowBuilder().addComponents(
        makePanelButton("botrix_panel_leave_bot", "Leave Bot", "🚪", ButtonStyle.Danger)
      )
    ]
  );


}

async function showServersInfo(interaction) {
  const guilds = [...client.guilds.cache.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const lines = guilds.map((guild, index) => {
    const access = db.serverAccess[guild.id];
    const status = access?.enabled && access.ownerId === guild.ownerId
      ? "🟢 Access"
      : "⚪ No access";

    return [
      `**${index + 1}. ${guild.name}**`,
      `> **ID:** \`${guild.id}\``,
      `> **Owner:** <@${guild.ownerId}>`,
      `> **Status:** ${status}`
    ].join("\n");
  });

  const chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n\n" + line).length > 3900) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current += current ? `\n\n${line}` : line;
    }
  }

  if (current) chunks.push(current);

  await interaction.editReply({
    embeds: [
      botrixEmbed(
        "🌐 Botrix System — Servers",
        chunks[0] || "Botrix is not in any servers.",
        0x5865f2
      )
    ],
    ephemeral: true
  });

  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({
      embeds: [
        botrixEmbed(
          `🌐 Botrix Servers — Page ${i + 1}`,
          chunks[i],
          0x5865f2
        )
      ],
      ephemeral: true
    });
  }
}

async function showInfoAccess(interaction) {
  const entries = Object.entries(db.serverAccess).filter(
    ([, access]) => access?.enabled === true
  );

  if (!entries.length) {
    return interaction.editReply({
      embeds: [
        botrixEmbed(
          "🔐 Botrix Access List",
          "No server currently has customization access.",
          0x95a5a6
        )
      ],
      ephemeral: true
    });
  }

  const lines = [];

  for (let i = 0; i < entries.length; i++) {
    const [guildId, access] = entries[i];
    const guild = client.guilds.cache.get(guildId);
    const serverName = guild?.name || "Unknown / Bot left server";
    const ownerId = access.ownerId || guild?.ownerId || "Unknown";
    const owner = ownerId !== "Unknown"
      ? await client.users.fetch(ownerId).catch(() => null)
      : null;

    lines.push([
      `**${i + 1}. ${serverName}**`,
      `> **Server ID:** \`${guildId}\``,
      `> **Owner:** <@${ownerId}>`,
      `> **Owner Tag:** ${owner?.tag || "Unknown"}`,
      `> **Access:** 🟢 Enabled`
    ].join("\n"));
  }

  return interaction.editReply({
    embeds: [
      botrixEmbed(
        "🔐 Botrix System — Access List",
        lines.join("\n\n"),
        0x5865f2
      )
    ]
  });
}

async function openAccessModal(interaction, action) {
  const modal = new ModalBuilder()
    .setCustomId(`botrix_${action}_modal`)
    .setTitle(action === "give_access" ? "Give Server Access" : "Remove Server Access");

  const input = new TextInputBuilder()
    .setCustomId("botrix_server_id")
    .setLabel("Discord Server ID")
    .setPlaceholder("Enter the server ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(32);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return safeShowModal(interaction, modal);
}

async function openLeaveBotModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("botrix_leave_bot_modal")
    .setTitle("Leave Bot From Server");

  const input = new TextInputBuilder()
    .setCustomId("botrix_leave_server_id")
    .setLabel("Discord Server ID")
    .setPlaceholder("Enter the server ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(32);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return safeShowModal(interaction, modal);
}

async function sendCustomizationLog(channelId, embed) {
  try {
    const channel = await client.channels.fetch(channelId, { force: true });
    if (!channel || !channel.isTextBased()) {
      console.error(`❌ Customization log channel is invalid: ${channelId}`);
      return false;
    }

    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`❌ Could not send customization log to ${channelId}:`, error?.message || error);
    return false;
  }
}

/* =========================================================
   OWNER SERVER CHANGE PANEL
========================================================= */

function ownerChangeEmbed(guild) {
  const me = guild.members.me;
  const currentName = me?.nickname || client.user.username;

  return controlPanelEmbed(
    "⚙️ Botrix System — Server Customization",
    [
      `**Server:** ${guild.name}`,
      `**Server ID:** \`${guild.id}\``,
      `**Current Bot Name:** ${currentName}`,
      "",
      "Choose what you want to change:",
      "",
      "🏷️ **Change Name** — server nickname",
      "🖼️ **Change Photo** — server avatar",
      "🎨 **Change Background** — server profile background/3omraner",
      "",
      "↩️ **Reset** — restore the server profile to the global/default values",
      "",
      "⚠️ This change applies only to this server."
    ].join("\n")
  );
}

function ownerChangeRows(guildId) {
  return [
    new ActionRowBuilder().addComponents(
      makePanelButton(`botrix_owner_change_name_${guildId}`, "Change Name", "🏷️"),
      makePanelButton(`botrix_owner_change_photo_${guildId}`, "Change Photo", "🖼️", ButtonStyle.Secondary),
      makePanelButton(`botrix_owner_change_banner_${guildId}`, "Change Background", "🎨", ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      makePanelButton(`botrix_owner_reset_name_${guildId}`, "Reset Name", "↩️", ButtonStyle.Secondary),
      makePanelButton(`botrix_owner_reset_photo_${guildId}`, "Reset Photo", "↩️", ButtonStyle.Secondary),
      makePanelButton(`botrix_owner_reset_banner_${guildId}`, "Reset Background", "↩️", ButtonStyle.Secondary),
      makePanelButton(`botrix_owner_reset_all_${guildId}`, "Reset All", "🔄", ButtonStyle.Danger)
    )
  ];
}

async function openOwnerChangeServerModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("botrix_owner_change_server_modal")
    .setTitle("Change Botrix Server");

  const input = new TextInputBuilder()
    .setCustomId("botrix_owner_target_server_id")
    .setLabel("Discord Server ID")
    .setPlaceholder("Enter the server ID")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(25);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return safeShowModal(interaction, modal);
}

async function openOwnerChangeModal(interaction, type, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return safeReply(interaction, { content: `❌ I can't find server ID \`${guildId}\` in my servers.`, flags: 64 });
  }

  if (type === "name") {
    const modal = new ModalBuilder()
      .setCustomId(`botrix_owner_change_name_modal_${guildId}`)
      .setTitle("Change Botrix Name");
    const input = new TextInputBuilder()
      .setCustomId("botrix_owner_new_name")
      .setLabel("New Botrix server name")
      .setPlaceholder("Maximum 32 characters")
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(32);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return safeShowModal(interaction, modal);
  }

  const isBanner = type === "banner";
  const modal = new ModalBuilder()
    .setCustomId(`botrix_owner_change_${isBanner ? "banner" : "photo"}_modal_${guildId}`)
    .setTitle(isBanner ? "Change Botrix Background" : "Change Botrix Photo");
  const input = new TextInputBuilder()
    .setCustomId(isBanner ? "botrix_owner_new_banner" : "botrix_owner_new_photo")
    .setLabel(isBanner ? "Background Image URL" : "Image URL")
    .setPlaceholder("https://example.com/image.png")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return safeShowModal(interaction, modal);
}

/* =========================================================
   SERVER LOGGING
========================================================= */

async function sendServerLog(guild, title, description, color = 0x5865f2) {
  try {
    const channelId = db.logsChannels[guild.id];
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: `Botrix Logs • ${guild.name}` });
    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error("❌ Server log error:", error.message);
  }
}

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

      // IMPORTANT: Chat-input interactions must be acknowledged immediately.
      // Discord only keeps the initial interaction token valid for a few seconds.
      // Deferring before any other command work prevents 10062 Unknown interaction
      // errors caused by slow handlers or API calls elsewhere in this listener.
      // Acknowledge modal submits immediately so later API calls cannot cause 40060.
      if (interaction.isModalSubmit()) {
        try {
          await interaction.deferReply({ flags: 64 });
        } catch (error) {
          if (error?.code === 10062 || error?.rawError?.code === 10062) {
            console.warn(`⚠️ Modal interaction expired before acknowledgement: ${interaction.customId}`);
          } else if (error?.code !== 40060 && error?.rawError?.code !== 40060) {
            console.error("❌ Could not defer modal:", error);
          }
          return;
        }
      }

      if (interaction.isChatInputCommand()) {
        /*
          Fast commands should reply directly instead of calling deferReply().
          Discord shows "Botrix System réfléchit..." while an interaction is
          deferred. Moderation commands such as /roles
          are fast enough to use safeReply() directly.

          Commands that can perform longer API/database work keep deferReply().
        */
        const deferredCommands = new Set([
          "change",
          "welcome",
          "autorole",
          "ticket",
          "sendmessage",
          "giveways",
          "ai",
          "logs",
          "joinvc",
          "leavevc"
        ]);

        if (deferredCommands.has(interaction.commandName)) {
          try {
            await interaction.deferReply(
              ["change", "welcome", "autorole", "ticket", "sendmessage", "giveways", "ai"].includes(interaction.commandName)
                ? { flags: 64 }
                : undefined
            );
          } catch (error) {
            if (error?.code === 10062 || error?.rawError?.code === 10062) {
              console.warn(`⚠️ Interaction expired before acknowledgement: /${interaction.commandName}`);
            } else {
              console.error("❌ Could not defer command:", error);
            }
            return;
          }
        }
      }

      /* BOTRIX OAUTH VERIFICATION COMMANDS */
      if (interaction.isChatInputCommand() && interaction.commandName === "verification_bot") {
        if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return safeReply(interaction, { content: "❌ You need **Manage Server** permission to post this panel.", flags: 64 });
        }
        const verifyBase = process.env.OAUTH_REDIRECT_URI
          ? new URL(process.env.OAUTH_REDIRECT_URI).origin
          : null;
        if (!verifyBase || !process.env.OAUTH_CLIENT_SECRET) {
          return safeReply(interaction, { content: "❌ OAuth verification is not configured. Set OAUTH_CLIENT_SECRET and OAUTH_REDIRECT_URI in your private .env, then restart Botrix.", flags: 64 });
        }
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("Verification Our System")
          .setDescription("**Verify your Discord account with Botrix System.**\n\nClick the button below and authorize Discord OAuth. We never ask for your Discord password.")
          .setFooter({ text: "Botrix System • Secure Discord OAuth Verification" })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Verifier Now")
            .setStyle(ButtonStyle.Link)
            .setURL(`${verifyBase}/verify`)
            .setEmoji("✅")
        );
        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      if (interaction.isChatInputCommand() && interaction.commandName === "addmembre") {
        if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return safeReply(interaction, { content: "❌ You need **Manage Server** permission to use this command.", flags: 64 });
        }

        const targetId = interaction.options.getString("serverid", true).trim();
        if (!/^\d{15,25}$/.test(targetId)) {
          return safeReply(interaction, { content: "❌ Invalid server ID. Use the target Discord server ID.", flags: 64 });
        }

        const targetGuild = client.guilds.cache.get(targetId);
        if (!targetGuild) {
          return safeReply(interaction, { content: "❌ Botrix must already be in the target server before adding verified users.", flags: 64 });
        }

        // /addmembre is locked behind the Botrix Owner "Give Access" panel.
        // The access must belong to this exact server and its current owner.
        const access = db.serverAccess[targetId];
        const accessGranted = Boolean(
          access &&
          access.enabled === true &&
          access.ownerId === targetGuild.ownerId
        );

        if (!accessGranted) {
          return safeReply(interaction, {
            content: "❌ **This server does not have Botrix access.**\n\nAn authorized Botrix Owner must grant access to this server from the **Access Panel** before `/addmembre` can be used.",
            flags: 64
          });
        }

        // Prevent an owner of another server from using a granted server's access.
        if (interaction.user.id !== targetGuild.ownerId) {
          return safeReply(interaction, {
            content: "❌ Only the **owner of the target server** can use `/addmembre` for this server.",
            flags: 64
          });
        }
        const tokenStorePath = path.join(dataDir, "verifiedUsers.json");
        let verified = {};
        try {
          if (fs.existsSync(tokenStorePath)) verified = JSON.parse(fs.readFileSync(tokenStorePath, "utf8"));
        } catch (err) {
          console.error("Could not read verifiedUsers.json:", err);
          return safeReply(interaction, { content: "❌ Verification storage could not be read. Check data/verifiedUsers.json.", flags: 64 });
        }
        const entries = Object.entries(verified).filter(([id, item]) => item?.access_token && item?.guilds_join === true);
        if (!entries.length) {
          return safeReply(interaction, { content: "ℹ️ No users have completed OAuth verification yet.", flags: 64 });
        }
        let added = 0, alreadyOrFailed = 0;
        for (const [userId, item] of entries) {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${targetId}/members/${userId}`, {
              method: "PUT",
              headers: {
                "Authorization": `Bot ${TOKEN}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ access_token: item.access_token })
            });
            if (response.status === 201 || response.status === 204) added++;
            else {
              alreadyOrFailed++;
              const detail = await response.text().catch(() => "");
              console.warn(`OAuth add member failed for ${userId}: ${response.status} ${detail.slice(0, 250)}`);
            }
          } catch (err) {
            alreadyOrFailed++;
            console.warn(`OAuth add member request failed for ${userId}:`, err.message);
          }
        }
        return safeReply(interaction, {
          content: `✅ **Add members finished** for **${targetGuild.name}**.\n• Added: **${added}**\n• Already in server or could not add: **${alreadyOrFailed}**\n\nOnly users who explicitly authorized verification are processed.`,
          flags: 64
        });
      }

      /* VERIFICATION INFO PANEL */
      if (interaction.isButton() && interaction.customId === "botrix_verification_info_refresh") {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to refresh this panel.", flags: 64 });
        }

        await setupVerificationInfoPanel();
        return safeReply(interaction, { content: "✅ Verification statistics refreshed.", flags: 64 });
      }

      /* OWNER CHANGE PANEL */
      if (interaction.isButton() && interaction.customId === "botrix_owner_change") {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to use this panel.", flags: 64 });
        }
        return openOwnerChangeServerModal(interaction);
      }

      if (interaction.isButton() && /^botrix_owner_change_(name|photo|banner)_\d{15,25}$/.test(interaction.customId)) {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to use this panel.", flags: 64 });
        }
        const match = interaction.customId.match(/^botrix_owner_change_(name|photo|banner)_(\d{15,25})$/);
        return openOwnerChangeModal(interaction, match[1], match[2]);
      }

      /* OWNER RESET PROFILE BUTTONS */
      if (interaction.isButton() && /^botrix_owner_reset_(name|photo|banner|all)_\d{15,25}$/.test(interaction.customId)) {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to use this panel.", flags: 64 });
        }

        const match = interaction.customId.match(/^botrix_owner_reset_(name|photo|banner|all)_(\d{15,25})$/);
        const type = match[1];
        const guildId = match[2];
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
          return safeReply(interaction, { content: `❌ I can't find server ID \`${guildId}\` in my servers.`, flags: 64 });
        }

        try {
          const me = await guild.members.fetchMe().catch(() => guild.members.me);
          if (!me) {
            return safeReply(interaction, { content: "❌ I couldn't find Botrix in that server.", flags: 64 });
          }

          if (type === "name") {
            if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
              return safeReply(interaction, { content: "❌ Botrix needs **Change Nickname** permission in that server.", flags: 64 });
            }
            await me.setNickname(null, `Botrix owner reset server name by ${interaction.user.tag}`);
            return safeReply(interaction, { content: `✅ Botrix name reset in **${guild.name}** to the global username.`, flags: 64 });
          }

          if (type === "photo") {
            await guild.members.editMe({ avatar: null, reason: `Botrix owner reset server avatar by ${interaction.user.tag}` });
            return safeReply(interaction, { content: `✅ Botrix photo reset in **${guild.name}** to the global avatar.`, flags: 64 });
          }

          if (type === "banner") {
            await guild.members.editMe({ banner: null, reason: `Botrix owner reset server banner by ${interaction.user.tag}` });
            return safeReply(interaction, { content: `✅ Botrix background reset in **${guild.name}**.`, flags: 64 });
          }

          if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
            return safeReply(interaction, { content: "❌ Botrix needs **Change Nickname** permission in that server.", flags: 64 });
          }

          await me.setNickname(null, `Botrix owner reset all server profile fields by ${interaction.user.tag}`);
          await guild.members.editMe({
            avatar: null,
            banner: null,
            reason: `Botrix owner reset all server profile fields by ${interaction.user.tag}`
          });

          return safeReply(interaction, { content: `✅ Botrix server profile reset in **${guild.name}**: name, photo and background.`, flags: 64 });
        } catch (error) {
          console.error("❌ Owner server profile reset error:", error);
          return safeReply(interaction, {
            content: `❌ Could not reset Botrix in **${guild.name}**.\n\`${error.message || "Unknown error"}\``,
            flags: 64
          }).catch(() => {});
        }
      }

      /* ====================================================
         GIVEWAYS JOIN BUTTON
      ==================================================== */

      if (interaction.isButton() && interaction.customId.startsWith("giveways_join_")) {
        const giveawayId = interaction.customId.slice("giveways_join_".length);
        const giveaway = db.giveaways[giveawayId];

        if (!giveaway || giveaway.status !== "active") {
          return safeReply(interaction, { content: "❌ This giveaway is no longer active.", ephemeral: true });
        }

        if (giveaway.guildId !== interaction.guildId) {
          return safeReply(interaction, { content: "❌ This giveaway belongs to another server.", ephemeral: true });
        }

        if (giveaway.participants.includes(interaction.user.id)) {
          return safeReply(interaction, { content: "✅ You are already entered in this giveaway.", ephemeral: true });
        }

        giveaway.participants.push(interaction.user.id);
        saveJSON(files.giveaways, db.giveaways);

        const currentInvites = Number(db.inviteCounts[interaction.guildId]?.[interaction.user.id] || 0);
        const extra = ["invites", "members"].includes(giveaway.type)
          ? `\n\n📨 Your current invites: **${currentInvites}/${giveaway.target}**`
          : "";

        return safeReply(interaction, {
          content: `🎉 **You joined the giveaway!**${extra}`,
          ephemeral: true
        });
      }

      /*
        ====================================================
        OWNER CONTROL PANEL BUTTONS
        ====================================================
      */

      if (
        interaction.isButton() &&
        [
          "botrix_panel_give_access",
          "botrix_panel_remove_access",
          "botrix_panel_leave_bot",
          "botrix_panel_info_access"
        ].includes(interaction.customId)
      ) {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, {
            content: "❌ You need the Botrix Owner role to use this panel.",
            ephemeral: true
          });
        }

        if (interaction.customId === "botrix_panel_give_access") {
          return openAccessModal(interaction, "give_access");
        }

        if (interaction.customId === "botrix_panel_remove_access") {
          return openAccessModal(interaction, "remove_access");
        }

        if (interaction.customId === "botrix_panel_leave_bot") {
          return openLeaveBotModal(interaction);
        }

        if (interaction.customId === "botrix_panel_info_access") {
          await interaction.deferReply({ flags: 64 });
          return showInfoAccess(interaction);
        }
      }

      /* OWNER CHANGE SERVER MODAL */
      if (interaction.isModalSubmit() && interaction.customId === "botrix_owner_change_server_modal") {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to use this panel.", flags: 64 });
        }

        const serverId = interaction.fields.getTextInputValue("botrix_owner_target_server_id").trim();
        if (!/^\d{15,25}$/.test(serverId)) {
          return safeReply(interaction, { content: "❌ Invalid Discord Server ID.", flags: 64 });
        }

        const guild = client.guilds.cache.get(serverId);
        if (!guild) {
          return safeReply(interaction, { content: `❌ I can't find server ID \`${serverId}\` in my servers.`, flags: 64 });
        }

        return safeReply(interaction, {
          embeds: [ownerChangeEmbed(guild)],
          components: ownerChangeRows(guild.id),
          flags: 64
        });
      }

      /* OWNER CHANGE NAME / PHOTO / BACKGROUND MODALS */
      if (interaction.isModalSubmit() && /^botrix_owner_change_(name|photo|banner)_modal_\d{15,25}$/.test(interaction.customId)) {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, { content: "❌ You need the Botrix Owner role to use this panel.", flags: 64 });
        }

        const match = interaction.customId.match(/^botrix_owner_change_(name|photo|banner)_modal_(\d{15,25})$/);
        const type = match[1];
        const guildId = match[2];
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
          return safeReply(interaction, { content: `❌ I can't find server ID \`${guildId}\` in my servers.`, flags: 64 });
        }

        try {
          const me = await guild.members.fetchMe().catch(() => guild.members.me);
          if (!me) return safeReply(interaction, { content: "❌ I couldn't find Botrix in that server.", flags: 64 });

          if (type === "name") {
            if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
              return safeReply(interaction, { content: "❌ Botrix needs **Change Nickname** permission in that server.", flags: 64 });
            }
            const newName = interaction.fields.getTextInputValue("botrix_owner_new_name").trim();
            await me.setNickname(newName || null, `Botrix owner customization by ${interaction.user.tag}`);
            return safeReply(interaction, {
              content: `✅ Botrix name changed in **${guild.name}** to **${newName || client.user.username}**.`,
              flags: 64
            });
          }

          const inputId = type === "banner" ? "botrix_owner_new_banner" : "botrix_owner_new_photo";
          const imageUrl = interaction.fields.getTextInputValue(inputId).trim();
          if (!/^https?:\/\/\S+/i.test(imageUrl)) {
            return safeReply(interaction, { content: "❌ Please enter a valid image URL starting with http:// or https://.", flags: 64 });
          }

          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`Could not download the image (HTTP ${response.status}).`);
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.startsWith("image/")) throw new Error("The URL does not point to an image.");
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > 8 * 1024 * 1024) throw new Error("The image is too large. Maximum allowed size is 8 MB.");

          if (type === "photo") {
            await guild.members.editMe({ avatar: buffer, reason: `Botrix owner server avatar customization by ${interaction.user.tag}` });
            return safeReply(interaction, { content: `✅ Botrix photo updated in **${guild.name}**. Discord may take a moment to refresh the avatar.`, flags: 64 });
          }

          await guild.members.editMe({ banner: buffer, reason: `Botrix owner server background customization by ${interaction.user.tag}` });
          return safeReply(interaction, { content: `✅ Botrix background updated in **${guild.name}**. Discord may take a moment to refresh the banner.`, flags: 64 });
        } catch (error) {
          console.error("❌ Owner server customization error:", error);
          return safeReply(interaction, { content: `❌ Could not change Botrix in **${guild.name}**.\n\`${error.message || "Unknown error"}\``, flags: 64 }).catch(() => {});
        }
      }

      /*
        ====================================================
        OWNER CONTROL PANEL MODALS
        ====================================================
      */

      if (
        interaction.isModalSubmit() &&
        [
          "botrix_give_access_modal",
          "botrix_remove_access_modal",
          "botrix_leave_bot_modal"
        ].includes(interaction.customId)
      ) {
        if (!(await ownerOnlyPanelCheck(interaction))) {
          return safeReply(interaction, {
            content: "❌ You need the Botrix Owner role to use this panel.",
            ephemeral: true
          });
        }

        const leaveServerId = interaction.customId === "botrix_leave_bot_modal"
          ? interaction.fields.getTextInputValue("botrix_leave_server_id").trim()
          : null;

        if (interaction.customId === "botrix_leave_bot_modal") {
          const serverId = leaveServerId;

          if (!/^\d{15,25}$/.test(serverId)) {
            return safeReply(interaction, {
              content: "❌ Invalid Discord Server ID.",
              ephemeral: true
            });
          }

          if (serverId === BOT_OWNER_SERVER_ID) {
            return safeReply(interaction, {
              content: "❌ Botrix cannot leave the owner/control server.",
              ephemeral: true
            });
          }

          const guild = client.guilds.cache.get(serverId);

          if (!guild) {
            return safeReply(interaction, {
              content: `❌ I can't find server ID \`${serverId}\` in my servers.`,
              ephemeral: true
            });
          }

          const serverName = guild.name;
          const owner = await guild.fetchOwner().catch(() => null);
          const ownerText = owner ? `${owner.user.tag} (<@${owner.id}>)` : "Unknown";

          delete db.serverAccess[guild.id];
          saveJSON(files.serverAccess, db.serverAccess);

          await guild.leave();

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "🚪 Botrix Left Server",
                [
                  `**Server:** ${serverName}`,
                  `**Server ID:** \`${serverId}\``,
                  `**Owner:** ${ownerText}`,
                  "",
                  "Botrix has left the server successfully."
                ].join("\n"),
                0xed1c24
              )
            ],
            ephemeral: true
          });
        }

        const serverId = interaction.fields
          .getTextInputValue("botrix_server_id")
          .trim();

        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
          return safeReply(interaction, {
            content: `❌ I can't find server ID \`${serverId}\` in my servers.`,
            ephemeral: true
          });
        }

        if (interaction.customId === "botrix_give_access_modal") {
          const owner = await guild.fetchOwner().catch(() => null);

          if (!owner) {
            return safeReply(interaction, {
              content: "❌ I couldn't fetch the owner of that server.",
              ephemeral: true
            });
          }

          db.serverAccess[guild.id] = {
            enabled: true,
            ownerId: owner.id,
            grantedAt: Date.now(),
            grantedBy: interaction.user.id
          };

          saveJSON(files.serverAccess, db.serverAccess);

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "✅ Server Access Granted",
                [
                  `**Server:** ${guild.name}`,
                  `**Server ID:** \`${guild.id}\``,
                  `**Owner:** ${owner.user.tag}`,
                  `**Owner ID:** \`${owner.id}\``,
                  "",
                  "The owner can now use **/change**.",
                  "",
                  "The customization is **server-specific**."
                ].join("\n"),
                0x2ecc71
              )
            ],
            ephemeral: true
          });
        }

        const access = db.serverAccess[guild.id];

        if (!access?.enabled) {
          return safeReply(interaction, {
            content: `ℹ️ **${guild.name}** doesn't have customization access.`,
            ephemeral: true
          });
        }

        delete db.serverAccess[guild.id];
        saveJSON(files.serverAccess, db.serverAccess);

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "🗑️ Server Access Removed",
              [
                `**Server:** ${guild.name}`,
                `**Server ID:** \`${guild.id}\``,
                `**Previous Owner:** <@${access.ownerId}>`,
                "",
                "The server owner can no longer use **/change**."
              ].join("\n"),
              0xed1c24
            )
          ],
          ephemeral: true
        });
      }


    /*
      ======================================================
      CHANGE BUTTONS
      ======================================================
    */

    if (
      interaction.isButton() &&
      [
        "botrix_change_name",
        "botrix_change_photo",
        "botrix_change_banner"
      ].includes(
        interaction.customId
      )
    ) {

      try {

        if (!interaction.guild) {
          return safeReply(interaction, {
            content:
              "❌ This can only be used in a server.",
            ephemeral: true
          });
        }

        if (
          !hasServerChangeAccess(
            interaction.guild,
            interaction.user.id
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You don't have access to customize Botrix in this server.",
            ephemeral: true
          });
        }

        if (
          interaction.customId ===
          "botrix_change_name"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "botrix_change_name_modal"
              )
              .setTitle(
                "Change Botrix Name"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "botrix_new_name"
              )
              .setLabel(
                "New Botrix server name"
              )
              .setPlaceholder(
                "Maximum 32 characters"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(false)
              .setMaxLength(32);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );

          return safeShowModal(
            interaction,
            modal
          );
        }

        if (
          interaction.customId ===
          "botrix_change_photo"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "botrix_change_photo_modal"
              )
              .setTitle(
                "Change Botrix Photo"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "botrix_new_photo"
              )
              .setLabel(
                "Image URL"
              )
              .setPlaceholder(
                "https://example.com/image.png"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true)
              .setMaxLength(500);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );

          return safeShowModal(
            interaction,
            modal
          );
        }

        if (
          interaction.customId ===
          "botrix_change_banner"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "botrix_change_banner_modal"
              )
              .setTitle(
                "Change Botrix Background"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "botrix_new_banner"
              )
              .setLabel(
                "Background Image URL"
              )
              .setPlaceholder(
                "https://example.com/background.png"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true)
              .setMaxLength(500);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );

          return safeShowModal(
            interaction,
            modal
          );
        }

      } catch (error) {

        console.error(
          "❌ Change panel error:",
          error
        );

        return safeReply(interaction, {
          content:
            "❌ Could not open customization panel.",
          ephemeral: true
        }).catch(() => {});
      }
    }

    /*
      ======================================================
      CHANGE MODALS
      ======================================================
    */

    if (
      interaction.isModalSubmit() &&
      [
        "botrix_change_name_modal",
        "botrix_change_photo_modal",
        "botrix_change_banner_modal"
      ].includes(
        interaction.customId
      )
    ) {

      try {

        if (!interaction.guild) {
          return safeReply(interaction, {
            content:
              "❌ This can only be used in a server.",
            ephemeral: true
          });
        }

        if (
          !hasServerChangeAccess(
            interaction.guild,
            interaction.user.id
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You don't have access to customize Botrix in this server.",
            ephemeral: true
          });
        }

        const me =
          await interaction.guild.members.fetchMe().catch(() => interaction.guild.members.me);

        if (!me) {
          return safeReply(interaction, {
            content:
              "❌ I couldn't find Botrix in this server.",
            ephemeral: true
          });
        }

        /*
          CHANGE NAME
        */

        if (
          interaction.customId ===
          "botrix_change_name_modal"
        ) {

          if (
            !me.permissions.has(
              PermissionFlagsBits.ChangeNickname
            )
          ) {
            return safeReply(interaction, {
              content:
                "❌ I need **Change Nickname** permission.",
              ephemeral: true
            });
          }

          const newName =
            interaction.fields
              .getTextInputValue(
                "botrix_new_name"
              )
              .trim();

          await me.setNickname(
            newName || null,
            `Botrix customization by ${interaction.user.tag}`
          );

          const nameLogEmbed = botrixEmbed(
            "🏷️ Botrix Name Changed",
            [
              `**Changed By:** ${interaction.user.tag} (<@${interaction.user.id}>)`,
              `**Server:** ${interaction.guild.name}`,
              `**Server ID:** \`${interaction.guild.id}\``,
              `**New Bot Name:** ${newName || "Reset to default username"}`
            ].join("\n"),
            0x9b59b6
          );

          await sendCustomizationLog(NAME_LOG_CHANNEL_ID, nameLogEmbed);

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "✅ Botrix Name Changed",
                newName
                  ? `Botrix's name in **${interaction.guild.name}** is now **${newName}**.`
                  : `Botrix's server name in **${interaction.guild.name}** has been reset.`,
                0x2ecc71
              )
            ],
            ephemeral: true
          });
        }

        /*
          CHANGE PHOTO / BACKGROUND
        */

        const isPhotoChange =
          interaction.customId === "botrix_change_photo_modal";

        const isBannerChange =
          interaction.customId === "botrix_change_banner_modal";

        // IMPORTANT: each modal has its own input customId.
        // Never try to read botrix_new_photo from the background modal.
        const inputId = isBannerChange
          ? "botrix_new_banner"
          : "botrix_new_photo";

        const photoUrl =
          interaction.fields
            .getTextInputValue(inputId)
            .trim();

        if (
          !/^https?:\/\/\S+/i.test(
            photoUrl
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ Please enter a valid image URL starting with `http://` or `https://`.",
            ephemeral: true
          });
        }

        const imageResponse = await fetch(photoUrl);

        if (!imageResponse.ok) {
          throw new Error(`Could not download the image (HTTP ${imageResponse.status}).`);
        }

        const contentType = imageResponse.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          throw new Error("The URL does not point to an image.");
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        if (imageBuffer.length > 8 * 1024 * 1024) {
          throw new Error("The image is too large. Maximum allowed size is 8 MB.");
        }

        // Discord server-profile customization must be applied through the guild member endpoint.
        // Use the member manager directly, then fetch the member again to verify the new profile.
        if (isPhotoChange) {
          const updatedMember = await interaction.guild.members.editMe({
              avatar: imageBuffer,
              reason: `Botrix server avatar customization by ${interaction.user.tag}`
            }
          );

          // Verify Discord actually returned a guild avatar.
          const verifiedMember =
            await interaction.guild.members.fetchMe({ force: true }).catch(() => updatedMember);

          if (!verifiedMember || !verifiedMember.avatar) {
            throw new Error(
              "Discord did not return a server-specific avatar after the update. Check the bot's server permissions and try again."
            );
          }

          const serverOwner = await interaction.guild.fetchOwner().catch(() => null);
          const appliedPhotoUrl = verifiedMember.displayAvatarURL({
            extension: "png",
            size: 1024,
            forceStatic: true
          });

          const photoLogEmbed = botrixEmbed(
            "🖼️ Botrix Server Photo Changed",
            [
              `**Server:** ${interaction.guild.name}`,
              `**Server ID:** \`${interaction.guild.id}\``,
              `**Server Owner:** ${serverOwner ? `${serverOwner.user.tag} (<@${serverOwner.id}>)` : "Unknown"}`,
              `**Changed By:** ${interaction.user.tag} (<@${interaction.user.id}>)`,
              `**Type:** Server Avatar`,
              `**Applied Avatar:** ${appliedPhotoUrl}`,
              `**Source URL:** ${photoUrl}`
            ].join("\n"),
            0x3498db
          );

          photoLogEmbed.setImage(appliedPhotoUrl);
          await sendCustomizationLog(PHOTO_LOG_CHANNEL_ID, photoLogEmbed);

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "✅ Botrix Photo Changed",
                `Botrix's **server avatar** has been changed successfully in **${interaction.guild.name}**.`,
                0x2ecc71
              )
            ],
            ephemeral: true
          });
        }

        // Change Background = server-specific Botrix profile banner.
        if (!isBannerChange) {
          throw new Error("Unknown Botrix customization modal.");
        }

        const updatedMember = await interaction.guild.members.editMe({
            banner: imageBuffer,
            reason: `Botrix server banner customization by ${interaction.user.tag}`
          }
        );

        const verifiedMember =
          await interaction.guild.members.fetchMe({ force: true }).catch(() => updatedMember);

        const appliedBannerUrl =
          typeof verifiedMember.bannerURL === "function"
            ? verifiedMember.bannerURL({ extension: "png", size: 1024 })
            : null;

        if (!appliedBannerUrl) {
          throw new Error(
            "Discord did not return a server-specific background/3omraner after the update. Check the bot's server permissions and try again."
          );
        }

        const serverOwner = await interaction.guild.fetchOwner().catch(() => null);

        const bannerLogEmbed = botrixEmbed(
          "🎨 Botrix Background Changed",
          [
            `**Server:** ${interaction.guild.name}`,
            `**Server ID:** \`${interaction.guild.id}\``,
            `**Server Owner:** ${serverOwner ? `${serverOwner.user.tag} (<@${serverOwner.id}>)` : "Unknown"}`,
            `**Changed By:** ${interaction.user.tag} (<@${interaction.user.id}>)`,
            `**Type:** Server Profile Background / Banner`,
            `**Applied Background:** ${appliedBannerUrl}`,
            `**Source URL:** ${photoUrl}`
          ].join("\n"),
          0x8e44ad
        );

        bannerLogEmbed.setImage(appliedBannerUrl);
        await sendCustomizationLog(PHOTO_LOG_CHANNEL_ID, bannerLogEmbed);

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "✅ Botrix Background Changed",
              `Botrix's **server profile background** has been changed successfully in **${interaction.guild.name}**.`,
              0x2ecc71
            )
          ],
          ephemeral: true
        });

      } catch (error) {

        console.error(
          "❌ Botrix customization error:",
          error
        );

        return safeReply(interaction, {
          content:
            `❌ Could not change Botrix in this server.\n\`${error.message || "Unknown error"}\``,
          ephemeral: true
        }).catch(() => {});
      }
    }

    /* ====================================================
       TICKET OPEN / CLOSE
    ==================================================== */

    if (
      (interaction.isButton() && interaction.customId.startsWith("ticket_open_")) ||
      (interaction.isStringSelectMenu() && interaction.customId === "ticket_category")
    ) {
      if (!interaction.guild) return safeReply(interaction, { content: "❌ This can only be used in a server.", ephemeral: true });

      const index = interaction.isStringSelectMenu()
        ? Number(interaction.values[0])
        : Number(interaction.customId.replace("ticket_open_", ""));
      const cfg = db.ticketConfig[interaction.guild.id] || {};
      const buttonCfg = Array.isArray(cfg.buttons) ? cfg.buttons[index] : null;

      if (!buttonCfg) {
        return safeReply(interaction, { content: "❌ This ticket button is not configured correctly.", ephemeral: true });
      }

      await interaction.deferReply({ flags: 64 });

      try {
        const me = interaction.guild.members.me;
        if (!me) return interaction.editReply("❌ I couldn't find Botrix in this server.");

        const existing = interaction.guild.channels.cache.find(c => {
          const ticket = db.tickets[c.id];
          return ticket && ticket.guildId === interaction.guild.id && ticket.userId === interaction.user.id && c.type === ChannelType.GuildText;
        });
        if (existing) return interaction.editReply(`⚠️ You already have an open ticket: ${existing}`);

        const permissionOverwrites = [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
          { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] }
        ];

        if (cfg.staffRoleId && interaction.guild.roles.cache.has(cfg.staffRoleId)) {
          permissionOverwrites.push({
            id: cfg.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          });
        }

        const baseName = interaction.user.username
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 45) || "user";

        const channel = await interaction.guild.channels.create({
          name: `ticket-${baseName}`,
          type: ChannelType.GuildText,
          parent: cfg.categoryId && interaction.guild.channels.cache.has(cfg.categoryId) ? cfg.categoryId : undefined,
          permissionOverwrites,
          reason: `Botrix ticket opened by ${interaction.user.tag}`
        });

        db.tickets[channel.id] = {
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          buttonIndex: index,
          buttonLabel: buttonCfg.label || `Ticket ${index + 1}`,
          createdAt: Date.now()
        };
        saveJSON(files.tickets, db.tickets);

        const ticketEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎫 ${buttonCfg.label || "Support Ticket"}`)
          .setDescription([
            `Welcome ${interaction.user}!`,
            "",
            "A member of the staff team will help you here.",
            "Please explain your request clearly."
          ].join("\n"))
          .setFooter({ text: "Botrix System • Ticket" })
          .setTimestamp();

        if (buttonCfg.imageUrl && /^https?:\/\/\S+$/i.test(buttonCfg.imageUrl)) {
          ticketEmbed.setImage(buttonCfg.imageUrl);
        }

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        );

        await channel.send({
          content: cfg.staffRoleId ? `<@&${cfg.staffRoleId}> ${interaction.user}` : `${interaction.user}`,
          embeds: [ticketEmbed],
          components: [closeRow]
        });

        if (cfg.ticketLogsChannelId) {
          const logs = interaction.guild.channels.cache.get(cfg.ticketLogsChannelId);
          if (logs?.isTextBased()) {
            await logs.send({
              embeds: [botrixEmbed("🎫 Ticket Opened", [
                `**User:** ${interaction.user} (${interaction.user.tag})`,
                `**Channel:** ${channel}`,
                `**Type:** ${buttonCfg.label || `Ticket ${index + 1}`}`
              ].join("\n"), 0x2ecc71)]
            }).catch(() => {});
          }
        }

        return interaction.editReply(`✅ Your ticket has been created: ${channel}`);
      } catch (error) {
        console.error("❌ Ticket creation error:", error);
        return interaction.editReply(`❌ Could not create the ticket.\n\`${error.message || "Unknown error"}\``).catch(() => {});
      }
    }

    if (interaction.isButton() && interaction.customId === "ticket_close") {
      if (!interaction.guild || !interaction.channel) return safeReply(interaction, { content: "❌ This can only be used inside a ticket.", ephemeral: true });
      const ticket = db.tickets[interaction.channel.id];
      if (!ticket) return safeReply(interaction, { content: "❌ This channel is not registered as a Botrix ticket.", ephemeral: true });

      const isOwner = ticket.userId === interaction.user.id;
      const isStaff = memberCan(interaction.member, PermissionFlagsBits.ManageChannels) ||
        (ticket.staffRoleId && interaction.member.roles.cache.has(ticket.staffRoleId)) ||
        (db.ticketConfig[interaction.guild.id]?.staffRoleId && interaction.member.roles.cache.has(db.ticketConfig[interaction.guild.id].staffRoleId));
      if (!isOwner && !isStaff) return safeReply(interaction, { content: "❌ Only the ticket owner or staff can close this ticket.", ephemeral: true });

      await safeReply(interaction, { content: "🔒 Closing ticket...", flags: 64 });
      const channelId = interaction.channel.id;
      const cfg = db.ticketConfig[interaction.guild.id] || {};
      if (cfg.ticketLogsChannelId) {
        const logs = interaction.guild.channels.cache.get(cfg.ticketLogsChannelId);
        if (logs?.isTextBased()) {
          await logs.send({ embeds: [botrixEmbed("🔒 Ticket Closed", [
            `**User:** <@${ticket.userId}>`,
            `**Channel:** #${interaction.channel.name}`,
            `**Closed by:** ${interaction.user}`
          ].join("\n"), 0xed1c24)] }).catch(() => {});
        }
      }
      delete db.tickets[channelId];
      saveJSON(files.tickets, db.tickets);
      setTimeout(() => interaction.channel?.delete(`Botrix ticket closed by ${interaction.user.tag}`).catch(() => {}), 1000);
      return;
    }

    /* ====================================================
       TICKET SETUP BUTTONS / MODALS
    ==================================================== */

    if (interaction.isButton() && interaction.customId.startsWith("ticket_setup_")) {
      if (!interaction.guild) return safeReply(interaction, { content: "❌ This can only be used in a server.", ephemeral: true });
      if (!memberCan(interaction.member, PermissionFlagsBits.ManageGuild)) return safeReply(interaction, { content: "❌ You need **Manage Server** permission.", ephemeral: true });
      const type = interaction.customId.replace("ticket_setup_", "");
      if (type === "reset") {
        delete db.ticketConfig[interaction.guild.id];
        saveJSON(files.ticketConfig, db.ticketConfig);
        return safeReply(interaction, { content: "♻️ Ticket configuration has been reset.", ephemeral: true });
      }

      if (type === "button_names") {
        const cfg = db.ticketConfig[interaction.guild.id] || {};
        const defaults = [
          "Need Support Botrix",
          "Create A Personal Bot",
          "Create A Personal Project",
          "Partnership"
        ];
        const current = Array.isArray(cfg.buttons) ? cfg.buttons : [];
        const count = Math.min(4, Math.max(1, Number(cfg.buttonCount || 1)));
        const modal = new ModalBuilder().setCustomId("ticket_setup_button_names_modal").setTitle(`Ticket Button Names (${count})`);

        for (let i = 0; i < count; i++) {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId(`name${i + 1}`)
                .setLabel(`Button ${i + 1} name`)
                .setValue(current[i]?.label || defaults[i])
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(80)
            )
          );
        }

        return safeShowModal(interaction, modal);
      }

      if (type === "photo") {
        const cfg = db.ticketConfig[interaction.guild.id] || {};
        const modal = new ModalBuilder().setCustomId("ticket_setup_photo_modal").setTitle("Ticket Panel Photo");
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("value").setLabel("Photo URL").setPlaceholder("https://example.com/ticket.png").setValue(cfg.panelImageUrl || "").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500))
        );
        return safeShowModal(interaction, modal);
      }

      if (["channel", "role", "category", "logs"].includes(type)) {
        const modal = new ModalBuilder().setCustomId(`ticket_setup_${type}_modal`).setTitle(`Set ${type === "channel" ? "Panel Channel" : type === "role" ? "Staff Role" : type === "category" ? "Ticket Category" : "Ticket Logs"}`);
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("value").setLabel("Paste Discord ID").setPlaceholder("123456789012345678").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)));
        return safeShowModal(interaction, modal);
      }

      if (["count", "description"].includes(type)) {
        const cfg = db.ticketConfig[interaction.guild.id] || {};
        const modal = new ModalBuilder().setCustomId(`ticket_setup_${type}_modal`).setTitle(type === "count" ? "Button Count" : "Ticket Description");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("value").setLabel(type === "count" ? "Number of buttons (1-4)" : "Description").setStyle(type === "description" ? TextInputStyle.Paragraph : TextInputStyle.Short).setValue(type === "description" ? (cfg.description || "") : String(cfg.buttonCount || 4)).setRequired(type !== "description").setMaxLength(type === "description" ? 1000 : 1)));
        return safeShowModal(interaction, modal);
      }
    }

    if (interaction.isButton() && interaction.customId === "ticket_publish") {
      if (!interaction.guild) return safeReply(interaction, { content: "❌ This can only be used in a server.", ephemeral: true });
      if (!memberCan(interaction.member, PermissionFlagsBits.ManageGuild)) return safeReply(interaction, { content: "❌ You need **Manage Server** permission.", ephemeral: true });
      const cfg = db.ticketConfig[interaction.guild.id] || {};
      const channel = cfg.panelChannelId ? interaction.guild.channels.cache.get(cfg.panelChannelId) : null;
      if (!channel || channel.type !== ChannelType.GuildText) return safeReply(interaction, { content: "❌ Configure a valid **Panel Channel** first.", ephemeral: true });

      const defaults = [
        {label:"Need Support Botrix",emoji:"🎫",style:"Primary"},
        {label:"Create A Personal Bot",emoji:"🤖",style:"Secondary"},
        {label:"Create A Personal Project",emoji:"🛠️",style:"Success"},
        {label:"Partnership",emoji:"🤝",style:"Danger"}
      ];
      const labels = Array.isArray(cfg.buttons) && cfg.buttons.length ? cfg.buttons : defaults;
      const count = Math.min(4, Math.max(1, Number(cfg.buttonCount || labels.length)));

      // Codex-style ticket panel: banner + category select + quick-link buttons.
      const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_category")
        .setPlaceholder("Select a ticket category...")
        .addOptions(
          labels.slice(0, count).map((b, i) =>
            new StringSelectMenuOptionBuilder()
              .setLabel((b.label || defaults[i]?.label || `Ticket ${i + 1}`).slice(0, 100))
              .setValue(String(i))
              .setDescription("Open a support ticket in this category".slice(0, 100))
              .setEmoji(b.emoji || defaults[i]?.emoji || "🎫")
          )
        );

      const categoryRow = new ActionRowBuilder().addComponents(categoryMenu);
      const quickLinks = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Information")
          .setEmoji("💬")
          .setStyle(ButtonStyle.Link)
          .setURL(BOTRIX_WEBSITE_URL),
        new ButtonBuilder()
          .setLabel("Rules")
          .setEmoji("📜")
          .setStyle(ButtonStyle.Link)
          .setURL(BOTRIX_WEBSITE_URL),
        new ButtonBuilder()
          .setLabel("Website")
          .setEmoji("🌐")
          .setStyle(ButtonStyle.Link)
          .setURL(BOTRIX_WEBSITE_URL)
      );

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎫 Support Tickets")
        .setDescription("Need help with something? Select a category below!")
        .setImage("attachment://botrix.png")
        .setFooter({ text: "Botrix System • Support" });

      const payload = { embeds: [embed], components: [categoryRow, quickLinks], files: botrixFiles() };
      let panelMessage = null;

      // One ticket panel per server/channel: update the saved panel instead of creating duplicates.
      if (cfg.panelMessageId) {
        panelMessage = await channel.messages.fetch(cfg.panelMessageId).catch(() => null);
        if (panelMessage?.author?.id === client.user.id) {
          await panelMessage.edit(payload).catch(() => { panelMessage = null; });
        } else {
          panelMessage = null;
        }
      }

      // If this is an older panel created before message IDs were stored, clean Botrix ticket panels in this channel.
      if (!panelMessage) {
        const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (recent) {
          for (const msg of recent.values()) {
            if (msg.author?.id !== client.user.id) continue;
            const title = msg.embeds?.[0]?.title || "";
            if (title === "🎫 Botrix Support" || title === "🎫 Support Tickets") {
              await msg.delete().catch(() => {});
            }
          }
        }
        panelMessage = await channel.send(payload);
      }

      cfg.panelMessageId = panelMessage.id;
      cfg.panelChannelId = channel.id;
      db.ticketConfig[interaction.guild.id] = cfg;
      saveJSON(files.ticketConfig, db.ticketConfig);

      return safeReply(interaction, { content:`✅ Ticket panel published in ${channel}. ${count} button${count === 1 ? "" : "s"} active.`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_setup_") && interaction.customId.endsWith("_modal")) {
      if (!interaction.guild) return safeReply(interaction, { content: "❌ This can only be used in a server.", ephemeral: true });
      if (!memberCan(interaction.member, PermissionFlagsBits.ManageGuild)) return safeReply(interaction, { content: "❌ You need **Manage Server** permission.", ephemeral: true });
      const type = interaction.customId.replace("ticket_setup_", "").replace("_modal", "");
      const guildId = interaction.guild.id;
      const cfg = db.ticketConfig[guildId] || {};

      if (type === "button_names") {
        const count = Math.min(4, Math.max(1, Number(cfg.buttonCount || 1)));
        const names = [];
        for (let i = 1; i <= count; i++) {
          names.push(interaction.fields.getTextInputValue(`name${i}`).trim());
        }

        if (!Array.isArray(cfg.buttons)) cfg.buttons = [];
        const defaults = ["🎫", "🤖", "🛠️", "🤝"];
        const styles = ["Primary", "Secondary", "Success", "Danger"];

        for (let i = 0; i < count; i++) {
          cfg.buttons[i] = {
            ...(cfg.buttons[i] || {}),
            label: names[i],
            emoji: cfg.buttons[i]?.emoji || defaults[i],
            style: cfg.buttons[i]?.style || styles[i],
            imageUrl: cfg.buttons[i]?.imageUrl || ""
          };
        }

        // Remove buttons above the selected count so old buttons cannot reappear.
        cfg.buttons = cfg.buttons.slice(0, count);
        db.ticketConfig[guildId] = cfg;
        saveJSON(files.ticketConfig, db.ticketConfig);
        return safeReply(interaction, { content: `✅ ${count} ticket button name${count === 1 ? "" : "s"} saved for this server.`, ephemeral: true });
      }

      if (type === "photo") {
        const imageUrl = interaction.fields.getTextInputValue("value").trim();
        if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) return safeReply(interaction, { content: "❌ Invalid photo URL.", ephemeral: true });
        cfg.panelImageUrl = imageUrl;
        db.ticketConfig[guildId] = cfg;
        saveJSON(files.ticketConfig, db.ticketConfig);
        return safeReply(interaction, { content: imageUrl ? "✅ Ticket panel photo saved for this server." : "✅ Ticket panel photo removed for this server.", ephemeral: true });
      }

      if (["channel", "role", "category", "logs"].includes(type)) {
        const id = interaction.fields.getTextInputValue("value").trim();
        if (!/^\d{15,25}$/.test(id)) return safeReply(interaction,{content:"❌ Invalid Discord ID.",ephemeral:true});
        if(type==="channel"){const c=interaction.guild.channels.cache.get(id);if(!c||c.type!==ChannelType.GuildText)return safeReply(interaction,{content:"❌ Invalid text channel.",ephemeral:true});cfg.panelChannelId=id;}
        if(type==="role"){if(!interaction.guild.roles.cache.has(id))return safeReply(interaction,{content:"❌ Role not found.",ephemeral:true});cfg.staffRoleId=id;}
        if(type==="category"){const c=interaction.guild.channels.cache.get(id);if(!c||c.type!==ChannelType.GuildCategory)return safeReply(interaction,{content:"❌ Invalid category.",ephemeral:true});cfg.categoryId=id;}
        if(type==="logs"){const c=interaction.guild.channels.cache.get(id);if(!c||c.type!==ChannelType.GuildText)return safeReply(interaction,{content:"❌ Invalid logs channel.",ephemeral:true});cfg.ticketLogsChannelId=id;}
      } else if(type==="count"){const n=Number(interaction.fields.getTextInputValue("value"));if(!Number.isInteger(n)||n<1||n>4)return safeReply(interaction,{content:"❌ Enter a number from 1 to 4.",ephemeral:true});cfg.buttonCount=n;
      } else if(type==="description"){cfg.description=interaction.fields.getTextInputValue("value").trim();}
      db.ticketConfig[guildId]=cfg; saveJSON(files.ticketConfig,db.ticketConfig);
      return safeReply(interaction,{content:`✅ Ticket **${type}** configuration saved.`,ephemeral:true});
    }

    /*
      ======================================================
      MODERATION ROLE CONFIG BUTTONS / MODALS (WARN ONLY)
      ======================================================
    */

    const moderationRoleConfigMap = {
      mod_cfg_warn1: ["warn1RoleId", "Warn 1"],
      mod_cfg_warn2: ["warn2RoleId", "Warn 2"],
      mod_cfg_warn3: ["warn3RoleId", "Warn 3"]
    };

    if (interaction.isButton() && moderationRoleConfigMap[interaction.customId]) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return safeReply(interaction, { content: "❌ You need **Administrator** permission.", ephemeral: true });
      }
      const [key, label] = moderationRoleConfigMap[interaction.customId];
      const modal = new ModalBuilder().setCustomId(`moderation_role_config_${key}`).setTitle(`Configure ${label} Role`);
      const input = new TextInputBuilder()
        .setCustomId("role_id")
        .setLabel(`${label} Role ID`)
        .setPlaceholder("123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(25);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return safeShowModal(interaction, modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("moderation_role_config_")) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return safeReply(interaction, { content: "❌ You need **Administrator** permission.", ephemeral: true });
      }
      const key = interaction.customId.slice("moderation_role_config_".length);
      const allowedKeys = ["warn1RoleId", "warn2RoleId", "warn3RoleId"];
      if (!allowedKeys.includes(key)) return safeReply(interaction, { content: "❌ Invalid role configuration.", ephemeral: true });
      const roleId = interaction.fields.getTextInputValue("role_id").trim();
      if (!/^\d{15,25}$/.test(roleId)) return safeReply(interaction, { content: "❌ Invalid Discord Role ID.", ephemeral: true });
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return safeReply(interaction, { content: "❌ Role not found in this server.", ephemeral: true });
      const cfg = getModerationConfig(interaction.guild.id);
      cfg[key] = roleId;
      cfg.updatedAt = Date.now();
      cfg.updatedBy = interaction.user.id;
      db.moderationConfig[interaction.guild.id] = cfg;
      saveJSON(files.moderationConfig, db.moderationConfig);
      return safeReply(interaction, { content: `✅ **${role.name}** (\`${roleId}\`) saved for **${key}**.`, ephemeral: true });
    }

    /*
      ======================================================
      NORMAL CHAT INPUT COMMANDS
      ======================================================
    */

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName } = interaction;

    try {

      if (commandName === "logs") {
        if (!interaction.guild) return safeReply(interaction, { content: "❌ This command can only be used in a server.", ephemeral: true });
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return safeReply(interaction, { content: "❌ You need **Manage Server** permission to configure logs.", ephemeral: true });
        }
        const channel = interaction.options.getChannel("channellogs", true);
        if (channel.type !== ChannelType.GuildText) return safeReply(interaction, { content: "❌ Please choose a normal text channel.", ephemeral: true });
        db.logsChannels[interaction.guild.id] = channel.id;
        saveJSON(files.logsChannels, db.logsChannels);
        return safeReply(interaction, {
          embeds: [botrixEmbed("📋 Botrix Server Logs", [
            `**Logs channel:** ${channel}`,
            "",
            "✅ Server logging is now enabled.",
            "Botrix will log messages, members, channels, roles, bans, voice activity and other important server events here."
          ].join("\n"), 0xf1c40f)], ephemeral: true
        });
      }

      if (commandName === "ai") {
        if (!interaction.guild) {
          return safeReply(interaction, {
            content: "❌ This command can only be used in a server.",
            ephemeral: true
          });
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return safeReply(interaction, {
            content: "❌ You need **Manage Server** permission to configure Botrix AI.",
            ephemeral: true
          });
        }

        const channel = interaction.options.getChannel("channel", true);

        if (channel.type !== ChannelType.GuildText) {
          return safeReply(interaction, {
            content: "❌ Please choose a normal text channel.",
            ephemeral: true
          });
        }

        db.aiChannels[interaction.guild.id] = channel.id;
        saveJSON(files.aiChannels, db.aiChannels);

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "🤖 Botrix AI Enabled",
              [
                `**Channel:** ${channel}`,
                "",
                "Botrix AI is now active in this channel.",
                "Members can send messages and Botrix will answer automatically.",
                "",
                "🌍 Arabic • Tunisian • Français • English",
                "",
                "Run `/ai` again to change the AI channel."
              ].join("\n"),
              0x57f287
            )
          ],
          ephemeral: true
        });
      }

      /*
        ====================================================
        CHANGE
        ONLY SERVER OWNER WITH ACCESS
        ====================================================
      */

      if (
        commandName ===
        "change"
      ) {

        if (!interaction.guild) {
          return safeReply(interaction, {
            content:
              "❌ This command can only be used in a server.",
            ephemeral: true
          });
        }

        if (
          !hasServerChangeAccess(
            interaction.guild,
            interaction.user.id
          )
        ) {
          return safeReply(interaction, {
            content:
              `❌ You don't have access to **/change** in this server.\n\nThe Botrix owner must first use:\n\`/giveacces ${interaction.guild.id}\``,
            ephemeral: true
          });
        }

        const me =
          interaction.guild.members.me;

        const currentName =
          me?.nickname ||
          client.user.username;

        const embed =
          botrixEmbed(
            "⚙️ Botrix Server Customization",
            [
              `**Server:** ${interaction.guild.name}`,
              `**Server ID:** \`${interaction.guild.id}\``,
              `**Current Bot Name:** ${currentName}`,
              "",
              "Choose what you want to change:",
              "",
              "🏷️ **Change Name**",
              "Changes Botrix's nickname only in this server.",
              "",
              "🖼️ **Change Photo**",
              "Changes Botrix's server avatar only in this server.",
              "",
              "🎨 **Change Background**",
              "Changes Botrix's server profile background/3omraner only in this server.",
              "",
              "⚠️ These changes do **not** affect other servers."
            ].join("\n"),
            0x5865f2
          );

        const row =
          new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()
                .setCustomId(
                  "botrix_change_name"
                )
                .setLabel(
                  "Change Name"
                )
                .setEmoji("🏷️")
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  "botrix_change_photo"
                )
                .setLabel(
                  "Change Photo"
                )
                .setEmoji("🖼️")
                .setStyle(
                  ButtonStyle.Secondary
                ),

              new ButtonBuilder()
                .setCustomId(
                  "botrix_change_banner"
                )
                .setLabel(
                  "Change Background"
                )
                .setEmoji("🎨")
                .setStyle(
                  ButtonStyle.Secondary
                )

            );

        return safeReply(interaction, {
          embeds: [embed],
          components: [row],
          ephemeral: true
        });
      }

      /* ====================================================
         HELP
      ==================================================== */

      if (
        commandName ===
        "help"
      ) {

        const embed =
          botrixEmbed(
            "🤖 Botrix System — Commands",
            [
              "### 🛡️ Moderation",
              "`/roles` — RP moderation role panel",
              "`/kick` — Kick a member",
              "`/timeout` — Timeout a member",
              "`/warn` — Warn a member",
              "`/clear` — Delete messages",
              "`/lockdown` — Lock the current channel",
              "`/slowmode` — Set channel slowmode",
              "",
              "### ⚙️ Server & Setup",
              "`/ticket` — Open ticket setup panel",
              "`/welcome` — Configure welcome system",
              "`/autorole` — Configure autorole",
              "`/sendmessage` — Send a message to a channel",
              "",
              "### 💰 Economy",
              "`/economy balance` — Show balance",
              "`/economy daily` — Claim daily cash",
              "`/economy pay` — Pay a member",
              "",
              "### 🎁 Community",
              "`/giveways` — Create an invite/member giveaway",
              "`/poll` — Create a poll",
              "`/rep` — Give reputation to a member",
              "`/rank` — Show activity rank",
              "`/leaderboard` — Show reputation leaderboard",
              "`/afk` — Set or remove AFK status",
              "",
              "### 📊 Information",
              "`/serverinfo` — Show server information",
              "`/userinfo` — Show user information",
              "`/bot` — Show Botrix System information",
              "`/help` — Show this command list"
            ].join("\n"),
            0x5865f2
          );

        return safeReply(interaction, {
          embeds: [embed],
          files: botrixFiles()
        });
      }

      /* ====================================================
         BOT
      ==================================================== */

      if (
        commandName ===
        "bot"
      ) {

        const embed =
          botrixEmbed(
            "🤖 Botrix System",
            [
              "**bot : Botrix System Bot**",
              "**Owner : J4nk**",
              "**User name : jankffx_21987**",
              `**Version:** discord.js v14`,
              "",
              "**Status rotation:**",
              "100 Server",
              "Owner:J4nk",
              "/help (Botrix.System)",
              "Active Giveaways In The Support Server",
              "6000 membres !",
              "Botrix.System",
              "",
              "**Rotation:** every 10 seconds."
            ].join("\n"),
            0x7c3aed
          );

        return safeReply(interaction, {
          embeds: [embed],
          files: botrixFiles()
        });
      }

      /* ====================================================
         SERVER INFO
      ==================================================== */

      if (
        commandName ===
        "serverinfo"
      ) {

        const guild =
          interaction.guild;

        const owner =
          await guild
            .fetchOwner()
            .catch(() => null);

        const embed =
          botrixEmbed(
            `📊 ${guild.name}`,
            [
              `**Owner:** ${owner ? owner.user.tag : "Unknown"}`,
              `**Members:** ${guild.memberCount}`,
              `**Channels:** ${guild.channels.cache.size}`,
              `**Roles:** ${guild.roles.cache.size}`,
              `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
              `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
            ].join("\n"),
            0x3498db
          );

        if (
          guild.iconURL()
        ) {
          embed.setImage(
            guild.iconURL({
              size: 1024
            })
          );
        }

        return safeReply(interaction, {
          embeds: [embed],
          files: botrixFiles()
        });
      }

      /* ====================================================
         USER INFO
      ==================================================== */

      if (
        commandName ===
        "userinfo"
      ) {

        const user =
          interaction.options
            .getUser("user") ||
          interaction.user;

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const roles =
          member
            ? member.roles.cache
                .filter(
                  role =>
                    role.id !==
                    interaction.guild.id
                )
                .map(
                  role =>
                    role.toString()
                )
                .slice(0, 15)
                .join(" ") ||
              "None"
            : "Not in server";

        const embed =
          botrixEmbed(
            `👤 ${user.tag}`,
            [
              `**ID:** ${user.id}`,
              `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
              `**Joined:** ${
                member
                  ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                  : "N/A"
              }`,
              `**Bot:** ${user.bot ? "Yes" : "No"}`,
              `**Roles:** ${roles}`
            ].join("\n"),
            0x2ecc71
          );

        embed.setThumbnail(
          user.displayAvatarURL({
            size: 512
          })
        );

        return safeReply(interaction, {
          embeds: [embed],
          files: botrixFiles()
        });
      }

      /* ====================================================
         KICK
      ==================================================== */

      /* ====================================================
         MODERATION ROLE PANEL (WARN ONLY)
      ==================================================== */

      if (commandName === "roles") {
        if (!interaction.guild) return safeReply(interaction, { content: "❌ This command can only be used in a server.", ephemeral: true });
        if (!memberCan(interaction.member, PermissionFlagsBits.Administrator)) {
          return safeReply(interaction, { content: "❌ You need **Administrator** permission.", ephemeral: true });
        }

        const cfg = getModerationConfig(interaction.guild.id);
        const roleLine = key => cfg[key] ? `<@&${cfg[key]}> \`${cfg[key]}\`` : "❌ Not configured";

        const embed = moderationEmbed(interaction.guild.id, "🛡️ Rezistanza RolePlay — RP Panel", [
          `⚠️ **Warn 1:** ${roleLine("warn1RoleId")}`,
          `⚠️ **Warn 2:** ${roleLine("warn2RoleId")}`,
          `⚠️ **Warn 3:** ${roleLine("warn3RoleId")}`,
          "",
          "Press a button to configure the Warn Role ID."
        ].join("\n"), 0xed1c24);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("mod_cfg_warn1").setLabel("Warn 1").setEmoji("⚠️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("mod_cfg_warn2").setLabel("Warn 2").setEmoji("⚠️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("mod_cfg_warn3").setLabel("Warn 3").setEmoji("⚠️").setStyle(ButtonStyle.Primary)
        );

        return safeReply(interaction, { embeds: [embed], components: [row], ephemeral: true });
      }

      if (
        commandName ===
        "kick"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.KickMembers
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Kick Members** permission.",
            ephemeral: true
          });
        }

        const user =
          interaction.options
            .getUser("user");

        const reason =
          interaction.options
            .getString("reason") ||
          "No reason provided";

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
          return safeReply(interaction, {
            content:
              "❌ Member not found.",
            ephemeral: true
          });
        }

        if (!member.kickable) {
          return safeReply(interaction, {
            content:
              "❌ I cannot kick this member.",
            ephemeral: true
          });
        }

        await member.kick(
          reason
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "👢 Member Kicked",
              `**User:** ${user}\n**Reason:** ${reason}`,
              0xed1c24
            )
          ]
        });
      }

      /* ====================================================
         TIMEOUT
      ==================================================== */

      if (
        commandName ===
        "timeout"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ModerateMembers
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Moderate Members** permission.",
            ephemeral: true
          });
        }

        const user =
          interaction.options
            .getUser("user");

        const minutes =
          interaction.options
            .getInteger("minutes");

        const reason =
          interaction.options
            .getString("reason") ||
          "No reason provided";

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
          return safeReply(interaction, {
            content:
              "❌ Member not found.",
            ephemeral: true
          });
        }

        if (!member.moderatable) {
          return safeReply(interaction, {
            content:
              "❌ I cannot timeout this member.",
            ephemeral: true
          });
        }

        await member.timeout(
          minutes * 60 * 1000,
          reason
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "⏳ Member Timed Out",
              `**User:** ${user}\n**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`,
              0xf1c40f
            )
          ]
        });
      }

      
      /* ====================================================
         CLEAR
      ====================================================


      if (
        commandName ===
        "clear"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageMessages
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Messages** permission.",
            ephemeral: true
          });
        }

        const amount =
          interaction.options
            .getInteger("amount");

        const deleted =
          await interaction.channel
            .bulkDelete(
              amount,
              true
            );

        return safeReply(interaction, {
          content:
            `🧹 Deleted **${deleted.size}** message(s).`,
          ephemeral: true
        });
      }

      /* ====================================================
         LOCKDOWN
      ==================================================== */

      if (
        commandName ===
        "lockdown"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Channels** permission.",
            ephemeral: true
          });
        }

        const everyone =
          interaction.guild.roles.everyone;

        const current =
          interaction.channel
            .permissionsFor(
              everyone
            )
            ?.has(
              PermissionFlagsBits.SendMessages
            );

        await interaction.channel
          .permissionOverwrites
          .edit(
            everyone,
            {
              SendMessages:
                current
                  ? false
                  : null
            }
          );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              current
                ? "🔒 Channel Locked"
                : "🔓 Channel Unlocked",
              current
                ? "This channel is now locked."
                : "This channel is now unlocked.",
              current
                ? 0xed1c24
                : 0x2ecc71
            )
          ]
        });
      }

      /* ====================================================
         SLOWMODE
      ==================================================== */

      if (
        commandName ===
        "slowmode"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Channels** permission.",
            ephemeral: true
          });
        }

        const seconds =
          interaction.options
            .getInteger("seconds");

        await interaction.channel
          .setRateLimitPerUser(
            seconds
          );

        return safeReply(interaction, {
          content:
            `🐌 Slowmode set to **${seconds}s**.`,
          ephemeral: true
        });
      }

      /* ====================================================
         AFK
      ==================================================== */

      if (
        commandName ===
        "afk"
      ) {

        const reason =
          interaction.options
            .getString("reason") ||
          "AFK";

        db.afk[
          interaction.user.id
        ] = {
          reason,
          since: Date.now()
        };

        saveJSON(
          files.afk,
          db.afk
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "💤 AFK Enabled",
              `**Reason:** ${reason}`,
              0x95a5a6
            )
          ]
        });
      }

      /* ====================================================
         POLL
      ==================================================== */

      if (
        commandName ===
        "poll"
      ) {

        const question =
          interaction.options
            .getString("question");

        const msg =
          await safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "📊 Poll",
                question,
                0x3498db
              )
            ]
          });

        await msg
          .react("👍")
          .catch(() => {});

        await msg
          .react("👎")
          .catch(() => {});

        return;
      }

      /* ====================================================
         REP
      ==================================================== */

      if (
        commandName ===
        "rep"
      ) {

        const user =
          interaction.options
            .getUser("user");

        if (
          user.id ===
          interaction.user.id
        ) {
          return safeReply(interaction, {
            content:
              "❌ You cannot give yourself reputation.",
            ephemeral: true
          });
        }

        db.reps[user.id] =
          (db.reps[user.id] || 0) +
          1;

        saveJSON(
          files.reps,
          db.reps
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "⭐ Reputation",
              `${interaction.user} gave **+1 rep** to ${user}.\n**Total:** ${db.reps[user.id]}`,
              0xf1c40f
            )
          ]
        });
      }

      /* ====================================================
         RANK
      ==================================================== */

      if (
        commandName ===
        "rank"
      ) {

        const user =
          interaction.options
            .getUser("user") ||
          interaction.user;

        const rep =
          db.reps[user.id] || 0;

        const level =
          Math.floor(
            rep / 5
          ) + 1;

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "🏆 Activity Rank",
              `**User:** ${user}\n**Rep:** ${rep}\n**Level:** ${level}`,
              0x9b59b6
            )
          ]
        });
      }

      /* ====================================================
         LEADERBOARD
      ==================================================== */

      if (
        commandName ===
        "leaderboard"
      ) {

        const top =
          Object.entries(
            db.reps
          )
            .sort(
              (a, b) =>
                b[1] - a[1]
            )
            .slice(0, 10);

        const lines = [];

        for (
          let i = 0;
          i < top.length;
          i++
        ) {

          const [
            id,
            rep
          ] = top[i];

          const user =
            await client.users
              .fetch(id)
              .catch(
                () => null
              );

          lines.push(
            `**${i + 1}.** ${
              user
                ? user.tag
                : id
            } — **${rep} rep**`
          );
        }

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "🏆 Reputation Leaderboard",
              lines.length
                ? lines.join("\n")
                : "No reputation data yet.",
              0xf1c40f
            )
          ]
        });
      }

      /* ====================================================
         ECONOMY
      ==================================================== */

      if (
        commandName ===
        "economy"
      ) {

        const sub =
          interaction.options
            .getSubcommand();

        const account =
          money(
            interaction.user.id
          );

        if (
          sub ===
          "balance"
        ) {

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "💰 Economy",
                `**Cash:** $${account.cash.toLocaleString()}\n**Bank:** $${account.bank.toLocaleString()}\n**Total:** $${(account.cash + account.bank).toLocaleString()}`,
                0x2ecc71
              )
            ]
          });
        }

        if (
          sub ===
          "daily"
        ) {

          const last =
            account.lastDaily ||
            0;

          const cooldown =
            24 *
            60 *
            60 *
            1000;

          if (
            Date.now() -
              last <
            cooldown
          ) {

            const remaining =
              cooldown -
              (
                Date.now() -
                last
              );

            return safeReply(interaction, {
              content:
                `⏳ Daily already claimed. Try again in **${Math.ceil(remaining / 3600000)}h**.`,
              ephemeral: true
            });
          }

          account.cash += 500;

          account.lastDaily =
            Date.now();

          saveJSON(
            files.economy,
            db.economy
          );

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "💵 Daily Reward",
                "You received **$500**.",
                0x2ecc71
              )
            ]
          });
        }

        if (
          sub ===
          "pay"
        ) {

          const target =
            interaction.options
              .getUser("user");

          const amount =
            interaction.options
              .getInteger("amount");

          if (
            target.id ===
            interaction.user.id
          ) {
            return safeReply(interaction, {
              content:
                "❌ You cannot pay yourself.",
              ephemeral: true
            });
          }

          if (
            account.cash <
            amount
          ) {
            return safeReply(interaction, {
              content:
                "❌ Not enough cash.",
              ephemeral: true
            });
          }

          const receiver =
            money(target.id);

          account.cash -=
            amount;

          receiver.cash +=
            amount;

          saveJSON(
            files.economy,
            db.economy
          );

          return safeReply(interaction, {
            embeds: [
              botrixEmbed(
                "💸 Payment",
                `${interaction.user} paid **$${amount.toLocaleString()}** to ${target}.`,
                0x2ecc71
              )
            ]
          });
        }
      }

      /* ====================================================
         VOICE CHANNEL
      ==================================================== */

      if (commandName === "joinvc") {
        const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
        const channel = interaction.options.getChannel("channel");
        if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
          return safeReply(interaction, { content: "❌ Please select a voice channel.", ephemeral: true });
        }
        const me = interaction.guild.members.me;
        if (!channel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)) {
          return safeReply(interaction, { content: "❌ I need **Connect** permission in that voice channel.", ephemeral: true });
        }
        try {
          const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
          });
          await entersState(connection, VoiceConnectionStatus.Ready, 15000);
          return safeReply(interaction, { content: `✅ Botrix joined **${channel.name}** and will stay connected.`, ephemeral: true });
        } catch (error) {
          console.error("❌ Voice join error:", error);
          return safeReply(interaction, { content: `❌ Could not join the voice channel.\n\`${error.message || "Unknown error"}\``, ephemeral: true });
        }
      }

      if (commandName === "leavevc") {
        try {
          const { getVoiceConnection } = require("@discordjs/voice");
          const connection = getVoiceConnection(interaction.guild.id);
          if (!connection) return safeReply(interaction, { content: "ℹ️ Botrix is not in a voice channel.", ephemeral: true });
          connection.destroy();
          return safeReply(interaction, { content: "✅ Botrix left the voice channel.", ephemeral: true });
        } catch (error) {
          return safeReply(interaction, { content: `❌ Could not leave the voice channel.\n\`${error.message || "Unknown error"}\``, ephemeral: true });
        }
      }

      /* ====================================================
         JOIN CHANNEL
      ==================================================== */

      if (commandName === "join") {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return safeReply(interaction, {
            content: "❌ You need **Manage Server** permission.",
            ephemeral: true
          });
        }

        const channel = interaction.options.getChannel("channel");

        if (!channel || channel.type !== ChannelType.GuildText) {
          return safeReply(interaction, {
            content: "❌ Please select a text channel.",
            ephemeral: true
          });
        }

        const me = interaction.guild.members.me;
        if (
          me &&
          !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)
        ) {
          return safeReply(interaction, {
            content: "❌ I don't have permission to send messages in that channel.",
            ephemeral: true
          });
        }

        const current = db.welcomeConfig[interaction.guild.id] || {};

        db.welcomeConfig[interaction.guild.id] = {
          ...current,
          channelId: channel.id,
          enabled: true,
          updatedAt: Date.now(),
          updatedBy: interaction.user.id
        };

        saveJSON(files.welcomeConfig, db.welcomeConfig);

        return safeReply(interaction, {
          content: `✅ Join channel set to ${channel}.\n\nNew members will receive:\n**Welcome To ${interaction.guild.name} Mr @user**`,
          ephemeral: true
        });
      }

      /* ====================================================
         WELCOME
      ==================================================== */

      if (
        commandName ===
        "welcome"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Server** permission.",
            ephemeral: true
          });
        }

        const channel =
          interaction.options
            .getChannel("channel");

        const photoUrl =
          interaction.options
            .getString(
              "photoirl"
            )
            .trim();

        if (
          !channel ||
          channel.type !==
            ChannelType.GuildText
        ) {
          return safeReply(interaction, {
            content:
              "❌ Please select a text channel.",
            ephemeral: true
          });
        }

        if (
          !/^https?:\/\//i.test(
            photoUrl
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ Please enter a valid photo URL starting with `http://` or `https://`.",
            ephemeral: true
          });
        }

        const me =
          interaction.guild.members.me;

        if (
          me &&
          !channel
            .permissionsFor(me)
            ?.has(
              PermissionFlagsBits.SendMessages
            )
        ) {
          return safeReply(interaction, {
            content:
              "❌ I don't have permission to send messages in that channel.",
            ephemeral: true
          });
        }

        db.welcomeConfig[
          interaction.guild.id
        ] = {
          channelId:
            channel.id,
          photoUrl,
          enabled: true,
          updatedAt:
            Date.now(),
          updatedBy:
            interaction.user.id
        };

        saveJSON(
          files.welcomeConfig,
          db.welcomeConfig
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "👋 Welcome System",
              `✅ Welcome system enabled.\n\n**Channel:** ${channel}\n**Photo:** [Configured](${photoUrl})\n\nNew members will receive:\n**Welcome @user to @servername**\n**You Are membre nombre @membre**`,
              0x2ecc71
            )
          ],
          ephemeral: true
        });
      }

      /* ====================================================
         SEND MESSAGE
      ==================================================== */

      if (
        commandName ===
        "sendmessage"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageMessages
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Messages** permission.",
            ephemeral: true
          });
        }

        const message =
          interaction.options
            .getString(
              "yourmessage",
              true
            )
            .trim();

        const channel =
          interaction.options
            .getChannel(
              "yourchannel",
              true
            );

        if (!message) {
          return safeReply(interaction, {
            content:
              "❌ Your message cannot be empty.",
            ephemeral: true
          });
        }

        if (
          !channel ||
          channel.type !==
            ChannelType.GuildText
        ) {
          return safeReply(interaction, {
            content:
              "❌ Please select a valid text channel.",
            ephemeral: true
          });
        }

        const me =
          interaction.guild.members.me;

        if (
          me &&
          !channel
            .permissionsFor(me)
            ?.has(
              PermissionFlagsBits.SendMessages
            )
        ) {
          return safeReply(interaction, {
            content:
              `❌ I don't have permission to send messages in ${channel}.`,
            ephemeral: true
          });
        }

        try {

          const embed =
            new EmbedBuilder()
              .setDescription(
                message
              )
              .setColor(
                "#ED1C24"
              );

          await channel.send({
            embeds: [embed]
          });

          return safeReply(interaction, {
            content:
              `✅ Message sent successfully to ${channel}.`,
            ephemeral: true
          });

        } catch (error) {

          console.error(
            "❌ SendMessage error:",
            error
          );

          return safeReply(interaction, {
            content:
              "❌ I couldn't send the message to that channel.",
            ephemeral: true
          });
        }
      }

      /* ====================================================
         AUTOROLE
      ==================================================== */

      if (
        commandName ===
        "autorole"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageRoles
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Roles** permission.",
            ephemeral: true
          });
        }

        const role =
          interaction.options
            .getRole(
              "rolename"
            );

        if (
          !role ||
          role.id ===
            interaction.guild.id
        ) {
          return safeReply(interaction, {
            content:
              "❌ Please select a valid role.",
            ephemeral: true
          });
        }

        if (
          role.managed
        ) {
          return safeReply(interaction, {
            content:
              "❌ You cannot use a managed/integration role.",
            ephemeral: true
          });
        }

        const me =
          interaction.guild.members.me;

        if (
          me &&
          role.position >=
            me.roles.highest.position
        ) {
          return safeReply(interaction, {
            content:
              "❌ I cannot give this role because it is above or equal to my highest role.",
            ephemeral: true
          });
        }

        const guildId =
          interaction.guild.id;

        const current =
          Array.isArray(
            db.autorole[
              guildId
            ]
          )
            ? db.autorole[
                guildId
              ]
            : [];

        if (
          current.includes(
            role.id
          )
        ) {
          return safeReply(interaction, {
            content:
              `ℹ️ ${role} is already configured as an autorole.\n**Autoroles:** ${current.length}/3`,
            ephemeral: true
          });
        }

        if (
          current.length >=
          3
        ) {
          return safeReply(interaction, {
            content:
              "❌ You already have the maximum of **3 autoroles** configured.",
            ephemeral: true
          });
        }

        current.push(
          role.id
        );

        db.autorole[
          guildId
        ] = current;

        saveJSON(
          files.autorole,
          db.autorole
        );

        return safeReply(interaction, {
          embeds: [
            botrixEmbed(
              "🎭 AutoRole",
              `✅ ${role} has been added to the autoroles.\n\n**Configured:** ${current.length}/3\n**Roles:** ${current.map(id => `<@&${id}>`).join(" ")}`,
              0x2ecc71
            )
          ],
          ephemeral: true
        });
      }

      /* ====================================================
         TICKET
      ==================================================== */

      if (
        commandName ===
        "ticket"
      ) {

        if (
          !memberCan(
            interaction.member,
            PermissionFlagsBits.ManageGuild
          )
        ) {
          return safeReply(interaction, {
            content:
              "❌ You need **Manage Server** permission to configure tickets.",
            ephemeral: true
          });
        }

        const cfg =
          db.ticketConfig[
            interaction.guild.id
          ] || {};

        const buttons =
          Array.isArray(
            cfg.buttons
          )
            ? cfg.buttons
            : [
                {
                  label:
                    "Need Support Botrix",
                  emoji:
                    "🎫"
                },
                {
                  label:
                    "Create A Personal Bot",
                  emoji:
                    "🤖"
                },
                {
                  label:
                    "Create A Personal Project",
                  emoji:
                    "🛠️"
                },
                {
                  label:
                    "Partnership",
                  emoji:
                    "🤝"
                }
              ];

        const count =
          Math.min(
            4,
            Math.max(
              1,
              Number(
                cfg.buttonCount ||
                4
              )
            )
          );

        const buttonList =
          buttons
            .slice(
              0,
              count
            )
            .map(
              (b, i) =>
                `${i + 1}. ${
                  b.emoji ||
                  "🎫"
                } ${b.label}`
            )
            .join("\n");

        const embed =
          botrixEmbed(
            "🎫 Botrix Ticket Setup",
            [
              "Configure the ticket system from this panel.",
              "",
              `📢 **Panel Channel:** ${
                cfg.panelChannelId
                  ? `<#${cfg.panelChannelId}>`
                  : "Not configured"
              }`,
              `👮 **Staff Role:** ${
                cfg.staffRoleId
                  ? `<@&${cfg.staffRoleId}>`
                  : "Not configured"
              }`,
              `📁 **Category:** ${
                cfg.categoryId
                  ? `<#${cfg.categoryId}>`
                  : "Not configured"
              }`,
              `📋 **Ticket Logs:** ${
                cfg.ticketLogsChannelId
                  ? `<#${cfg.ticketLogsChannelId}>`
                  : "Not configured"
              }`,
              `🔢 **Number of Buttons:** ${count}`,
              `🖼️ **Photo:** ${
                cfg.panelImageUrl
                  ? "Configured"
                  : "Not configured"
              }`,
              "",
              "🔘 **Buttons:**",
              buttonList,
              "",
              `📝 **Description:** ${
                cfg.description
                  ? "Configured"
                  : "Default description"
              }`
            ].join("\n"),
            0x5865f2
          );

        const row1 =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "ticket_setup_channel"
                )
                .setLabel(
                  "Panel Channel"
                )
                .setStyle(
                  ButtonStyle.Primary
                )
                .setEmoji("📢"),

              new ButtonBuilder()
                .setCustomId(
                  "ticket_setup_role"
                )
                .setLabel(
                  "Staff Role"
                )
                .setStyle(
                  ButtonStyle.Secondary
                )
                .setEmoji("👮"),

              new ButtonBuilder()
                .setCustomId(
                  "ticket_setup_category"
                )
                .setLabel(
                  "Category"
                )
                .setStyle(
                  ButtonStyle.Secondary
                )
                .setEmoji("📁")
            );

        const row2 =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder().setCustomId("ticket_setup_count").setLabel("Button Count").setStyle(ButtonStyle.Primary).setEmoji("🔢"),
              new ButtonBuilder().setCustomId("ticket_setup_button_names").setLabel("Button Names").setStyle(ButtonStyle.Secondary).setEmoji("🔘"),
              new ButtonBuilder().setCustomId("ticket_setup_photo").setLabel("Photo").setStyle(ButtonStyle.Secondary).setEmoji("🖼️")
            );

        const row3 =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder().setCustomId("ticket_setup_description").setLabel("Description").setStyle(ButtonStyle.Secondary).setEmoji("📝"),
              new ButtonBuilder().setCustomId("ticket_setup_logs").setLabel("Ticket Logs").setStyle(ButtonStyle.Secondary).setEmoji("📋"),
              new ButtonBuilder().setCustomId("ticket_publish").setLabel("Publish Panel").setStyle(ButtonStyle.Success).setEmoji("📨"),
              new ButtonBuilder().setCustomId("ticket_setup_reset").setLabel("Reset").setStyle(ButtonStyle.Danger).setEmoji("♻️")
            );

        return safeReply(interaction, {
          embeds: [embed],
          components: [
            row1,
            row2,
            row3
          ],
          ephemeral: true,
          files:
            botrixFiles()
        });
      }

      /* ====================================================
         GIVEWAYS
      ==================================================== */

      if (commandName === "giveways") {
        if (!memberCan(interaction.member, PermissionFlagsBits.ManageGuild)) {
          return safeReply(interaction, { content: "❌ You need **Manage Server** permission.", ephemeral: true });
        }

        const channel = interaction.options.getChannel("channel");
        const type = interaction.options.getString("type");
        const target = interaction.options.getInteger("target");
        const photo = interaction.options.getString("photo").trim();
        const prize = interaction.options.getString("prize").trim();

        if (!/^https?:\/\/\S+/i.test(photo)) {
          return safeReply(interaction, { content: "❌ The photo must be a valid HTTP/HTTPS image URL.", ephemeral: true });
        }

        const giveawayId = `${interaction.guild.id}-${Date.now()}-${interaction.user.id}`;
        const giveaway = {
          id: giveawayId, guildId: interaction.guild.id, channelId: channel.id,
          hostId: interaction.user.id, type, target, photo, prize,
          participants: [], status: "active", createdAt: Date.now(),
          winnerId: null, messageId: null
        };

        const typeLabel = type === "invites" ? "Invites" : type === "members" ? "Members" : "Other";
        const description = [
          `🎁 **Prize:** ${prize}`,
          `👤 **Hosted by:** <@${interaction.user.id}>`,
          `🎯 **Type:** ${typeLabel}`,
          `📊 **Target:** ${target}`,
          "",
          type === "invites"
            ? `The first participant to reach **${target} invites** wins automatically.`
            : type === "members"
              ? `The first participant to bring **${target} members** through their invites wins automatically.`
              : `Join the giveaway and wait for the host to choose the winner.`,
          "",
          "👇 Click **Join Giveaway** to enter."
        ].join("\n");

        const embed = new EmbedBuilder()
          .setColor(0xe91e63).setTitle("🎉 GIVEAWAY")
          .setDescription(description).setImage(photo)
          .setFooter({ text: "Botrix System • Giveaway" }).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`giveways_join_${giveawayId}`)
            .setLabel("Join Giveaway").setEmoji("🎉").setStyle(ButtonStyle.Primary)
        );

        let giveawayMessage;
        try {
          giveawayMessage = await channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
          return safeReply(interaction, {
            content: `❌ I couldn't send the giveaway in ${channel}.\n\`${error.message || "Unknown error"}\``,
            ephemeral: true
          });
        }

        giveaway.messageId = giveawayMessage.id;
        db.giveaways[giveawayId] = giveaway;
        saveJSON(files.giveaways, db.giveaways);

        return safeReply(interaction, {
          content: `✅ Giveaway created in ${channel}.`,
          ephemeral: true
        });
      }

    } catch (error) {

      console.error(
        `❌ /${commandName} error:`,
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        return interaction
          .followUp({
            content:
              "❌ An error occurred while executing this command.",
            ephemeral: true
          })
          .catch(() => {});
      }

      return safeReply(interaction, {
        content:
          "❌ An error occurred while executing this command.",
        ephemeral: true
      }).catch(() => {});
    }
  }
);

/* =========================================================
   SERVER LOG EVENTS
========================================================= */

client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;
  await sendServerLog(message.guild, "🗑️ Message Deleted", `**Channel:** ${message.channel}\n**Author:** ${message.author ? message.author.tag : "Unknown"}\n**Content:** ${message.content || "[content unavailable]"}`, 0xe74c3c);
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  await sendServerLog(newMessage.guild, "✏️ Message Edited", `**Channel:** ${newMessage.channel}\n**Author:** ${newMessage.author ? newMessage.author.tag : "Unknown"}\n**Before:** ${oldMessage.content || "[empty]"}\n**After:** ${newMessage.content || "[empty]"}`, 0xf1c40f);
});

client.on("channelCreate", async channel => {
  if (!channel.guild) return;
  await sendServerLog(channel.guild, "📁 Channel Created", `**Channel:** ${channel}\n**Name:** #${channel.name}\n**Type:** ${channel.type}`, 0x2ecc71);
});

client.on("channelDelete", async channel => {
  if (!channel.guild) return;
  await sendServerLog(channel.guild, "🗑️ Channel Deleted", `**Channel:** #${channel.name}\n**ID:** ${channel.id}`, 0xe74c3c);
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  await sendServerLog(newChannel.guild, "✏️ Channel Updated", `**Channel:** ${newChannel}\n**Old name:** ${oldChannel.name}\n**New name:** ${newChannel.name}`, 0xf1c40f);
});

client.on("roleCreate", async role => {
  await sendServerLog(role.guild, "🟢 Role Created", `**Role:** ${role}\n**Name:** ${role.name}\n**ID:** ${role.id}`, 0x2ecc71);
});

client.on("roleDelete", async role => {
  await sendServerLog(role.guild, "🔴 Role Deleted", `**Role:** ${role.name}\n**ID:** ${role.id}`, 0xe74c3c);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  await sendServerLog(newRole.guild, "🟡 Role Updated", `**Role:** ${newRole}\n**Old name:** ${oldRole.name}\n**New name:** ${newRole.name}`, 0xf1c40f);
});

client.on("guildMemberRemove", async member => {
  await sendServerLog(member.guild, "🚪 Member Left / Removed", `**Member:** ${member.user.tag}\n**ID:** ${member.id}`, 0xe74c3c);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const changes = [];
  if (oldMember.nickname !== newMember.nickname) changes.push(`**Nickname:** ${oldMember.nickname || "none"} → ${newMember.nickname || "none"}`);
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  const added = [...newRoles].filter(id => !oldRoles.has(id) && id !== newMember.guild.id);
  const removed = [...oldRoles].filter(id => !newRoles.has(id) && id !== newMember.guild.id);
  if (added.length) changes.push(`**Roles added:** ${added.map(id => `<@&${id}>`).join(", ")}`);
  if (removed.length) changes.push(`**Roles removed:** ${removed.map(id => `<@&${id}>`).join(", ")}`);
  if (changes.length) await sendServerLog(newMember.guild, "👤 Member Updated", `**Member:** ${newMember.user.tag}\n${changes.join("\n")}`, 0xf1c40f);
});

client.on("guildBanAdd", async ban => {
  await sendServerLog(ban.guild, "🔨 Member Banned", `**Member:** ${ban.user.tag}\n**ID:** ${ban.user.id}\n**Reason:** ${ban.reason || "Not specified"}`, 0xe74c3c);
});

client.on("guildBanRemove", async ban => {
  await sendServerLog(ban.guild, "♻️ Member Unbanned", `**Member:** ${ban.user.tag}\n**ID:** ${ban.user.id}`, 0x2ecc71);
});

/* =========================================================
   GIVEWAYS + INVITE TRACKING
========================================================= */

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    guild._botrixInvites = new Map(invites.map(invite => [invite.code, {
      uses: invite.uses || 0,
      inviterId: invite.inviter?.id || null
    }]));
  } catch (error) {
    guild._botrixInvites = new Map();
    console.warn(`⚠️ Could not cache invites for ${guild.name}: ${error.message}`);
  }
}

async function findMemberInvite(member) {
  try {
    const before = member.guild._botrixInvites || new Map();
    const current = await member.guild.invites.fetch();
    let used = null;

    for (const invite of current.values()) {
      const old = before.get(invite.code);
      if (old && (invite.uses || 0) > old.uses) {
        used = invite;
        break;
      }
    }

    member.guild._botrixInvites = new Map(current.map(invite => [invite.code, {
      uses: invite.uses || 0,
      inviterId: invite.inviter?.id || null
    }]));
    return used;
  } catch (error) {
    console.warn(`⚠️ Could not detect invite for ${member.user.tag}: ${error.message}`);
    return null;
  }
}

async function checkInviteGiveaways(guild, inviterId) {
  if (!inviterId) return;

  for (const giveaway of Object.values(db.giveaways)) {
    if (giveaway.guildId !== guild.id || giveaway.status !== "active") continue;
    if (!["invites", "members"].includes(giveaway.type)) continue;
    if (!giveaway.participants.includes(inviterId)) continue;

    const count = Number(db.inviteCounts[guild.id]?.[inviterId] || 0);
    if (count < giveaway.target) continue;

    giveaway.status = "won";
    giveaway.winnerId = inviterId;
    giveaway.wonAt = Date.now();
    saveJSON(files.giveaways, db.giveaways);

    const channel = guild.channels.cache.get(giveaway.channelId) ||
      await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel?.isTextBased()) continue;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    const winnerEmbed = new EmbedBuilder()
      .setColor(0x2ecc71).setTitle("🏆 GIVEAWAY WINNER")
      .setDescription(`🎉 Congratulations <@${inviterId}>!\n\nYou reached **${count} invites** and won **${giveaway.prize}**!\n\n**YOU ARE THE WINNER!** 🏆`)
      .setImage(giveaway.photo).setTimestamp()
      .setFooter({ text: "Botrix System • Giveaway completed" });

    if (message) await message.edit({ embeds: [winnerEmbed], components: [] }).catch(() => {});
    await channel.send(`🏆 <@${inviterId}> **YOU ARE THE WINNER!** You reached **${count} invites** and won **${giveaway.prize}**!`).catch(() => {});
  }
}

// Prime invite caches after startup so pre-existing invites can be tracked.
client.once("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild).catch(() => {});
  }
  console.log(`✅ Giveaway invite tracking initialized for ${client.guilds.cache.size} servers`);
});

client.on("inviteCreate", async invite => {
  const guild = invite.guild;
  if (!guild) return;
  if (!guild._botrixInvites) guild._botrixInvites = new Map();
  guild._botrixInvites.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
});

client.on("inviteDelete", async invite => {
  if (invite.guild?._botrixInvites) invite.guild._botrixInvites.delete(invite.code);
});

client.on("guildMemberAdd", async member => {
  await sendServerLog(member.guild, "📥 Member Joined", `**Member:** ${member.user.tag}\n**ID:** ${member.id}`, 0x2ecc71);
  if (member.user.bot) return;

  const usedInvite = await findMemberInvite(member);
  const inviterId = usedInvite?.inviter?.id || usedInvite?.inviterId || null;
  if (!inviterId || inviterId === member.id) return;

  if (!db.inviteCounts[member.guild.id]) db.inviteCounts[member.guild.id] = {};
  db.inviteCounts[member.guild.id][inviterId] =
    Number(db.inviteCounts[member.guild.id][inviterId] || 0) + 1;
  saveJSON(files.inviteCounts, db.inviteCounts);

  await checkInviteGiveaways(member.guild, inviterId);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (newState.member?.user.bot) return;
  if (!oldState.channelId && newState.channelId) await sendServerLog(newState.guild, "🔊 Voice Joined", `**Member:** ${newState.member?.user.tag || newState.id}\n**Channel:** <#${newState.channelId}>`, 0x3498db);
  else if (oldState.channelId && !newState.channelId) await sendServerLog(newState.guild, "🔇 Voice Left", `**Member:** ${oldState.member?.user.tag || oldState.id}\n**Channel:** <#${oldState.channelId}>`, 0x95a5a6);
  else if (oldState.channelId !== newState.channelId) await sendServerLog(newState.guild, "🔄 Voice Moved", `**Member:** ${newState.member?.user.tag || newState.id}\n**From:** <#${oldState.channelId}>\n**To:** <#${newState.channelId}>`, 0x3498db);
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
  const changes = [];
  if (oldGuild.name !== newGuild.name) changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
  if (oldGuild.icon !== newGuild.icon) changes.push("**Icon:** changed");
  if (oldGuild.banner !== newGuild.banner) changes.push("**Banner:** changed");
  if (changes.length) await sendServerLog(newGuild, "⚙️ Server Updated", changes.join("\n"), 0xf1c40f);
});

/* =========================================================
   WELCOME + AUTOROLE
========================================================= */

client.on(
  "guildMemberAdd",
  async member => {
    try {
      if (member.user.bot) return;

      // ====================================================
      // AUTOROLE
      // ====================================================
      const guildId = member.guild.id;
      const roleIds = Array.isArray(db.autorole[guildId])
        ? db.autorole[guildId]
        : [];

      if (roleIds.length) {
        const validRoles = roleIds
          .map(id => member.guild.roles.cache.get(id))
          .filter(role => role && !role.managed);

        for (const role of validRoles.slice(0, 3)) {
          try {
            const me = member.guild.members.me;
            if (me && role.position >= me.roles.highest.position) continue;
            await member.roles.add(role, "Botrix System AutoRole");
          } catch (error) {
            console.error(`❌ Failed to give autorole ${role.name}:`, error);
          }
        }
      }

      // ====================================================
      // AUTOMATIC WELCOME
      // Sends the same welcome message to:
      // 1) The channel configured with /welcome
      // 2) The fixed "Our Website" channel 1551600238144266300
      // No verification panel / no Verify button.
      // ====================================================
      const cfg = db.welcomeConfig[guildId];
      const targetChannelIds = [...new Set([
        cfg?.enabled && cfg?.channelId ? cfg.channelId : null,
        WEBSITE_WELCOME_CHANNEL_ID
      ].filter(Boolean))];

      if (!targetChannelIds.length) return;

      const memberNumber = member.guild.memberCount;
      const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
      const rulesChannel = member.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildText && /^(rules|rule|règlement|regles)$/i.test(ch.name)
      );
      const ticketsChannel = member.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildText && /^(tickets?|support)$/i.test(ch.name)
      );

      for (const channelId of targetChannelIds) {
        const channel = await member.guild.channels
          .fetch(channelId)
          .catch(() => null);

        if (!channel || channel.type !== ChannelType.GuildText) {
          console.warn(`⚠️ Welcome channel ${channelId} is not a text channel or was not found.`);
          continue;
        }

        const me = member.guild.members.me;
        if (
          me &&
          !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)
        ) {
          console.warn(`⚠️ Botrix cannot send welcome message in ${channel.id}.`);
          continue;
        }

        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🤖 Welcome to Botrix System!")
          .setDescription(
            `👤 ${member} — welcome to **${member.guild.name}**!\n\n` +
            `🤖 Welcome to **Botrix System**, your all-in-one Discord bot.\n` +
            `👥 You are member **#${memberNumber}**.\n\n` +
            `⚡ **Quick Links**\n` +
            `📜 ${rulesChannel ? `<#${rulesChannel.id}>` : "Server Rules"} — Review the rules\n` +
            `🎫 ${ticketsChannel ? `<#${ticketsChannel.id}>` : "Support Tickets"} — Open a support ticket\n` +
            `🌐 **Website** — Manage Botrix from the dashboard\n\n` +
            `💬 Need help? Just ask — our team is here for you.`
          )
          .setThumbnail(avatarUrl)
          .setImage("attachment://botrix.png")
          .setFooter({ text: `Welcome to ${member.guild.name} • Botrix System` })
          .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("🌐 Visit Our Website")
            .setStyle(ButtonStyle.Link)
            .setURL(BOTRIX_WEBSITE_URL)
        );

        await channel.send({
          embeds: [welcomeEmbed],
          components: [buttons],
          files: botrixFiles()
        });

        console.log(`👋 Welcome sent for ${member.user.tag} in #${channel.name}`);
      }
    } catch (error) {
      console.error("❌ Welcome/AutoRole error:", error);
    }
  }
);

/* =========================================================
   BOTRIX AI
========================================================= */

async function askBotrixAI(message) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing from .env");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Rezistanza RolePlay AI, the friendly AI assistant inside a Discord server. " +
            "Reply naturally and concisely. Automatically answer in the same language as the user. " +
            "You understand Tunisian Arabic (Derja), Arabic, French and English. " +
            "Do not claim to be a human. Keep Discord formatting simple."
        },
        {
          role: "user",
          content: message.content.slice(0, 4000)
        }
      ],
    max_completion_tokens: 500
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenAI API ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const result = await response.json();
  return result?.choices?.[0]?.message?.content?.trim() ||
    "Désolé, je n'ai pas pu répondre.";
}

async function handleBotrixAIMessage(message) {
  if (
    message.author.bot ||
    !message.guild ||
    !message.content?.trim()
  ) {
    return;
  }

  const configuredChannelId = db.aiChannels[message.guild.id];

  if (!configuredChannelId || configuredChannelId !== message.channel.id) {
    return;
  }

  try {
    if (message.guild.members.me) {
      await message.guild.members.me.setNickname("Rezistanza RolePlay").catch(() => {});
    }
    await message.channel.sendTyping();

    const answer = await askBotrixAI(message);
    const chunks = answer.match(/[\s\S]{1,1900}/g) || [
      "Désolé, je n'ai pas pu répondre."
    ];

    for (const chunk of chunks.slice(0, 3)) {
      await message.reply({
        content: chunk,
        allowedMentions: { repliedUser: false }
      });
    }
  } catch (error) {
    console.error("❌ Botrix AI error:", error);

    const friendlyError =
      error.message.includes("OPENAI_API_KEY")
        ? "⚠️ Rezistanza RolePlay AI n'est pas configuré. Ajoute `OPENAI_API_KEY` dans le fichier `.env`."
        : "⚠️ Rezistanza RolePlay AI a rencontré un problème. Réessaie dans quelques secondes.";

    await message.reply({
      content: friendlyError,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
  }
}

/* =========================================================
   AFK
========================================================= */

client.on(
  "messageCreate",
  async message => {

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    await handleBotrixAIMessage(message);

    const authorId =
      message.author.id;

    if (
      db.afk[authorId]
    ) {

      delete db.afk[
        authorId
      ];

      saveJSON(
        files.afk,
        db.afk
      );

      await message
        .reply({
          content:
            `👋 Welcome back ${message.author}! Your AFK has been removed.`
        })
        .catch(() => {});
    }

    for (
      const user of message
        .mentions
        .users
        .values()
    ) {

      if (
        db.afk[user.id]
      ) {

        const afk =
          db.afk[
            user.id
          ];

        await message
          .reply({
            content:
              `💤 **${user.tag}** is AFK: ${afk.reason}`
          })
          .catch(() => {});

        break;
      }
    }
  }
);

/* =========================================================
   WELCOME DM
========================================================= */

const MY_DISCORD_INVITE =
  "https://discord.gg/new9ZPv22D";

const BOT_INVITE_URL =
  `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

function buildWelcomeDM(
  guild,
  recipient
) {

  const text =
`**Welcome to Botrix!**

Hey **${recipient}** ! Thanks for adding **Botrix System** to **${guild.name}** 🎉

I'm an all-in-one Discord bot packed with features.

### 🎵 Music

\`/music play\` — Play songs from YouTube, Spotify, SoundCloud.

### 🛡️ Moderation

\`/kick\` \`/timeout\`  \`/clear\` \`/lockdown\`

### ⚙️ AutoMod

\`/automod\` — Anti-spam and automatic moderation.

### 🎉 Community

\`/afk\` \`/poll\` \`/rep\` \`/rank\` \`/leaderboard\`

### 💰 Economy

\`/economy\`

### 🎫 Tickets

\`/ticket\`

### 🎁 Giveaways

\`/giveaway\`

### 📊 Information

\`/serverinfo\` \`/userinfo\` \`/bot\` \`/help\`

### 💡 Quick Tips

• Type \`/help\` in your server.
• Use the interactive setup panels.
• Configure Botrix directly from your server.`;

  return new EmbedBuilder()
    .setColor(
      0x5865f2
    )
    .setDescription(
      text
    )
    .setThumbnail(
      "attachment://botrix.png"
    )
    .setFooter({
      text:
        "Botrix System • Thanks for choosing Botrix!"
    })
    .setTimestamp();
}

/* =========================================================
   FIND BOT INVITER
========================================================= */

async function findBotInviter(
  guild
) {

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        2500
      )
  );

  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {

    try {

      const me =
        guild.members.me;

      if (
        me &&
        !me.permissions.has(
          PermissionFlagsBits.ViewAuditLog
        )
      ) {

        console.warn(
          `⚠️ Botrix does not have View Audit Log in ${guild.name}`
        );

        return null;
      }

      const logs =
        await guild.fetchAuditLogs({
          type: 28,
          limit: 20
        });

      const entry =
        logs.entries.find(
          entry => {

            if (
              !entry.target
            ) {
              return false;
            }

            if (
              entry.target.id !==
              client.user.id
            ) {
              return false;
            }

            if (
              Date.now() -
                entry.createdTimestamp >
              10 * 60 * 1000
            ) {
              return false;
            }

            return true;
          }
        );

      if (
        entry?.executor
      ) {

        console.log(
          `👤 Botrix was added by: ${entry.executor.tag}`
        );

        return entry.executor;
      }

    } catch (error) {

      console.warn(
        `⚠️ Audit log attempt ${attempt}/3 failed: ${error.message}`
      );
    }

    if (
      attempt < 3
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            2000
          )
      );
    }
  }

  return null;
}

/* =========================================================
   BOT JOIN SERVER
========================================================= */

client.on(
  "guildCreate",
  async guild => {

    try {

      console.log(
        `📥 Botrix joined server: ${guild.name} (${guild.id})`
      );

      if (
        db.welcomeSent[
          guild.id
        ]
      ) {

        return;
      }

      const recipient =
        await findBotInviter(
          guild
        );

      if (!recipient) {

        console.error(
          `❌ Could not identify who added Botrix to ${guild.name}.`
        );

        return;
      }

      const welcome =
        buildWelcomeDM(
          guild,
          recipient.username
        );

      const buttons =
        new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()
              .setLabel(
                "Invite Bot to another server"
              )
              .setEmoji("➕")
              .setStyle(
                ButtonStyle.Link
              )
              .setURL(
                BOT_INVITE_URL
              ),

            new ButtonBuilder()
              .setLabel(
                "My Server Discord"
              )
              .setEmoji("💬")
              .setStyle(
                ButtonStyle.Link
              )
              .setURL(
                MY_DISCORD_INVITE
              )
          );

      await recipient.send({
        embeds: [
          welcome
        ],
        components: [
          buttons
        ],
        files:
          botrixFiles()
      });

      db.welcomeSent[
        guild.id
      ] = {
        sentAt:
          Date.now(),
        recipientId:
          recipient.id,
        recipientTag:
          recipient.tag
      };

      saveJSON(
        files.welcomeSent,
        db.welcomeSent
      );

      console.log(
        `✅ PRIVATE Welcome DM sent to ${recipient.tag}`
      );

    } catch (error) {

      console.warn(
        `⚠️ Could not send welcome DM for ${guild.name}: ${error.message}`
      );
    }
  }
);

/* =========================================================
   ERROR HANDLERS
========================================================= */

client.on(
  "error",
  error => {
    if (error?.code === 10062 || error?.rawError?.code === 10062) {
      console.warn("⚠️ Discord interaction expired (10062). The interaction was too old to acknowledge.");
      return;
    }

    console.error("Discord client error:", error);
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught exception:",
      error
    );
  }
);

/* =========================================================
   LOGIN
========================================================= */


/* =========================================================
   DISCORD OAUTH VERIFICATION WEB SERVER
   Requires a public HTTPS URL in OAUTH_REDIRECT_URI.
========================================================= */
const oauthClientId = CLIENT_ID;
const oauthClientSecret = process.env.OAUTH_CLIENT_SECRET;
const oauthRedirectUri = process.env.OAUTH_REDIRECT_URI;
const verifyPort = Number(process.env.VERIFY_PORT || 3000);
const oauthStates = new Map();
const verifiedUsersPath = path.join(dataDir, "verifiedUsers.json");

function readVerifiedUsers() {
  try {
    return fs.existsSync(verifiedUsersPath)
      ? JSON.parse(fs.readFileSync(verifiedUsersPath, "utf8"))
      : {};
  } catch {
    return {};
  }
}
function saveVerifiedUsers(users) {
  fs.writeFileSync(verifiedUsersPath, JSON.stringify(users, null, 2), { mode: 0o600 });
}
function sendHtml(res, status, title, message) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;background:#111827;color:#f9fafb;font:16px Arial;display:grid;min-height:100vh;place-items:center"><main style="max-width:560px;margin:24px;padding:32px;border:1px solid #374151;border-radius:18px;background:#1f2937"><h1>${title}</h1><p>${message}</p></main></body></html>`);
}
if (oauthClientSecret && oauthRedirectUri) {
  let redirectUrl;
  try { redirectUrl = new URL(oauthRedirectUri); } catch { redirectUrl = null; }
  if (!redirectUrl || redirectUrl.pathname !== "/verify/callback") {
    console.error("❌ OAUTH_REDIRECT_URI must be a valid URL ending exactly in /verify/callback.");
  } else {
    const oauthServer = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        if (url.pathname === "/verify" && req.method === "GET") {
          const state = crypto.randomBytes(24).toString("hex");
          oauthStates.set(state, Date.now());
          const authorize = new URL("https://discord.com/oauth2/authorize");
          authorize.searchParams.set("client_id", oauthClientId);
          authorize.searchParams.set("response_type", "code");
          authorize.searchParams.set("redirect_uri", oauthRedirectUri);
          authorize.searchParams.set("scope", "identify guilds.join");
          authorize.searchParams.set("state", state);
          res.writeHead(302, { Location: authorize.toString(), "Cache-Control": "no-store" });
          return res.end();
        }
        if (url.pathname === "/verify/callback" && req.method === "GET") {
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const stateTime = state && oauthStates.get(state);
          if (!code || !stateTime || Date.now() - stateTime > 10 * 60 * 1000) {
            if (state) oauthStates.delete(state);
            return sendHtml(res, 400, "Verification failed", "This verification link is invalid or expired. Return to Discord and try again.");
          }
          oauthStates.delete(state);
          const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: oauthClientId,
              client_secret: oauthClientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: oauthRedirectUri
            })
          });
          const tokenData = await tokenResponse.json().catch(() => ({}));
          if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("OAuth token exchange failed:", tokenResponse.status, tokenData.error || "unknown error");
            return sendHtml(res, 400, "Verification failed", "Discord could not complete authorization. Please return to Discord and try again.");
          }
          const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const user = await userResponse.json().catch(() => ({}));
          if (!userResponse.ok || !user.id) {
            return sendHtml(res, 400, "Verification failed", "Could not confirm your Discord account. Please try again.");
          }
          const users = readVerifiedUsers();
          users[user.id] = {
            username: user.username,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expires_at: Date.now() + Number(tokenData.expires_in || 0) * 1000,
            guilds_join: String(tokenData.scope || "").split(" ").includes("guilds.join"),
            verified_at: new Date().toISOString()
          };
          saveVerifiedUsers(users);

          // Keep the owner verification statistics panel in sync immediately.
          try {
            await setupVerificationInfoPanel();
          } catch (panelError) {
            console.error("❌ Could not refresh verification info panel:", panelError);
          }

          return sendHtml(res, 200, "Verification successful", `Your Discord account (${user.username.replace(/[&<>"]/g, "")}) has been verified. You can return to Discord now.`);
        }
        return sendHtml(res, 404, "Not found", "This Botrix verification page does not exist.");
      } catch (err) {
        console.error("OAuth verification server error:", err);
        return sendHtml(res, 500, "Something went wrong", "Please return to Discord and try verification again later.");
      }
    });
    oauthServer.listen(verifyPort, "0.0.0.0", () => {
      console.log(`✅ Botrix OAuth verification server listening on port ${verifyPort}`);
      console.log(`   Public verification URL: ${new URL(oauthRedirectUri).origin}/verify`);
    });
  }
} else {
  console.warn("⚠️ OAuth verification is disabled. Set OAUTH_CLIENT_SECRET and OAUTH_REDIRECT_URI in .env.");
}

client.login(
  TOKEN
);
