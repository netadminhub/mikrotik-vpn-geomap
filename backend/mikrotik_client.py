import re
from typing import List, Dict, Optional
from routeros_api import RouterOsApiPool
from config import settings


class MikroTikClient:
    def __init__(self):
        self.host = settings.mikrotik_host
        self.port = settings.mikrotik_port
        self.username = settings.mikrotik_user
        self.password = settings.mikrotik_password
        self.use_ssl = settings.mikrotik_use_ssl
        self.api = None
        self.connection = None
    
    def connect(self) -> bool:
        """Connect to MikroTik router"""
        try:
            if not all([self.host, self.username, self.password]):
                return False
            
            self.api = RouterOsApiPool(
                self.host,
                username=self.username,
                password=self.password,
                port=self.port,
                use_ssl=self.use_ssl,
                ssl_verify=False,
                plaintext_login=True
            )
            self.connection = self.api.get_api()
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MikroTik router"""
        if self.api:
            self.api.disconnect()
            self.api = None
            self.connection = None
    
    def is_connected(self) -> bool:
        """Check if connected to MikroTik"""
        return self.connection is not None
    
    def get_ppp_active(self) -> List[Dict]:
        """Get active PPP sessions"""
        if not self.is_connected():
            if not self.connect():
                return []
        
        try:
            ppp_active = self.connection.get_resource('/ppp/active')
            
            # Get all active sessions with details
            sessions = ppp_active.get()
            
            result = []
            for session in sessions:
                parsed = self._parse_session(session)
                if parsed:
                    result.append(parsed)
            
            return result
        except Exception as e:
            print(f"Error getting PPP sessions: {e}")
            # Try to reconnect
            self.disconnect()
            return []
    
    def _parse_session(self, session: Dict) -> Optional[Dict]:
        """Parse a PPP session entry"""
        try:
            return {
                "name": session.get("name", ""),
                "service": session.get("service", ""),
                "caller_id": session.get("caller-id", ""),
                "address": session.get("address", ""),
                "uptime": session.get("uptime", ""),
                "session_id": session.get("session-id", ""),
            }
        except Exception:
            return None


mikrotik_client = MikroTikClient()
