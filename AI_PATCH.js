// BOTRIX AI PATCH
// Add this block to your existing index.js.
// Requires: Node.js 22+ and dotenv.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

async function askBotrixAI(message) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions:
        "You are Botrix System, a helpful Discord assistant. Detect the user's language and answer in the same language. Support Tunisian Arabic/Darija, Arabic, French, English, Italian, Spanish, German, Turkish, Russian, Japanese, Chinese and other languages. Be concise and friendly. Never reveal API keys or private configuration.",
      input: message.content.slice(0, 12000),
      max_output_tokens: 900
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI API error (${response.status})`);
  }

  const text = typeof data.output_text === "string"
    ? data.output_text.trim()
    : (data.output || [])
        .flatMap(x => x.content || [])
        .map(x => x.text || "")
        .join("\n")
        .trim();

  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}

function splitDiscordMessage(text, max = 1900) {
  const result = [];
  let value = String(text || "").trim();
  while (value.length > max) {
    let cut = value.lastIndexOf("\n", max);
    if (cut < 500) cut = value.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    result.push(value.slice(0, cut).trim());
    value = value.slice(cut).trim();
  }
  if (value) result.push(value);
  return result;
}

// Uses db.aiChannels[guildId] as the configured channel ID.
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild || !message.content?.trim()) return;
  const channelId = db.aiChannels?.[message.guild.id];
  if (!channelId || message.channel.id !== channelId) return;

  try {
    await message.channel.sendTyping().catch(() => {});
    const answer = await askBotrixAI(message);
    for (const chunk of splitDiscordMessage(answer)) {
      await message.channel.send({
        content: chunk,
        allowedMentions: { parse: [] }
      });
    }
  } catch (error) {
    console.error("Botrix AI error:", error);
  }
});
