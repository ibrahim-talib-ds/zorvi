"""Regression tests for stable FastAPI route registration."""

from app.api.v1.courses import router as courses_router


def test_courses_technology_route_is_registered_once():
    routes = [
        route
        for route in courses_router.routes
        if getattr(route, "path", None) == f"{courses_router.prefix}/technologies"
        and "GET" in getattr(route, "methods", set())
    ]
    assert len(routes) == 1
    assert routes[0].name == "list_technologies"
