from bson import ObjectId
from flask import json
from pytest import fixture

from newsroom.tests.users import test_login_succeeds_for_admin  # noqa
from newsroom.tests.fixtures import COMPANY_1_ID
from newsroom.navigations.navigations import get_navigations_by_company


NAV_ID = ObjectId("59b4c5c61d41c8d736852fbf")


@fixture(autouse=True)
def init(app):
    app.data.insert(
        "navigations",
        [
            {
                "_id": NAV_ID,
                "name": "Sport",
                "product_type": "wire",
                "description": "Top level sport navigation",
                "is_enabled": True,
            }
        ],
    )


def test_navigation_list_succeeds_for_anonymous_user(client):
    response = client.get("/navigations")
    assert response.status_code == 200
    assert b"Sport" in response.data


def test_save_and_return_navigations(client):
    test_login_succeeds_for_admin(client)
    # Save a new navigation
    client.post(
        "/navigations/new",
        data={
            "navigation": json.dumps(
                {
                    "name": "Breaking",
                    "description": "Breaking news",
                    "product_type": "wire",
                    "is_enabled": True,
                }
            )
        },
    )

    response = client.get("/navigations")
    assert "Breaking" in response.get_data(as_text=True)


def test_update_navigation(client):
    test_login_succeeds_for_admin(client)

    client.post(
        "/navigations/59b4c5c61d41c8d736852fbf/",
        data={
            "navigation": json.dumps(
                {
                    "name": "Sport",
                    "description": "foo",
                    "product_type": "wire",
                    "is_enabled": True,
                }
            )
        },
    )

    response = client.get("/navigations")
    assert "foo" in response.get_data(as_text=True)


def test_delete_navigation_removes_references(client):
    test_login_succeeds_for_admin(client)

    client.post(
        "/products/new",
        data=json.dumps(
            {
                "name": "Breaking",
                "description": "Breaking news",
                "navigations": [("59b4c5c61d41c8d736852fbf")],
                "is_enabled": True,
                "product_type": "wire",
                "query": "foo",
            }
        ),
        content_type="application/json",
    )

    client.delete("/navigations/59b4c5c61d41c8d736852fbf")

    response = client.get("/products")
    data = json.loads(response.get_data())
    assert 1 == len(data)
    assert data[0]["name"] == "Breaking"
    assert data[0]["navigations"] == []


def test_create_navigation_with_products(client, app):
    app.data.insert(
        "products",
        [
            {
                "_id": "p-1",
                "name": "Sport",
                "description": "sport product",
                "navigations": [],
                "is_enabled": True,
                "product_type": "wire",
            },
            {
                "_id": "p-2",
                "name": "News",
                "description": "news product",
                "navigations": [],
                "is_enabled": True,
                "product_type": "wire",
            },
        ],
    )

    test_login_succeeds_for_admin(client)
    response = client.post(
        "/navigations/new",
        data={
            "navigation": json.dumps(
                {
                    "name": "Breaking",
                    "description": "Breaking news",
                    "product_type": "wire",
                    "is_enabled": True,
                    "products": ["p-2"],
                }
            )
        },
    )
    assert response.status_code == 201
    nav_id = json.loads(response.get_data()).get("_id")
    assert nav_id

    response = client.get("/navigations")
    assert "Breaking news" in response.get_data(as_text=True)

    response = client.get("/products")
    data = json.loads(response.get_data())
    assert [p for p in data if p["_id"] == "p-1"][0]["navigations"] == []
    assert [p for p in data if p["_id"] == "p-2"][0]["navigations"] == [nav_id]


def test_update_navigation_with_products(client, app):
    app.data.insert(
        "products",
        [
            {
                "_id": "p-1",
                "name": "Sport",
                "description": "sport product",
                "navigations": [],
                "is_enabled": True,
                "product_type": "wire",
            },
            {
                "_id": "p-2",
                "name": "News",
                "description": "news product",
                "navigations": [NAV_ID],
                "is_enabled": True,
                "product_type": "wire",
            },
        ],
    )

    test_login_succeeds_for_admin(client)
    client.post(
        f"navigations/{NAV_ID}",
        data={"navigation": json.dumps({"name": "Sports 2", "products": ["p-1"]})},
    )

    response = client.get("/products")
    data = json.loads(response.get_data())
    assert [p for p in data if p["_id"] == "p-1"][0]["navigations"] == [str(NAV_ID)]
    assert [p for p in data if p["_id"] == "p-2"][0]["navigations"] == []


def test_get_agenda_navigations_by_company_returns_ordered(client, app):
    app.data.insert(
        "navigations",
        [
            {
                "_id": "n-1",
                "name": "Uber",
                "is_enabled": True,
                "product_type": "agenda",
            }
        ],
    )

    app.data.insert(
        "products",
        [
            {
                "_id": "p-1",
                "name": "Top Things",
                "navigations": ["n-1"],
                "companies": [COMPANY_1_ID],
                "is_enabled": True,
                "query": "_featured",
                "product_type": "agenda",
            },
            {
                "_id": "p-2",
                "name": "A News",
                "navigations": ["59b4c5c61d41c8d736852fbf"],
                "companies": [COMPANY_1_ID],
                "description": "news product",
                "is_enabled": True,
                "product_type": "wire",
                "query": "latest",
            },
        ],
    )

    test_login_succeeds_for_admin(client)
    navigations = get_navigations_by_company({"_id": COMPANY_1_ID}, "agenda")
    assert navigations[0].get("name") == "Uber"
    navigations = get_navigations_by_company({"_id": COMPANY_1_ID}, "wire")
    assert navigations[0].get("name") == "Sport"
