from bson import ObjectId

from werkzeug.exceptions import NotFound
from flask import render_template, current_app as app, jsonify
from flask_babel import gettext

from superdesk.utc import utcnow, utc_to_local
from newsroom.decorator import login_required, company_admin_only
from newsroom.utils import query_resource, get_json_or_400
from newsroom.auth import get_user, get_company
from newsroom.company_admin import blueprint
from newsroom.products.products import get_products_by_company
from newsroom.email import send_template_email
from newsroom.settings import get_settings_collection, GENERAL_SETTINGS_LOOKUP


@blueprint.route("/company_admin")
@login_required
@company_admin_only
def index():
    return render_template("company_admin_index.html", data=get_view_data())


def get_view_data():
    user = get_user()
    company = get_company(user) or {}
    company_users = list(query_resource("users", lookup={"company": ObjectId(company["_id"])}))
    products = get_products_by_company(company)

    return {
        "users": company_users,
        "companyId": str(company["_id"]),
        "companies": [company],
        "sections": app.sections,
        "products": products,
    }


@blueprint.route("/company_admin/send_product_seat_request", methods=["POST"])
@login_required
@company_admin_only
def send_product_seat_request_email():
    user = get_user()
    company = get_company(user) or {}

    if not company:
        return NotFound(gettext("Company not found"))

    data = get_json_or_400()

    errors = []
    if not len(data.get("product_ids", [])):
        errors.append(gettext("No products selected"))

    if (data.get("number_of_seats") or 0) < 1:
        errors.append(gettext("Invalid number of seats requested"))

    if len(errors):
        return jsonify({"errors": errors}), 400

    products = list(
        query_resource(
            "products", lookup={"_id": {"$in": [ObjectId(product_id) for product_id in data["product_ids"]]}}
        )
    )

    general_settings = get_settings_collection().find_one(GENERAL_SETTINGS_LOOKUP)
    if not general_settings:
        return NotFound(gettext("Product Seat Request recipients not configured"))

    recipients = [
        address
        for address in (general_settings.get("values").get("product_seat_request_recipients") or "").split(",")
        if address
    ]
    if not len(recipients):
        return NotFound(gettext("Product Seat Request recipients not configured"))

    send_template_email(
        to=recipients,
        template="additional_product_seat_request_email",
        template_kwargs=dict(
            app_name=app.config["SITE_NAME"],
            products=products,
            number_of_seats=data["number_of_seats"],
            note=data["note"],
            user=user,
            company=company,
            now=utc_to_local(app.config["DEFAULT_TIMEZONE"], utcnow()),
            all_products=len(products) == len(company.get("products") or []),
        ),
    )

    return jsonify({"success": True}), 200
