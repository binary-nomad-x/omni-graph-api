import { WeatherService } from "./weather.service.js";

// src/modules/weather/resolver.ts
const weatherService = new WeatherService();

export const weatherResolvers = {
  Query: {
    currentWeather: async (_: unknown, { lat, lon }: { lat?: number; lon?: number }) => {
      return weatherService.fetchCurrent({ latitude: lat, longitude: lon });
    },
  },
  Mutation: {
    refreshWeather: async () => weatherService.refresh(),
  },
};
