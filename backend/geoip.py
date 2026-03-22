import httpx
from typing import Optional, Dict
from config import settings


# Country name normalization for ECharts map compatibility
COUNTRY_NAME_MAP = {
    "Turkey": "Turkey",
    "Türkiye": "Turkey",
    "United States": "United States",
    "United Kingdom": "United Kingdom",
    "Germany": "Germany",
    "France": "France",
    "Italy": "Italy",
    "Spain": "Spain",
    "China": "China",
    "Japan": "Japan",
    "India": "India",
    "Brazil": "Brazil",
    "Russia": "Russia",
    "Canada": "Canada",
    "Australia": "Australia",
    "Mexico": "Mexico",
    "Indonesia": "Indonesia",
    "Saudi Arabia": "Saudi Arabia",
    "Argentina": "Argentina",
    "South Africa": "South Africa",
    "Egypt": "Egypt",
    "Nigeria": "Nigeria",
    "Kenya": "Kenya",
    "Iraq": "Iraq",
    "Iran": "Iran",
    "Afghanistan": "Afghanistan",
    "Pakistan": "Pakistan",
    "Bangladesh": "Bangladesh",
    "Vietnam": "Vietnam",
    "Thailand": "Thailand",
    "Philippines": "Philippines",
    "Malaysia": "Malaysia",
    "Singapore": "Singapore",
    "South Korea": "South Korea",
    "North Korea": "North Korea",
    "Ukraine": "Ukraine",
    "Poland": "Poland",
    "Netherlands": "Netherlands",
    "Belgium": "Belgium",
    "Sweden": "Sweden",
    "Norway": "Denmark",
    "Denmark": "Denmark",
    "Finland": "Finland",
    "Greece": "Greece",
    "Portugal": "Portugal",
    "Austria": "Austria",
    "Switzerland": "Switzerland",
    "Czech Republic": "Czechia",
    "Romania": "Romania",
    "Hungary": "Hungary",
    "Bulgaria": "Bulgaria",
    "Serbia": "Serbia",
    "Croatia": "Croatia",
    "Slovakia": "Slovakia",
    "Slovenia": "Slovenia",
    "Bosnia and Herzegovina": "Bosnia and Herz.",
    "Albania": "Albania",
    "Macedonia": "Macedonia",
    "Qatar": "Qatar",
    "UAE": "United Arab Emirates",
    "United Arab Emirates": "United Arab Emirates",
    "Kuwait": "Kuwait",
    "Bahrain": "Bahrain",
    "Oman": "Oman",
    "Jordan": "Jordan",
    "Lebanon": "Lebanon",
    "Israel": "Israel",
    "Morocco": "Morocco",
    "Algeria": "Algeria",
    "Tunisia": "Tunisia",
    "Libya": "Libya",
    "Sudan": "Sudan",
    "Ethiopia": "Ethiopia",
    "Tanzania": "Tanzania",
    "Uganda": "Uganda",
    "Ghana": "Ghana",
    "Ivory Coast": "Côte d'Ivoire",
    "Senegal": "Senegal",
    "Cameroon": "Cameroon",
    "Zimbabwe": "Zimbabwe",
    "Zambia": "Zambia",
    "Angola": "Angola",
    "Mozambique": "Mozambique",
    "Madagascar": "Madagascar",
    "Nepal": "Nepal",
    "Sri Lanka": "Sri Lanka",
    "Myanmar": "Myanmar",
    "Cambodia": "Cambodia",
    "Laos": "Laos",
    "Mongolia": "Mongolia",
    "Kazakhstan": "Kazakhstan",
    "Uzbekistan": "Uzbekistan",
    "Turkmenistan": "Turkmenistan",
    "Azerbaijan": "Azerbaijan",
    "Armenia": "Armenia",
    "Georgia": "Georgia",
    "Belarus": "Belarus",
    "Lithuania": "Lithuania",
    "Latvia": "Latvia",
    "Estonia": "Estonia",
    "Iceland": "Iceland",
    "Ireland": "Ireland",
    "New Zealand": "New Zealand",
    "Papua New Guinea": "Papua New Guinea",
    "Fiji": "Fiji",
    "Solomon Islands": "Solomon Is.",
    "Vanuatu": "Vanuatu",
    "New Caledonia": "New Caledonia",
    "Chile": "Chile",
    "Peru": "Peru",
    "Colombia": "Colombia",
    "Venezuela": "Venezuela",
    "Ecuador": "Ecuador",
    "Bolivia": "Bolivia",
    "Paraguay": "Paraguay",
    "Uruguay": "Uruguay",
    "Guyana": "Guyana",
    "Suriname": "Suriname",
    "French Guiana": "Fr. Guiana",
    "Panama": "Panama",
    "Costa Rica": "Costa Rica",
    "Nicaragua": "Nicaragua",
    "Honduras": "Honduras",
    "El Salvador": "El Salvador",
    "Guatemala": "Guatemala",
    "Belize": "Belize",
    "Cuba": "Cuba",
    "Haiti": "Haiti",
    "Dominican Republic": "Dominican Rep.",
    "Jamaica": "Jamaica",
    "Puerto Rico": "Puerto Rico",
    "Trinidad and Tobago": "Trinidad and Tobago",
    "Bahamas": "Bahamas",
    "Barbados": "Barbados",
    "Guadeloupe": "Guadeloupe",
    "Martinique": "Martinique",
}


class GeoIPService:
    def __init__(self):
        self.api_url = settings.geoip_api_url
        self.cache: Dict[str, Dict] = {}
    
    async def lookup(self, ip: str) -> Optional[Dict]:
        """Lookup country information for an IP address"""
        if ip in self.cache:
            return self.cache[ip]
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.api_url}/{ip}")
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "success":
                    country = data.get("country", "Unknown")
                    country_code = data.get("countryCode", "XX")
                    
                    # Normalize country name for ECharts compatibility
                    normalized_country = COUNTRY_NAME_MAP.get(country, country)
                    
                    result = {
                        "country": normalized_country,
                        "country_code": country_code,
                        "original_country": country,
                    }
                    self.cache[ip] = result
                    return result
                
                return None
        except Exception:
            return None
    
    async def lookup_batch(self, ips: list) -> Dict[str, Dict]:
        """Lookup multiple IPs at once"""
        results = {}
        for ip in ips:
            info = await self.lookup(ip)
            if info:
                results[ip] = info
        return results


geoip_service = GeoIPService()
