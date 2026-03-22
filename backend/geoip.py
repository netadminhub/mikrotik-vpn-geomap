import httpx
from typing import Optional, Dict
from config import settings


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
                    result = {
                        "country": data.get("country", "Unknown"),
                        "country_code": data.get("countryCode", "XX"),
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
