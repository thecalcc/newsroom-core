from typing import Dict, NamedTuple, Any, Literal
from datetime import timedelta

from flask import current_app as app
from flask_babel import gettext
from planning.common import WORKFLOW_STATE, ASSIGNMENT_WORKFLOW_STATE
from superdesk.metadata.item import CONTENT_STATE

from newsroom.template_filters import time_short, parse_date, format_datetime
from newsroom.gettext import get_session_locale
from newsroom.utils import query_resource
from newsroom.notifications import push_notification

DAY_IN_MINUTES = 24 * 60 - 1
TO_BE_CONFIRMED_FIELD = "_time_to_be_confirmed"


class AgendaItemTypes(NamedTuple):
    EVENT: str
    PLANNING: str


AGENDA_ITEM_TYPE: AgendaItemTypes = AgendaItemTypes("event", "planning")


def date_short(datetime):
    if datetime:
        return format_datetime(parse_date(datetime), "dd/MM/yyyy")


def get_agenda_dates(agenda):
    start = agenda.get("dates", {}).get("start")
    end = agenda.get("dates", {}).get("end")

    if start + timedelta(minutes=DAY_IN_MINUTES) < end:
        # Multi day event
        return "{} {} - {} {}".format(time_short(start), date_short(start), time_short(end), date_short(end))

    if start + timedelta(minutes=DAY_IN_MINUTES) == end:
        # All day event
        return "{} {}".format(gettext("ALL DAY"), date_short(start))

    if start == end:
        # start and end dates are the same
        return "{} {}".format(time_short(start), date_short(start))

    return "{} - {}, {}".format(time_short(start), time_short(end), date_short(start))


def get_public_contacts(agenda):
    contacts = agenda.get("event", {}).get("event_contact_info", [])
    public_contacts = []
    for contact in contacts:
        if contact.get("public", False):
            public_contacts.append(
                {
                    "name": " ".join(
                        [
                            c
                            for c in [
                                contact.get("first_name"),
                                contact.get("last_name"),
                            ]
                            if c
                        ]
                    ),
                    "organisation": contact.get("organisation", ""),
                    "email": ", ".join(contact.get("contact_email")),
                    "phone": ", ".join([c.get("number") for c in contact.get("contact_phone", []) if c.get("public")]),
                    "mobile": ", ".join([c.get("number") for c in contact.get("mobile", []) if c.get("public")]),
                }
            )
    return public_contacts


def get_links(agenda):
    return agenda.get("event", {}).get("links", [])


def get_latest_available_delivery(coverage):
    return next(
        (
            d
            for d in (coverage.get("deliveries") or [])
            if d.get("delivery_state") in [CONTENT_STATE.PUBLISHED, CONTENT_STATE.CORRECTED]
        ),
        None,
    )


def get_coverage_scheduled(coverage):
    return coverage.get("scheduled") or (coverage.get("planning") or {}).get("scheduled")


def get_coverage_content_type_name(coverage, language):
    coverage_types = app.config["COVERAGE_TYPES"]
    content_type = coverage.get("coverage_type") or coverage.get("planning", {}).get("g2_content_type", "")
    coverage_type = coverage_types.get(content_type, {})
    locale = (language or get_session_locale() or "en").lower()

    return coverage_type.get("translations", {}).get(locale) or coverage_type.get("name")


def get_display_date_from_string(datetime_str):
    return format_datetime(parse_date(datetime_str), app.config["AGENDA_EMAIL_LIST_DATE_FORMAT"])


def get_coverage_publish_time(coverage):
    return get_display_date_from_string(coverage.get("publish_time")) if coverage.get("publish_time") else ""


def get_coverage_scheduled_date(coverage):
    return get_display_date_from_string(get_coverage_scheduled(coverage))


def get_coverage_status_text(coverage):
    if coverage.get("workflow_status") == WORKFLOW_STATE.CANCELLED:
        return "has been cancelled."

    if coverage.get("workflow_status") == WORKFLOW_STATE.DRAFT:
        return "due at {}.".format(get_coverage_scheduled_date(coverage))

    if coverage.get("workflow_status") == ASSIGNMENT_WORKFLOW_STATE.ASSIGNED:
        return "expected at {}.".format(get_coverage_scheduled_date(coverage))

    if coverage.get("workflow_status") == WORKFLOW_STATE.ACTIVE:
        return "in progress at {}.".format(get_coverage_scheduled_date(coverage))

    if coverage.get("workflow_status") == ASSIGNMENT_WORKFLOW_STATE.COMPLETED:
        return "{}{}.".format(
            "updated" if len(coverage.get("deliveries") or []) > 1 else "available",
            " at " + get_coverage_publish_time(coverage),
        )


def get_coverage_email_text(coverage, default_state="", language=None):
    content_type = get_coverage_content_type_name(coverage, language)
    status = default_state or get_coverage_status_text(coverage)
    slugline = coverage.get("slugline") or coverage.get("planning", {}).get("slugline", "")

    return content_type if status is None else "{} coverage '{}' {}".format(content_type, slugline, status)


def remove_fields_for_public_user(item):
    def clean_coverages(coverages):
        if not coverages:
            return
        for c in coverages:
            c.pop("internal_note", None)
            c.get("planning", {}).pop("internal_note", None)

    item.get("event", {}).pop("files", None)
    item.get("event", {}).pop("internal_note", None)

    planning_items = item.get("planning_items", [])
    for p in planning_items:
        p.pop("internal_note", None)
        clean_coverages(p.get("coverages"))

    clean_coverages(item.get("coverages"))


def get_planning_coverages(item, plan_id):
    return [coverage for coverage in item.get("coverages") or [] if coverage.get("planning_id") == plan_id]


def get_item_type(item: Dict[str, Any]) -> Literal["event", "planning"]:
    if item.get("item_type") is not None:
        return item["item_type"]
    elif item.get("event"):
        return "event"
    else:
        return "planning"


def coverage_is_completed(coverage: Dict[str, Any]) -> bool:
    return coverage.get("workflow_status") == ASSIGNMENT_WORKFLOW_STATE.COMPLETED


def remove_restricted_coverage_info(items):
    coverage_keys_to_copy = (
        "coverage_id",
        "coverage_type",
        "planning_id",
        "watches",
        "planning",
        "delivery_id",
        "delivery_href",
        "deliveries",
    )

    planning_keys_to_copy = (
        "guid",
        "item_type",
        "type",
        "event_id",
        "coverages",
        "planning_items",
        "dates",
    )

    def remove_planning_info(plan_item):
        for field in [key for key in plan_item.keys() if not key.startswith("_") and key not in planning_keys_to_copy]:
            if field == "display_dates":
                try:
                    plan_item["display_dates"] = plan_item["planning_items"][0]["planning_item"]
                except (IndexError, KeyError):
                    plan_item["display_dates"] = plan_item["dates"]["start"]
            else:
                plan_item.pop(field, None)

    for item in items:
        if item.get("item_type") == "planning":
            remove_planning_info(item)

        item["coverages"] = [
            coverage
            if coverage_is_completed(coverage)
            else {key: val for key, val in coverage.items() if key in coverage_keys_to_copy}
            for coverage in item.get("coverages") or []
        ]

        for plan in item.get("planning_items") or []:
            remove_planning_info(plan)

            plan["coverages"] = [
                coverage
                if coverage_is_completed(coverage)
                else {key: val for key, val in coverage.items() if key in coverage_keys_to_copy}
                for coverage in plan.get("coverages") or []
            ]
            for coverage in plan["coverages"]:
                if not coverage_is_completed(coverage):
                    coverage["planning"] = {"g2_content_type": coverage["planning"]["g2_content_type"]}

    return items


def push_agenda_item_notification(name, item, **kwargs):
    restricted_companies = [
        item["_id"] for item in query_resource("companies", lookup={"restrict_coverage_info": True})
    ]

    if not len(restricted_companies):
        push_notification(name, item=item, **kwargs)
    else:
        push_notification(
            name,
            filters={"exclude": {"company": restricted_companies}},
            item=item,
            **kwargs,
        )
        remove_restricted_coverage_info([item])
        push_notification(
            name,
            filters={"include": {"company": restricted_companies}},
            item=item,
            **kwargs,
        )
