import { Crown, Sparkles, Star } from "lucide-react";

// Fallback data shown if the plans API is unreachable.
export const PLAN_FALLBACK = [
  {
    name: "Free", slug: "free", price_display: "\u20A60", billing_cycle: "monthly",
    description: "The starting point: browse verified profiles and get to know the community.",
    message_limit: 10, message_reset_period: "daily", active_conversation_limit: 3,
    audio_minutes_limit: 0, video_minutes_limit: 0,
    profile_view_limit_daily: 20, like_limit_daily: 5, save_limit_daily: 3,
    can_send_voice_notes: false, can_use_read_receipts: false,
    can_see_likes: false, can_see_visitors: false,
    can_use_advanced_filters: false, can_appear_featured: false, can_use_profile_boost: false,
    free_counselling_sessions: 0,
  },
  {
    name: "Basic", slug: "basic", price_display: "\u20A65,500", billing_cycle: "monthly",
    description: "Unlimited messaging, more daily discovery, voice notes and audio calls.",
    message_limit: null, message_reset_period: "monthly", active_conversation_limit: null,
    audio_minutes_limit: 60, video_minutes_limit: 0,
    profile_view_limit_daily: null, like_limit_daily: 20, save_limit_daily: 10,
    can_send_voice_notes: true, can_use_read_receipts: true,
    can_see_likes: false, can_see_visitors: true,
    can_use_advanced_filters: true, can_appear_featured: false, can_use_profile_boost: false,
    free_counselling_sessions: 0,
  },
  {
    name: "Premium", slug: "premium", price_display: "\u20A610,000", billing_cycle: "monthly",
    description: "Video calls, see who liked you, priority visibility and all premium features.",
    message_limit: null, message_reset_period: "monthly", active_conversation_limit: null,
    audio_minutes_limit: 300, video_minutes_limit: 120,
    profile_view_limit_daily: null, like_limit_daily: null, save_limit_daily: 30,
    can_send_voice_notes: true, can_use_read_receipts: true,
    can_see_likes: true, can_see_visitors: true,
    can_use_advanced_filters: true, can_appear_featured: true, can_use_profile_boost: true,
    free_counselling_sessions: 1,
  },
  {
    name: "Kingdom", slug: "kingdom", price_display: "\u20A615,000", billing_cycle: "monthly",
    description: "Every perk of Premium plus free monthly counselling and highest visibility.",
    message_limit: null, message_reset_period: "monthly", active_conversation_limit: null,
    audio_minutes_limit: 600, video_minutes_limit: 240,
    profile_view_limit_daily: null, like_limit_daily: null, save_limit_daily: null,
    can_send_voice_notes: true, can_use_read_receipts: true,
    can_see_likes: true, can_see_visitors: true,
    can_use_advanced_filters: true, can_appear_featured: true, can_use_profile_boost: true,
    free_counselling_sessions: 3,
  },
];

export function planMeta(slug) {
  const featured = slug === "premium";
  const icon = slug === "kingdom" ? Sparkles : slug === "premium" ? Crown : Star;
  return { icon, featured, per: "/month" };
}

export function planFeatures(plan) {
  const feats = [];
  if (plan.message_limit == null) feats.push("Unlimited messages");
  else feats.push(`${plan.message_limit} messages / ${plan.message_reset_period === "daily" ? "day" : "month"}`);
  if (plan.active_conversation_limit == null) feats.push("Unlimited conversations");
  else feats.push(`Up to ${plan.active_conversation_limit} active conversations`);
  if (plan.audio_minutes_limit) feats.push(`${plan.audio_minutes_limit} audio call minutes / month`);
  if (plan.video_minutes_limit) feats.push(`${plan.video_minutes_limit} video call minutes / month`);
  if (plan.profile_view_limit_daily != null) feats.push(`${plan.profile_view_limit_daily} profile views / day`);
  else feats.push("Unlimited profile views");
  if (plan.like_limit_daily != null) feats.push(`${plan.like_limit_daily} likes / day`);
  else feats.push("Unlimited likes");
  if (plan.save_limit_daily != null) feats.push(`${plan.save_limit_daily} saves / day`);
  else feats.push("Unlimited saves");
  if (plan.can_send_voice_notes) feats.push("Send voice notes");
  if (plan.can_use_advanced_filters) feats.push("Advanced filters");
  if (plan.can_see_likes) feats.push("See who liked you");
  if (plan.can_see_visitors) feats.push("See who viewed you");
  if (plan.can_use_read_receipts) feats.push("Read receipts");
  if (plan.can_appear_featured) feats.push("Appear featured");
  if (plan.can_use_profile_boost) feats.push("Profile boost");
  if (plan.free_counselling_sessions > 0) feats.push(`${plan.free_counselling_sessions} counselling session${plan.free_counselling_sessions > 1 ? "s" : ""} / month`);
  return feats;
}

export function compareRows(plans) {
  const fmt = (v) => (v == null ? "Unlimited" : v);
  const fmtPer = (v, per) => (v == null ? "Unlimited" : `${v} ${per}`);
  return [
    ["Verified faith profile", plans.map(() => true)],
    ["Messaging", plans.map(p => p.message_limit == null ? "Unlimited" : `${p.message_limit}/${p.message_reset_period === "daily" ? "day" : "month"}`)],
    ["Active conversations", plans.map(p => p.active_conversation_limit == null ? "Unlimited" : `${p.active_conversation_limit}`)],
    ["Profile views / day", plans.map(p => fmtPer(p.profile_view_limit_daily, "/day"))],
    ["Likes / day", plans.map(p => fmtPer(p.like_limit_daily, "/day"))],
    ["Saves / day", plans.map(p => fmtPer(p.save_limit_daily, "/day"))],
    ["Audio call minutes / month", plans.map(p => fmtPer(p.audio_minutes_limit, "min"))],
    ["Video call minutes / month", plans.map(p => fmtPer(p.video_minutes_limit, "min"))],
    ["Voice notes", plans.map(p => !!p.can_send_voice_notes)],
    ["Advanced filters", plans.map(p => !!p.can_use_advanced_filters)],
    ["See who liked you", plans.map(p => !!p.can_see_likes)],
    ["See who viewed you", plans.map(p => !!p.can_see_visitors)],
    ["Read receipts", plans.map(p => !!p.can_use_read_receipts)],
    ["Featured visibility", plans.map(p => !!p.can_appear_featured)],
    ["Profile boost", plans.map(p => !!p.can_use_profile_boost)],
    ["Counselling sessions / month", plans.map(p => fmt(p.free_counselling_sessions || 0))],
  ];
}