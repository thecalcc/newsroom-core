from superdesk import register_resource
import newsroom
from superdesk.resource import not_analyzed

not_analayzed_mapping = {
    'type': 'string',
    'mapping': not_analyzed
}


class NewsApiAuditService(newsroom.Service):
    pass


class NewsApiAuditResource(newsroom.Resource):
    schema = {
        'type': not_analayzed_mapping,
        'subscriber': not_analayzed_mapping,
        'uri': not_analayzed_mapping,
        'version': not_analayzed_mapping,
        'remote_addr': not_analayzed_mapping,
        'endpoint': not_analayzed_mapping,
    }
    schema.update({'items_id': {
            'type': 'list',
            'mapping': not_analyzed
        }, 'created': {'type': 'datetime'}})

    datasource = {
        'source': 'api_audit',
        'search_backend': 'elastic'
    }


def init_app(app):
    if app.config.get('NEWS_API_ENABLED'):
        register_resource('api_audit', NewsApiAuditResource, NewsApiAuditService, _app=app)
