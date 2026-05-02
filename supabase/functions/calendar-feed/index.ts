import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*, category:categories(*), field:fields(*)")
      .order("match_date")
      .order("match_time");

    if (error) throw error;

    const now = new Date();
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Torneo di Sibari//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Torneo di Sibari",
      "X-WR-TIMEZONE:Europe/Rome",
    ];

    for (const match of (matches || [])) {
      const date = match.match_date.replace(/-/g, "");
      const timeParts = match.match_time.substring(0, 5).split(":");
      const startTime = `${date}T${timeParts[0]}${timeParts[1]}00`;
      
      // End time: assume 2 hours after start
      const startDate = new Date(`${match.match_date}T${match.match_time}`);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      const endTime = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;

      const catName = match.category?.name || "";
      const summary = `Napoli Campania ${catName} vs ${match.opponent}`;
      const location = match.field?.name || "";

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${match.id}@torneo-sibari`);
      lines.push(`DTSTAMP:${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      lines.push(`DTSTART;TZID=Europe/Rome:${startTime}`);
      lines.push(`DTEND;TZID=Europe/Rome:${endTime}`);
      lines.push(`SUMMARY:${summary}`);
      if (location) lines.push(`LOCATION:${location}`);
      if (match.notes) lines.push(`DESCRIPTION:${match.notes}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const ical = lines.join("\r\n");

    return new Response(ical, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="torneo-sibari.ics"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
