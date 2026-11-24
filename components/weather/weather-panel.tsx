"use client";

import { CloudRain, Droplets, RefreshCw, Sun, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import { WeatherIcon } from "@/components/weather/weather-icon";
import type { WeatherAdvice, WeatherSnapshot } from "@/lib/weather/open-meteo";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-LK", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Colombo" });
}

function fmtDay(date: string): string {
  const d = new Date(`${date}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Colombo" });
}

function fmtUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" });
}

export function WeatherPanel({
  weather,
  advice,
  compact = false,
}: {
  weather: WeatherSnapshot | null;
  advice?: WeatherAdvice | null;
  compact?: boolean;
}) {
  if (!weather) {
    return (
      <div className="rounded-2xl border border-line/80 bg-surface/50 p-4">
        <p className="kv-label">Kandy weather</p>
        <p className="mt-2 text-[14px] font-medium text-foreground">Weather unavailable</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Live weather could not be loaded from Open-Meteo right now. No estimated or fabricated values are shown.
        </p>
      </div>
    );
  }

  const today = weather.daily[0];
  const nextHours = weather.hourly.slice(0, compact ? 8 : 12);
  const days = weather.daily.slice(0, compact ? 5 : 7);

  return (
    <div className="rounded-2xl border border-line/80 bg-surface/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kv-label">{compact ? "Kandy weather" : "Kandy weather (live forecast)"}</p>
          <div className="mt-2 flex items-center gap-3">
            <WeatherIcon icon={weather.current.condition.icon} className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {Math.round(weather.current.temperatureC)}°C
              </p>
              <p className="text-[13px] text-muted">{weather.current.condition.label}</p>
            </div>
          </div>
          <p className="mt-1 text-[12px] text-muted-2">
            Feels like {Math.round(weather.current.apparentC)}°C · Updated {fmtUpdated(weather.fetchedAt)} (Asia/Colombo)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px] text-muted sm:grid-cols-3">
          <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-muted-2"><Droplets className="h-3.5 w-3.5" />Humidity</div>
            <div className="mt-0.5 font-medium text-foreground">{Math.round(weather.current.humidity)}%</div>
          </div>
          <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-muted-2"><Wind className="h-3.5 w-3.5" />Wind</div>
            <div className="mt-0.5 font-medium text-foreground">{Math.round(weather.current.windKmh)} km/h</div>
          </div>
          <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-muted-2"><CloudRain className="h-3.5 w-3.5" />Precip now</div>
            <div className="mt-0.5 font-medium text-foreground">{weather.current.precipitationMm.toFixed(1)} mm</div>
          </div>
          {!compact && today?.uvIndexMax != null && (
            <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-muted-2"><Sun className="h-3.5 w-3.5" />UV max (today)</div>
              <div className="mt-0.5 font-medium text-foreground">{today.uvIndexMax.toFixed(1)}</div>
            </div>
          )}
          {!compact && today?.precipitationSumMm != null && (
            <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-muted-2"><Thermometer className="h-3.5 w-3.5" />Rain (today est.)</div>
              <div className="mt-0.5 font-medium text-foreground">{today.precipitationSumMm.toFixed(1)} mm</div>
            </div>
          )}
          {!compact && today && (
            <div className="rounded-lg border border-line/70 bg-surface/60 px-2.5 py-2 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-3 text-muted-2"><span className="inline-flex items-center gap-1"><Sunrise className="h-3.5 w-3.5" />{fmtTime(today.sunrise)}</span><span className="inline-flex items-center gap-1"><Sunset className="h-3.5 w-3.5" />{fmtTime(today.sunset)}</span></div>
              <div className="mt-0.5 text-[11px] text-muted-2">Sunrise / sunset (forecast)</div>
            </div>
          )}
        </div>
      </div>

      {advice && (
        <div className="mt-4 rounded-xl border border-accent/15 bg-accent/[0.05] p-3 text-[13px] leading-relaxed text-muted">
          <p className="font-medium text-foreground">{advice.headline}</p>
          <p className="mt-1">{advice.rainLikely ? advice.indoorAdvice : advice.outdoorAdvice}</p>
          {!compact && advice.bestWindow && <p className="mt-1 text-muted-2">{advice.bestWindow}</p>}
          {!compact && advice.cautions && advice.cautions.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[12px] text-muted-2">
              {advice.cautions.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-2">Travel suggestions are based on forecast data and transparent rules, not safety guarantees.</p>
        </div>
      )}

      {!compact && (
        <>
          <div className="mt-4">
            <p className="text-[12px] font-medium text-foreground">Next hours</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {nextHours.map((hour) => (
                <div key={hour.time} className="min-w-[84px] rounded-lg border border-line/70 bg-surface/60 px-2 py-2 text-center text-[11px]">
                  <div className="text-muted-2">{fmtTime(hour.time)}</div>
                  <div className="mt-1 flex justify-center"><WeatherIcon icon={hour.condition.icon} className="h-4 w-4 text-accent" /></div>
                  <div className="mt-1 font-medium text-foreground">{Math.round(hour.temperatureC)}°</div>
                  <div className="text-muted-2">{hour.precipitationProbability}% rain</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-medium text-foreground">{days.length}-day forecast</p>
            <div className="mt-2 space-y-1.5">
              {days.map((day) => (
                <div key={day.date} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-line/60 bg-surface/40 px-2.5 py-2 text-[12px]">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{fmtDay(day.date)}</div>
                    <div className="truncate text-[11px] text-muted-2">{day.condition.label}</div>
                  </div>
                  <div className="flex justify-center"><WeatherIcon icon={day.condition.icon} className="h-4 w-4 text-accent" /></div>
                  <div className="text-right text-muted">{Math.round(day.minC)}° / {Math.round(day.maxC)}°</div>
                  <div className="text-right text-muted-2">{day.precipitationProbability}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="mt-3 text-[11px] text-muted-2">
        Source: <a className="underline underline-offset-2" href={weather.source.url} target="_blank" rel="noreferrer">{weather.source.name}</a> ({weather.source.license}). Forecast values may change; check conditions again before travel.
      </p>
    </div>
  );
}
