"""
Network operations module for Ericsson ERA (Moshell) & Metro CSG routers.
"""
from .era_service import era_service
from .csg_service import csg_service
from .intent_parser import parse_network_command, NetworkCommand

__all__ = ["era_service", "csg_service", "parse_network_command", "NetworkCommand"]
