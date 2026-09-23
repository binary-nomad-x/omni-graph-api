import { request } from "node:https";
import { logger } from "@gql-prisma-api/utils/logger.js";

// ============================================================
// CONFIG (move this url to config or .env and .env.example)
// ============================================================

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Default coordinates (Lahore, Pakistan)
const DEFAULT_LAT = 31.5204;
const DEFAULT_LON = 74.3587;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

// ============================================================
// WMO WEATHER CODES (expanded with icons + severity)
// ============================================================

interface WeatherMeta {
  description: string;
  icon: string;
  severity: "info" | "warning" | "danger";
}

const WMO_CODES: Record<number, WeatherMeta> = {
  0: { description: "Clear sky", icon: "☀️", severity: "info" },
  1: { description: "Mainly clear", icon: "🌤️", severity: "info" },
  2: { description: "Partly cloudy", icon: "⛅", severity: "info" },
  3: { description: "Overcast", icon: "☁️", severity: "info" },
  45: { description: "Fog", icon: "🌫️", severity: "warning" },
  48: { description: "Depositing rime fog", icon: "🌫️", severity: "warning" },
  51: { description: "Light drizzle", icon: "🌦️", severity: "info" },
  53: { description: "Moderate drizzle", icon: "🌦️", severity: "info" },
  55: { description: "Dense drizzle", icon: "🌧️", severity: "warning" },
  56: { description: "Light freezing drizzle", icon: "🌨️", severity: "warning" },
  57: { description: "Dense freezing drizzle", icon: "🌨️", severity: "warning" },
  61: { description: "Slight rain", icon: "🌦️", severity: "info" },
  63: { description: "Moderate rain", icon: "🌧️", severity: "warning" },
  65: { description: "Heavy rain", icon: "🌧️", severity: "danger" },
  66: { description: "Light freezing rain", icon: "🌨️", severity: "warning" },
  67: { description: "Heavy freezing rain", icon: "🌨️", severity: "danger" },
  71: { description: "Slight snow", icon: "🌨️", severity: "warning" },
  73: { description: "Moderate snow", icon: "❄️", severity: "warning" },
  75: { description: "Heavy snow", icon: "❄️", severity: "danger" },
  77: { description: "Snow grains", icon: "🌨️", severity: "warning" },
  80: { description: "Slight rain showers", icon: "🌦️", severity: "info" },
  81: { description: "Moderate rain showers", icon: "🌧️", severity: "warning" },
  82: { description: "Violent rain showers", icon: "⛈️", severity: "danger" },
  85: { description: "Slight snow showers", icon: "🌨️", severity: "warning" },
  86: { description: "Heavy snow showers", icon: "❄️", severity: "danger" },
  95: { description: "Thunderstorm", icon: "⛈️", severity: "danger" },
  96: { description: "Thunderstorm with slight hail", icon: "⛈️", severity: "danger" },
  99: { description: "Thunderstorm with heavy hail", icon: "⛈️", severity: "danger" },
};

// ============================================================
// TYPES
// ============================================================

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  severity: WeatherMeta["severity"];
}

export interface WeatherHourly {
  time: string[];
  temperature: number[];
  humidity: number[];
  precipitation: number[];
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  hourly: WeatherHourly;
  daily: {
    time: string[];
    tempMax: number[];
    tempMin: number[];
    precipitationSum: number[];
  };
}

export interface WeatherFetchOptions {
  latitude?: number;
  longitude?: number;
  forecastDays?: number;
  timeoutMs?: number;
}

// ============================================================
// INTERNAL HTTP CLIENT (with timeout + retries)
// ============================================================

function httpGet(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode && res.statusCode >= 400) {
          reject(
            new Error(`Weather API returned ${res.statusCode}: ${body.slice(0, 200)}`)
          );
        } else {
          resolve(body);
        }
      });
      res.on("error", reject);
    });

    // 🔥 Timeout handling — critical for hanging requests
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on("error", reject);
    req.end();
  });
}

async function httpGetWithRetry(
  url: string,
  retries = MAX_RETRIES,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<string> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await httpGet(url, timeoutMs);
    } catch (err) {
      lastError = err as Error;
      const isLast = attempt === retries;

      if (isLast) break;

      // Exponential backoff with jitter
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 200;
      logger.warning("Weather API request failed — retrying", {
        attempt,
        maxRetries: retries,
        delayMs: Math.round(delay),
        error: lastError.message,
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error("Unknown fetch failure");
}

// ============================================================
// IN-MEMORY CACHE (avoid hammering the API every minute)
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

let cache: CacheEntry<WeatherForecast> | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds — matches cron interval

// ============================================================
// SERVICE
// ============================================================

export class WeatherService {
  /**
   * Fetch current weather + forecast (static method for easy import).
   * Caches results for 60s to prevent duplicate API calls.
   */
  async fetchCurrent(opts: WeatherFetchOptions = {}): Promise<WeatherForecast | null> {
    const lat = opts.latitude ?? DEFAULT_LAT;
    const lon = opts.longitude ?? DEFAULT_LON;
    const days = opts.forecastDays ?? 3;
    const timeout = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;

    // Cache hit — same coordinates
    if (cache && cache.expiresAt > Date.now()) {
      logger.debug("Weather cache hit", { lat, lon });
      return cache.value;
    }

    const startedAt = Date.now();

    try {
      const url =
        `${BASE_URL}?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code` +
        `&hourly=temperature_2m,relative_humidity_2m,precipitation` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&forecast_days=${days}` +
        `&timezone=auto`;

      const body = await httpGetWithRetry(url, MAX_RETRIES, timeout);
      const data = JSON.parse(body) as Record<string, unknown>;

      const current = data.current as Record<string, unknown> | undefined;
      if (!current) {
        logger.warning("Weather API returned no 'current' block", { lat, lon });
        return null;
      }

      const weatherCode = Number(current.weather_code ?? 0);
      const meta = WMO_CODES[weatherCode] ?? {
        description: `Unknown (${weatherCode})`,
        icon: "❓",
        severity: "info" as const,
      };

      const hourly = data.hourly as Record<string, unknown> | undefined;
      const daily = data.daily as Record<string, unknown> | undefined;

      const result: WeatherForecast = {
        latitude: Number(data.latitude ?? lat),
        longitude: Number(data.longitude ?? lon),
        timezone: String(data.timezone ?? "UTC"),

        current: {
          temperature: Number(current.temperature_2m ?? 0),
          humidity: Number(current.relative_humidity_2m ?? 0),
          weatherCode,
          weatherDescription: meta.description,
          weatherIcon: meta.icon,
          severity: meta.severity,
        },

        hourly: {
          time: (hourly?.time as string[]) ?? [],
          temperature: (hourly?.temperature_2m as number[]) ?? [],
          humidity: (hourly?.relative_humidity_2m as number[]) ?? [],
          precipitation: (hourly?.precipitation as number[]) ?? [],
        },

        daily: {
          time: (daily?.time as string[]) ?? [],
          tempMax: (daily?.temperature_2m_max as number[]) ?? [],
          tempMin: (daily?.temperature_2m_min as number[]) ?? [],
          precipitationSum: (daily?.precipitation_sum as number[]) ?? [],
        },
      };

      // Update cache
      cache = { value: result, expiresAt: Date.now() + CACHE_TTL_MS };

      logger.debug("Weather fetched", {
        lat,
        lon,
        durationMs: Date.now() - startedAt,
        temp: result.current.temperature,
      });

      return result;
    } catch (err) {
      logger.error("Weather fetch failed", {
        lat,
        lon,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Force-bypass cache. Useful for admin "refresh" mutations.
   */
  async refresh(opts: WeatherFetchOptions = {}): Promise<WeatherForecast | null> {
    cache = null;
    return this.fetchCurrent(opts);
  }

  /**
   * Retrieve cached value without fetching.
   */
  getCached(): WeatherForecast | null {
    if (cache && cache.expiresAt > Date.now()) {
      return cache.value;
    }
    return null;
  }

  /**
   * Clear cache manually.
   */
  clearCache(): void {
    cache = null;
  }

  /**
   * Human-readable one-line summary — used by cron logger.
   */
  formatSummary(w: WeatherForecast): string {
    const { current } = w;
    return `${current.weatherIcon} Weather | ${current.temperature.toFixed(1)}°C | ${current.humidity}% | ${current.weatherDescription}`;
  }

  /**
   * Structured payload for logging.
   */
  toLogPayload(w: WeatherForecast): Record<string, unknown> {
    return {
      temp: Number(w.current.temperature.toFixed(1)),
      humidity: w.current.humidity,
      code: w.current.weatherCode,
      description: w.current.weatherDescription,
      severity: w.current.severity,
      timezone: w.timezone,
      lat: w.latitude,
      lon: w.longitude,
    };
  }
}