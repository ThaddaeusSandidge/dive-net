import React, { useState } from "react";

interface CitySearchProps {
   onCitySearch: (coords: { lat: number; lng: number }) => void;
}

const CitySearch: React.FC<CitySearchProps> = ({ onCitySearch }) => {
   const [city, setCity] = useState("");
   const [isOpen, setIsOpen] = useState(true);

   const handleCityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setCity(event.target.value);
   };

   const handleSearch = async () => {
      if (!city.trim()) {
         alert("Please enter a city name.");
         return;
      }

      const apiKey = "pk.eyJ1IjoiZW1pbG5lcjAwMjEiLCJhIjoiY202cGxxNDA1MDNvczJrb3J5Ymh0b2V2dyJ9.Edcgk_vJNNby36m_3VYNkg"; // Replace with your actual Mapbox token
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${apiKey}`;

      try {
         const response = await fetch(url);
         const data = await response.json();

         if (!data.features || data.features.length === 0) {
            alert("City not found. Please enter a valid city name.");
            return;
         }

         const [lng, lat] = data.features[0].center;
         onCitySearch({ lat, lng }); // Update map coordinates
         setIsOpen(false); // Close popup after successful search
      } catch (error) {
         console.error("Error fetching city coordinates:", error);
         alert("Something went wrong. Please try again.");
      }
   };

   return (
      isOpen && (
         <div className="city-search-popup">
            <div className="city-search-content">
               <h2>Enter City</h2>
               <input type="text" value={city} onChange={handleCityChange} placeholder="Enter city name" />
               <button className="search-button" onClick={handleSearch}>
                  Search
               </button>
            </div>
         </div>
      )
   );
};

export default CitySearch;
