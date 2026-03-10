import {
  Smile,
  Briefcase,
  BookOpen,
  Lightbulb,
  Heart,
  BarChart,
  Palette,
  Newspaper,
} from "lucide-react";

export interface AgentTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: typeof Smile;
  suggestedTime: string; // HH:mm IST
  suggestedTimeLabel: string;
  writingStyle: string;
  emojiStyle: string;
  imageStyle: string;
  promptHints: string;
}

export const AGENT_TYPES: AgentTypeConfig[] = [
  {
    id: "comedy",
    label: "Comedy / Humorous",
    description: "Funny, relatable LinkedIn posts that make people stop scrolling",
    icon: Smile,
    suggestedTime: "21:00",
    suggestedTimeLabel: "9 PM",
    writingStyle: "Witty, self-deprecating humor, unexpected punchlines, relatable work situations",
    emojiStyle: "Use humor emojis like 😂🤣💀🫠 sparingly for punchlines",
    imageStyle: "meme-style, cartoon, funny reaction images, comic strip format",
    promptHints: "Write funny, relatable LinkedIn posts. Use humor to make a point. Include a twist or punchline. Avoid cringe corporate humor — be genuinely funny like a comedian who works in tech.",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Formal industry insights and expert analysis",
    icon: Briefcase,
    suggestedTime: "10:00",
    suggestedTimeLabel: "10 AM",
    writingStyle: "Authoritative, clear, evidence-based, industry-focused",
    emojiStyle: "Minimal emojis. Use 📊📈💡 only at paragraph starts for scannability",
    imageStyle: "minimal business graphics, clean professional design, corporate colors",
    promptHints: "Write authoritative industry analysis posts. Share expert insights with data backing. Professional but not boring — be the smartest person in the room without being arrogant.",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    description: "Personal founder journey stories that inspire and connect",
    icon: BookOpen,
    suggestedTime: "12:00",
    suggestedTimeLabel: "12 PM",
    writingStyle: "Narrative-driven, vulnerable, personal anecdotes, emotional arcs",
    emojiStyle: "Warm emojis like ❤️🙏✨🌟 to enhance emotional moments",
    imageStyle: "emotional visual scenes, cinematic moments, journey metaphors",
    promptHints: "Write personal stories with a clear narrative arc: setup → conflict → resolution → lesson. Be vulnerable and authentic. Every story should teach something. Use 'I' and share real experiences.",
  },
  {
    id: "thought-leadership",
    label: "Thought Leadership",
    description: "Strong opinions and bold industry takes",
    icon: Lightbulb,
    suggestedTime: "11:00",
    suggestedTimeLabel: "11 AM",
    writingStyle: "Opinionated, bold, contrarian, forward-thinking",
    emojiStyle: "Strategic emojis like 🔥💡🎯⚡ for emphasis on key points",
    imageStyle: "bold typography graphics, quote cards, futuristic design",
    promptHints: "Write posts with strong, sometimes contrarian opinions. Challenge conventional thinking. Start with a bold claim, then back it up. Be the industry voice people follow for hot takes.",
  },
  {
    id: "motivational",
    label: "Motivational",
    description: "Inspirational posts that energize and uplift",
    icon: Heart,
    suggestedTime: "08:00",
    suggestedTimeLabel: "8 AM",
    writingStyle: "Uplifting, energetic, action-oriented, empowering",
    emojiStyle: "Energetic emojis like 🚀💪🔥✨🌟 throughout for energy",
    imageStyle: "sunrise/nature scenes, achievement moments, inspirational quotes overlay",
    promptHints: "Write posts that motivate people to take action. Share lessons from failures and wins. Use power words. End with a call-to-action or challenge. Morning energy vibes.",
  },
  {
    id: "data-analytics",
    label: "Data / Analytics",
    description: "Stats, charts, and data-driven insights",
    icon: BarChart,
    suggestedTime: "16:00",
    suggestedTimeLabel: "4 PM",
    writingStyle: "Analytical, fact-based, structured, insightful",
    emojiStyle: "Data emojis like 📊📈🔢📉 at key stat callouts",
    imageStyle: "charts, graphs, data visualizations, infographic style",
    promptHints: "Write posts built around compelling statistics and data. Lead with a surprising number. Break down complex data into simple insights. Use bullet points for key stats. Always cite or reference data sources.",
  },
  {
    id: "creative",
    label: "Creative / Design",
    description: "Visual concepts and creative thinking posts",
    icon: Palette,
    suggestedTime: "19:00",
    suggestedTimeLabel: "7 PM",
    writingStyle: "Imaginative, visual language, metaphorical, artistic",
    emojiStyle: "Creative emojis like 🎨✨🎭🌈 to match artistic tone",
    imageStyle: "AI illustrations, abstract art, creative designs, artistic compositions",
    promptHints: "Write posts about creative thinking, design principles, and innovation. Use vivid metaphors and visual language. Share creative processes and 'aha' moments. Think like an artist who works in business.",
  },
  {
    id: "news",
    label: "News / Updates",
    description: "Latest industry news and trend analysis",
    icon: Newspaper,
    suggestedTime: "09:00",
    suggestedTimeLabel: "9 AM",
    writingStyle: "Timely, informative, analytical, trend-focused",
    emojiStyle: "News emojis like 🗞️📰🔔⚡ for urgency and relevance",
    imageStyle: "headline-style news graphics, breaking news format, trend visualizations",
    promptHints: "Write posts analyzing latest industry news and trends. Be the first to break down what a development means. Add your own take on why it matters. Link trends to practical implications for the audience.",
  },
];

export const AGENT_TYPE_MAP = Object.fromEntries(AGENT_TYPES.map(t => [t.id, t]));

export const POSTING_DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];
