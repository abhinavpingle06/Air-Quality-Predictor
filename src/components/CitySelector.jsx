import { useState, useId } from "react";
import { Search, MapPin, Sparkles, Navigation } from "lucide-react";
import {
  CITIES,
  CITIES_BY_STATE,
  POPULAR_CITIES,
} from "../config/cities";

export default function CitySelector({
  selectedCity,
  onSelectCity,
  disabled = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const selectId = useId();

  const filteredCities = searchQuery.trim()
    ? CITIES.filter((c) => {
        const query = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          c.state.toLowerCase().includes(query) ||
          c.region.toLowerCase().includes(query) ||
          (c.area && c.area.toLowerCase().includes(query))
        );
      })
    : CITIES;

  return (
    <div className="city-selector-widget">
      <div className="selector-header-row">
        <div className="selector-title-group">
          <label htmlFor={selectId} className="selector-label">
            <MapPin size={16} className="selector-label-icon" />
            <span>Select City / Area</span>
          </label>
          <span className="location-badge">
            <Navigation size={12} />
            {selectedCity.name} ({selectedCity.latitude.toFixed(4)}°N, {selectedCity.longitude.toFixed(4)}°E)
          </span>
        </div>
        <span className="selector-state-tag">{selectedCity.state} · {selectedCity.region}</span>
      </div>

      <div className="selector-controls">
        {/* Quick Search Input */}
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search Mumbai, Navi Mumbai, Delhi, Pune..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            aria-label="Search cities or areas"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Grouped Accessible Dropdown */}
        <div className="select-dropdown-wrapper">
          <select
            id={selectId}
            className="city-select-dropdown"
            value={selectedCity.id}
            onChange={(e) => {
              const matched = CITIES.find((c) => c.id === e.target.value);
              if (matched) onSelectCity(matched);
            }}
            disabled={disabled}
          >
            {searchQuery.trim() ? (
              filteredCities.length > 0 ? (
                filteredCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} — {city.state} ({city.area || city.region})
                  </option>
                ))
              ) : (
                <option disabled value="">
                  No matching cities found
                </option>
              )
            ) : (
              Object.entries(CITIES_BY_STATE).map(([stateName, citiesInState]) => (
                <optgroup key={stateName} label={`${stateName}`}>
                  {citiesInState.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} {city.area ? `(${city.area})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Quick Select Chips for Priority Cities */}
      <div className="quick-cities-bar">
        <span className="quick-label">
          <Sparkles size={12} /> Popular:
        </span>
        <div className="chips-list">
          {POPULAR_CITIES.map((c) => {
            const isSelected = c.id === selectedCity.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`city-chip ${isSelected ? "city-chip-active" : ""}`}
                onClick={() => onSelectCity(c)}
                disabled={disabled}
                title={`${c.name}, ${c.state}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
