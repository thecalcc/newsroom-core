from flask import json, url_for
from bson import ObjectId
from newsroom.tests.users import test_login_succeeds_for_admin
from newsroom.tests.fixtures import COMPANY_1_ID
from superdesk import get_resource_service

from newsroom.user_roles import UserRole


def test_delete_company_deletes_company_and_users(client):
    test_login_succeeds_for_admin(client)
    # Register a new company
    response = client.post(
        "/companies/new",
        data=json.dumps(
            {
                "phone": "2132132134",
                "sd_subscriber_id": "12345",
                "name": "Press 2 Co.",
                "is_enabled": True,
                "contact_name": "Tom",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 201
    company = get_resource_service("companies").find_one(req=None, name="Press 2 Co.")

    # Register a user for the company
    response = client.post(
        "/users/new",
        data={
            "email": "newuser@abc.org",
            "first_name": "John",
            "last_name": "Doe",
            "password": "abc",
            "phone": "1234567",
            "company": ObjectId(company["_id"]),
            "user_type": "public",
        },
    )
    assert response.status_code == 201

    response = client.delete("/companies/{}".format(str(company["_id"])))
    assert response.status_code == 200

    company = get_resource_service("companies").find_one(req=None, _id=str(company["_id"]))
    assert company is None
    user = get_resource_service("users").find_one(req=None, email="newuser@abc.org")
    assert user is None


def test_company_name_is_unique(client):
    test_login_succeeds_for_admin(client)
    # Register a new company
    response = client.post(
        "/companies/new",
        data=json.dumps(
            {
                "phone": "2132132134",
                "sd_subscriber_id": "12345",
                "name": "Press 2 Co.",
                "is_enabled": True,
                "contact_name": "Tom",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 201
    company_id = json.loads(response.get_data()).get("_id")
    assert company_id

    duplicate_response = client.post(
        "/companies/new",
        data=json.dumps(
            {
                "name": "PRESS 2 Co.",
            }
        ),
        content_type="application/json",
    )

    assert duplicate_response.status_code == 400
    assert json.loads(duplicate_response.get_data()).get("name") == "Company already exists"


def test_get_company_users(client):
    test_login_succeeds_for_admin(client)
    resp = client.post(
        "companies/new",
        data=json.dumps({"name": "Test"}),
        content_type="application/json",
    )
    company_id = json.loads(resp.get_data()).get("_id")
    assert company_id
    resp = client.post(
        "users/new",
        data={
            "company": company_id,
            "first_name": "foo",
            "last_name": "bar",
            "phone": "123456789",
            "email": "foo2@bar.com",
            "user_type": "public",
        },
    )
    assert resp.status_code == 201, resp.get_data().decode("utf-8")
    resp = client.get("companies/%s/users" % company_id)
    assert resp.status_code == 200, resp.get_data().decode("utf-8")
    users = json.loads(resp.get_data())
    assert 1 == len(users)
    assert "foo" == users[0].get("first_name"), users[0].keys()


def test_save_company_permissions(client, app):
    app.data.insert(
        "products",
        [
            {
                "_id": "p-1",
                "name": "Sport",
                "description": "sport product",
                "companies": [COMPANY_1_ID],
                "is_enabled": True,
            },
            {
                "_id": "p-2",
                "name": "News",
                "description": "news product",
                "is_enabled": True,
            },
        ],
    )

    test_login_succeeds_for_admin(client)
    data = json.dumps({"products": {"p-2": True}, "sections": {"wire": True}, "archive_access": True})
    client.post(
        f"companies/{COMPANY_1_ID}/permissions",
        data=data,
        content_type="application/json",
    )

    updated = app.data.find_one("companies", req=None, _id=COMPANY_1_ID)
    assert updated["sections"]["wire"]
    assert not updated["sections"].get("agenda")
    assert updated["archive_access"]
    assert updated["products"] == [{"section": "wire", "seats": 0, "_id": "p-2"}]

    # available by default
    resp = client.get(url_for("agenda.index"))
    assert resp.status_code == 200

    # set company with wire only
    user = app.data.find_one("users", req=None, first_name="admin")
    assert user
    app.data.update("users", user["_id"], {"company": COMPANY_1_ID, "user_type": UserRole.PUBLIC.value}, user)

    # refresh session with new type
    test_login_succeeds_for_admin(client)

    # test section protection
    resp = client.get(url_for("agenda.index"))
    assert resp.status_code == 403


def test_company_ip_whitelist_validation(client):
    new_company = {"name": "Test", "allowed_ip_list": ["wrong"]}
    test_login_succeeds_for_admin(client)
    resp = client.post("companies/new", data=json.dumps(new_company), content_type="application/json")
    assert resp.status_code == 400
